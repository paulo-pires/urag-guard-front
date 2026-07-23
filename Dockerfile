# ── builder ──────────────────────────────────────────────────────────────────
FROM oven/bun:1-alpine AS builder
WORKDIR /app

COPY bun.lock package.json ./
RUN bun install --frozen-lockfile

COPY . .

# Build Vite static assets
RUN bun x vite build

# Bundle Express server completo (sem --packages=external = sem node_modules em runtime)
RUN bun x esbuild server.ts \
      --bundle \
      --platform=node \
      --format=cjs \
      --sourcemap \
      --outfile=dist/server.cjs

# ── runner ────────────────────────────────────────────────────────────────────
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3001

COPY --from=builder /app/dist ./dist

EXPOSE 3001

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3001/v1/health || exit 1

CMD ["node", "dist/server.cjs"]
