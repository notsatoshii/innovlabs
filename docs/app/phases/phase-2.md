# App Phase 2: courses, cohorts, and the Week 1 to 3 labs

Status: 2a BUILDING 2026-10-01. Eric: "keep going on build and improving this
application including the courses. Let's go." Earlier decision D7: Phase 2
ships before cohort 1 and learners fill the Week 1 to 3 forms in the app, so
nothing is imported from paper.

Sources: `docs/curriculum/innovlabs-spine-w1-session-plan.md`,
`innovlabs-spine-w2-w3-session-plans.md`, `innovlabs-curriculum-program.md`,
`docs/app/phases/phase-1.md` §5.4 (event catalog), `CLAUDE.md`.

## Split

| Part | Contents |
|---|---|
| **2a (now)** | Cohorts and enrollment, the 코스 tab, learner-facing pages for spine Weeks 1 to 3, the Week 1 labs (Work Map, basics drill, time log), server-side drafts, evidence uploads, a minimal staff page (create a cohort, roster, each learner's Week 1 work). |
| 2b | Week 2 labs: harness builder (six parts, ten-rule cap), correction log. |
| 2c | Week 3 labs: workspace check, pipeline blueprint, dry-run timer, baseline form with the instructor countersign in the staff page; track confirmation. |

## Decisions (mine unless marked; Eric overturns any in review)

| # | Decision |
|---|---|
| P1 | **Enrollment by cohort code.** The instructor shares a 6-character code in the room; the learner types it on the 코스 tab. A server route checks it and writes the enrollment and an `enrolled` event with the service role. Staff can also add a learner by email from the staff page. |
| P2 | **Staff page at `/app/staff`**, visible only with a staff role: create a cohort, see the roster, open a learner's Week 1 work in full (Eric: instructors have full access). The separate admin subdomain stays Phase 3; this is the minimum cohort 1 needs. |
| P3 | **Learner-facing week pages are static content**, `content/courses/spine/week-N.json`, written in Korean from the session plans: what today is for, what to bring, the lab parts with steps and "done looks like", the assignment. The instructor guide (timings, room dynamics, failure handling) stays out of the app. Weeks 4 to 12 show the fixed structure only; cartridge content arrives with each track. |
| P4 | **Weeks open by date** from the cohort's start date, one per week; staff can open a week early. Labs for a closed week are visible but locked. |
| P5 | **Drafts autosave to the server** (`artifact_draft`), so a phone dying mid-lab loses nothing. Submitting writes the event and rebuilds the profile snapshot through a server route with the service role (derived columns are not client-writable). |
| P6 | **Evidence uploads** go to a private Storage bucket `evidence`, one folder per learner, images only, 5 MB cap. Learner and staff can read; nobody else. |
| P7 | **Work Map rules from the Week 1 plan are enforced softly.** Hard: every row has a task, hours above zero, and P or T (no M at submit); exactly three candidates, each a P row of an hour or more with all five criteria scored; candidate 1 recurs weekly. Soft warnings: fewer than 10 or more than 30 rows, total outside 25 to 50 hours, a candidate under 11 points, candidate 1 or 2 not owned end to end. |
| P8 | **학원 path**: the 코스 tab stays 준비 중 for it. Modules are delivered through consulting, not the 12-week course. |
| P9 | **Not enrolled yet**: the 코스 tab shows the learner's track, the 12-week structure, and the code box. No dates, no promises. |

## Data model (`supabase/migrations/0007_courses.sql`)

- `cohort` (id, code unique, name, track_code, starts_on, schedule_note,
  venue, org_code, open_week, status, created_by, created_at). Select: staff,
  or a learner enrolled in it. Writes: server routes with the service role
  after a staff check.
- `enrollment` (cohort_id, user_id, status, enrolled_at; PK both). Select:
  own or staff. Writes: service role only.
- `artifact_draft` (user_id, kind, data jsonb, updated_at; PK user_id+kind).
  Own read and write; staff read.
- Storage bucket `evidence` (private) with own-folder insert/select and staff
  select.

Events used in 2a (all already in the catalog): `enrolled`,
`work_map_submitted`, `drill_completed`, `time_log_entry`, `lab_completed`.

## Routes

| Route | Owner | What |
|---|---|---|
| `/app/courses` | courses agent | Enrollment card or code box; 12-week timeline; track card. |
| `/app/courses/week/[n]` | courses agent | Learner page for week n (1 to 3 real, 4 to 12 structure). Lab links. |
| `POST /api/cohort/join` | courses agent | `{ code }` → enrollment + event. |
| `/app/lab/work-map`, `/app/lab/drill`, `/app/lab/time-log` | lab agent | Week 1 labs. |
| `PUT /api/drafts/[kind]`, `POST /api/artifacts/work-map`, `/drill`, `/time-log` | lab agent | Draft autosave; validated submit, event, snapshot. |
| `/app/staff`, `/app/staff/cohort/[id]`, `/app/staff/learner/[userId]` | staff agent | Cohorts, roster, learner's work. |
| `POST /api/staff/cohort`, `POST /api/staff/cohort/[id]/open-week`, `POST /api/staff/cohort/[id]/enroll` | staff agent | Staff-checked writes. |

## Rules check

Korean 해요체 for the app (employee path); survey response untouched; profile
event append-only; derived snapshots written only by the service role;
learners never read each other; staff read everything; no LLM calls in 2a;
nothing promised that the course cannot show (no outcome numbers on course
pages beyond the curriculum's own measurement language).

## Open questions for Eric (none block 2a)

1. Cohort 1 facts: track or tracks, start date, weekday and time, venue. Until
   then the staff page creates cohorts with whatever staff type in.
2. The master v1 week outlines for DOC, RES, DAT (Weeks 4 to 10). I have the
   spine at full depth and only the fixed structure for the rest.
3. Whether learners may also self-enroll from a waitlist without a code.

## Integration status, 2026-10-01

Built, integrated, lint and build clean, pushed to `main`. **Nothing is
deployed and migrations 0007, 0008, 0009 are NOT applied**: the Supabase
project host stopped resolving (free-plan pause after a week idle), so
nothing could run against the database. Everything below "verified" means
type-checked, linted, built, and exercised in isolated harnesses, not on the
live stack.

What landed besides 2a (same day, from the app review in
`docs/app/reviews/2026-10-01-app-review.md`): the one-pager rebuilt around
true 12-week fact sheets with a code-supplied week list, guards on all four
slots, and cost caps; registration, inquiries, and consult requests moved to
server routes; migration 0009 (client event allowlist, closed client inserts,
confirmed and bound staff accounts, row size caps); security headers, secure
cookies, `/api/health`, CI; phone basics and copy; the tools view redesign.

Changes to earlier decisions:
- The staff section lives at `/staff`, outside the `/app` shell, so a staff
  account with no survey profile can enter. `/app` sends such an account
  there instead of to the survey.
- Labs are not hard-locked by week: week pages show the lock as guidance and
  disable their buttons, but the lab URLs work for any employee-path learner.
  Eric decides whether to enforce P4 in the routes.
- A cohort has a status control (시작 전 / 진행 중 / 종료); 종료 retires its code.

## Deploy order (once the Supabase project is restored)

The order matters. 0009 removes the browser's right to insert a profile, so
an old build cannot register anyone against it.

1. Confirm the project is back: `npx tsx scripts/db.ts --sql "select 1"`.
2. Droplet `/opt/funnel/.env`: `INQUIRY_ALLOWED_ORIGINS=https://innovlab.me`
   (plus the review origin if wanted) and `SUPABASE_SECRET_KEY` present.
   Compare the droplet's compose and Caddy files with the repo
   (`docker-compose.yml` now publishes 127.0.0.1:3100).
3. Apply 0007 (additive: cohorts, enrollment, drafts, evidence bucket).
4. Deploy the code: `git pull && docker compose up -d --build`.
5. Smoke test on the live site: one registration, one site inquiry, one
   학원 consult request, `/api/health`.
6. Apply 0008, then 0009. Run the check queries at the bottom of each.
7. `npm run seed:resources` (304 tools, the picks check runs first).
8. Signed-in pass with disposable accounts (`scripts/test-session.ts`):
   코스 code join, Week 1 labs end to end, `/staff` as admin, the tools view
   task script (the critic step of the UI loop), one real report generation
   per track with the cache and guard log lines checked.
9. On real phones: registration from inside KakaoTalk on iPhone and Android.

Also to do with the project back: decide how to stop it pausing again (paid
plan, or a daily ping from the droplet), and move `scripts/test-session.ts`
off email-and-password sign-in in the real project.

## Deployed 2026-10-01 (evening), after the Supabase project was restored

Followed the deploy order above. Migrations 0007, 0008, 0009 applied; build
`bb08b30` live on app.innovlab.me, bound to 127.0.0.1:3100 (the droplet's
old compose override that published the port publicly is renamed
`docker-compose.override.yml.pre-phase2`; previous commit hash saved in
`/root/funnel-prev-commit` for rollback); 304 tools, 22 terms, 19 picks
seeded. CI green on the same commit.

Verified on the live site with disposable accounts, all cleaned up after
(the database is back to its original 6 profiles, 19 responses, 67 events):

- Routes, security headers, Korean 404, health endpoint, inquiry origin check.
- Server-side registration (학원 path) through the real form; the consult
  button writes one inquiry and one event; site inquiry with a valid origin.
- Staff: an account with no profile lands in `/staff`; cohort create, open
  week; a learner gets 403 on staff APIs and 404 on the staff page.
- Learner: wrong and malformed codes refused, right code enrolls and is
  idempotent; draft save; Work Map, drill, and time-log routes accept valid
  work and reject invalid work, including a forged evidence path.
- Pages: 코스 enrolled view, Week 1 (one button per lab), locked Week 5,
  Work Map with the submitted version, time log, 나의 AI 교육.
- One real report generation: `stop=end_turn`, 12 weeks, `v: 2` cached,
  attempts 1, claim released; cache write 5,769 tokens on the first call
  and cache read 5,769 on the second.

Testing note: the Browser pane is hidden, and a hidden page fires no
animation frames, so pages under `/app` (which now have a loading
placeholder) never hydrate when loaded directly in it. Workaround used:
load `/start`, replace `requestAnimationFrame` with a timeout, then
`window.next.router.push(...)`. Real, visible browsers are unaffected.

Not yet done:
- Staff pages in the browser (cohort page, roster, learner view, notes) and
  evidence upload: only their APIs and guards were exercised.
- The tools-tab critic step of the UI loop on the live page.
- Employee-path registration through `/api/register` (needs a full valid
  employee response; the 학원 path proved the route).
- Registration from inside KakaoTalk on real phones; one Google sign-in.
- Phase 2b (Week 2 labs: harness library, correction log) is built and
  committed but NOT deployed and NOT tested against the database. Its two
  routes use JSON-path filters (`data->>harness_id`) that have never run.
- `authenticated` still holds TRUNCATE and DELETE table privileges on
  `user_profile` (Supabase defaults; not reachable through the REST API,
  RLS blocks DELETE). Revoke in the next hardening migration.
- Keep the Supabase project from pausing again (plan or a daily ping).
