import { randomUUID } from "crypto";
import express, { type Request, type Response, type NextFunction } from "express";

/**
 * Playground de comparação de modelos (IGN-133).
 *
 * O navegador nunca vê a chave Ignus Code: ela fica no urag-guard-go (rota
 * interna, cifrada, por tenant do identity) e só este servidor a lê. Cada
 * requisição valida a sessão no urag-identity — de lá vêm tenant, e-mail e
 * papel; nada disso é aceito do cliente.
 *
 * Os modelos são chamados pelo urag_proxy com a chave do tenant: saem dos
 * créditos dele, respeitam a política de modelos e cada chamada já é gravada
 * como run no guard pelo próprio proxy. Os cabeçalhos X-Urag-* agrupam as
 * respostas de uma comparação numa sessão.
 */

export interface PlaygroundDeps {
  identityUrl: string;
  guardApiUrl: string;
  proxyUrl: string;
  ignustecIaUrl: string;
  internalToken: string;
  fetch?: typeof fetch;
}

export interface Account {
  tenantId: string;
  tenantName: string;
  email: string;
  isAdmin: boolean;
}

const MAX_MODELS = 4;
const MAX_PROMPT = 20_000;
const RUN_TIMEOUT_MS = 90_000;
const ACCOUNT_TTL_MS = 30_000;

type Locals = { account: Account };

export function playgroundRouter(deps: PlaygroundDeps): express.Router {
  const f = deps.fetch ?? fetch;
  const router = express.Router();
  const accounts = new Map<string, { at: number; account: Account }>();

  async function resolveAccount(token: string): Promise<Account | null> {
    const hit = accounts.get(token);
    if (hit && Date.now() - hit.at < ACCOUNT_TTL_MS) return hit.account;
    const res = await f(`${deps.identityUrl}/v1/account`, {
      headers: { "X-Session-Token": token },
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) return null;
    const d = (await res.json()) as {
      tenant?: { id?: string; name?: string };
      user?: { email?: string };
      permission_level?: string;
    };
    if (!d.tenant?.id || !d.user?.email) return null;
    const account = {
      tenantId: d.tenant.id,
      tenantName: d.tenant.name ?? "",
      email: d.user.email.toLowerCase(),
      isAdmin: d.permission_level === "admin",
    };
    accounts.set(token, { at: Date.now(), account });
    if (accounts.size > 1000) accounts.delete(accounts.keys().next().value as string);
    return account;
  }

  const auth = async (req: Request, res: Response<unknown, Locals>, next: NextFunction) => {
    const token = req.header("X-Session-Token") || "";
    if (!token) return res.status(401).json({ error: "sessão ausente" });
    try {
      const account = await resolveAccount(token);
      if (!account) return res.status(401).json({ error: "sessão inválida ou expirada" });
      res.locals.account = account;
      next();
    } catch (err) {
      console.error("[playground] identity:", err);
      res.status(502).json({ error: "identity indisponível" });
    }
  };

  const adminOnly = (_req: Request, res: Response<unknown, Locals>, next: NextFunction) => {
    if (!res.locals.account.isAdmin) return res.status(403).json({ error: "só administradores do tenant" });
    next();
  };

  const integrationUrl = (tenant: string) =>
    `${deps.guardApiUrl}/internal/integrations/ignus-code/${encodeURIComponent(tenant)}`;

  async function integration(tenant: string) {
    const res = await f(integrationUrl(tenant), {
      headers: { "X-Internal-Token": deps.internalToken },
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) throw new Error(`guard integração: HTTP ${res.status}`);
    return (await res.json()) as {
      configured: boolean;
      api_key?: string;
      last4?: string;
      updated_by?: string;
      updated_at?: string;
    };
  }

  async function tenantKey(tenant: string): Promise<string | null> {
    const i = await integration(tenant);
    return i.configured && i.api_key ? i.api_key : null;
  }

  async function proxyModels(key: string) {
    const res = await f(`${deps.proxyUrl}/v1/models`, {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(10_000),
    });
    const body = (await res.json().catch(() => ({}))) as { data?: { id: string; owned_by?: string }[]; error?: unknown };
    return { status: res.status, ok: res.ok, models: body.data ?? [], error: errorText(body.error) };
  }

  router.use(express.json({ limit: "256kb" }));
  router.use(auth);

  router.get("/config", async (_req, res: Response<unknown, Locals>) => {
    const a = res.locals.account;
    try {
      const i = await integration(a.tenantId);
      res.json({
        tenant: { id: a.tenantId, name: a.tenantName },
        email: a.email,
        canManage: a.isAdmin,
        ignusCode: { configured: i.configured, last4: i.last4 ?? null, updatedBy: i.updated_by ?? null, updatedAt: i.updated_at ?? null },
      });
    } catch (err) {
      console.error("[playground] config:", err);
      res.status(502).json({ error: "guard indisponível" });
    }
  });

  router.put("/ignus-key", adminOnly, async (req, res: Response<unknown, Locals>) => {
    const a = res.locals.account;
    const key = typeof req.body?.api_key === "string" ? req.body.api_key.trim() : "";
    if (!key.startsWith("sk_ic_")) return res.status(400).json({ error: "a chave do Ignus Code começa com sk_ic_" });
    // Antes de gravar, prova que a chave funciona no proxy.
    const check = await proxyModels(key).catch(() => null);
    if (!check) return res.status(502).json({ error: "proxy indisponível para validar a chave" });
    if (!check.ok) {
      return res.status(400).json({
        error: check.status === 401 ? "chave recusada pelo Ignus Code" : check.error || `Ignus Code respondeu ${check.status}`,
      });
    }
    const put = await f(integrationUrl(a.tenantId), {
      method: "PUT",
      headers: { "X-Internal-Token": deps.internalToken, "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: key, updated_by: a.email }),
    });
    if (!put.ok) return res.status(502).json({ error: "não foi possível salvar a chave" });
    const saved = (await put.json()) as { last4?: string; updated_by?: string; updated_at?: string };
    res.json({ configured: true, last4: saved.last4, updatedBy: saved.updated_by, updatedAt: saved.updated_at, models: check.models.length });
  });

  router.delete("/ignus-key", adminOnly, async (_req, res: Response<unknown, Locals>) => {
    const del = await f(integrationUrl(res.locals.account.tenantId), {
      method: "DELETE",
      headers: { "X-Internal-Token": deps.internalToken },
    });
    if (!del.ok) return res.status(502).json({ error: "não foi possível remover a chave" });
    res.json({ configured: false });
  });

  router.get("/models", async (_req, res: Response<unknown, Locals>) => {
    try {
      const key = await tenantKey(res.locals.account.tenantId);
      if (!key) return res.status(409).json({ error: "ignus_key_missing" });
      const r = await proxyModels(key);
      if (!r.ok) return res.status(r.status === 401 ? 409 : 502).json({ error: r.status === 401 ? "ignus_key_invalid" : r.error || "proxy" });
      res.json({ models: r.models.map((m) => ({ id: m.id, ownedBy: m.owned_by ?? null })) });
    } catch (err) {
      console.error("[playground] models:", err);
      res.status(502).json({ error: "falha ao listar modelos" });
    }
  });

  router.get("/knowledge-bases", async (_req, res: Response<unknown, Locals>) => {
    try {
      const r = await f(`${deps.ignustecIaUrl}/api/internal/knowledge-bases?email=${encodeURIComponent(res.locals.account.email)}`, {
        headers: { Authorization: `Bearer ${deps.internalToken}` },
        signal: AbortSignal.timeout(10_000),
      });
      if (!r.ok) return res.status(502).json({ error: `IgnusTec IA respondeu ${r.status}` });
      res.json(await r.json());
    } catch (err) {
      console.error("[playground] knowledge-bases:", err);
      res.status(502).json({ error: "IgnusTec IA indisponível" });
    }
  });

  router.post("/run", async (req, res: Response<unknown, Locals>) => {
    const a = res.locals.account;
    const body = (req.body ?? {}) as RunBody;
    const models = Array.isArray(body.models) ? Array.from(new Set(body.models.filter((m) => typeof m === "string" && m))) : [];
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    const system = typeof body.system === "string" ? body.system.trim() : "";
    const kbIds = Array.isArray(body.kb_ids) ? body.kb_ids.filter((k) => typeof k === "string") : [];
    if (models.length < 1 || models.length > MAX_MODELS) return res.status(400).json({ error: `escolha de 1 a ${MAX_MODELS} modelos` });
    if (!prompt) return res.status(400).json({ error: "prompt vazio" });
    if (prompt.length + system.length > MAX_PROMPT) return res.status(400).json({ error: "prompt longo demais" });

    let key: string | null;
    try {
      key = await tenantKey(a.tenantId);
    } catch (err) {
      console.error("[playground] run/key:", err);
      return res.status(502).json({ error: "guard indisponível" });
    }
    if (!key) return res.status(409).json({ error: "ignus_key_missing" });

    // Recuperação uma vez só: todos os modelos respondem com o mesmo contexto.
    let hits: KbHit[] = [];
    if (kbIds.length) {
      try {
        const r = await f(`${deps.ignustecIaUrl}/api/internal/knowledge-search`, {
          method: "POST",
          headers: { Authorization: `Bearer ${deps.internalToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ email: a.email, kb_ids: kbIds, query: prompt, top_k: clamp(body.top_k, 1, 10, 5) }),
          signal: AbortSignal.timeout(25_000),
        });
        const d = (await r.json().catch(() => ({}))) as { hits?: KbHit[]; error?: string };
        if (!r.ok) return res.status(r.status === 403 ? 403 : 502).json({ error: d.error || `busca respondeu ${r.status}` });
        hits = d.hits ?? [];
      } catch (err) {
        console.error("[playground] run/search:", err);
        return res.status(502).json({ error: "busca nas bases indisponível" });
      }
    }

    const messages = buildMessages(system, prompt, hits);
    const sessionId = `playground-${randomUUID()}`;
    const params = {
      temperature: clamp(body.temperature, 0, 2, 0.7),
      max_tokens: clamp(body.max_tokens, 16, 4096, 1024),
    };

    const results = await Promise.all(
      models.map(async (model) => {
        const start = Date.now();
        try {
          const r = await f(`${deps.proxyUrl}/v1/chat/completions`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${key}`,
              "Content-Type": "application/json",
              "X-Urag-Source": "guard-playground",
              "X-Urag-Session": sessionId,
              "X-Urag-User": a.email,
              "X-Urag-Tenant": a.tenantId,
            },
            body: JSON.stringify({ model, messages, stream: false, ...params }),
            signal: AbortSignal.timeout(RUN_TIMEOUT_MS),
          });
          const latencyMs = Date.now() - start;
          const d = (await r.json().catch(() => ({}))) as ChatResponse;
          if (!r.ok) return { model, ok: false, status: r.status, latencyMs, error: errorText(d.error) || `HTTP ${r.status}` };
          return {
            model,
            ok: true,
            status: r.status,
            latencyMs,
            output: d.choices?.[0]?.message?.content ?? "",
            finishReason: d.choices?.[0]?.finish_reason ?? null,
            tokensIn: d.usage?.prompt_tokens ?? null,
            tokensOut: d.usage?.completion_tokens ?? null,
            costUsd: typeof d.usage?.cost === "number" ? d.usage.cost : null,
            servedBy: d.provider ?? null,
          };
        } catch (err) {
          const timeout = err instanceof Error && err.name === "TimeoutError";
          return { model, ok: false, status: 0, latencyMs: Date.now() - start, error: timeout ? "tempo esgotado" : "falha de rede" };
        }
      }),
    );

    res.json({ sessionId, context: hits, results });
  });

  return router;
}

interface RunBody {
  models?: string[];
  prompt?: string;
  system?: string;
  kb_ids?: string[];
  top_k?: number;
  temperature?: number;
  max_tokens?: number;
}

export interface KbHit {
  content: string;
  score: number;
  kbId: string | null;
  source: string | null;
  headingPath: string[];
}

interface ChatResponse {
  choices?: { message?: { content?: string }; finish_reason?: string }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number; cost?: number };
  provider?: string;
  error?: unknown;
}

function clamp(v: unknown, min: number, max: number, dflt: number): number {
  const n = typeof v === "number" && Number.isFinite(v) ? v : dflt;
  return Math.min(max, Math.max(min, n));
}

function errorText(e: unknown): string {
  if (!e) return "";
  if (typeof e === "string") return e;
  if (typeof e === "object" && e && "message" in e && typeof (e as { message: unknown }).message === "string") {
    return (e as { message: string }).message;
  }
  return "";
}

/** Contexto recuperado vai no system, numerado, para todos os modelos iguais. */
export function buildMessages(system: string, prompt: string, hits: KbHit[]) {
  const parts: string[] = [];
  if (system) parts.push(system);
  if (hits.length) {
    const ctx = hits
      .map((h, i) => {
        const where = [h.source, ...h.headingPath].filter(Boolean).join(" › ");
        return `[${i + 1}]${where ? ` ${where}` : ""}\n${h.content}`;
      })
      .join("\n\n");
    parts.push(
      `Responda com base no contexto abaixo, recuperado das bases de conhecimento. Cite as fontes pelo número entre colchetes. Se o contexto não tiver a resposta, diga isso.\n\n${ctx}`,
    );
  }
  const messages: { role: "system" | "user"; content: string }[] = [];
  if (parts.length) messages.push({ role: "system", content: parts.join("\n\n") });
  messages.push({ role: "user", content: prompt });
  return messages;
}
