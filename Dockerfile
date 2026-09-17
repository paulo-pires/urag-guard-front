# ── builder ──────────────────────────────────────────────────────────────────
# Contexto de build = RAIZ do mono-repo (workspace bun), nao este diretorio.
# O compose passa `context: .` e `dockerfile: urag-guard-front/Dockerfile`.
# Sem a raiz, `@urag/ui: workspace:*` nao resolve.
FROM oven/bun:1-debian AS builder
WORKDIR /app

COPY package.json bun.lock ./
# packages/ui vem INTEIRO antes do install (408 KB): o script `prepare` dele
# roda tsup durante o `bun install`, e sem a fonte o tsup falha com "No input
# files". Ele tambem produz o dist/ que o front importa -- dist/ e gitignorado,
# entao tem que nascer aqui dentro.
COPY packages/ui packages/ui
COPY urag-guard-front/package.json urag-guard-front/
RUN bun install --frozen-lockfile

COPY urag-guard-front urag-guard-front

# Build Vite static assets
RUN cd urag-guard-front && bun x vite build

# Bundle Express server completo (sem --packages=external = sem node_modules em runtime)
RUN cd urag-guard-front && bun x esbuild server.ts \
      --bundle \
      --platform=node \
      --format=cjs \
      --sourcemap \
      --external:vite \
      --outfile=dist/server.cjs

# ── runner ────────────────────────────────────────────────────────────────────
FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3001 \
    GUARD_API_URL=http://urag-guard:8091 \
    GUARD_API_KEY=

COPY --from=builder /app/urag-guard-front/dist ./dist

EXPOSE 3001

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3001/v1/health || exit 1

CMD ["node", "dist/server.cjs"]
