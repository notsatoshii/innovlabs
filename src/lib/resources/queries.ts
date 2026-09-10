// Read helpers for the 리소스 tab (docs/app/phases/phase-1.md §6). Server
// only: the caller passes the user's Supabase server client, so the select
// policies apply (tools with status = 'draft' never reach the page).

import type { SupabaseClient } from "@supabase/supabase-js";
import type { DepthFlag } from "@/lib/survey/types";
import {
  TRACK_CODE_BY_ID,
  type GlossaryEntry,
  type ToolEntry,
  type ToolPath,
  type TrackCode,
} from "@/lib/resources/types";

export async function fetchTools(supabase: SupabaseClient): Promise<ToolEntry[]> {
  const { data, error } = await supabase
    .from("tools")
    .select(
      "id,name,url,category,tags,difficulty,status,paths,tracks,license,cost,what_it_is,use_it_to,why_it_matters,watch_out,korean_notes,stars,stars_dated,last_verified,sort_order",
    )
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });
  if (error) throw new Error(`tools: ${error.message}`);
  return (data ?? []) as ToolEntry[];
}

export async function fetchGlossary(supabase: SupabaseClient): Promise<GlossaryEntry[]> {
  const { data, error } = await supabase
    .from("glossary")
    .select("id,term,loanword,analogy,meaning,sort_order")
    .order("sort_order", { ascending: true })
    .order("term", { ascending: true });
  if (error) throw new Error(`glossary: ${error.message}`);
  return (data ?? []) as GlossaryEntry[];
}

/** The learner's tool path from the survey depth flag; null when unknown. */
export function learnerPath(depthFlag: DepthFlag | null | undefined): ToolPath | null {
  if (depthFlag === "browser_only") return "browser";
  if (depthFlag === "full_agent") return "agent";
  return null;
}

/** Curriculum track code for an app track id; null when the map has no entry. */
export function learnerTrackCode(trackId: string | null | undefined): TrackCode | null {
  return (trackId && TRACK_CODE_BY_ID[trackId]) || null;
}

/**
 * Default order for the library: tools tagged with the learner's track
 * first, then tools on the learner's path, then sort_order (ties by id).
 * Tools with no track tag are for every track, so they do not count as a
 * track match. Stable: the input is already sorted by sort_order.
 */
export function orderToolsForLearner(
  tools: ToolEntry[],
  track: TrackCode | null,
  path: ToolPath | null,
): ToolEntry[] {
  const rank = (t: ToolEntry): number => {
    let r = 0;
    if (path && t.paths.includes(path)) r -= 2; // plan §6: own path first
    if (track && (t.tracks.length === 0 || t.tracks.includes(track))) r -= 1; // then own track (empty = all)
    return r;
  };
  return [...tools].sort(
    (a, b) => rank(a) - rank(b) || a.sort_order - b.sort_order || a.id.localeCompare(b.id),
  );
}
