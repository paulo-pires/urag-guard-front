// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import express from "express";
import http from "http";
import type { AddressInfo } from "net";
import { mcpProxy } from "./mcpProxy";

// IGN-314: o /mcp-proxy repassava qualquer requisição ao MCP do observability.
// Agora só passa sessão de admin do painel, e o token interno entra aqui.

// Identity falso: sessão → nível por módulo. "vencida" responde 401; "quebra" responde 500.
const permissoes: Record<string, Record<string, string>> = {
  "admin-painel": { "guard-front": "admin" },
  "admin-plataforma": { "urag-admin": "admin" },
  "leitor": { "guard-front": "read" },
};
let urlsIdentity: string[];

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const fetchIdentity = (async (input: string | URL | Request, init?: RequestInit) => {
  const url = String(input);
  urlsIdentity.push(url);
  const sessao = new Headers(init?.headers).get("X-Session-Token") ?? "";
  if (sessao === "vencida") return json(401, { error: "sessão inválida ou expirada" });
  if (sessao === "quebra") return json(500, { error: "x" });
  const modulo = new URL(url).searchParams.get("app_id") ?? "";
  const nivel = permissoes[sessao]?.[modulo];
  return json(200, { allowed: !!nivel, permission_level: nivel ?? "" });
}) as typeof fetch;

// Observability falso: guarda o que chegou.
let recebido: { headers: http.IncomingHttpHeaders; corpo: string; caminho: string } | null;
let observability: http.Server;
let proxy: http.Server;
let base: string;

beforeEach(async () => {
  urlsIdentity = [];
  recebido = null;
  observability = http.createServer((req, res) => {
    let corpo = "";
    req.on("data", (c) => (corpo += c));
    req.on("end", () => {
      recebido = { headers: req.headers, corpo, caminho: req.url ?? "" };
      res.writeHead(200, { "Content-Type": "application/json", "Mcp-Session-Id": "mcp-1" });
      res.end(JSON.stringify({ jsonrpc: "2.0", id: 1, result: { ok: true } }));
    });
  });
  await new Promise<void>((r) => observability.listen(0, "127.0.0.1", r));
  const portaObs = (observability.address() as AddressInfo).port;

  const app = express();
  app.use(
    "/mcp-proxy",
    mcpProxy({
      identityUrl: "http://identity",
      observabilityUrl: `http://127.0.0.1:${portaObs}`,
      internalToken: "tok-interno",
      fetch: fetchIdentity,
    }),
  );
  proxy = app.listen(0, "127.0.0.1");
  await new Promise<void>((r) => proxy.once("listening", r));
  base = `http://127.0.0.1:${(proxy.address() as AddressInfo).port}/mcp-proxy/`;
});

afterEach(async () => {
  await new Promise((r) => proxy.close(r));
  await new Promise((r) => observability.close(r));
});

const CORPO = JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "get_dashboard_stats" } });

function chamar(headers: Record<string, string>) {
  return fetch(base, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream", ...headers },
    body: CORPO,
  });
}

describe("/mcp-proxy do painel do Guard", () => {
  it.each([
    ["sem sessão", {}, 401],
    ["sessão vencida", { "X-Session-Token": "vencida" }, 401],
    ["sessão sem papel de admin", { "X-Session-Token": "leitor" }, 403],
    ["identity fora do ar", { "X-Session-Token": "quebra" }, 502],
    ["token interno forjado pelo cliente não abre a porta", { "X-Internal-Token": "tok-interno" }, 401],
  ])("%s: recusado e nada chega ao observability", async (_n, headers, status) => {
    const res = await chamar(headers as Record<string, string>);
    expect(res.status).toBe(status);
    expect((await res.json()).error.code).toBe(-32001);
    expect(recebido).toBeNull();
  });

  it.each([
    ["admin do painel (header)", { "X-Session-Token": "admin-painel" }],
    ["admin de plataforma (Bearer)", { Authorization: "Bearer admin-plataforma" }],
    ["admin do painel (cookie)", { Cookie: "outro=1; identity_session=admin-painel" }],
  ])("%s: passa com o token interno posto pelo servidor", async (_n, headers) => {
    const res = await chamar({
      ...(headers as Record<string, string>),
      "Mcp-Session-Id": "mcp-1",
      "X-MCP-Assertion": "forjada",
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("mcp-session-id")).toBe("mcp-1");
    expect(recebido?.caminho).toBe("/mcp");
    expect(recebido?.corpo).toBe(CORPO);
    expect(recebido?.headers["x-internal-token"]).toBe("tok-interno");
    expect(recebido?.headers["mcp-session-id"]).toBe("mcp-1");
    expect(recebido?.headers["x-session-token"]).toMatch(/^admin-/);
    // Do cliente só passa a allowlist: nada de asserção forjada nem cookies do domínio.
    expect(recebido?.headers["x-mcp-assertion"]).toBeUndefined();
    expect(recebido?.headers["cookie"]).toBeUndefined();
    expect(recebido?.headers["authorization"]).toBeUndefined();
  });

  it("a sessão nunca vai na URL do identity e a resposta fica em cache", async () => {
    await chamar({ "X-Session-Token": "admin-painel" });
    await chamar({ "X-Session-Token": "admin-painel" });
    expect(urlsIdentity).toHaveLength(1);
    expect(urlsIdentity.join(" ")).not.toContain("admin-painel");
  });
});
