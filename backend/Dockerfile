# ────────────────────────────────────
# 1) BUILD STAGE (gets *everything*)
# ────────────────────────────────────
FROM node:22-bookworm-slim AS builder

WORKDIR /app

# copy both package.json & lockfile so npm ci will install exactly what you built with
COPY package.json package-lock.json ./

# full install (dev + prod + optional)
RUN npm ci --omit=dev --omit=optional

# copy the rest of your code
COPY . .

# ────────────────────────────────────
# 2) PRODUCTION STAGE (only prod deps)
# ────────────────────────────────────
FROM node:22-bookworm-slim
WORKDIR /app

# copy source + node_modules from builder
COPY --from=builder /app ./

# now prune out dev & optional deps
RUN npm prune --production

# Install CLI globally (or you can install it as a production dep)
RUN npm install -g fastify-cli

ENV NODE_ENV=production
EXPOSE 8080

# Use the Fastify CLI to start the plugin in server.js:
ENTRYPOINT ["fastify","start"]
CMD ["server.js","-l","info","--address","0.0.0.0","--port","8080"]
