# How an app phase is built

Requested by Eric 2026-09-10: a fixed loop of plan → plan review → build →
test → review → fix → deploy → Eric's review. Applies to every phase file in
this folder. Agents are used where the work splits into non-overlapping
files; one person (Claude, main session) owns the contracts, the commits, and
the hand-off to Eric.

## 1. Plan

- Write `phase-N.md`: decisions, scope in and out, routes, data model, build
  order, rules check, open questions. Collect Eric's answers before code.
- Everything a later phase needs from this one (schema, types, event shapes)
  is written in this phase so the later phase adds screens, not migrations.

## 2. Plan review

- A critical pass on the plan itself, recorded in the plan file (§11 in
  phase-1): size, hidden dependencies, rule conflicts, what is being assumed.
- Eric reads the plan. Assumptions are marked and stand until overturned.

## 3. Build

- Main session writes the shared contracts first: migration, row types,
  event catalog, session helper, CSS tokens. Agents build on them, never
  redefine them.
- Work is split by file ownership. Two agents never edit the same file. Each
  agent gets: its file list, the contracts it may import, the rules from
  `CLAUDE.md`, the Korean copy standard, and a definition of done.
- Agents run `npx tsc --noEmit` and `npx eslint` on their files. They do not
  run `next build` (shared `.next` dir) and do not commit.
- Main session reviews each agent's diff, runs lint and build, and commits
  one logical step at a time with a clear message.

## 4. Test

- `npm run lint`, `npm run build` clean.
- Browser pass on a phone viewport (375 wide) through every touched screen,
  signed out, signed in with a profile, signed in without a profile.
- RLS proof in the Supabase SQL editor with a learner JWT and a staff JWT for
  every policy the phase added.
- Korean read-aloud pass on every new or changed string.

## 5. Review

- A reviewer agent with fresh context reads the diff against the plan file
  and `CLAUDE.md`, and reports: rule violations, plan drift, bugs, Korean
  that reads translated, dead UI. Findings go in the phase file under
  "Findings", each with fixed / deferred and why.
- Main session fixes what is fixable inside the phase. Deferred items get a
  phase number.

## 6. Deploy and hand-off

- Migration applied with `npx tsx scripts/db.ts --file supabase/migrations/NNNN.sql` (reads SUPABASE_DB_URL from .env.local; falls back to pasting in the SQL editor), then `git pull && docker compose
  up -d --build` on the droplet, then any seed script from the local machine.
- Hand-off message to Eric: what shipped, findings list, the review URL, and
  the exact steps to redo the deploy. Then stop. The next phase starts after
  Eric's review.

## Phase 1a split (2026-09-10)

| Agent | Owns | Must not touch |
|---|---|---|
| tokens-copy | `src/app/globals.css`, `src/app/page.tsx`, `src/app/start`, `src/app/survey`, `src/app/teaser`, `src/app/report`, `src/app/solo`, `src/app/student`, `src/components/survey/*`, `src/components/Logo.tsx`, `src/lib/survey/tracks.ts`, `src/lib/survey/questions.ts` (copy only) | anything under `src/app/app`, `src/app/login`, `src/app/register`, `src/lib/profile`, `src/lib/auth` |
| shell-login | `src/app/app/**` except `profile/`, `src/app/login/**`, `src/app/auth/callback/route.ts`, `src/app/layout.tsx`, `src/components/app/**`, `src/proxy.ts` (route guard) | `globals.css`, `page.tsx`, register, profile |
| register-profile | `src/app/register/page.tsx`, `src/lib/survey/remote.ts`, `src/app/app/profile/**`, `src/components/profile/**` | layout, login, globals.css |

Shared contracts (already written): `supabase/migrations/0004_app_phase1.sql`,
`src/lib/profile/types.ts`, `src/lib/profile/events.ts`,
`src/lib/auth/session.ts`. CSS contract: tokens `--background`, `--nb-ink`,
`--nb-paper`, `--nb-yellow`, `--nb-pink`, `--nb-pink-deep`, `--nb-lime`,
`--nb-cyan`; classes `nb-card`, `nb-flat`, `nb-btn`, `nb-btn-primary`,
`nb-btn-white`, `nb-input`, `nb-badge`, `nb-sticker` (준비 중 tag),
`nb-disabled` (greyed control). `--nb-purple` and `--nb-teal` are removed.

## UI improvement loop (Eric, 2026-10-01)

For any screen that feels slow or unfriendly. One loop per screen; the loop
ends on a passing task script, not on a round count.

1. **Evidence.** State the problem in numbers a learner would feel: what the
   first screen shows, how many taps and seconds to the first useful thing,
   how much scrolling. Write one task script, e.g. "at my level, find a tool
   for 회의록 in under 15 seconds and 3 taps".
2. **Ideas.** A design agent writes three concepts as text wireframes for a
   375px phone, scores each against the task script and the brand rules, and
   picks one. Output: a short spec with components, states, and Korean copy.
3. **Build.** A builder agent implements the spec on the files it owns.
4. **Critique.** A critic agent with fresh context runs the task script on
   the built screen at 375px, lists every defect, and says pass or fail.
5. **Fix.** The builder fixes; back to step 4 until the script passes.
6. **Ship.** Lint, build, deploy, then Eric's eyes on a phone.

Spec and critique live in `docs/app/phases/ui-<screen>-redesign.md`.
