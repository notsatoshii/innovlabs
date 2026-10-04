# App Phase 2c: the Week 3 labs, the countersign, and staff views of Weeks 2 and 3

Status: DEPLOYED 2026-10-04 (build 6702408 on app.innovlab.me; see "Hand-off"
at the end). Real-phone datetime check still open. Contracts written 2026-10-04. Plan 2026-10-01; Eric's five open
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

Second browser pass findings, 2026-10-04 (five medium; decided without
asking, per Eric's standing rule, strings listed below for his review):

- **Fixed: the Week 3 assignment opened the Week 1 time log.** Its button
  went to `/app/lab/time-log` with the Week 1 header, copy and "‘기존 방식’"
  note, so a pipeline run could be logged as `before`, offered by
  `beforeEntriesFrom` and cited by a Week 4 straggler as the pre-harness
  time, corrupting the Week 11 comparison. The assignment now links to
  `/app/lab/time-log?from=week3` (a fifth `labHref` value on the assignment
  type): Week 3 header and intro, the method opens on 파이프라인
  (`TimeLogForm` `initialMethod`), a note that this run is not a baseline
  "before", and no 11주차 "before" line. Chosen over
  `/app/lab/blueprint#dry-run` because the homework is the whole pipeline,
  not the dry run to the first checkpoint. The plain `/app/lab/time-log`
  (Week 1) is unchanged.
- **Fixed: 진단 요약 showed the confirmed track above a survey-track report**
  (plan drift from D2). The 트랙 row is the survey track again, the one the
  one-pager is written for, and a separate 확정 트랙 row appears once a
  confirmation exists (same `getMyConfirmedTrack` read and Week 3 gate as
  the 코스 tab). Chosen over the "진단 결과 기준 리포트" label: both tracks are
  named on screen, and the label string is reused from the 코스 tab.
- **Fixed: sticky bars slid under the site header.** The header is sticky,
  z-40 and 69px tall; the blueprint bar (with the dry-run "정지하러 가기"
  link) was `top-0 z-20`. New token `--site-header-h: 69px` in
  `globals.css` (commented in `layout.tsx`); the blueprint, harness and
  work-map editor bars and the week page mini-nav, which had the same bug,
  now sit at `top-[var(--site-header-h)]`. The week page section anchors
  and the `#dry-run` anchor clear header plus bar. Headless check at 375
  after scrolling: week nav, blueprint and work-map bars at top 69px, and
  the element at each bar's centre is the bar itself.
- **Fixed: the countersign success line ended up above the screen.** It now
  renders after the baseline, where the button was (`CountersignedNotice`),
  and scrolls itself into view once if it still lands off screen (scroll
  margin clears the header). Headless check at 375: the line is on screen
  after the `?countersigned=1` load.
- **Fixed: the workspace fix line contradicted a 네 answer.** The fix line
  is chosen by one function, `workspaceFix` in `rules-week3.ts`, used by the
  form and `checkWorkspace`: on the browser path, 지시 칸 네 with a failed
  one-line test gets a new line (test outside the workspace, then show the
  instructor); 아니요 or unanswered keeps the curriculum's line. The agent
  path keeps its own line (it asks to check the file the agent always
  reads, which does not contradict a 네).
- Checks: `week3-rules.ts` gained five workspace fix-line expectations;
  `week3-labs.mjs` gained six (assignment link and Week 3 time-log context
  with 파이프라인 preselected, the Week 1 time log unchanged, 진단 요약 with
  both track rows, blueprint bar offset, success line inside the Week 3
  card): 98/98, twice. lint and build pass.
- New strings for Eric's list: "이번 주 과제예요. 설계도의 첫 단계부터
  전달까지 실제 업무로 한 번 돌리면서, 시작한 시각과 끝난 시각, 중간에 끊긴
  횟수를 남겨 주세요.", "3주차 과제는 파이프라인으로 한 기록이라
  ‘파이프라인’으로 남겨요. 기준선의 ‘전’ 기록으로는 쓰지 않아요.",
  "하네스를 ‘항상 따르는 지시’ 칸에 넣었는데도 다르게 나왔다면, 그 워크스페이스
  안에서 새 대화를 열어 한 줄 시험을 다시 해 보세요. 그래도 하네스대로 나오지
  않으면 강사에게 화면을 보여 주세요.", and the reused "확정 트랙" as a row
  label on 나의 AI 교육.

Third browser pass findings, 2026-10-04 (one high process item, four
medium app items, one reported twice; decided without asking, per Eric's
standing rule, strings listed below for his review):

- **Fixed: the cohort queue said every evidence image was broken** (reported
  twice, once from the code and once with screenshots 39, 40, 43). The queue
  rendered `BaselineView` without a signed URL, so any baseline with
  evidence showed "이미지를 열 수 없어요" on the screen meant for the
  20-second countersign. The cohort page now signs the evidence of all
  waiting baselines in one `createSignedUrls` call with the staff client,
  own-folder prefix check per learner (same rule and 10 minutes as the
  learner page), and passes `evidenceUrl`. If signing still fails, the
  queue's line adds a "수강생 기록에서 보기" link to the learner page
  (`learnerHref`, cohort queue only) instead of a dead end. Both options from
  the finding, since the first is the fix and the second covers a storage
  error.
- **Fixed: a re-confirmed track after a cohort move was never written.** The
  track route treated a save as unchanged when the newest `track_confirmed`
  named the same track, ignoring `cohort_id`, while `getMyConfirmedTrack`
  shows only a confirmation for the learner's current cohort. The route now
  reads `cohort_id` with the newest event and skips the insert only when
  both track and cohort match `found.mine.cohort.id`. Staff views follow the
  learner's rule rather than "newest from any cohort": the cohort page reads
  the newest confirmation per learner itself (one `profile_event` read, no
  counting, C7 unchanged) and shows it in the 트랙 확정 block and the roster
  only when it names this cohort, and the learner page hides a confirmation
  whose cohort is not the active one. Without this the select stayed on the
  old track with the save button disabled, so the instructor could not
  re-confirm at all. Chosen over changing `cohort_week_signals` (a new
  migration for a read the page can do), so its `confirmed_track` is no
  longer used by the page; fold the filter into the function if the page
  read ever becomes a cost (deferred, no phase needed before the pilot).
- **Fixed: no confirmation after a countersign from the queue.** The button
  now reloads with `?countersigned=<userId>` (the learner page still accepts
  `1`). The cohort page reads it and, once that learner's baseline shows as
  countersigned, puts "OOO 님 기준선 확인을 마쳤어요." at the top of the
  queue (`CountersignedNotice`, now with a `message` prop), which scrolls
  itself into view, so the instructor lands at the queue with the next row
  ready instead of in the middle of the week grid.
- **Fixed: the dry run's 수정 기록 link went to a Week 2 dead end.** Both
  links in `DryRunPanel` go to `/app/lab/corrections?from=week3`. With it the
  page uses the Week 3 header (← 3주차 수업으로) and its own intro, and after
  the first saved line `CorrectionForm` shows "설계도로 돌아가기"
  (`returnTo`, the same pattern as the time log's `?from=baseline`). The
  plain corrections page is unchanged.
- **Fixed (process): parallel runs shared accounts and an unhealthy dev
  server.** `test-session.ts` takes `--tag <run>` (`learner --tag pass3` makes
  `phase1a-learner+pass3@innovlabs.test`), and `cleanup --tag <run>` deletes
  that run's events and drafts by user id before its accounts. The README's
  `like '%@innovlabs.test'` cleanup SQL is gone, and a "Parallel runs" note
  says one tag and one dev server per run, and to restart a server that
  answers 500. `week3-labs.mjs` already touches only the accounts in its
  directory and its header now says to use a tag. The :3291 server (Jest
  worker crashing with EPIPE) was stopped and started fresh before this
  pass's checks. The browser pass results that overlapped the collision are
  not evidence; step 5 reruns them.
- Checks: `week3-labs.mjs` gained twelve (queue evidence signed with no
  failure line, using a temporary waiting copy of the baseline and a 1-pixel
  upload that are both removed; success line at the top of the queue and
  none for a learner who is not countersigned; the learner page reading the
  id form; a confirmation made for another cohort shown as not confirmed to
  staff and the learner, the same track then written once and unchanged on
  a second save, and back in the roster; the dry-run link and the
  corrections page in Week 3 and Week 2 context): 110/110 on a fresh :3291
  with tagged accounts, run four times, then `cleanup --tag` (0 accounts and
  0 orphaned events left). lint and build pass.
- New strings for Eric's list: "{이름} 님 기준선 확인을 마쳤어요.",
  "수강생 기록에서 보기", "시험 실행의 확인 지점에서 고친 것을 한 줄씩
  남겨요. 원래 문장과 고친 문장을 적고, 다음에도 되풀이될지 표시해 두면
  돼요.", "설계도로 돌아가기".

Fourth browser pass findings, 2026-10-04 (five medium; decided without
asking, per Eric's standing rule, strings listed below for his review):

- **Fixed: ‘전’ in quote marks and 견줄 on the baseline and time log.** The
  quoted ‘전’ copied the English "before" word for word and 견줄 read as
  bookish, on the screen learners fill in during the room's last 10 minutes.
  Rewritten from intent: section 5 of the baseline is now "하네스 쓰기 전
  결과물" (heading, its fieldset legend and the locked view's label), its line
  "하네스를 쓰기 전 결과물 화면을 남겨요. 1주차 시간 기록에 올린 화면 가운데서
  골라요. 없으면 비워 둬도 돼요.", the time log's line "지금 기록해 두지 않으면
  11주차에 비교할 처음 숫자가 없어요." and the Week 3 method note "… 기준선의
  처음 기록으로는 쓰지 않아요." The baseline header's "견줘서" became "비교해서"
  in the same pass (same word, same screen). Deferred, no phase: the same
  '전' pattern in `content/courses/spine/week-1.json` (assignment summary) and
  `week-3.json` (intro line and Part 4 step), which is Phase 2a copy already
  deployed; changing it is Eric's call in the string review, not this fix.
- **Fixed: both Week 3 paths into the time log filled the task with Work Map
  candidate 1.** A learner who switched to candidate 2 (the session plan
  allows it) and saved without editing stored an entry under candidate 1's
  name, which the baseline then listed below the matching entries with the
  "different task" warning. With `?from=baseline` the task now comes from the
  baseline draft, else the newest submitted blueprint; with `?from=week3`
  from the newest submitted blueprint; candidate 1 only when neither exists.
  The plain Week 1 page keeps candidate 1. Two extra reads, only on the Week 3
  paths, with the learner's own client (RLS as before).
- **Fixed: one "before" entry showed two dates.** Learner and staff now show
  the day the work was done (the entry's `started_at`) everywhere the
  baseline's minutes appear: the learner's locked and frozen view ("52분 ·
  2026년 10월 2일에 잰 ‘기존 방식’ 기록"), the staff 기준 시간 row and the
  `beforeLine` next to the dry run, so they match the entry choice, the
  blueprint's dry-run block and both time-log lists. The log date appears
  only beside the staff flag ("확정 전 하루 안에 남긴 기록" · "2026. 10. 4.에
  기록"). New snapshots carry `time_started_at` (`toBaselinePayload`; the
  `lock_baseline()` payload passes through, no migration). Snapshots locked
  before it fall back to the cited entry's `started_at` (`baselineWorkedAt`):
  the learner page and staff learner page already have the entries, the
  cohort queue reads only the cited entries of waiting legacy snapshots in
  one query. Same pass: the staff Week 3 card's dry-run date and its
  "newest before" fallback used `created_at`; both use `started_at` now, as
  the learner's screens do.
- **Fixed: the 트랙 확정 row named only the survey track and a date.** It now
  reads "진단 문서·행정 트랙 · 확정 데이터·수치 트랙 (10. 4.)" (new
  `fmtMonthDay`), and "· 아직 확정 안 함" when there is no confirmation for
  this cohort. Noticed, deferred to Eric's string review (no phase): the SMB
  track is "사업자·스타트업 트랙" on staff screens (`COHORT_TRACKS`, marked as
  a draft label) and "소규모 사업·스타트업 트랙" on learner screens
  (`lib/courses/queries.ts`); the name is his pick.
- **Fixed: one workspace, four names.** The empty-name error follows the
  field label of the chosen path ("워크스페이스 이름을 적어 주세요." /
  "프로젝트 폴더 이름을 적어 주세요."). Staff screens say 워크스페이스: the
  Week 3 card title, "워크스페이스 준비됨" / "워크스페이스 다시 확인 필요",
  the name row labelled like the learner's field ("워크스페이스 이름" or
  "프로젝트 폴더 이름"), "아직 워크스페이스를 확인하지 않았어요.", the roster
  chips ("워크스페이스 미확인" and the two above), and the raw event label
  for `workspace_setup` is "워크스페이스 점검", the learner lab's own title.
- Checks: `week3-labs.mjs` gained thirteen (the two empty-name errors; the
  snapshot's `time_started_at`; the before entry is now worked two days
  before it is logged, and the learner baseline, the staff 기준 시간 and
  dry-run lines show the work date while the log date sits only beside the
  flag; a legacy snapshot without `time_started_at` still shows the work
  date in the cohort queue; no ‘전’ on the baseline or time log; one
  workspace name on the staff page; the 트랙 확정 row names the confirmed
  track; the time log task from the baseline draft and from the newest
  blueprint): 123/123 on a fresh :3291 (the old one answered 500 with the
  Jest worker error and was restarted) with tagged accounts
  (`--tag pass4fix`), run twice, then `cleanup --tag pass4fix`.
  `week3-rules.ts`, lint and build pass.
- New and changed strings for Eric's list: "하네스 쓰기 전 결과물",
  "하네스를 쓰기 전 결과물 화면을 남겨요. 1주차 시간 기록에 올린 화면
  가운데서 골라요. 없으면 비워 둬도 돼요.", "지금 기록해 두지 않으면 11주차에
  비교할 처음 숫자가 없어요.", "3주차 과제는 파이프라인으로 한 기록이라
  ‘파이프라인’으로 남겨요. 기준선의 처음 기록으로는 쓰지 않아요.", "11주차에
  이 기준선과 비교해서 무엇이 달라졌는지 봐요." (was 견줘서), "{날짜}에 잰
  ‘기존 방식’ 기록" (was "{날짜}에 남긴 …"), "{날짜}에 기록", "진단 {트랙} ·
  확정 {트랙} ({월. 일.})", "워크스페이스 이름을 적어 주세요.", "프로젝트 폴더
  이름을 적어 주세요.", "워크스페이스", "워크스페이스 준비됨", "워크스페이스
  다시 확인 필요", "워크스페이스 미확인", "아직 워크스페이스를 확인하지
  않았어요.", "워크스페이스 점검" (raw event label, was 작업 환경 준비), and
  the staff row labels "워크스페이스 이름" / "프로젝트 폴더 이름" (was 공간
  이름).

Fifth browser pass findings, 2026-10-04 (four medium; decided without
asking, per Eric's standing rule, strings listed below for his review):

- **Fixed: an unchanged 기준선 다시 확정하기 made the countersign stale.**
  After a reload the button was enabled with nothing edited, and a tap wrote
  a second `baseline_locked` event with the same content, so the
  instructor's countersign answered 409 ("방금 수강생이 기준선을 다시
  확정했어요. 새로고침해 주세요."). Both options from the finding, since each
  covers a case the other does not: the form keeps the button disabled while
  the draft says the same as the locked snapshot, with the line "확정한
  내용에서 바뀐 곳이 없어요. 고친 뒤에 다시 확정할 수 있어요."; and the lock
  route answers a lock identical to the current, not countersigned snapshot
  with that snapshot's event id (`unchanged: true`) and writes nothing, as
  the blueprint route does for an identical resubmit (covers a retry after a
  lost response, a second tab, an old page). One comparison for both,
  `sameBaselineContent` in `rules-week3.ts`: task, source, stages, cited
  entry, frequency, evidence and checklist, normalised the way
  `toBaselinePayload` writes them; signing time, the tick, minutes and dates
  are not content. A countersigned snapshot still falls through to
  `lock_baseline()` and answers "frozen". The editor now takes
  `lockedSnapshot` instead of `locked`.
- **Fixed: the roster's 1주차 시간 기록 counted Week 3 entries.** The cohort
  page counted every `time_log_entry`, so a dry run (and any pipeline or
  harness run) raised the Week 1 number. It now counts `method` "before"
  without `dry_run` only, read as two JSON fields with the same single
  query. Chosen over "dated in Week 1" because Week 1's time log is the old
  way by definition and a learner may log it late (the baseline asks for
  exactly that); showing dry runs in the Week 3 column is deferred, no phase
  needed before the pilot: the Week 3 card and the queue already show the
  dry run per learner.
- **Fixed: the report named the survey track with no word on the confirmed
  one.** When the confirmed track differs from the track the report is
  written for, a line sits above the report (outside the fold): "이 리포트는
  진단 트랙(문서·행정 트랙) 기준이에요. 4주차부터는 확정 트랙(데이터·수치
  트랙)으로 들어요." Compared by display name, the same names the 진단 요약
  rows show; no line when the two match or nothing is confirmed. D2 is
  unchanged (the one-pager keeps the survey track).
- **Fixed: the baseline called the "before" entry Week 1's.** Section 3's box
  is "시험 실행과 기존 방식 기록" and section 5's hint is "하네스를 쓰기 전
  결과물 화면을 남겨요. 시간 기록에 올린 화면 가운데서 골라요. 없으면 비워 둬도
  돼요." Same pass, same reason: the no-entry error (`checkBaseline`, shown
  under the button and returned by the route) dropped its "1주차" too, and
  now starts "‘기존 방식’ 시간 기록이 없어요.", matching the form's own
  empty-state line.
- Checks: `week3-rules.ts` gained eight (`sameBaselineContent`: unchanged,
  spacing and tick ignored, a re-lock payload equal, frequency, checklist,
  evidence and source changes differ; the no-entry error without 1주차);
  `week3-labs.mjs` gained seven (identical re-lock answers the current event
  and writes nothing; the form with an unchanged draft renders 다시 확정
  disabled with its line, a changed draft enables it; no Week 1 label in
  sections 3 and 5; the report line on 나의 AI 교육; the roster's 시간 기록
  equal to the learner's before entries while the dry run exists): 130/130
  against a production build (`next start -p 3297`) with tagged accounts
  (`--tag pass5fix`), run three times, then `cleanup --tag pass5fix`. lint
  and build pass.
- New and changed strings for Eric's list: "확정한 내용에서 바뀐 곳이
  없어요. 고친 뒤에 다시 확정할 수 있어요.", "이 리포트는 진단
  트랙({트랙}) 기준이에요. 4주차부터는 확정 트랙({트랙})으로 들어요.",
  "시험 실행과 기존 방식 기록" (was 시험 실행과 1주차 기록), "… 시간 기록에
  올린 화면 가운데서 골라요. …" (was 1주차 시간 기록에), and "‘기존 방식’
  시간 기록이 없어요. …" (was 1주차 ‘기존 방식’ …).

Sixth pass findings, 2026-10-04 (four medium; all fixed, decided without
asking, per Eric's standing rule, strings listed below for his review):

- **Fixed: baseline evidence could come from a dry run or harness run.** The
  lock route accepted section 5's "하네스 쓰기 전 결과물" when any of the
  learner's own time log entries cited it, every method included, so a hand
  built request or an old tab could freeze an "after" screenshot as the
  baseline's "before" evidence, and Week 11 would score before against
  after with it. The route now checks the evidence against the before
  entries it already computed (`entries.some(e => e.evidence_ref === ref)`,
  `beforeEntriesFrom` leaves out dry runs and other methods), the same list
  the form offers.
- **Fixed: "처음 숫자" / "처음 기록" read as "the first number / record".**
  Rewritten from intent: the Week 1 line is "지금 기록해 두지 않으면 11주차에
  비교할 기준 숫자가 없어요." and the from=week3 method note is "3주차 과제는
  파이프라인으로 한 기록이라 ‘파이프라인’으로 남겨요. 기준선에 쓰는 ‘기존
  방식’ 기록이 아니에요."
- **Fixed: the dry run's corrections link opened on the newest harness.** With
  `?from=week3` the form now opens on the harness linked to the AI stage
  nearest before the newest blueprint's first checkpoint (that checkpoint's
  stage included; one pure function, `dryRunHarnessId` in `rules-week3.ts`,
  linked ids that are no longer saved are skipped); with nothing linked, on
  the first-saved harness, the workspace lab's "첫 번째 하네스". `?h=` still
  wins. The correction select and the blueprint stage select now list
  harnesses first-saved first, the workspace lab's order (one helper,
  `byFirstSaved` in `harness/queries.ts`, used by all three). Week 2
  without `?from` still opens on the most recently saved harness, the one
  the learner just worked on.
- **Fixed: the harness card contradicted the agent path.** The workspace lab's
  two cards now share the chosen path (`WorkspaceLab`, a small client
  wrapper; the form reports a path change). Agent path: title "프로젝트 폴더에
  넣을 하네스", intro "저장한 하네스를 글로 꺼내요. 두 하네스 모두 텍스트
  파일로 저장해 프로젝트 폴더에 지시 파일로 넣어요.", and the 복사하기 result
  line "복사했어요. 프로젝트 폴더의 지시 파일에 붙여 넣으세요." (the browser
  line said 지시 칸, the same contradiction one tap later). The browser path
  is unchanged.
- Checks: `week3-rules.ts` gained six (`dryRunHarnessId`: nearest AI stage up
  to the first checkpoint, an earlier checkpoint, an unsaved link skipped,
  nothing linked, no checkpoint, on a payload); `week3-labs.mjs` gained six
  (evidence cited only by a dry run -> 422, with a real upload at a valid
  path; corrections from the dry run preselects the linked harness B, lists
  A, B, C by first save, Week 2 still preselects the newest save C, nothing
  linked preselects A; the agent-path harness card) and its two time-log
  string checks follow the new copy and refuse "처음 숫자" / "처음 기록":
  136/136 against a production build (`next start -p 3298`) with tagged
  accounts (`--tag pass6fix`), then `cleanup --tag pass6fix`. lint and build
  pass. Side note: the older "evidence not cited by an own entry" check uses
  a path outside the `time-log/` folder pattern, so it is refused by
  `isOwnEvidencePath` before the citation rule; the new dry-run check is the
  one that exercises the citation rule.
- New and changed strings for Eric's list: "지금 기록해 두지 않으면 11주차에
  비교할 기준 숫자가 없어요." (was 처음 숫자), "… 기준선에 쓰는 ‘기존 방식’
  기록이 아니에요." (was 기준선의 처음 기록으로는 쓰지 않아요.), "프로젝트
  폴더에 넣을 하네스", "저장한 하네스를 글로 꺼내요. 두 하네스 모두 텍스트
  파일로 저장해 프로젝트 폴더에 지시 파일로 넣어요.", "복사했어요. 프로젝트
  폴더의 지시 파일에 붙여 넣으세요."

Seventh pass findings, 2026-10-04 (three medium; all fixed, decided without
asking, per Eric's standing rule, strings listed below for his review):

- **Fixed: the agent-path harness card sent learners to a file the agent never
  reads.** It said to save both harnesses as text files and put them in the
  project folder, and the save button downloaded "<harness name>.txt"; Claude
  Code reads CLAUDE.md and Codex AGENTS.md (session plan appendix), so a
  learner who followed the card failed the one-line test and met the file
  names only in `AGENT_FORGOT_FIX`. Both options from the finding: on the
  agent path 복사하기 is the row's only action (full width, no .txt save),
  and the intro and copy line name the files. The form now reports the
  assistant too (`onAssistantChange`, cleared with the path as before), and
  with Claude Code or Codex chosen one card button saves every listed
  harness, first-saved first, as one CLAUDE.md or AGENTS.md (no byte order
  mark, `---` between harnesses). "Other" or no assistant: copy only, the
  line names both files. The browser path is unchanged.
- **Fixed: "증거 없이 둘게요"** (baseline section 5, a literal "evidence").
  Now "화면 없이 비워 둘게요", the section's own words.
- **Fixed: "한 시간 기록" read as "a one-hour record"** (baseline section 3
  hint). Now "하네스를 쓰기 전 예전 방식으로 했을 때의 시간 기록을 하나
  고르세요. 그 기록에 걸린 시간이 기준이 돼요."
- Checks: `week3-labs.mjs`'s agent-path card check follows the new copy and
  refuses "텍스트 파일로 저장" and "지시 파일로 넣어요"; one new check for the
  CLAUDE.md save button on a Claude Code record. 137/137 against a
  production build (`next start -p 3299`) with tagged accounts (`--tag
  pass7fix`), then `cleanup --tag pass7fix`. lint and build pass.
- New and changed strings for Eric's list: "저장한 하네스를 글로 꺼내요.
  에이전트는 정해진 지시 파일만 늘 읽어요. Claude Code는 CLAUDE.md, Codex는
  AGENTS.md에 두 하네스를 차례로 붙여 넣어요." (was … 텍스트 파일로 저장해
  … 지시 파일로 넣어요.), "복사했어요. 프로젝트 폴더의 {CLAUDE.md|AGENTS.md}에
  붙여 넣으세요." and, with no agent chosen, "복사했어요. Claude Code는
  CLAUDE.md, Codex는 AGENTS.md에 붙여 넣으세요." (was … 지시 파일에 …),
  "하네스를 {파일}로 저장" / "하네스 N개를 {파일} 한 파일로 저장", "{파일}로
  저장했어요. 다운로드 폴더에서 프로젝트 폴더로 옮겨 주세요.", "화면 없이 비워
  둘게요" (was 증거 없이 둘게요), and the section 3 hint above (was "하네스를
  쓰기 전, 예전 방식으로 한 시간 기록을 하나 고르세요. 그 기록의 시간이 기준이
  돼요.").

Eighth pass findings, 2026-10-04 (two medium; the app one fixed, the test
setup one fixed in the check script and README; decided without asking, per
Eric's standing rule, strings listed below for his review):

- **Fixed: a switch to candidate 2 left no way to log a before entry for the
  new task, and the instructor never saw the mismatch.** Section 1 allows the
  switch, but section 3 showed the 시간 기록하러 가기 link only with no before
  entry at all, so a learner holding only candidate 1's entries got the soft
  warning and the easy path was to lock with candidate 1's minutes; the
  queue and the learner page showed "워크맵 후보 2순위" beside those minutes
  with nothing to say they came from another task, and the countersign
  would freeze it (D3). Now:
  - Section 3 always links to `/app/lab/time-log?from=baseline` under the
    list. When no listed entry has the draft's task (`sameTask`), a yellow
    block names the task, says the Week 11 comparison would be of two
    different tasks, asks for one old-way run this week (countersign in
    Week 4, as with no entry at all) and carries the link as a full-width
    button; otherwise a one-line text link. The time log prefills from the
    baseline draft's task on that path, so the new entry matches.
  - The link saves the draft first (`useDraft().settle()`, new: resolves
    once the server has the current draft or a save failed) and then
    navigates, so a task changed a moment ago is what the time log reads
    instead of racing the 1.5 s debounce and the unmount flush.
  - The lock payload keeps the cited entry's task (`time_log_task`, set by
    `toBaselinePayload`; `lock_baseline()` stores the payload as given, so
    no migration). `baselineTaskMismatch` / `baselineTimeLogTask` in
    rules-week3 read it, falling back to the cited entry's task for
    snapshots locked before the field existed (the cohort page's one read
    of cited entries now covers both started_at and task; the learner page
    already has the entries).
  - BaselineView shows a warn chip "다른 업무로 잰 기록" and the entry's task
    under 기준 시간 when they differ; the cohort queue's collapsed row shows
    the same chip, so the instructor sees it in the 20-second scan before
    the two-tap countersign.
- **Fixed in the tooling: parallel runs collided through a shared folder.**
  Not an app defect: the reviewer's walk (tag zq7m4k, screenshots in
  `.review-2c/zq7m/`) found nothing HIGH or MEDIUM in the app, but another
  run overwrote the cookie files in the shared `scratchpad/s`, so the
  reviewer's service-role setup reset `phase1a-learner+rev2c` and
  `phase1a-learner+bp8` (events, drafts, enrollment, display name 김점검,
  plus work_map 931, harnesses 933/934 and before log 941 on bp8). Results
  from the rev2c and bp8 runs after about 00:38 UTC are not evidence; re-run their
  setup with fresh tags. `week3-labs.mjs` now refuses cookie files
  whose three accounts carry different tags, and with `CHECK_TAG=<run>` set
  any tag but that one, before any setup write. The README's parallel-runs
  list adds one folder per run (`mktemp -d`, never a shared name like
  `scratchpad/s`, `c.sh` or `setup.mjs`) and runs the script with
  `CHECK_TAG=$TAG`. Seen and not app defects: a dev server whose drafts
  route answered 500 (Jest worker crash) until restarted, already in the
  README; US datetime format in headless Chrome without a ko-KR locale.
- Checks: eight new in `week3-labs.mjs`: a candidate-2 draft with only
  candidate-1 entries renders the line and the time log link; a same-task
  draft keeps the link without the line; the time log from the baseline
  starts on the candidate-2 task; the snapshot carries `time_log_task`; the
  queue shows no chip for a same-task baseline, the chip with the entry's
  task for a candidate-2 baseline, the same on the staff learner page, and
  the chip from the cited entry for a snapshot without `time_log_task`.
  145/145 against a production build (`next start -p 3471`) with tagged
  accounts in their own folder (`--tag f8x075536`, `CHECK_TAG` set), then
  `cleanup --tag f8x075536`; a wrong `CHECK_TAG` stops the script before
  setup. lint and build pass.
- New strings for Eric's list: "‘{업무}’ 업무를 예전 방식으로 한 기록은 아직
  없어요. 다른 업무의 기록으로 확정하면 11주차에 서로 다른 업무를 비교하게
  돼요. 이번 주에 이 업무를 예전 방식으로 한 번 하고 시간을 기록해 주세요.
  이때는 강사 확인을 4주차에 받아요.", "고를 기록이 없으면 새로 남겨
  주세요. 시간 기록하러 가기" (the button label is the existing one), and for
  staff "다른 업무로 잰 기록" with "‘{업무}’ 업무를 한 기록".

Steps 5 and 6 ran as the eight browser and reviewer passes above; step 7 is
the hand-off below. Still open from step 5: real Android and iPhone taps on
the datetime fields.

## Hand-off (deployed 2026-10-04)

**What shipped.** Commits `924be93..6702408` (22780e8 contracts through
6702408 eighth-pass findings), fast-forwarded onto `main` and built on the
droplet. Learners: the Week 3 labs (워크스페이스 점검 `/app/lab/workspace`,
파이프라인 설계도 and the dry-run timer `/app/lab/blueprint`, 기준선
`/app/lab/baseline`), lab buttons on the Week 3 page, 설계도 and 기준선 cards on
나의 AI 교육, 확정 트랙 on the 코스 tab, "템플릿으로 시작" in the harness editor
(enrolled learners only). Staff: the 기준선 확인 대기 queue with two-tap
countersign, 트랙 확정 per learner, Week 2 and Week 3 columns on the cohort
roster, Week 2 and Week 3 cards on the learner page. Database: migration 0011
(`harness_template`, countersign unique index, `lock_baseline()`,
`countersign_baseline()`, `cohort_week_signals()`).

**Deploy record.**
- `git fetch` + `rebase origin/main`: already on top (origin/main was
  924be93). lint clean, `next build` passes.
- `git push origin app-2c:main`: 924be93..6702408, fast-forward.
- 0011 re-run with `scripts/db.ts --file` (idempotent; it was first applied
  at 6b7431c and the file has not changed since). Section 5 checks: 3
  functions; `lock_baseline` and `countersign_baseline` executable by
  service_role only; `harness_template` grants authenticated SELECT only, anon
  none; `profile_event_countersign_uidx` present. Template seed `--check`
  clean (3 templates, 0 errors, 0 warnings), then re-upserted SP-HL-01 to 03.
- Droplet: `/opt/funnel` 924be93 → 6702408 (`/root/funnel-prev-commit` holds
  924be93), `docker compose up -d --build`, `funnel-app-1` healthy on
  127.0.0.1:3100.

**Live checks on https://app.innovlab.me** (tagged accounts from
`scripts/test-session.ts`, tag `live2c1791076957`, cleaned up afterwards: 0
accounts and 0 test cohorts left):
- `CHECK_BASE=https://app.innovlab.me CHECK_TAG=... node
  scripts/checks/week3-labs.mjs`: 145/145, including countersign and track
  routes 401 without a session and 403 for a learner, the two RPCs refused
  with learner and staff JWTs, the lab and staff pages with their expected
  strings, and no templates sent to a learner who is not enrolled.
- Learner session: `/app/lab/{work-map,time-log,workspace,blueprint,baseline,harness}`
  and `/app/courses/week/{1,2,3}` all 200; `/staff`, `/staff/cohort/:id`,
  `/staff/learner/:id` all 404 (refused). Anonymous `/start`, `/login`,
  `/api/health` 200; `/` 307.
- `docker compose logs --tail 200`: no 500, error or exception lines.

**Findings still open.** None high or medium. Real-phone datetime fields
(step 5). Deferred with a phase: account deletion scrubbing lab event text
(Phase 3), reopening a countersigned baseline (Phase 3 backoffice, D3),
Week 11 `capstone_measured` (Phase 3). Noted with no phase: dry runs in the
roster's Week 3 column.

**Eric's string list.** Every string the labs added is listed for his review,
none of them blocks the pilot: the base list in "New strings for Eric's
review", plus the per-pass lists in "Findings" (main session; browser passes
1 to 8, each ending "New strings for Eric's list" or "New and changed
strings"). The ones that need a pick, not just a read:
- SMB track name: "소규모 사업·스타트업 트랙" (cohort cards) vs
  "사업자·스타트업 트랙" (staff pages).
- 11주차 vs 12주차 for the before/after comparison (11 shipped).
- Optional "진단 결과 기준 리포트" label when the confirmed track differs.
- Optional Week 3 Part 4 line, not added: "체크리스트를 다 못 쓰면 기준선은
  확정하지 않은 채로 두고, 4주차에 마저 써서 확인받아요."

**Redo the deploy** (or roll back):
1. `npx tsx scripts/db.ts --file supabase/migrations/0011_week3_baseline_templates.sql`
   (safe to re-run), then the section 5 queries.
2. `npx tsx scripts/seed-harness-templates.ts ~/claude-workspace/curriculum/drafts/assets --check`,
   then without `--check` (local only; the drafts are private).
3. One ssh call: `cd /opt/funnel && git rev-parse --short HEAD >
   /root/funnel-prev-commit && git pull --ff-only && docker compose up -d
   --build && docker compose ps`.
4. Live: three `test-session.ts` cookies with one fresh `--tag` in their own
   folder, `CHECK_BASE=https://app.innovlab.me CHECK_TAG=<tag> node
   scripts/checks/week3-labs.mjs <dir>`, then `cleanup --tag <tag>`.
5. Rollback: `cd /opt/funnel && git checkout $(cat /root/funnel-prev-commit)
   && docker compose up -d --build` (0011 can stay: the 2b build uses none of
   it).
