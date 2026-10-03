// Reads for the Week 2 and Week 3 cards on /staff/learner/[userId]
// (phase-2c C7). Every function takes the staff member's own server client:
// the staff select policies are what allow it. One query per event type,
// each with its own limit and a `truncated` flag when it hits it (PostgREST
// caps silently), and JSON-path selects instead of whole harness payloads:
// the harness example is never read here (HarnessExample loads it on open).
// Events, not snapshots, except the baseline (the page reads
// user_profile.baseline, the object the countersign stamps).

import type { SupabaseClient } from "@supabase/supabase-js";
import { EVENT_TYPES, type BlueprintSubmittedPayload } from "@/lib/profile/events";
import type { TrackCode } from "@/lib/resources/types";
import type { WorkspaceInput } from "@/lib/courses/types";
import { collapseCorrections, isDryRunEntry, minutesBetween, pendingRuleCount } from "@/components/lab/rules";
import { beforeEntriesFrom, blueprintFromSaved, parseWorkspaceInput } from "@/components/lab/rules-week3";
import { isConfirmTrack } from "./format";

const HARNESS_ID_LIMIT = 1000;
const CORRECTION_LIMIT = 1000;
const BEFORE_LIMIT = 50;

// --- Week 2 ---

export interface StaffHarness {
  /** The newest harness_saved event of this harness. */
  event_id: number;
  harness_id: string;
  name: string;
  doc_type: string;
  template_id: string | null;
  version: number;
  saved_at: string;
  /** How many times it was saved. */
  saves: number;
  role: string;
  context: string;
  format: string;
  rules: string[];
  fallbacks: string;
  has_example: boolean;
  corrections: number;
  /** Recurring corrections not written as a rule yet. */
  pending: number;
}

export interface Week2Data {
  harnesses: StaffHarness[];
  corrections: number;
  pending: number;
  /** Corrections whose harness_id matches none of the saved harnesses. */
  orphanCorrections: number;
  truncated: boolean;
  failed: boolean;
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export async function loadWeek2(supabase: SupabaseClient, userId: string): Promise<Week2Data> {
  const [idsResult, correctionResult] = await Promise.all([
    supabase
      .from("profile_event")
      .select("id, created_at, harness_id:data->>harness_id")
      .eq("user_id", userId)
      .eq("type", EVENT_TYPES.harness_saved)
      .order("id", { ascending: false })
      .limit(HARNESS_ID_LIMIT),
    supabase
      .from("profile_event")
      .select("id, created_at, data")
      .eq("user_id", userId)
      .eq("type", EVENT_TYPES.correction_logged)
      .order("id", { ascending: false })
      .limit(CORRECTION_LIMIT),
  ]);

  // Newest event per harness, and how many saves each has.
  const latest = new Map<string, number>();
  const saves = new Map<string, number>();
  const idRows = (idsResult.data ?? []) as unknown as { id: number; created_at: string; harness_id: string | null }[];
  for (const row of idRows) {
    if (!row.harness_id) continue;
    if (!latest.has(row.harness_id)) latest.set(row.harness_id, row.id);
    saves.set(row.harness_id, (saves.get(row.harness_id) ?? 0) + 1);
  }
  const latestIds = [...latest.values()];

  let detailRows: Record<string, unknown>[] = [];
  let withExample = new Set<number>();
  let detailFailed = false;
  if (latestIds.length > 0) {
    const [detailResult, exampleResult] = await Promise.all([
      supabase
        .from("profile_event")
        .select(
          "id, created_at, harness_id:data->>harness_id, version:data->harness_version, name:data->>name, doc_type:data->>doc_type, template_id:data->>template_id, role:data->parts->>role, context:data->parts->>context, format:data->parts->>format, rules:data->parts->rules, fallbacks:data->parts->>fallbacks",
        )
        .eq("user_id", userId)
        .eq("type", EVENT_TYPES.harness_saved)
        .in("id", latestIds),
      // Whether each has an example, without reading the example itself.
      supabase
        .from("profile_event")
        .select("id")
        .eq("user_id", userId)
        .eq("type", EVENT_TYPES.harness_saved)
        .in("id", latestIds)
        .neq("data->parts->>example", ""),
    ]);
    detailFailed = !!detailResult.error || !!exampleResult.error;
    detailRows = (detailResult.data ?? []) as unknown as Record<string, unknown>[];
    withExample = new Set(((exampleResult.data ?? []) as { id: number }[]).map((r) => r.id));
  }

  const lines = collapseCorrections((correctionResult.data ?? []) as { id: number; created_at: string; data: unknown }[]);
  const harnesses: StaffHarness[] = detailRows
    .map((row) => {
      const harnessId = str(row.harness_id);
      const mine = lines.filter((line) => line.harness_id === harnessId);
      return {
        event_id: row.id as number,
        harness_id: harnessId,
        name: str(row.name).trim() || "이름 없는 하네스",
        doc_type: str(row.doc_type).trim(),
        template_id: str(row.template_id) || null,
        version: typeof row.version === "number" ? row.version : 1,
        saved_at: str(row.created_at),
        saves: saves.get(harnessId) ?? 1,
        role: str(row.role),
        context: str(row.context),
        format: str(row.format),
        rules: (Array.isArray(row.rules) ? row.rules : []).filter((r): r is string => typeof r === "string"),
        fallbacks: str(row.fallbacks),
        has_example: withExample.has(row.id as number),
        corrections: mine.length,
        pending: pendingRuleCount(mine),
      };
    })
    .sort((a, b) => b.event_id - a.event_id);

  const known = new Set(harnesses.map((h) => h.harness_id));
  return {
    harnesses,
    corrections: lines.length,
    pending: pendingRuleCount(lines),
    orphanCorrections: lines.filter((line) => !known.has(line.harness_id)).length,
    truncated: idRows.length >= HARNESS_ID_LIMIT || (correctionResult.data ?? []).length >= CORRECTION_LIMIT,
    failed: !!idsResult.error || !!correctionResult.error || detailFailed,
  };
}

// --- Week 3 ---

export interface Week3Data {
  workspace: { at: string; input: WorkspaceInput; count: number } | null;
  blueprint: { event_id: number; at: string; payload: BlueprintSubmittedPayload; count: number } | null;
  /** The newest dry run (a time log entry with dry_run). */
  dryRun: { at: string; minutes: number } | null;
  /** The newest "before" entry (dry runs excluded), for when no baseline is locked yet. */
  newestBefore: { at: string; minutes: number } | null;
  /**
   * The newest track_confirmed event and the cohort it was made for. The
   * page shows it as current only when cohortId is the learner's active
   * cohort (the learner's own rule, getMyConfirmedTrack).
   */
  confirmedTrack: { track: TrackCode; at: string; cohortId: string | null } | null;
  failed: boolean;
}

export async function loadWeek3(supabase: SupabaseClient, userId: string): Promise<Week3Data> {
  const byType = (type: string) =>
    supabase.from("profile_event").select("id, created_at, data", { count: "exact" }).eq("user_id", userId).eq("type", type);

  const [workspaceResult, blueprintResult, dryRunResult, beforeResult, trackResult] = await Promise.all([
    byType(EVENT_TYPES.workspace_setup).order("id", { ascending: false }).limit(1),
    byType(EVENT_TYPES.blueprint_submitted).order("id", { ascending: false }).limit(1),
    supabase
      .from("profile_event")
      .select("id, created_at, data")
      .eq("user_id", userId)
      .eq("type", EVENT_TYPES.time_log_entry)
      .not("data->dry_run", "is", null)
      .order("id", { ascending: false })
      .limit(1),
    supabase
      .from("profile_event")
      .select("id, created_at, data")
      .eq("user_id", userId)
      .eq("type", EVENT_TYPES.time_log_entry)
      .eq("data->>method", "before")
      .order("id", { ascending: false })
      .limit(BEFORE_LIMIT),
    supabase
      .from("profile_event")
      .select("id, created_at, track:data->>track, cohort_id:data->>cohort_id")
      .eq("user_id", userId)
      .eq("type", EVENT_TYPES.track_confirmed)
      .order("id", { ascending: false })
      .limit(1),
  ]);

  type Row = { id: number; created_at: string; data: unknown };

  const workspaceRow = (workspaceResult.data?.[0] as Row | undefined) ?? null;
  const workspaceInput = workspaceRow ? parseWorkspaceInput(workspaceRow.data) : null;

  const blueprintRow = (blueprintResult.data?.[0] as Row | undefined) ?? null;
  const blueprint = blueprintRow ? blueprintFromSaved(blueprintRow.data) : null;

  const dryRow = (dryRunResult.data?.[0] as Row | undefined) ?? null;
  let dryRun: Week3Data["dryRun"] = null;
  if (dryRow && isDryRunEntry(dryRow.data)) {
    const d = dryRow.data as { started_at?: unknown; ended_at?: unknown };
    const minutes =
      typeof d.started_at === "string" && typeof d.ended_at === "string" ? minutesBetween(d.started_at, d.ended_at) : null;
    // The day the run was done, the date the learner's own screens show.
    if (minutes !== null && minutes >= 0) dryRun = { at: d.started_at as string, minutes };
  }

  const before = beforeEntriesFrom((beforeResult.data ?? []) as Row[])[0];
  const newestBefore = before
    ? { at: before.started_at, minutes: minutesBetween(before.started_at, before.ended_at) ?? 0 }
    : null;

  const trackRow =
    (trackResult.data?.[0] as { created_at: string; track: unknown; cohort_id: string | null } | undefined) ?? null;
  const confirmedTrack =
    trackRow && isConfirmTrack(trackRow.track)
      ? { track: trackRow.track, at: trackRow.created_at, cohortId: trackRow.cohort_id }
      : null;

  return {
    workspace:
      workspaceRow && workspaceInput
        ? { at: workspaceRow.created_at, input: workspaceInput, count: workspaceResult.count ?? 1 }
        : null,
    blueprint:
      blueprintRow && blueprint
        ? { event_id: blueprintRow.id, at: blueprintRow.created_at, payload: blueprint, count: blueprintResult.count ?? 1 }
        : null,
    dryRun,
    newestBefore,
    confirmedTrack,
    failed:
      !!workspaceResult.error ||
      !!blueprintResult.error ||
      !!dryRunResult.error ||
      !!beforeResult.error ||
      !!trackResult.error,
  };
}
