import express from "express";
import path from "path";
import http from "http";
import { createProxyMiddleware } from "http-proxy-middleware";

export const app = express();
const PORT = parseInt(process.env.PORT || "3001", 10);
const GUARD_API_URL = process.env.GUARD_API_URL || "http://urag-guard:8091";
const OBSERVABILITY_URL = process.env.OBSERVABILITY_URL || "http://urag-observability:8091";
const GUARD_API_KEY = process.env.GUARD_API_KEY || "";

app.use(express.json());

// Health check
app.get("/v1/health", (_req, res) => {
  res.json({ status: "online", version: "1.0.0-uRag-guard" });
});

// Proxy all /v1/* API calls to urag-guard-go backend
app.use(
  "/v1",
  createProxyMiddleware({
    target: GUARD_API_URL,
    changeOrigin: true,
    on: {
      proxyReq: (proxyReq, _req, _res) => {
        if (GUARD_API_KEY) {
          proxyReq.setHeader("X-Api-Key", GUARD_API_KEY);
        }
      },
    },
  })
);

// Proxy MCP calls to urag-observability-go (unified)
// Proxy manual: http-proxy-middleware não repassa SSE (event-stream) corretamente.
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
