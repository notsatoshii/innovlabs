// Server-only loaders for public.course_content (migration 0012). They read
// through the caller's own Supabase client: the select policy lets any
// signed-in user read mission content, and nobody but the seed script
// (service role) writes it. React cache() keeps one read per request, so a
// page and the helpers it calls share the rows.
//
// The rows were validated by scripts/course/seed-content.ts before they
// were written; here only the envelope is checked, so a hand-edited row
// cannot crash a page.

import { cache } from "react";
import { supabaseServer } from "@/lib/supabase/server";
import type { MissionContent } from "./types";

interface ContentRow {
  mission_id: string;
  course: string;
  level: number;
  ord: number;
  version: number;
  data: unknown;
}

function toMission(row: ContentRow): MissionContent | null {
  const d = row.data as Partial<MissionContent> | null;
  if (!d || typeof d !== "object" || d.version !== 1 || d.id !== row.mission_id || !Array.isArray(d.screens) || !d.caps) {
    console.error(`course_content row ${row.mission_id} is not a MissionContent; skipped`);
    return null;
  }
  return d as MissionContent;
}

/** One mission by id, or null when it does not exist (or the read failed). */
export const getMission = cache(async (id: string): Promise<MissionContent | null> => {
  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from("course_content")
    .select("mission_id, course, level, ord, version, data")
    .eq("mission_id", id)
    .maybeSingle();
  if (error) {
    console.error("course_content read failed:", error.message);
    return null;
  }
  return data ? toMission(data as ContentRow) : null;
});

/** Every mission of a course level in ord order, the skip test included (filter with onPath). */
export const getLevelMissions = cache(async (course: string, level: number): Promise<MissionContent[]> => {
  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from("course_content")
    .select("mission_id, course, level, ord, version, data")
    .eq("course", course)
    .eq("level", level)
    .order("ord", { ascending: true });
  if (error) {
    console.error("course_content read failed:", error.message);
    return [];
  }
  return ((data ?? []) as ContentRow[]).map(toMission).filter((m): m is MissionContent => m !== null);
});

/** Missions on the path (the skip test is not one). */
export function onPath(missions: MissionContent[]): MissionContent[] {
  return missions.filter((m) => m.kind !== "skip_test");
}

/** The level's skip test, if it has one. */
export function skipTestOf(missions: MissionContent[]): MissionContent | null {
  return missions.find((m) => m.kind === "skip_test") ?? null;
}
