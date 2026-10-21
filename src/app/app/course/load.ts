// Server reads shared by the course pages: the learner's lab drafts (own rows
// through RLS) and what the own-work beats need around them. Mirrors
// /app/lab/work-map and /app/lab/drill so both formats write one record.

import { supabaseServer } from "@/lib/supabase/server";
import type { UserProfile } from "@/lib/profile/types";
import type { DrillDraft, WorkMapDraft } from "@/lib/courses/types";
import { emptyDraft, seedCategories } from "@/lib/courses/work-map";
import { draftFromSnapshot, emptyDrill, parseDrillDraft, parseWorkMapDraft, surveyHoursLabel } from "@/components/lab/rules";
import type { EditorCategory } from "@/components/lab/work-map/types";
import type { CourseLocalRow } from "@/lib/course/types";

export interface OwnWork {
  workMap: WorkMapDraft;
  drill: DrillDraft;
  categories: EditorCategory[];
  seedCategory: string;
  drillTask: string;
  /** Candidate #2 by name, for B1's "후보 2번으로 바꾸기" ("" without one). */
  drillTask2: string;
}

export async function loadOwnWork(profile: UserProfile): Promise<OwnWork> {
  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from("artifact_draft")
    .select("kind, data")
    .eq("user_id", profile.user_id)
    .in("kind", ["work_map", "drill"]);
  if (error) console.error("course draft read failed:", error.message);
  const rows = (data ?? []) as { kind: string; data: unknown }[];
  const stored = (kind: string) => rows.find((r) => r.kind === kind)?.data;

  const workMap =
    parseWorkMapDraft(stored("work_map")) ??
    (profile.work_map ? draftFromSnapshot(profile.work_map) : emptyDraft());

  const core = profile.core ?? {};
  const seeded = seedCategories(core);
  const categories: EditorCategory[] = [
    ...seeded.map((c) => {
      const answer = surveyHoursLabel(c.hours_survey);
      return { id: c.id, label: c.label, hint: c.hours_survey > 0 ? `주 ${answer}` : answer, extra: false };
    }),
    ...workMap.extraCategories.map((c) => ({ id: c.id, label: c.label, hint: null, extra: true })),
  ];

  // Seed rows go under the most repetitive category (survey Q7), else the
  // one with the most survey hours, else the first.
  const repetitive = typeof core.most_repetitive === "string" ? core.most_repetitive : "";
  const byHours = [...seeded].sort((a, b) => b.hours_survey - a.hours_survey)[0];
  const seedCategory = seeded.some((c) => c.id === repetitive)
    ? repetitive
    : byHours && byHours.hours_survey > 0
      ? byHours.id
      : (seeded[0]?.id ?? "a");

  // Candidates by name: the draft's pick, else the submitted map's rank.
  const candidate = (rank: 1 | 2): string => {
    const id = workMap.candidates[rank - 1]?.rowId;
    const fromDraft = workMap.rows.find((r) => r.id === id)?.task.trim() ?? "";
    if (fromDraft || !profile.work_map) return fromDraft;
    const c = profile.work_map.candidates.find((x) => x.rank === rank);
    return c ? (profile.work_map.rows[c.task_row]?.task ?? "") : "";
  };
  const drillTask = candidate(1);
  const drillTask2 = candidate(2);

  const drill = parseDrillDraft(stored("drill")) ?? emptyDrill(drillTask);
  return { workMap, drill, categories, seedCategory, drillTask, drillTask2 };
}

/** The mission's kept screen state (own row through RLS; migration 0013), or null. */
export async function loadCourseLocal(userId: string, missionId: string): Promise<CourseLocalRow | null> {
  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from("course_local")
    .select("user_id, mission_id, rounds, choices, slip, updated_at")
    .eq("user_id", userId)
    .eq("mission_id", missionId)
    .maybeSingle();
  if (error) console.error("course_local read failed:", error.message);
  return (data as CourseLocalRow | null) ?? null;
}

/** Whether the learner asked to be told when this level opens (own row through RLS). */
export async function loadInterest(userId: string, course: string, level: number): Promise<boolean> {
  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from("course_interest")
    .select("level")
    .eq("user_id", userId)
    .eq("course", course)
    .eq("level", level)
    .maybeSingle();
  if (error) console.error("course_interest read failed:", error.message);
  return !!data;
}
