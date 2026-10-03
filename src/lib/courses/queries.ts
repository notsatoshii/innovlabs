// Read helpers for the 코스 tab (docs/app/phases/phase-2.md, P3/P4/P9).
// Server only: getMyCohort reads through the learner's own Supabase client,
// so the select policies in 0007_courses.sql apply (own enrollment, and the
// cohorts the learner is enrolled in). The course content is static JSON
// under content/courses/, bundled at build time.

import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSession } from "@/lib/auth/session";
import { supabaseServer } from "@/lib/supabase/server";
import { TRACK_CODE_BY_ID, type TrackCode } from "@/lib/resources/types";
import { EVENT_TYPES } from "@/lib/profile/events";
import { isConfirmTrack } from "@/components/staff/format";
import { TRACKS } from "@/lib/survey/tracks";
import type { TrackId } from "@/lib/survey/types";
import {
  isWeekOpen,
  type Cohort,
  type CohortTrack,
  type CourseStructure,
  type Enrollment,
  type WeekContent,
  type WeekGate,
} from "@/lib/courses/types";
import structureJson from "../../../content/courses/structure.json";
import week1Json from "../../../content/courses/spine/week-1.json";
import week2Json from "../../../content/courses/spine/week-2.json";
import week3Json from "../../../content/courses/spine/week-3.json";

// --- Static content ---

// The contract types are the source of truth for the JSON shapes (same
// pattern as the 리소스 tab's stack.json).
export const COURSE_STRUCTURE: CourseStructure = structureJson as CourseStructure;

const WEEK_CONTENT: Record<number, WeekContent> = {
  1: week1Json as WeekContent,
  2: week2Json as WeekContent,
  3: week3Json as WeekContent,
};

export const TOTAL_WEEKS = 12;

export type StructureWeek = CourseStructure["weeks"][number];

/** The fixed-structure entry for week n, or null when n is not a course week. */
export function getStructureWeek(week: number): StructureWeek | null {
  return COURSE_STRUCTURE.weeks.find((w) => w.week === week) ?? null;
}

/** The learner-facing page content for week n (spine weeks only), or null. */
export function getWeekContent(week: number): WeekContent | null {
  return WEEK_CONTENT[week] ?? null;
}

/** The block (four-week stretch) that week n belongs to, or null. */
export function getBlockForWeek(week: number): CourseStructure["blocks"][number] | null {
  return COURSE_STRUCTURE.blocks.find((b) => week >= b.weeks[0] && week <= b.weeks[1]) ?? null;
}

// --- Enrollment ---

export interface MyCohort {
  enrollment: Enrollment;
  cohort: Cohort;
}

const COHORT_COLUMNS =
  "id,code,name,track_code,starts_on,schedule_note,venue,org_code,open_week,status,created_by,created_at";

/**
 * A learner's newest active enrollment with its cohort. The one rule for
 * "which cohort is this learner in": getMyCohort (pages) and weekOpenForUser
 * (routes) both use it, so a page and a route cannot disagree (plan review 2).
 * Pass the learner's own client (RLS: own rows), a staff client, or the
 * service role. "error" is a failed read, never "not enrolled".
 */
export async function findActiveCohort(
  client: SupabaseClient,
  userId: string,
): Promise<{ status: "ok"; mine: MyCohort } | { status: "none" } | { status: "error" }> {
  // The user_id filter matters: staff can select every enrollment row.
  const { data: rows, error } = await client
    .from("enrollment")
    .select("cohort_id,user_id,status,enrolled_at")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("enrolled_at", { ascending: false })
    .limit(1);
  if (error) {
    console.error("courses: enrollment read failed:", error.message);
    return { status: "error" };
  }
  const enrollment = (rows?.[0] as Enrollment | undefined) ?? null;
  if (!enrollment) return { status: "none" };

  const { data: cohort, error: cohortError } = await client
    .from("cohort")
    .select(COHORT_COLUMNS)
    .eq("id", enrollment.cohort_id)
    .maybeSingle();
  if (cohortError) {
    console.error("courses: cohort read failed:", cohortError.message);
    return { status: "error" };
  }
  if (!cohort) return { status: "none" };
  return { status: "ok", mine: { enrollment, cohort: cohort as Cohort } };
}

/**
 * The signed-in learner's active enrollment with its cohort, newest first,
 * or null when they are not enrolled. Wrapped in cache() so a layout and a
 * page share one lookup per request. A failed read (for example before
 * migration 0007 is applied) degrades to "not enrolled" on PAGES only;
 * routes use weekOpenForUser, which fails closed.
 */
export const getMyCohort = cache(async (): Promise<MyCohort | null> => {
  const session = await getSession();
  if (!session) return null;
  const found = await findActiveCohort(await supabaseServer(), session.user.id);
  return found.status === "ok" ? found.mine : null;
});

/**
 * D2: the instructor-confirmed track for the learner's current cohort, read
 * through the learner's own client (learner-visible track_confirmed events,
 * own rows only). Null until the cohort's Week 3 is open, so a track drafted
 * the day before is not seen before the room announcement. The 코스 tab and
 * 나의 AI 교육 both use it, so the two never name different tracks.
 */
export const getMyConfirmedTrack = cache(async (): Promise<{ track: TrackCode; at: string } | null> => {
  const mine = await getMyCohort();
  if (!mine || !isWeekOpenFor(mine, 3)) return null;
  const session = await getSession();
  if (!session) return null;
  const { data, error } = await (await supabaseServer())
    .from("profile_event")
    .select("created_at, track:data->>track, cohort_id:data->>cohort_id")
    .eq("user_id", session.user.id)
    .eq("type", EVENT_TYPES.track_confirmed)
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) console.error("track confirmation read failed:", error.message);
  const row = data as { created_at: string; track: string | null; cohort_id: string | null } | null;
  return row && row.cohort_id === mine.cohort.id && isConfirmTrack(row.track)
    ? { track: row.track, at: row.created_at }
    : null;
});

/**
 * D5: whether week n is open for this learner, for the routes that enforce
 * it (baseline lock, countersign). Same cohort rule as getMyCohort, same
 * isWeekOpen as the week page. Routes map: "closed" → 403 week_closed,
 * "not_enrolled" → 403 not_enrolled, "error" → 503 (fail closed).
 */
export async function weekOpenForUser(
  client: SupabaseClient,
  userId: string,
  week: number,
  now = new Date(),
): Promise<WeekGate> {
  const found = await findActiveCohort(client, userId);
  if (found.status === "error") return { state: "error" };
  if (found.status === "none") return { state: "not_enrolled" };
  const { cohort } = found.mine;
  if (isWeekOpen(cohort, week, now)) return { state: "open", cohort };
  const opens = weekOpensOn(cohort, week);
  return { state: "closed", cohort, opensOn: opens ? opens.toISOString() : null };
}

// --- Dates and week state ---

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Midnight in Seoul on the cohort's start date (same anchor as isWeekOpen). */
function startOf(cohort: Pick<Cohort, "starts_on">): Date | null {
  if (!cohort.starts_on) return null;
  const start = new Date(`${cohort.starts_on}T00:00:00+09:00`);
  return Number.isNaN(start.getTime()) ? null : start;
}

/**
 * The week the cohort is in right now: by date when the cohort has a start
 * date, otherwise the last week staff opened. Null before the first session,
 * after week 12, and for a finished cohort.
 */
export function currentWeek(
  cohort: Pick<Cohort, "open_week" | "starts_on" | "status">,
  now = new Date(),
): number | null {
  if (cohort.status === "done") return null;
  const start = startOf(cohort);
  if (start) {
    const week = Math.floor((now.getTime() - start.getTime()) / WEEK_MS) + 1;
    return week >= 1 && week <= TOTAL_WEEKS ? week : null;
  }
  return cohort.open_week >= 1 ? Math.min(cohort.open_week, TOTAL_WEEKS) : null;
}

/** The date week n opens by schedule, or null when the cohort has no start date. */
export function weekOpensOn(cohort: Pick<Cohort, "starts_on">, week: number): Date | null {
  const start = startOf(cohort);
  return start ? new Date(start.getTime() + (week - 1) * WEEK_MS) : null;
}

/** "10월 14일" in Seoul time. */
export function formatMonthDay(date: Date): string {
  return date.toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
    timeZone: "Asia/Seoul",
  });
}

// --- Timeline ---

export interface TimelineWeek extends StructureWeek {
  open: boolean;
  current: boolean;
}

export interface TimelineBlock {
  title: string;
  summary: string;
  from: number;
  to: number;
  weeks: TimelineWeek[];
}

/**
 * The 12-week structure grouped by block, with each week's open/locked state
 * for this cohort. Pass null for a learner who is not enrolled: every week
 * is locked and none is current.
 */
export function buildTimeline(
  cohort: Pick<Cohort, "open_week" | "starts_on" | "status"> | null,
  now = new Date(),
): TimelineBlock[] {
  const current = cohort ? currentWeek(cohort, now) : null;
  return COURSE_STRUCTURE.blocks.map((block) => ({
    title: block.title,
    summary: block.summary,
    from: block.weeks[0],
    to: block.weeks[1],
    weeks: COURSE_STRUCTURE.weeks
      .filter((w) => w.week >= block.weeks[0] && w.week <= block.weeks[1])
      .sort((a, b) => a.week - b.week)
      .map((w) => ({
        ...w,
        open: cohort ? isWeekOpen(cohort, w.week, now) : false,
        current: current === w.week,
      })),
  }));
}

/** Whether week n is open for this learner right now (false when not enrolled). */
export function isWeekOpenFor(mine: MyCohort | null, week: number, now = new Date()): boolean {
  return mine ? isWeekOpen(mine.cohort, week, now) : false;
}

// --- Track labels ---

const TRACK_ID_BY_CODE: Partial<Record<CohortTrack, TrackId>> = Object.fromEntries(
  Object.entries(TRACK_CODE_BY_ID).map(([id, code]) => [code, id as TrackId]),
);

// Codes with no app track (resources/types.ts): shown on a cohort card only.
const EXTRA_TRACK_LABEL: Partial<Record<CohortTrack, string>> = {
  SMB: "소규모 사업·스타트업 트랙",
  SPINE: "공통 과정",
};

/** Korean display name for a cohort's track code. */
export function cohortTrackLabel(code: CohortTrack): string {
  const id = TRACK_ID_BY_CODE[code];
  return (id && TRACKS[id]?.name) || EXTRA_TRACK_LABEL[code] || code;
}

/** The learner's own track card copy (name and one-liner), or null before a track is set. */
export function learnerTrack(trackId: TrackId | null | undefined): { name: string; oneLiner: string } | null {
  return (trackId && TRACKS[trackId]) || null;
}
