FROM node:20-alpine AS builder

RUN npm install -g pnpm

WORKDIR /app

# Install deps (workspace-aware)
COPY package.json pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/

RUN pnpm install --frozen-lockfile

# Copy source and build
COPY packages/shared/src ./packages/shared/src
COPY apps/api/src ./apps/api/src
COPY apps/api/build.mjs ./apps/api/

RUN pnpm --filter=@bresca/api build

# ── Runtime image ────────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/apps/api/dist/index.js ./index.js

EXPOSE 3000
CMD ["node", "index.js"]
