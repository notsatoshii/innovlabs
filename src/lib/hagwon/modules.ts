// Module catalog and result-page copy for the 학원 path (schema v0.2
// §Modules, §Result page). 합니다체, written from the 원장's seat. Nothing here
// promises an outcome number; the hours line is a range with a caveat.

import type { HoursBucket, ModuleId, PrepItem } from "./types";

export interface ModuleInfo {
  id: ModuleId;
  name: string;
  /** One line: what changes, from the 원장's point of view. */
  change: string;
  /** What the module covers, for the full result page. */
  scope: string;
}

export const MODULES: Record<ModuleId, ModuleInfo> = {
  M1: {
    id: "M1",
    name: "상담·소통 기록",
    change: "상담이 끝나면 요약이 기록으로 남고, 원장님은 확인만 하시면 됩니다.",
    scope: "통화·대면 상담 요약, 기록, 원장 확인, 학부모 공지와 답변 초안까지 포함합니다.",
  },
  M2: {
    id: "M2",
    name: "성적표·학습 분석·학습계획",
    change: "성적 데이터에서 성적표 초안과 다음 달 학습계획이 나옵니다. 강사는 다듬기만 합니다.",
    scope: "성적표, 학생별 학습 분석, 학습계획 초안을 다룹니다.",
  },
  M3: {
    id: "M3",
    name: "마케팅 콘텐츠",
    // Not "걸러 줍니다": the filter flags, it does not clear a post legally.
    change: "블로그·인스타 초안이 학원 말투로 나오고, 광고 규제에 걸릴 만한 표현은 표시해 드립니다. 최종 확인은 원장님께서 해 주셔야 합니다.",
    scope: "블로그·인스타 글 초안과 학원 광고 규제 필터를 다룹니다.",
  },
  M4: {
    id: "M4",
    name: "문제·시험 제작",
    change: "자체 교재를 바탕으로 문제와 숙제가 나옵니다. 내신·입시는 기출 분석과 모의고사까지 이어집니다.",
    scope: "자체 교재 기반 문제·숙제 제작. 내신·입시는 기출 분석과 모의고사를 포함합니다.",
  },
  M5: {
    id: "M5",
    name: "조기 이탈 경보",
    change: "결석이 늘거나 연락이 뜸해진 학생을 규칙에 따라 알려 줘서, 놓치기 전에 챙길 수 있습니다.",
    scope: "출결과 연락 기록을 규칙으로 살펴 이탈 위험을 알립니다.",
  },
};

export const HOURS_BUCKET_LABEL: Record<HoursBucket, string> = {
  counsel: "학부모 상담 기록·전달",
  report_cards: "성적표·피드백",
  worksheets: "문제·시험지 제작",
  marketing: "블로그·인스타",
  teacher_notices: "강사 보고·학부모 공지",
};

export const PREP_LABEL: Record<PrepItem, { title: string; body: string }> = {
  grades_to_excel: {
    title: "성적을 엑셀로 정리하기",
    body: "성적이 종이나 강사 개인 파일에 흩어져 있으면 성적표 모듈을 시작할 수 없습니다. 한 파일로 모으는 것이 첫 준비입니다.",
  },
  scan_past_exams: {
    title: "학교별 기출 스캔하기",
    body: "기출이 종이로만 있으면 기출 분석은 다음 단계로 미뤄집니다. 2년치를 스캔해 두면 바로 이어집니다.",
  },
};

export const OUT_OF_SCOPE = ["셔틀버스 운행", "예약 시스템 구축", "결제"] as const;

export const RESULT_COPY = {
  hoursLine: (low: number, high: number) =>
    `자동화해 볼 만한 시간은 주 ${low}~${high}시간 정도로 보입니다. 정확한 수치는 진단 상담에서 확인합니다.`,
  consultFirst:
    "지금은 특정 모듈보다 30분 진단 상담을 먼저 권합니다. 답변만으로는 어디서 시작할지 아직 뚜렷하지 않습니다.",
  starterSession:
    "AI를 아직 써 보지 않으셨다면 모듈에 앞서 '원장님 2시간 시작 세션'을 먼저 권합니다.",
  attendanceBilling:
    "출결·결제 정리는 지금 쓰시는 학원 관리 프로그램의 기능으로 해결하시는 편이 낫습니다.",
  /** Q3 ≠ 프로그램: there is no program whose feature could cover it. */
  attendanceBillingNoProgram:
    "출결·결제 정리는 학원 관리 프로그램을 도입해 해결하시는 편이 낫습니다.",
  /** hours.high < 1: a 주 0–1시간 range reads as nothing; say "under one" instead. */
  hoursUnderOne:
    "자동화해 볼 만한 시간은 주 1시간 미만으로 보입니다. 정확한 수치는 진단 상담에서 확인합니다.",
  cta: "30분 진단 상담 신청하기",
} as const;
