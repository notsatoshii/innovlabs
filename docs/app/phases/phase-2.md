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
