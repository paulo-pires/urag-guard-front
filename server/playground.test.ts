// @vitest-environment node
import { describe, it, expect, beforeEach } from "vitest";
import express from "express";
import type { AddressInfo } from "net";
import { buildMessages, playgroundRouter } from "./playground";

// Duplos dos serviços: identity, urag-guard-go (integração), proxy, ignustec-ia.
type Call = { url: string; init?: RequestInit };
let calls: Call[];
let accounts: Record<string, { tenant: { id: string; name: string }; user: { email: string }; permission_level: string }>;
let stored: Record<string, string>;
let searchStatus: number;

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const fakeFetch = (async (input: string | URL | Request, init?: RequestInit) => {
  const url = String(input);
  calls.push({ url, init });
  const h = new Headers(init?.headers);
  if (url.startsWith("http://identity/v1/account")) {
    const acc = accounts[h.get("X-Session-Token") ?? ""];
    return acc ? json(200, acc) : json(401, { error: "x" });
  }
  const m = url.match(/^http:\/\/guard\/internal\/integrations\/ignus-code\/(.+)$/);
  if (m) {
    if (h.get("X-Internal-Token") !== "tok") return json(401, {});
    const tenant = decodeURIComponent(m[1]);
    if (init?.method === "PUT") {
      stored[tenant] = JSON.parse(String(init.body)).api_key;
      return json(200, { configured: true, last4: stored[tenant].slice(-4) });
    }
    if (init?.method === "DELETE") {
      delete stored[tenant];
      return json(200, { configured: false });
    }
    return stored[tenant] ? json(200, { configured: true, api_key: stored[tenant], last4: stored[tenant].slice(-4) }) : json(200, { configured: false });
  }
  if (url === "http://proxy/v1/models") {
    return h.get("Authorization") === "Bearer sk_ic_valida_123456" ? json(200, { data: [{ id: "a/m1" }, { id: "b/m2" }] }) : json(401, { error: "unauthorized" });
  }
  if (url === "http://proxy/v1/chat/completions") {
    const body = JSON.parse(String(init?.body));
    if (body.model === "quebrado/x") return json(404, { error: "model_unavailable: este modelo não está disponível" });
    return json(200, {
      choices: [{ message: { content: `resposta de ${body.model}` }, finish_reason: "stop" }],
      usage: { prompt_tokens: 10, completion_tokens: 5, cost: 0.0001 },
      provider: "OpenAI",
    });
  }
  if (url === "http://ia/api/internal/knowledge-search") {
    if (searchStatus !== 200) return json(searchStatus, { error: "base de conhecimento fora do seu acesso" });
    return json(200, { hits: [{ content: "O prazo é 30 dias.", score: 0.9, kbId: "kb1", source: "contrato.pdf", headingPath: ["Prazos"] }] });
  }
  return json(500, { error: `inesperado ${url}` });
}) as typeof fetch;

async function server() {
  const app = express();
  app.use(
    "/api/playground",
    playgroundRouter({ identityUrl: "http://identity", guardApiUrl: "http://guard", proxyUrl: "http://proxy", ignustecIaUrl: "http://ia", internalToken: "tok", fetch: fakeFetch }),
  );
  const srv = app.listen(0);
  const base = `http://127.0.0.1:${(srv.address() as AddressInfo).port}/api/playground`;
  const call = async (method: string, path: string, session?: string, body?: unknown) => {
    const res = await fetch(base + path, {
      method,
      headers: { ...(session ? { "X-Session-Token": session } : {}), ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: res.status, body: (await res.json()) as Record<string, any> };
  };
  return { call, close: () => srv.close() };
}

beforeEach(() => {
  calls = [];
  stored = {};
  searchStatus = 200;
  accounts = {
    "sess-admin": { tenant: { id: "t1", name: "Um" }, user: { email: "Ana@X.com" }, permission_level: "admin" },
    "sess-viewer": { tenant: { id: "t1", name: "Um" }, user: { email: "bia@x.com" }, permission_level: "viewer" },
    "sess-outro": { tenant: { id: "t2", name: "Dois" }, user: { email: "caio@y.com" }, permission_level: "admin" },
  };
});

describe("playground BFF", () => {
  it("exige sessão válida no identity", async () => {
    const s = await server();
    expect((await s.call("GET", "/config")).status).toBe(401);
    expect((await s.call("GET", "/config", "sess-falsa")).status).toBe(401);
    s.close();
  });

  it("só admin cadastra a chave, que é validada no proxy e nunca volta ao navegador", async () => {
    const s = await server();
    expect((await s.call("PUT", "/ignus-key", "sess-viewer", { api_key: "sk_ic_valida_123456" })).status).toBe(403);
    expect((await s.call("PUT", "/ignus-key", "sess-admin", { api_key: "sk_ic_recusada_00000" })).status).toBe(400);
    expect(stored.t1).toBeUndefined();

    const ok = await s.call("PUT", "/ignus-key", "sess-admin", { api_key: "sk_ic_valida_123456" });
    expect(ok.status).toBe(200);
    expect(stored.t1).toBe("sk_ic_valida_123456");

    const cfg = await s.call("GET", "/config", "sess-viewer");
    expect(cfg.body.ignusCode).toMatchObject({ configured: true, last4: "3456" });
    expect(JSON.stringify(cfg.body)).not.toContain("sk_ic_");
    s.close();
  });

  it("a chave é do tenant da sessão: outro tenant não a usa", async () => {
    stored.t1 = "sk_ic_valida_123456";
    const s = await server();
    expect((await s.call("GET", "/models", "sess-admin")).body.models).toHaveLength(2);
    const outro = await s.call("GET", "/models", "sess-outro");
    expect(outro.status).toBe(409);
    expect(outro.body.error).toBe("ignus_key_missing");
    s.close();
  });

  it("roda o mesmo prompt em cada modelo, com contexto das bases e sessão única no guard", async () => {
    stored.t1 = "sk_ic_valida_123456";
    const s = await server();
    const r = await s.call("POST", "/run", "sess-admin", { models: ["a/m1", "quebrado/x"], prompt: "Qual o prazo?", kb_ids: ["kb1"], email: "intruso@z.com" });
    expect(r.status).toBe(200);
    expect(r.body.context).toHaveLength(1);
    const [ok, bad] = r.body.results;
    expect(ok).toMatchObject({ model: "a/m1", ok: true, output: "resposta de a/m1", tokensIn: 10, tokensOut: 5, costUsd: 0.0001 });
    expect(bad).toMatchObject({ model: "quebrado/x", ok: false, status: 404 });
    expect(bad.error).toContain("model_unavailable");

    const chats = calls.filter((c) => c.url.endsWith("/chat/completions"));
    expect(chats).toHaveLength(2);
    const sessions = new Set(chats.map((c) => new Headers(c.init?.headers).get("X-Urag-Session")));
    expect(sessions.size).toBe(1);
    expect([...sessions][0]).toBe(r.body.sessionId);
    const h = new Headers(chats[0].init?.headers);
    expect(h.get("X-Urag-Tenant")).toBe("t1");
    expect(h.get("X-Urag-User")).toBe("ana@x.com");
    expect(h.get("X-Urag-Source")).toBe("guard-playground");
    // O contexto recuperado foi para o system de todos.
    const sent = JSON.parse(String(chats[0].init?.body));
    expect(sent.messages[0].role).toBe("system");
    expect(sent.messages[0].content).toContain("O prazo é 30 dias.");
    // A busca foi pelo e-mail da sessão, não por algo vindo do cliente.
    const search = calls.find((c) => c.url.endsWith("/knowledge-search"));
    expect(JSON.parse(String(search?.init?.body)).email).toBe("ana@x.com");
    s.close();
  });

  it("base fora do acesso: recusa sem chamar modelo nenhum", async () => {
    stored.t1 = "sk_ic_valida_123456";
    searchStatus = 403;
    const s = await server();
    const r = await s.call("POST", "/run", "sess-admin", { models: ["a/m1"], prompt: "x", kb_ids: ["kb-alheia"] });
    expect(r.status).toBe(403);
    expect(calls.some((c) => c.url.endsWith("/chat/completions"))).toBe(false);
    s.close();
  });

  it("valida a entrada", async () => {
    stored.t1 = "sk_ic_valida_123456";
    const s = await server();
    expect((await s.call("POST", "/run", "sess-admin", { models: [], prompt: "x" })).status).toBe(400);
    expect((await s.call("POST", "/run", "sess-admin", { models: ["a", "b", "c", "d", "e"], prompt: "x" })).status).toBe(400);
    expect((await s.call("POST", "/run", "sess-admin", { models: ["a/m1"], prompt: "  " })).status).toBe(400);
    s.close();
  });
});

describe("buildMessages", () => {
  it("sem bases nem system manda só o usuário", () => {
    expect(buildMessages("", "oi", [])).toEqual([{ role: "user", content: "oi" }]);
  });
});
