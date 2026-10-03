// Labels and formatters for the staff pages (docs/app/phases/phase-2.md P2).
// Server-safe and client-safe: no Supabase, no next/headers. Korean strings
// here are staff-facing (해요체).

import { isWeekOpen, type Cohort, type CohortTrack, type Enrollment } from "@/lib/courses/types";
import type { EventType } from "@/lib/profile/events";
import { TRACKS } from "@/lib/survey/tracks";
import type { Path, TrackId } from "@/lib/survey/types";

export const TOTAL_WEEKS = 12;

/** Cohort track choices in the order the 새 코호트 form shows them. */
export const COHORT_TRACKS: { code: CohortTrack; label: string }[] = [
  { code: "DOC", label: TRACKS.docs_admin.name },
  { code: "RES", label: TRACKS.research_planning.name },
  { code: "DAT", label: TRACKS.data_numbers.name },
  { code: "SAL", label: TRACKS.sales_customer.name },
  { code: "CON", label: TRACKS.content_marketing.name },
  { code: "MGT", label: TRACKS.management_coordination.name },
  // SMB has no app track id and no Korean name in the repo yet (draft label).
  { code: "SMB", label: "사업자·스타트업 트랙" },
  { code: "SPINE", label: "공통 (SPINE)" },
];

export function isCohortTrack(value: unknown): value is CohortTrack {
  return typeof value === "string" && COHORT_TRACKS.some((t) => t.code === value);
}

export function cohortTrackLabel(code: string): string {
  return COHORT_TRACKS.find((t) => t.code === code)?.label ?? code;
}

export const COHORT_STATUS_LABEL: Record<Cohort["status"], string> = {
  planned: "시작 전",
  running: "진행 중",
  done: "종료",
};

export const ENROLLMENT_STATUS_LABEL: Record<Enrollment["status"], string> = {
  active: "수강 중",
  dropped: "중단",
  completed: "수료",
};

export const PATH_LABEL: Record<Path, string> = {
  hagwon: "학원 원장",
  employee: "직장인",
  solo: "1인 사업자·프리랜서",
  student: "학생·취업 준비생",
};

export function pathLabel(path: string | null | undefined): string {
  return (path && PATH_LABEL[path as Path]) || "확인 안 됨";
}

/** Track the survey assigned (user_profile.track), as a Korean name. */
export function surveyTrackLabel(track: string | null | undefined): string {
  if (!track) return "트랙 없음";
  return TRACKS[track as TrackId]?.name ?? track;
}

// --- Dates (everything is shown in Seoul time) ---

const SEOUL = "Asia/Seoul";
const DAY_MS = 24 * 60 * 60 * 1000;

function parse(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** 2026. 10. 6. */
export function fmtDate(iso: string | null | undefined): string {
  const date = parse(iso);
  if (!date) return "기록 없음";
  return date.toLocaleDateString("ko-KR", { timeZone: SEOUL, year: "numeric", month: "numeric", day: "numeric" });
}

/** 2026. 10. 6. 19:05 */
export function fmtDateTime(iso: string | null | undefined): string {
  const date = parse(iso);
  if (!date) return "기록 없음";
  return date.toLocaleString("ko-KR", {
    timeZone: SEOUL,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** A cohort's starts_on (YYYY-MM-DD, a Seoul calendar day) as 2026년 10월 6일 (화). */
export function fmtDay(ymd: string | null | undefined): string {
  const date = parse(ymd ? `${ymd}T00:00:00+09:00` : null);
  if (!date) return "정하지 않음";
  const day = date.toLocaleDateString("ko-KR", { timeZone: SEOUL, year: "numeric", month: "long", day: "numeric" });
  const weekday = date.toLocaleDateString("ko-KR", { timeZone: SEOUL, weekday: "short" });
  return `${day} (${weekday})`;
}

// --- Weeks ---

export interface WeekState {
  week: number;
  open: boolean;
  /** Why it is open: its date has come, or staff opened it early. */
  by: "date" | "override" | null;
  /** 10월 13일: the day this week opens by date; null without a start date. */
  opensOn: string | null;
}

/** Weeks 1 to 12 with their open state, split by date versus staff override. */
export function weekStates(cohort: Pick<Cohort, "open_week" | "starts_on">): WeekState[] {
  const start = parse(cohort.starts_on ? `${cohort.starts_on}T00:00:00+09:00` : null);
  return Array.from({ length: TOTAL_WEEKS }, (_, i) => {
    const week = i + 1;
    const byDate = isWeekOpen({ open_week: 0, starts_on: cohort.starts_on }, week);
    const open = isWeekOpen(cohort, week);
    const opensOn = start
      ? new Date(start.getTime() + i * 7 * DAY_MS).toLocaleDateString("ko-KR", {
          timeZone: SEOUL,
          month: "long",
          day: "numeric",
        })
      : null;
    return { week, open, by: byDate ? "date" : open ? "override" : null, opensOn };
  });
}

/** Highest open week (0 when none): open weeks always form a prefix 1..n. */
export function openThrough(cohort: Pick<Cohort, "open_week" | "starts_on">): number {
  return weekStates(cohort).filter((w) => w.open).length;
}

// --- Events ---

export const EVENT_LABEL: Record<EventType, string> = {
  fork_selected: "유형 선택",
  survey_completed: "진단 완료",
  track_assigned: "트랙 배정",
  track_overridden: "트랙 변경",
  stub_completed: "대기 신청 완료",
  registered: "회원가입",
  profile_updated: "프로필 수정",
  consent_given: "동의",
  one_pager_generated: "맞춤 리포트 생성",
  course_waitlist_joined: "과정 대기 신청",
  consult_requested: "상담 신청",
  enrolled: "코호트 등록",
  work_map_submitted: "워크맵 제출",
  drill_completed: "기본기 드릴 완료",
  time_log_entry: "시간 기록",
  harness_saved: "하네스 저장",
  correction_logged: "수정 기록",
  workspace_setup: "작업 환경 준비",
  blueprint_submitted: "파이프라인 설계 제출",
  baseline_locked: "기준선 확정",
  baseline_countersigned: "기준선 강사 확인",
  track_confirmed: "트랙 확정",
  lab_completed: "실습 완료",
  checkin: "체크인",
  instructor_note: "강사 메모",
  capstone_measured: "캡스톤 측정",
};

export function eventLabel(type: string): string {
  return EVENT_LABEL[type as EventType] ?? type;
}

/** One-line JSON for the event table; the full payload sits behind <details>. */
export function jsonPreview(data: unknown, max = 110): string {
  let text: string;
  try {
    text = JSON.stringify(data) ?? "";
  } catch {
    text = "";
  }
  if (!text || text === "{}") return "내용 없음";
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

/** 3.5 → "3.5", 4 → "4": weekly hours without trailing zeros. */
export function fmtHours(value: unknown): string {
  return typeof value === "number" && Number.isFinite(value) ? String(Math.round(value * 10) / 10) : "0";
}
