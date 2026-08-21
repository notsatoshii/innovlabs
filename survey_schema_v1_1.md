# Shared Survey Schema — v1.1

**Changes from v1.0:** Entry fork architecture (employee / solopreneur / student), common-core field contract across all three instruments, employee survey finalized as first build, waitlist stubs specified for the two unbuilt paths, 업종 question added to employee path (slot freed by removing old Q1), 구직자 dead-end resolved (routes to student fork).

**Target completion time:** ≤ 10 min per instrument (employee path estimated ~9 min).
**Schema version field:** every response row stores `schema_version: 1.1` and `path: employee | solo | student`.

---

## Section 0 — Entry Fork (before any survey)

One screen, one question, three doors. This is a router, not a survey question.

**"어떤 상황에서 AI를 활용하고 싶으신가요?"**
1. **회사에서 일하고 있어요** (직장인 · 공무원 · 공공기관) → Employee survey (BUILT NOW)
2. **내 사업을 하고 있어요** (자영업 · 1인 사업자 · 프리랜서 · 창업자) → Solopreneur stub (survey built later)
3. **학생이거나 취업 준비 중이에요** → Student stub (survey built later)

Fork click volume is itself demand data: it decides which path gets built second.

---

## Common Core Contract (all three instruments)

Every survey instrument, present and future, MUST populate these core fields. Wording and row labels may differ per path; measurement scales and data structure may not.

| Core field | Structure | Employee source |
|---|---|---|
| `task_hours{}` | 8 task clusters × 5-bucket scale (0/1.5/4/8/12 midpoints) | Q5 grid |
| `top_time_sink` | one task cluster | Q6 |
| `most_repetitive` | one task cluster | Q7 |
| `mirror_text` | free text, recurring-task description | Q8 |
| `friction_text` | free text, 1 sentence | Q9 |
| `ai_maturity` | 5-level ordinal | Q10 |
| `tools_used[]` | multi select | Q11 |
| `env_constraint` | policy + install freedom | Q12–Q13 |
| `work_stack[]` | multi select | Q14 |
| `primary_goal` | single select | Q15 |
| `ten_hours_text` | free text, 1 sentence | Q16 |
| `learning_time` | 4-bucket ordinal | Q17 |
| `success_definition` | single select | Q18 |

Path-variant fields sit alongside the core: employee adds `industry, company_size, department, rank, mgmt_scope`; solopreneur will add `business_type, business_stage, team_size`; student will add `major, target_career, timeline`. Baselines and org reports read core fields only → always comparable across paths.

---

## EMPLOYEE SURVEY (build now)

### Section 1 — 기본 정보 · 5 questions · ~1 min

**Q1. 어떤 업종에서 일하고 계신가요?** (single select) **[M] [O] [C]** *(new in v1.1)*
- 제조 · 생산 / IT · 소프트웨어 / 금융 · 보험 / 유통 · 이커머스 / 교육 / 의료 · 제약 · 바이오 / 건설 · 부동산 / 공공 · 행정 / 미디어 · 콘텐츠 / 전문서비스 (법률 · 회계 · 컨설팅) / 기타

> *Feeds one-pager example selection (a 제조 실무자 and a 금융 실무자 get different workflow illustrations) and a primary org-report slice.*

**Q2. 회사(조직)의 규모는?** (single select) **[O] [C]**
- 1–4명 / 5–49명 / 50–299명 / 300–999명 / 1,000명 이상

**Q3. 주로 어떤 직무에 가까운 일을 하시나요?** (single select) **[R-prior +1] [O]**
- 경영지원 · 인사 · 총무 / 기획 · 전략 / 마케팅 · 콘텐츠 / 영업 · 고객관리 / 데이터 · 분석 / 재무 · 회계 / 개발 · IT / 생산 · 품질 · 물류 / 기타 (직접 입력)

**Q4. 직급/연차는?** (single select) **[R] [O] [C]**
- 사원 · 주임 (1–3년차) / 대리 (3–7년차) / 과장 · 차장 / 팀장 · 부장 / 임원 · 대표

**Q5-a. 다른 사람의 업무를 관리하거나 조율하는 역할인가요?** (single select) **[R]**
- 아니요, 제 업무에 집중합니다 / 1–3명 정도 챙깁니다 / 4–10명 팀을 관리합니다 / 10명 이상 · 여러 팀을 총괄합니다

### Section 2 — 업무 시간 분포 · 3 questions · ~3 min

**Q5. 지난 한 달 기준, 일주일 평균 아래 업무에 각각 몇 시간을 쓰시나요?** (grid or sequential — open question #1: 거의 없음 / 1–2시간 / 3–5시간 / 6–10시간 / 10시간 이상) **[R-primary] [B] [C] [O]**

| # | Task cluster | Maps to track |
|---|---|---|
| a | 보고서 · 기획안 · 문서 작성과 포맷팅 | 문서·행정 |
| b | 자료 조사 · 정보 수집 · 요약 정리 | 리서치·기획 |
| c | 엑셀 · 데이터 정리, 취합, 분석 | 데이터·수치 |
| d | 외부 고객 · 거래처 응대와 커뮤니케이션 | 영업·고객 |
| e | 콘텐츠 제작 (SNS, 상세페이지, 카피 등) | 콘텐츠·마케팅 |
| f | 회의 참석 · 회의록 · 일정 조율 | 관리·조율 (조건부) |
| g | 이메일 · 메신저 내부 커뮤니케이션 | (baseline only) |
| h | 반복적 행정 처리 (결재, 정산, 취합, 입력) | 문서·행정 |

**Q6. 가장 많은 시간을 잡아먹는 업무 하나는?** (from a–h) **[R +2] [M]**

**Q7. 가장 반복적 · 기계적으로 느껴지는 업무는? "영혼 없이도 할 수 있는 일"** (from a–h) **[R +1] [M]**

### Section 3 — 대표 업무 심층 · 2 questions · ~2 min

**Q8. 매주(또는 매달) 반복하는 업무 하나를 구체적으로 알려주세요.** (free text) **[M-critical] [C]**
> Placeholder: *"예: 매주 월요일 주간보고를 씁니다. 프로젝트 툴, 이메일, 공유 엑셀 세 군데에서 데이터를 모아 회사 양식에 맞춰 정리해 팀장님께 보내는데, 보통 2–3시간 걸립니다."*

**Q9. 그 업무에서 가장 답답하거나 번거로운 부분은?** (free text, 1 sentence) **[M]**

### Section 4 — 도구 · 환경 · 5 questions · ~1.5 min

**Q10. AI 도구를 업무에 얼마나 활용하고 계신가요?** (single select) **[R-depth] [B] [C]**
- 거의 사용 안 함 / 일회성으로 몇 번 (검색 대용, 문장 다듬기) / 주 1회 이상 / 거의 매일 / 자동화 워크플로우까지 만들어 봄

**Q11. 사용해 본 AI 도구는?** (multi) **[C]**
- ChatGPT / Claude / Gemini / MS Copilot / 뤼튼 / Perplexity / NotebookLM / 기타 / 없음

**Q12. 회사에서 AI 도구 사용이 자유로운가요?** (single select) **[R-depth] [O]**
- 자유로움 / 승인된 도구만 / 제한적 · 눈치 보임 / 잘 모르겠음

**Q13. 업무용 PC 환경은?** (single select) **[R-depth]**
- 설치 자유로움 / 브라우저만 가능 / 회사 PC는 제한, 개인 장비 병행 가능 / 잘 모르겠음

**Q14. 주로 쓰는 협업 도구는?** (multi) **[C]**
- 카카오톡(업무) / Slack / MS Teams / 사내 그룹웨어 / Notion / Google Workspace / MS Office(로컬) / 기타

### Section 5 — 목표 · 기대 · 4 questions · ~1.5 min

**Q15. 이 과정에서 가장 얻고 싶은 것은?** (single select) **[M-outcome] [O]**
- 야근 줄이고 시간 확보 / 업무 성과 · 평가 향상 / 이직 · 커리어 전환 / 사업 · 부업 성장 / 팀 · 조직 생산성 / AI 트렌드 따라잡기

**Q16. 일주일에 10시간이 새로 생긴다면 무엇을 하시겠어요?** (free text, 1 sentence) **[M-outcome]**

**Q17. 매주 학습에 현실적으로 쓸 수 있는 시간은?** (single select) **[C]**
- 1시간 미만 / 1–2시간 / 3–5시간 / 5시간 이상

**Q18. 3개월 뒤 이 과정이 성공적이었다고 느끼려면?** (single select) **[M] [B]**
- 반복 업무 하나를 완전히 자동화 / 문서 작업 시간 절반으로 / AI 도구를 자신 있게 / 배운 것을 팀에 도입 / 사업 · 부업에 실제 적용

### Section 6 — B2B conditional (partner-link entrants only)
Hidden `org_code` auto-tagged. **Q-B1 소속 부서** (configured per org) **[O]** · **Q-B2 소속 팀 (선택)** **[O]**
Privacy statement displayed on-screen for B2B entrants: *"개별 응답은 회사에 공개되지 않으며, 통계 형태로만 제공됩니다."*

**Optional final (both):** "이 진단을 어떻게 알게 되셨나요?" — attribution, skippable.

**Count: 19 core + Q5-a + 2 B2B conditional + 1 optional ≈ 9 min.**

---

## SOLOPRENEUR STUB (until full survey is built)

Screen 1: **"어떤 일을 하고 계신가요?"** (single select → `business_type`)
- 온라인 판매 · 이커머스 / 오프라인 매장 (카페 · 식당 · 리테일) / 콘텐츠 · 크리에이터 / 디자인 · 개발 등 프리랜스 전문직 / 교육 · 강의 · 코칭 / 컨설팅 · 에이전시 / 기타

Screen 2: **"가장 먼저 자동화하고 싶은 일은?"** (single select → `solo_priority`)
- 마케팅 · SNS · 콘텐츠 / 고객 응대 · CS / 정산 · 세무 · 행정 / 상품 · 서비스 기획 / 리서치 · 시장 조사 / 전부 다

Screen 3: Email capture — *"1인 사업자를 위한 맞춤 진단을 준비 중입니다. 오픈 시 가장 먼저 알려드릴게요."*

## STUDENT STUB (until full survey is built)

Screen 1: **"현재 상황에 가까운 것은?"** (single select → `student_status`)
- 대학 재학 중 / 졸업 예정 · 취업 준비 / 이직 준비 / 기타

Screen 2: **"AI 역량을 어디에 쓰고 싶으세요?"** (single select → `student_goal`)
- 취업 경쟁력 / 학업 · 과제 효율 / 부업 · 사이드 프로젝트 / 아직 탐색 중

Screen 3: Email capture — same pattern.

> 구직자 note: the v1.0 dead-end is resolved — job-seekers now have a real door (student fork) and their volume is measured.

---

## Routing Logic v1.1 (employee path)

- **Gate (manager):** IF (Q5-a ≥ "4–10명" OR Q4 ≥ 팀장) AND Q5f ≥ 6시간 → 관리·조율 candidate, competes with +2 boost.
- **Score:** Q5 hour midpoints → track buckets (a+h → 문서·행정; b → 리서치·기획; c → 데이터·수치; d → 영업·고객; e → 콘텐츠·마케팅; f → 관리·조율 iff gate). +2 track of Q6, +1 track of Q7, +1 department prior (Q3).
- **Decision:** top ≥ 1.5 × second → assign (~80%). Else top-two user choice on teaser screen; skip → 문서·행정 default. Choice logged.
- **Depth flag (orthogonal):** `full_agent` IF Q13 ∈ {설치 자유, 개인 장비 병행} AND Q12 ≠ 제한적; else `browser_only`.

## Personalization Slots (unchanged from v1.0, + industry)

- **Slot 1 Mirror** ← Q8, Q9, Q6, Q7, Q3, **Q1 (industry — new input for example selection)**
- **Slot 2 Week mapping** ← track + Q8 keywords + depth flag + static curriculum fact sheet (LLM may not invent curriculum)
- **Slot 3 Hedged outcome** ← Q5 totals, Q15, Q18. Range + measurement framing ONLY; no 보장/반드시 vocabulary.
- **Slot 4 Aspirational close** ← Q16, Q15
- **Teaser (pre-registration, no LLM):** track name + one-liner + computed stat from own Q5 answers.

## Data Model (goal-3 additions)

1. `survey_response` — immutable, timestamped, `schema_version`, `path`. THE baseline. Never edited.
2. `user_profile` — seeded from core fields at registration; living object; all personalization reads here.
3. `profile_event` — append-only log: survey_completed, track_assigned, track_overridden, enrolled, lab_completed, instructor_note, capstone_measured, checkin.

Consent at registration gate: collection purpose, retention period, deletion right (개인정보보호법). B2B wall: individuals see their own data; org sees aggregates only, minimum group size 5 for any reported slice (prevents deanonymization of small teams).

---

## Open Design Questions (carried + new)

1. **Q5 grid vs 8 sequential questions on mobile** — unresolved, prototype decision.
2. **Hybrid fallback** — top-two user choice (current) vs auto-assign. Current design keeps choice.
3. **Track supply mismatch** — diagnose all 7, waitlist unopened tracks. Recommended yes; one-pager copy variant needed for waitlist tracks.
4. **Baseline rigor** — self-report is marketing-grade; week-1 time log available if a partner demands hard ROI.
5. **NEW — stub conversion:** do solopreneur/student stub emails also receive the newsletter by default (consent checkbox) or invitation-only? Affects list-building speed vs consent cleanliness.
