// Server reads shared by the course pages: the learner's lab drafts (own rows
// through RLS) and what the own-work beats need around them. Mirrors
// /app/lab/work-map and /app/lab/drill so both formats write one record.

import { supabaseServer } from "@/lib/supabase/server";
import type { UserProfile } from "@/lib/profile/types";
import type { DrillDraft, WorkMapDraft } from "@/lib/courses/types";
import { emptyDraft, seedCategories } from "@/lib/courses/work-map";
import { draftFromSnapshot, emptyDrill, parseDrillDraft, parseWorkMapDraft, surveyHoursLabel } from "@/components/lab/rules";
import type { EditorCategory } from "@/components/lab/work-map/types";

export interface OwnWork {
  workMap: WorkMapDraft;
  drill: DrillDraft;
  categories: EditorCategory[];
  seedCategory: string;
  drillTask: string;
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

  // Candidate #1 by name: the draft's first candidate, else the submitted map's rank 1.
  const firstId = workMap.candidates[0]?.rowId;
  let drillTask = workMap.rows.find((r) => r.id === firstId)?.task.trim() ?? "";
  if (!drillTask && profile.work_map) {
    const rank1 = profile.work_map.candidates.find((c) => c.rank === 1);
    drillTask = rank1 ? (profile.work_map.rows[rank1.task_row]?.task ?? "") : "";
  }

  const drill = parseDrillDraft(stored("drill")) ?? emptyDrill(drillTask);
  return { workMap, drill, categories, seedCategory, drillTask };
}
