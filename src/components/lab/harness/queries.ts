// Server-side reads for the Week 2 labs. Every function takes the learner's
// own Supabase client, so row-level security (own learner-visibility events
// only) is what scopes the result; the user_id filter is there for the index
// and for staff accounts, whose policy would otherwise return everyone's rows.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { HarnessDraftItem } from "@/lib/courses/types";
import { EVENT_TYPES } from "@/lib/profile/events";
import { collapseCorrections, harnessFromSaved, type CorrectionLine } from "@/components/lab/rules";

export interface SavedHarness {
  /** Latest saved version, as numbered by the server. */
  version: number;
  saved_at: string; // ISO
  item: HarnessDraftItem;
}

/**
 * The newest harness_saved event id for each of the learner's harnesses,
 * newest save first. Reads only the id out of each payload, so a long
 * version history costs a few bytes a row instead of a whole harness.
 */
async function latestHarnessEventIds(supabase: SupabaseClient, userId: string): Promise<number[]> {
  const { data, error } = await supabase
    .from("profile_event")
    .select("id, data->>harness_id")
    .eq("user_id", userId)
    .eq("type", EVENT_TYPES.harness_saved)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(1000);
  if (error) console.error("saved harness list failed:", error.message);

  const seen = new Set<string>();
  const ids: number[] = [];
  for (const row of (data ?? []) as unknown as { id: number; harness_id: string | null }[]) {
    if (!row.harness_id || seen.has(row.harness_id)) continue;
    seen.add(row.harness_id);
    ids.push(row.id);
  }
  return ids;
}

/** How many harnesses the learner has saved at least once. */
export async function countSavedHarnesses(supabase: SupabaseClient, userId: string): Promise<number> {
  return (await latestHarnessEventIds(supabase, userId)).length;
}

/** The latest saved version of each of the learner's harnesses, newest save first. */
export async function loadSavedHarnesses(supabase: SupabaseClient, userId: string): Promise<SavedHarness[]> {
  const ids = await latestHarnessEventIds(supabase, userId);
  if (ids.length === 0) return [];

  const { data, error } = await supabase
    .from("profile_event")
    .select("id, created_at, data")
    .eq("user_id", userId)
    .eq("type", EVENT_TYPES.harness_saved)
    .in("id", ids);
  if (error) console.error("saved harness read failed:", error.message);

  const byId = new Map<number, SavedHarness>();
  for (const row of (data ?? []) as { id: number; created_at: string; data: unknown }[]) {
    const parsed = harnessFromSaved(row.data);
    if (parsed) byId.set(row.id, { version: parsed.version, saved_at: row.created_at, item: parsed.item });
  }
  return ids.flatMap((id) => {
    const saved = byId.get(id);
    return saved ? [saved] : [];
  });
}

/** The learner's correction log, collapsed to one entry per line, newest first. */
export async function loadCorrectionLines(supabase: SupabaseClient, userId: string): Promise<CorrectionLine[]> {
  const { data, error } = await supabase
    .from("profile_event")
    .select("id, created_at, data")
    .eq("user_id", userId)
    .eq("type", EVENT_TYPES.correction_logged)
    .order("created_at", { ascending: false })
    .limit(1000);
  if (error) console.error("correction log read failed:", error.message);
  return collapseCorrections((data ?? []) as { id: number; created_at: string; data: unknown }[]);
}
