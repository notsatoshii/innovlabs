# App Phase 2c: the Week 3 labs, the countersign, and staff views of Weeks 2 and 3

Status: PLAN, 2026-10-01. No code yet. Follows `process.md`. Assumptions
below are mine and stand until Eric overturns them; the five questions in
"Decisions only Eric can make" are the ones I will not guess.

Sources: `docs/curriculum/innovlabs-spine-w2-w3-session-plans.md` (Week 3:
lab Parts 1 to 4, artifact, signals to record), `content/courses/spine/week-3.json`
(the learner-facing page, already live), `phase-2.md` (decisions P1 to P9,
findings 11 and 12 of the 2b review), `CLAUDE.md`.

## What Week 3 needs from the app

By the end of the session a learner has: a workspace that holds their harness
and reference documents; a pipeline blueprint for candidate 1 with the
assistant placed at stages and at least one named checkpoint; one timed dry
run; a locked baseline that the instructor countersigns before the room
empties. The instructor needs to see all of that per learner, countersign in
about 20 seconds each, record the signals, and confirm tracks for Week 4.

Weeks 4, 9 and 11 read these artifacts later (the blueprint, the checkpoint,
the baseline), so their shapes are contracts, not just forms.

## Scope

In:

| Part | What |
|---|---|
| Workspace check | `/app/lab/workspace`: which assistant, the workspace's name, three yes/no checks (harness set as standing instructions, reference documents in, one-line test followed the harness), whether uploads are blocked at work. One short form, no draft. |
| Blueprint | `/app/lab/blueprint`: stage table (name, P or T, who does it, what it needs), checkpoints with what is checked, trigger, delivery. A box-and-arrow diagram drawn from the table. Server draft, versioned submit like the Work Map. |
| Dry run | A start/stop timer on the blueprint page once a blueprint is submitted. Recorded as a time log entry (method `pipeline`, flagged as a dry run), shown next to the Week 1 time. Links to the correction log for the one fix. |
| Baseline | `/app/lab/baseline`: capstone task, current method, minutes per instance from a Week 1 "before" time log entry, frequency, the Week 1 evidence, quality checklist v0 (4 to 6 lines), the learner's own confirmation. Server draft. Lock writes the event and the profile's `baseline` snapshot. |
| Countersign | Staff learner page: one button, writes `baseline_countersigned` and stamps the snapshot. After it, the baseline is frozen for the learner. |
| Staff views | Learner page: a Week 2 card (harnesses at their latest version, correction counts) and a Week 3 card (workspace, blueprint with diagram, dry-run time beside the Week 1 time, baseline). Roster: Week 2 and Week 3 columns for the plan's "signals to record". |
| Track confirmation | Staff sets each learner's track for Week 4 from the learner page; the learner sees it on the 코스 tab. Shape depends on question 2. |
| Learner surfaces | Week 3 page gets its lab buttons; 나의 AI 교육 gets blueprint and baseline cards. |
| Carried from 2b | "템플릿으로 시작" in the harness editor and a text export, if question 1 says so. |

Out (with the phase that takes it): team-shared workspaces (DOC Week 7);
the Week 9 verification design that reuses the checkpoint; the Week 11
before/after scoring against the checklist (`capstone_measured`, Phase 3);
reopening a countersigned baseline (Phase 3 backoffice); per-assistant
click-path sheets (handout, volatile; the app links nowhere for them).

## Decisions (mine unless marked)

| # | Decision |
|---|---|
| C1 | **The dry run is a time log entry**, not a field on the blueprint. `TimeLogInput.method` already has `pipeline`; the entry gains an optional `dry_run: true`. The blueprint stays a pure design; times stay in one place, so the Week 11 comparison reads one kind of event. `BlueprintSubmittedPayload.dry_run_minutes` (optional, never written) is dropped from the type. |
| C2 | **The drawing is generated**, a vertical chain of boxes with the checkpoints marked, from the stage table. No image upload. The paper sheet in the room is still where people draw; the app keeps the table. |
| C3 | **Blueprint rules.** Hard: a task name; 3 to 12 stages, each with a name, P or T, and who does it; a T stage cannot be `assistant`; at least one checkpoint, each with at least one written check; at least one checkpoint at or after the last assistant stage (the "before delivery" check); a trigger and a delivery. Soft warnings: fewer than 6 or more than 10 stages; no stage marked `assistant`; a check that is only "읽어 본다". |
| C4 | **Baseline rules.** Hard: task; at least 2 current-method stages; a Week 1 time log entry with method `before` chosen as the source of minutes (the form does not accept a typed number, so the baseline is always a logged pre-harness instance); frequency as a count per week or per month; 4 to 6 checklist lines; the confirmation tick. Evidence is optional and chosen from the learner's own Week 1 uploads. No `before` entry: the form says to log one instance done the old way this week, and cannot be locked yet (the plan's own rule; countersign then happens in Week 4). |
| C5 | **Locking.** Until the countersign the learner may lock again (new event, snapshot replaced). After it, the lock route refuses. One countersign per baseline: a second press is a no-op. |
| C6 | **Workspace check feeds `user_profile.learning`** (assistant, path, `workspace_ready`, upload block noted in `blocked_tools`). The agent-path variant of the steps is shown when `depth_flag` is `full_agent`; the form is the same. |
| C7 | **Staff views read events, not snapshots**, except the baseline (the snapshot is the object the countersign stamps). Nothing new is denormalised. |
| C8 | **No migration expected.** New event types need none; `learning` and `baseline` columns exist since 0004 and are service-role written. If question 2 adds a column, that is migration 0011, with its own revokes. |
| C9 | **Labs stay soft-locked by week**, as in 2a, until Eric rules on P4. |

## Contracts (written by the main session before any agent starts)

- `src/lib/profile/events.ts`: `WorkspaceSetupPayload`, `BaselineLockedPayload`
  (the `BaselineSnapshot` fields plus `time_log_event_id`), `BaselineCountersignedPayload`
  (`by`, `baseline_event_id`), `TrackConfirmedPayload` (question 2), `dry_run?: true`
  on `TimeLogEntryPayload`; `track_confirmed` added to the catalog and to
  `STAFF_WRITTEN_EVENTS`.
- `src/lib/courses/types.ts`: `WorkspaceInput`, `BlueprintDraft`, `BaselineDraft`,
  limits (`BLUEPRINT_LIMITS`, `BASELINE_LIMITS`), the lab href union
  (`/app/lab/workspace`, `/app/lab/blueprint`, `/app/lab/baseline`).
- `src/components/lab/rules-week3.ts` (new, pure, shared by forms and routes):
  `parseBlueprintDraft`, `checkBlueprint`, `parseBaselineDraft`, `checkBaseline`,
  `parseWorkspaceInput`, `checkWorkspace`, `toBaselineSnapshot`.
- `POST /api/artifacts/time-log`: accepts `dry_run`.

## Routes and owners

| Route | Owner | What |
|---|---|---|
| `/app/lab/workspace`, `POST /api/artifacts/workspace` | workspace-baseline agent | Check form; `workspace_setup` event; `learning` snapshot. |
| `/app/lab/baseline`, `POST /api/artifacts/baseline` | workspace-baseline agent | Draft, lock, frozen view after countersign. |
| `/app/lab/blueprint`, `POST /api/artifacts/blueprint` | blueprint agent | Stage table, diagram, submit; dry-run timer posting to the time log. |
| `/staff/learner/[userId]` cards, `/staff/cohort/[id]` columns, `POST /api/staff/learner/[userId]/countersign`, `POST /api/staff/learner/[userId]/track` | staff agent | Week 2 and 3 views, countersign, track confirmation. |
| `content/courses/spine/week-3.json` lab links, `/app/courses/week/[n]`, `/app/education` cards | main session | Small, touches shared pages. |

Files are disjoint per agent (`src/components/lab/workspace/*`, `.../baseline/*`,
`.../blueprint/*`, `src/components/staff/*`). Nobody but the main session edits
the contracts, `rules.ts`, or `week-3.json`.

## Build order

1. Contracts and `rules-week3.ts`, with a scratch script that runs the checks
   on the synthetic pack's Monday report.
2. Three agents in parallel on their files.
3. Main session: week page buttons, 나의 AI 교육 cards, integrate, lint, build.
4. `scripts/checks/week3-labs.mjs`: guards, validation, blueprint versions,
   dry-run entry, baseline lock, countersign, lock refused after countersign,
   learner cannot countersign, another learner reads nothing, staff reads all.
5. Browser pass at 375 wide: the four labs in order as one learner, then the
   staff page countersigning that learner. Korean read-aloud.
6. Fresh reviewer on the diff; fixes; findings into this file.
7. Deploy, live checks, cleanup, hand-off.

## Rules check

Korean 해요체, written from intent. Events append-only; no update or delete
path; the baseline "frozen after countersign" is a refusal in the route, not an
edit. Derived columns written by the service role only. Learners read only
their own rows; staff read everything; only staff write the countersign and
the track. No LLM calls. Outcome language: the dry-run time beside the Week 1
time is shown as two measurements with their dates, with no percentage, no
"절감", and no 보장 or 반드시 anywhere (rule 4 framing carries into the labs).

## Plan review (my own critical pass)

- **Size.** Four learner screens, two staff routes, two staff views. About the
  size of 2a's lab half. The blueprint editor is the one hard screen: a
  10-row table with three controls per row at 375 wide. It gets a row-per-card
  layout like the Work Map, and the UI loop (process.md) if the first build
  is slow to use.
- **Hidden dependency.** The baseline needs a Week 1 `before` time log entry
  and reads Work Map candidates; the blueprint prefills from candidate 1.
  A learner who skipped Week 1 in the app meets a form that cannot be locked.
  That is the curriculum's rule, but the page must say exactly what to do.
- **Session time.** Part 4 is ten minutes, the countersign twenty seconds a
  head. The staff page must show the baseline without scrolling past the
  survey answers: the Week 3 card goes to the top when a baseline is waiting.
- **What I am assuming without proof.** That learners will type a stage table
  on a phone in 18 minutes. Laptops are likely in the room; the layout must
  work on both, and the paper sheet remains the fallback.
- **Rule conflicts.** None found. The frozen baseline is consistent with
  rule 2's spirit (nothing rewritten); survey responses are untouched.

## Decisions only Eric can make

1. **Harness templates (2b finding 11).** The Week 2 page tells learners to
   open templates SP-HL-01 to 03. Build "템플릿으로 시작" into the editor from
   the drafts in the private workspace, or hand them out on paper and reword
   the page? Building it puts the template text in the public repo.
2. **Track confirmation.** The survey assigns one of six tracks; cohorts use
   seven codes (SMB is the seventh). When the instructor confirms a track in
   Week 3: may it differ from the survey's, may it be SMB, and when it
   differs, which one drives the learner's one-pager and course pages from
   then on? My default if unanswered: the confirmed track is stored beside the
   survey track, shown on the 코스 tab as "확정 트랙", and changes nothing else.
3. **Changing the capstone task after the countersign.** The plan says it is
   fixed. Is "frozen, staff can reopen later in the backoffice" right, or
   should the instructor be able to reopen it from the learner page now?
4. **The "nobody sees it" room rule.** The app now says a harness is visible
   to "본인과 강사·운영진". The Week 1 and Week 2 session plans still have the
   instructor say nobody sees it. Your wording to change (already on your list).
5. **Week locks (P4, still open).** Enforce the open week in the lab routes,
   or keep the soft lock? Matters more in 2c: a learner could lock a baseline
   before Week 3.
