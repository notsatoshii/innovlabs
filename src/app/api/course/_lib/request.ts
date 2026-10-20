// Shared by the /api/course routes: body reading, id fields, the mission
// lookup with its lock check, and the capped mission total. The underscore
// folder keeps this out of routing. Every route calls requireLearner() before
// any of this and writes with the service role only after it.

import type { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { bad } from "@/lib/auth/guards";
import type { ApiError } from "@/lib/courses/types";
import { readJsonObject } from "@/app/api/artifacts/_lib/body";
import { getMission } from "@/lib/course/content";
import { cappedTotals } from "@/lib/course/score";
import { getMissionAccess, readXpRows, type MissionAccess } from "@/lib/course/state";
import { LOCAL_ID_RE, MISSION_ID_RE } from "@/lib/course/validate";
import type { MissionContent } from "@/lib/course/types";

/** Course requests are a few ids and one answer. */
export const COURSE_BODY_BYTES = 16 * 1024;

export async function readCourseBody(
  req: Request,
): Promise<{ body: Record<string, unknown> } | { response: NextResponse<ApiError> }> {
  return readJsonObject(req, COURSE_BODY_BYTES);
}

export function missionIdField(value: unknown): string | null {
  return typeof value === "string" && value.length <= 12 && MISSION_ID_RE.test(value) ? value : null;
}

export function localIdField(value: unknown): string | null {
  return typeof value === "string" && LOCAL_ID_RE.test(value) ? value : null;
}

export interface Playable {
  mission: MissionContent;
  access: MissionAccess;
}

/**
 * The mission and the learner's access to it. Unknown → 404; locked → 409
 * mission_locked. A skip test is refused unless `allowSkipTest` (only the
 * progress route's start record and the skip route take one).
 */
export async function loadPlayable(
  client: SupabaseClient,
  userId: string,
  missionId: string,
  allowSkipTest = false,
): Promise<Playable | { response: NextResponse<ApiError> }> {
  const mission = await getMission(missionId);
  if (!mission) return { response: bad("unknown_mission", 404) };
  if (mission.kind === "skip_test" && !allowSkipTest) return { response: bad("skip_test_route", 400) };
  let access: MissionAccess;
  try {
    access = await getMissionAccess(userId, mission, client);
  } catch (e) {
    console.error("course access read failed:", (e as Error).message);
    return { response: bad("read_failed", 500) };
  }
  if (access.status === "locked") return { response: bad("mission_locked", 409) };
  return { mission, access };
}

/** The capped mission total after a write (read back, so concurrent awards count). */
export async function missionXp(client: SupabaseClient, userId: string, mission: MissionContent): Promise<number> {
  const rows = await readXpRows(client, userId, [mission.id]);
  return cappedTotals(mission, rows).total;
}

/** Postgres unique violation: the item was already paid. */
export function isUniqueViolation(error: { code?: string } | null): boolean {
  return error?.code === "23505";
}
