# ─── Stage 1: Install dependencies ────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app

# Install dependencies in isolation to leverage Docker layer cache.
# package-lock.json* handles both "present" and "absent" cases gracefully.
COPY package.json package-lock.json* ./
RUN npm ci

# ─── Stage 2: Build ────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

# DKUBEX_BASE_PATH is baked into the Next.js bundle at build time.
# Pass with: docker build --build-arg DKUBEX_BASE_PATH=/chat-app ...
# Leave empty for local/dev images (app will run at /).
ARG DKUBEX_BASE_PATH=""
ENV DKUBEX_BASE_PATH=$DKUBEX_BASE_PATH

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# ─── Stage 3: Production runner ────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
# Bind to all interfaces inside the container
ENV HOSTNAME=0.0.0.0

# Run as non-root for security
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# The standalone output includes a minimal node_modules and server.js.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./

# Static assets must live alongside the standalone server
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# public/ directory (favicon, robots.txt, etc.)
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3000

# Use the pre-built standalone server directly (not `next start`)
CMD ["node", "server.js"]
