# Phase H: 학원 (hagwon) path, schema v0.2

Status: BUILDING 2026-09-22. Spec: `docs/product/hagwon_survey_schema_v0.2.md`
(spec wins). Eric: "Let's add this track for the Educators track to the app."

## What it is

A fourth door on the fork for 학원 원장 (or 실장, flagged): a 12-question,
20-tap survey in 합니다체, rule-based scoring into five modules (0–10), a
derived weekly-hours range, and a result page with a 30분 진단 상담 CTA. No
LLM anywhere in this path; the result is a pure function of the answers.
The schema's "Phase 1 Tally" step is skipped: the app is the deployment.

## Decisions (mine unless marked; Eric overturns any in review)

| # | Decision |
|---|---|
| H1 | Path id `hagwon`; `schema_version` "hagwon-0.2"; result stored in `survey_response.scoring` with `kind: "hagwon"` and recomputed from `core` wherever shown. Migration 0006 widens the two path check constraints. |
| H2 | Fork door copy: 학원을 운영하고 있어요 · 원장 · 실장 · 학원 관리자. Fourth door, live. |
| H3 | Flow keeps rule 3: survey → result teaser (hours range + recommended module names) → registration → full result on 나의 AI 교육 → CTA. |
| H4 | Q4 ranking is three single-select screens, the schema's own fallback for phones. |
| H5 | Registration details step for this path labels 회사명 as 학원명. `track`, `track_via`, `depth_flag` stay null; no one-pager is generated. |
| H6 | CTA 30분 진단 상담 신청하기 writes an `inquiry` row (source `app-hagwon`, interest `training`, name and email from the profile, 학원명 from company_name, message = Q12 + recommended modules) and a `consult_requested` event. No Tier 2 form yet. |
| H7 | Scoring interpretations the schema leaves open, flagged: Q6a 분기별 counts as volume 1 and ≈17 students/month for hours; 상담 hours convert monthly to weekly (÷4.3) like 성적표; a module with 0 points is never recommended, and "M1 selected" for the M5 gate means M1 recommended with points; module totals cap at 10 after the 강사 weight. |
| H8 | Out of scope now, from the schema's own list: Q1-driven copy swap for 유아·예체능 (v0.3), Tier 2 intake, pilot recalibration of the hour factors. |

## Files

Contract (main session, done): `src/lib/hagwon/{types,questions,scoring,modules}.ts`,
`isEmployeeScoring` guard in `src/lib/survey/types.ts`, migration 0006 applied.

Agent "hagwon-survey": `src/app/hagwon/**` (survey and teaser),
`src/components/hagwon/survey/**`, the door in `src/app/start/page.tsx`.

Agent "hagwon-integration": register path handling, `remote.ts` seed for the
path, `src/components/hagwon/result/**` (full result view, consult CTA),
education tab branch, profile labels, `consult_requested` in the event catalog.

## Rules check

Korean 합니다체 per schema; no "AI" outside Q11; no 보장/반드시; hours shown
as a range with the schema's caveat, never as fact. Survey response
immutable; registration after teaser; no LLM slots touched.

## Findings (fresh-context review, 2026-09-22) and status

| # | Finding | Status |
|---|---|---|
| 1 | Consult CTA could file an inquiry with an empty email (Kakao without email scope) and promised a two-day reply; consent text did not name the consult contact purpose or 학원명. | Fixed: contact input when the account has no email; promise dropped; consent variant for the path. |
| 2 | `/api/one-pager` and `/report` did not check `path`; a 원장 opening /report would have run the LLM on 학원 answers and cached it. | Fixed: 409 for non-employee paths; report page redirects to 나의 AI 교육. |
| 3 | M5 could be recommended after M1 fell out of the final list (its data source gone). | Fixed: re-gate against the final list. |
| 4 | `recommended` still carried modules under consultFirst and leaked into the inquiry and event. | Fixed: empty list below 4. |
| 5 | H7 deviations judged: cap at 10, monthly→weekly for 상담, and "no zero-point module" are defensible; 분기별 handling is arbitrary but harmless (Eric's call); the schema itself can recommend a module the 원장 never ranked in the third slot (raise for v0.3). Prep hint loosened to fire on high grade volume too. | Recorded; prep fixed. |
| 6 | CTA dedupe was per browser session; role ignored Q0. | Fixed: server-side check of the event log per user; role from Q0. |
| 7 | Teaser names the two biggest hour buckets and the reliability note before the gate. Schema bundles the buckets with the hours line. | Kept; Eric decides if the gate should be stricter. |
| 8 | Register page copy stayed 해요체 and employee-flavoured for 원장. | Fixed by the polish agent: 합니다체 variants. |
| 9 | Flow polish: employee survey with a hagwon response looped to /start; Q3 label mismatch; dead finish button case; door order; 출결·결제 copy assumed a program exists; 주 0–1시간 display. | Fixed by the polish agent. |
| 10 | Rules 2 and 4 clean; employee path unaffected. | — |
