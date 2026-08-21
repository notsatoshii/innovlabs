// Employee survey instrument v1.1 — question definitions.
// All user-facing text verbatim from survey_schema_v1_1.md (Korean, 존댓말).

import type { TaskClusterId } from "./types";

export type QuestionType = "single" | "multi" | "text";

export interface Option {
  id: string;
  label: string;
  /** Free-text follow-up, e.g. Q3 "기타 (직접 입력)". */
  otherInput?: boolean;
}

export interface QuestionDef {
  id: string;
  type: QuestionType;
  title: string;
  subtitle?: string;
  placeholder?: string;
  options?: Option[];
  optional?: boolean;
  multiline?: boolean;
}

/** Q5 task clusters (grid rows / sequential screens). */
export const TASK_CLUSTERS: { id: TaskClusterId; label: string }[] = [
  { id: "a", label: "보고서 · 기획안 · 문서 작성과 포맷팅" },
  { id: "b", label: "자료 조사 · 정보 수집 · 요약 정리" },
  { id: "c", label: "엑셀 · 데이터 정리, 취합, 분석" },
  { id: "d", label: "외부 고객 · 거래처 응대와 커뮤니케이션" },
  { id: "e", label: "콘텐츠 제작 (SNS, 상세페이지, 카피 등)" },
  { id: "f", label: "회의 참석 · 회의록 · 일정 조율" },
  { id: "g", label: "이메일 · 메신저 내부 커뮤니케이션" },
  { id: "h", label: "반복적 행정 처리 (결재, 정산, 취합, 입력)" },
];

const clusterOptions: Option[] = TASK_CLUSTERS.map((c) => ({ id: c.id, label: c.label }));

export const QUESTIONS: Record<string, QuestionDef> = {
  q1: {
    id: "q1",
    type: "single",
    title: "어떤 업종에서 일하고 계신가요?",
    options: [
      { id: "manufacturing", label: "제조 · 생산" },
      { id: "it_software", label: "IT · 소프트웨어" },
      { id: "finance_insurance", label: "금융 · 보험" },
      { id: "retail_ecommerce", label: "유통 · 이커머스" },
      { id: "education", label: "교육" },
      { id: "healthcare_bio", label: "의료 · 제약 · 바이오" },
      { id: "construction_realestate", label: "건설 · 부동산" },
      { id: "public_admin", label: "공공 · 행정" },
      { id: "media_content", label: "미디어 · 콘텐츠" },
      { id: "professional_services", label: "전문서비스 (법률 · 회계 · 컨설팅)" },
      { id: "other", label: "기타" },
    ],
  },
  q2: {
    id: "q2",
    type: "single",
    title: "회사(조직)의 규모는?",
    options: [
      { id: "size_1_4", label: "1–4명" },
      { id: "size_5_49", label: "5–49명" },
      { id: "size_50_299", label: "50–299명" },
      { id: "size_300_999", label: "300–999명" },
      { id: "size_1000_plus", label: "1,000명 이상" },
    ],
  },
  q3: {
    id: "q3",
    type: "single",
    title: "주로 어떤 직무에 가까운 일을 하시나요?",
    options: [
      { id: "admin_hr", label: "경영지원 · 인사 · 총무" },
      { id: "planning_strategy", label: "기획 · 전략" },
      { id: "marketing_content", label: "마케팅 · 콘텐츠" },
      { id: "sales_cs", label: "영업 · 고객관리" },
      { id: "data_analysis", label: "데이터 · 분석" },
      { id: "finance_accounting", label: "재무 · 회계" },
      { id: "dev_it", label: "개발 · IT" },
      { id: "production_logistics", label: "생산 · 품질 · 물류" },
      { id: "other", label: "기타 (직접 입력)", otherInput: true },
    ],
  },
  q4: {
    id: "q4",
    type: "single",
    title: "직급/연차는?",
    options: [
      { id: "staff", label: "사원 · 주임 (1–3년차)" },
      { id: "assistant", label: "대리 (3–7년차)" },
      { id: "manager_mid", label: "과장 · 차장" },
      { id: "team_lead", label: "팀장 · 부장" },
      { id: "executive", label: "임원 · 대표" },
    ],
  },
  q5a: {
    id: "q5a",
    type: "single",
    title: "다른 사람의 업무를 관리하거나 조율하는 역할인가요?",
    options: [
      { id: "none", label: "아니요, 제 업무에 집중합니다" },
      { id: "scope_1_3", label: "1–3명 정도 챙깁니다" },
      { id: "scope_4_10", label: "4–10명 팀을 관리합니다" },
      { id: "scope_10_plus", label: "10명 이상 · 여러 팀을 총괄합니다" },
    ],
  },
  // q5 (task_hours) is rendered by dedicated grid/sequential components.
  q6: {
    id: "q6",
    type: "single",
    title: "가장 많은 시간을 잡아먹는 업무 하나는?",
    options: clusterOptions,
  },
  q7: {
    id: "q7",
    type: "single",
    title: "가장 반복적 · 기계적으로 느껴지는 업무는?",
    subtitle: "“영혼 없이도 할 수 있는 일”을 골라 주세요.",
    options: clusterOptions,
  },
  q8: {
    id: "q8",
    type: "text",
    multiline: true,
    title: "매주(또는 매달) 반복하는 업무 하나를 구체적으로 알려주세요.",
    placeholder:
      "예: 매주 월요일 주간보고를 씁니다. 프로젝트 툴, 이메일, 공유 엑셀 세 군데에서 데이터를 모아 회사 양식에 맞춰 정리해 팀장님께 보내는데, 보통 2–3시간 걸립니다.",
  },
  q9: {
    id: "q9",
    type: "text",
    title: "그 업무에서 가장 답답하거나 번거로운 부분은?",
    placeholder: "한 문장으로 적어 주세요.",
  },
  q10: {
    id: "q10",
    type: "single",
    title: "AI 도구를 업무에 얼마나 활용하고 계신가요?",
    options: [
      { id: "none", label: "거의 사용 안 함" },
      { id: "few_times", label: "일회성으로 몇 번 (검색 대용, 문장 다듬기)" },
      { id: "weekly", label: "주 1회 이상" },
      { id: "daily", label: "거의 매일" },
      { id: "automation", label: "자동화 워크플로우까지 만들어 봄" },
    ],
  },
  q11: {
    id: "q11",
    type: "multi",
    title: "사용해 본 AI 도구는?",
    subtitle: "모두 선택해 주세요.",
    options: [
      { id: "chatgpt", label: "ChatGPT" },
      { id: "claude", label: "Claude" },
      { id: "gemini", label: "Gemini" },
      { id: "ms_copilot", label: "MS Copilot" },
      { id: "wrtn", label: "뤼튼" },
      { id: "perplexity", label: "Perplexity" },
      { id: "notebooklm", label: "NotebookLM" },
      { id: "other", label: "기타" },
      { id: "none", label: "없음" },
    ],
  },
  q12: {
    id: "q12",
    type: "single",
    title: "회사에서 AI 도구 사용이 자유로운가요?",
    options: [
      { id: "free", label: "자유로움" },
      { id: "approved_only", label: "승인된 도구만" },
      { id: "restricted", label: "제한적 · 눈치 보임" },
      { id: "unknown", label: "잘 모르겠음" },
    ],
  },
  q13: {
    id: "q13",
    type: "single",
    title: "업무용 PC 환경은?",
    options: [
      { id: "install_free", label: "설치 자유로움" },
      { id: "browser_only", label: "브라우저만 가능" },
      { id: "personal_device", label: "회사 PC는 제한, 개인 장비 병행 가능" },
      { id: "unknown", label: "잘 모르겠음" },
    ],
  },
  q14: {
    id: "q14",
    type: "multi",
    title: "주로 쓰는 협업 도구는?",
    subtitle: "모두 선택해 주세요.",
    options: [
      { id: "kakao_work", label: "카카오톡(업무)" },
      { id: "slack", label: "Slack" },
      { id: "ms_teams", label: "MS Teams" },
      { id: "groupware", label: "사내 그룹웨어" },
      { id: "notion", label: "Notion" },
      { id: "google_workspace", label: "Google Workspace" },
      { id: "ms_office_local", label: "MS Office(로컬)" },
      { id: "other", label: "기타" },
    ],
  },
  q15: {
    id: "q15",
    type: "single",
    title: "이 과정에서 가장 얻고 싶은 것은?",
    options: [
      { id: "time_back", label: "야근 줄이고 시간 확보" },
      { id: "performance", label: "업무 성과 · 평가 향상" },
      { id: "career_change", label: "이직 · 커리어 전환" },
      { id: "side_business", label: "사업 · 부업 성장" },
      { id: "team_productivity", label: "팀 · 조직 생산성" },
      { id: "keep_up_trends", label: "AI 트렌드 따라잡기" },
    ],
  },
  q16: {
    id: "q16",
    type: "text",
    title: "일주일에 10시간이 새로 생긴다면 무엇을 하시겠어요?",
    placeholder: "한 문장으로 적어 주세요.",
  },
  q17: {
    id: "q17",
    type: "single",
    title: "매주 학습에 현실적으로 쓸 수 있는 시간은?",
    options: [
      { id: "under_1h", label: "1시간 미만" },
      { id: "h1_2", label: "1–2시간" },
      { id: "h3_5", label: "3–5시간" },
      { id: "h5_plus", label: "5시간 이상" },
    ],
  },
  q18: {
    id: "q18",
    type: "single",
    title: "3개월 뒤 이 과정이 성공적이었다고 느끼려면?",
    options: [
      { id: "automate_one", label: "반복 업무 하나를 완전히 자동화" },
      { id: "halve_docs", label: "문서 작업 시간 절반으로" },
      { id: "confident_ai", label: "AI 도구를 자신 있게" },
      { id: "team_adoption", label: "배운 것을 팀에 도입" },
      { id: "apply_business", label: "사업 · 부업에 실제 적용" },
    ],
  },
  // B2B conditional (partner-link entrants only). Per-org option configuration
  // arrives in Phase 2; free text for the pilot.
  qb1: {
    id: "qb1",
    type: "text",
    title: "소속 부서를 알려주세요.",
    placeholder: "예: 경영지원팀",
  },
  qb2: {
    id: "qb2",
    type: "text",
    title: "소속 팀을 알려주세요. (선택)",
    placeholder: "예: 인사팀",
    optional: true,
  },
  attribution: {
    id: "attribution",
    type: "single",
    title: "이 진단을 어떻게 알게 되셨나요?",
    subtitle: "선택 문항입니다. 건너뛰셔도 괜찮아요.",
    optional: true,
    options: [
      { id: "search", label: "검색" },
      { id: "sns", label: "SNS · 유튜브" },
      { id: "referral", label: "지인 추천" },
      { id: "company", label: "회사 · 조직 안내" },
      { id: "other", label: "기타" },
    ],
  },
};

export const SECTION_NAMES: Record<number, string> = {
  1: "기본 정보",
  2: "업무 시간 분포",
  3: "대표 업무 심층",
  4: "도구 · 환경",
  5: "목표 · 기대",
  6: "소속 정보",
};

/** Question title for the Q5 block (both variants). */
export const Q5_TITLE =
  "지난 한 달 기준, 일주일 평균 아래 업무에 각각 몇 시간을 쓰시나요?";

/** B2B privacy statement shown to partner-link (org_code) entrants. */
export const B2B_PRIVACY_STATEMENT =
  "개별 응답은 회사에 공개되지 않으며, 통계 형태로만 제공됩니다.";
