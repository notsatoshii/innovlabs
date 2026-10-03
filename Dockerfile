# Multi-stage build for the Next.js standalone output (DigitalOcean droplet).

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# npm 11 wrote package-lock.json; node:22 ships npm 10, which reads it as out
# of sync. Pinned to the exact version so two builds of one commit agree.
# The lockfile must be written on Linux (or with the Linux and musl optional
# packages kept): CI builds this image on every push to catch a Windows-written
# lockfile before the droplet does (docs/app/phases/phase-1.md §16).
RUN npm install -g npm@11.6.2 && npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# NEXT_PUBLIC_* values are inlined into the client bundle at build time.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_AUTH_KAKAO
ARG NEXT_PUBLIC_Q5_VARIANT
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_AUTH_KAKAO=$NEXT_PUBLIC_AUTH_KAKAO
ENV NEXT_PUBLIC_Q5_VARIANT=$NEXT_PUBLIC_Q5_VARIANT
ENV NEXT_TELEMETRY_DISABLED=1
# Stop here, with a readable message, when a required build value is empty.
# (compose passes an empty string when .env lacks the variable; the build used
# to succeed and every browser call then failed. next.config.ts checks the
# same two again.)
RUN if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then \
      echo "ERROR: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set at build time." >&2; \
      echo "       Put them in .env next to docker-compose.yml (see .env.example), then: docker compose up -d --build" >&2; \
      exit 1; \
    fi
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
# next/image writes optimized images to .next/cache; the app runs as nextjs,
# so it must own that folder (otherwise every request re-optimizes: EACCES).
RUN mkdir -p .next/cache && chown -R nextjs:nodejs .next/cache
USER nextjs
EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0
# Process up and environment present. The database is checked by the external
# monitor on /api/health (no ?probe), so an outage there does not flag the
# container. The first call also writes any missing variable to the log.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -q -O /dev/null "http://127.0.0.1:3000/api/health?probe=live" || exit 1
CMD ["node", "server.js"]
