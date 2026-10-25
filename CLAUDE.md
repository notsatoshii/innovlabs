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

## Current phase
All five original build phases are deployed (last: phase-2c, 2026-10-04). Current work: `docs/app/phases/phase-online.md`; status of every phase file: `docs/app/phases/README.md`.

## Working style
- Plan before implementing anything that touches more than 2-3 files; show me the
  plan first.
- Small commits with clear messages. Set up git from the start.
- When uncertain about a product decision not covered by the spec, ask — don't guess.

## Working across machines
- Auto-memory and continuity are in ~/claude-workspace; the shared rules are in the user-level CLAUDE.md.
- This repo is public: no secrets, nothing personal.
- Eric is not a developer; replies to him follow the user-level CLAUDE.md format rule.
