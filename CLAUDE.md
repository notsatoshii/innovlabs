# Project: AI Workflow Course Funnel (Korean market)

## What this is
A B2C/B2B funnel website + web app for a Korean AI-workflow education platform.
Flow: landing page → entry fork (employee/solopreneur/student) → 10-min survey →
track recommendation (teaser) → registration gate → personalized track one-pager →
waitlist CTA. No payments in v1 (enrollment handled manually).

## The spec
`survey_schema_v1_1.md` in this repo is the authoritative product spec: survey
questions, routing logic, personalization slot contracts, data model, privacy rules.
Read it before implementing anything survey-related. If code and spec conflict,
the spec wins — flag the conflict, don't silently improvise.

## Stack (decided — do not substitute)
- Next.js (App Router, TypeScript) deployed on a DigitalOcean droplet (standalone build, Docker + nginx); repo on GitHub
- Supabase: Postgres, Auth (Kakao OAuth + email fallback), Row Level Security
- Claude API for the 4 one-pager generation slots and the B2B org report
- Tailwind CSS. Mobile-first: primary device is a Korean office worker's phone.

## Non-negotiable rules
1. All user-facing text in Korean (존댓말, warm but professional). Code/comments in English.
2. Survey responses are IMMUTABLE once submitted (`survey_response` table: insert-only,
   no update path anywhere in the codebase). The living `user_profile` is a separate
   table seeded from it. `profile_event` is an append-only log.
3. Registration gate comes AFTER the survey and teaser, never before.
4. LLM generation slots: template with constrained slots, never free-form. Slot 3
   (outcomes) uses range + measurement framing only — never absolute promises,
   never 보장/반드시 vocabulary. The LLM may not invent curriculum facts; Slot 2
   reads only from static track fact sheet files.
5. B2B privacy wall: individuals see their own data; org admins see aggregates only,
   enforced via Supabase RLS, minimum group size 5 for any reported slice.
6. Solopreneur and student fork paths are 3-screen waitlist stubs in v1 (see spec).
7. schema_version and path fields stored on every survey response.

## Build phases (work in this order)
1. Scaffold + survey flow with in-memory state (no backend yet): fork screen,
   employee survey (all 19 questions), live routing logic, teaser screen.
   Build BOTH Q5 variants (8-row grid AND 8 sequential questions) behind a toggle —
   we are A/B testing this in a pilot.
2. Supabase integration: schema, auth (email first, Kakao OAuth second), consent
   screen at registration (개인정보보호법: purpose, retention, deletion right).
3. One-pager generation endpoint + template rendering. Track fact sheets as
   static content files.
4. Landing page (B2C) + thin B2B partner page with org_code invite links.
5. B2B org report (batch aggregation, group-size rule).

## Working style
- Plan before implementing anything that touches more than 2-3 files; show me the
  plan first.
- Small commits with clear messages. Set up git from the start.
- When uncertain about a product decision not covered by the spec, ask — don't guess.
