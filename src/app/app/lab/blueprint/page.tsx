// /app/lab/blueprint: the Week 3 pipeline blueprint and its dry run
// (SP-W3-BP, lab Parts 2 and 3; phase-2c C1 to C3).
// Server component. Reads, all through the learner's own client (RLS: own
// rows only; the user_id filters are for the index and for staff accounts):
// - the autosaved draft (artifact_draft kind "blueprint");
// - the newest blueprint_submitted event (what a dry run names);
// - the newest work_map_submitted event (candidates 1 to 3 and its id);
// - the latest saved version of each harness (a stage's linked harness);
// - the time log, for the newest dry run and the Week 1 "before" time, shown
//   as two lines that each state their range (dryRunLine / beforeLine).

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseServer } from "@/lib/supabase/server";
import type { BlueprintDraft } from "@/lib/courses/types";
import { EVENT_TYPES } from "@/lib/profile/events";
import type { WorkMapSnapshot } from "@/lib/profile/types";
import { formatDate } from "@/components/profile/display";
import { isDryRunEntry, minutesBetween, newId, parseTimeLogInput } from "@/components/lab/rules";
import {
  beforeEntriesFrom,
  beforeLine,
  blueprintFromSaved,
  draftFromBlueprint,
  dryRunLine,
  emptyBlueprint,
  emptyStage,
  parseBaselineSnapshot,
  parseBlueprintDraft,
} from "@/components/lab/rules-week3";
import { loadSavedHarnesses } from "@/components/lab/harness/queries";
import BlueprintEditor from "@/components/lab/blueprint/BlueprintEditor";
import { Week3LabHeader } from "@/components/lab/Week3LabHeader";
import type { CandidateOption, HarnessOption, SubmittedView, TimeLines } from "@/components/lab/blueprint/types";

export const metadata: Metadata = { title: "파이프라인 설계도" };

type EventRow = { id: number; created_at: string; data: unknown };

/** Candidates 1 to 3 of a Work Map snapshot, in rank order, with their task text. */
function candidatesOf(snapshot: WorkMapSnapshot | null): CandidateOption[] {
  if (!snapshot || !Array.isArray(snapshot.candidates) || !Array.isArray(snapshot.rows)) return [];
  return [...snapshot.candidates]
    .sort((a, b) => a.rank - b.rank)
    .flatMap((c) => {
      const task = snapshot.rows[c.task_row]?.task?.trim();
      return task && (c.rank === 1 || c.rank === 2 || c.rank === 3) ? [{ rank: c.rank, task }] : [];
    });
}

export default async function BlueprintPage() {
  const session = await getSession();
  // The /app layout already guarantees a profile; this keeps the types honest.
  if (!session?.profile) redirect("/start");
  const { user, profile } = session;
  // The 12-week course is the employee path (phase-2 P8).
  if (profile.path !== "employee") redirect("/app/courses");

  const supabase = await supabaseServer();
  const [draftResult, blueprintResult, workMapResult, savedList, timeLogResult] = await Promise.all([
    supabase
      .from("artifact_draft")
      .select("data, updated_at")
      .eq("user_id", user.id)
      .eq("kind", "blueprint")
      .maybeSingle(),
    supabase
      .from("profile_event")
      .select("id, created_at, data")
      .eq("user_id", user.id)
      .eq("type", EVENT_TYPES.blueprint_submitted)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(1),
    supabase
      .from("profile_event")
      .select("id, data")
      .eq("user_id", user.id)
      .eq("type", EVENT_TYPES.work_map_submitted)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(1),
    loadSavedHarnesses(supabase, user.id),
    supabase
      .from("profile_event")
      .select("id, created_at, data")
      .eq("user_id", user.id)
      .eq("type", EVENT_TYPES.time_log_entry)
      .order("created_at", { ascending: false })
      .limit(200),
  ]);
  if (draftResult.error) console.error("blueprint draft read failed:", draftResult.error.message);
  if (blueprintResult.error) console.error("blueprint read failed:", blueprintResult.error.message);
  if (workMapResult.error) console.error("blueprint work map read failed:", workMapResult.error.message);
  if (timeLogResult.error) console.error("blueprint time log read failed:", timeLogResult.error.message);

  // Work Map candidates: from the newest submitted Work Map event, so the
  // blueprint can name that event; the profile snapshot is the fallback.
  const workMapRow = (workMapResult.data?.[0] ?? null) as { id: number; data: unknown } | null;
  const workMapEventId = workMapRow?.id ?? null;
  const candidates = candidatesOf((workMapRow?.data as WorkMapSnapshot | undefined) ?? profile.work_map);

  // The newest submitted blueprint.
  const blueprintRow = (blueprintResult.data?.[0] ?? null) as EventRow | null;
  const newest = blueprintRow ? blueprintFromSaved(blueprintRow.data) : null;
  const submitted: SubmittedView | null =
    blueprintRow && newest
      ? { eventId: blueprintRow.id, submittedOn: formatDate(blueprintRow.created_at) ?? "이전", blueprint: newest }
      : null;

  // The draft holds what is being edited. A blueprint submitted after the
  // draft row was last saved (the autosave never landed, or it was submitted
  // from another device) comes back from that submission, keeping the timer.
  const stored = parseBlueprintDraft(draftResult.data?.data);
  const draftAt = Date.parse(String(draftResult.data?.updated_at ?? ""));
  let initialDraft: BlueprintDraft;
  if (stored && !(newest && blueprintRow && draftAt < Date.parse(blueprintRow.created_at))) {
    initialDraft = stored;
  } else if (newest) {
    initialDraft = { ...draftFromBlueprint(newest), dry_run_started_at: stored?.dry_run_started_at ?? null };
  } else {
    // A first visit: candidate 1 as the task and three empty stage cards to start typing in.
    const first = candidates[0];
    initialDraft = emptyBlueprint(
      first?.task ?? "",
      first && workMapEventId !== null
        ? { work_map_event_id: workMapEventId, candidate_rank: first.rank }
        : { work_map_event_id: null, candidate_rank: null },
    );
    initialDraft.stages = [emptyStage(newId("s")), emptyStage(newId("s")), emptyStage(newId("s"))];
  }

  const harnesses: HarnessOption[] = savedList.map((saved) => ({
    id: saved.item.id,
    name: saved.item.name,
    doc_type: saved.item.doc_type,
  }));

  // The newest dry run, and the Week 1 time: the baseline's cited entry once
  // locked, otherwise the newest "before" entry (phase-2c C1).
  const rows = (timeLogResult.data ?? []) as EventRow[];
  let dryRun: string | null = null;
  let lastDryRunAt: string | null = null;
  for (const row of rows) {
    if (!isDryRunEntry(row.data)) continue;
    const entry = parseTimeLogInput(row.data);
    const minutes = entry ? minutesBetween(entry.started_at, entry.ended_at) : null;
    if (!entry || minutes === null) continue;
    dryRun = dryRunLine(minutes, formatDate(entry.started_at) ?? "날짜 없음");
    lastDryRunAt = row.created_at;
    break;
  }

  let before: string | null = null;
  const baseline = parseBaselineSnapshot(profile.baseline);
  const befores = beforeEntriesFrom(rows);
  if (baseline) {
    const cited = befores.find((e) => e.id === baseline.time_log_event_id);
    before = beforeLine(
      baseline.minutes_per_instance,
      formatDate(cited?.started_at ?? baseline.time_logged_at) ?? "날짜 없음",
    );
  } else if (befores.length > 0) {
    const latest = befores[0];
    const minutes = minutesBetween(latest.started_at, latest.ended_at);
    if (minutes !== null) before = beforeLine(minutes, formatDate(latest.started_at) ?? "날짜 없음");
  }
  const timeLines: TimeLines = { dryRun, before };

  return (
    <main className="flex w-full flex-col gap-5">
      <Week3LabHeader title="파이프라인 설계도">
        <p>
          후보 1을 지금 하는 그대로 단계로 펼치고, AI가 맡을 단계와 확인 지점을 표시해요. 다 적으면 한
          번 돌려 보면서 첫 확인 지점까지 걸린 시간을 재요.
        </p>
        <p className="font-bold text-[var(--nb-ink)]">
          회사 기밀은 적지 마세요. 단계 이름과 무엇이 필요한지만 적으면 돼요.
        </p>
      </Week3LabHeader>
      <BlueprintEditor
        userId={user.id}
        initialDraft={initialDraft}
        candidates={candidates}
        workMapEventId={workMapEventId}
        harnesses={harnesses}
        submitted={submitted}
        lastDryRunAt={lastDryRunAt}
        timeLines={timeLines}
      />
    </main>
  );
}
