# 학원 AI 진단 설문 — Tier 1, schema v0.2

Supersedes v0.1. Changes: 12 questions / ~28 taps (was ~45); counts instead of hour bands; three-item ranking as primary router; five modules (was seven); 0–10 normalized scoring; budget and privacy preference moved to Tier 2; respondent identity captured.

Respondent: 원장 (or 실장, flagged). Target 7–9 minutes on mobile.
Deployment: Phase 1 Tally (branching + hidden calculated fields on the thank-you page). Phase 2 = 학원 fork in the app.
Copy: 합니다체. No question uses the word "AI" except Q11.

---

## Questions

Q0. 응답자: 원장 / 실장·부원장 / 직원   `feeds: reliability flag`

Q1. 학원 유형 (복수): 유아 / 초등 / 중등 내신 / 고등 입시 / 성인·어학 / 예체능   `feeds: gate`

Q2. 규모 (두 개 드롭다운)
  원생: ~30 / 31–80 / 81–150 / 151–300 / 300+
  강사(원장 제외): 0 / 1–3 / 4–8 / 9+   `feeds: volume scale, 강사-side weighting`

Q3. 학원 관리 프로그램: 이름 입력 / 엑셀만 / 종이·카톡 / 없음   `feeds: integration path, M2/M5 gate`

Q4. ★ 지금 가장 없애고 싶은 일 세 가지를 순서대로 골라 주세요. (1위, 2위, 3위)
  학부모 상담 기록·전달 / 성적표·피드백 작성 / 문제·숙제·시험지 만들기 / 블로그·인스타 글쓰기 / 학부모 공지·안내문 / 결석·퇴원 챙기기 / 강사 보고 받고 확인하기 / 출결·결제 정리
  `feeds: PRIMARY ROUTER`

Q5. 학부모 상담 (두 탭)
  a. 월 상담 건수(전화+대면): ~10 / 11–30 / 31–80 / 80+
  b. 상담 내용 기록: 안 함 / 카톡에 남음 / 수기·엑셀 / 프로그램에 입력   `feeds: M1 volume + friction, H`

Q6. 성적표 (두 탭)
  a. 성적표·학습 리포트 받는 학생 수와 주기: 없음 / 월 ~50명 / 월 51–150명 / 월 150명+ / 분기별
  b. 성적 저장: 프로그램 / 엑셀 / 종이 / 강사가 각자   `feeds: M2 volume + gate`

Q7. 문제·시험 (한 탭 + 조건 한 탭)
  a. 자체 제작 프린트·시험지: 안 만듦 / 주 1–2세트 / 주 3–5세트 / 주 6세트+
  b. [Q1 ∋ 중등 내신 or 고등 입시] 학교별 기출 보유: 없음 / 1년 종이 / 2년+ 종이 / 2년+ 스캔·파일   `feeds: M4 volume + gate`

Q8. 마케팅 (두 탭)
  a. 블로그·인스타 게시: 안 함 / 월 1–3 / 주 1 / 주 2+
  b. 담당: 원장 직접 / 직원·강사 / 외주   `feeds: M3 volume + friction`

Q9. 결석이 늘거나 학부모 연락이 뜸해지는 학생을 정기적으로 챙기는 사람: 원장 / 강사 / 없음 / 프로그램이 알려줌   `feeds: M5 friction`

Q10. 강사들이 수업 외에 가장 시간을 많이 쓰는 일 (하나): 문제·숙제 제작 / 성적표·피드백 / 상담·기록 / 시험 분석 / 잘 모르겠음   `feeds: 강사-side router, weighted by Q2 강사 수`

Q11. 원장님의 ChatGPT 등 AI 사용: 안 써봄 / 써본 적 있음 / 주 1–2회 / 거의 매일   `feeds: onboarding depth`

Q12. (주관식, 선택) 3개월 뒤 이것 하나가 해결되면 성공이다:   `feeds: 성공 지표, Tier 2 opener`

Tap count: Q0 1, Q1 ~2, Q2 2, Q3 1, Q4 3, Q5 2, Q6 2, Q7 1–2, Q8 2, Q9 1, Q10 1, Q11 1, Q12 0–1 = 20–22 taps + reading. Under 9 minutes.

---

## Modules (5)

| id | 모듈 | gate |
|---|---|---|
| M1 | 상담·소통 기록 (통화·대면 요약 → 기록 → 원장 확인, 공지·답변 초안 포함) | none |
| M2 | 성적표·학습 분석·학습계획 | Q6b ≠ 종이 / 강사가 각자 |
| M3 | 마케팅 콘텐츠 (블로그·인스타 초안 + 광고 규제 필터) | none |
| M4 | 문제·시험 제작 (자체 교재 기반 문제·숙제; 내신·입시는 기출 분석·모의고사 포함) | Q7a ≠ 안 만듦; 기출 분석 sub-feature only if Q7b = 2년+ 스캔·파일 |
| M5 | 조기 이탈 경보 (rule-based) | Q3 = 프로그램 OR M1 selected |

Out of scope, stated on result page: 셔틀버스, 예약 시스템 자체, 결제.

## Scoring (each module 0–10)

rank points (Q4): 1위 = 5, 2위 = 3, 3위 = 1. Q4 item → module map:
  상담 기록·전달 → M1 ; 학부모 공지·안내문 → M1 ; 강사 보고 → M1
  성적표·피드백 → M2
  문제·숙제·시험지 → M4
  블로그·인스타 → M3
  결석·퇴원 챙기기 → M5
  출결·결제 정리 → none (result page: 프로그램 기능으로 해결 권장)
  (if two Q4 items map to the same module, take the higher only)

volume points (0–3): band index of the module's count question (Q5a, Q6a, Q7a, Q8a); M5 uses Q5a.
friction points (0–2):
  M1: Q5b 안 함 or 카톡 = 2, 수기·엑셀 = 1, 프로그램 = 0
  M2: Q6b 엑셀 = 1, 프로그램 = 0 (gated otherwise)
  M3: Q8b 원장 직접 = 2, 직원·강사 = 1, 외주 = 0
  M4: Q7b 2년+ 스캔 = 2, 2년+ 종이 = 1, else 0 (non-내신: Q7a ≥ 주 3–5 = 1)
  M5: Q9 없음 = 2, 강사 = 1, 원장 = 0, 프로그램 = 0
강사 weight: if Q2 강사 ≥ 4–8, add +2 to the module matching Q10 (문제 → M4, 성적표 → M2, 상담 → M1, 시험 분석 → M4).

Apply gates → rank. Show top 2; third only if within 2 points of second. If top score < 4, result says "먼저 30분 진단 상담" instead of modules.

## Hours stat (주 N–M시간)

Derived from counts, never asked directly.
  상담: Q5a midpoint × 20분 × 0.5 (기록·전달 portion)
  성적표: Q6a midpoint ÷ 4.3 (weekly) × 12분 × 0.7
  문제: Q7a midpoint × 90분 × 0.4
  마케팅: Q8a weekly midpoint × 60분 × 0.6
  강사 보고·공지: flat 1.5h if any of those appear in Q4, else 0
Sum → show floor(0.8×H) to ceil(1.2×H), whole hours. Copy: "주 N–M시간 정도가 자동화 대상입니다. 정확한 수치는 진단 상담에서 확인합니다."
All unit times and factors are first guesses; recalibrate after pilot before/after.

## Result page

1. 주 N–M시간 + the two biggest buckets named
2. 추천 모듈 2개 (1 line each: 무엇이 바뀌는지, 원장 입장에서)
3. 먼저 준비할 것 (from gates that nearly passed: 성적 엑셀 정리, 기출 스캔)
4. 다루지 않는 것: 셔틀, 예약, 결제
5. Q11 = 안 써봄 → "원장님 2시간 시작 세션" recommended before modules
6. CTA: 30분 진단 상담 (→ Tier 2 intake)

## Known weaknesses (still)
- Q4 ranking on Tally mobile is a drag-list; on some phones it's clumsy. Fallback: three single-select screens (1위 → 2위 without chosen → 3위).
- Q6a mixes count and frequency in one list. Acceptable for Tier 1; Tier 2 separates them.
- 유아·예체능 hagwons will find Q6, Q7 partly irrelevant. v0.3 needs a Q1-driven copy swap (관찰 기록 / 포트폴리오 instead of 성적표 / 문제).
- Result page is only as honest as the factors. Until pilot data, the director must not quote the 주 N시간 as fact.

## Tier 1 → Tier 2 handoff
Result page stores: module ranking, hours estimate, gate failures, Q12 text. Tier 2 interviewer opens with Q12 and runs only the blocks for the top modules (see hagwon_intake_tier2_v0.2.md).
