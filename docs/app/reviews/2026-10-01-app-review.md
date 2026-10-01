# App review, 2026-10-01 (fresh context)

Reviewer built none of this. Scope: the application at commit `f84bb5d` (main)
and what https://app.innovlab.me serves today (build dated 2026-09-22), plus
robots, sitemap, and headers on https://innovlab.me. Phase 2 files that other
agents are writing right now (`0007_courses.sql`, `src/lib/courses`,
`src/app/api/{cohort,drafts,artifacts,staff}`, `src/components/{courses,lab,staff}`)
were not reviewed. Line numbers refer to `f84bb5d`; `TabBar.tsx`,
`app/profile/page.tsx`, and `app/courses/page.tsx` are being edited in the
working tree and may have shifted.

Items already found and fixed in `phase-1.md` §14–17 and `phase-hagwon.md`
§Findings are not repeated. Two deferred items from those lists are referenced
where they now block something (3.8 retaken survey, account deletion).

## How this was checked, and what could not be

- Read: CLAUDE.md, `survey_schema_v1_1.md`, hagwon schema v0.2, the phase files,
  migrations 0001–0006, every file under `src/` at HEAD, Docker and deploy files.
- Ran: `npx tsc --noEmit` (clean), `npm run lint` (clean).
- Live: GET on 15 app routes and 8 site routes (headers, HTML), downloaded the 16
  JS chunks the signed-out pages load and searched them for secrets.
- **Read-only SQL was not possible.** `scripts/db.ts` fails with
  `tenant/user postgres.cvlkjhglyggqfzdemzbg not found`, and the project's API
  host does not resolve (see P0-1). So nothing below is confirmed against
  `pg_policies` or `role_table_grants`; the RLS analysis is from the migration
  files read together. Re-run the two catalog queries once the database is back.
- Not exercised: anything behind a sign-in, any POST, any device test. Findings
  that depend on those are marked **verify**.

Checked and found clean, so nobody re-checks: no secret in the client bundle
(only the publishable key and the project URL); no `update`/`delete` path to
`survey_response` anywhere in `src/`; `package-lock.json` at HEAD still carries
the Linux and musl optional packages; the employee question set, option lists,
routing rules, manager gate, and depth flag match `survey_schema_v1_1.md`; the
`next` parameter on `/auth/callback` is validated correctly; static chunks are
served immutable with gzip.

---

## P0: must fix before real learners use it

### P0-1 [Ops/Data] The Supabase project the live site talks to does not exist in DNS

- Where: live bundle (`https://cvlkjhglyggqfzdemzbg.supabase.co` is inlined in
  `/_next/static/chunks/2pby_2-5lligy.js`); `scripts/db.ts`.
- What: `cvlkjhglyggqfzdemzbg.supabase.co` and `db.cvlkjhglyggqfzdemzbg.supabase.co`
  return NXDOMAIN from KT, Google (8.8.8.8 and DoH), and Cloudflare, checked at
  07:26 and again at 07:33 UTC on 2026-10-01. The pooler answers "tenant/user
  not found". That combination is what a paused (free tier, 7 idle days; last
  deploy was 2026-09-22) or deleted project looks like.
- Failure scenario, happening now: a visitor finishes the 10-minute survey, the
  `survey_response` insert fails silently (`remote.ts:40`), the teaser renders
  from sessionStorage, they tap 구글로 계속하기 and land on a browser DNS error
  page for the Supabase host; with email they get "인증 메일을 보내지 못했어요".
  Nobody can register or log in, the answers die with the tab, the marketing
  site's inquiry form returns 500, and no one was alerted. The Phase 2 agents
  cannot apply 0007 either.
- Fix: restore the project in the Supabase dashboard today, move it to a plan
  that does not auto-pause, and add an uptime check on a `/api/health` route
  that does one Supabase read (see P1-27). If the project ref changed, rebuild
  the image: the URL is baked in at build time.

### P0-2 [Correctness, rule 4] The one-pager's "curriculum facts" are placeholders, and they contradict the real course

- Where: `content/tracks/*.md:1-2` (all six files open with
  `<!-- PLACEHOLDER CURRICULUM — replace every fact below ... before the pilot -->`
  and describe a "4주 구성"); consumed by `src/lib/onepager/generate.ts:42-45,96-97`.
- What: Slot 2 is the one slot that must be factual. It is generated from an
  invented four-week outline, while the actual program is twelve weeks (spine
  Weeks 1–3, track Weeks 4–12; `phase-2.md` P3/P9), the report's own heading
  says "3개월 뒤 기대할 수 있는 변화", and `content/resources/tools.json:517`
  refers to "리서치 트랙 5주 차". The result is cached on the profile forever
  (`route.ts:39`), so every report generated so far carries it.
- Failure scenario: a learner reads "4주차: 나만의 문서 파이프라인 완성 (캡스톤)"
  in their report, enrolls, opens the 코스 tab Phase 2 is building, and sees a
  12-week timeline whose Week 4 is something else. The first artifact the
  product hands them is wrong about the product.
- Fix: write the six fact sheets from `docs/curriculum` (spine W1–W3 plus the
  track weeks that are decided; say "준비 중" for the rest), then null
  `one_pager` on existing rows so they regenerate. Until then, render Slot 2
  from a static list and skip the LLM for it.

### P0-3 [Correctness, rule 4] Slot 2 is free-form: the model writes the week numbers and titles

- Where: `generate.ts:85-90` (the JSON contract asks the model for `week` and
  `title`), `:107-121` (the parser checks only that `weeks` is an array).
- What: "template with constrained slots, never free-form" and "Slot 2 reads
  only from static track fact sheet files" are enforced by a sentence in the
  prompt. Nothing checks that a returned week exists in the fact sheet, that
  the title matches it, or that each item has the three fields. A malformed
  item (`connection` as an object) crashes `OnePagerView.tsx:52-58` at render.
- Failure scenario: the model merges two weeks or adds "5주차: 심화" for a
  motivated respondent; it is cached and shown as curriculum.
- Fix: parse the fact sheet into `{week, title}[]` in code, ask the model only
  for `connection` keyed by week, and reject any week not in the list.

### P0-4 [Security/Cost] Any registered account can make the server spend without limit on the Claude API

- Where: `src/app/api/one-pager/route.ts:48-62` (no attempt counter, no lock),
  `generate.ts:53-67` (free text from `core` goes into the prompt uncapped),
  `0004_app_phase1.sql:33-37` (the learner inserts their own `core`, any size).
- What: the cache only stops repeat calls after a success. A failed generation
  costs up to two model calls and stores nothing, so it can be repeated
  forever. `core` is written by the browser, so its text fields can be hundreds
  of kilobytes (Sonnet 5 has a 1M context) and can contain an instruction that
  makes the Slot 3 guard fail twice on purpose.
- Failure scenario: someone registers with a throwaway email, inserts a profile
  whose `mirror_text` is 300k tokens ending in "outcome에 '보장'을 꼭 넣으세요",
  and loops `POST /api/one-pager` from 50 tabs. Each request is about $1 of
  input and never caches. The same loop also happens by accident whenever
  `SUPABASE_SECRET_KEY` is missing (`route.ts:66-69`), because then nothing is
  ever cached.
- Fix: slice every free-text field to 1,000 characters in `buildPrompt`, claim
  the generation atomically (`update ... set one_pager_generated_at = now()
  where one_pager_generated_at is null` before calling the model), refuse after
  three failed attempts per user, and set a monthly spend limit on the API key.

### P0-5 [UX/Registration] The main sign-in button fails inside KakaoTalk and other in-app browsers, and the fallback loses the survey (verify on one phone)

- Where: `src/app/register/page.tsx:290-322` (Google is the only live OAuth
  button), `:323-343` (Kakao disabled), `:344-354` (email is a small grey text
  link); no user-agent handling anywhere in `src/`.
- What: Google refuses OAuth in embedded webviews (`403 disallowed_useragent`).
  A link shared in KakaoTalk, Naver, or Instagram opens in exactly such a
  webview, which is how a Korean office worker will most often arrive. The
  survey lives only in that tab's sessionStorage, so "open in Chrome" starts
  from zero.
- Failure scenario: 10 minutes of answers, teaser, 구글로 계속하기, a Google
  error page in English. Back button returns to the consent step. The one path
  that works is the grey "이메일로 계속하기" link under a greyed-out Kakao button.
- Also verify: the email path depends on SMTP settings that are not in this
  repo. Supabase's built-in mailer is capped at a few messages per hour and, on
  recent projects, delivers only to the project's own team addresses. If custom
  SMTP is not configured, the email door is closed to real learners too.
- Fix: detect `KAKAOTALK|NAVER|Instagram|FBAN|Line` in the user agent on
  `/register` and show email code as the primary button there (or hand off to
  the external browser with the saved `survey_response` id in the URL and
  rehydrate from it server-side); confirm custom SMTP; get Kakao login live,
  since it is the one provider that works inside KakaoTalk.

---

## P1: fix this phase

### Security and data

**P1-1. Anyone with the public key can write unlimited rows to four tables.**
`0001_init.sql:27-30` (`survey_response`), `:122-125` (`waitlist`),
`0003_inquiry.sql:23-26` (`inquiry`), `0005:18-25` (`profile_event`, anon) all
use `with check (true)` or close to it, with no size or type limit on the jsonb
columns. Scenario: a script posts 1 MB `answers` objects to
`/rest/v1/survey_response` until the database hits its size cap and goes
read-only; or fills `inquiry` with junk so real leads are buried. Fix: add
`check (pg_column_size(answers) < 20000)`-style constraints, whitelist the anon
event types (`fork_selected`, `survey_completed`, `track_assigned`,
`stub_completed`), and move `inquiry` writes to the service role (next item).

**P1-2. The inquiry endpoint's origin allowlist does not block anything.**
`src/app/api/inquiry/route.ts:45-46` computes `origin` and then continues
whether or not it matched; the allowlist only decides which CORS header is
echoed. `req.json()` (`:57`) parses a `text/plain` body, so a cross-site
"simple request" needs no preflight. And the route inserts with the anon key
(`:85-91`), which every browser already has, so the route can be skipped
entirely. The rate limit counts only successful inserts (`:100-101`), never
evicts keys, and trusts the first `X-Forwarded-For` entry (`:48`), which the
repo's `deploy/nginx.conf:15` lets the client set. Scenario: a competitor's
page silently submits inquiries from each of its visitors' IPs. Fix: return
403 when `allowedOrigin()` is null, require `Content-Type: application/json`,
insert with `supabaseAdmin()`, drop the `inquiry_insert` policy, and remove the
hard-coded fallback origin `http://165.245.186.254:8080` (`:19`).

**P1-3. The profile, the track, and the scoring are whatever the browser says.**
`src/lib/survey/remote.ts:178-193` inserts `user_profile` from sessionStorage
(`core: local.answers`, `track`, `depth_flag`, `org_code`), and the stored
`survey_response.scoring` was computed in the browser too. `user_profile.track`
has no check constraint (`0001_init.sql:45`). Scenario: the "immutable
baseline" and the profile disagree and nobody can tell which is true; a
learner sets `org_code` to another company's code and lands in its Phase 5
aggregate; a bad `track` value makes `education/page.tsx:91` throw. Fix: one
server route `POST /api/register` that reads the `survey_response` row by id
with the service role, recomputes scoring on the server, and inserts the
profile; then revoke INSERT on `user_profile` from `authenticated` and add
`check (track in (...))`.

**P1-4. Learners can forge the artifact events Phase 2 is about to trust.**
`0005_event_insert_policies.sql:27-37` blocks three types and allows every
other one, including `work_map_submitted`, `baseline_locked`, `lab_completed`,
and `capstone_measured`. `phase-1.md` §11 says profile snapshots are rebuilt
from events. Scenario: a learner posts a `capstone_measured` row with invented
before/after minutes straight to PostgREST; it bypasses the Work Map rules in
`phase-2.md` P7 and ends up in numbers the company quotes. Fix: flip the policy
to a whitelist of what a learner may write (`fork_selected`, `survey_completed`,
`track_assigned`, `registered`, `consent_given`, `profile_updated`,
`course_waitlist_joined`, `consult_requested`); everything else service role.

**P1-5. Staff access hangs on an email string in the JWT, and the admin email is in a public repo (verify auth settings).**
`0004_app_phase1.sql:65` seeds `eric@diiant.com`; `:69-76` grants staff rights
to whoever's token carries a matching email, with no check that the address
was confirmed; the staff table is "keyed by email so a row can exist before
the person has ever signed in" (`:52`). `scripts/test-session.ts:108` shows
password sign-in is enabled on the project. Scenario: Ted's row is added
before he signs in; if "Confirm email" is off (or is turned off later to
debug the mailer), anyone calls `auth.signUp({ email: ted's, password })` and
reads every learner's profile and events. Fix: inside `staff_role()` join
`auth.users` and require `email_confirmed_at is not null`, store the user id
on the staff row at first sign-in and match on that afterwards, and confirm
"Confirm email" is on.

**P1-6. No security headers on the app; auth cookies likely lack `Secure` (verify).**
Live response headers on every app route: no `Strict-Transport-Security`, no
`X-Frame-Options` or `frame-ancestors`, no `X-Content-Type-Options`, no
`Referrer-Policy`, no CSP, and `X-Powered-By: Next.js`. `@supabase/ssr` sets
its cookies readable by script and, by default, without `Secure`
(`src/lib/supabase/server.ts`, `src/proxy.ts` pass no `cookieOptions`).
Scenario: on café Wi-Fi a learner types `app.innovlab.me`; the first request
goes out over HTTP with the session cookies before the 308. Fix: add a
`headers()` block in `next.config.ts` (HSTS, `X-Frame-Options: DENY`, nosniff,
`Referrer-Policy: strict-origin-when-cross-origin`), `poweredByHeader: false`,
and `cookieOptions: { secure: true }` on both server clients.

**P1-7. Account deletion and consent withdrawal are a mailto to a personal address, with no procedure behind it.**
`src/app/app/profile/page.tsx:17,42` (`eric@diiant.com`, marked placeholder).
Deleting the auth user cascades the profile but leaves `survey_response`
(free text about the person's work, `org_dept`, `org_team`) and every
`profile_event` row (`0001_init.sql:84`, `on delete set null`). The consent
screen promises "언제든지 열람·정정·삭제를 요청하실 수 있으며" and a retention
of "삭제를 요청하실 때까지" (`register/page.tsx:229-233`). Scenario: a B2B
learner on a phone with no mail app taps 삭제 요청 and nothing happens; or the
request arrives and nobody knows which rows to remove. Fix: a 계정 삭제 button
that calls a server route (service role: delete the user, the linked
`survey_response`, and null the event payloads), and decide in writing that a
legal deletion outranks rule 2's immutability.

**P1-8. The stub waitlist bundles newsletter consent into a required checkbox.**
`src/components/survey/StubFlow.tsx:150-161`: one box, "(필수)", covering both
the launch notice and "AI 활용 소식(뉴스레터)"; `remote.ts:87` then records
`newsletter_consent: true` for everyone. Marketing consent has to be separate
and optional (개인정보보호법 §22, 정보통신망법 §50). Scenario: the first
newsletter goes to people who could not have declined it. Fix: two boxes;
launch notice required, newsletter optional, store what was ticked.

### Correctness

**P1-9. Slot 3's guard covers one slot and one word list.**
`generate.ts:30,145-155`. Only `outcome` is tested; `closing` (the aspirational
slot) and `mirror` are not. The regex misses 장담, 약속드립니다, 완전히, 확실한,
and any bare number. Nothing checks that a range or a measurement phrase is
present, which is what "range + measurement framing only" means. The prompt's
own example "30~50% 수준" (`:76`) will be copied as if it were data, and Q18's
option text ("문서 작업 시간 절반으로", "완전히 자동화") is fed in verbatim
(`:64`). Scenario: "3개월 뒤에는 문서 작업 시간이 절반으로 줄어듭니다" passes.
Fix: run the banned list over all four slots, require `\d+\s*[~–-]\s*\d+` plus
one of 기록|측정|비교 in `outcome`, and replace the 30~50% example with a
placeholder that cannot be copied.

**P1-10. The model call will intermittently fail on its own settings.**
`generate.ts:131-137`: no `thinking` parameter (on `claude-sonnet-5` that means
adaptive thinking is on and its tokens count against `max_tokens: 4096`), no
`stop_reason` check, and JSON is dug out with `indexOf("{")`. Scenario: a long
think leaves 800 tokens for the answer, the JSON is cut, `JSON.parse` throws,
the learner sees "잠시 연결이 원활하지 않았어요", retries, and pays again
(feeds P0-4). Fix: `thinking: { type: "disabled" }`, `max_tokens: 8000`,
structured output via `output_config.format`, and treat `stop_reason !==
"end_turn"` as a failure.

**P1-11. Prompt caching is still missing (the drift audit's item stands).**
`generate.ts:135`: `system` is a plain string, there is no `cache_control`
anywhere, and the only large static block, the fact sheet, sits in the user
turn next to the per-user answers (`:93-102`). Even with a marker, today's
system prompt alone is under Sonnet 5's 1,024-token minimum and would not
cache. Honest sizing: about 1.5k input tokens per report at $2/MTok, so this
saves a fraction of a cent per report and matters only when a cohort registers
in the same five minutes. Fix: `system: [{rules}, {fact sheet,
cache_control: { type: "ephemeral" }}]`, user turn = answers only; do it when
P0-2 makes the fact sheets real and longer.

**P1-12. Fork clicks, the demand data the spec asks for, never leave the browser.**
`src/app/start/page.tsx:54` calls `appendEvent` (sessionStorage) and nothing
else. The spec: "Fork click volume is itself demand data: it decides which
path gets built second." Auto-assigned tracks have the same gap
(`SurveyFlow.tsx:172-179` logs `survey_completed` remotely but `track_assigned`
only locally), so about 80% of track assignments are missing from
`profile_event`. Scenario: Eric asks how many people tapped 내 사업을 하고
있어요 and the only number is completed waitlist rows. Fix: `void
logEventRemote("fork_selected", { path })` in `go()`, and one for the auto
assignment.

**P1-13. A failed baseline write is invisible, and the profile is created without it.**
`remote.ts:40,43-45` return null on any error; `:172` proceeds with
`survey_response_id: null`. `logEventRemote` (`:58-74`) swallows everything.
Scenario: Supabase hiccups at survey end and again at registration; the
learner gets a profile, a report, and no baseline row, and nothing in the
database says so. Fix: block the profile insert until the response row exists
(retry with a visible "저장 중" state), and return a boolean from
`logEventRemote`.

**P1-14. Success messages that are shown without a successful write.**
`src/components/report/WaitlistCta.tsx:14-19` awaits a function that cannot
fail and then shows "대기 등록이 완료됐어요". The state is not persisted, so
after a reload the button is back and each tap adds another event. Today, with
the database unreachable, every tap would report success. Fix: check the
insert result, and render the done state from the event log on the server the
way `HagwonEducation.tsx:51-57` does for the consult request.

**P1-15. Nobody is told when a lead arrives.**
`0003_inquiry.sql:3-4`: "the team reads rows in the dashboard". The marketing
form, the 학원 30분 진단 상담 (`ConsultCta.tsx:77-88`, "신청을 받았습니다. 확인
후 연락드리겠습니다."), the stub waitlists, and the course waitlist all end in
a row that no person is notified about. Scenario: a 원장 requests a consult on
Friday; it is found the next time someone opens the Supabase table editor.
Fix: a database webhook on `inquiry` insert to email or Slack; a daily digest
for the waitlists.

**P1-16. The Q5 A/B pilot is confounded and unassigned.**
The sequential variant renders eight consecutive screens with the identical
bold title and the only changing text, the task name, as a small grey subtitle
(`SurveyFlow.tsx:203-216`, `:289-290`). Assignment is by hand-built link or a
build-time env var that is not in `.env.example` or the Dockerfile args
(`src/app/survey/page.tsx:10`). Scenario: sequential shows more drop-off and
the pilot concludes "grid wins" when the cause was eight screens that look
frozen. Fix: make the task label the `h1` in the seq variant and randomise the
variant per session when no `?q5=` is given (it is already stored on the row).

**P1-17. No tests on the logic that assigns a track or a module.**
`src/lib/survey/scoring.ts` and `src/lib/hagwon/scoring.ts` are pure functions
with no test file in the repo and no test script in `package.json`. Scenario:
a Phase 2 refactor of `CLUSTER_TRACK` shifts every borderline respondent and
nothing fails. Fix: a dozen table-driven cases per file (gate on/off, 1.5×
boundary, Q6 = g, all zeros; M5 re-gate, consult-first, 분기별) under `node --test`.

### UX on a 375px phone

**P1-18. A signed-out returning user who opens the report is told to retake the survey.**
`src/app/report/page.tsx:43-47` sends signed-out visitors to `/register`,
which, with no survey in this tab, shows "먼저 진단을 완료해 주세요" and a
button to `/start` (`register/page.tsx:194-206`). Login is never offered.
Scenario: a learner opens their bookmarked report on a new phone, retakes the
10-minute survey, signs in, and the new answers are silently dropped
(deferred item 3.8) while the old report appears. Fix: `/report` signed out
goes to `/login`; the blocked screen gets "이미 등록하셨나요? 로그인".

**P1-19. iOS zooms the page on every text field.**
All inputs use `text-[15px]` (`survey/inputs.tsx:115`, `register/page.tsx:394,
488, 506, 517`, `login/page.tsx:179`, `ToolLibrary.tsx:114,140`,
`ConsultCta.tsx:131`). Safari on iPhone zooms when a focused input is under
16px and does not zoom back. Scenario: Q8's textarea zooms, the page now
scrolls sideways, and the 다음 button is off-screen. Fix: `text-base` on
`.nb-input`.

**P1-20. No loading, error, or not-found UI anywhere, and the defaults are English.**
There is no `loading.tsx`, `error.tsx`, `global-error.tsx`, or `not-found.tsx`
under `src/app`. Live: `https://app.innovlab.me/anything` returns "404 / This
page could not be found." (rule 1). A thrown error in a server component
(`resources/queries.ts:23,33` throw on any Supabase error) shows Next's
English "Application error". Tab switches render nothing until the server
answers. Fix: Korean `not-found.tsx` and `error.tsx` at the root, and
`src/app/app/loading.tsx` with a skeleton.

**P1-21. Every signed-in page view makes three sequential trips to Supabase before it paints.**
`src/proxy.ts:39` (`getUser`, network), then `src/app/layout.tsx:41` →
`session.ts:24` (`getUser` again), then `:27-34` (profile and `staff_role`).
The root layout reading cookies also makes every route dynamic: the live
landing page is served `Cache-Control: private, no-store` with a 0.36–0.48 s
TTFB for what is static HTML. The bottom tab bar's five links add prefetches
that each run the proxy. Fix: verify the JWT locally with `getClaims()` in the
proxy, pass the result down in a request header, and move the header's
session-dependent link into a small client island so `/`, `/start`, `/survey`,
`/hagwon` can be static.

**P1-22. First paint waits on a third-party stylesheet import.**
`src/app/globals.css:1` imports Pretendard from `cdn.jsdelivr.net`; the live
CSS begins with that `@import`. It is a render-blocking chain (app CSS, then
jsDelivr CSS, then font files). Scenario: on a corporate network that blocks
or throttles the CDN, the page stays blank until the request times out. The
marketing site already self-hosts the same font (`/fonts/PretendardVariable-*.woff2`).
Fix: `next/font/local` with the two woff2 files.

**P1-23. The resources tab renders all 254 tools as full cards.**
`ToolLibrary.tsx:197-203`, `ToolCard.tsx:71-105`: four paragraphs, badges, a
note, and a button per tool, under a filter block that fills the first screen.
The learner's own tools are sorted first but nothing is collapsed or paged.
Scenario: a learner looking for the tool from tonight's class scrolls through
roughly a hundred screens or has to know to search. Fix: default the status
filter to 수업에서 다룸, show name plus one line per card with tap to expand,
and render 30 at a time.

**P1-24. The report page is the end of the funnel and has no way forward.**
`src/app/report/page.tsx:82-87`: report, then the waitlist button, then
nothing. `/report` is outside the `/app` layout, so there is no tab bar; the
only exit is the small 내 프로필 button in the header. Fix: after the CTA, a
full-width "내 학습 공간으로 가기" link to `/app/education`, or redirect
`/report` there now that the tab renders the same report.

### Korean copy

**P1-25. Options written as internal notes, mixed with full sentences, in one survey.**
`src/lib/survey/questions.ts`: Q10 "거의 사용 안 함", "자동화 워크플로우까지
만들어 봄" (`:143-147`); Q12 "자유로움", "승인된 도구만", "제한적 · 눈치 보임",
"잘 모르겠음" (`:172-175`); Q13 "설치 자유로움", "브라우저만 가능" (`:183-186`);
beside Q5-a "아니요, 제 업무에 집중합니다" (`:104`) and the fork's "회사에서
일하고 있어요". The code copied the spec's shorthand as final copy. Suggested:
"거의 쓰지 않아요", "자동화 워크플로우까지 만들어 봤어요", "자유롭게 쓸 수
있어요", "승인된 도구만 쓸 수 있어요", "제한적이고 눈치가 보여요", "잘
모르겠어요", "프로그램을 자유롭게 설치할 수 있어요", "브라우저만 쓸 수 있어요".
This needs a spec edit (v1.2), since the spec wins.

**P1-26. Statements that promise something the product does not do, or state an outcome as fact.**
- `src/app/teaser/page.tsx:74` "나중에 바꿀 수 있어요." There is no screen that
  changes a track and `track_overridden` is never written. → "수업 전에 강사와
  상의해 바꿀 수 있어요." (if that is true) or delete the sentence.
- `teaser/page.tsx:94` "잘 모르겠어요, 추천에 맡길게요" assigns 문서·행정 even
  when it is neither of the two tracks shown. → assign the higher-scoring of
  the two, or say "잘 모르겠어요. 문서·행정 트랙으로 시작할게요".
- `src/lib/survey/tracks.ts:27` "…제작 속도를 끌어올립니다." and `:31` "…AI로
  가볍게 만듭니다." are outcomes stated as fact, against the file's own header
  comment. → "…AI 워크플로우로 바꾸는 법을 익힙니다.", "…AI로 가볍게 만드는
  법을 배웁니다."
- `src/lib/hagwon/modules.ts:32` "광고 규제에 걸리는 표현은 걸러 줍니다." is an
  absolute claim about legal compliance. → "광고 규제에 걸릴 만한 표현을 표시해
  드립니다. 최종 확인은 원장님 몫입니다."
- `src/components/report/ReportError.tsx:13` "준비되는 대로 이메일로
  알려드릴게요." Nothing sends that email. → "조금 뒤에 다시 열어 주세요."
- `src/app/page.tsx:110` and `StubFlow.tsx:83` "지금은 직장인 진단만 열려
  있습니다 / 있어요": the 학원 path is live. → "지금은 직장인과 학원 진단이 열려
  있습니다"; add 학원 to the "누가 받을 수 있나요?" list (`page.tsx:263-294`).
- `src/app/page.tsx:58` "질문 19개": the counter reads 1/20 (grid) or 1/27
  (sequential). → "질문 20개 안팎".
- `src/app/page.tsx:302-310` "조직 리포트를 드립니다": Phase 5 is not built. →
  "조직 리포트를 준비하고 있습니다" until it exists.

### Operations

**P1-27. No health check, no monitoring, no alert.**
`Dockerfile` has no `HEALTHCHECK`, `docker-compose.yml` no `healthcheck`,
`/api/health` is a 404 on the live site, and nothing reports errors (the only
logging is `console.error` in two routes). P0-1 went unnoticed for this
reason. Fix: `/api/health` (process up plus one Supabase read), a compose
healthcheck on it, a free external uptime monitor, and Sentry or equivalent.

**P1-28. A fresh deploy following the repo's own instructions is broken in three places.**
`deploy/DEPLOY.md:15` lists three env vars. Missing `SUPABASE_SECRET_KEY`
(commented out in `.env.example:5`): reports are never cached (P0-4). Missing
`INQUIRY_ALLOWED_ORIGINS`: the fallback is the old review IP
(`inquiry/route.ts:19`) and the site form fails CORS. Missing
`NEXT_PUBLIC_SUPABASE_URL` at build: compose passes an empty build arg
(`docker-compose.yml:6`), the build succeeds, and every client call throws at
runtime (`supabase/client.ts:11-12` use `!`). Fix: a `prebuild` script that
exits non-zero when a required variable is empty, and list all six in
`.env.example` and DEPLOY.md.

**P1-29. Production is not what the repo describes.**
The live proxy is Caddy (`Via: 1.1 Caddy`); the repo ships `deploy/nginx.conf`.
Compose publishes `127.0.0.1:3000` (`docker-compose.yml:13`); the phase notes
and the site's deploy script say the app is on 3100. `README.md` is the
untouched create-next-app text that says to deploy on Vercel. Scenario: the
droplet is lost and the rebuild from the repo does not come up the way it was.
Fix: commit the Caddyfile and the compose file actually in use, delete
`nginx.conf` or mark it unused, rewrite README in ten lines.

**P1-30. The lockfile rule lives only in a phase note, and there is no CI.**
`phase-1.md` §16 records two build failures from a Windows-written lockfile.
Nothing enforces it: no `.github/`, no check script, and Phase 2 agents are
adding code on Windows today. `Dockerfile:7` also installs an unpinned
`npm@11` from the network on every build. Fix: a GitHub Action that runs
`docker build` (which runs `npm ci` on Linux), `tsc`, and `eslint` on every
push; pin `npm@11.6.2`; add the rule to AGENTS.md.

**P1-31. The baseline data sits in one database with no stated backup.**
`survey_response` is "THE baseline" and insert-only, and the project behaves
like a free-tier one (P0-1), which has no point-in-time recovery. Test
accounts and QA responses go into the same project (`scripts/test-session.ts`).
Fix: paid plan with daily backups, a weekly `pg_dump` off-site, and a separate
project for testing.

---

## P2: later

### Security and data

- **P2-1.** `survey_response` immutability is a convention: no update or delete
  policy for API roles, but no trigger either, so the service role and the SQL
  editor can rewrite it. Fix: a `before update or delete` trigger that raises.
- **P2-2.** Supabase's default grants leave `anon` and `authenticated` with
  TRUNCATE, REFERENCES, TRIGGER on every public table; unreachable through
  PostgREST today, but revoke them (`revoke all ... from anon`, then grant back
  what the policies need). Confirm with `role_table_grants` once SQL works.
- **P2-3.** `waitlist` unique index (`0001:127-128`) lets anyone learn whether
  an address is on the list from the 23505 response. Fix: insert through a
  route that always answers the same.
- **P2-4.** `consented_at` is the browser's clock at seeding
  (`remote.ts:187`), not when the box was ticked (`storage.ts` keeps
  `agreedAt` and never uses it) and not the server's time. Fix: `default now()`
  on the server insert.
- **P2-5.** `scripts/db.ts:44` connects with `rejectUnauthorized: false`, and
  `:45` is outside the `try`, so a connection failure prints a stack trace.
  Fix: verify the certificate; move `connect()` inside the `try`.
- **P2-6.** Before Phase 5: the org aggregate must count verified members, not
  rows. With `org_code` free text on both `survey_response` and `user_profile`,
  an org admin can add four fake responses to a one-person team to pass the
  n ≥ 5 rule and subtract them. Fix: signed invite tokens and aggregates over
  registered profiles only.
- **P2-7.** The stub paths store answers in `waitlist.answers` with no
  `schema_version` (rule 7 covers "every survey response"). Fix: add the column.
- **P2-8.** `tools` and `glossary` are readable by any authenticated account,
  and an account needs no profile (email code creates one). If "behind the
  survey" is the intent, the policy should require a profile row.
- **P2-9.** The privacy policy says Supabase's servers are in "미국 등"; the
  pooler host is `ap-southeast-1` (Singapore). Fix the text when the project
  is restored and its region is confirmed.

### Correctness

- **P2-10.** `education/page.tsx:91` indexes `TRACKS[...]` without the guard
  line 84 has. Fix: reuse the guarded lookup.
- **P2-11.** Two concurrent `POST /api/one-pager` (the tab and `/report` open
  together) both generate; last write wins. Solved by the atomic claim in P0-4.
- **P2-12.** `SurveyFlow.tsx:74` discards the draft when `?org=` or `?q5=`
  differs from the saved one, and `:138` goes back to `/start` without the
  query string. A partner-link respondent who taps ← on question 1 and
  re-enters loses the org tag and their answers. Fix: keep the params in the
  draft and restore them.
- **P2-13.** Nothing clears sessionStorage after registration or sign-out
  (`storage.ts` has no clear for the response). On a shared device the next
  person is sent to the previous person's teaser and would register with their
  answers. Fix: clear the five keys on the `done` step and on sign-out.
- **P2-14.** Q8 (marked M-critical in the spec) accepts a single character
  (`SurveyFlow.tsx:119`), and no text field has a `maxLength`. Fix: a soft
  minimum of 20 characters with a nudge, a hard maximum of 1,000.
- **P2-15.** 학원 Q4: an item already ranked is removed from the other two
  screens (`HagwonFlow.tsx:416`), so a 원장 who goes back to make their second
  choice first cannot find it, and the swap logic at `:287-290` is unreachable.
  Fix: show taken items with their rank and let a tap move them.
- **P2-16.** 학원 Q6b and Q8b are required even when Q6a is "성적표를 보내지
  않습니다" or Q8a is "올리지 않습니다", and Q8b "원장이 직접" still adds 2
  friction points to M3 for an academy that posts nothing. Raise for schema v0.3.
- **P2-17.** `claude-sonnet-5` is the previous Sonnet; `claude-sonnet-5-5` is
  the same price. Not urgent; decide when touching P1-10.

### UX

- **P2-18.** Every funnel screen is `min-h-dvh` under a 58px header
  (`SurveyFlow.tsx:260`, `register/page.tsx:577`, `teaser/page.tsx:110`), so
  each one scrolls by the header's height and the bottom button is clipped by
  about 18px. Fix: `min-h-[calc(100dvh-58px)]`, or make `body` the flex column
  and the screen `flex-1`.
- **P2-19.** The phone's back button leaves the survey or the register flow
  entirely, because steps are component state. The draft survives, the consent
  ticks and the typed email do not. Fix: push a history entry per step.
- **P2-20.** `HourGrid.tsx:36`: 5 targets per row at roughly 59×34px, under
  the 44px guideline; the disabled 다음 gives no hint which of eight rows is
  missing. Fix: `py-3`, and mark unanswered rows on a blocked tap.
- **P2-21.** The 나의 AI 교육 tab puts the full report above 학습 데이터
  (`education/page.tsx:136-204`). Once labs exist, a learner scrolls past the
  report every time. Fix: collapse the report to its title after the first view.
- **P2-22.** The header logo links to the marketing site from inside `/app`
  and mid-survey (`Logo.tsx:35`). Fix: `/app/education` when signed in.
- **P2-23.** `ConsultCta.tsx:81` writes a phone number into `inquiry.email`
  when the account has no email, and `HagwonEducation.tsx:97-98` says "알려
  주시기 바랍니다" without saying where. Fix: a `contact` column; a mailto or
  Kakao channel link.
- **P2-24.** Single-select options have no `role="radio"` or `aria-pressed`
  (`survey/inputs.tsx:24-35`); the grid does. Fix: copy the grid's attributes.
- **P2-25.** 학원 two-part screens auto-advance as soon as both parts have a
  value (`HagwonFlow.tsx:280-284`), so returning to change the second answer
  after touching the first jumps forward. Fix: auto-advance only on the first
  completion of a screen.

### Korean copy

- **P2-26.** "경로" as a translation of "path": "지금 내 경로에 맞는 것부터"
  (`resources/page.tsx:32`), "브라우저 경로", "에이전트·서버 경로", "내 경로만
  보기" (`ToolLibrary.tsx:24-27,174`). It reads as a file path. → "내 환경",
  "브라우저만 쓰는 환경", "설치할 수 있는 환경", "내 환경에 맞는 도구만 보기".
- **P2-27.** The 학원 survey mixes endings: "모두 골라 주세요", "첫 번째로 골라
  주세요", "하나만 골라 주세요" (`hagwon/questions.ts:141,147,163`) against
  "적어 주십시오" (`:165`) and "다시 시도해 주시기 바랍니다"
  (`ConsultCta.tsx:148`). Pick one: "골라 주십시오".
- **P2-28.** The run of "-ㅂ니까?" titles reads like a form at a government
  counter: "설문에 답하시는 분은 누구입니까?", "어떤 학원입니까?", "담당은
  누구입니까?" (`hagwon/questions.ts:140,141,161`). Formal and warm:
  "답해 주시는 분을 알려 주십시오.", "어떤 학원을 운영하십니까?", "누가
  맡고 계십니까?". Also `register/page.tsx:472` "어떻게 불러드리면
  되겠습니까?" → "어떻게 불러 드리면 좋겠습니까?".
- **P2-29.** A 원장 reads 합니다체 through the survey, result, and consult
  request, then 해요체 on the profile tab ("탭에서 볼 수 있어요",
  `profile/page.tsx:67`), the placeholders, and the resources tab. Either
  branch those strings on `path` or accept it in writing.
- **P2-30.** `HourGrid.tsx:9,21`: the helper says "거의 없음 … 10시간 이상",
  the buttons say "0" and "10+". → "없음", "10↑" or the full labels at 11px.
- **P2-31.** "리소스" as a tab name is developer vocabulary. → "자료실".
  (Eric named the tabs; his call.)
- **P2-32.** `education/page.tsx:40` "에이전트·서버 과정까지 함께 진행할 수
  있어요" uses terms the learner has not met yet. → "프로그램을 설치해서 쓰는
  도구까지 함께 다룰 수 있어요."

### Operations

- **P2-33.** `https://app.innovlab.me/robots.txt` and `/sitemap.xml` are 404,
  and no page carries `noindex` or a canonical. `/login`, `/register`,
  `/report`, `/teaser`, `/solo` are indexable. Fix: `src/app/robots.ts`
  allowing `/` and `/start`, disallowing the rest; `metadata.robots` noindex
  on the flow pages.
- **P2-34.** `https://innovlab.me/privacy` (the URL the consent screen links
  to, `register/page.tsx:33-35`) answers `301 Location: http://innovlab.me/privacy/`,
  an HTTP hop before Caddy upgrades it again. Fix: link with the trailing
  slash and set `absolute_redirect off` in the site's nginx.
- **P2-35.** The marketing site sends `X-Content-Type-Options` only: no HSTS,
  no CSP, no `Referrer-Policy`. Its robots.txt and sitemap are correct
  (`sitemap-index.xml` → 14 URLs, ko and en).
- **P2-36.** No Open Graph image or `og:url` on the app
  (`src/app/layout.tsx:18-29`); a KakaoTalk share shows a bare title. The site
  has `og-ko.png`; reuse it.
- **P2-37.** Docker logs have no rotation (`docker-compose.yml`), and the base
  image is `node:22-alpine` by tag, not digest. Fix: `logging` options; pin.
- **P2-38.** `public/` still holds the create-next-app SVGs; the repo root has
  an untracked duplicate of `docs/product/hagwon_survey_schema_v0.2.md`.
  Delete both.
- **P2-39.** `site/src/config.ts:7,19` and `site/deploy/publish.sh:12,21-24`
  fall back to `http://165.245.186.254:3100`, and the droplet's root SSH target
  is in a public repo. Fix: fail the site build when the two URLs are unset.

---

## The ten fixes to make first, in order

1. **Bring the database back and make sure it cannot vanish quietly again.**
   Restore the Supabase project, move it off the auto-pausing tier, add
   `/api/health` and an external uptime check, rebuild if the ref changed.
   Then run the `pg_policies` and `role_table_grants` queries this review
   could not. (P0-1, P1-27, P1-31)
2. **Replace the placeholder fact sheets and take the week list away from the
   model.** Real 12-week content in `content/tracks`, week numbers and titles
   supplied by code, cached reports cleared. (P0-2, P0-3)
3. **Put a ceiling on one-pager cost and make the call reliable.** Text caps,
   atomic claim, three-attempt limit, thinking off, structured output, spend
   limit on the key. (P0-4, P1-10)
4. **Make registration work where Korean users open links.** In-app browser
   detection with email code first, confirmed SMTP, Kakao login live; test on
   one iPhone and one Android inside KakaoTalk. (P0-5)
5. **Move the writes that matter behind server routes.** Profile seeded on the
   server from the `survey_response` row; `inquiry` inserts by service role
   with a real origin check; anon inserts size-capped and type-whitelisted;
   learner event whitelist before Phase 2's labs ship. (P1-1 to P1-4)
6. **Stop saying "done" when nothing was saved, and tell a person when a lead
   arrives.** Check write results in the waitlist CTA and the survey mirror;
   webhook on `inquiry`. (P1-13, P1-14, P1-15)
7. **Harden staff access and the session.** Confirmed-email check and user-id
   binding in `staff_role()`, security headers, HSTS, secure cookies. (P1-5, P1-6)
8. **Fix the phone basics.** 16px inputs, Korean 404 and error pages, a loading
   state for tabs, `/report` signed-out to `/login`, an exit from `/report`
   into the app, self-hosted font. (P1-18, P1-19, P1-20, P1-22, P1-24)
9. **Tighten the outcome guard and correct the copy that promises.** Guard on
   all four slots with a required range, then the eight strings in P1-26 and
   the note-style options in P1-25 (with a spec v1.2 edit). (P1-9, P1-25, P1-26)
10. **Give the repo an operations floor.** CI that builds the Docker image on
    Linux and runs tsc and eslint, env validation at build, the real Caddy and
    compose files committed, scoring tests, a working account-deletion route.
    (P1-7, P1-17, P1-28, P1-29, P1-30)
