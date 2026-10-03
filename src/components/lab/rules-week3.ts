// Shapes, limits, and checks for the Week 3 labs (docs/app/phases/phase-2c.md,
// C1 to C6 and "Plan review 2"): the workspace check, the pipeline blueprint,
// the dry-run labels, and the baseline. Pure module: imported by the client
// forms AND by the routes under src/app/api, so both sides run the same
// checks. Source: docs/curriculum/innovlabs-spine-w2-w3-session-plans.md,
// Week 3 lab Parts 1 to 4.
//
// Owned by the main session. Builders import from here; they never redefine
// a rule in a component or a route.

import {
  BASELINE_LIMITS,
  BLUEPRINT_LIMITS,
  WORKSPACE_LIMITS,
  type BaselineDraft,
  type BeforeEntry,
  type BlueprintCheckpointDraft,
  type BlueprintDraft,
  type BlueprintStageDraft,
  type WorkspaceInput,
} from "@/lib/courses/types";
import type {
  AssistantId,
  BaselineLockedPayload,
  BlueprintActor,
  BlueprintCheckpoint,
  BlueprintStage,
  BlueprintSubmittedPayload,
  WorkspaceSetupPayload,
} from "@/lib/profile/events";
import type { BaselineSnapshot, LearningSnapshot } from "@/lib/profile/types";
import type { DepthFlag } from "@/lib/survey/types";
import { formatMinutes, isDryRunEntry, isHarnessId, minutesBetween } from "@/components/lab/rules";

export interface CheckResult {
  /** Block the submit (the route refuses with 422 and these lines). */
  errors: string[];
  /** Shown, never blocking. */
  warnings: string[];
}

// --- Small helpers ---

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.slice(0, max) : "";
}

function bool(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function eventId(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? value : null;
}

function rank(value: unknown): 1 | 2 | 3 | null {
  return value === 1 || value === 2 || value === 3 ? value : null;
}

/** Client ids made by newId() in rules.ts (stage "s…", checkpoint "c…"). */
export function isClientId(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{1,40}$/.test(value);
}

function oneLine(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/** Two task names that are the same task (spacing and case ignored). */
export function sameTask(a: string, b: string): boolean {
  const key = (v: string) => oneLine(v).toLowerCase().replace(/\s/g, "");
  return key(a).length > 0 && key(a) === key(b);
}

// --- Labels (new strings: listed for Eric in phase-2c.md "New strings") ---

export const ASSISTANT_LABELS: Record<AssistantId, string> = {
  chatgpt: "ChatGPT",
  claude: "Claude",
  gemini: "Gemini",
  copilot: "Copilot",
  claude_code: "Claude Code",
  codex: "Codex",
  other: "기타",
};

const ASSISTANT_IDS = new Set<string>(Object.keys(ASSISTANT_LABELS));

/** The browser-path assistants first, then the agent-path ones (session plan appendix). */
export const ASSISTANTS_BY_PATH: Record<"browser" | "agent", AssistantId[]> = {
  browser: ["chatgpt", "claude", "gemini", "copilot", "other"],
  agent: ["claude_code", "codex", "other"],
};

export const ACTOR_LABELS: Record<BlueprintActor, string> = {
  assistant: "AI",
  assistant_checked: "AI가 하고 내가 확인",
  human: "내가",
};

/** Badge text wherever a time log entry with dry_run is listed. */
export const DRY_RUN_BADGE = "시험 실행";

/**
 * The dry run beside the Week 1 time (C1, plan review 2). Both lines state
 * their range so they never read as a before/after saving: no difference,
 * percentage, arrow, 절감 or 단축 anywhere they appear together.
 */
export function dryRunLine(minutes: number, dateLabel: string): string {
  return `${DRY_RUN_BADGE} · 1단계부터 첫 확인 지점까지 ${formatMinutes(minutes)} (${dateLabel})`;
}

export function beforeLine(minutes: number, dateLabel: string): string {
  return `기존 방식 · 업무 전체 ${formatMinutes(minutes)} (${dateLabel})`;
}

// --- Part 1: workspace check (SP-W3-CP) ---

/** The curriculum's fix for "the assistant forgot the harness" (Part 1, second failure). */
export const WORKSPACE_FORGOT_FIX =
  "하네스를 파일로만 올리면 필요할 때만 읽어요. 하네스를 ‘항상 따르는 지시’ 칸에 붙여 넣고 한 줄 시험을 다시 해 보세요.";

/** The curriculum's fix for blocked uploads (Part 1, first failure). */
export const WORKSPACE_UPLOAD_FIX =
  "업로드가 막혀 있으면 참고 문서를 지시 칸에 글로 붙여 넣으세요. 보통 몇 쪽은 들어가요.";

export function defaultWorkspacePath(depthFlag: DepthFlag | null | undefined): "browser" | "agent" {
  return depthFlag === "full_agent" ? "agent" : "browser";
}

export function emptyWorkspace(path: "browser" | "agent" | null = null): WorkspaceInput {
  return {
    assistant: null,
    assistant_other: "",
    path,
    workspace_name: "",
    instructions_set: null,
    references_uploaded: null,
    test_followed: null,
    uploads_blocked: null,
  };
}

export function parseWorkspaceInput(input: unknown): WorkspaceInput | null {
  if (!isRecord(input)) return null;
  const assistant =
    typeof input.assistant === "string" && ASSISTANT_IDS.has(input.assistant)
      ? (input.assistant as AssistantId)
      : null;
  const path = input.path === "browser" || input.path === "agent" ? input.path : null;
  return {
    assistant,
    assistant_other: text(input.assistant_other, WORKSPACE_LIMITS.assistantOther).trim(),
    path,
    workspace_name: text(input.workspace_name, WORKSPACE_LIMITS.workspaceName).trim(),
    instructions_set: bool(input.instructions_set),
    references_uploaded: bool(input.references_uploaded),
    test_followed: bool(input.test_followed),
    uploads_blocked: bool(input.uploads_blocked),
  };
}

/** Every question answered. A failed test is allowed (resubmit later) but shows the fix. */
export function checkWorkspace(input: WorkspaceInput): CheckResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!input.path) errors.push("브라우저로 하는지, 에이전트(폴더)로 하는지 골라 주세요.");
  if (!input.assistant) errors.push("어떤 AI를 쓰는지 골라 주세요.");
  else if (input.assistant === "other" && input.assistant_other.trim().length === 0) {
    errors.push("쓰는 AI의 이름을 적어 주세요.");
  }
  if (input.workspace_name.trim().length === 0) errors.push("작업 공간 이름을 적어 주세요.");
  const answered: [boolean | null, string][] = [
    [input.instructions_set, "하네스를 지시 칸에 넣었는지 골라 주세요."],
    [input.references_uploaded, "참고 문서를 넣었는지 골라 주세요."],
    [input.test_followed, "한 줄 시험 결과를 골라 주세요."],
    [input.uploads_blocked, "회사에서 업로드가 막혀 있는지 골라 주세요."],
  ];
  for (const [value, message] of answered) if (value === null) errors.push(message);

  if (input.test_followed === false || input.instructions_set === false) warnings.push(WORKSPACE_FORGOT_FIX);
  if (input.uploads_blocked === true) warnings.push(WORKSPACE_UPLOAD_FIX);
  return { errors, warnings };
}

/** The workspace_setup payload for an input that passed checkWorkspace. */
export function toWorkspacePayload(input: WorkspaceInput): WorkspaceSetupPayload {
  return {
    version: 1,
    assistant: input.assistant ?? "other",
    assistant_other: input.assistant === "other" ? input.assistant_other.trim() : null,
    path: input.path ?? "browser",
    workspace_name: input.workspace_name.trim(),
    instructions_set: input.instructions_set === true,
    references_uploaded: input.references_uploaded === true,
    test_followed: input.test_followed === true,
    uploads_blocked: input.uploads_blocked === true,
  };
}

/**
 * user_profile.learning after a workspace check: MERGED into what is there,
 * so blocked_tools and the reserved student fields survive (plan review 2).
 */
export function mergeLearning(existing: LearningSnapshot | null, p: WorkspaceSetupPayload): LearningSnapshot {
  return {
    ...(existing ?? {}),
    version: 1,
    assistant: p.assistant === "other" ? (p.assistant_other ?? "기타") : ASSISTANT_LABELS[p.assistant],
    path: p.path,
    workspace_ready: p.instructions_set && p.test_followed,
    uploads_blocked: p.uploads_blocked,
    workspace_name: p.workspace_name,
  };
}

// --- Part 2: blueprint (SP-W3-BP) ---

export function emptyStage(id: string): BlueprintStageDraft {
  return { id, name: "", kind: null, actor: null, needs: "", harness_id: null };
}

export function emptyBlueprint(
  task = "",
  source: BlueprintDraft["source"] = { work_map_event_id: null, candidate_rank: null },
): BlueprintDraft {
  return {
    version: 1,
    task,
    source,
    stages: [],
    checkpoints: [],
    trigger: "",
    delivery: "",
    dry_run_started_at: null,
  };
}

const ACTORS = new Set<string>(["assistant", "human", "assistant_checked"]);

/** AI does the stage (with or without the learner's check): the "before delivery" rule counts both. */
export function isAssistantActor(actor: BlueprintActor | null): boolean {
  return actor === "assistant" || actor === "assistant_checked";
}

/**
 * Normalises a stored draft or a posted body. Unknown fields dropped, text
 * clamped to BLUEPRINT_LIMITS, stages capped at maxStages, duplicate ids
 * dropped, a T stage's actor forced to "human", checkpoints pointing at a
 * missing stage dropped. Returns null when it is not a version 1 draft.
 * Never judges the rules; run checkBlueprint for that.
 */
export function parseBlueprintDraft(input: unknown): BlueprintDraft | null {
  if (!isRecord(input) || input.version !== 1) return null;
  const L = BLUEPRINT_LIMITS;

  const stages: BlueprintStageDraft[] = [];
  const stageIds = new Set<string>();
  for (const raw of Array.isArray(input.stages) ? input.stages : []) {
    if (stages.length >= L.maxStages) break;
    if (!isRecord(raw) || !isClientId(raw.id) || stageIds.has(raw.id)) continue;
    stageIds.add(raw.id);
    const kind = raw.kind === "P" || raw.kind === "T" ? raw.kind : null;
    const actor =
      kind === "T"
        ? "human"
        : typeof raw.actor === "string" && ACTORS.has(raw.actor)
          ? (raw.actor as BlueprintActor)
          : null;
    stages.push({
      id: raw.id,
      name: text(raw.name, L.stageName),
      kind,
      actor,
      needs: text(raw.needs, L.needs),
      harness_id: isHarnessId(raw.harness_id) ? raw.harness_id : null,
    });
  }

  const checkpoints: BlueprintCheckpointDraft[] = [];
  const checkpointIds = new Set<string>();
  for (const raw of Array.isArray(input.checkpoints) ? input.checkpoints : []) {
    if (checkpoints.length >= L.maxCheckpoints) break;
    if (!isRecord(raw) || !isClientId(raw.id) || checkpointIds.has(raw.id)) continue;
    if (typeof raw.after_stage_id !== "string" || !stageIds.has(raw.after_stage_id)) continue;
    checkpointIds.add(raw.id);
    checkpoints.push({
      id: raw.id,
      after_stage_id: raw.after_stage_id,
      checks: (Array.isArray(raw.checks) ? raw.checks : []).slice(0, L.maxChecks).map((c) => text(c, L.check)),
    });
  }

  const source = isRecord(input.source) ? input.source : {};
  const started =
    typeof input.dry_run_started_at === "string" && !Number.isNaN(Date.parse(input.dry_run_started_at))
      ? input.dry_run_started_at
      : null;

  return {
    version: 1,
    task: text(input.task, L.task),
    source: { work_map_event_id: eventId(source.work_map_event_id), candidate_rank: rank(source.candidate_rank) },
    stages,
    checkpoints,
    trigger: text(input.trigger, L.trigger),
    delivery: text(input.delivery, L.delivery),
    dry_run_started_at: started,
  };
}

/** The checks a learner actually wrote (blank lines are not checks). */
export function writtenChecks(checkpoint: Pick<BlueprintCheckpointDraft, "checks">): string[] {
  return checkpoint.checks.map(oneLine).filter((c) => c.length > 0);
}

/** "읽어 본다" is not a check: "write what you read for" (Part 2, second failure). */
const VAGUE_CHECK = /^(그냥\s*)?(한\s*번\s*)?(다시\s*)?(읽어\s*(본다|봄|보기|봐요|보기만)|읽기|훑어\s*(본다|봄|보기)|검토|확인|체크)[.!]?$/;

export function isVagueCheck(check: string): boolean {
  return VAGUE_CHECK.test(oneLine(check));
}

/** Stage position (0-based) of a stage id, or -1. */
function indexOf(stages: { id: string }[], stageId: string): number {
  return stages.findIndex((s) => s.id === stageId);
}

/**
 * The checkpoint the dry run stops at: the one placed after the earliest
 * stage (the first in the list on a tie). Works on a draft and on a payload.
 */
export function firstCheckpoint<C extends { after_stage_id: string }>(
  blueprint: { stages: { id: string }[]; checkpoints: C[] },
): C | null {
  let best: C | null = null;
  let bestIndex = Number.POSITIVE_INFINITY;
  for (const c of blueprint.checkpoints) {
    const i = indexOf(blueprint.stages, c.after_stage_id);
    if (i >= 0 && i < bestIndex) {
      best = c;
      bestIndex = i;
    }
  }
  return best;
}

/**
 * C3, as revised in plan review 2. Errors block the submit; warnings never
 * do. Pass the learner's saved harness ids to also check stage.harness_id.
 */
export function checkBlueprint(draft: BlueprintDraft, harnessIds?: ReadonlySet<string>): CheckResult {
  const L = BLUEPRINT_LIMITS;
  const errors: string[] = [];
  const warnings: string[] = [];

  if (oneLine(draft.task).length === 0) errors.push("어떤 업무의 설계도인지 적어 주세요.");

  const stages = draft.stages;
  if (stages.length < L.minStages) {
    errors.push(`단계를 ${L.minStages}개 이상 적어 주세요. 지금은 ${stages.length}개예요.`);
  } else if (stages.length > L.maxStages) {
    errors.push(`단계는 ${L.maxStages}개까지예요. 지금은 ${stages.length}개예요.`);
  }
  stages.forEach((s, i) => {
    const n = i + 1;
    if (oneLine(s.name).length === 0) errors.push(`${n}단계의 이름을 적어 주세요.`);
    if (!s.kind) errors.push(`${n}단계가 처리(P)인지 판단(T)인지 골라 주세요.`);
    else if (s.kind === "P" && !s.actor) errors.push(`${n}단계는 누가 하는지 골라 주세요.`);
    if (s.kind === "T" && s.actor !== "human") errors.push(`${n}단계는 판단 단계라 직접 해야 해요.`);
    if (harnessIds && s.harness_id && !harnessIds.has(s.harness_id)) {
      errors.push(`${n}단계에 연결한 하네스를 찾지 못했어요. 다시 골라 주세요.`);
    }
    if (s.kind === "P" && isAssistantActor(s.actor) && oneLine(s.needs).length === 0) {
      warnings.push(`${n}단계에서 AI가 무엇을 받아야 하는지(자료, 하네스, 참고 문서) 적어 두면 좋아요.`);
    }
  });

  if (draft.checkpoints.length === 0) {
    errors.push("확인 지점을 하나 이상 넣어 주세요. 적어도 전달하기 전에 하나는 있어야 해요.");
  }
  draft.checkpoints.forEach((c, i) => {
    const at = indexOf(stages, c.after_stage_id);
    if (at < 0) errors.push(`${i + 1}번째 확인 지점의 위치를 다시 골라 주세요.`);
    const checks = writtenChecks(c);
    if (checks.length === 0) errors.push(`${at >= 0 ? `${at + 1}단계 뒤` : `${i + 1}번째`} 확인 지점에서 무엇을 확인하는지 적어 주세요.`);
    if (checks.some(isVagueCheck)) {
      warnings.push("‘읽어 본다’만으로는 놓치기 쉬워요. 무엇을 보려고 읽는지(숫자와 원본, 이름, 말투) 적어 주세요.");
    }
  });

  // The "before delivery" check: at least one checkpoint at or after the
  // last stage the AI does (assistant or assistant_checked).
  let lastAi = -1;
  stages.forEach((s, i) => {
    if (isAssistantActor(s.actor)) lastAi = i;
  });
  if (lastAi < 0) {
    if (stages.length > 0) warnings.push("AI가 맡는 단계가 아직 없어요. 처리(P) 단계 가운데 AI에게 맡길 곳을 골라 보세요.");
  } else if (
    draft.checkpoints.length > 0 &&
    !draft.checkpoints.some((c) => indexOf(stages, c.after_stage_id) >= lastAi)
  ) {
    errors.push(`AI가 마지막으로 맡는 ${lastAi + 1}단계 뒤에 확인 지점을 하나 넣어 주세요. 전달하기 전에 확인해야 해요.`);
  }

  if (oneLine(draft.trigger).length === 0) errors.push("언제 시작하는지(예: 월요일 아침 8시) 적어 주세요.");
  if (oneLine(draft.delivery).length === 0) errors.push("결과를 누구에게 어떻게 전달하는지 적어 주세요.");

  if (stages.length >= L.minStages && stages.length < L.softMinStages) {
    warnings.push("단계가 적어요. 지난번에 실제로 한 순서대로 빠진 단계가 없는지 한 번 더 보세요.");
  } else if (stages.length > L.softMaxStages && stages.length <= L.maxStages) {
    warnings.push("단계가 많아요. 오늘 하는 방식 그대로 적었는지 보세요. 새 단계를 더하기보다 빼는 쪽이 나아요.");
  }
  return { errors, warnings };
}

/**
 * The blueprint_submitted payload for a draft that passed checkBlueprint:
 * text trimmed, blank checks dropped, orders numbered from 1, checkpoints in
 * stage order. source is passed by the route after it checked the Work Map
 * event is the caller's own.
 */
export function toBlueprintPayload(
  draft: BlueprintDraft,
  source: BlueprintSubmittedPayload["source"] = draft.source,
): BlueprintSubmittedPayload {
  const stages: BlueprintStage[] = draft.stages.map((s, i) => ({
    id: s.id,
    order: i + 1,
    name: oneLine(s.name),
    kind: s.kind ?? "P",
    actor: s.kind === "T" ? "human" : (s.actor ?? "human"),
    needs: s.needs.trim(),
    harness_id: s.harness_id,
  }));
  const checkpoints: BlueprintCheckpoint[] = draft.checkpoints
    .map((c) => ({ c, at: indexOf(draft.stages, c.after_stage_id) }))
    .filter(({ at }) => at >= 0)
    .sort((a, b) => a.at - b.at)
    .map(({ c, at }) => ({ id: c.id, after_stage_id: c.after_stage_id, after_stage: at + 1, checks: writtenChecks(c) }));
  return {
    version: 1,
    task: oneLine(draft.task),
    source,
    stages,
    checkpoints,
    trigger: draft.trigger.trim(),
    delivery: draft.delivery.trim(),
  };
}

/** Reads a stored blueprint_submitted payload, or null when it is not one. */
export function blueprintFromSaved(data: unknown): BlueprintSubmittedPayload | null {
  if (!isRecord(data) || data.version !== 1) return null;
  const draft = parseBlueprintDraft({ ...data, dry_run_started_at: null });
  if (!draft || draft.stages.length === 0) return null;
  return toBlueprintPayload(draft, {
    work_map_event_id: draft.source.work_map_event_id,
    candidate_rank: draft.source.candidate_rank,
  });
}

/** An editable draft from a submitted blueprint (when the draft row is gone). */
export function draftFromBlueprint(p: BlueprintSubmittedPayload): BlueprintDraft {
  return {
    version: 1,
    task: p.task,
    source: { ...p.source },
    stages: p.stages.map((s) => ({
      id: s.id,
      name: s.name,
      kind: s.kind,
      actor: s.actor,
      needs: s.needs,
      harness_id: s.harness_id,
    })),
    checkpoints: p.checkpoints.map((c) => ({ id: c.id, after_stage_id: c.after_stage_id, checks: [...c.checks] })),
    trigger: p.trigger,
    delivery: p.delivery,
    dry_run_started_at: null,
  };
}

/** Minutes since the dry-run timer started, or null when it is not running. */
export function dryRunElapsed(startedAt: string | null, now = Date.now()): number | null {
  if (!startedAt) return null;
  const start = Date.parse(startedAt);
  if (Number.isNaN(start)) return null;
  return Math.max(0, Math.floor((now - start) / 60000));
}

// --- Part 4: baseline (SP-W3-BL) ---

export function emptyBaseline(): BaselineDraft {
  return {
    version: 1,
    task: "",
    source: { work_map_event_id: null, candidate_rank: null, blueprint_event_id: null },
    current_method_stages: ["", ""],
    time_log_event_id: null,
    frequency: { count: null, per: "week" },
    evidence_ref: null,
    quality_checklist: ["", "", "", ""],
    confirmed: false,
  };
}

/**
 * Prefill from the newest blueprint (plan review 2): task and the stage names
 * as done today. The learner can edit both; nothing else is copied.
 */
export function baselineFromBlueprint(
  draft: BaselineDraft,
  blueprint: BlueprintSubmittedPayload,
  blueprintEventId: number,
): BaselineDraft {
  return {
    ...draft,
    task: draft.task.trim() ? draft.task : blueprint.task,
    current_method_stages: draft.current_method_stages.some((s) => s.trim())
      ? draft.current_method_stages
      : blueprint.stages.map((s) => s.name).slice(0, BASELINE_LIMITS.maxStages),
    source: {
      work_map_event_id: blueprint.source.work_map_event_id,
      candidate_rank: blueprint.source.candidate_rank,
      blueprint_event_id: blueprintEventId,
    },
  };
}

export function parseBaselineDraft(input: unknown): BaselineDraft | null {
  if (!isRecord(input) || input.version !== 1) return null;
  const L = BASELINE_LIMITS;
  const lines = (value: unknown, max: number, len: number) =>
    (Array.isArray(value) ? value : []).slice(0, max).map((v) => text(v, len));
  const source = isRecord(input.source) ? input.source : {};
  const frequency = isRecord(input.frequency) ? input.frequency : {};
  const count = frequency.count;
  return {
    version: 1,
    task: text(input.task, L.task),
    source: {
      work_map_event_id: eventId(source.work_map_event_id),
      candidate_rank: rank(source.candidate_rank),
      blueprint_event_id: eventId(source.blueprint_event_id),
    },
    current_method_stages: lines(input.current_method_stages, L.maxStages, L.stage),
    time_log_event_id: eventId(input.time_log_event_id),
    frequency: {
      count: typeof count === "number" && Number.isFinite(count) ? count : null,
      per: frequency.per === "month" ? "month" : "week",
    },
    evidence_ref: typeof input.evidence_ref === "string" && input.evidence_ref.length <= 200 ? input.evidence_ref : null,
    quality_checklist: lines(input.quality_checklist, L.maxChecklist + 4, L.checklistLine),
    confirmed: input.confirmed === true,
  };
}

/**
 * The "before" entries a baseline may cite, from raw time_log_entry rows
 * ({ id, created_at, data }). Dry runs and any other method are left out.
 * Newest first. The same function feeds the form's list and the route's check.
 */
export function beforeEntriesFrom(rows: { id: number; created_at: string; data: unknown }[]): BeforeEntry[] {
  const out: BeforeEntry[] = [];
  for (const row of rows) {
    const d = row.data;
    if (!isRecord(d) || d.method !== "before" || isDryRunEntry(d)) continue;
    if (typeof d.started_at !== "string" || typeof d.ended_at !== "string") continue;
    const minutes = minutesBetween(d.started_at, d.ended_at);
    if (minutes === null || minutes <= 0) continue;
    out.push({
      id: row.id,
      created_at: row.created_at,
      task: typeof d.task === "string" ? d.task : "",
      started_at: d.started_at,
      ended_at: d.ended_at,
      evidence_ref: typeof d.evidence_ref === "string" ? d.evidence_ref : null,
    });
  }
  return out.sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at) || b.id - a.id);
}

/** Entries whose task matches the baseline task first, then the rest; each group newest first. */
export function orderBeforeEntries(entries: BeforeEntry[], task: string): BeforeEntry[] {
  const match = entries.filter((e) => sameTask(e.task, task));
  return [...match, ...entries.filter((e) => !sameTask(e.task, task))];
}

export function writtenLines(lines: string[]): string[] {
  return lines.map(oneLine).filter((l) => l.length > 0);
}

/**
 * C4. `entries` are the learner's own before-entries (beforeEntriesFrom).
 * No entry at all is an error with the curriculum's instruction: log one
 * instance done the old way this week; the countersign then moves to Week 4.
 * The app has no partial lock (plan review 2): an incomplete checklist stays
 * unlocked and is countersigned in Week 4 too.
 */
export function checkBaseline(draft: BaselineDraft, entries: BeforeEntry[]): CheckResult {
  const L = BASELINE_LIMITS;
  const errors: string[] = [];
  const warnings: string[] = [];

  if (oneLine(draft.task).length === 0) errors.push("캡스톤으로 삼을 업무를 적어 주세요.");

  const stages = writtenLines(draft.current_method_stages);
  if (stages.length < L.minStages) errors.push(`지금 하는 방식을 단계로 ${L.minStages}개 이상 적어 주세요.`);

  const entry = draft.time_log_event_id === null ? null : entries.find((e) => e.id === draft.time_log_event_id);
  if (entries.length === 0) {
    errors.push(
      "1주차 ‘기존 방식’ 시간 기록이 없어요. 이번 주에 이 업무를 예전 방식으로 한 번 하고 시간을 기록해 주세요. 기준선은 그 기록으로 확정하고, 강사 확인은 4주차에 받아요.",
    );
  } else if (!entry) {
    errors.push("기준이 될 ‘기존 방식’ 시간 기록을 하나 골라 주세요.");
  } else if (!sameTask(entry.task, draft.task) && oneLine(draft.task).length > 0) {
    warnings.push(
      `고른 시간 기록은 ‘${oneLine(entry.task)}’ 업무예요. 캡스톤 업무와 같은 업무를 예전 방식으로 한 기록인지 확인해 주세요.`,
    );
  }

  const count = draft.frequency.count;
  if (count === null || !Number.isInteger(count) || count < 1 || count > L.maxFrequency) {
    errors.push(`이 업무를 ${draft.frequency.per === "month" ? "한 달" : "일주일"}에 몇 번 하는지 1에서 ${L.maxFrequency} 사이 숫자로 적어 주세요.`);
  }

  const checklist = writtenLines(draft.quality_checklist);
  if (checklist.length < L.minChecklist || checklist.length > L.maxChecklist) {
    errors.push(`품질 체크리스트는 ${L.minChecklist}줄에서 ${L.maxChecklist}줄 사이로 적어 주세요. 지금은 ${checklist.length}줄이에요.`);
  }

  if (!draft.confirmed) errors.push("내용을 확인했다는 칸에 표시해 주세요.");
  return { errors, warnings };
}

/**
 * The baseline_locked payload. Call only after checkBaseline passed against
 * the same entries and the route verified the evidence path. Minutes come
 * from the entry, never from the client.
 */
export function toBaselinePayload(
  draft: BaselineDraft,
  entry: BeforeEntry,
  signedAt: string,
  source: BaselineSnapshot["source"] = draft.source,
): BaselineLockedPayload {
  return {
    version: 1,
    task: oneLine(draft.task),
    source,
    current_method_stages: writtenLines(draft.current_method_stages),
    time_log_event_id: entry.id,
    time_logged_at: entry.created_at,
    minutes_per_instance: minutesBetween(entry.started_at, entry.ended_at) ?? 0,
    frequency: { count: draft.frequency.count ?? 1, per: draft.frequency.per },
    evidence_ref: draft.evidence_ref,
    quality_checklist: writtenLines(draft.quality_checklist),
    signed_at: signedAt,
  };
}

/** "주 3회" / "월 2회". */
export function formatFrequency(frequency: BaselineSnapshot["frequency"]): string {
  return `${frequency.per === "month" ? "월" : "주"} ${frequency.count}회`;
}

/**
 * Staff flag (plan review 2): the cited before-entry was logged within a day
 * of the lock, i.e. the curriculum's "no Week 1 log" fallback.
 */
export function loggedJustBeforeLock(snapshot: Pick<BaselineSnapshot, "time_logged_at" | "signed_at">): boolean {
  const logged = Date.parse(snapshot.time_logged_at);
  const signed = Date.parse(snapshot.signed_at);
  if (Number.isNaN(logged) || Number.isNaN(signed)) return false;
  return signed - logged < 24 * 60 * 60 * 1000;
}

/** Reads a user_profile.baseline value, or null when it is not a version 1 snapshot of this shape. */
export function parseBaselineSnapshot(value: unknown): BaselineSnapshot | null {
  if (!isRecord(value) || value.version !== 1) return null;
  if (eventId(value.locked_event_id) === null || eventId(value.time_log_event_id) === null) return null;
  if (typeof value.task !== "string" || typeof value.minutes_per_instance !== "number") return null;
  if (!isRecord(value.frequency) || typeof value.frequency.count !== "number") return null;
  return value as unknown as BaselineSnapshot;
}
