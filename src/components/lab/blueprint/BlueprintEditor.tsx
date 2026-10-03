"use client";

// The Week 3 pipeline blueprint (SP-W3-BP, lab Parts 2 and 3) on one screen:
// which task, the stage table as one card per stage with checkpoints between
// them, when it starts and where it goes, the drawing generated from the
// table, the submit, and the dry-run timer. The draft autosaves to the server
// (useDraft); the problems listed above the submit button are checkBlueprint,
// the same function POST /api/artifacts/blueprint runs again on what it gets.
// Each submit is a new blueprint_submitted event, like the Work Map.

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  BLUEPRINT_LIMITS,
  type ApiResult,
  type BlueprintCheckpointDraft,
  type BlueprintDraft,
  type BlueprintStageDraft,
} from "@/lib/courses/types";
import type { BlueprintSubmittedPayload } from "@/lib/profile/events";
import { ProblemList, SaveStatus } from "../inputs";
import { newId } from "../rules";
import { DRY_RUN_BADGE, checkBlueprint, emptyStage, toBlueprintPayload } from "../rules-week3";
import { useDraft } from "../useDraft";
import { BlueprintDiagram } from "./BlueprintDiagram";
import { CheckpointCard } from "./CheckpointCard";
import { DryRunPanel } from "./DryRunPanel";
import { StageCard } from "./StageCard";
import type { CandidateOption, HarnessOption, SubmittedView, TimeLines } from "./types";
import { useDryRun } from "./useDryRun";

const INPUT = "nb-input w-full px-3 py-2.5 text-base leading-relaxed placeholder:text-gray-400";

type SubmitState =
  | { kind: "idle" }
  | { kind: "sending" }
  /** `draft` is the exact draft that was accepted; editing again clears the success panel. */
  | { kind: "done"; draft: BlueprintDraft }
  | { kind: "failed"; message: string; problems: string[] };

function failureMessage(status: number): string {
  if (status === 401) return "로그인이 풀렸어요. 다시 로그인한 뒤 제출해 주세요. 적은 내용은 그대로 있어요.";
  if (status === 422) return "아래 항목을 고친 뒤 다시 제출해 주세요.";
  if (status === 413) return "내용이 너무 길어요. 조금 줄인 뒤 다시 제출해 주세요.";
  if (status === 503) return "지금은 제출을 받을 수 없어요. 강사에게 알려 주세요. 적은 내용은 저장돼 있어요.";
  return "제출하지 못했어요. 잠시 뒤 다시 눌러 주세요.";
}

/** The draft says what the submitted blueprint says (ignoring the timer). */
function sameAsSubmitted(draft: BlueprintDraft, submitted: SubmittedView | null): boolean {
  if (!submitted) return false;
  return (
    JSON.stringify(toBlueprintPayload(draft, submitted.blueprint.source)) === JSON.stringify(submitted.blueprint)
  );
}

export default function BlueprintEditor({
  userId,
  initialDraft,
  candidates,
  workMapEventId,
  harnesses,
  submitted,
  lastDryRunAt,
  timeLines,
}: {
  userId: string;
  initialDraft: BlueprintDraft;
  /** The newest Work Map's candidates in rank order (may be empty). */
  candidates: CandidateOption[];
  /** That Work Map's work_map_submitted event id, or null when there is none. */
  workMapEventId: number | null;
  harnesses: HarnessOption[];
  submitted: SubmittedView | null;
  lastDryRunAt: string | null;
  timeLines: TimeLines;
}) {
  const router = useRouter();
  const { draft, setDraft, saveState, saveProblem, retry } = useDraft<BlueprintDraft>("blueprint", initialDraft);
  const [submit, setSubmit] = useState<SubmitState>({ kind: "idle" });
  // The stage or check line that was just added takes focus.
  const [focusStageId, setFocusStageId] = useState<string | null>(null);
  const [focusCheck, setFocusCheck] = useState<{ id: string; index: number } | null>(null);

  const harnessIds = new Set(harnesses.map((h) => h.id));
  const check = checkBlueprint(draft, harnessIds);
  const accepted = submit.kind === "done" && submit.draft === draft;
  const unchanged = sameAsSubmitted(draft, submitted);
  const stageFull = draft.stages.length >= BLUEPRINT_LIMITS.maxStages;
  const checkpointFull = draft.checkpoints.length >= BLUEPRINT_LIMITS.maxCheckpoints;
  const timer = useDryRun({ userId, draft, setDraft, lastDryRunAt });

  // --- Task and source ---

  const pickCandidate = (option: CandidateOption) => {
    const current = draft.task.trim();
    if (
      current &&
      current !== option.task.trim() &&
      draft.stages.some((s) => s.name.trim()) &&
      !window.confirm(`‘${option.task}’ 업무로 바꿀까요? 적어 둔 단계는 그대로 남아요.`)
    ) {
      return;
    }
    setDraft((d) => ({
      ...d,
      task: option.task.slice(0, BLUEPRINT_LIMITS.task),
      source: { work_map_event_id: workMapEventId, candidate_rank: option.rank },
    }));
  };

  // --- Stages ---

  const updateStage = (id: string, patch: Partial<Omit<BlueprintStageDraft, "id">>) => {
    setDraft((d) => ({ ...d, stages: d.stages.map((s) => (s.id === id ? { ...s, ...patch } : s)) }));
  };

  const addStage = () => {
    if (stageFull) return;
    const id = newId("s");
    setDraft((d) => (d.stages.length >= BLUEPRINT_LIMITS.maxStages ? d : { ...d, stages: [...d.stages, emptyStage(id)] }));
    setFocusStageId(id);
  };

  const moveStage = (index: number, by: -1 | 1) => {
    setDraft((d) => {
      const target = index + by;
      if (target < 0 || target >= d.stages.length) return d;
      const stages = [...d.stages];
      [stages[index], stages[target]] = [stages[target], stages[index]];
      // Checkpoints point at a stage id, so they travel with their stage.
      return { ...d, stages };
    });
  };

  const removeStage = (stage: BlueprintStageDraft, index: number) => {
    const attached = draft.checkpoints.filter((c) => c.after_stage_id === stage.id);
    const previous = index > 0 ? draft.stages[index - 1] : null;
    const name = stage.name.trim() || `${index + 1}단계`;
    const hasChecks = attached.some((c) => c.checks.some((line) => line.trim()));
    const question =
      hasChecks && !previous
        ? `‘${name}’ 단계를 지울까요? 이 단계 뒤의 확인 지점도 함께 지워져요.`
        : hasChecks
          ? `‘${name}’ 단계를 지울까요? 이 단계 뒤의 확인 지점은 앞 단계 뒤로 옮겨요.`
          : `‘${name}’ 단계를 지울까요?`;
    if ((stage.name.trim() || stage.needs.trim() || hasChecks) && !window.confirm(question)) return;

    setDraft((d) => {
      const stages = d.stages.filter((s) => s.id !== stage.id);
      const at = d.stages.findIndex((s) => s.id === stage.id);
      const before = at > 0 ? d.stages[at - 1].id : null;
      const moving = d.checkpoints.filter((c) => c.after_stage_id === stage.id);
      let checkpoints = d.checkpoints.filter((c) => c.after_stage_id !== stage.id);
      if (before && moving.length > 0) {
        // The checkpoint now sits after the stage before; merge if one is already there.
        const lines = moving.flatMap((c) => c.checks);
        const existing = checkpoints.find((c) => c.after_stage_id === before);
        if (existing) {
          const merged = [...existing.checks, ...lines].filter((line) => line.trim());
          checkpoints = checkpoints.map((c) =>
            c.id === existing.id
              ? { ...c, checks: (merged.length > 0 ? merged : [""]).slice(0, BLUEPRINT_LIMITS.maxChecks) }
              : c,
          );
        } else {
          checkpoints = [...checkpoints, { ...moving[0], after_stage_id: before, checks: lines.slice(0, BLUEPRINT_LIMITS.maxChecks) }];
        }
      }
      return { ...d, stages, checkpoints };
    });
  };

  // --- Checkpoints ---

  const addCheckpoint = (stageId: string) => {
    if (checkpointFull) return;
    const id = newId("c");
    setDraft((d) =>
      d.checkpoints.length >= BLUEPRINT_LIMITS.maxCheckpoints || d.checkpoints.some((c) => c.after_stage_id === stageId)
        ? d
        : { ...d, checkpoints: [...d.checkpoints, { id, after_stage_id: stageId, checks: [""] }] },
    );
    setFocusCheck({ id, index: 0 });
  };

  const setChecks = (id: string, checks: string[]) => {
    setDraft((d) => ({ ...d, checkpoints: d.checkpoints.map((c) => (c.id === id ? { ...c, checks } : c)) }));
  };

  const addCheck = (checkpoint: BlueprintCheckpointDraft) => {
    if (checkpoint.checks.length >= BLUEPRINT_LIMITS.maxChecks) return;
    setChecks(checkpoint.id, [...checkpoint.checks, ""]);
    setFocusCheck({ id: checkpoint.id, index: checkpoint.checks.length });
  };

  const removeCheckpoint = (checkpoint: BlueprintCheckpointDraft) => {
    if (checkpoint.checks.some((c) => c.trim()) && !window.confirm("이 확인 지점과 적은 내용을 뺄까요?")) return;
    setDraft((d) => ({ ...d, checkpoints: d.checkpoints.filter((c) => c.id !== checkpoint.id) }));
  };

  // --- Submit ---

  const send = async () => {
    const sent = draft;
    setSubmit({ kind: "sending" });
    let res: Response;
    try {
      res = await fetch("/api/artifacts/blueprint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft: sent }),
      });
    } catch {
      setSubmit({ kind: "failed", message: "연결이 끊겼어요. 연결을 확인하고 다시 눌러 주세요.", problems: [] });
      return;
    }
    const result = (await res.json().catch(() => null)) as ApiResult<{
      event_id: number;
      created_at: string;
      blueprint: BlueprintSubmittedPayload;
    }> | null;
    if (res.ok && result?.ok) {
      setSubmit({ kind: "done", draft: sent });
      router.refresh(); // the submitted blueprint the dry run will name
      return;
    }
    setSubmit({
      kind: "failed",
      message: failureMessage(res.status),
      problems: result && !result.ok ? (result.problems ?? []) : [],
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Sticky bar: counts, save state, and the timer while a run is going. */}
      <div className="sticky top-[var(--site-header-h)] z-20 -mx-6 border-b border-[var(--nb-line)] bg-[var(--background)] px-6 py-2.5">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs">
          <p className="font-bold">
            단계 {draft.stages.length}개 · 확인 지점 {draft.checkpoints.length}개
          </p>
          <SaveStatus state={saveState} problem={saveProblem} onRetry={retry} />
        </div>
        {timer.running && (
          <a
            href="#dry-run"
            className="nb-flat mt-2 flex min-h-11 items-center justify-center bg-[var(--nb-yellow)] px-3 text-sm font-extrabold"
          >
            {DRY_RUN_BADGE} 중{timer.elapsed !== null && ` · ${timer.elapsed}분 지남`} · 정지하러 가기
          </a>
        )}
      </div>

      {/* Which task */}
      <section className="nb-card flex flex-col gap-3 px-4 py-4">
        <h2 className="text-base font-extrabold">1. 어떤 업무인가요?</h2>
        {candidates.length > 0 ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-gray-700">보통 후보 1로 그려요. 워크맵에서 고른 후보예요.</p>
            <ul className="flex flex-col gap-2">
              {candidates.map((option) => {
                const chosen = draft.source.candidate_rank === option.rank && draft.task.trim() === option.task.trim();
                return (
                  <li key={option.rank}>
                    <button
                      type="button"
                      aria-pressed={chosen}
                      onClick={() => pickCandidate(option)}
                      className={`flex min-h-12 w-full items-center gap-3 rounded-xl border border-[var(--nb-line)] px-3 py-2 text-left text-[15px] leading-snug ${
                        chosen ? "nb-selected font-bold" : "bg-[var(--nb-paper)]"
                      }`}
                    >
                      <span className="shrink-0 text-xs font-extrabold">후보 {option.rank}</span>
                      <span className="min-w-0 flex-1 break-words">{option.task}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : (
          <p className="text-sm text-gray-700">
            제출한 워크맵이 없어서 후보를 불러오지 못했어요. 업무 이름을 직접 적어 주세요.
          </p>
        )}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="blueprint-task" className="text-sm font-bold">
            업무 이름
          </label>
          <input
            id="blueprint-task"
            type="text"
            value={draft.task}
            maxLength={BLUEPRINT_LIMITS.task}
            placeholder="예: 월요일 주간업무보고 쓰기"
            onChange={(e) => setDraft((d) => ({ ...d, task: e.target.value }))}
            className={INPUT}
          />
        </div>
      </section>

      {/* Stage table */}
      <section className="nb-card flex flex-col gap-3 px-4 py-4">
        <h2 className="text-base font-extrabold">2. 단계를 순서대로 적기</h2>
        <div className="flex flex-col gap-2 text-sm leading-relaxed">
          <p>
            지난번에 이 업무를 실제로 한 순서대로 적어 주세요. 시간 기록을 보면서 적으면 돼요. 보통
            6~10단계가 나와요.
          </p>
          <p className="nb-flat bg-[var(--nb-yellow)] px-3 py-2.5 font-bold">
            바라는 모습이 아니라 지난번에 한 그대로 적어요. 칸을 새로 만들지 말고, AI가 맡을 칸만 표시해요.
          </p>
          <p className="text-gray-700">
            단계마다 P(처리)인지 T(판단)인지 고르고, 처리 단계는 누가 하는지 골라요. 확인 지점은 단계
            사이에 넣어요. 전달하기 전에 적어도 하나는 있어야 해요.
          </p>
        </div>

        {draft.stages.length > 0 && (
          <ol className="flex flex-col gap-2.5">
            {draft.stages.map((stage, index) => {
              const checkpoints = draft.checkpoints.filter((c) => c.after_stage_id === stage.id);
              return (
                <li key={stage.id} className="flex flex-col gap-2.5">
                  <StageCard
                    stage={stage}
                    index={index}
                    count={draft.stages.length}
                    harnesses={harnesses}
                    autoFocus={stage.id === focusStageId}
                    onChange={(patch) => updateStage(stage.id, patch)}
                    onMove={(by) => moveStage(index, by)}
                    onRemove={() => removeStage(stage, index)}
                  />
                  {checkpoints.map((c) => (
                    <CheckpointCard
                      key={c.id}
                      checkpoint={c}
                      afterStage={index + 1}
                      focusIndex={focusCheck?.id === c.id ? focusCheck.index : null}
                      onChange={(checks) => setChecks(c.id, checks)}
                      onAddCheck={() => addCheck(c)}
                      onRemove={() => removeCheckpoint(c)}
                    />
                  ))}
                  {checkpoints.length === 0 && (
                    <button
                      type="button"
                      onClick={() => addCheckpoint(stage.id)}
                      disabled={checkpointFull}
                      className="flex min-h-11 w-full items-center justify-center gap-1 rounded-xl border border-dashed border-[var(--nb-ink)] px-3 text-sm font-bold disabled:opacity-35"
                    >
                      <span aria-hidden>✓</span> 여기에 확인 지점 넣기
                      <span className="sr-only"> ({index + 1}단계 뒤)</span>
                    </button>
                  )}
                </li>
              );
            })}
          </ol>
        )}

        <button
          type="button"
          onClick={addStage}
          disabled={stageFull}
          className="nb-btn nb-btn-white w-full px-4 py-2.5 text-sm"
        >
          + 단계 추가
        </button>
        {stageFull && (
          <p className="text-sm text-gray-700">
            단계는 {BLUEPRINT_LIMITS.maxStages}개까지예요. 비슷한 단계는 하나로 묶어 주세요.
          </p>
        )}
      </section>

      {/* Trigger and delivery */}
      <section className="nb-card flex flex-col gap-4 px-4 py-4">
        <h2 className="text-base font-extrabold">3. 언제 시작해서 어디로 가나요?</h2>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="blueprint-trigger" className="text-sm font-bold">
            언제 시작하나요?
          </label>
          <input
            id="blueprint-trigger"
            type="text"
            value={draft.trigger}
            maxLength={BLUEPRINT_LIMITS.trigger}
            placeholder="예: 월요일 아침 8시 / 팀원 자료를 다 받았을 때"
            onChange={(e) => setDraft((d) => ({ ...d, trigger: e.target.value }))}
            className={INPUT}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="blueprint-delivery" className="text-sm font-bold">
            누구에게 어떻게 보내나요?
          </label>
          <input
            id="blueprint-delivery"
            type="text"
            value={draft.delivery}
            maxLength={BLUEPRINT_LIMITS.delivery}
            placeholder="예: 팀장님께 메일로"
            onChange={(e) => setDraft((d) => ({ ...d, delivery: e.target.value }))}
            className={INPUT}
          />
        </div>
      </section>

      {/* Drawing generated from the table */}
      <section className="nb-card flex flex-col gap-3 px-4 py-4">
        <h2 className="text-base font-extrabold">그림으로 보기</h2>
        <p className="text-sm text-gray-700">
          위에 적은 대로 그려져요. 하늘색 칸은 AI가 맡는 단계, 노란 칸은 확인 지점이에요.
        </p>
        <BlueprintDiagram
          stages={draft.stages}
          checkpoints={draft.checkpoints}
          trigger={draft.trigger}
          delivery={draft.delivery}
        />
      </section>

      {/* Submit */}
      <section className="nb-card flex flex-col gap-3 px-4 py-4">
        {accepted ? (
          <div aria-live="polite" className="flex flex-col gap-3">
            <p className="nb-flat bg-[var(--nb-lime)] px-3 py-2.5 text-[15px] font-extrabold">설계도를 제출했어요.</p>
            <p className="text-sm leading-relaxed">
              다음은 한 번 돌려 보기예요. 타이머를 켜고 1단계부터 첫 확인 지점까지 해 보세요.
            </p>
            <a href="#dry-run" className="nb-btn nb-btn-primary block px-4 py-3 text-center text-[15px]">
              한 번 돌려 보기로 가기
            </a>
          </div>
        ) : (
          <>
            {submitted && (
              <p className="text-sm font-bold">
                {unchanged
                  ? `${submitted.submittedOn}에 제출한 설계도 그대로예요.`
                  : `${submitted.submittedOn}에 제출했어요. 그 뒤로 고친 내용은 다시 제출해야 남아요.`}
              </p>
            )}
            <button
              type="button"
              onClick={send}
              disabled={check.errors.length > 0 || submit.kind === "sending"}
              className="nb-btn nb-btn-primary w-full px-4 py-3.5 text-[15px]"
            >
              {submit.kind === "sending" ? "제출하는 중…" : submitted ? "설계도 다시 제출하기" : "설계도 제출하기"}
            </button>
            {submit.kind === "failed" && (
              <div role="alert" className="text-sm text-red-600">
                <p className="font-bold">{submit.message}</p>
                {submit.problems.length > 0 && (
                  <ul className="mt-1 flex list-disc flex-col gap-1 pl-5">
                    {submit.problems.map((problem) => (
                      <li key={problem}>{problem}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            <ProblemList errors={check.errors} warnings={check.warnings} />
            <p className="text-xs leading-relaxed text-gray-600">
              제출한 설계도는 본인과 강사·운영진만 볼 수 있어요.
              {submitted && " 다시 제출하면 새 설계도가 지금 설계도가 되고, 이전 설계도도 기록에 남아요."}
            </p>
          </>
        )}
      </section>

      <DryRunPanel userId={userId} draft={draft} timer={timer} submitted={submitted} timeLines={timeLines} />
    </div>
  );
}
