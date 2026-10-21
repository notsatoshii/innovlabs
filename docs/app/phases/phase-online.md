# Phase O: the online course inside the app (game-style, personalized)

Status: PLAN, 2026-10-20, no code. Written after the first curriculum pass
(private workspace repo, `curriculum/online/`: `00-game-design.md`,
`01-spine-world-0.md`, `02-spine-world-2.md`, `tracks/*.md` and the per-level
full-depth files). Follows `process.md` (contracts first, builders on
non-overlapping files, fresh-context reviewer, deploy steps, stop for Eric).

## 0. What this is and is not

A new surface for self-paced learners: worlds, levels, missions, XP, weekly
streaks, quests, boss fights, collections, opt-in leaderboards, buddies,
referrals. It reuses the account, the survey, the profile, the artifact
tables and the staff pages. It is not the Week 1 to 3 cohort labs (those stay
as they are for offline cohorts); where an online mission produces the same
artifact (Work Map, harness, blueprint, baseline), it writes to the same
tables through the same routes, so a learner can switch formats and staff see
one record.

Mission text is product content and lives in the private workspace repo. The
public innovlabs repo never contains mission text: content is seeded into the
database from the private repo by a local script (same pattern as
`scripts/seed-harness-templates.ts`).

## 1. Contracts (written first, in one commit)

### 1.1 Content model (`src/lib/course/types.ts`)

```
Course { code: TrackId | 'spine0' | 'spine2'; version; levels: Level[] }
Level { id: 'L1'..'L12'; title; goal; bossMissionId; missions: Mission[]; skipTest?: SkipTest }
Mission { id: 'M4.2' | 'B4' | 'M4.A'; title; minutes; xp: XpSplit; boxed?: 'full_agent';
          personalization: SlotId[]; artifact?: ArtifactRef; requires?: Requirement[];
          beats: Beat[] }
Beat { kind: '상황'|'알기'|'해보기'|'내 업무에'|'확인'|'보상'; screens: Screen[] }
Screen { text: SlotText; media?: MediaRef; interaction?: Interaction }
Interaction = I1 Sort | I2 Pick | I3 Spot | I4 Slots | I5 Order | I6 Predict | I7 Choose
            | I8 Timer | I9 MyTask | I10 Checklist | I11 AssistantLab | I12 Duel
SlotText = string with {{s1.task}}, {{s2.example}} … resolved server-side from user_profile
```

Content is JSON per mission, compiled from the markdown by a converter script
(`scripts/course/compile.ts`, reads the private repo path from an env var,
validates against the types, writes `course_content` rows). The markdown stays
the source of truth; the JSON is a build output.

### 1.2 Tables (migration 0012, all with RLS and the revoke pattern of 0010)

- `course_content` (mission_id, course_code, version, json, published_at):
  readable by authenticated; written by service role only.
- `course_progress` (user_id, mission_id, state: locked|open|done, beat_reached,
  score, updated_at): learner reads own; writes only via routes.
- `xp_ledger` (user_id, mission_id, beat, amount, reason, created_at):
  append-only, sum is the learner's XP; no update or delete path.
- `streak` (user_id, week_start, kept bool, shield_used bool): one row per
  ISO week, written by a nightly job and by mission completion.
- `badge_award` (user_id, badge_id, artifact_ref, created_at): append-only;
  every badge row points at an artifact or a logged behavior.
- `quest` (user_id, week_start, quest_id, done_at): three per week, generated
  from state by a pure function (`src/lib/course/quests.ts`).
- `nickname` (user_id, nickname, leaderboard_optin bool): off by default.
- `buddy_pair` (a, b, created_at, ended_at): visible fields are streak, level,
  mission count; never artifacts (enforced by a view).
- `referral` (code, referrer_id, referred_id, qualified_at): `qualified_at` set
  only when the referred learner's Work Map exists (B1 done); rewards are
  ledger rows written then.
- `drill_result` (user_id, drill_id, date, score): the daily 오늘의 한 판.

Leaderboard reads go through SQL views that expose nickname + XP only,
weekly windows, and the org board only when `count(*) >= 5` for that org
(reusing the org report rule).

### 1.3 Routes

`/app/course` (world map) · `/app/course/[level]` (level page, boss state) ·
`/app/course/m/[missionId]` (the mission player, one beat per screen) ·
`/app/course/board` (leaderboards) · `/app/course/buddy` · `/app/course/invite`.
APIs under `/api/course/*`: `progress` (advance a beat, idempotent), `xp`
(server-computed only; the client never posts an amount), `artifact` (delegates
to the existing `/api/artifacts/*` routes), `feedback` (I11 rubric call to the
Claude API with a cached system prefix per rubric; same constraints as the
one-pager slots), `quests`, `referral`, `buddy`.

### 1.4 Personalization

Slots S1 to S8 resolve from `user_profile` plus course state in one server
function (`src/lib/course/slots.ts`); the mission player receives resolved
text. S2 example variants are chosen by rule from Q1/Q3; S5 path from the depth
flag; nothing generated. The I11 feedback rubric is the only LLM call.

## 2. Build order (sub-phases, each reviewed and deployed on its own)

| Sub-phase | Ships | Why first |
|---|---|---|
| O1 Engine + Level 1 | the 12 interaction components, the mission player, `course_content`, `course_progress`, `xp_ledger`, World 0 Level 1 (6 missions) seeded, the world map | Everything else is content on top of this; Level 1 is the pilot and the funnel |
| O2 World 0 + game loop | Levels 2 and 3, streaks, quests, badges, the 하네스 덱 and 도구 카드 collections, the daily drill, skip-ahead tests | Completes the shared part every track needs |
| O3 First track | DOC Levels 4 to 10 seeded, the 검증 던전 room component, Level 11 and 12 (World 2), the evidence package screen | A learner can graduate end to end |
| O4 Social | nicknames, opt-in leaderboards (five boards), buddies, referrals with artifact-gated rewards, 우리 팀 초대 | Needs real learners to be worth anything |
| O5 Remaining tracks + media | RES, DAT, SAL, CON, MGT, SMB seeded; media assets attached as they are produced; agent-path boxed missions | Content, not code |

Rough size: O1 is the big one (the 12 components and the player are the
product). O2 to O4 are each about the size of Phase 2b. O5 is seeding.

## 3. Rules check (CLAUDE.md)

Survey responses untouched (reads only). Registration gate unchanged (the
course sits behind login; World 0 Level 1 as a free funnel is Eric's call).
LLM only in the I11 feedback rubric, template with constrained slots, no
curriculum facts. Outcome language: the Level 11 evidence line shows two
measurements with dates, no percentage. Privacy: artifacts learner-only;
boards and buddies see nickname, XP, streak, counts; org aggregates min 5.
Korean 해요체 from the curriculum files; strings listed for Eric's review per
sub-phase as before. Append-only ledgers; no update path on XP, badges,
referrals.

## 4. Decisions needed before O1 (Eric)

1. World 0 Level 1 free (funnel) or behind enrollment.
2. The coach: character or voice; name. [코치] in all content until then.
3. The word for XP and the level titles (design §3.1 placeholders).
4. Referral rewards: content only (as designed) or also money/discount.
5. Whether the online course is sold per track, per block, or as one.

## 5. Open technical questions (mine, decide at O1 contracts)

- Mission JSON size and caching: one row per mission, edge-cached per
  version, resolved slots applied at request time.
- I8 timers: server timestamps, client display only, so a reload cannot fake
  a duration.
- I11 paste size cap and PII scrub before the rubric call (reuse the masking
  helper the DAT track's R5 rule needs).
- Offline cohort learners who also do the online course: progress is per
  mission, artifacts are shared, so the labs page shows "done in the course".
- Baseline contract change: the online B3 adds an optional 재료 크기 (number +
  unit: 건/명/행/쪽/개) to the locked baseline, and Level 11 reads it back. The
  live `lock_baseline()` payload (migration 0011) gets the same optional field in
  0012, so offline and online baselines stay one shape.

## 6. Change log

- 2026-10-20: first plan, after the first curriculum pass.
- 2026-10-21: O1 follow-up (four Level 1 gaps), below.

## O1 build plan (2026-10-20, Eric chose "start the course build")

Scope: the engine and World 0 Level 1 (M1.1–M1.5, B1, skip test S1) live
behind login at `/app/course`. Out of O1: streaks, quests UI, leaderboards,
buddies, referrals, LLM feedback on I11 (static example only), Levels 2+,
media assets (placeholder cards). Branch `online-o1` in worktree
`.claude/worktrees/online-o1`.

Decisions (mine, marked; Eric may overturn):
- O1-D1 Access: any signed-in learner with a profile sees Level 1. Gating by
  enrollment or payment waits on Eric's pricing pick (§4).
- O1-D2 Look: the app's live clay + glass tokens. All course styling lives in
  `src/components/course/course.css` plus tokens, so the style-board pick
  re-skins without touching logic.
- O1-D3 Content: one JSON per mission in the private repo
  (`claude-workspace/curriculum/online/content/spine0/L1/*.json`), seeded into
  `course_content` by `scripts/course/seed-content.ts` with the service role.
  The public repo holds the engine and types only.
- O1-D4 XP: server-computed in `/api/course/answer` and `/api/course/step`
  from the stored content; the client never sends an amount. Answers are in
  the content the browser receives (needed for instant feedback); the server
  re-checks before paying. Idempotent per item key (unique index).
- O1-D5 Artifacts: the own-work beats write through the existing lab drafts
  and routes. M1.1 seed rows and M1.3–M1.5 use the `work_map` draft and the
  existing StepWrite / StepClassify / StepCandidates editors; M1.5 ends with
  POST /api/artifacts/work-map. B1 ends with POST /api/artifacts/drill. The B1
  quest opens /app/lab/time-log (method before). Staff see one record either
  way. Assistant outputs pasted in B1 stay in the browser (drill route rule).
  Superseded 2026-10-21 (Eric approved): see "O1 follow-up" below.
- O1-D6 Personalization: `{{slots}}` resolved on the server
  (`src/lib/course/slots.ts`) from user_profile.core and the work map; static
  variants only, no generation.

File ownership (process.md §3):

| Agent | Owns | Must not touch |
|---|---|---|
| server | `src/lib/course/{validate,state,score,slots,content}.ts`, `src/app/api/course/**`, `scripts/course/seed-content.ts`, `scripts/checks/course-o1.mjs` | components, pages, types.ts, the migration |
| ui | `src/components/course/**`, `src/app/app/course/**`, one link on `src/app/app/courses/page.tsx` | lib/course (imports only), api, lab components (import only) |
| content | private repo `curriculum/online/content/spine0/L1/*.json` | anything in the public repo |

Contracts (main session, committed first): migration 0012, `src/lib/course/types.ts`.

Definition of done: lint + build clean; content validates; signed-in check
script passes on the dev server (answer idempotency, caps, RLS: learner reads
own rows only, cannot insert; anon nothing); a 375 px browser pass through all
six missions; the work map submitted from M1.5 shows on /app/lab/work-map and
the staff learner page; fresh-context review; deploy (0012 → seed → droplet
pull + build) and live checks with tagged test accounts, cleaned up after.

## O1 look and motion (2026-10-20, Eric picked "Mix C")

Board: https://claude.ai/artifact/MMtS1cdMAYKyzLjveEwiFz (source in session 51f31f84's scratchpad, `course-looks/index.html`).

- **Look = Mix C**: the app's clay + glass as it is (wash, frosted cards, Jua + body face), plus Look 2's saturated colours on everything tappable: action `#2f5bff`, done `#3ddc97`, chips `#ffe27a`, boss `#ff4f8b`, accent text `#2f5bff`. Tappable things are chunky clay buttons: `inset 0 -5px 0 rgba(0,0,0,.22)` bottom lip, press = translateY(3px) with a 2px lip. Level dots get the same lip. Progress fill is a blue-to-pink gradient. All of it through the `--course-*` vars in course.css (O1-D2), so nothing else in the app changes.
- **Coach 모아** (rulebook §3.11): shipped as pre-rendered sprite sheets, 36 frames per state at 256 px (idle 3.6s, think 2.4s, wince 1.6s, nod 1.4s, cheer 1.8s), played with CSS `steps(36, jump-none)`; one-shot moods (wince, nod) play once then settle back. Each mood is acted, face and body together: idle looks left and right, double-blinks, breathes; think looks up, squints, one brow up, mouth shifts, thought dots fill in; wince recoils, squeezes eyes, wavy mouth, sweat drop, then worried eyes; nod nods twice with happy eyes and blush; cheer squats, jumps with a spin, star eyes and sparkles, squash on landing. The antenna lags the body (follow-through). Face glass must not use transmission (it hides the face texture); use a low-opacity clearcoat layer. Source of truth for the acting: the board's `act()` and `drawFace()`. No three.js on phones. Render the sheets once with the board's scene (three 0.160, same materials) in headless Chrome (`--use-angle=swiftshader`), export WebP at 2x, put them in `public/course/moa/`. Component `MoaSprite` (state prop); states: wrong answer = wince, right = nod, thinking steps = think, reward = cheer, else idle.
- **Motion** (all off under `prefers-reduced-motion`, everything readable at rest):
  map nodes pop in staggered (60 ms), current dot pulses, boss dot wobbles every 3 s, coach bubble pops in;
  card sort: right = card flies out to its side and the next card rises in, wrong = shake and the card stays, combo label bumps;
  reward: XP counts up over 0.9 s, breakdown chips pop in one by one, level bar fills, 16 clay bits burst, 모아 cheers;
  layer drop: when a correction is folded into a harness, a new clay layer drops under 모아 (rulebook §3.11).

## O1 follow-up: four Level 1 gaps (2026-10-21, Eric approved)

- **After Level 1.** The level end card (B1's reward, and the level map once
  B1 is done) says what Level 2 leaves the learner with (its goal line in
  `01-spine-world-0.md`), offers one tap "레벨 2가 열리면 알려 주세요", and lists
  the Monday action: candidate #1 the usual way with the time log, then the
  2라운드 카드 (copyable). The tap writes `course_interest` (migration 0013)
  through POST /api/course/interest: one row per learner, course and level,
  only after every mission of the level before it is done, no XP. Learners read
  their own row; staff read all (they send the notice).
- **Which assistant the company allows.** New content block `tool` (a dated
  tool card, `ToolCard` in types.ts): course word, rule line, what to do first,
  what never goes in, dated picks, and the read date shown on the card. Product
  names are allowed only in a card's picks (validateMission). B1 S1b carries
  "회사 어시스턴트" (for everyone) and "계정 점검" (personal branch), facts from
  practical-results-map §0.3 [W1]–[W4] and tools-2026-10 T2. No XP.
- **Pasted work survives the tab.** `course_local` (migration 0013): per
  learner and mission, the I11 rounds (20,000 characters each), the picks of
  I7s without an answer, and the order slip. Nothing else. Readable by its
  owner only (no staff policy); written by POST /api/course/local with the
  service role after requireLearner(), every key checked against the mission
  (`src/lib/course/local.ts`). The player starts from the row and saves on every
  change; sessionStorage stays as this tab's copy until the save lands. Deleted
  with the account (cascade). The drill route still stores no outputs.
- **B1 비교 at 375 px.** One round at a time under a sticky toggle (switching
  keeps the scroll position), taller round box, pasted pipe tables shown as
  tables in a sideways-scrolling box, and while writing the chip lines either
  round opens in a bottom sheet.

Open for Eric: the registration consent's 수집 항목 does not name course work
(Work Map, drill sheet and now the pasted rounds); the Level 2 notice channel
(the copy says "알려 드릴게요" without naming email); and B1 asks for candidate #1
"the usual way" next time while the 2라운드 카드 says "다음 주에 이 카드로" (the end
card orders them: usual way first, card after).
