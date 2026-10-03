# Parity checklist before the 시간표 rebrand (2026-10-03)

Every line must survive R0-R4, or be dropped with Eric's OK. Site paths relative to `site/src/`,
app paths relative to `src/`. Counts: site 9 templates (17 built URLs), app 26 page routes + 404,
error, /app loading, 2 auth handlers, robots, 17 API endpoints; about 375 items.

Decide on purpose: `Card.astro` and `SpecTable.astro` are unused; footer Kakao link is `href="#"`;
empty i18n values hide UI (`contact.email`, `contact.kakao`, `privacy.contact_email`,
`home.proof.logos`, `home.proof.testimonials`, `courses.formats.cohort`, `business.services.work`);
the app is Korean only (해요체/합니다체 split on the 학원 path); Nav.astro comment says four links,
it renders five.

## SITE

### Global: layout, meta, i18n
- [ ] `<html lang>` per locale — layouts/Base.astro
- [ ] Per-page title/description; subpages append `· InnovLabs` — pages/*.astro
- [ ] Canonical + hreflang ko/en + x-default (not on 404) — Base.astro
- [ ] OG/Twitter, og-ko.png / og-en.png 1200×630, og:locale — Base.astro, public/
- [ ] `noindex` on stub and 404 — Base.astro
- [ ] theme-color, color-scheme light — Base.astro
- [ ] Favicons: inline SVG, favicon.ico, apple-touch-icon — Base.astro, public/
- [ ] Pretendard preload: latin always, hangul on ko — Base.astro
- [ ] Skip link 본문으로 건너뛰기 → #main — Base.astro, global.css
- [ ] Routing: ko no prefix, en under /en/, trailing slash — astro.config.mjs
- [ ] Sitemap with hreflang, leaves out /students/ — astro.config.mjs
- [ ] Missing i18n key fails the build — i18n/utils.ts
- [ ] ko.json / en.json key parity (256 each) — i18n/
- [ ] Build env APP_URL, LOGIN_URL, INQUIRY_URL — config.ts

### Global: Nav (desktop)
- [ ] Sticky bar, paper background, bottom border — Nav.astro
- [ ] Lockup (LogoTile + wordmark with superscript square) → locale home, aria "InnovLabs 홈" — Nav, LogoTile, Wordmark
- [ ] Five links 홈/과정/플랫폼/기업/소개; section links match subpaths — Nav.astro
- [ ] Active link aria-current with underline; hover underline — Nav.astro
- [ ] 로그인 button → LOGIN_URL — Nav.astro
- [ ] CTA 나의 AI 활용도 진단 → APP_URL — Nav.astro
- [ ] LangToggle in the bar — Nav.astro
- [ ] ≥900px links + tools show, burger hidden — Nav.astro

### Global: Mobile menu
- [ ] Burger <900px; aria-expanded/controls; label 메뉴 열기/닫기 — Nav.astro
- [ ] Full-screen ink overlay, slides down 200ms — Nav.astro
- [ ] Large links; current link marked with text colour + left bar — Nav.astro
- [ ] Overlay tools: CTA, 로그인, LangToggle 44px cells — Nav, LangToggle
- [ ] Opening locks scroll, focuses first link; closing returns focus to burger — Nav.astro
- [ ] Focus trap while open — Nav.astro
- [ ] Escape closes; widening past 900px closes — Nav.astro
- [ ] Visible focus ring on ink — global.css

### Global: Language toggle
- [ ] KO/EN switch to same path in other locale — LangToggle.astro
- [ ] On 404 cells link to locale homes — LangToggle, 404.astro
- [ ] Fill slides toward hovered cell (150ms) — LangToggle.astro
- [ ] lang / hreflang / aria-current; aria-label 언어 — LangToggle.astro

### Global: Footer
- [ ] Ink footer: 4 columns ≥900px, 1 on mobile — Footer.astro
- [ ] Lockup → home (square bordered in paper on ink) — Footer.astro
- [ ] Footer nav 과정/플랫폼/기업/소개 — Footer.astro
- [ ] 문의하기 → /contact; 서울, 대한민국 — Footer.astro
- [ ] 카카오톡 채널 link (placeholder #) — Footer.astro
- [ ] Footnote line with asterisk tile — Footer, Footnote
- [ ] © line + 개인정보 처리방침 → /privacy — Footer.astro
- [ ] 44px tap targets; hover underline — Footer.astro

### Global: Motion and primitives
- [ ] Press hover/active on buttons and clickable cards — global.css (.press)
- [ ] Peel: stickers/photos straighten and lift on hover — global.css (.peel)
- [ ] Hero entrance: fade + rise, stagger — global.css (.enter)
- [ ] prefers-reduced-motion turns everything off — global.css
- [ ] Focus ring + scroll-padding for anchors — global.css
- [ ] Button primary/secondary/ink/pink × sm/md, `<a>` or `<button>` — Button.astro
- [ ] Section bg paper/white/yellow/pink/ink, density, border, pad overrides — Section.astro
- [ ] PageCta: ink section, display headline, body, button → APP_URL, optional link, cropped asterisk — PageCta.astro
- [x] 4 pillar icons profile/knowledge/community/toolkit — clay stills via ClayIcon.astro (R4; the other 4 pixel icons had no users)
- [ ] PhotoFrame rotated, tape strip, initial fallback — PhotoFrame.astro

### Home `/` and `/en/`
- [ ] meta.home title/description — pages/index.astro, en/index.astro
- [ ] Hero: bordered stat strip — home/Hero.astro
- [ ] Hero: H1 with rotated sticker phrase + superscript square — Hero.astro
- [ ] Hero: sub; primary CTA → APP_URL; text link → /business — Hero.astro
- [ ] Hero: StickerBoard (logo tile + 3 stickers) overhanging section 2 — StickerBoard, Sticker
- [ ] Hero: entrance stagger; 7/5 grid ≥900px — Hero, StickerBoard
- [ ] Router: headline + 4 audience cards (1/2/4 columns) — home/Router.astro
- [ ] Router: worker → /courses#tracks — Router.astro
- [ ] Router: student, founder → APP_URL with waitlist note — Router.astro
- [ ] Router: company card not a link; links → /business#training and #development — Router.astro
- [ ] Not: yellow section, headline + sub — home/Not.astro
- [ ] Not: 3 StrikeCards, strike draws once on scroll — StrikeCard, HomePage script
- [ ] Not: "us" card, taller, overhangs; sourced footnote — Not.astro
- [ ] Tracks id=tracks: headline, sub, link → /courses#tracks — home/Tracks.astro
- [ ] Tracks: 3-cell 12-week strip (3/7/2), role=img — Tracks.astro
- [ ] Tracks: 7 chips → /courses#tracks; waitlist chip greyed; note — Tracks.astro
- [ ] Programs: headline + all-courses link — home/Programs.astro
- [ ] Programs: 3 cards irl/online/custom (status, title, body, meta) → /courses; stepped ≥900px; mini flowchart — Programs.astro
- [ ] Platform: headline + body — home/Platform.astro
- [ ] Platform: 5-node Flowchart draws on scroll; vertical on phones — Flowchart.astro
- [ ] Platform: 4 pillars with icons; CTA → APP_URL — Platform.astro
- [ ] Story: PhotoFrame "E" with block breaking upward — home/Story.astro
- [ ] Story: quiet headline, body, link → /about — Story.astro
- [ ] Proof: section, headline, note — home/Proof.astro
- [ ] Proof: 3 NumberTiles sharing one fitted size; first overhangs — Proof, NumberTile
- [ ] Proof: logos/testimonials hidden while empty — Proof.astro
- [ ] Final CTA: ink, display headline, body, CTA → APP_URL, cropped asterisk — home/FinalCta.astro

### Courses
- [ ] Hero: display H1, sub, CTA → APP_URL — pages/CoursesPage.astro
- [ ] Hero: 3 stacked stickers with status tags — CoursesPage
- [ ] Structure: headline, lead, WeekStrip (12 cells + 3 phase labels) — WeekStrip.astro
- [ ] Structure: 3 block cards — CoursesPage
- [ ] Week rhythm: RhythmBar (5 segments by minutes) + legend, draws on scroll — RhythmBar, CoursesPage script
- [ ] Week rhythm: 4 rules — CoursesPage
- [ ] Tracks id=tracks: 7 cards (code, status, name, who); note — CoursesPage
- [ ] Paths: 2 cards with cost label + note — CoursesPage
- [ ] Formats: 4 items with status tags; cohort note hidden while empty — CoursesPage
- [ ] Measure: section headline + body — CoursesPage
- [ ] Instructors: 2 people (PhotoFrame, name, role, bio) — CoursesPage
- [ ] FAQ: 9 `<details>` rows, marker rotates — Faq.astro
- [ ] PageCta + link → /business — CoursesPage

### Platform
- [ ] Hero: H1, sub, CTA — pages/PlatformPage.astro
- [ ] ChangelogWall: 15 label tiles + large logo tile — ChangelogWall.astro
- [ ] Today: live (3) / next (4) columns with tags — PlatformPage
- [ ] Inside: 4 blocks (icon, title, body, bullets) — PlatformPage
- [ ] Onboarding: 5-step Flowchart draws on scroll — Flowchart.astro
- [ ] Brain: section headline/lead + 8-node NodeGraph — NodeGraph.astro
- [ ] Who: quiet headline + lead — PlatformPage
- [ ] PageCta, no secondary link — PlatformPage

### Business
- [ ] Hero: H1, sub, jump buttons → #training, #development — pages/BusinessPage.astro
- [ ] Training id=training: headline, lead, 4-column formats table in scroll wrapper — BusinessPage
- [ ] Training: IT note; 3 outcomes beside 5-step Flowchart — BusinessPage
- [ ] Development id=development: headline, lead, 5 offers, method line — BusinessPage
- [ ] Development: 13 verticals; studio line + https://lumberworks.xyz — BusinessPage
- [ ] Development: work metrics hidden while empty — BusinessPage
- [ ] Team: 2 people — BusinessPage
- [ ] Inquiry id=inquiry: headline + lead — BusinessPage
- [ ] Fields name*, company*, role, email*, interest select (3), team_size, message; maxlength, autocomplete — BusinessPage
- [ ] 필수 marker; honeypot "website" — BusinessPage
- [ ] Consent line + /privacy link — BusinessPage
- [ ] Validation: inline errors after first submit, aria-invalid, clear on fix, focus first invalid — BusinessPage script
- [ ] Submit: JSON POST to INQUIRY_URL with locale; disabled + sending label — BusinessPage script
- [ ] Failure role=alert; button restored — BusinessPage
- [ ] Success: form hidden, sent panel role=status, title focused — BusinessPage
- [ ] No-JS fallback method=post action=INQUIRY_URL — BusinessPage
- [ ] No PageCta on this page — BusinessPage

### About
- [ ] Hero: display H1 — pages/AboutPage.astro
- [ ] Story: PhotoFrame + 4 paragraphs — AboutPage
- [ ] Timeline: 5 milestones, last highlighted — Timeline.astro
- [ ] Beliefs: 5 items numbered 01–05 — AboutPage
- [ ] Team: 2 people (photo, name, role, bio, uses_daily) — AboutPage
- [ ] Asterisk footnote block (LogoTile + headline + body) — AboutPage
- [ ] PageCta + link → /business — AboutPage

### Contact
- [ ] Display H1 + lead — pages/ContactPage.astro
- [ ] Email row: mailto or pending placeholder — ContactPage
- [ ] Kakao row: link or pending — ContactPage
- [ ] Business row → /business#inquiry; location row — ContactPage
- [ ] PageCta reusing platform.final copy with contact.cta — ContactPage

### Privacy
- [ ] Effective date, H1, intro — pages/PrivacyPage.astro
- [ ] 10 numbered sections — PrivacyPage, i18n privacy.sections
- [ ] Section 8 contact: mailto or → /business#inquiry — PrivacyPage
- [ ] No PageCta — PrivacyPage

### Students stub
- [ ] h2 page name only; noindex; not in sitemap; not linked — StubPage.astro, pages/students.astro

### 404
- [ ] One static page for unknown paths — pages/404.astro, deploy/nginx.conf
- [ ] KO block (h1), then EN block (h2, lang=en) — 404.astro
- [ ] Each block: label, title, body; 홈으로 + 과정 보기 + survey CTA — 404.astro
- [ ] noindex, no canonical/hreflang; toggle → homes — Base.astro

## APP

### Global: root layout and chrome
- [ ] lang=ko; Korean copy; no locale toggle — app/layout.tsx
- [ ] Title template "%s | InnovLabs"; default meta; OG og-ko.png; Twitter — layout.tsx
- [ ] themeColor — layout.tsx
- [ ] Pretendard via next/font/local — layout.tsx, app/fonts/
- [ ] icon.svg, favicon.ico, apple-icon.png — app/
- [ ] Skip link → #main — layout.tsx
- [ ] Header: max-w-lg, bottom border, Logo + HeaderAction — layout.tsx
- [ ] Logo: tile + INNOVLABS + square → NEXT_PUBLIC_SITE_URL or / — components/Logo.tsx
- [ ] HeaderAction signed in: 내 프로필 → /app/profile or /start?reason=no_profile — HeaderAction.tsx
- [ ] HeaderAction signed out: 로그인 → /login — HeaderAction.tsx
- [ ] Hidden: 내 프로필 inside /app/*, 로그인 on /register — HeaderAction.tsx
- [ ] #main wrapper (tabIndex -1, flex column) — layout.tsx
- [ ] Session-refresh proxy on all routes — proxy.ts
- [ ] robots.txt disallow list — app/robots.ts

### Global: design classes and motion
- [ ] nb-card, nb-flat, nb-selected — globals.css
- [ ] nb-btn (+primary/white); hover/active; disabled — globals.css
- [ ] nb-input focus, nb-badge, nb-accent, nb-sticker, nb-disabled — globals.css
- [ ] nb-track / nb-fill progress (0.3s) — globals.css
- [ ] 16px minimum on fields; ink checkbox accent — globals.css
- [ ] fade-slide-in (0.5s) and shimmer (1.8s) keyframes — globals.css
- [ ] Palette tokens — globals.css

### Global: /app shell
- [ ] Guard: signed out → /login; staff without profile → /staff; no profile → /start?reason=no_profile — app/app/layout.tsx
- [ ] Content max-w-lg; bottom padding clears tab bar + safe area — app/app/layout.tsx
- [ ] TabBar fixed bottom, 5 tabs with icons 프로필/코스/나의 AI 교육/리소스/커뮤니티 — components/app/TabBar.tsx
- [ ] Active tab: bordered icon pill, extrabold, aria-current (prefix match) — TabBar.tsx
- [ ] 커뮤니티 greyed but tappable with 준비 중 sticker — TabBar.tsx
- [ ] Safe-area inset — TabBar.tsx
- [ ] Loading skeleton with pulse; sr text 화면을 불러오고 있어요 — app/app/loading.tsx
- [ ] /app → /app/profile — app/app/page.tsx
- [ ] PlaceholderCard greyed + 준비 중 — components/app/PlaceholderCard.tsx
- [ ] Row / SectionTitle / formatDate (ko-KR, Asia/Seoul) — components/profile/display.tsx

### Global: 404 and error
- [ ] 404: title, eyebrow, 2-line h1, body — app/not-found.tsx
- [ ] 404 buttons 홈으로 + session-aware second button — not-found.tsx
- [ ] Error: eyebrow, h1, body; 다시 시도하기 — app/error.tsx
- [ ] Error buttons 홈으로 + 내 프로필; digest shown — error.tsx

### `/`
- [ ] Profile → /app/education; else /start with ?org and ?q5 — app/page.tsx

### `/start`
- [ ] Title 진단 시작 — start/page.tsx
- [ ] Profile exists: 이미 진단을 마치셨어요 + CTA → /app/education — start/page.tsx
- [ ] Fork: 2-line h1 + hint — start/ForkScreen.tsx
- [ ] reason=no_profile notice — ForkScreen.tsx
- [ ] Doors 회사 → /survey, 학원 → /hagwon — ForkScreen.tsx
- [ ] Doors 사업 → /solo, 학생 → /student with 준비 중 — ForkScreen.tsx
- [ ] fork_selected logged locally and once per door per tab remotely — ForkScreen.tsx
- [ ] org/q5 passed to /survey only — ForkScreen.tsx

### `/survey`
- [ ] Title; Q5 variant from ?q5, env, then grid; ?org — survey/page.tsx
- [ ] Existing response → /hagwon/result or /teaser — survey/SurveyFlow.tsx
- [ ] Draft autosave/restore — SurveyFlow.tsx, lib/survey/storage.ts
- [ ] Header: back (step 0 → /start keeping org/q5), progress, n/N — SurveyFlow.tsx
- [ ] B2B privacy statement on step 1 with org — SurveyFlow.tsx
- [ ] Section eyebrow, lead, h1, subtitle — SurveyFlow.tsx, lib/survey/questions.ts
- [ ] Step list incl. Q5 grid/seq, qb1–qb2 with org, attribution — lib/survey/flow.ts
- [ ] SingleSelect radios, auto-advance 250ms — survey/inputs.tsx
- [ ] 기타 opens required text field (100) — survey/inputs.tsx
- [ ] MultiSelect with ✓; none exclusive — survey/inputs.tsx
- [ ] TextAnswer (1000), aria-invalid when touched — survey/inputs.tsx
- [ ] Q8 hint under 20 characters — inputs.tsx, SurveyFlow.tsx
- [ ] HourGrid: 5 radios per cluster, skipped-row flag, rows-left count — survey/HourGrid.tsx
- [ ] HourButtons (seq) auto-advance — survey/inputs.tsx
- [ ] 다음 / 결과 보기 disabled until complete — SurveyFlow.tsx
- [ ] 건너뛰기 on optional; scroll to top per step — SurveyFlow.tsx
- [ ] Finish: score, store, events, insert (one retry) → /teaser — SurveyFlow.tsx

### `/hagwon`
- [ ] Title; existing response → result/teaser — hagwon/page.tsx, hagwon/survey/HagwonFlow.tsx
- [ ] Draft autosave/restore — hagwon/survey/draft.ts
- [ ] 15 screens with section eyebrows — HagwonFlow.tsx
- [ ] Header: back, progress, counter — HagwonFlow.tsx
- [ ] ChoiceList, MultiChoice, SubLabel — hagwon/survey/inputs.tsx
- [ ] Auto-advance 250ms when complete — HagwonFlow.tsx
- [ ] q3 program name field (60) + Next — HagwonFlow.tsx
- [ ] q4 rank screens hide picked items — HagwonFlow.tsx
- [ ] q7 second sub-question only for secondary schools — HagwonFlow.tsx
- [ ] q12 textarea (200) with counter; 건너뛰기 — HagwonFlow.tsx
- [ ] Finish: jump to first incomplete, else save → /hagwon/result — HagwonFlow.tsx

### `/hagwon/result`
- [ ] Title; no result → /hagwon; nothing until loaded — hagwon/result/page.tsx, layout.tsx
- [ ] 진단 완료 eyebrow, h1, reliability note for non-directors — result/page.tsx
- [ ] Hours card (range or under-1-hour copy) + top time sinks — result/page.tsx
- [ ] 추천 모듈 cards or consult-first note — result/page.tsx
- [ ] Register pitch + CTA → /register — result/page.tsx

### `/teaser`
- [ ] Title; 학원 → /hagwon/result; none → /start — teaser/page.tsx, layout.tsx
- [ ] Close-score choice: 2 track buttons — teaser/page.tsx
- [ ] Skip 잘 모르겠어요… logs track_assigned — teaser/page.tsx
- [ ] Result: eyebrow, track h1, one-liner — teaser/page.tsx
- [ ] Hours card weekly/yearly (hidden at 0) — teaser/page.tsx
- [ ] Pitch + CTA → /register — teaser/page.tsx

### `/register`
- [ ] Title; profile → /app/education — register/layout.tsx
- [ ] Steps consent/method/email/code/details/finalize/done/blocked/claimed — register/page.tsx
- [ ] Survey source order (local, ?rid, session, 24h backup, stored); ?rid stripped — register/page.tsx, lib/survey/backup.ts
- [ ] Tone 해요체 (employee) / 합니다체 (학원) — register/page.tsx
- [ ] ?step=details|finalize; ?error=auth — register/page.tsx
- [ ] Blocked: h1, body, button → /start or /hagwon, 로그인 — register/page.tsx
- [ ] Claimed: h1, body, sign-out → /login — register/page.tsx
- [ ] Consent notice (items, purpose, retention, rights per path) — register/page.tsx
- [ ] Privacy link in new tab when NEXT_PUBLIC_SITE_URL set — register/page.tsx
- [ ] Required + optional marketing checkbox; button gated — register/page.tsx
- [ ] Method: Google — register/page.tsx
- [ ] Method: Kakao behind flag, else disabled with 준비 중 — register/page.tsx
- [ ] Method: 이메일로 계속하기; error; busy state — register/page.tsx
- [ ] In-app browser variant: notice, email first, Kakao if live, ExternalBrowser — register/page.tsx
- [ ] Email step: input, 인증 코드 받기 (발송 중…), 다른 방법으로 — register/page.tsx
- [ ] Code step: 6-digit field, 확인 (확인 중…), 코드 다시 받기 — register/page.tsx
- [ ] Details: 표시 이름*, 회사명/학원명, 직함; field errors; 등록 마치기 — register/page.tsx, profile/fields.ts
- [ ] Finalize waiting; errors route back — register/page.tsx
- [ ] Done: CTA → /report or /app/education; 내 프로필 보기 — register/page.tsx
- [ ] ExternalBrowser: explainer, open in browser, 주소 복사하기 — register/_lib/ExternalBrowser.tsx
- [ ] ExternalBrowser states copied/manual/failed — ExternalBrowser.tsx
- [ ] In-app detection labels — register/_lib/inapp.ts

### `/login`
- [ ] Title; profile → /app/profile — login/layout.tsx
- [ ] ?next same-origin (default /app/profile); ?error=auth — login/page.tsx
- [ ] h1 다시 오셨네요; first-time hint → /start — login/page.tsx
- [ ] Google, Kakao (flag or 준비 중), 이메일 코드로 로그인하기 — login/page.tsx
- [ ] In-app variant — login/page.tsx
- [ ] Unknown-account box with 진단 시작하기 → /start — login/page.tsx
- [ ] Email input, 인증 코드 받기, 다른 방법으로 로그인하기 — login/page.tsx
- [ ] Code: 6 digits, 로그인 (확인 중…), 코드 다시 받기; refresh → next — login/page.tsx
- [ ] Error lines — login/page.tsx

### `/auth/*`
- [ ] Callback: code exchange → next or /register?step=details; failures → ?error=auth — auth/callback/route.ts
- [ ] Signout: POST same-origin → 303 / — auth/signout/route.ts

### `/report`
- [ ] Title; signed out → /login?next=/report — report/page.tsx, layout.tsx
- [ ] API redirects 401/404/409 — report/page.tsx
- [ ] GeneratingScreen as loading + Suspense fallback; ?preview=loading — report/page.tsx
- [ ] GeneratingScreen: 3 timed steps, shimmer, 길면 30초 정도 걸려요 — report/GeneratingScreen.tsx
- [ ] ReportError (retry hidden for attempt_limit) + link to 나의 AI 교육 — report/ReportError.tsx
- [ ] Ready: fade-in OnePagerView, WaitlistCta, button → /app/education — report/page.tsx
- [ ] OnePagerView: eyebrow, track title, 지금 내 업무, week cards, outcome card, closing; heading level — report/OnePagerView.tsx
- [ ] WaitlistCta states checking/idle/joining/joined/failed — report/WaitlistCta.tsx

### `/solo` and `/student`
- [ ] Titles — solo/layout.tsx, student/layout.tsx
- [ ] Intro: 준비 중, h1, body, 오픈 알림 받기 (1분), 돌아가기 → /start — survey/StubFlow.tsx
- [ ] 2 single-choice screens, back, progress n/3 — StubFlow.tsx
- [ ] Email screen with required + optional consent — StubFlow.tsx
- [ ] Submit gated (신청 중…); failed alert; duplicate = success — StubFlow.tsx
- [ ] Done ✅, h1, body, 처음으로 돌아가기 → / — StubFlow.tsx
- [ ] Option sets per audience — solo/page.tsx, student/page.tsx

### `/app/profile`
- [ ] Title; no profile → /start — app/app/profile/page.tsx
- [ ] Identity card: name, affiliation, 이메일, 로그인 method — profile/page.tsx
- [ ] Staff button → /staff — profile/page.tsx
- [ ] Pointer to 나의 AI 교육 (per path) — profile/page.tsx
- [ ] 동의 현황 version + date — profile/page.tsx
- [ ] MarketingToggle optimistic with revert — profile/MarketingToggle.tsx
- [ ] ProfileEditForm: name*, 회사명/학원명, 직함; save states — profile/ProfileEditForm.tsx
- [ ] 로그아웃 form POST — profile/page.tsx
- [ ] 삭제 요청 mailto — profile/page.tsx

### `/app/courses`
- [ ] Title; 학원 → PlaceholderCard — app/app/courses/page.tsx
- [ ] Enrolled: CohortCard (status, name, 트랙, 일정, 장소, 시작일) — courses/CohortCard.tsx
- [ ] Not enrolled: 내 트랙 card + how-classes-work copy — courses/page.tsx
- [ ] Not enrolled: 수강 코드 등록 with JoinCodeForm — courses/page.tsx
- [ ] JoinCodeForm 6-char field, uppercase, monospace — courses/JoinCodeForm.tsx
- [ ] JoinCodeForm button gating, hints, 5 errors, refresh — JoinCodeForm.tsx
- [ ] Timeline 12주 구성: block headers + note — courses/Timeline.tsx
- [ ] Week rows: n주, title, 이번 주, ✓ or lock (sr 열림/잠김), chevron → week — Timeline.tsx

### `/app/courses/week/[n]`
- [ ] 1–12 else 404; title; 학원 → /app/courses — week/[n]/page.tsx
- [ ] Back link 코스로 돌아가기 — week/[n]/page.tsx
- [ ] Header: n주차, kind badge, 열림/잠김, h1 — week/[n]/page.tsx
- [ ] Objective card; 준비물; 핵심 — week/[n]/page.tsx
- [ ] 실습 cards: number, title, minutes, steps, 완료 기준 — week/[n]/page.tsx
- [ ] Lab button per labHref; continuation note — week/[n]/page.tsx
- [ ] 이번 주 과제 card — week/[n]/page.tsx
- [ ] 아직 사람이 할 일 card — week/[n]/page.tsx
- [ ] LabButton open vs disabled with reason — week/[n]/page.tsx
- [ ] Weeks without content: placeholder cards + note — week/[n]/page.tsx

### `/app/education`
- [ ] Title; employee and 학원 views — app/app/education/page.tsx
- [ ] 진단 요약 card — education/page.tsx
- [ ] Top-3 task-hours list or empty text — education/page.tsx
- [ ] 맞춤 리포트: cached OnePagerView + WaitlistCta, else OnePagerLoader — education/page.tsx
- [ ] OnePagerLoader generating/error/ready — education/OnePagerLoader.tsx
- [ ] DataCard 워크맵 with link — education/page.tsx
- [ ] TimeLogCard — lab/TimeLogCard.tsx
- [ ] 기준선 card or 3주차에 확정해요 — education/page.tsx
- [ ] HarnessLibraryCard — lab/harness/HarnessLibraryCard.tsx
- [ ] Badges 기록됨 / 아직 없음 — education/page.tsx
- [ ] 학원 header card + unreadable fallback — education/HagwonEducation.tsx
- [ ] HagwonResultView: hours heading with 학원 name, sinks, reliability — hagwon/result/HagwonResultView.tsx
- [ ] Module cards (M-id badge, 기출 note) or consult-first — HagwonResultView.tsx
- [ ] 먼저 준비할 것 + 다루지 않는 것 — HagwonResultView.tsx
- [ ] Starter-session card, goal quote, consult explainer — HagwonResultView.tsx
- [ ] ConsultCta: contact field when no email; 30분 진단 상담 신청하기 — hagwon/result/ConsultCta.tsx
- [ ] ConsultCta done card; error — ConsultCta.tsx

### `/app/resources`
- [ ] Title; ?tab tools|glossary|stack; eyebrow, title, purpose — app/app/resources/page.tsx
- [ ] SubViewTabs 3 links, active aria-current — resources/SubViewTabs.tsx
- [ ] LevelSwitch radiogroup with keys, roving tabindex — resources/LevelSwitch.tsx
- [ ] LevelSwitch selected fill + 내 레벨 sticker — LevelSwitch.tsx
- [ ] Search + suggestion chips — resources/ToolLibrary.tsx
- [ ] 필터 button with count — ToolLibrary.tsx
- [ ] Browse: picks heading + reason; 내 레벨로 돌아가기 — ToolLibrary.tsx
- [ ] Browse: 한 단계 위; other tools; 수업 도구만; 더 보기 — ToolLibrary.tsx
- [ ] Results: count, 조건 지우기, reachable first then higher — ToolLibrary.tsx
- [ ] Results: `<mark>` highlight; 더 보기 — ToolLibrary.tsx
- [ ] Empty results — ToolLibrary.tsx
- [ ] Live announcer; focus/scroll restore — ToolLibrary.tsx
- [ ] ToolRow accordion with chevron — resources/ToolCard.tsx
- [ ] ToolDetail fields, stars, notes, 바로 가기 ↗ — ToolCard.tsx
- [ ] FilterSheet `<dialog>` bottom sheet, Esc/backdrop, focus trap, scroll lock — resources/FilterSheet.tsx
- [ ] FilterSheet controls — FilterSheet.tsx
- [ ] Glossary cards + empty state — resources/GlossaryList.tsx
- [ ] Stack: path sentence; 2 sections with 내 경로 — resources/StackView.tsx
- [ ] Stack tables, cost lines, dated note — StackView.tsx

### `/app/community`
- [ ] PlaceholderCard 커뮤니티 — app/app/community/page.tsx

### Labs: shared
- [ ] LabHeader / Week2LabHeader — lab/LabHeader.tsx, lab/harness/Week2LabHeader.tsx
- [ ] Non-employee → /app/courses — app/app/lab/*/page.tsx
- [ ] useDraft autosave with retry and keepalive flush — lab/useDraft.ts
- [ ] SaveStatus states — lab/inputs.tsx
- [ ] HoursStepper, CountStepper, ChoiceGroup, ProblemList — lab/inputs.tsx

### `/app/lab/work-map`
- [ ] Header, confidentiality, submitted-on — app/app/lab/work-map/page.tsx
- [ ] Sticky bar: 3-step nav, totals, SaveStatus, 25–50h guide bar — lab/work-map/WorkMapEditor.tsx
- [ ] ?step deep link, prev/next — WorkMapEditor.tsx
- [ ] Step 1 intro + details; category sections, task rows, add/remove, limits — work-map/StepWrite.tsx
- [ ] Step 2 P/T/M legend, inline edit, split, totals, warnings — work-map/StepClassify.tsx
- [ ] Step 3 candidate toggles (max 3), score cards /15, reorder, remove — work-map/StepCandidates.tsx
- [ ] Submit, failure, ProblemList, visibility note; success panel with links — WorkMapEditor.tsx

### `/app/lab/time-log`
- [ ] Header; prompt → work-map when none — app/app/lab/time-log/page.tsx
- [ ] Form: task, method, start/end with 지금, duration — lab/TimeLogForm.tsx
- [ ] Interruptions; evidence image (5MB, types) — TimeLogForm.tsx
- [ ] Submit states and validation — TimeLogForm.tsx
- [ ] History list with signed evidence links; can't-edit note — time-log/page.tsx

### `/app/lab/drill`
- [ ] Header, instructions, no-upload note, SaveStatus — app/app/lab/drill/page.tsx, lab/DrillForm.tsx
- [ ] Task field + quick chips — DrillForm.tsx
- [ ] Differences min 4, add, remove — DrillForm.tsx
- [ ] Invention textarea; left-for-a-human field — DrillForm.tsx
- [ ] Submit (aria-disabled shows ProblemList), failure, previous note, success → time-log — DrillForm.tsx

### `/app/lab/corrections`
- [ ] Header; empty state → harness — app/app/lab/corrections/page.tsx
- [ ] CorrectionForm — lab/corrections/CorrectionForm.tsx
- [ ] Log grouped per harness — corrections/page.tsx
- [ ] 규칙으로 추가하기; MarkWrittenButton — corrections/page.tsx, MarkWrittenButton.tsx
- [ ] Can't-edit note — corrections/page.tsx

### `/app/lab/harness`
- [ ] Header + privacy line — app/app/lab/harness/page.tsx
- [ ] List: count, SaveStatus, empty, items with version/date — lab/harness/HarnessLibrary.tsx
- [ ] + 새 하네스 (max notice); 수정 기록 열기 — HarnessLibrary.tsx
- [ ] Editor ?h: sticky bar, counts, SaveStatus — HarnessEditor.tsx
- [ ] Name, doc type + preset chips, parts 1–6 — HarnessEditor.tsx
- [ ] RulesEditor add/remove/prefill/suggestion — lab/harness/RulesEditor.tsx
- [ ] HarnessPreview count, warning, `<pre>`, copy fallbacks — lab/harness/HarnessPreview.tsx
- [ ] Save errors/warnings/version; success → corrections; delete unsaved — HarnessEditor.tsx, HarnessLibrary.tsx

### Staff
- [ ] Guard: signed out → /login; not staff → 404 — components/staff/guard.ts
- [ ] Layout: title 운영, max-w-5xl, header links, no tab bar — app/staff/layout.tsx
- [ ] /staff: h1, error, empty, cohort cards with CopyCode and facts — app/staff/page.tsx, staff/CopyCode.tsx
- [ ] NewCohortForm fields and states — staff/NewCohortForm.tsx
- [ ] UI kit Card, Facts, Chip, ScrollTable, Empty — staff/ui.tsx
- [ ] /staff/cohort/[id]: facts, 12 week tiles, OpenWeekControl, StatusControl, EnrollForm, roster table — app/staff/cohort/[id]/page.tsx
- [ ] /staff/learner/[userId]: facts, 진단 응답, WorkMapView, drill, time log with evidence, NoteForm, full record table — app/staff/learner/[userId]/page.tsx

### API endpoints (no visuals; must keep working)
- [ ] /api/one-pager, /api/inquiry, /api/inquiry/consult, /api/register, /api/cohort/join, /api/drafts/[kind], /api/artifacts/*, /api/staff/*, /api/health — app/api/
