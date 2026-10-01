# Deploying to the DigitalOcean droplet

What runs where:

| Piece | Where | How it is reached |
| --- | --- | --- |
| Funnel app (this repo, Next.js standalone) | Docker on the droplet, `127.0.0.1:3100` | `https://app.innovlab.me` through Caddy |
| Marketing site (`site/`, Astro) | nginx container on the droplet, port `8080` (`site/deploy/publish.sh`) | `https://innovlab.me` through Caddy |
| Reverse proxy and TLS | Caddy on the droplet (`deploy/Caddyfile.example`) | ports 80 / 443 |
| Database, auth, storage | Supabase (hosted) | from the browser and from the app server |

`deploy/Caddyfile.example` was reconstructed from what the live site shows; the
droplet's real `/etc/caddy/Caddyfile` was never committed. Diff the two before
trusting this file for a rebuild (the command is at the top of the example).
Likewise, check `git status` in `/opt/funnel` before the first pull after
2026-10: the repo's compose file used to publish port 3000, production runs on
3100, so the droplet may carry a local edit.

## Environment

All variables are listed in `.env.example` with what each one does. On the
droplet they live in `/opt/funnel/.env` (never committed).

| Variable | When it is read | If it is missing |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | build | the image build stops with a message |
| `SUPABASE_SECRET_KEY` | run | registration, inquiry form, labs, staff pages and the report answer 503; `/api/health` fails |
| `ANTHROPIC_API_KEY` | run | the report cannot be generated |
| `INQUIRY_ALLOWED_ORIGINS` | run | the marketing site's form is refused (403); set `https://innovlab.me` |
| `NEXT_PUBLIC_SITE_URL` | build | no privacy-policy link on the consent screen |
| `NEXT_PUBLIC_AUTH_KAKAO`, `NEXT_PUBLIC_Q5_VARIANT` | build | Kakao greyed out; Q5 defaults to the grid |

A build value changes only with `docker compose up -d --build`. A run value
changes with `docker compose up -d` (recreates the container).

## One-time setup (Ubuntu droplet, as root or with sudo)

```bash
# 1. Docker
curl -fsSL https://get.docker.com | sh

# 2. Caddy (official apt repository: https://caddyserver.com/docs/install#debian-ubuntu-raspbian)
apt install -y caddy

# 3. Clone the repo
git clone https://github.com/notsatoshii/innovlabs.git /opt/funnel
cd /opt/funnel

# 4. Environment
cp .env.example .env
nano .env        # fill in every line under "Required" and "Features"

# 5. Build and run (the build stops if a required value is empty)
docker compose up -d --build
docker compose ps                      # STATUS shows "healthy" after ~30 s
curl -s http://127.0.0.1:3100/api/health

# 6. Reverse proxy and TLS. DNS for app.innovlab.me and innovlab.me must
#    already point at the droplet; Caddy gets the certificates by itself.
cp deploy/Caddyfile.example /etc/caddy/Caddyfile
caddy validate --config /etc/caddy/Caddyfile && systemctl reload caddy
```

After the first deploy, in Supabase (Authentication -> URL Configuration):

- Site URL: `https://app.innovlab.me`
- Additional redirect URLs: `https://app.innovlab.me/auth/callback`
  (keep the `http://localhost:3000` entries for local development)

And in Supabase (Authentication -> Providers / Emails):

- "Confirm email" stays ON. Staff access requires a confirmed address
  (migration 0009).
- Custom SMTP is configured. The built-in mailer is capped at a few messages
  an hour and may deliver only to the project's own team; without custom SMTP
  the email-code sign-in, which is the main door inside KakaoTalk, is closed.

## Each release

```bash
cd /opt/funnel && git pull && docker compose up -d --build
docker compose ps                               # healthy?
curl -s https://app.innovlab.me/api/health      # {"ok":true,...}
docker compose logs --tail 50 app | grep '\[env\]\|\[health\]'
```

Migrations are applied from a local machine, not from the droplet:

```bash
npx tsx scripts/db.ts --file supabase/migrations/NNNN_name.sql
```

Order matters when a migration takes a permission away from the browser.
**0009_hardening.sql: deploy the code first, apply the migration second.** It
removes the browser's INSERT on `user_profile` and `inquiry` and narrows the
event types a browser may write; the routes that replace those writes
(`/api/register`, `/api/inquiry`, `/api/inquiry/consult`) must already be
live, and `SUPABASE_SECRET_KEY` must be set, or nobody can register.

## Health and monitoring

- `GET /api/health` answers `200 {"ok":true,"checks":{"env":true,"supabase":true}}`
  when the process is up, the required variables are present, and one read
  from Supabase came back within 2 seconds. Anything else is `503`. The body
  never says why; the reason is in the container log (`[env]`, `[health]`).
- `GET /api/health?probe=live` skips the database read. The image's
  `HEALTHCHECK` uses it, so `docker compose ps` shows whether the app itself
  is fine even while Supabase is down.
- Point an external uptime monitor (any free one) at
  `https://app.innovlab.me/api/health`, every 5 minutes, alerting on a
  non-200. This is the check that would have caught the paused Supabase
  project on 2026-10-01. Not set up yet: it needs an account and an address
  to alert.
- Logs rotate at 5 x 10 MB (`docker-compose.yml`): `docker compose logs -f app`.

## Database safety

- The Supabase project must be on a plan that does not pause when idle and
  that keeps daily backups. A free-tier project pauses after 7 idle days and
  has no point-in-time recovery.
- `deploy/backup.sh` takes a `pg_dump` of the `public` schema and keeps the
  last eight; the header has the cron line and the restore command. Copy the
  dumps off the droplet (the script marks where).
- QA and test accounts belong in a separate Supabase project, not in the one
  that holds real baselines.

## Rebuilding from nothing

1. New droplet: the one-time setup above.
2. `.env`: from the password manager, not from memory. `/api/health` and the
   container log say which variable is missing.
3. Marketing site: `PROD=1 ./deploy/publish.sh` from `site/`.
4. Supabase: if the project itself is gone, create one, apply
   `supabase/migrations/0001` to the latest in order, restore the newest dump
   with `pg_restore`, then redo the URL configuration, providers and SMTP.
   The project URL is inlined at build time: rebuild the image after changing
   it.
