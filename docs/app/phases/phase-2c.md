# App Phase 2c: the Week 3 labs, the countersign, and staff views of Weeks 2 and 3

Status: BUILT AND CHECKED (steps 1 to 4), 2026-10-04; browser pass, review
and deploy open. Contracts written 2026-10-04. Plan 2026-10-01; Eric's five open
questions decided 2026-10-04 by Claude at Eric's instruction (D1 to D5 below);
plan review 2 applied the same day. Follows `process.md`. The contracts in
"Contracts" are in the code (commit "App 2c contracts") and builders import
them; nobody redefines them.

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

## Decisions by Eric's instruction (decided 2026-10-04 by Claude at Eric's instruction)

Eric asked not to be asked. These were the five questions in "Decisions only
Eric can make"; each is now decided and stands until Eric overturns it.

| # | Decision |
|---|---|
| D1 | **Harness templates: build "템플릿으로 시작" into the harness editor.** Template text lives in the database (`public.harness_template`, migration 0011), seeded by `scripts/seed-harness-templates.ts` from the private files `SP-HL-0*.md` in the private workspace, read by path at runtime. The text is never in the public repo: not in code, fixtures, check snapshots or logs. Learners with an active enrollment and staff read; the service role writes. |
| D2 | **Track confirmation.** The confirmed track is stored beside the survey track (a `track_confirmed` event; the newest is current), may differ from it, may be SMB. It is shown on the 코스 tab as "확정 트랙" and changes nothing else: the one-pager and course pages keep reading `user_profile.track`. |
| D3 | **Capstone after countersign: frozen.** Reopening is a later backoffice feature (Phase 3, out of scope). The unique index is keyed on the baseline event, so a reopen needs no migration. |
| D4 | **The "nobody sees it" room rule.** The session-plan wording is Eric's own text: unchanged, and the session plans are not touched. The in-app line "본인과 강사·운영진" also stays as it is. |
| D5 | **Week locks.** The open week is enforced server-side in the baseline lock and countersign routes only (week 3). Every other lab route keeps the soft lock of 2a. |

## Scope

In:

| Part | What |
|---|---|
| Workspace check | `/app/lab/workspace`: path (browser or agent; `depth_flag` only sets the default), which assistant, the workspace's name, three yes/no checks (harness set as standing instructions, reference documents in, one-line test followed the harness), whether uploads are blocked at work. A failed test shows the curriculum's fix inline (move the harness into the 항상 따르는 지시 칸) and may be submitted; resubmitting writes a new event. The same page lists the learner's saved harnesses with "복사하기" and "텍스트 파일로 저장" (Week 3 pre-work: both harnesses as text), whatever D1 says. |
| Blueprint | `/app/lab/blueprint`: stage cards (name, P or T, who does it, what it needs, optional linked harness), up/down buttons (no drag), a "여기에 확인 지점 넣기" button between cards, checkpoints with what is checked, trigger, delivery. Choosing T sets the actor to "human" and hides the actor control. A box-and-arrow diagram drawn from the table. Server draft, each submit a new event like the Work Map. Prefills task and source from Work Map candidate 1 (switchable to 2 or 3). |
| Dry run | A timer on the blueprint page, available once the draft has a task name (not gated on a submitted blueprint). 시작 stores `dry_run_started_at` in the server draft (localStorage as backup); elapsed time is computed from `Date.now()`, so a reload or a tab the phone discarded shows "시험 실행 중 · 12분 지남" with a stop button. 정지 opens the existing time-log form prefilled (method pipeline, dry run, task = blueprint task, start and end editable) so the learner confirms before posting. Posting needs a submitted blueprint (the entry names its event id and first checkpoint). Links to the correction log for the one fix. |
| Baseline | `/app/lab/baseline`: capstone task and current-method stages prefilled from the newest blueprint (editable); a "before" time log entry chosen from a list (task, minutes, date; matching task first) as the source of minutes; frequency as a count per week or month; evidence defaulting to the chosen entry's; quality checklist v0 (4 to 6 lines); the learner's own confirmation. Server draft. Lock calls `lock_baseline()`. After countersign: a frozen read-only view. |
| Countersign | Staff: one button that names the learner ("김OO 님 기준선 확인") and posts the `baseline_event_id` it displayed. `countersign_baseline()` refuses a stale id (409, "방금 수강생이 기준선을 다시 확정했어요. 새로고침해 주세요.") and writes one row on a double tap. After it, the baseline is frozen (D3). |
| Staff views | `/staff/cohort/[id]`: a "기준선 확인 대기 (N명)" section at the top (learners with a baseline_locked and no countersign, Week 4 stragglers included; each row expands to task, source entry minutes and date, frequency, checklist, inline countersign), learners with no lock shown as "체크리스트 미완성 · 4주차에 확인"; a "트랙 확정" block (one select per learner, prefilled with the newest confirmation or the survey track through `TRACK_CODE_BY_ID`, one save per row); Week 2 and Week 3 columns from `cohort_week_signals()`. `/staff/learner/[userId]`: a Week 2 card (per harness: name, doc type, latest version and date, rule count, has example, correction and pending counts; full text behind a closed `<details>` "전체 내용 보기", example not loaded until opened) and a Week 3 card (workspace, blueprint with diagram, dry run beside the Week 1 time with both ranges labelled, baseline with the source entry's created_at and a flag when it was logged within a day of the lock), plus the same countersign and track controls. The Week 3 card goes to the top while a baseline waits. |
| Track confirmation | D2. `POST /api/staff/learner/[userId]/track` writes `track_confirmed`. The 코스 tab shows "확정 트랙: {name}" above the timeline in the enrolled branch, only when a confirmation exists AND the cohort's Week 3 is open (a track drafted the day before is not seen before the room announcement). |
| Learner surfaces | Week 3 page gets its lab buttons (`labHref` on Parts 1 to 4); 나의 AI 교육 gets blueprint and baseline cards. |
| Templates (D1) | "템플릿으로 시작" in the harness editor: a sheet showing SP-HL-01 to 03 in the six-part layout (read-only: covers Week 2 Part 1's "read all three, find the six parts") with "이걸로 시작". Starting creates an item with `newId("h")` (never the template id), copies name, doc_type, format, rules and fallbacks as values, and puts role, context and example in as placeholders, not values, so the existing hard errors on role and context make the learner write their own. Records `template_id`; a soft warning when the example still equals the template's. Learners who are not enrolled see no sheet. |

Out (with the phase that takes it): team-shared workspaces (DOC Week 7);
the Week 9 verification design that reuses the checkpoint; the Week 11
before/after scoring against the checklist (`capstone_measured`, Phase 3);
reopening a countersigned baseline (Phase 3 backoffice, D3); per-assistant
click-path sheets (handout, volatile; the app links nowhere for them); a
partial-lock mode for the time-short case (see C4).

## Decisions (mine unless marked)

| # | Decision |
|---|---|
| C1 | **The dry run is a time log entry**, not a field on the blueprint. `TimeLogEntryPayload.dry_run?: { blueprint_event_id, checkpoint_id }`, allowed only with method `pipeline` and only for the caller's own blueprint and one of its checkpoints. It times stages 1 to the first checkpoint, not the whole task, so wherever it sits beside the Week 1 time both lines state their range (`dryRunLine`, `beforeLine`): "시험 실행 · 1단계부터 첫 확인 지점까지 N분 (날짜)" beside "기존 방식 · 업무 전체 M분 (날짜)". No difference, percentage, arrow, 절감 or 단축. The Week 1 figure is the baseline's `time_log_event_id` once locked, otherwise the newest `before` entry. A "시험 실행" badge marks it in every time-log list. **Week 11's `capstone_measured` "after" excludes every entry with `dry_run`, and a baseline can never cite one.** `BlueprintSubmittedPayload.dry_run_minutes` is dropped. |
| C2 | **The drawing is generated**, a vertical chain of boxes with the checkpoints marked, from the stage table. No image upload. The paper sheet in the room is still where people draw; the app keeps the table. |
| C3 | **Blueprint rules** (`checkBlueprint`). Hard: a task name; 3 to 12 stages, each with a name and P or T, and a P stage with who does it; a T stage's actor is human (the parser forces it); at least one checkpoint, each placed after an existing stage with at least one written check; at least one checkpoint at or after the last stage whose actor is `assistant` or `assistant_checked` (the "before delivery" check); a trigger and a delivery; a linked harness must be one of the learner's. Soft: fewer than 6 or more than 10 stages; no AI stage; an AI P stage with nothing in "needs"; a check that is only "읽어 본다". Stages and checkpoints carry client-stable ids; a checkpoint points at `after_stage_id` (`after_stage` is a display copy). Week 9 references blueprint event id + checkpoint id. |
| C4 | **Baseline rules** (`checkBaseline`). Hard: task; at least 2 current-method stages; a `before` time log entry chosen from the learner's own (dry runs excluded; minutes computed by the route from that entry, never typed); frequency a whole count 1 to 100 per week or per month; 4 to 6 checklist lines; the confirmation tick. Soft: the chosen entry's task differs from the capstone task. Evidence optional, defaulting to the chosen entry's; the route accepts it only when it is in the learner's own folder and cited by one of their own time-log entries. No `before` entry: the form says to log one instance done the old way this week; it cannot be locked yet and the countersign happens in Week 4. **No partial countersign in the app:** the session plan's time-short fallback (checklist as homework) becomes "the incomplete form stays unlocked and is countersigned in Week 4", the same as the no-log case. The session plans are not changed (D4); one possible line for the Week 3 page's Part 4 is on the new-strings list for Eric. |
| C5 | **Locking and countersigning are each one transaction** (`lock_baseline()`, `countersign_baseline()`, migration 0011), both taking a row lock on the learner's profile row. Until the countersign the learner may lock again (new event, snapshot replaced). After it, the lock returns `frozen` and writes nothing. The countersign names the `baseline_locked` event the staff page displayed; a newer lock makes it `stale` (409); a second press returns `already` with the existing stamp. **The countersigned baseline is the `baseline_locked` event that `baseline_countersigned.baseline_event_id` names, never "the latest baseline_locked".** |
| C6 | **Workspace check merges into `user_profile.learning`**: assistant (label), path, `workspace_ready` (instructions set and test followed), `uploads_blocked`, `workspace_name`. Merged with `mergeLearning`, so `blocked_tools` and the reserved student fields survive. The agent-path variant of the steps is shown when the learner picks the agent path; `depth_flag` only sets the default. |
| C7 | **Staff views read events, not snapshots**, except the baseline (the snapshot is the object the countersign stamps). The roster reads `cohort_week_signals()`, never event rows to count them (PostgREST caps a response at max_rows silently). The learner page uses one query per event type, each with its own limit, and selects JSON paths, not whole harness payloads. |
| C8 | **Migration 0011** (`supabase/migrations/0011_week3_baseline_templates.sql`): (a) `harness_template` with select for staff or an active enrollment, no write for anon or authenticated, its own revokes; (b) the countersign unique index on `profile_event (user_id, data->>'baseline_event_id') where type = 'baseline_countersigned'`; (c) `lock_baseline(uuid, jsonb)` and `countersign_baseline(uuid, bigint, uuid, text)`, security definer, `search_path = ''`, execute for `service_role` only; (d) `cohort_week_signals(uuid)`, security invoker, execute for `authenticated`, staff-only by its own filter. No `user_profile` column: the confirmed track is the newest `track_confirmed` event. Verified 2026-10-04 in a rolled-back transaction on the real database: lock, lock, stale, ok, already, frozen and self all behave as written; grants as in section 5 of the file. |
| C9 | **D5:** Week 3 is enforced server-side in the baseline lock and countersign routes only, through `weekOpenForUser` (the same cohort rule as `getMyCohort` and the week page). Lock route: `closed` → 403 `week_closed` with the opening date, `not_enrolled` → 403 with "수강 코드를 등록하면 확정할 수 있어요.", `error` → 503 (fail closed); the page shows the same state. Countersign route: the same check on the learner's id, and refused when the staff member is the learner (no self-countersign). Other labs keep the soft lock. |
| C10 | **Privacy wall.** Baseline, blueprint, workspace and time-log data are readable per person only by the learner and by staff (`staff_role`). Any org-facing view aggregates them with n >= 5 per slice (Phase 5). No org_code-scoped select policy is added in 0011. Staff identity in learner-visible payloads is the staff user id and role, never an email; learner screens say "강사 확인 완료 · 날짜". |

## Contracts (written by the main session; in the code as of 2026-10-04)

`src/lib/profile/events.ts`
- `EVENT_TYPES.track_confirmed`, in `EVENT_PHASE` and `STAFF_WRITTEN_EVENTS` (not in the 0009 client allowlist: clients cannot write it). Label "트랙 확정" in `src/components/staff/format.ts` `EVENT_LABEL`.
- `TimeLogEntryPayload.dry_run?: DryRunRef`; `DryRunRef { blueprint_event_id: number; checkpoint_id: string }`.
- `HarnessSavedPayload.template_id?: string`.
- `WorkspaceSetupPayload`, `AssistantId` (`chatgpt | claude | gemini | copilot | claude_code | codex | other`).
- `BlueprintActor`, `BlueprintStage { id, order, name, kind, actor, needs, harness_id }`, `BlueprintCheckpoint { id, after_stage_id, after_stage, checks }`, `BlueprintSubmittedPayload { version, task, source { work_map_event_id, candidate_rank }, stages, checkpoints, trigger, delivery }`.
- `BaselineLockedPayload` = `BaselineSnapshot` without `locked_event_id` and the countersign fields.
- `BaselineCountersignedPayload { version, baseline_event_id, by_user_id, by_role }`.
- `TrackConfirmedPayload { version, track: TrackCode, survey_track: TrackId | null, cohort_id, by_user_id, by_role }`.

`src/lib/profile/types.ts`
- `LearningSnapshot` gains `uploads_blocked?`, `workspace_name?`.
- `BaselineSnapshot { version, locked_event_id, task, source { work_map_event_id, candidate_rank, blueprint_event_id }, current_method_stages, time_log_event_id, time_logged_at, minutes_per_instance, frequency { count, per }, evidence_ref, quality_checklist, signed_at, countersigned_at?, countersigned_by? { user_id, role }, countersign_event_id? }`. No baseline existed before 2c, so the shape changed at no cost.

`src/lib/courses/types.ts`
- Lab hrefs `/app/lab/workspace`, `/app/lab/blueprint`, `/app/lab/baseline`.
- `TimeLogInput.dry_run?`, `HarnessDraftItem.template_id?`, `HarnessTemplate`, `HARNESS_TEMPLATE_ID`.
- `WorkspaceInput`, `WORKSPACE_LIMITS`; `BlueprintStageDraft`, `BlueprintCheckpointDraft`, `BlueprintDraft` (with `dry_run_started_at`), `BLUEPRINT_LIMITS`; `BaselineDraft`, `BASELINE_LIMITS`, `BeforeEntry`.
- Requests: `BlueprintSubmitRequest { draft }`, `BaselineLockRequest { draft }`, `CountersignRequest { baseline_event_id }`, `TrackConfirmRequest { track }`.
- `WeekGate`.

`src/lib/courses/queries.ts`
- `findActiveCohort(client, userId)` → `{ status: "ok", mine } | { status: "none" } | { status: "error" }`; `getMyCohort` now uses it.
- `weekOpenForUser(client, userId, week, now?)` → `WeekGate`.

`src/components/lab/rules.ts`
- `parseTimeLogInput` keeps a well-formed `dry_run` and returns null for a malformed one; `checkTimeLog` refuses `dry_run` unless method is `pipeline`; `isDryRunEntry(data)`.
- `isTemplateId`; `parseHarnessItem`, `normalizeHarness`, `toHarnessPayload`, `harnessFromSaved` carry `template_id`; `sameHarness` ignores it.

`src/components/lab/rules-week3.ts` (new, pure)
- Labels: `ASSISTANT_LABELS`, `ASSISTANTS_BY_PATH`, `ACTOR_LABELS`, `DRY_RUN_BADGE`, `dryRunLine`, `beforeLine`, `WORKSPACE_FORGOT_FIX`, `WORKSPACE_UPLOAD_FIX`.
- Workspace: `defaultWorkspacePath`, `emptyWorkspace`, `parseWorkspaceInput`, `checkWorkspace`, `toWorkspacePayload`, `mergeLearning`.
- Blueprint: `emptyStage`, `emptyBlueprint`, `isAssistantActor`, `parseBlueprintDraft`, `writtenChecks`, `isVagueCheck`, `firstCheckpoint`, `checkBlueprint(draft, harnessIds?)`, `toBlueprintPayload(draft, source?)`, `blueprintFromSaved`, `draftFromBlueprint`, `dryRunElapsed`, `isClientId`.
- Baseline: `emptyBaseline`, `baselineFromBlueprint`, `parseBaselineDraft`, `beforeEntriesFrom`, `orderBeforeEntries`, `writtenLines`, `sameTask`, `checkBaseline(draft, entries)`, `toBaselinePayload(draft, entry, signedAt, source?)`, `formatFrequency`, `loggedJustBeforeLock`, `parseBaselineSnapshot`.
- `CheckResult { errors, warnings }`.

`POST /api/artifacts/time-log` accepts `dry_run` (own blueprint, existing checkpoint, method pipeline).

Database functions (0011): `lock_baseline(p_user, p_payload) → { status: ok | frozen | no_profile, event_id?, locked_at? }`; `countersign_baseline(p_user, p_baseline_event_id, p_by_user, p_by_role) → { status: ok | already | stale | no_baseline | self | no_profile, event_id?, countersigned_at?, baseline_event_id?, latest_event_id? }`; `cohort_week_signals(p_cohort)` → one row per active learner (harness_count, harness_doc_types, correction_count, workspace_at, assistant, workspace_ready, uploads_blocked, blueprint_count, dry_run_minutes, dry_run_at, baseline_event_id, baseline_locked_at, countersigned_at, confirmed_track, track_confirmed_at).

`scripts/checks/week3-rules.ts`: pure checks of the above on the Week 1 Monday report as the session plan draws it (no private text). `npx tsx scripts/checks/week3-rules.ts`.

## Routes and owners

| Route / files | Owner | What |
|---|---|---|
| `/app/lab/workspace` (`src/app/app/lab/workspace/page.tsx`), `src/components/lab/workspace/*`, `POST /api/artifacts/workspace` | workspace-baseline agent | Check form, harness copy and text export; `workspace_setup` event; merged `learning` snapshot. |
| `/app/lab/baseline` (`src/app/app/lab/baseline/page.tsx`), `src/components/lab/baseline/*`, `POST /api/artifacts/baseline` | workspace-baseline agent | Draft, lock through `lock_baseline()`, D5 gate, frozen view after countersign. |
| `/app/lab/blueprint` (`src/app/app/lab/blueprint/page.tsx`), `src/components/lab/blueprint/*`, `POST /api/artifacts/blueprint`, `src/components/lab/TimeLogForm.tsx`, `src/app/app/lab/time-log/page.tsx` | blueprint agent | Stage cards, diagram, submit; dry-run timer posting through the prefilled time-log form; "시험 실행" badge in the time-log list. |
| `src/app/staff/learner/[userId]/page.tsx`, `src/app/staff/cohort/[id]/page.tsx`, `src/components/staff/*`, `POST /api/staff/learner/[userId]/countersign`, `POST /api/staff/learner/[userId]/track` | staff agent | Week 2 and 3 cards, the countersign queue, the track block, roster columns, the two routes. |
| `src/components/lab/harness-templates/*`, the hook point in `src/components/lab/harness/HarnessEditor.tsx`, `src/app/app/lab/harness/page.tsx` (template read through the learner's own server client), `scripts/seed-harness-templates.ts` | templates agent | Template sheet and "이걸로 시작"; the seed script reading the private drafts by path at runtime. |
| Contracts above, `supabase/migrations/0011_week3_baseline_templates.sql`, `src/components/lab/rules.ts`, `rules-week3.ts`, `src/lib/courses/queries.ts`, `src/app/api/artifacts/time-log/route.ts`, `content/courses/spine/week-3.json` lab links, `src/app/app/courses/week/[n]/page.tsx`, `src/app/app/courses/page.tsx` (확정 트랙 card), `src/app/app/education/page.tsx` cards, `package.json`, `scripts/checks/week3-*.{ts,mjs}` | main session | Small or shared files, integration, checks, commits. |

Files are disjoint per agent. Nobody but the main session edits the contracts,
`rules.ts`, `rules-week3.ts`, the migration or `week-3.json`.

## Seed script (D1)

`scripts/seed-harness-templates.ts`, run locally after 0011:

    HARNESS_TEMPLATE_DIR=<private drafts folder> npx tsx scripts/seed-harness-templates.ts [--check]

- The folder comes from the argument or `HARNESS_TEMPLATE_DIR`; no personal
  path is written in the repo. Missing folder or file: exit non-zero.
- Parses `## 1. 역할` to `## 6. 예외 처리`, drops the HTML comment header and
  the "쓰는 법" line, takes rules from the numbered list, and strips the
  template's own `――― 예시 시작 ―――` markers (assembleHarness adds its own fence).
- Runs `normalizeHarness` and `checkHarness` on each; any error refuses the
  whole run (non-zero), warnings are printed as counts. `--check` validates
  without writing. Upserts with the service role.
- Never writes parsed text to disk, logs or fixtures. Prints ids, counts and
  check results only.

Measured 2026-10-04 (counts only): SP-HL-01/02/03 have 8 rules each, the
longest 99 characters, 329/308/297 어절 without the example, no errors and
no warnings. The plan review's "rule 5 is 231 characters" and "390 어절" do
not reproduce on the current files, so neither the private files nor
`ONE_PAGE_EOJEOL` change; the seed script's refusal guards a later edit.

## Build order

1. Contracts, `rules-week3.ts`, migration 0011 and `scripts/checks/week3-rules.ts`
   (done 2026-10-04).
2. Four agents in parallel on their files.
3. Main session: week page buttons, 나의 AI 교육 cards, 확정 트랙 card,
   integrate, lint, build.
4. Apply 0011 to the database, run the seed script, then
   `scripts/checks/week3-labs.mjs`: guards, validation, blueprint versions,
   dry-run entry (own blueprint only, pipeline only), baseline lock, lock
   refused before Week 3 opens and when not enrolled, stale countersign
   refused, double countersign writes one row, lock refused after countersign,
   countersign refused before Week 3 opens, learner cannot countersign
   (route and `/rest/v1/rpc/*`, learner JWT and staff JWT both refused on the
   rpc), another learner reads nothing, staff reads all. RLS and grant proofs
   for 0011: anon reads 0 templates, a registered but unenrolled learner 0, an
   enrolled learner 3, a learner insert or update refused,
   `cohort_week_signals` returns 0 rows to a learner.
5. Browser pass at 375 wide: the four labs in order as one learner, then the
   staff cohort page countersigning that learner from the queue. Korean
   read-aloud.
6. Fresh reviewer on the diff (also: no new 2c table adds `on delete set null`
   to a user reference); fixes; findings into this file.
7. Deploy, live checks, cleanup, hand-off.

## Deploy

1. `npx tsx scripts/db.ts --file supabase/migrations/0011_week3_baseline_templates.sql`
   (before the build: the baseline and countersign routes need the functions).
2. Run the post-apply checks in section 5 of the migration.
3. `HARNESS_TEMPLATE_DIR=... npx tsx scripts/seed-harness-templates.ts` from the
   local machine (the private drafts are not on the droplet).
4. On the droplet: `git pull && docker compose up -d --build`.

## Rules check

Korean 해요체, written from intent. Events append-only; no update or delete
path; the baseline "frozen after countersign" is a refusal in a database
function, not an edit. Derived snapshots written by the service role only.
Learners read only their own rows; staff read everything; only staff write
the countersign and the track. No LLM calls. Outcome language: the dry-run
time beside the Week 1 time is two measurements with their ranges and dates,
with no percentage, no "절감", and no 보장 or 반드시 anywhere (rule 4 framing
carries into the labs). Survey responses are untouched.

## Plan review (my own critical pass, 2026-10-01)

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
  head. Answered in review 2 by the cohort-page queue.
- **What I am assuming without proof.** That learners will type a stage table
  on a phone in 18 minutes. Laptops are likely in the room; the layout must
  work on both, and the paper sheet remains the fallback.
- **Rule conflicts.** None found. The frozen baseline is consistent with
  rule 2's spirit (nothing rewritten); survey responses are untouched.

## Plan review 2 (2026-10-04)

Two reviewer passes on the plan. Every high and medium is applied above;
lows are applied where cheap and noted otherwise.

| Sev | Issue | What changed |
|---|---|---|
| high | Template seed: rule 5 over the 200-character cap, template over 350 어절, duplicated example fences | Measured: does not reproduce (longest rule 99, 297 to 329 어절). Seed script strips the template's markers, runs `checkHarness`, refuses on any error, `--check` mode. Private files and `ONE_PAGE_EOJEOL` unchanged. |
| high | Countersign could stamp a baseline the instructor never saw; double tap writes two | The button posts `baseline_event_id`; `countersign_baseline()` returns `stale` (409) or `already`; unique index on the baseline event id. |
| high | Lock and countersign are two non-atomic writes each (frozen baseline overwritten, lock erased, double countersign) | `lock_baseline()` and `countersign_baseline()` in 0011, row lock on the profile row, one transaction each; C5 states which baseline is the countersigned one. Verified in a rolled-back transaction. |
| high | Security-definer functions would be callable by any learner through `/rest/v1/rpc` | Execute revoked from public, anon, authenticated; granted to service_role only. Verified with `has_function_privilege`; rpc refusal goes into week3-labs.mjs. |
| high | Countersign and track confirmation only on the per-learner page: too slow for 20 learners | "기준선 확인 대기 (N명)" queue and a "트랙 확정" block on the cohort page; learner-page controls kept; same routes. |
| high | Dry-run timer lost when the phone discards the tab; gated on a submitted blueprint; no way to fix a forgotten stop | `dry_run_started_at` in the server draft plus localStorage; elapsed from `Date.now()`; stop opens the prefilled, editable time-log form; timer gated on a task name. |
| medium | Plan still said "no migration", "soft-locked until P4", open questions | D1 to D5 table; C8 and C9 rewritten; owners table and build order cover 0011, seed, helper. |
| medium | Dry run beside the Week 1 time reads as a saving; no rule for Week 11 | `dryRunLine` / `beforeLine` state both ranges; comparison entry defined; badge everywhere; C1 excludes dry runs from `capstone_measured`. |
| medium | Session plan's time-short fallback (checklist as homework) impossible with a frozen baseline | No partial lock; incomplete form countersigned in Week 4; staff see "체크리스트 미완성 · 4주차에 확인"; Week 3 page line only if Eric approves (new strings). |
| medium | Baseline retyped on a phone; free-string frequency; candidate switch; late before-entry invisible | Prefill from blueprint (`baselineFromBlueprint`); `frequency { count, per }`; `source.candidate_rank`; entries ordered task-first with a mismatch warning; `time_logged_at` and `loggedJustBeforeLock` for staff. |
| medium | Baseline minutes and evidence trusted from the client; snapshot cannot join back | Route computes minutes from the cited own `before` entry (no dry run); evidence must be own and cited by own entry; `locked_event_id` and `time_log_event_id` in the snapshot. |
| medium | Nowhere on the 코스 tab for 확정 트랙; SMB label is a draft; DAT learner sees a DOC report unexplained | Card above the timeline, shown once Week 3 is open; SMB name and a "진단 결과 기준 리포트" label on the new-strings list. |
| medium | "Start from template" lets a learner save the fictional company's harness | Sheet covers Part 1 reading; role, context and example are placeholders, not values; new `newId("h")` per start; `template_id` recorded; warning when the example is unchanged. |
| medium | Week 3 needs harnesses as text; on a phone that is many taps | Copy and text-file export on `/app/lab/workspace`, independent of D1. |
| medium | Staff Week 2 card would put full harness text on the instructor's screen (D4 gap) | Counts and labels only; full text behind closed `<details>`; example loaded on open. |
| medium | `harness_template` would inherit ALL privileges; "learners" as `using (true)` exposes text to any sign-up | Revokes as in 0011; select only for staff or an active enrollment. Verified grants: authenticated SELECT only. |
| medium | Template start could reuse the template id as harness id; private path or text in repo | `newId("h")`; `template_id` optional and ignored by `sameHarness`; folder from env or argument; nothing parsed is written. |
| medium | Blueprint checkpoints referenced by order; no candidate; T + assistant_checked allowed | Stage and checkpoint ids, `after_stage_id`, `source`; T forced to human; before-delivery rule counts both AI actors. |
| medium | D2 storage undecided; two track vocabularies; reusing client-writable `track_overridden` | `track_confirmed` event (staff-written, not in the client allowlist) with `TrackCode`; `user_profile.track` untouched. Chosen over a column: the newest event is enough for the 코스 tab and the roster (`cohort_week_signals`), and it adds no column grant to prove. |
| medium | Roster and learner-page queries silently truncated at max_rows | `cohort_week_signals()` (security invoker); per-type queries with JSON-path selects on the learner page. |
| medium | D5 undefined: which cohort, not enrolled, read failure | `weekOpenForUser` shared with `getMyCohort`; 403/403/503 mapping; no self-countersign. |
| low | Staff email in learner-visible payloads | `by_user_id` + `by_role`; learners see "강사 확인 완료 · 날짜". |
| low | T actor control wasted; checkpoint and harness links missing | Applied (C3, Scope). |
| low | Workspace: capability in `blocked_tools`; full replace of `learning`; failed-test path | `uploads_blocked`, `workspace_name`; `mergeLearning`; fix shown inline; resubmit allowed; path chosen on the form. |
| low | Roster 5000-row query | Replaced by `cohort_week_signals()`; a visible "일부만 불러왔어요" wherever a per-type query hits its limit. |
| low | `profile_event.user_id on delete set null` keeps workplace text after account deletion | Deferred to Phase 3 (backoffice and account deletion: delete or scrub the `data` of that user's lab events). 0011 adds no user reference with `on delete set null`. |
| low | Privacy wall for baseline data not stated | C10. |

## New strings for Eric's review

Shipped in the labs because the screens need words; listed so Eric can change
any of them. Originals elsewhere are unchanged.

- Labels: `ACTOR_LABELS` ("AI", "AI가 하고 내가 확인", "내가"), `DRY_RUN_BADGE`
  "시험 실행", `dryRunLine` / `beforeLine`, "확정 트랙", "기준선 확인 대기 (N명)",
  "체크리스트 미완성 · 4주차에 확인", "김OO 님 기준선 확인", "템플릿으로 시작",
  "이걸로 시작", "전체 내용 보기", "복사하기", "텍스트 파일로 저장",
  "시험 실행 중 · N분 지남", "여기에 확인 지점 넣기".
- Fixes and messages: `WORKSPACE_FORGOT_FIX`, `WORKSPACE_UPLOAD_FIX`, every
  error and warning in `rules-week3.ts`, the countersign 409 line, "수강 코드를
  등록하면 확정할 수 있어요.".
- SMB: two draft names exist, "소규모 사업·스타트업 트랙" (`queries.ts`, cohort
  cards) and "사업자·스타트업 트랙" (staff `format.ts`). Pick one.
- Optional "진단 결과 기준 리포트" label on 나의 AI 교육 when the confirmed track
  differs from the survey track.
- Optional Week 3 page Part 4 line (not added without approval): "체크리스트를
  다 못 쓰면 기준선은 확정하지 않은 채로 두고, 4주차에 마저 써서 확인받아요."

## Findings

Integration and checks, 2026-10-04 (build order steps 2 to 4):

- Builders' diffs reviewed against this plan. One integration fix: the
  workspace and blueprint agents each wrote a `Week3LabHeader`; merged into
  `src/components/lab/Week3LabHeader.tsx`. The staff and learner blueprint
  diagrams stay separate (the staff one shows needs and linked harnesses).
- Main-session items: `week-3.json` Parts 1 to 4 link to workspace, blueprint,
  `/app/lab/blueprint#dry-run` (the timer, a fourth `labHref` value) and
  baseline; the assignment links to the time log. 나의 AI 교육 has a
  파이프라인 설계도 card and a button on the 기준선 card, cards in course
  order. The 코스 tab shows 확정 트랙 once a confirmation for the learner's
  current cohort exists and that cohort's Week 3 is open.
- 0011 applied to the database; section 5 grant checks as expected. Templates
  seeded (3 rows, 0 errors, 0 warnings).
- `scripts/checks/week3-labs.mjs`: 88/88 against a local dev server, twice
  (idempotent). Test rows and accounts cleaned up afterwards.
- New strings from the main session for Eric's list: "4주차부터 이 트랙으로
  들어요 · {날짜} 확정", "3주차 수업에서 그려요.", "설계도 열기", "설계도 그리러
  가기", "기준선 열기", "기준선 확정하러 가기", "단계 N개 · AI가 맡는 단계 N개 ·
  확인 지점 N개".

Browser pass findings, 2026-10-04 (seven medium; decided without asking, per
Eric's standing rule, strings listed below for his review):

- **Fixed: raw event table showed harness and correction text** (staff
  learner page, 전체 기록). The table rendered the full `data` of every event,
  so a harness's role, rules and example document and a correction's
  sentences were in the page HTML, undoing D4 and plan review 2.
  `rawEventView` now shows a harness as its labels plus `rules` (count) and
  `has_example`, and a correction as its flags only, each with a line
  pointing to the Week 2 card. HarnessExample stays the only path that loads
  `parts.example`. Rendering-level, in a server component, so the text never
  reaches the HTML or the RSC payload; the query is unchanged.
- **Fixed: workspace lab listed harnesses newest first** while the copy says
  "첫 번째 … 두 번째". `loadSavedHarnesses` now returns `first_saved_at` (the
  oldest save of each harness, from the same id read), and the workspace lab
  sorts by it. The harness library keeps newest first. No new copy.
- **Fixed: baseline → 시간 기록 landed on the Week 1 page with no way back.**
  The baseline's button links to `/app/lab/time-log?from=baseline`; with it
  the page uses the Week 3 header, its own intro and method line, and after
  the first saved entry shows "기준선으로 돌아가기". The baseline draft is
  autosaved on the server, so nothing is lost on the round trip.
- **Fixed: two tracks on the 코스 tab and 나의 AI 교육.** Chose to hide the
  cohort card's 트랙 row once a confirmation exists (no new wording needed),
  and 나의 AI 교육's 진단 요약 트랙 row now names the confirmed track. One
  shared read, `getMyConfirmedTrack` in `lib/courses/queries.ts` (same Week 3
  gate as before), so the two tabs cannot disagree. The one-pager keeps the
  survey track (it is the diagnosis report).
- **Fixed: countersign was one tap and the result scrolled away.** Two taps:
  the first arms the button ("한 번 더 누르면 확정돼요", a one-line warning
  and 취소; disarms after 8 seconds). After the post the page reloads with
  `?countersigned=1`, which keeps the Week 3 card at the top with the
  baseline first and a success line, with `scroll: false`.
- **Fixed in layout, device check deferred to step 5: datetime fields cut
  off the minutes at 375.** The input is full width on phones and 지금 sits
  under it (side by side from `sm`). Headless check at 375: "10/04/2026 05:30
  AM" shows in full. A real Android and iPhone pass stays in step 5.
- **Fixed: 12주차 vs 11주차.** Chose 11주차 for both: the comparison is
  scored in Week 11 (`capstone_measured`, the baseline checklist; session
  plan W2-W3 says the same), and the baseline lab already says 11주차 three
  times. The time-log line now reads 11주차. The W1 session plan's "Week 12
  has no before number" is unchanged (D4); Eric may prefer 12 everywhere.
- `scripts/checks/week3-labs.mjs` gained five checks for the above (harness
  order, no example text on the staff page, time-log Week 3 context and the
  11주차 line, cohort track row hidden, confirmed track on 나의 AI 교육):
  93/93, twice. Test rows and accounts cleaned up.
- New and changed strings for Eric's list: "하네스 본문은 2주차 카드의 ‘전체
  내용 보기’에서 봐요.", "수강생이 고친 문장은 이 표에 싣지 않아요.", "캡스톤으로
  삼을 업무를 하네스 없이 예전 방식 그대로 한 번 하면서, 시작한 시각과 끝난
  시각, 중간에 끊긴 횟수를 남겨 주세요. 기록하고 나면 기준선에서 이 기록을 고를
  수 있어요.", "기준선에 쓸 기록은 하네스를 쓰기 전, ‘기존 방식’으로 남겨요.",
  "기준선으로 돌아가기", "한 번 더 누르면 확정돼요", "확인하면 기준선이
  고정되고, 지금은 되돌릴 수 없어요.", "취소", "강사 확인을 마쳤어요. 이
  기준선은 이제 바꿀 수 없어요.", and the changed "지금 기록해 두지 않으면
  11주차에 견줄 ‘전’ 숫자가 없어요." (was 12주차).

Still open: step 5 (browser pass at 375 wide, including real phones for the
datetime fields), step 6 (fresh reviewer), step 7 (deploy).
