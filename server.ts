import express from "express";
import path from "path";
import { createProxyMiddleware } from "http-proxy-middleware";

const app = express();
const PORT = parseInt(process.env.PORT || "3001", 10);
const GUARD_API_URL = process.env.GUARD_API_URL || "http://urag-guard:8091";
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

// Serve static frontend assets
const distPath = path.join(process.cwd(), "dist");
app.use(express.static(distPath));
app.get("*", (_req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`uRag Guard Front ouvindo em http://localhost:${PORT}`);
  console.log(`Proxy API -> ${GUARD_API_URL}`);
});
