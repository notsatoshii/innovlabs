// 학원 AI 진단 (hagwon path), schema v0.2.
// Spec: docs/product/hagwon_survey_schema_v0.2.md — spec wins over code.
// Respondent is a 원장 (or 실장, flagged). Copy is 합니다체; the word "AI"
// appears only in Q11.

export const HAGWON_SCHEMA_VERSION = "hagwon-0.2";

export type Respondent = "director" | "manager" | "staff";
export type HagwonType = "kids" | "elementary" | "middle" | "high" | "adult" | "arts";
/** Q2 원생 band index: ~30 / 31–80 / 81–150 / 151–300 / 300+ */
export type StudentBand = 0 | 1 | 2 | 3 | 4;
/** Q2 강사 band index: 0 / 1–3 / 4–8 / 9+ */
export type TeacherBand = 0 | 1 | 2 | 3;
export type ManagementProgram = "program" | "excel" | "paper_kakao" | "none";

export type PainItem =
  | "counsel_records" // 학부모 상담 기록·전달
  | "report_cards" // 성적표·피드백 작성
  | "worksheets" // 문제·숙제·시험지 만들기
  | "marketing" // 블로그·인스타 글쓰기
  | "notices" // 학부모 공지·안내문
  | "dropout" // 결석·퇴원 챙기기
  | "teacher_reports" // 강사 보고 받고 확인하기
  | "attendance_billing"; // 출결·결제 정리

/** Q5a 월 상담 건수 band: ~10 / 11–30 / 31–80 / 80+ */
export type CounselBand = 0 | 1 | 2 | 3;
export type CounselRecord = "none" | "kakao" | "manual_excel" | "program";
/** Q6a: 없음 / 월 ~50명 / 월 51–150명 / 월 150명+ / 분기별 */
export type ReportBand = 0 | 1 | 2 | 3 | 4;
export type GradeStorage = "program" | "excel" | "paper" | "teacher_each";
/** Q7a 자체 제작 세트: 안 만듦 / 주 1–2 / 주 3–5 / 주 6+ */
export type WorksheetBand = 0 | 1 | 2 | 3;
export type PastExams = "none" | "paper_1y" | "paper_2y" | "scan_2y";
/** Q8a 게시: 안 함 / 월 1–3 / 주 1 / 주 2+ */
export type PostingBand = 0 | 1 | 2 | 3;
export type MarketingOwner = "director" | "staff" | "outsourced";
export type DropoutWatcher = "director" | "teacher" | "none" | "program";
export type TeacherTimeSink = "worksheets" | "report_cards" | "counsel" | "exam_analysis" | "unsure";
export type AiUsage = "never" | "tried" | "weekly" | "daily";

export interface HagwonAnswers {
  q0: Respondent;
  q1: HagwonType[];
  q2_students: StudentBand;
  q2_teachers: TeacherBand;
  q3: ManagementProgram;
  q3_name?: string; // when q3 = program
  q4: [PainItem, PainItem, PainItem]; // 1위, 2위, 3위
  q5a: CounselBand;
  q5b: CounselRecord;
  q6a: ReportBand;
  q6b: GradeStorage;
  q7a: WorksheetBand;
  q7b?: PastExams; // only when q1 includes middle or high
  q8a: PostingBand;
  q8b: MarketingOwner;
  q9: DropoutWatcher;
  q10: TeacherTimeSink;
  q11: AiUsage;
  q12?: string;
}

export type ModuleId = "M1" | "M2" | "M3" | "M4" | "M5";

export interface ModuleScore {
  id: ModuleId;
  rank: number; // 0..5
  volume: number; // 0..3
  friction: number; // 0..2
  teacherWeight: number; // 0 or 2
  total: number; // capped at 10
  gated: boolean; // true = excluded by its gate
  /** M4 only: 기출 분석 sub-feature unlocked (q7b = scan_2y). */
  pastExamAnalysis?: boolean;
}

export interface HagwonHours {
  /** Weekly hours by bucket, before rounding. */
  buckets: { key: HoursBucket; hours: number }[];
  total: number;
  low: number; // floor(0.8 × total)
  high: number; // ceil(1.2 × total)
  /** The two biggest buckets, for the result page. */
  top: HoursBucket[];
}

export type HoursBucket = "counsel" | "report_cards" | "worksheets" | "marketing" | "teacher_notices";

export type PrepItem = "grades_to_excel" | "scan_past_exams";

/** Stored in survey_response.scoring (jsonb) and recomputable from answers. */
export interface HagwonResult {
  kind: "hagwon";
  schema_version: typeof HAGWON_SCHEMA_VERSION;
  modules: ModuleScore[]; // all five, in M1..M5 order
  recommended: ModuleId[]; // top 2, third only if within 2 points of second
  /** true when the top score is below 4: show 먼저 30분 진단 상담 instead. */
  consultFirst: boolean;
  hours: HagwonHours;
  prep: PrepItem[]; // gates that nearly passed
  starterSession: boolean; // q11 = never → 원장님 2시간 시작 세션 first
  reliabilityFlag: boolean; // q0 ≠ director
  successGoal: string | null; // q12
}

export function isHagwonResult(value: unknown): value is HagwonResult {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { kind?: unknown }).kind === "hagwon" &&
    Array.isArray((value as { modules?: unknown }).modules)
  );
}
