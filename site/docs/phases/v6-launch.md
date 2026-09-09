# v6: Launch

Goal: the site at https://innovlab.me is discoverable, measurable, and has no loose ends
from the review-server days. Split into what is done, what this phase builds without input,
and what waits on Eric.

## Done before this file (2026-09-09)

- Domain `innovlab.me` on Gabia DNS; Caddy on the droplet terminates HTTPS and proxies
  `innovlab.me` to the nginx container (8080), `www` redirects, `app.innovlab.me` to the
  funnel (3100).
- `PROD=1 bash site/deploy/publish.sh` builds with the real domain in canonical, hreflang,
  Open Graph, the survey CTA, and the inquiry endpoint.
- Both locales, all five copy pages, live.

## Built in this phase without input

1. `sitemap-index.xml` via `@astrojs/sitemap` with `ko-KR` and `en-US` alternates;
   `robots.txt` pointing at it.
2. `astro.config.mjs` defaults to the production domain; the old `innovlabs.kr` placeholder
   and its TODO are gone.
3. A branded 404 page in both languages, served by nginx through `error_page`. The nginx
   config now lives in the repo (`deploy/nginx.conf`) and publishes with the site.
4. Lighthouse mobile baseline on the Korean home, recorded in the session notes.
5. Dead `FORM_ENDPOINT` export removed from `src/config.ts`.

## Needs from Eric

1. **Analytics (DECIDE).** Recommendation: a cookieless, self-hosted counter (Umami on the
   droplet, one container, ~50 MB) so there is no consent banner under 개인정보보호법 and
   nothing leaves the box. Alternatives: Plausible Cloud (paid, same privacy posture), GA4
   (needs a consent banner in Korea, heavier script). Events to track: survey CTA clicks per
   page, inquiry form submitted, language toggle.
2. **Search consoles.** Google Search Console and Naver Search Advisor both need a
   verification meta tag; Naver is the one that matters for Korean office workers searching.
   Eric creates the properties (they bind to a personal account), sends the two meta values,
   and I add them to `Base.astro` and submit the sitemap in both.
3. **Email and KakaoTalk channel links.** Still placeholders on the contact page and in the
   footer. One email address and one channel URL.
4. **English path (logged since the sitemap review).** Every English CTA lands on the
   Korean-only survey. Options: (a) an English survey path in the app, (b) an English
   waitlist page on the site with an email capture, (c) leave it and add one honest line on
   the English pages saying the program runs in Korean. Recommendation: (c) now, (a) when
   an English cohort is real.
5. **Supabase, three checks in the dashboard.** The `inquiry` table exists (migration 0003
   applied), Authentication → URL Configuration lists `https://app.innovlab.me` and its
   `/auth/callback`, and a backup schedule or at least a Point-in-Time setting, because the
   project disappeared once already.
6. **Caddyfile cleanup on the droplet**, one command, since the old duckdns host is dead:

   ```bash
   ssh root@165.245.186.254 'cp /etc/caddy/Caddyfile /etc/caddy/Caddyfile.bak && sed -i "/^innovlabs\.duckdns\.org {/,/^}/d" /etc/caddy/Caddyfile && caddy validate --config /etc/caddy/Caddyfile && systemctl reload caddy'
   ```

7. **Uptime.** A free external check (UptimeRobot or similar) on `/` and `/en/`, plus
   `app.innovlab.me/start`. Eric's account, five minutes to set up.

## Not in this phase

Paid ads landing variants, A/B testing, a blog or changelog feed, structured data beyond
Organization (add when there is a course with a date to mark up).

## Self-review checklist

- `curl` the sitemap, robots, and a 404 path on the live domain after publish.
- Both consoles show the sitemap accepted and zero hreflang errors after a week.
- Lighthouse mobile: performance and accessibility at or above the baseline on home,
  courses, companies (Korean).
