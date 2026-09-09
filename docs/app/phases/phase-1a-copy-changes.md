# Phase 1a: Korean copy pass and token swap (tokens-copy agent)

Date: 2026-09-10. Plan: `phase-1.md` §7 (tokens), §8 rule 1 (Korean copy
standard), §9 step 2, D6 (smart root). Eric reviews the copy from this file;
the rendered check happens on the phone preview after the phase build.

Standard applied: written from intent, not from the English; no 당신; no
noun-stacked or passive constructions; 합니다체 on the landing (outward-facing),
해요체 inside the app flow where it was already conversational (teaser, report,
stubs); Korean workplace words; no 보장/반드시, no fixed outcome numbers.

## Non-copy changes in the same pass

| File | Change |
|---|---|
| `src/app/globals.css` | `:root` tokens replaced with the site palette (paper `#FFF9F0`, ink `#000`, yellow `#FFDE21`, pink `#FF4D8D`, pink-deep `#d6336c` kept for text, lime `#B8FF29`, cyan `#00E0FF`). `--nb-purple` and `--nb-teal` removed. `.nb-fill` progress bar now lime. New `.nb-sticker` (rotated 준비 중 tag) and `.nb-disabled` (greyed control). Skeleton shimmer re-tinted one step darker than the new paper. Borders stay 2px, shadows 4px. |
| `src/app/page.tsx` | Smart root (D6): `getSession()` at the top; a signed-in account with a profile row is redirected to `/app/profile`. `--nb-purple` fills → cyan; the teal "지금 진단 가능" badge → lime with ink text (lime is a fill, never a text color). Landing's own sticky top header removed: `layout.tsx` now renders the site-wide header (logo + 로그인/내 프로필), so the page-level one would have stacked a second bar under it. The mobile sticky bottom CTA stays. |
| `src/app/report/page.tsx` | Slot 3 card fill purple → cyan. |
| `src/app/start/page.tsx`, `src/components/survey/StubFlow.tsx`, `src/app/page.tsx` | "오픈 준비 중" pill badges replaced with the shared `.nb-sticker` reading 준비 중, so the fork, the stub intro, and the landing use the same tag the app shell uses for greyed tabs. |

## Changed strings

### Landing (`src/app/page.tsx`)

| Before | After | Reason |
|---|---|---|
| (header) `Innovlabs` / `무료 진단` | removed | Site-wide header now comes from `layout.tsx`; avoids two headers. |
| `10분 무료 업무 진단` (hero badge) | `무료 업무 진단 · 10분` | Reads as a label, not a stacked noun phrase. |
| `반복 업무에 묶인 시간, / AI로 되찾아 드릴게요` | `매주 똑같이 반복하는 일, / AI로 얼마나 줄일 수 있을까요?` | "묶인 시간 … 되찾아" is the English "time tied up / win back" carried over, and it promises. A question a 직장인 would actually ask, with no promise. |
| `지금 하고 있는 업무를 알려주시면, 나에게 맞는 AI 워크플로우 트랙을 찾아드립니다. 약 10분이면 충분해요.` | `지금 하시는 일을 10분만 알려주세요. 어떤 AI 워크플로우 트랙이 맞는지, 그 영역에 매주 몇 시간을 쓰고 있는지 바로 보여드립니다.` | Says concretely what comes back; one register (합니다체). |
| `회사 초대 링크로 들어오셨어요. …` | `회사 초대 링크로 들어오셨네요. …` | Softer acknowledgement. The second sentence is the spec's B2B privacy statement, kept verbatim. |
| `무료로 진단 시작하기` (3 CTAs) | `무료 진단 시작하기` | Tighter button label. |
| `카드 등록 없음 · 약 10분 · 결과 즉시 확인` | `카드 등록 없음 · 약 10분 · 결과 바로 확인` | 즉시 is formal-written; 바로 is what people say. |
| `이런 일, 매주 / 반복하고 있지 않으세요?` | `혹시 매주 / 이런 일에 시간을 쓰고 계신가요?` | Natural rhetorical hook; the old line is the English negative-question shape. |
| `양식 맞추고 문장 다듬는 데 반나절이 지나갑니다.` | `양식 맞추고 문장 다듬다 보면 반나절이 훌쩍 갑니다.` | Spoken rhythm (다 보면 … 훌쩍 갑니다). |
| `여러 파일에서 숫자를 모아 붙이는 일이 매주 반복됩니다.` | `매주 파일 몇 개를 오가며 숫자를 복사해 붙입니다.` | Passive "is repeated" → what the person actually does. |
| `회의가 끝나면 정리하고, 공유하고, 다시 일정을 맞춥니다.` | `회의 끝나면 회의록 쓰고, 공유하고, 다음 일정 잡느라 메신저를 또 붙잡습니다.` | Workplace detail (회의록, 메신저) instead of abstract verbs. |
| `진단이 끝나면, 내가 이런 일에 주당 몇 시간을 쓰고 있는지 숫자로 확인할 수 있어요.` | `진단을 마치면 이런 일에 매주 몇 시간을 쓰고 있는지 숫자로 확인하실 수 있습니다.` | 주당 → 매주 (spoken); 합니다체 on the landing. |
| `세 단계로 끝나요` | `세 단계면 끝납니다` | Register. |
| Step 1 body `업무 시간, 반복 업무, 사용 환경에 대한 19개 질문에 답해 주세요. 한 화면에 한 질문씩, 진행률이 표시됩니다.` | `업무 시간, 반복 업무, 회사 PC 환경을 묻는 질문 19개에 답합니다. 한 화면에 한 질문씩 나오고, 남은 분량은 진행률로 보입니다.` | "~에 대한 19개 질문" and "표시됩니다" are translated shapes; 사용 환경 → 회사 PC 환경 (what Q13 actually asks). |
| Step 2 body `답변을 바탕으로 6개 트랙 중 나에게 맞는 트랙과, 내가 그 영역에 쓰는 주당 시간을 바로 보여드립니다.` | `답변을 바탕으로 6개 트랙 중 맞는 트랙을 골라 드리고, 그 영역에 매주 몇 시간을 쓰고 있는지 바로 보여드립니다.` | Two verbs instead of one stacked object; drops 나에게/내가 doubling. |
| Step 3 body `무료로 등록하시면 내 업무 기준으로 작성된 맞춤 리포트를 받아보실 수 있습니다.` | `무료로 등록하시면 답변하신 업무를 기준으로 쓴 맞춤 리포트를 받아보실 수 있습니다.` | "작성된" passive → "쓴". |
| `등록은 진단 결과를 확인한 뒤에 진행됩니다. 결과를 먼저 보고 결정하세요.` | `등록은 진단 결과를 확인한 다음입니다. 결과를 먼저 보시고 결정하셔도 됩니다.` | "진행됩니다" passive; imperative 결정하세요 softened. |
| `내 업무 기준으로 쓰인 / 한 장의 리포트` | `내 업무 기준으로 쓴 / 한 장짜리 리포트` | 쓰인 is the English passive; 한 장의 → 한 장짜리. |
| Slot 1 `내 업무 그대로 비추기` / `답변하신 반복 업무와 불편한 지점을 내 직무와 업종 기준으로 정리합니다.` | `내 업무를 있는 그대로` / `답변하신 반복 업무와 답답한 지점을 직무와 업종에 맞춰 정리합니다.` | "비추기" is "mirror" translated literally. 불편한 → 답답한 matches Q9's own word. |
| Slot 2 `주차별 학습 지도` / `추천 트랙의 커리큘럼이 내 업무의 어느 부분에 닿는지 주 단위로 연결해 드립니다.` | `주차별 학습 계획` / `추천 트랙에서 매주 배우는 내용이 내 업무의 어느 부분에 쓰이는지 주 단위로 짚어 드립니다.` | 학습 지도 reads as "map" translated; "닿는지 … 연결해" is English "touches / connects". |
| Slot 3 `예상 변화 범위` / `현재 쓰고 있는 시간을 기준으로 기대할 수 있는 변화를 범위로 안내하고, 직접 측정하는 방법을 제안합니다.` | `기대할 수 있는 변화` / `지금 쓰는 시간을 기준으로 기대할 수 있는 변화를 범위로 보여드리고, 직접 재 보는 방법도 함께 안내합니다.` | Keeps the range + measurement framing (rule 4) in plainer words. |
| Slot 4 `다음 한 걸음` / `답변하신 목표를 기준으로 가장 먼저 시작할 지점을 제안합니다.` | `첫 번째 할 일` / `답변하신 목표에 맞춰 무엇부터 시작하면 좋을지 제안합니다.` | "다음 한 걸음 / 시작할 지점" are "next step / starting point" literal. |
| `리포트는 답변하신 내용과 트랙 커리큘럼만을 바탕으로 작성됩니다. 결과는 범위로 안내하며, 확정적인 수치를 약속하지 않습니다.` | `리포트는 답변하신 내용과 트랙 커리큘럼만 바탕으로 작성합니다. 변화는 범위로 안내하며, 정해진 수치를 약속하지 않습니다.` | Passive → active; 확정적인 수치 → 정해진 수치. |
| `누구를 위한 진단인가요?` | `누가 받을 수 있나요?` | "Who is it for" literal → the question people ask. |
| `지금 진단 가능` (badge) | `지금 바로 가능` | Shorter; badge is now lime with ink text. |
| `직무·직급·사용 환경에 맞춰 트랙을 추천합니다.` | `직무, 직급, 회사 PC 환경에 맞춰 트랙을 추천합니다.` | 사용 환경 → 회사 PC 환경. |
| `오픈 준비 중` (2 badges) | `준비 중` (sticker) | Shared sticker vocabulary with the app shell. |
| `두 가지 질문에 답하고 대기 등록하시면 오픈 시 먼저 알려드려요.` | `질문 두 개에 답하고 이메일을 남겨 두시면 열리는 대로 먼저 알려드립니다.` | 대기 등록 / 오픈 시 are jargon; says what actually happens. |
| `전공과 목표 진로 기준의 진단을 준비하고 있어요.` | `전공과 희망 진로에 맞춘 진단을 준비하고 있습니다.` | "목표 진로 기준의" is a noun stack; 희망 진로 is the normal term. |
| `기업·팀 단위 도입` | `기업·팀 도입` | 단위 is filler. |
| `팀 전체가 참여하면 / 조직 리포트를 드립니다` | `팀이 함께 참여하면 / 조직 리포트를 드립니다` | Rhythm. |
| `파트너 초대 링크로 구성원이 진단에 참여하면, 조직 단위의 업무 시간 분포와 추천 트랙을 통계 형태로 제공합니다. 개별 응답은 회사에 공개되지 않습니다.` | `초대 링크로 구성원이 진단에 참여하면, 조직 전체가 어떤 업무에 시간을 쓰는지와 추천 트랙 분포를 통계로 정리해 드립니다. 개별 응답은 회사에 공개되지 않습니다.` | "조직 단위의 업무 시간 분포" is a noun stack; last sentence kept. |
| FAQ 비용 `진단과 맞춤 리포트는 무료입니다. 카드 등록도 필요 없습니다. 이후 트랙 수강은 별도로 안내드립니다.` | `진단과 맞춤 리포트는 무료이고, 카드 등록도 없습니다. 트랙 수강 비용은 등록 후 따로 안내드립니다.` | Three clipped sentences → one spoken answer; names 비용 explicitly since that is the question. |
| FAQ 시간 `약 10분입니다. 질문은 한 화면에 하나씩 나오고, 진행률이 표시되어 남은 분량을 확인할 수 있습니다.` | `10분 정도 걸립니다. 질문이 한 화면에 하나씩 나오고, 위쪽 진행률로 얼마나 남았는지 볼 수 있습니다.` | "진행률이 표시되어" passive. |
| FAQ 개인정보 `등록 단계에서 수집 목적, 보관 기간, 삭제 요청 권리를 안내하고 동의를 받습니다. 언제든 열람·정정·삭제를 요청하실 수 있습니다.` | `등록할 때 수집 목적, 보관 기간, 삭제 요청 방법을 안내하고 동의를 받습니다. 열람, 정정, 삭제는 언제든 요청하실 수 있습니다.` | 등록 단계에서 → 등록할 때; 권리 → 방법 (what the screen actually shows). Legal content unchanged. |
| FAQ 회사 `개별 응답은 회사에 공개되지 않으며, 통계 형태로만 제공됩니다. 인원이 적은 팀은 통계에서도 따로 표시되지 않습니다.` | `볼 수 없습니다. 개별 응답은 회사에 공개되지 않으며, 통계 형태로만 제공됩니다. 인원이 적은 팀은 통계에서도 따로 나오지 않습니다.` | Answers the yes/no first; spec sentence kept verbatim. |
| FAQ 1인 사업자 `지금은 직장인 진단이 먼저 열려 있습니다. 1인 사업자와 학생·취업 준비생용 진단은 준비 중이며, 대기 등록을 하시면 오픈 시 가장 먼저 알려드립니다.` | `지금은 직장인 진단만 열려 있습니다. 1인 사업자용과 학생·취업 준비생용은 준비 중이라, 이메일을 남겨 두시면 열리는 대로 먼저 알려드립니다.` | Drops 대기 등록/오픈 시 jargon. |
| `10분 뒤, 내 업무를 / 숫자로 만나보세요` | `10분 뒤, 내 업무가 / 숫자로 보입니다` | "숫자로 만나보세요" is "meet your work in numbers" literal. |
| `어디에 시간이 새는지 알면, 무엇부터 바꿀지 보입니다.` | `시간이 어디로 새는지 알면 무엇부터 손볼지 보입니다.` | 손보다 is the workplace verb here. |
| `© 2026 Innovlabs. AI 워크플로우 교육.` / `Innovlabs` | `© 2026 InnovLabs · AI 워크플로우 교육` / `InnovLabs` | Brand casing (see spec conflicts: `layout.tsx` metadata still says Innovlabs). |

### Fork (`src/app/start/page.tsx`)

| Before | After | Reason |
|---|---|---|
| `가장 가까운 상황을 골라 주세요.` | `가장 가까운 쪽을 골라 주세요.` | 상황 repeats the H1; 쪽 is how you point at one of three doors. |
| `오픈 준비 중` (badge on two doors) | `준비 중` (sticker) | Shared sticker. |

Spec-defined H1 and the three door labels/subtitles are untouched.

### Teaser (`src/app/teaser/page.tsx`)

| Before | After | Reason |
|---|---|---|
| `두 가지 트랙이 모두 / 잘 맞는 것으로 나왔어요` | `두 트랙 점수가 / 거의 비슷하게 나왔어요` | Says why the app is asking (scores within 1.5×) instead of the vague "both fit well". |
| `더 끌리는 쪽을 골라 주세요. 나중에 변경할 수 있어요.` | `더 끌리는 쪽을 골라 주세요. 나중에 바꿀 수 있어요.` | 변경 → 바꾸다 (spoken). |
| `잘 모르겠어요, 추천해 주세요` | `잘 모르겠어요, 추천에 맡길게요` | The button is the user speaking; "추천해 주세요" reads as a request to a person. |
| `지금 이 영역에 주당 약 N시간을 쓰고 계세요. / 1년이면 약 M시간입니다.` | `지금 이 영역에 매주 약 N시간을 쓰고 계세요. / 1년이면 약 M시간이에요.` | 주당 → 매주; one register across the two lines. |
| `등록하시면 내 업무 기준으로 작성된 맞춤 리포트를 받아보실 수 있어요.` | `무료로 등록하시면 답변하신 업무를 기준으로 쓴 맞춤 리포트를 받아보실 수 있어요.` | Passive 작성된 → 쓴; says 무료 before the gate. |

### Report (`src/app/report/page.tsx`)

| Before | After | Reason |
|---|---|---|
| `리포트를 준비하지 못했어요` | `리포트를 불러오지 못했어요` | 불러오다 is the app verb; 준비하다 sounds like a person apologising. |
| `리포트 생성 기능을 준비 중입니다. 준비되는 대로 이메일로 알려드릴게요.` | `리포트 생성 기능은 아직 준비 중이에요. 준비되는 대로 이메일로 알려드릴게요.` | One register (해요체) inside the app. |
| `일시적인 문제가 발생했어요. 잠시 후 다시 시도해 주세요.` | `잠시 연결이 원활하지 않았어요. 조금 뒤에 다시 시도해 주세요.` | "일시적인 문제가 발생" is the translated system-error phrase. |
| `지금 나의 업무` | `지금 내 업무` | 나의 is written/bookish. |
| `4주 동안 이렇게 배워요` | `주차별로 이렇게 배워요` | The heading hard-coded "4주"; the one-pager renders whatever weeks the fact sheet gives (the curriculum is 12 weeks), so the number was inventing a fact. |
| `대기 등록이 완료되었습니다` | `대기 등록이 완료됐어요` | Register. |
| `다음 기수 수강 대기 등록하기` | `다음 기수 대기 등록하기` | 수강 is redundant with 기수. |
| Loading steps `설문 응답을 분석하고 있어요` / `트랙 커리큘럼과 연결하고 있어요` / `나만의 리포트를 작성하고 있어요` | `답변을 읽고 있어요` / `트랙 커리큘럼과 맞춰 보고 있어요` / `리포트를 쓰고 있어요` | Plain verbs; "나만의" is marketing filler. |
| `최대 30초 정도 걸릴 수 있어요` | `길면 30초 정도 걸려요` | 최대 … 걸릴 수 있어요 is "may take up to" literal. |

### Waitlist stub (`src/components/survey/StubFlow.tsx`, shared by `/solo` and `/student`)

| Before | After | Reason |
|---|---|---|
| `등록되었습니다` | `신청이 완료됐어요` | The button says 신청; the confirmation should echo it. Passive 되었습니다 dropped. |
| `오픈 소식을 가장 먼저 알려드릴게요. 기다려 주셔서 감사합니다.` | `열리는 대로 가장 먼저 알려드릴게요. 기다려 주셔서 감사합니다.` | 오픈 소식 → 열리는 대로. |
| `오픈 준비 중` (badge) | `준비 중` (sticker) | Shared sticker. |
| `{audience}를 위한 진단은 / 곧 만나보실 수 있어요` | `{audience}용 진단은 / 지금 준비 중이에요` | Bug: with audience = "학생과 취업 준비생" the old line rendered "준비생를" (wrong particle). 용 takes no particle. "곧 만나보실 수 있어요" was also a soft date promise. |
| `지금은 직장인 대상 진단을 먼저 운영하고 있어요. 미리 알려주시면 오픈과 동시에 가장 먼저 안내해 드릴게요.` | `지금은 직장인 진단만 먼저 열려 있어요. 이메일을 남겨 두시면 열리는 날 바로 알려드릴게요.` | "미리 알려주시면" was ambiguous about what to do; says 이메일. |
| `오픈 알림 신청하기 (1분)` | `오픈 알림 받기 (1분)` | Matches the next screen's H1 (오픈 알림 받기). |
| Consent `오픈 알림과 AI 활용 소식(뉴스레터) 수신을 위한 이메일 수집·이용에 동의합니다. 수신 거부 시 언제든 삭제를 요청하실 수 있습니다. (필수)` | `오픈 알림과 AI 활용 소식(뉴스레터)을 받기 위해 이메일을 수집·이용하는 데 동의합니다. 수신 거부와 삭제는 언제든 요청하실 수 있습니다. (필수)` | "수신을 위한 … 수집·이용에" is a noun chain; consent scope unchanged. |
| `잠시 후 다시 시도해 주세요. 문제가 계속되면 새로고침 후 재시도해 주세요.` | `전송이 안 됐어요. 잠시 후 다시 시도해 주세요. 계속 안 되면 새로고침한 뒤 다시 눌러 주세요.` | Says what failed first; 재시도 → 다시 눌러. |

### Q5 grid hint (`src/components/survey/HourGrid.tsx`)

| Before | After | Reason |
|---|---|---|
| `단위: 주당 시간 (거의 없음 / 1–2 / 3–5 / 6–10 / 10시간 이상)` | `일주일에 쓰는 시간을 줄마다 골라 주세요. (거의 없음 / 1–2 / 3–5 / 6–10 / 10시간 이상)` | "단위: 주당 시간" is a chart legend, not an instruction. Scale labels (spec) unchanged. |

### Track one-liners (`src/lib/survey/tracks.ts`, DRAFT copy)

| Track | Before | After | Reason |
|---|---|---|---|
| 문서·행정 | `보고서·기획안 작성과 반복 행정 처리를 AI로 절반 이하로 줄이는 트랙입니다.` | `보고서·기획안 초안과 결재·정산 같은 반복 행정을 AI에 맡기는 법을 배웁니다.` | "절반 이하로 줄이는" is a fixed outcome claim (rule 4). Names 결재·정산 from the Q5 row. |
| 리서치·기획 | `자료 조사부터 요약·기획안 초안까지, 리서치 흐름 전체를 AI와 함께 재설계하는 트랙입니다.` | `자료 조사부터 요약, 기획안 초안까지 리서치 흐름을 AI와 함께 다시 짭니다.` | 재설계 → 다시 짜다; drops the "~하는 트랙입니다" frame repeated six times. |
| 데이터·수치 | `엑셀 정리·취합·분석 업무를 AI로 자동화해 숫자 다루는 시간을 크게 줄이는 트랙입니다.` | `엑셀 취합·정리·분석을 AI로 자동화해 숫자 만지는 시간을 줄이는 법을 익힙니다.` | Drops 크게 (unmeasured claim). |
| 영업·고객 | `고객 응대·제안서·팔로업 커뮤니케이션을 AI로 빠르고 일관되게 만드는 트랙입니다.` | `고객 응대, 제안서, 후속 연락을 AI로 빠르고 한결같이 처리하는 법을 익힙니다.` | 팔로업 커뮤니케이션 → 후속 연락. |
| 콘텐츠·마케팅 | `SNS·상세페이지·카피 제작 과정을 AI 워크플로우로 바꿔 제작 속도를 높이는 트랙입니다.` | `SNS·상세페이지·카피 제작을 AI 워크플로우로 바꿔 제작 속도를 끌어올립니다.` | Rhythm. |
| 관리·조율 | `회의·보고·일정 조율 등 팀을 움직이는 업무를 AI로 가볍게 만드는 트랙입니다.` | `회의, 보고, 일정 조율처럼 팀을 움직이는 일을 AI로 가볍게 만듭니다.` | Rhythm. |

Track names unchanged. These strings also feed the one-pager prompt in
`src/lib/onepager/generate.ts` (read-only there).

## Unchanged on purpose

- `src/lib/survey/questions.ts`: every title, subtitle, option, placeholder,
  section name, `Q5_TITLE`, and `B2B_PRIVACY_STATEMENT` is verbatim from the
  spec. Nothing edited.
- `src/app/solo/page.tsx`, `src/app/student/page.tsx`: screen titles, options,
  and the waitlist message are spec text. Nothing edited.
- `src/components/survey/SurveyFlow.tsx`: chrome strings (이전, 다음, 결과
  보기, 건너뛰기) already read naturally. Nothing edited.
- `src/components/survey/inputs.tsx`: `직무를 직접 입력해 주세요` placeholder
  is fine and only appears on Q3. `HOUR_BUCKET_LABELS` come from the spec.
- `src/components/Logo.tsx`: no user-facing copy; brand colors already match
  the new tokens.

## Spec conflicts flagged (not edited)

Spec-defined strings that read as translation or have a small issue. The spec
wins; Eric decides whether to revise `survey_schema_v1_1.md` first.

1. **Q7 subtitle** `“영혼 없이도 할 수 있는 일”을 골라 주세요.` The quoted
   idiom is fine Korean, but the spec puts the quote inside the question title;
   code renders it as a subtitle. Same words, different placement. Harmless.
2. **Q5-a option** `아니요, 제 업무에 집중합니다` reads as a self-description
   ("I focus on my own work") that a Korean respondent would more likely
   phrase as `아니요, 제 업무만 합니다`. Spec text kept.
3. **Q10 option** `일회성으로 몇 번 (검색 대용, 문장 다듬기)`: 일회성으로 is
   formal; `가끔 몇 번` is what people say. Spec text kept.
4. **Q12 option** `제한적 · 눈치 보임`: 눈치 보임 is a nominalised form; spoken
   would be `제한적이라 눈치 보여요`. Spec text kept; it does fit a short pill.
5. **Q18 title** `3개월 뒤 이 과정이 성공적이었다고 느끼려면?` is a clipped
   sentence; a fuller `3개월 뒤 "성공했다"고 느끼려면 무엇이 달라져야 할까요?`
   reads better. Spec text kept.
6. **Section 0 student door subtitle**: spec gives no subtitle for door 3;
   code shows `대학생 · 취업 준비생 · 이직 준비생`. Addition, not a conflict;
   left as is.
7. **Brand casing**: `layout.tsx` metadata (title, siteName, applicationName)
   still says `Innovlabs`; the landing now says `InnovLabs` to match the logo
   and the marketing site. `layout.tsx` belongs to the shell-login agent.

## Copy still in files I do not own (for the main session)

- `src/app/layout.tsx`: `SITE_TITLE` (`Innovlabs — 10분 AI 업무 진단`) and
  `SITE_DESCRIPTION` (`지금 하고 있는 업무를 알려주시면, 나에게 맞는 AI 워크플로우
  트랙을 찾아드립니다. 10분 무료 진단, 카드 등록 없음.`) match the old hero
  wording. Suggested: `InnovLabs — 10분 AI 업무 진단` and `지금 하시는 일을
  10분만 알려주세요. 맞는 AI 워크플로우 트랙과 그 영역에 매주 쓰는 시간을 바로
  보여드립니다. 무료, 카드 등록 없음.`
- `src/app/register/page.tsx` copy was not reviewed (register-profile agent).
