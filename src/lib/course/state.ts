// Derived learner state for the online course (LevelState in ./types.ts).
// Server only. Reads go through the caller's own Supabase client, so the
// select policies of migration 0012 apply (a learner reads own rows; staff
// read all, which is why every query also filters by user id).
//
// Status of a mission on the path: done when done_at is set; open when every
// mission it requires is done (default: the previous one by ord; the first
// one requires nothing); locked otherwise. The skip test is never on the path.

import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";
import { getLevelMissions, onPath, skipTestOf } from "./content";
import { SKIP_TEST_SECONDS, cappedTotals } from "./score";
import type { CourseProgressRow, CourseXpRow, LevelState, MissionContent, MissionState } from "./types";

export type MissionStatus = MissionState["status"];

/**
 * Level title and goal: `levelTitle` and `levelGoal` on any mission of the
 * level (MissionContent). Mission text stays out of this public repo, so
 * without them the title is empty and the map shows "레벨 n" alone.
 */
type LevelMeta = Pick<MissionContent, "levelTitle" | "levelGoal">;

type ProgressLite = Pick<CourseProgressRow, "mission_id" | "screen" | "done_at" | "result" | "updated_at">;

/**
 * A skip test's clock: the seconds since its start row when it has no result
 * and is still inside the limit, else null (no start, a result, or a stale
 * start the next open restarts).
 */
export function skipClockRunning(
  progress: Pick<CourseProgressRow, "result" | "updated_at"> | null,
  nowMs: number = Date.now(),
): number | null {
  if (!progress || progress.result) return null;
  const at = Date.parse(progress.updated_at);
  if (!Number.isFinite(at)) return null;
  const elapsed = Math.max(0, Math.round((nowMs - at) / 1000));
  return elapsed < SKIP_TEST_SECONDS ? elapsed : null;
}

/** The ids a path mission requires: explicit, or the previous mission by ord. */
export function requirementsOf(mission: MissionContent, path: MissionContent[]): string[] {
  if (mission.requires) return mission.requires;
  const before = path.filter((m) => m.ord < mission.ord).sort((a, b) => b.ord - a.ord);
  return before.length > 0 ? [before[0].id] : [];
}

export function statusOf(
  mission: MissionContent,
  path: MissionContent[],
  progress: ReadonlyMap<string, ProgressLite>,
): MissionStatus {
  if (progress.get(mission.id)?.done_at) return "done";
  return requirementsOf(mission, path).every((id) => !!progress.get(id)?.done_at) ? "open" : "locked";
}

async function readProgress(client: SupabaseClient, userId: string, ids: string[]): Promise<Map<string, ProgressLite>> {
  if (ids.length === 0) return new Map();
  const { data, error } = await client
    .from("course_progress")
    .select("mission_id, screen, done_at, result, updated_at")
    .eq("user_id", userId)
    .in("mission_id", ids);
  if (error) throw new Error(`course_progress read failed: ${error.message}`);
  return new Map(((data ?? []) as ProgressLite[]).map((r) => [r.mission_id, r]));
}

/** The learner's course_xp rows for some missions (all columns the engine uses). */
export async function readXpRows(
  client: SupabaseClient,
  userId: string,
  missionIds: string[],
): Promise<Pick<CourseXpRow, "id" | "mission_id" | "item" | "part" | "amount" | "correct">[]> {
  if (missionIds.length === 0) return [];
  const { data, error } = await client
    .from("course_xp")
    .select("id, mission_id, item, part, amount, correct")
    .eq("user_id", userId)
    .in("mission_id", missionIds)
    .order("id", { ascending: true });
  if (error) throw new Error(`course_xp read failed: ${error.message}`);
  return (data ?? []) as Pick<CourseXpRow, "id" | "mission_id" | "item" | "part" | "amount" | "correct">[];
}

export interface MissionAccess {
  status: MissionStatus;
  /** When the mission opened: the latest done_at of what it requires (null when it requires nothing). */
  openedAt: string | null;
  progress: ProgressLite | null;
}

/**
 * Whether the learner may play a mission now. For a skip test the status is
 * "open" while it has no result and no path mission of its level is done.
 */
export async function getMissionAccess(
  userId: string,
  mission: MissionContent,
  client?: SupabaseClient,
): Promise<MissionAccess> {
  const db = client ?? (await supabaseServer());
  const level = await getLevelMissions(mission.course, mission.level);
  const path = onPath(level);

  if (mission.kind === "skip_test") {
    const progress = await readProgress(db, userId, [mission.id, ...path.map((m) => m.id)]);
    const own = progress.get(mission.id) ?? null;
    const anyDone = path.some((m) => !!progress.get(m.id)?.done_at);
    return { status: own?.result ? "done" : anyDone ? "locked" : "open", openedAt: null, progress: own };
  }

  const requires = requirementsOf(mission, path);
  const progress = await readProgress(db, userId, [mission.id, ...requires]);
  const status = statusOf(mission, path, progress);
  let openedAt: string | null = null;
  for (const id of requires) {
    const at = progress.get(id)?.done_at;
    if (at && (!openedAt || at > openedAt)) openedAt = at;
  }
  return { status, openedAt, progress: progress.get(mission.id) ?? null };
}

/** The whole level for the level page and GET /api/course/state. Null when the level has no content. */
export async function getLevelState(
  userId: string,
  course: string,
  level: number,
  client?: SupabaseClient,
): Promise<LevelState | null> {
  const db = client ?? (await supabaseServer());
  const all = await getLevelMissions(course, level);
  const path = onPath(all);
  if (path.length === 0) return null;
  const skip = skipTestOf(all);

  const external = path.flatMap((m) => requirementsOf(m, path)).filter((id) => !path.some((m) => m.id === id));
  const ids = [...new Set([...path.map((m) => m.id), ...external, ...(skip ? [skip.id] : [])])];

  const [progress, xpRows, badgeRows] = await Promise.all([
    readProgress(db, userId, ids),
    readXpRows(
      db,
      userId,
      path.map((m) => m.id),
    ),
    db.from("course_badge").select("badge_id").eq("user_id", userId),
  ]);
  if (badgeRows.error) throw new Error(`course_badge read failed: ${badgeRows.error.message}`);
  const earned = new Set(((badgeRows.data ?? []) as { badge_id: string }[]).map((r) => r.badge_id));

  const missions: MissionState[] = path.map((m) => {
    const totals = cappedTotals(
      m,
      xpRows.filter((r) => r.mission_id === m.id),
    );
    const p = progress.get(m.id);
    return {
      id: m.id,
      title: m.title,
      minutes: m.minutes,
      boss: m.boss === true,
      status: statusOf(m, path, progress),
      screen: p?.screen ?? 0,
      xp: totals.total,
      xpMax: totals.max,
      parts: totals.parts,
    };
  });

  const badges: LevelState["badges"] = [];
  for (const m of path) {
    for (const b of m.badges ?? []) {
      if (badges.some((x) => x.id === b.id)) continue;
      badges.push({ id: b.id, label: b.label, earned: earned.has(b.id), ...(b.tool ? { tool: true } : {}) });
    }
  }

  const skipRow = skip ? progress.get(skip.id) : undefined;
  const skipResult = skipRow?.result === "passed" || skipRow?.result === "failed" ? skipRow.result : null;
  const anyDone = missions.some((m) => m.status === "done");

  const meta = all.map((m) => m as MissionContent & LevelMeta).find((m) => m.levelTitle || m.levelGoal);

  return {
    level,
    title: meta?.levelTitle ?? "",
    goal: meta?.levelGoal ?? "",
    xp: missions.reduce((s, m) => s + m.xp, 0),
    xpMax: missions.reduce((s, m) => s + m.xpMax, 0),
    missions,
    badges,
    skipTest: { available: !!skip && !anyDone && skipResult === null && !skipRow?.result, result: skipResult },
  };
}
