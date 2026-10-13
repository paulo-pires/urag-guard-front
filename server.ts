import express from "express";
import path from "path";
import http from "http";
import { createProxyMiddleware } from "http-proxy-middleware";
import { playgroundRouter } from "./server/playground";

export const app = express();
const PORT = parseInt(process.env.PORT || "3001", 10);
const IDENTITY_URL = process.env.IDENTITY_URL || "http://urag-identity:8105";
const GUARD_API_URL = process.env.GUARD_API_URL || "http://urag-guard:8091";
const OBSERVABILITY_URL = process.env.OBSERVABILITY_URL || "http://urag-observability:8091";
const GUARD_API_KEY = process.env.GUARD_API_KEY || "";
const GUARD_ADMIN_KEY = process.env.GUARD_ADMIN_KEY || "";
// Playground (IGN-133): proxy LLM, bases do IgnusTec IA e o token interno
// compartilhado com urag-guard-go / urag_proxy / ignustec-ia.
const PROXY_URL = process.env.PROXY_URL || "http://proxy:8080";
const IGNUSTEC_IA_URL = process.env.IGNUSTEC_IA_URL || "http://ignustec-ia:3000";
const GUARD_INTERNAL_TOKEN = process.env.GUARD_INTERNAL_TOKEN || "";

// Proxy MCP calls to urag-observability-go (unified)
// ANTES de express.json(): o body precisa passar íntegro (JSON-RPC initialize).
app.use("/mcp-proxy", (req, res) => {
  const target = new URL(OBSERVABILITY_URL);
  const proxyReq = http.request({
    host: target.hostname,
    port: target.port || "80",
    path: "/mcp",
    method: req.method,
    headers: { ...req.headers, host: target.host },
  }, (proxyRes) => {
    res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
    proxyRes.pipe(res);
  });
  proxyReq.on("error", (err) => {
    console.error("MCP proxy error:", err.message);
    if (!res.headersSent) res.writeHead(502, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ jsonrpc: "2.0", id: "proxy", error: { code: -32000, message: err.message } }));
  });
  req.pipe(proxyReq);
});

app.use(
  "/api/identity",
  createProxyMiddleware({
    target: IDENTITY_URL,
    changeOrigin: true,
    pathRewrite: { "^/api/identity": "" },
  })
);

app.use(express.json());

app.use(
  "/api/playground",
  playgroundRouter({
    identityUrl: IDENTITY_URL,
    guardApiUrl: GUARD_API_URL,
    proxyUrl: PROXY_URL,
    ignustecIaUrl: IGNUSTEC_IA_URL,
    internalToken: GUARD_INTERNAL_TOKEN,
  }),
);

// Health check
app.get("/v1/health", (_req, res) => {
  res.json({ status: "online", version: "1.0.0-uRag-guard" });
});

// Proxy all /v1/* API calls to urag-guard-go backend
// Nota: com http-proxy-middleware v3 e app.use("/v1", ...) o mount path é
// REMOVIDO do request upstream (v3 mudou o comportamento da v2). Por isso o
// pathRewrite re-adiciona o prefixo /v1, senão o guard responde 404.
// Rotas admin (projects, users, api-keys, saml) exigem X-Api-Key kind=admin;
// as demais usam a dashboard key.
const ADMIN_PATHS = [
  "/v1/projects", "/v1/users", "/v1/saml-providers",
];
app.use(
  "/v1",
  createProxyMiddleware({
    target: GUARD_API_URL,
    changeOrigin: true,
    pathRewrite: (path, _req) => `/v1${path}`,
    on: {
      proxyReq: (proxyReq, req, _res) => {
        const isAdmin = ADMIN_PATHS.some((p) => (req.url || "").startsWith(p));
        const key = isAdmin ? GUARD_ADMIN_KEY : GUARD_API_KEY;
        if (key) {
          proxyReq.setHeader("X-Api-Key", key);
        }
      },
    },
  })
);

// Serve static frontend assets
const distPath = path.join(process.cwd(), "dist");
app.use(express.static(distPath, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith(".html")) {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
    } else if (filePath.endsWith(".js")) {
      res.setHeader("Content-Type", "application/javascript; charset=utf-8");
    } else if (filePath.endsWith(".css")) {
      res.setHeader("Content-Type", "text/css; charset=utf-8");
    }
  },
}));
app.get("*", (_req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.sendFile(path.join(distPath, "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`uRag Guard Front ouvindo em http://localhost:${PORT}`);
  console.log(`Proxy REST -> ${GUARD_API_URL}`);
  console.log(`Proxy MCP -> ${OBSERVABILITY_URL}`);
});
