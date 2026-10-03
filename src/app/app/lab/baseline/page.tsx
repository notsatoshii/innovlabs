// /app/lab/baseline: the Week 3 Part 4 capstone baseline (SP-W3-BL;
// phase-2c C4, C5, D3, D5). Server component. Reads, all through the
// learner's own client (RLS: own rows only):
//   - the autosaved baseline draft;
//   - the newest blueprint (prefills the task and the current-method stages);
//   - the time log: the "before" entries the baseline may cite (dry runs
//     excluded by beforeEntriesFrom) and the newest dry run for the line
//     beside the Week 1 time (C1);
//   - the newest countersign: once there is one the baseline is frozen and
//     the page is the read-only view, with no form (D3);
//   - whether Week 3 is open (weekOpenForUser, the same rule the lock route
//     enforces), so the page says why 확정 is not possible yet.

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseServer } from "@/lib/supabase/server";
import { formatMonthDay, weekOpenForUser } from "@/lib/courses/queries";
import type { BaselineDraft } from "@/lib/courses/types";
import { EVENT_TYPES } from "@/lib/profile/events";
import type { BaselineSnapshot } from "@/lib/profile/types";
import { EVIDENCE_BUCKET, isDryRunEntry, minutesBetween, parseTimeLogInput } from "@/components/lab/rules";
import {
  baselineFromBlueprint,
  beforeEntriesFrom,
  blueprintFromSaved,
  emptyBaseline,
  parseBaselineDraft,
  parseBaselineSnapshot,
  sameTask,
  writtenLines,
} from "@/components/lab/rules-week3";
import BaselineEditor from "@/components/lab/baseline/BaselineEditor";
import BaselineSummary from "@/components/lab/baseline/BaselineSummary";
import type {
  BeforeEntryView,
  BlueprintRef,
  CandidateOption,
  DryRunView,
  LockGateView,
} from "@/components/lab/baseline/types";
import { Week3LabHeader } from "@/components/lab/Week3LabHeader";

export const metadata: Metadata = { title: "기준선" };

const SIGNED_URL_SECONDS = 60 * 60;
/** Time log rows read. Far above a 12-week course's real count. */
const ENTRY_LIMIT = 1000;

const DAY = new Intl.DateTimeFormat("ko-KR", {
  month: "long",
  day: "numeric",
  weekday: "short",
  timeZone: "Asia/Seoul",
});

function dayLabel(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : DAY.format(date);
}

type Row = { id: number; created_at: string; data: unknown };

export default async function BaselinePage() {
  const session = await getSession();
  // The /app layout already guarantees a profile; this keeps the types honest.
  if (!session?.profile) redirect("/start");
  const { user, profile } = session;
  // The 12-week course is the employee path (phase-2 P8).
  if (profile.path !== "employee") redirect("/app/courses");

  const supabase = await supabaseServer();
  const newest = (type: string, columns: string) =>
    supabase
      .from("profile_event")
      .select(columns)
      .eq("user_id", user.id)
      .eq("type", type)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();

  const [draftResult, blueprintResult, logResult, countersignResult, workMapResult, gate] = await Promise.all([
    supabase.from("artifact_draft").select("data").eq("user_id", user.id).eq("kind", "baseline").maybeSingle(),
    newest(EVENT_TYPES.blueprint_submitted, "id, data"),
    supabase
      .from("profile_event")
      .select("id, created_at, data")
      .eq("user_id", user.id)
      .eq("type", EVENT_TYPES.time_log_entry)
      .order("created_at", { ascending: false })
      .limit(ENTRY_LIMIT),
    newest(EVENT_TYPES.baseline_countersigned, "id, created_at, data"),
    newest(EVENT_TYPES.work_map_submitted, "id"),
    weekOpenForUser(supabase, user.id, 3),
  ]);
  for (const [name, result] of [
    ["draft", draftResult],
    ["blueprint", blueprintResult],
    ["time log", logResult],
    ["countersign", countersignResult],
    ["work map", workMapResult],
  ] as const) {
    if (result.error) console.error(`baseline page ${name} read failed:`, result.error.message);
  }

  // --- The baseline as it stands ---

  let baseline: BaselineSnapshot | null = parseBaselineSnapshot(profile.baseline);
  const countersign = countersignResult.data as unknown as Row | null;
  if (countersign) {
    // Frozen (D3). The countersigned baseline is the event the countersign
    // names (C5); the snapshot normally is that event already.
    const named = Number((countersign.data as { baseline_event_id?: unknown } | null)?.baseline_event_id);
    if (!baseline || baseline.locked_event_id !== named || !baseline.countersigned_at) {
      const { data: lockedRow, error } = await supabase
        .from("profile_event")
        .select("id, data")
        .eq("id", named)
        .eq("user_id", user.id)
        .eq("type", EVENT_TYPES.baseline_locked)
        .maybeSingle();
      if (error) console.error("baseline page locked read failed:", error.message);
      const parsed = lockedRow
        ? parseBaselineSnapshot({ ...(lockedRow.data as object), locked_event_id: lockedRow.id })
        : null;
      if (parsed) baseline = { ...parsed, countersigned_at: countersign.created_at, countersign_event_id: countersign.id };
    }
  }
  const frozen = Boolean(countersign && baseline?.countersigned_at);

  // --- Time log: "before" entries and the newest dry run ---

  const rows = (logResult.data ?? []) as unknown as Row[];
  const before = beforeEntriesFrom(rows);

  let dryRun: DryRunView | null = null;
  for (const row of rows) {
    if (!isDryRunEntry(row.data)) continue;
    const parsed = parseTimeLogInput(row.data);
    const minutes = parsed ? minutesBetween(parsed.started_at, parsed.ended_at) : null;
    if (parsed && minutes !== null && minutes > 0) {
      dryRun = { minutes, dayLabel: dayLabel(parsed.started_at) };
      break; // rows are newest first
    }
  }

  // Evidence opens through short-lived signed links made with the learner's
  // own client, so the own-folder select policy applies.
  const evidenceUrl = new Map<string, string>();
  const paths = [
    ...new Set([...before.flatMap((e) => (e.evidence_ref ? [e.evidence_ref] : [])), baseline?.evidence_ref ?? ""]),
  ].filter((p) => p.length > 0);
  if (paths.length > 0) {
    const { data: signed, error: signError } = await supabase.storage
      .from(EVIDENCE_BUCKET)
      .createSignedUrls(paths, SIGNED_URL_SECONDS);
    if (signError) console.error("baseline evidence signing failed:", signError.message);
    for (const item of signed ?? []) {
      if (item.path && item.signedUrl && !item.error) evidenceUrl.set(item.path, item.signedUrl);
    }
  }
  const summaryEvidence = baseline?.evidence_ref ? (evidenceUrl.get(baseline.evidence_ref) ?? null) : null;
  // The cited entry's work date, for a snapshot locked before time_started_at existed.
  const citedId = baseline?.time_log_event_id ?? null;
  const citedRow = citedId === null ? undefined : rows.find((r) => r.id === citedId);
  const citedStartedAt = citedRow ? (parseTimeLogInput(citedRow.data)?.started_at ?? null) : null;

  const header = (
    <Week3LabHeader title="캡스톤 기준선">
      <p>
        캡스톤으로 삼을 업무를 지금 어떻게 하고 있는지 적어 두는 곳이에요. 11주차에 이 기준선과 비교해서 무엇이
        달라졌는지 봐요.
      </p>
      <p className="font-bold text-[var(--nb-ink)]">
        기준선은 하네스를 쓰기 전의 기록이어야 전후 비교에 의미가 있어요.
      </p>
    </Week3LabHeader>
  );

  if (frozen && baseline) {
    return (
      <main className="flex w-full flex-col gap-5">
        {header}
        <BaselineSummary baseline={baseline} evidenceUrl={summaryEvidence} citedStartedAt={citedStartedAt} />
      </main>
    );
  }

  const entries: BeforeEntryView[] = before.flatMap((e) => {
    const minutes = minutesBetween(e.started_at, e.ended_at);
    if (minutes === null) return [];
    return [
      {
        ...e,
        minutes,
        dayLabel: dayLabel(e.started_at),
        evidenceUrl: e.evidence_ref ? (evidenceUrl.get(e.evidence_ref) ?? null) : null,
      },
    ];
  });

  // --- Prefill sources: the newest blueprint and the Work Map candidates ---

  const blueprintRow = blueprintResult.data as unknown as { id: number; data: unknown } | null;
  const parsedBlueprint = blueprintRow ? blueprintFromSaved(blueprintRow.data) : null;
  const blueprint: BlueprintRef | null =
    blueprintRow && parsedBlueprint ? { eventId: blueprintRow.id, blueprint: parsedBlueprint } : null;

  const workMapEventId = (workMapResult.data as unknown as { id: number } | null)?.id ?? null;
  const candidates: CandidateOption[] = (profile.work_map?.candidates ?? [])
    .slice()
    .sort((a, b) => a.rank - b.rank)
    .flatMap((c) => {
      const task = profile.work_map?.rows[c.task_row]?.task;
      return task ? [{ rank: c.rank, task }] : [];
    });

  // --- The starting draft ---

  const stored = parseBaselineDraft((draftResult.data as { data?: unknown } | null)?.data);
  const pristine = !stored || (stored.task.trim() === "" && writtenLines(stored.current_method_stages).length === 0);
  let initialDraft: BaselineDraft = stored ?? emptyBaseline();
  if (pristine) {
    if (blueprint) {
      initialDraft = baselineFromBlueprint(initialDraft, blueprint.blueprint, blueprint.eventId);
    } else if (candidates[0]) {
      initialDraft = {
        ...initialDraft,
        task: candidates[0].task,
        source: { work_map_event_id: workMapEventId, candidate_rank: candidates[0].rank, blueprint_event_id: null },
      };
    }
  }
  // Nothing chosen yet: start from the newest entry of the same task, with its evidence.
  if (initialDraft.time_log_event_id === null) {
    const match = entries.find((e) => sameTask(e.task, initialDraft.task));
    if (match) initialDraft = { ...initialDraft, time_log_event_id: match.id, evidence_ref: match.evidence_ref };
  }

  const gateView: LockGateView =
    gate.state === "closed"
      ? { state: "closed", opensOn: gate.opensOn ? formatMonthDay(new Date(gate.opensOn)) : null }
      : { state: gate.state };

  return (
    <main className="flex w-full flex-col gap-5">
      {header}
      {baseline && (
        <BaselineSummary baseline={baseline} evidenceUrl={summaryEvidence} citedStartedAt={citedStartedAt} />
      )}
      <BaselineEditor
        initialDraft={initialDraft}
        entries={entries}
        dryRun={dryRun}
        candidates={candidates}
        workMapEventId={workMapEventId}
        blueprint={blueprint}
        gate={gateView}
        locked={baseline !== null}
      />
    </main>
  );
}
