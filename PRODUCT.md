# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Lead audience (Eric, 2026-10-03): **학원 원장** (owners and directors of Korean private academies:
유아, 초등, 중등 내신, 고등 입시, 성인·어학, 예체능), often also 실장·부원장. Small businesses of
~30 to 300+ students and 0 to 9+ instructors. They run the academy and teach; their days are taken by
학부모 상담 records, 성적표 and feedback, making 문제·숙제·시험지, blog and Instagram posts, notices,
and chasing absences. They meet InnovLabs on a phone, usually between classes or late at night.

Next, in this order:
1. Office workers (직장인: admin, sales, BD, PM, HR, team leads) who take the 10-minute 업무 진단 on a
   phone and join a cohort to build AI into their real weekly work.
2. Company buyers (HR, team leads, executives) who buy training, consulting and development.
3. Students and solopreneurs/founders: waitlists only for now.

## Product Purpose

InnovLabs is a Seoul AI education and development studio. It teaches people to build AI into the work
they already do (systems, not prompts), and builds AI workflows and products for companies. The funnel:
innovlab.me (the one landing page) → app.innovlab.me/start (fork: 직장인, 학원, 사업자, 학생) →
diagnosis survey → teaser → free registration → personalised report → 12-week cohort or consult.
For a 학원 the diagnosis ranks five modules (상담·소통 기록, 성적표·학습 분석, 마케팅 콘텐츠,
문제·시험 제작, 조기 이탈 경보) and ends in a consult request.

Success: a 원장 or 직장인 finishes the diagnosis, trusts the result enough to register or ask for a
consult, and later sees measurable hours back in their own logs.

## Positioning

Taught and built by people who use the same tools every day for their own company, measured by the
learner's own artifacts and time logs, not by self-report. Positioned against three categories: "make
money with AI" (mostly scams), surface-level "what is AI" lectures, and build-a-product/coding classes
that miss everyday work. For 학원: the diagnosis speaks the academy's own work (상담, 성적표, 시험지,
블로그) instead of generic AI vocabulary.

## Operating Context

Korean workplace and academy realities: KakaoTalk for everything, 한글 documents, 결재 flows,
학부모 communication, 학원 관리 프로그램 or Excel or paper. Phone-first; KakaoTalk in-app browser is
a real entry point. The app has a learner area (나의 AI 교육, 코스, 리소스, 커뮤니티, 프로필) and staff
pages. Marketing site: Astro in `site/`; app: Next.js at the repo root. Korean first, English site
secondary (survey and courses run in Korean).

## Capabilities and Constraints

- Live: marketing site (KO/EN), 직장인 survey + report, 학원 diagnosis + consult request, learner app
  with Week 1-2 labs, resources library, staff pages.
- Waitlist stubs: students, solopreneurs.
- No payments; enrollment and consults handled manually.
- Undecided: price and dates, contact email and KakaoTalk channel, photos, course block structure.

## Brand Commitments

- Name **InnovLabs** and domain innovlab.me stay.
- The **asterisk mark** stays (it stands for "everything is an experiment"); it may be redrawn.
- Everything else (colours, type, layout language) is open as of 2026-10-03.
- Voice: Korean written natively, 존댓말 (합니다체 outward, 해요체 in the app), 저희 for InnovLabs.
  No 보장/반드시, no absolute outcome promises; ranges and measurement.
- Brand rules: systems not prompts; no ethics theater, transformer theory, prompt tricks, future-of-AI
  speculation or "make money with AI"; nothing promised that cannot be shown; every number has a source.

## Evidence on Hand

- Curriculum (seven tracks on a 12-week spine), docs in `docs/curriculum/`.
- Founders' own daily use; Lumberworks (dev studio) for services credibility.
- No clients, testimonials or case studies yet. Photos not supplied yet. Do not invent any of these.

## Product Principles

1. Speak the user's own work, not AI vocabulary.
2. Show, don't claim: artifacts, logs and ranges over promises.
3. One company from site to app: the hand-off must feel continuous.
4. Phone first, between-tasks attention: short screens, one clear next step.
5. Trust before excitement for owners spending their own money and time.

## Accessibility & Inclusion

WCAG 2.2 AA contrast and 44px tap targets; Korean type sized for older 원장 on phones.
