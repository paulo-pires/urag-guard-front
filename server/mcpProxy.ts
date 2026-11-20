import http from "http";
import type { Request, Response } from "express";

/**
 * /mcp-proxy do painel do Guard → MCP do urag-observability (IGN-314).
 *
 * Até a IGN-314 este proxy repassava qualquer requisição, com todos os
 * cabeçalhos do cliente, ao MCP do observability: pelo domínio público dava
 * para chamar as ferramentas dele sem login. Agora:
 *
 *  1. sem sessão do identity → 401; sessão que não é admin do painel → 403;
 *     identity fora do ar → 502 (nunca libera);
 *  2. admin = admin no módulo guard-front ou admin de plataforma (urag-admin);
 *  3. só depois disso o token interno entra, do lado do servidor. O navegador
 *     nunca o vê, e X-Internal-Token, X-MCP-Assertion e cookies vindos do
 *     cliente não atravessam: só a allowlist abaixo vai ao observability.
 */

export interface McpProxyDeps {
  identityUrl: string;
  observabilityUrl: string;
  internalToken: string;
  fetch?: typeof fetch;
  ttlMs?: number;
}

const MODULOS_ADMIN = ["guard-front", "urag-admin"] as const;

/** Cabeçalhos do cliente que podem chegar ao observability. */
const REPASSADOS = ["content-type", "accept", "mcp-session-id", "mcp-protocol-version", "last-event-id"];

/** Sessão do identity: X-Session-Token, Authorization Bearer ou cookie identity_session. */
export function sessaoDaRequisicao(req: Request): string {
  const header = (req.header("X-Session-Token") || "").trim();
  if (header) return header;
  const auth = req.header("Authorization") || "";
  if (/^bearer /i.test(auth)) return auth.slice(7).trim();
  const cookies = req.header("Cookie") || "";
  const m = cookies.match(/(?:^|;\s*)identity_session=([^;]+)/);
  return m ? decodeURIComponent(m[1]).trim() : "";
}

/** Verificador com cache curto: uma sessão MCP faz várias requisições seguidas. */
export function criarVerificadorAdmin(deps: Pick<McpProxyDeps, "identityUrl" | "fetch" | "ttlMs">) {
  const f = deps.fetch ?? fetch;
  const ttl = deps.ttlMs ?? 30_000;
  const cache = new Map<string, { ate: number; ok: boolean }>();

  async function nivel(sessao: string, modulo: string): Promise<{ ok: boolean; admin: boolean }> {
    // A sessão vai no header, nunca na URL.
    const res = await f(`${deps.identityUrl}/v1/permissions/check?app_id=${encodeURIComponent(modulo)}`, {
      headers: { "X-Session-Token": sessao },
      signal: AbortSignal.timeout(5_000),
    });
    if (res.status === 401 || res.status === 403) return { ok: false, admin: false };
    if (!res.ok) throw new Error(`identity respondeu ${res.status}`);
    const d = (await res.json()) as { allowed?: boolean; permission_level?: string };
    return { ok: true, admin: d.allowed === true && d.permission_level === "admin" };
  }

  /** null = sessão inválida; false = válida mas sem papel de admin; true = admin. */
  return async function verificar(sessao: string): Promise<boolean | null> {
    const hit = cache.get(sessao);
    if (hit && hit.ate > Date.now()) return hit.ok;
    let valida = false;
    let admin = false;
    for (const modulo of MODULOS_ADMIN) {
      const r = await nivel(sessao, modulo);
      valida = valida || r.ok;
      if (r.admin) {
        admin = true;
        break;
      }
    }
    if (!valida) return null;
    cache.set(sessao, { ate: Date.now() + ttl, ok: admin });
    if (cache.size > 1000) cache.delete(cache.keys().next().value as string);
    return admin;
  };
}

function erroJsonRpc(res: Response, status: number, mensagem: string) {
  res.status(status).json({ jsonrpc: "2.0", id: null, error: { code: -32001, message: mensagem } });
}

/** Handler do /mcp-proxy. Montar ANTES do express.json(): o corpo precisa passar íntegro. */
export function mcpProxy(deps: McpProxyDeps) {
  const verificar = criarVerificadorAdmin(deps);
  const alvo = new URL(deps.observabilityUrl);

  return async (req: Request, res: Response) => {
    const sessao = sessaoDaRequisicao(req);
    if (!sessao) return erroJsonRpc(res, 401, "login necessário");
    let admin: boolean | null;
    try {
      admin = await verificar(sessao);
    } catch (err) {
      console.error("[mcp-proxy] identity:", err);
      return erroJsonRpc(res, 502, "identity indisponível");
    }
    if (admin === null) return erroJsonRpc(res, 401, "sessão inválida ou expirada");
    if (!admin) return erroJsonRpc(res, 403, "só administradores do painel");

    const headers: Record<string, string> = { host: alvo.host, "X-Session-Token": sessao };
    for (const nome of REPASSADOS) {
      const v = req.header(nome);
      if (v) headers[nome] = v;
    }
    if (deps.internalToken) headers["X-Internal-Token"] = deps.internalToken;

    const proxyReq = http.request(
      { host: alvo.hostname, port: alvo.port || "80", path: "/mcp", method: req.method, headers },
      (proxyRes) => {
        res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
        proxyRes.pipe(res);
      },
    );
    proxyReq.on("error", (err) => {
      console.error("MCP proxy error:", err.message);
      if (!res.headersSent) res.writeHead(502, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ jsonrpc: "2.0", id: "proxy", error: { code: -32000, message: err.message } }));
    });
    req.pipe(proxyReq);
  };
}
