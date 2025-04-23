# ────────────────────────────────────
# 1) BUILD STAGE (gets *everything*)
# ────────────────────────────────────
FROM node:22.14.0-slim AS builder
WORKDIR /app

# copy both package.json & lockfile so npm ci will install exactly what you built with
COPY package.json package-lock.json ./

# full install (dev + prod + optional)
RUN npm ci

# copy the rest of your code
COPY . .

# ────────────────────────────────────
# 2) PRODUCTION STAGE (only prod deps)
# ────────────────────────────────────
FROM node:22.14.0-slim
WORKDIR /app

# copy source + node_modules from builder
COPY --from=builder /app ./

# now prune out dev & optional deps
RUN npm prune --production

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

# skip fastify-cli, just run your server directly
CMD ["node", "server.js"]
