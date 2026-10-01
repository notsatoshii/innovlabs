# App Phase 2: courses, cohorts, and the Week 1 to 3 labs

Status: 2a and 2b DEPLOYED 2026-10-01; 2c planned in phase-2c.md. Eric: "keep going on build and improving this
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

Not yet done after the 2a deploy (kept for the record; the section below
closes most of it):
- Registration from inside KakaoTalk on real phones; one Google sign-in. (Eric)
- Keep the Supabase project from pausing again (plan or a daily ping). (Eric)

## Phase 2b tested, reviewed, deployed, 2026-10-01 (night)

Build `717d704` is live on app.innovlab.me (previous build `bb08b30` in
`/root/funnel-prev-commit`). Migration 0010 applied. CI green on the same
commit. Signed-in checks now live in `scripts/checks/` (README there); they
ran against the dev server and again against the live site, and every test
row, account, cohort, and file was removed afterwards (database back to 6
profiles, 19 responses, 67 events, no drafts, no cohorts).

### Test (process step 4)

- Week 2 routes and pages, 21 checks: session and profile guards, validation
  with Korean messages, version numbering, library cap of 12, size limits,
  both JSON-path filters, both lab pages and 나의 AI 교육 server-rendered
  with the learner's own client.
- Row-level security with a learner token: own harness rows readable with
  the JSON-path select; direct inserts of `harness_saved` and
  `correction_logged` refused; update and delete refused; anon reads nothing;
  instructor notes invisible to the learner.
- Browser at 375 wide, signed in: library list at the cap, editor, preview,
  save, correction form, "규칙으로 추가하기" hand-off, mark as written, repeat
  count. No horizontal scroll, inputs at 16px. Signed out: redirect to
  `/login`. Signed in without a profile: redirect to `/start`, routes 409.
- Lint and build clean.

### Findings (process step 5), from the database test and a fresh reviewer

| # | Finding | State |
|---|---|---|
| 1 | Five saves at once returned versions 4, 4, 6, 6, 8: count-then-insert is not atomic. | Fixed. Unique index on (learner, harness, version) in 0010; the route retries on 23505. |
| 2 | Version was count + 1, so a gap in the history would collide forever. | Fixed. Next version is the highest saved + 1. |
| 3 | No ceiling on versions; a retry after a lost response stored a copy. | Fixed. Saving text equal to the latest version writes nothing and returns that version; 80 versions a harness (`HARNESS_LIMITS.maxVersions`); 1,000 correction lines a learner. |
| 4 | Supabase's default grants left TRUNCATE, and UPDATE/DELETE with no policy behind them, on every table for `anon` and `authenticated`. | Fixed in 0010. Each role keeps only what a policy uses; verified with API-role requests (16 checks), including that a learner can still edit the identity columns and nothing else. New tables in later migrations need their own revokes. |
| 5 | Draft cap of 200 KB was smaller than a full library (12 harnesses, about 500 KB): autosave would start failing around the eighth full harness. | Fixed. 600 KB for the harness draft only. |
| 6 | A draft older than the latest save came back as "unsaved edits"; saving it undid the save. | Fixed. The saved version wins when the draft row is older; the draft is flushed right after a save. Relies on the app server and database clocks agreeing to within a second or two. |
| 7 | A correction was logged as "written as a rule" when the rule entered the draft, before the harness was saved. | Fixed. Logged after a save that contains the rule. |
| 8 | The same correction made again vanished into the existing line. | Fixed. The line shows "N번 고침" and the last date. |
| 9 | Privacy line said only the instructor can see a harness; admin staff can too, drafts included. | Fixed in the app ("본인과 강사·운영진만"). The Week 2 session plan still has the instructor say nobody sees it: Eric's wording to change. |
| 10 | Korean strings that read translated (10 strings, listed in the commit). | Fixed. |
| 11 | Week 2 page tells learners to open the three harness templates (SP-HL-01 to 03); the app only has three document-type labels. Also: "결과를 수정 기록 문서에 옮겨", "text files" for Week 3. | **Eric decides.** Hand the templates out on paper, or build "템플릿으로 시작" into the editor from the drafts in the private workspace, and add a text export. Not blocking the deploy; blocking a real Week 2 session. |
| 12 | The staff learner page shows Week 2 work only as raw JSON in the full log. | Deferred to 2c (staff views for Week 2 and 3 work come with the countersign). |
| 13 | Two new harnesses saved in the same instant at 11 can land at 13. | Accepted. Harmless, and the cap is a guard rail, not a rule. |
| 14 | A re-post through the form with "네, 적었어요" is not counted as a repeat. | Accepted. It cannot be told apart from the mark. |

Not a finding after all: two scripted clicks in the same instant sent two
requests from every form. A real second tap arrives after React 19 has
committed the disabled state, so it cannot happen by hand. No client change.

### Also closed from the 2a list

- **Staff pages in a browser** at 375 wide: create a cohort, open a week early,
  enroll a learner by email, roster, learner view, instructor note (and the
  note is invisible to the learner). All work. Cosmetic: on the cohort page
  the open-week help line renders under the status control.
- **Evidence upload** end to end, 14 checks: own-folder upload, another
  learner's folder refused, non-image and over 5 MB refused, time log with
  the evidence path, signed URL for the learner and for staff, none for
  another learner, bucket not public.
- **Employee-path registration** through `/api/register` with a full
  employee response: anonymous insert, foreign origin refused, consent
  required, profile built from the stored answers with the server's own
  scoring, `registered` event, second call updates identity only.
- **Privileges**: the revoke on `user_profile`, widened to every table (0010).
- **Tools-tab critic step**: see `ui-tools-redesign.md`, section "Critique".

### Deploy steps (to redo)

1. `npx tsx scripts/db.ts --file supabase/migrations/0010_harness_versions_and_grants.sql`
   (either order with the code; run the checks at the bottom of the file).
2. On the droplet: `cd /opt/funnel && git rev-parse --short HEAD > /root/funnel-prev-commit && git pull --ff-only && docker compose up -d --build`.
3. `CHECK_BASE=https://app.innovlab.me` and the scripts in `scripts/checks/`, then the cleanup in its README.
