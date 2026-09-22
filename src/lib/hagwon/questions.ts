// 학원 AI 진단 questions, schema v0.2 §Questions. Copy is the schema's,
// 합니다체. The word "AI" appears only in Q11 (schema rule). Option ids are
// the values stored in answers; labels are what the 원장 sees.

import type { HagwonAnswers, PainItem } from "./types";

export interface Option<T extends string | number = string> {
  id: T;
  label: string;
}

export const Q0_RESPONDENT: Option<HagwonAnswers["q0"]>[] = [
  { id: "director", label: "원장" },
  { id: "manager", label: "실장·부원장" },
  { id: "staff", label: "직원" },
];

export const Q1_TYPES: Option<HagwonAnswers["q1"][number]>[] = [
  { id: "kids", label: "유아" },
  { id: "elementary", label: "초등" },
  { id: "middle", label: "중등 내신" },
  { id: "high", label: "고등 입시" },
  { id: "adult", label: "성인·어학" },
  { id: "arts", label: "예체능" },
];

export const Q2_STUDENTS: Option<HagwonAnswers["q2_students"]>[] = [
  { id: 0, label: "~30명" },
  { id: 1, label: "31–80명" },
  { id: 2, label: "81–150명" },
  { id: 3, label: "151–300명" },
  { id: 4, label: "300명 이상" },
];

export const Q2_TEACHERS: Option<HagwonAnswers["q2_teachers"]>[] = [
  { id: 0, label: "0명" },
  { id: 1, label: "1–3명" },
  { id: 2, label: "4–8명" },
  { id: 3, label: "9명 이상" },
];

export const Q3_PROGRAM: Option<HagwonAnswers["q3"]>[] = [
  { id: "program", label: "학원 관리 프로그램을 씁니다 (이름 입력)" },
  { id: "excel", label: "엑셀만 씁니다" },
  { id: "paper_kakao", label: "종이나 카톡으로 관리합니다" },
  { id: "none", label: "따로 없습니다" },
];

export const Q4_PAIN: Option<PainItem>[] = [
  { id: "counsel_records", label: "학부모 상담 기록·전달" },
  { id: "report_cards", label: "성적표·피드백 작성" },
  { id: "worksheets", label: "문제·숙제·시험지 만들기" },
  { id: "marketing", label: "블로그·인스타 글쓰기" },
  { id: "notices", label: "학부모 공지·안내문" },
  { id: "dropout", label: "결석·퇴원 챙기기" },
  { id: "teacher_reports", label: "강사 보고 받고 확인하기" },
  { id: "attendance_billing", label: "출결·결제 정리" },
];

export const Q5A_COUNSEL: Option<HagwonAnswers["q5a"]>[] = [
  { id: 0, label: "월 10건 이하" },
  { id: 1, label: "월 11–30건" },
  { id: 2, label: "월 31–80건" },
  { id: 3, label: "월 80건 이상" },
];

export const Q5B_RECORD: Option<HagwonAnswers["q5b"]>[] = [
  { id: "none", label: "기록하지 않습니다" },
  { id: "kakao", label: "카톡에 남아 있습니다" },
  { id: "manual_excel", label: "수기나 엑셀에 적습니다" },
  { id: "program", label: "프로그램에 입력합니다" },
];

export const Q6A_REPORTS: Option<HagwonAnswers["q6a"]>[] = [
  { id: 0, label: "성적표를 보내지 않습니다" },
  { id: 1, label: "월 50명 이하" },
  { id: 2, label: "월 51–150명" },
  { id: 3, label: "월 150명 이상" },
  { id: 4, label: "분기별로 보냅니다" },
];

export const Q6B_STORAGE: Option<HagwonAnswers["q6b"]>[] = [
  { id: "program", label: "프로그램" },
  { id: "excel", label: "엑셀" },
  { id: "paper", label: "종이" },
  { id: "teacher_each", label: "강사가 각자 보관합니다" },
];

export const Q7A_WORKSHEETS: Option<HagwonAnswers["q7a"]>[] = [
  { id: 0, label: "만들지 않습니다" },
  { id: 1, label: "주 1–2세트" },
  { id: 2, label: "주 3–5세트" },
  { id: 3, label: "주 6세트 이상" },
];

export const Q7B_PAST_EXAMS: Option<NonNullable<HagwonAnswers["q7b"]>>[] = [
  { id: "none", label: "없습니다" },
  { id: "paper_1y", label: "1년치, 종이로" },
  { id: "paper_2y", label: "2년치 이상, 종이로" },
  { id: "scan_2y", label: "2년치 이상, 스캔·파일로" },
];

export const Q8A_POSTING: Option<HagwonAnswers["q8a"]>[] = [
  { id: 0, label: "올리지 않습니다" },
  { id: 1, label: "월 1–3회" },
  { id: 2, label: "주 1회" },
  { id: 3, label: "주 2회 이상" },
];

export const Q8B_OWNER: Option<HagwonAnswers["q8b"]>[] = [
  { id: "director", label: "원장이 직접 씁니다" },
  { id: "staff", label: "직원이나 강사가 씁니다" },
  { id: "outsourced", label: "외주를 맡깁니다" },
];

export const Q9_WATCHER: Option<HagwonAnswers["q9"]>[] = [
  { id: "director", label: "원장이 챙깁니다" },
  { id: "teacher", label: "강사가 챙깁니다" },
  { id: "none", label: "따로 챙기는 사람이 없습니다" },
  { id: "program", label: "프로그램이 알려 줍니다" },
];

export const Q10_TEACHER_SINK: Option<HagwonAnswers["q10"]>[] = [
  { id: "worksheets", label: "문제·숙제 제작" },
  { id: "report_cards", label: "성적표·피드백" },
  { id: "counsel", label: "상담·기록" },
  { id: "exam_analysis", label: "시험 분석" },
  { id: "unsure", label: "잘 모르겠습니다" },
];

export const Q11_AI_USAGE: Option<HagwonAnswers["q11"]>[] = [
  { id: "never", label: "써 본 적이 없습니다" },
  { id: "tried", label: "써 본 적은 있습니다" },
  { id: "weekly", label: "주 1–2회 씁니다" },
  { id: "daily", label: "거의 매일 씁니다" },
];

/** Screen titles, in order. Q4 is three single-select screens (schema fallback). */
export const QUESTION_TITLES = {
  q0: "설문에 답하시는 분은 누구입니까?",
  q1: "어떤 학원입니까? 해당하는 것을 모두 골라 주세요.",
  q2: "학원 규모를 알려 주세요.",
  q2_students: "원생 수",
  q2_teachers: "강사 수 (원장 제외)",
  q3: "학원 관리는 무엇으로 하고 계십니까?",
  q3_name: "프로그램 이름",
  q4_1: "지금 가장 없애고 싶은 일은 무엇입니까? 첫 번째로 골라 주세요.",
  q4_2: "두 번째로 없애고 싶은 일은 무엇입니까?",
  q4_3: "세 번째로 없애고 싶은 일은 무엇입니까?",
  q5: "학부모 상담은 어느 정도입니까?",
  q5a: "월 상담 건수 (전화와 대면을 합쳐서)",
  q5b: "상담 내용은 어떻게 기록합니까?",
  q6: "성적표는 어떻게 하고 계십니까?",
  q6a: "성적표나 학습 리포트를 받는 학생 수와 주기",
  q6b: "성적은 어디에 저장합니까?",
  q7: "문제와 시험지는 어떻게 만드십니까?",
  q7a: "자체 제작 프린트·시험지",
  q7b: "학교별 기출 문제를 갖고 계십니까?",
  q8: "블로그나 인스타그램은 어떻게 운영하십니까?",
  q8a: "게시 빈도",
  q8b: "누가 씁니까?",
  q9: "결석이 늘거나 학부모 연락이 뜸해지는 학생은 누가 정기적으로 챙깁니까?",
  q10: "강사들이 수업 외에 가장 시간을 많이 쓰는 일은 무엇입니까? 하나만 골라 주세요.",
  q11: "원장님은 ChatGPT 같은 AI를 얼마나 쓰십니까?",
  q12: "3개월 뒤 이것 하나가 해결되면 성공입니다. (선택)",
} as const;
