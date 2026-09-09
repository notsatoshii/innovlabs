# App Phase 1: shell, login, registration, profile, resources

Status: PLAN, awaiting Eric's review. No code written against this file yet.
Date: 2026-09-09. Sources: `CLAUDE.md`, `survey_schema_v1_1.md`, `docs/curriculum/*`.

Phase 1 builds the post-survey app shell that returning users log into, the
registration form that follows auth, a real profile tab, a real resources tab,
and the data model that Phases 2 and 3 fill. Other tabs are placeholders.

---

## 0. Decisions carried into this phase

Answered or assumed. Assumptions are marked `ASSUMED`; Eric can overturn any
of them in review and the plan changes before code.

| # | Decision | Value |
|---|---|---|
| D1 | Registration fields | 표시 이름 (required), 회사명 and 직함 (optional). No phone. `ASSUMED` from my recommendation. |
| D2 | Resources content | A `tools` table with the library's schema (v0.1 §0.2 plus v0.3 `difficulty`), a `glossary` table, and the dated A3 tool stack as a static page. Seeded from JSON files in the repo, not typed into a backoffice. See §6. This REPLACES my earlier "markdown in repo" recommendation; the library docs already specify a Supabase table and the platform filtering on it. |
| D3 | Admins at launch | Eric and Ted in a `staff` table keyed by email. Eric 2026-09-09: the backoffice gets its own login on a separate subdomain. Same Supabase Auth project, same accounts; the admin subdomain serves only `/admin/*` with its own login page that accepts staff emails only. Phase 1 lays the `staff` table; the subdomain and admin login are Phase 3. `DECIDED`. |
| D4 | Visual language | Neobrutalism structure kept; palette variables swapped to the site's tokens (paper, ink, lime, pink, yellow, cyan; 6px/4px shadows). 2px borders stay inside dense forms. `DECIDED` (Eric 2026-09-09). |
| D5 | Discourse | Deferred. Community tab is greyed out with a 준비 중 sticker. Self-host on a separate droplet when it comes. `DECIDED` (Eric 2026-09-09). |
| D6 | App root `/` | Smart entry: signed in with a profile goes to `/app`, everyone else sees the current landing. `DECIDED` (Eric 2026-09-09). Login is Google only for now; the Kakao button is greyed out (준비 중) on both `/login` and `/register` until the provider is set up. Email code stays as the fallback (`ASSUMED`: Eric said "just Google for now" about Kakao; email code already works and is the path when a company blocks Google). |
| D7 | Week 1 to 3 data entry | Eric 2026-09-09: Phase 2 ships before cohort 1, and learners fill the Week 1 to 3 forms in the app during lessons, so nothing is imported. Consequence: Phase 2 also needs a minimal staff cohort view for the Week 3 countersign, so cohort 1 does not wait for the Phase 3 backoffice. `DECIDED`. |
| D8 | Resource entries language | UI in Korean. Entries ship in Korean, drafted by me from the English library in batches for Eric's review. Phase 1 ships the A3 short list (taught and mentioned tools, about 35 entries) and the 22-term glossary in Korean; the long tail follows in batches of 15 per the library's own loop. `DECIDED` (Eric 2026-09-09), with one condition: the Korean must be native and fluent, not translated. See §6.5 and the Korean copy standard in §8. |

---

## 1. Scope

**In**
- `/app` layout with five bottom tabs: 프로필 · 코스 · 나의 AI 교육 · 리소스 · 커뮤니티.
- `/login` for returning users (Google live; Kakao greyed out 준비 중; email code as fallback). An account with no
  profile row is sent to `/start` so the gate rule holds.
- Registration form (name, company, title) shown once after auth, before the
  profile seeds. Existing consent screen unchanged.
- 프로필 tab: identity, survey summary from `core`, track and depth flag, a
  학습 데이터 section that renders whatever exists (survey only in Phase 1; Work
  Map, baseline slots visibly reserved), consent status, sign out.
- 리소스 tab: 도구 라이브러리 with filters, 용어집, 이번 분기 도구 스택.
- Migration `0004_app_phase1.sql`: profile columns, `staff`, event visibility,
  `tools`, `glossary`, RLS. Everything Phase 2 and 3 need, so they add UI only.
- Palette token swap.
- Smart root entry.

**Out (named so nobody expects them)**
- Courses, 나의 AI 교육 content, Work Map editor, time log entry, harness
  storage UI, Discourse SSO: Phase 2.
- Backoffice and instructor notes UI: Phase 3. Week 3 countersign: a minimal staff view in Phase 2 (D7). No paper import anywhere.
- One-pager stays at `/report` until Phase 2 moves it.
- Resource link verification script: separate task, not Phase 1.
- Org table and org_code validation: still the Phase 4/5 B2B items.

---

## 2. Routes and screens

| Route | Kind | Behaviour |
|---|---|---|
| `/` | server | If session and profile exist, redirect to `/app/profile`. Otherwise the existing landing. |
| `/login` | client | Returning-user sign in. Google, greyed-out Kakao, email code, same as `/register`. After auth: profile exists → `/app/profile`; no profile → `/start` with a one-line notice (진단을 먼저 완료해 주세요). |
| `/auth/callback` | route | Unchanged for the register flow. Gains a `next` query param so login can return to `/app`. |
| `/register` | client | Existing steps plus a new `details` step between auth and `finalize`: 표시 이름 (required), 회사명, 직함. The OAuth callback lands on `?step=details` instead of `?step=finalize`; the email-code path moves to `details` after the code is accepted. `finalize` seeds the profile with the three fields and logs a `registered` event. |
| `/app` | layout | Auth guard (server). Bottom tab bar, mobile first. Redirects to `/app/profile`. |
| `/app/profile` | server + small client bits | See §4. |
| `/app/resources` | server + client filter | See §6. |
| `/app/courses`, `/app/education`, `/app/community` | server | Greyed-out tab content with a 준비 중 sticker, no dates. |

Signed-out access to any `/app/*` route redirects to `/login`.

---

## 3. Auth for returning users

- `supabaseServer()` already reads the session from cookies. `/app/layout.tsx`
  calls `auth.getUser()` and reads `user_profile` by `user_id`.
- Email code, Google, and Kakao all exist in `/register`; `/login` reuses the
  same calls with `redirectTo` pointing at `/auth/callback?next=/app`.
- Kakao is not set up in Supabase. Both `/login` and `/register` render the
  Kakao button disabled with a 준비 중 sticker; the OAuth call stays in code
  behind a `NEXT_PUBLIC_AUTH_KAKAO=1` flag so enabling it is a config change.

---

## 4. Profile tab

Sections, top to bottom, all Korean 존댓말:

1. Identity card: 표시 이름, 회사명 · 직함 if given, email, sign-in method.
2. 진단 요약: path, track (from `TRACKS`), depth flag as a plain sentence,
   survey date, and the top three task categories by hours from `core`.
3. 학습 데이터: one card per artifact class with state text.
   - 워크맵: "1주차 수업에서 만들어져요" until a `work_map` exists.
   - 기준선: "3주차에 확정돼요" until `baseline` exists.
   - 하네스 라이브러리: "2주차부터 쌓여요".
   In Phase 1 all three show the waiting state. The component reads the real
   columns so Phase 2 only has to write data.
4. 동의 현황: consent version and date, marketing consent toggle (this is the
   one editable field on the page besides the identity fields).
5. 계정: edit 표시 이름 · 회사명 · 직함, sign out, and a link to the deletion
   request (mailto for now; the deletion procedure is still Eric's open item).

What the profile page never does: read `survey_response` directly (no select
policy exists, by design), or offer any way to edit `core`.

---

## 5. Data model changes (`supabase/migrations/0004_app_phase1.sql`)

### 5.1 `user_profile` new columns

| Column | Type | Written by | Notes |
|---|---|---|---|
| `display_name` | text | registration form, profile edit | Required at registration; reused as the community name later. |
| `company_name` | text null | same | Free text. B2B invitees get the org record later. |
| `job_title` | text null | same | |
| `work_map` | jsonb null | Phase 2 server function | Latest Work Map snapshot, shape in §5.4. |
| `learning` | jsonb null | Phase 2 | `{ assistant, blocked_tools[], path, workspace_ready, style?, level? }`. `style` and `level` reserved for the student curriculum. |
| `baseline` | jsonb null | Phase 2 | Latest locked baseline form, shape in §5.4. |

Learners can update only `display_name`, `company_name`, `job_title`, and
`marketing_consent` through the app. Enforced with column-level grants, not a
trigger: `revoke update on public.user_profile from authenticated; grant
update (display_name, company_name, job_title, marketing_consent, updated_at)
on public.user_profile to authenticated;`. The derived columns are then
writable only by the service role, which is what Phase 2's server functions
use. (First draft of this plan proposed a trigger; grants are simpler and
cannot be bypassed by a policy mistake.)

### 5.2 `staff`

```sql
create table public.staff (
  email text primary key,
  role text not null check (role in ('admin', 'instructor')),
  added_at timestamptz not null default now()
);
-- RLS on, no policies: only the service role and the SQL editor touch it.
create function public.staff_role() returns text
  language sql stable security definer set search_path = public as $$
  select role from public.staff
  where email = lower(coalesce(auth.jwt() ->> 'email', ''))
$$;
```

Seed rows: `eric@diiant.com` as admin is the placeholder Eric gave 2026-09-09; Ted's row is added when Eric sends the emails. Stored lower-case.
Note: `auth.jwt() ->> 'email'` is
present for Google and email-code sign-ins. Kakao only supplies an email when
the Kakao app has the email scope approved, so staff sign in with Google or
email code.

### 5.3 Staff access (Eric, 2026-09-09: instructors have full access)

Staff (admin and instructor) read every learner's profile and every event.
The only thing hidden from a learner is an instructor's note about them.

```sql
alter table public.profile_event
  add column visibility text not null default 'learner'
  check (visibility in ('learner', 'staff'));   -- 'staff' = staff-only
create policy profile_event_select_staff on public.profile_event for select
  to authenticated using (public.staff_role() is not null);
create policy user_profile_select_staff on public.user_profile for select
  to authenticated using (public.staff_role() is not null);
```

The learner select-own policy gains `and visibility = 'learner'`,
i.e. learners see only `learner` rows. Inserting a `staff` row requires
`staff_role() is not null`. Still append-only: no update or delete policies
anywhere. Cohort scoping (an instructor sees only their cohorts) is not in
Phase 1; it arrives with the cohort table in Phase 2 if Eric wants it.

Consequences owned by Eric, outside this repo: the Week 1 room rule ("your
own work is yours, nobody sees it unless you choose") and the Week 2 "the
harness is private" notes in `docs/curriculum` no longer match the platform.
Inside this repo: the registration consent text gains a line that InnovLabs
instructors and staff access learning data for course operation (수집 목적:
과정 운영 및 지도), and the consent version bumps.

### 5.4 Event type catalog (documented in `src/lib/profile/events.ts`, not a DB enum)

Derived from the spine session plans. The `data` payload carries the full
artifact; the profile columns hold the latest derived snapshot.

| Type | Week | Visibility | Payload (summary) | Writer |
|---|---|---|---|---|
| `survey_completed`, `track_assigned`, `track_overridden` | 0 | learner | existing | app (exists) |
| `registered` | 0 | learner | `{ fields: [...] }` | app, Phase 1 |
| `enrolled` | 0 | learner | `{ cohort_id, track }` | Phase 2 |
| `work_map_submitted` | 1 | learner | `{ version, categories: [{ id, label, hours_survey }], rows: [{ category, task, hours, kind: 'P' \| 'T' }], totals: { p_hours, t_hours }, candidates: [{ task_row, scores: { recurs, digital_inputs, stable_rules, ownership, low_cost_wrong }, total, rank }] }` | Phase 2 |
| `drill_completed` | 1 | learner | `{ differences_count, invention_found, whats_left_for_human }` (outputs themselves stay off the platform) | Phase 2 |
| `time_log_entry` | 1+ | learner | `{ task, method: 'before' \| 'harness' \| 'pipeline', started_at, ended_at, interruptions, evidence_ref }` | Phase 2 |
| `harness_saved` | 2+ | learner | `{ harness_id, version, doc_type, parts: { role, context, format, rules[], example_ref, fallbacks } }`, rules capped at 10 by validation | Phase 2 |
| `correction_logged` | 2+ | learner | `{ harness_id, original, changed_to, recurring, rule_written }` | Phase 2 |
| `blueprint_submitted` | 3 | learner | `{ task, stages: [{ order, name, kind, actor: 'assistant' \| 'human' \| 'assistant_checked', needs }], checkpoints: [{ after_stage, checks[] }], trigger, delivery }` | Phase 2 |
| `baseline_locked` | 3 | learner | `{ task, current_method_stages[], minutes_per_instance, frequency, evidence_ref, quality_checklist: [4..6 lines], signed_at }` | Phase 2 |
| `baseline_countersigned` | 3 | learner | `{ by_staff_email, at }` | Phase 3 |
| `instructor_note` | any | staff | `{ note }` | Phase 3 |
| `lab_completed`, `checkin` | any | learner | `{ week, ... }` | Phase 2 |
| `capstone_measured` | 11 | learner | `{ before: { minutes, evidence_ref }, after: { minutes, evidence_ref }, checklist_scores }` | Phase 2 or 3 |

Evidence files (screenshots, outputs) are references to Supabase Storage
objects in a per-user bucket path; the bucket and its policies are Phase 2.

### 5.5 `tools` and `glossary`

```sql
create table public.tools (
  id text primary key,                 -- slug, stable across batches
  name text not null,
  url text,                            -- null only while status = 'draft'
  category text not null,
  tags text[] not null default '{}',
  difficulty smallint not null check (difficulty between 1 and 4),
  status text not null check (status in ('taught','mentioned','reference','draft')),
  paths text[] not null default '{}',  -- 'browser', 'agent'
  tracks text[] not null default '{}', -- track ids where it appears, empty = all
  license text, cost text,
  what_it_is text not null, use_it_to text, why_it_matters text, watch_out text,
  korean_notes text,
  stars int, stars_dated date, last_verified date,
  sort_order int not null default 0
);
create table public.glossary (
  id text primary key, term text not null, loanword text,
  analogy text not null, meaning text not null, sort_order int not null default 0
);
```

RLS: select for `authenticated` where `status <> 'draft'`; no insert, update,
or delete policies (the seed script uses the service role key locally). Text
columns hold the Korean copy; the English working draft stays in
`docs/curriculum` as the source.

---

## 6. Resources tab

### 6.0 D2 options (Eric asked for pros and cons, 2026-09-09)

Where the ~180 library entries and the glossary live, and who edits them.

| | A. Files in the repo | B. Supabase tables, seeded from repo JSON | C. Supabase tables, edited in the backoffice |
|---|---|---|---|
| Source of truth | JSON or markdown in git | JSON in git; the tables are a copy | The tables; git holds only the migration |
| Edit path | Eric or I edit the file, commit, deploy | Same, plus one seed command | A form in `/admin` (Phase 3) |
| Review | Git diff, one file per batch | Git diff, same | No diff; changes are live on save |
| Filtering and search | Client-side over a static JSON, fine at 180 entries | SQL, fine at any size | Same as B |
| Monthly verify job (stars, last_verified, dead links) | Script rewrites the JSON and commits | Script writes the tables, and the JSON goes stale unless it also commits | Script writes the tables, nothing else to keep in sync |
| Newsletter feed of new entries and status changes | Read the git log | Query the tables | Query the tables |
| Korean and English | Two files or two fields | Two column sets | Two column sets |
| Ships in | Phase 1 (fastest) | Phase 1 | Phase 3, or Phase 1 read-only with a temporary seed |
| Risk | Content edits need a deploy; the library doc's own plan says Supabase | Two sources of truth after the first backoffice edit | Nothing reviewable in git; a bad edit is live |

Recommendation: **B now, becoming C at Phase 3.** The handoff rule is written
down in advance: the day the backoffice can edit an entry, the JSON files are
deleted and the tables are the only source of truth. Until then every content
change is a reviewable commit, which suits the batch review loop in the
library doc. The verify job is written against the tables in either case, so
it survives the handoff.

If Eric prefers zero database work in Phase 1, option A is honest and fast,
and moving to C later is a one-time import. What I would not do is keep A
past Phase 3: the library doc's maintenance loop, the newsletter feed, and the
backoffice all want the tables.

Not an option: a Notion or Google Sheet as the source. It adds a sync job and
a second login to a stack that CLAUDE.md fixes as Next plus Supabase.

Three sub-views, tabs at the top of the page:

1. **도구 라이브러리.** List of `tools` cards in the v0.3 entry format
   (name, difficulty badge, category chips, what it is, use it to, why it
   matters, watch out, license and cost, link). Filters: 난이도 (L1 to L4),
   분류, 상태 (taught 수업에서 다룸 / mentioned 소개 / reference 참고). Default
   order: the learner's own path first (from `depth_flag`), then tools tagged
   with the learner's track, then `sort_order`.
2. **용어집.** The 22 terms from v0.3 Part 9, each as analogy plus one sentence,
   with the loanword flag rendered where the doc marks it.
3. **이번 분기 도구 스택.** The A3 tables (browser path and agent path) as a
   static Korean page dated 2026-09 with the three cost levels. Rendered from
   `content/resources/stack.json`, no DB.

Content pipeline:
- `content/resources/tools.json`, `glossary.json`, `stack.json` in the repo.
- `scripts/seed-resources.ts`, run locally with `SUPABASE_SECRET_KEY`, upserts
  by id. Never runs in the browser or in the container.
- Phase 1 batch: every tool named in A3 (browser and agent picks, alternates,
  and the "open source" catalog rows) plus the Anthropic, OpenAI, Google, and
  infrastructure entries from v0.1 §2. About 35 entries, Korean, in the v0.3
  format, marked with their A3 status. Everything else stays in the docs until
  its batch.
- 템플릿 (harness library SP-HL-01 to 03) is not in Phase 1: the templates do
  not exist yet. The tab shows no placeholder for it; it appears when built.

### 6.5 Korean entries

Each entry is written in Korean from the English source's meaning, in the v0.3
four-line format, to the standard in §8 rule 1. Tool names stay in Latin
letters; glossary terms carry the loanword where the doc flags one (토큰, 스타).
Eric reviews on the rendered 리소스 tab in a preview build, batch by batch.

Rule check: no entry ships without a working link, star counts carry a date,
and nothing is described as taught unless A3 says so. Several A3 entries still
carry "verify repo URL" (OpenClaw, Hermes, Paperclip, Open Deep Research,
AutoAgent, MiroFish, BettaFish). During the build I verify each link in the
browser; anything I cannot confirm is seeded with `status = 'draft'`, which the
select policy hides, and listed in the findings for Eric.

Track tags use the curriculum codes (DOC, RES, DAT, SAL, CON, MGT, SMB), with
a small map to the app's six track ids in `src/lib/survey/tracks.ts`. SMB has
no app track today; its entries surface for `depth_flag = 'full_agent'`.

---

## 7. Visual tokens

`src/app/globals.css` `:root` becomes:

```
--background: #FFF9F0 (paper)   --nb-ink: #000000
--nb-yellow: #FFDE21            --nb-pink: #FF4D8D
--nb-lime: #B8FF29 (new)        --nb-cyan: #00E0FF (new)
--nb-purple removed → mapped to --nb-cyan where used
--nb-teal removed → mapped to --nb-lime where used
--nb-pink-deep kept for text-on-paper contrast (#FF4D8D fails AA as small text)
```

Component classes keep 2px borders and 4px shadows. Cards on the app shell
use the 6px shadow from the site for the larger surfaces. Lime and cyan are
fills only, never text on paper. I grep every `--nb-purple` and `--nb-teal`
usage during the build and re-check the survey screens on a phone viewport.

---

## 8. Rules check against CLAUDE.md and the spec

| Rule | How Phase 1 keeps it |
|---|---|
| 1 Korean 존댓말 | All new strings Korean; code and comments English. Korean copy standard (Eric 2026-09-09, after the landing read as literal translation): written from intent, never from an English draft; no 당신, no noun-stacked or passive sentences carried over from English, no literal idioms; rhythm a Korean 직장인 would say aloud; 합니다체 outward, 해요체 where the app is conversational; 저희 for InnovLabs; Korean workplace words (주간보고, 결재, 팀장님) over generic ones. Every screen gets a read-aloud self-check before review, and Eric reviews copy on a rendered preview, not in JSON. |
| 2 Immutable survey response | Untouched. Nothing new reads or writes it. |
| 2 Profile event append-only | Visibility column added; still no update or delete policy. |
| 3 Gate after survey | `/login` sends no-profile accounts to `/start`; `/register` still blocks without a local response. |
| 4 LLM slots | No LLM calls in Phase 1. |
| 5 B2B privacy wall | Staff reads gated by `staff_role()` and cohort-signal consent. No aggregates yet, so the min-group rule does not apply until Phase 5. |
| 6 Solo and student stubs | Unchanged. |
| 7 schema_version and path | Unchanged. |
| P14 private by default | Overridden by Eric 2026-09-09: staff read all learner data. Learner-to-learner privacy still holds (no learner reads another). Instructor notes stay staff-only. |

---

## 9. Build order (small commits)

1. Migration 0004 and `src/lib/profile/events.ts` (types and catalog).
2. Token swap and a visual pass on the existing survey screens, plus a Korean copy pass on every existing app screen (landing, fork, survey, teaser, register, report) against the standard in §8. Eric flagged the landing as literal translation.
3. `/app` layout, tab bar, placeholders, auth guard, smart root.
4. `/login` and the callback `next` param.
5. Registration `details` step and seed changes.
6. Profile tab.
7. Resources content files (Korean drafts) and the seed script.
8. Resources tab.

Each step is one commit. After step 8: self-review of code and the rendered
app on a phone viewport, findings list, then deploy steps, then stop.

---

## 10. Self-review plan (after the build)

- Sign-in matrix: new user via survey; returning user with profile; account
  with no profile; signed-out hit on `/app/*`.
- RLS proof from the SQL editor as a learner JWT and as a staff JWT: learner
  cannot read `staff`, cannot read `staff`-visibility events, cannot update
  `work_map`, cannot read another learner's profile; staff can read every profile and event.
- Phone viewport screenshots of every tab and the survey after the token swap.
- `npm run lint` and `npm run build` clean.
- Deploy: `git pull && docker compose up -d --build` on the droplet, migration
  0004 pasted into the SQL editor first, seed script run once from my machine.

---

## 11. Critical review of this plan (before Eric reads it)

- **It is big.** Eight build steps, one migration, two real tabs, a login
  flow, a token swap, and 35 Korean content entries. Eric asked for one step at
  a time. Recommendation: split into Phase 1a (steps 1 to 6: schema, tokens,
  shell, login, registration, profile) and Phase 1b (steps 7 to 8: resources
  content and tab). 1a is reviewable on the phone in one sitting; 1b is mostly
  Korean copy review. This file stays the spec for both.
- **Resources behind login.** The library docs describe a platform toolkit
  page, and the funnel rule puts everything after the survey. But a public
  tool library is also the cheapest marketing asset the company has. Phase 1
  keeps it behind login; opening it later is a policy change, not a rebuild.
- **The schema is ahead of the UI on purpose.** Phase 2 and 3 should add
  screens, not migrations. The risk is designing payloads the Week 1 to 3
  screens then want to change. Mitigation: payload shapes live in one TS file
  with a `version` field on every event, and the derived profile columns are
  rebuilt from events, so a shape change is a re-derivation, not a data loss.
- **Kakao is unverified.** Handled by the env flag in §3.
- **Deletion procedure is still missing.** The profile page links a mailto.
  The anonymous `survey_response` deletion question from the drift audit is
  still Eric's.

## 12. Decisions from the 2026-09-09 review rounds

- Instructors have full read access to learner data. Harness text stored in
  full, staff-readable; no separate cohort-signal consent; the registration
  consent text names staff access.
- D3 to D8 as recorded in §0. Staff seed placeholder `eric@diiant.com`; Ted's
  email to come.
- **Split: Phase 1a then 1b** (Eric: "up to you"). 1a = build steps 1 to 6.
  1b = steps 7 to 8. Each ends with its own self-review and deploy.
- **Resources behind login** (Eric leaned that way, asked for a view; mine
  agrees). Reasons: the library is the reward for finishing the survey and
  registering, its ordering needs the profile's track and path, and public
  content before the verification pass invites copying of unverified entries.
  Revisit once the Korean library passes 100 verified entries: then the
  glossary and a top-20 list can go public on the marketing site as a lead
  magnet while the full library stays in the app.
- **"Default password admin" (Eric, mid-review).** There is no password auth
  anywhere in the stack; staff sign in with Google or email code and the
  `staff` table decides access. A default password on a backoffice that shows
  every learner's data would be a real hole, so the plan does not add one to
  production. What it does add, in Phase 3: a dev-only bypass (`NODE_ENV !==
  'production'` and an env flag) that signs in as the placeholder admin on a
  local build, so the backoffice can be reviewed without an OAuth round trip.
  If Eric meant something else by "default pw admin", say so in review.

## 13. Still open

1. D1: name required, company and title optional, no phone. Yes or change.
2. Ted's email and confirmation of Eric's.
3. (Closed) Cohort 1 date: Eric, 2026-09-09: "phase 2 will exist before cohort 1, period." Sequencing is fixed as 1a → 1b → 2 → cohort 1; no date needed to size Phase 2.

## 14. Phase 1a findings (fresh-context review, 2026-09-10)

Verdict was "ship with fixes". Every item below is fixed in the working tree
unless marked deferred.

| # | Finding | Status |
|---|---|---|
| 1.1 | Migration 0004 would have broken the one-pager cache write (`authenticated` may no longer update `one_pager`), so every `/report` view would pay a Claude call. | Fixed: cache write moves to a service-role client (`src/lib/supabase/admin.ts`). Needs `SUPABASE_SECRET_KEY` in the droplet `.env`; without it the report still renders, just uncached. |
| 1.2 | Derived columns were learner-writable at INSERT time. | Fixed: column-level INSERT grant in 0004. |
| 1.3 | A learner could forge `enrolled`, `baseline_countersigned`, `instructor_note` events. | Fixed: type guard in the insert policy, mirrored as `STAFF_WRITTEN_EVENTS` in `events.ts`. |
| 1.4 | `revoke ... from public` left the anon EXECUTE on `staff_role()`; policy relied on OR short-circuit. | Fixed: CASE in the policy, explicit revoke from anon, `search_path` on the trigger function. |
| 2.1 | `NEXT_PUBLIC_AUTH_KAKAO` was not plumbed through Docker. | Fixed: build arg in Dockerfile and compose. |
| 2.2 | 리소스 tab looked live while its page is a placeholder. | Fixed: greyed with 준비 중 until 1b. |
| 2.3 | Re-consent by an existing account left no record. | Fixed: `consent_given` event on the existing-row path. |
| 2.4 | "진단일" showed the registration date. | Fixed: labelled 등록일. |
| 2.5, §4 | Register copy leftovers and 14 strings that read translated. | Fixed: all applied. |
| 2.6 | `one_pager_generated`, `course_waitlist_joined` missing from the catalog. | Fixed. |
| 3.1 | Proxy matcher skipped the survey pages while the root layout reads the session there; stale refresh tokens could be revoked mid-survey. | Fixed: matcher covers every non-static route. |
| 3.2 | Header kept "로그인" after client-side sign-in. | Fixed: `router.refresh()` before push. |
| 3.3 | Signed-in no-profile accounts were asked to sign in twice. | Fixed: consent step skips to details when a session exists. |
| 3.4 | Double padding on the profile tab. | Fixed. |
| 3.5 | `x-forwarded-host` not set by nginx. | Fixed in `deploy/nginx.conf`; the live droplet config must be updated by hand (see deploy steps). |
| 3.6 | Sign-out accepted cross-origin POSTs. | Fixed: origin check, 403. |
| 3.7 | `getSession()` ran twice per app page. | Fixed: `React.cache()`. |
| 3.8 | A retaken survey is dropped silently for an account that already has a profile. | Deferred to Phase 2 (needs a product decision: allow a re-diagnosis or not). Immutability holds either way. |
| 3.9 | `/login` shown to signed-in users; header link for no-profile accounts led to a bounce. | Fixed. |
| 3.10 | `TRACKS[profile.track]` had no guard against an unknown track id. | Fixed. |
| 5 | No link to the privacy policy from the consent screen. | Fixed: link to `NEXT_PUBLIC_SITE_URL/privacy` when the site URL is configured. |

Accepted trade-off noted by the reviewer: the login page reveals whether an
email is registered (the "no account" message). Standard for OTP flows.

Not yet verified, blocked on a signed-in session: the sign-in matrix for
accounts with and without a profile, the Google round-trip, the profile tab
on real data, the edit form, and the RLS proof with a learner JWT and a staff
JWT. Everything signed-out passed on a 375px viewport with no console errors.

## 15. Deploy steps for 1a (run in this order)

1. Supabase SQL editor: paste `supabase/migrations/0004_app_phase1.sql`.
   Do this only together with step 3; the old register page's upsert fails
   after the grant change.
2. Droplet `/opt/funnel/.env`: add `SUPABASE_SECRET_KEY=<service role key>`
   (server-only). Optional: `NEXT_PUBLIC_SITE_URL=<marketing site url>`.
3. Droplet: `cd /opt/funnel && git pull && docker compose up -d --build`.
4. Reverse proxy in front of port 3100: add `X-Forwarded-Host $host` (see
   `deploy/nginx.conf`) if it is not already forwarded.
5. Smoke test on the review URL: `/` signed out, `/login`, `/app` bounce,
   one Google sign-in, `/app/profile`.

## 16. Deployed 2026-09-10 (review droplet) and post-deploy findings

Applied migrations 0003, 0004, 0005 to the Supabase project; droplet rebuilt
from `6b9567a`+; service role key added to the droplet env. Two build failures
on the way, both fixed and committed: npm 10 in the image could not read the
npm 11 lockfile (image now installs npm 11), and Windows npm had dropped
Linux-only optional packages from the lockfile (regenerated on Linux, as
once before in this repo's history).

Signed-in matrix, run with disposable accounts from `scripts/test-session.ts`
on a 375px viewport: profile tab with real data, identity edit and marketing
toggle persisted with `profile_updated` events, 리소스 placeholder with
sticker, `/login` and `/` redirect a signed-in account to the profile,
sign-out clears the cookie and restores the pink 로그인 button, an account with
no profile lands on `/start?reason=no_profile` with the notice and the header
button follows it there. All pass.

RLS proof (SQL, as learner / staff / anon): learner sees only own profile,
cannot read `staff`, cannot update `work_map` (permission denied), cannot
insert staff-visibility or staff-written events; staff reads every profile
and event; instructor notes invisible to the learner; anonymous survey events
allowed, anonymous forgery refused. Two of these failed on 0004 and are fixed
by **0005**: Postgres checks function EXECUTE when a policy expression is
initialised, so any anon policy that mentions `staff_role()` fails outright
(a CASE does not help), and the 0004 policy also blocked staff from writing
about other users. 0005 splits the insert policy by role.

Still to verify by a human: one Google sign-in on the review URL. Deferred
to Phase 2: 3.8 (retaken survey).
