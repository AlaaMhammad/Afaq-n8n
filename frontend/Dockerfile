# syntax=docker/dockerfile:1
# Next.js 16 frontend — production image (output: "standalone")
#
# NEXT_PUBLIC_* values are inlined into the client bundle, so they are build args.
# API_INTERNAL_URL at build time is where the prerender fetches services/projects/team: the API
# must be reachable then, or the static shell is built with empty sections. deploy.sh builds
# with --network host and points it at the web container's loopback port.

########################
# deps: install from the lockfile
########################
FROM node:22-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

########################
# build
########################
FROM node:22-alpine AS build
WORKDIR /app
ARG NEXT_PUBLIC_API_URL=https://dashboard.afaqn8n.me/api/v1
ARG NEXT_PUBLIC_SITE_URL=https://afaqn8n.me
ARG API_INTERNAL_URL=https://dashboard.afaqn8n.me/api/v1
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    API_INTERNAL_URL=$API_INTERNAL_URL \
    NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

########################
# runner: only the standalone server + static assets
########################
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
USER node
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s CMD wget -qO- http://127.0.0.1:3000/ar >/dev/null || exit 1
CMD ["node", "server.js"]
