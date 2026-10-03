# Tonight's loop (2026-10-04)

Eric: "keep going and stop asking me permission create a loop to keep going for tonight".
Live: main e5c47b8 on innovlab.me and app.innovlab.me (R4b). Branch: `rebrand-r4` (== main), worktree
`.claude/worktrees/rebrand-r4`.

Rules: copy frozen (no new or changed Korean/English strings); no facts, prices or legal text; no data
changes. Clay follows the test board (big, partly behind glass, colour wash), never small stickers
(docs/brand/r4b-plan.md). Before each deploy: site `cp -a dist dist.bak-<stamp>` on the droplet, app
note `/opt/funnel` sha. After: verify live, log here and in now.md.

Each iteration: pick the top open item → plan in 2-3 lines here → build → checks (site: checks.mjs,
slow-4G CLS, axe; app: tsc, eslint, next build, axe) → screenshots at 390 and 1280 → separate reviewer
for visual changes → fix → deploy → log.

## Backlog (top = next)

| # | Item | Status |
|---|------|--------|
| 1 | App screens beyond /start (survey, teaser, hagwon flow, login, 404): screenshot at 390/1280, axe, check against the clay + glass system and the board's wash; fix visual inconsistencies only | |
| 2 | Site EN pages (/en/*): same sweep as KO (overflow, crops, axe, CLS) | |
| 3 | Whole-site fresh-eyes review of every KO page vs the board at 390/1280 → material fixes | |
| 4 | Lighthouse (mobile) on innovlab.me home + app /start: performance, a11y, best practices, SEO; fix what is not a product decision | |
| 5 | /business desktop header: lone ring (R3 leftover) — try the board treatment (clay partly behind the header's glass), keep only if a reviewer prefers it to R3 | |
| 6 | Reduced motion + keyboard pass on app flows (survey, teaser) | |

## Log
- #1 app screens: survey, hagwon, login, solo, student, register, 404 swept at 390/1280: no axe
  violations, no overflow, no JS errors. Login, register, 404 and the coming-soon intros had no clay
  and a large empty top; they now get a compact clay row (bubble + asterisk, sized to stay inside
  its own height). Scripted check: no clay over any text at 360/390/1280. Deployed with the commit below.
