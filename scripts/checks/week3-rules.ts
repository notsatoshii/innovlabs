// Pure checks for src/components/lab/rules-week3.ts and the 2c additions to
// rules.ts. No database, no server: run with
//
//   npx tsx scripts/checks/week3-rules.ts
//
// The blueprint is the Week 1 Monday report as the Week 3 session plan draws
// it (input from three sources, combine and summarise, format in the
// template, check, send for review). Only public session-plan wording is
// used here; the private synthetic pack and templates never enter the repo.
// Exits non-zero on the first failed expectation.

import {
  beforeEntriesFrom,
  checkBaseline,
  checkBlueprint,
  checkWorkspace,
  emptyBaseline,
  firstCheckpoint,
  isVagueCheck,
  mergeLearning,
  parseBlueprintDraft,
  toBaselinePayload,
  toBlueprintPayload,
  toWorkspacePayload,
} from "../../src/components/lab/rules-week3";
import { checkTimeLog, harnessFromSaved, parseTimeLogInput, sameHarness, toHarnessPayload } from "../../src/components/lab/rules";
import type { BlueprintDraft } from "../../src/lib/courses/types";

let failed = 0;
function expect(name: string, cond: boolean, detail?: unknown) {
  if (cond) {
    console.log(`ok   ${name}`);
  } else {
    failed += 1;
    console.log(`FAIL ${name}`, detail ?? "");
  }
}

// --- Blueprint: the Monday report ---

const monday: BlueprintDraft = {
  version: 1,
  task: "주간업무보고 작성",
  source: { work_map_event_id: 1, candidate_rank: 1 },
  stages: [
    { id: "s1", name: "팀원 업데이트 세 곳에서 모으기", kind: "P", actor: "human", needs: "단체방, 메일, 매출 시트", harness_id: null },
    { id: "s2", name: "합쳐서 요약하기", kind: "P", actor: "assistant", needs: "하네스 #1, 지난주 보고서", harness_id: "h1" },
    { id: "s3", name: "양식에 맞추기", kind: "P", actor: "assistant_checked", needs: "보고서 양식", harness_id: "h1" },
    { id: "s4", name: "이슈 우선순위 정하기", kind: "T", actor: "assistant", needs: "", harness_id: null },
    { id: "s5", name: "팀장님께 검토 요청 보내기", kind: "P", actor: "human", needs: "", harness_id: null },
  ],
  checkpoints: [{ id: "c1", after_stage_id: "s3", checks: ["숫자를 원본과 대조", "이름과 직함", ""] }],
  trigger: "월요일 아침 8시",
  delivery: "팀장님께 메일로",
  dry_run_started_at: null,
};

const parsed = parseBlueprintDraft(JSON.parse(JSON.stringify(monday)));
expect("blueprint parses", parsed !== null);
const bp = parsed!;
expect("T stage actor forced to human", bp.stages[3].actor === "human");
const bpCheck = checkBlueprint(bp, new Set(["h1"]));
expect("Monday blueprint has no errors", bpCheck.errors.length === 0, bpCheck.errors);
expect("5 stages warns (typical 6 to 10)", bpCheck.warnings.some((w) => w.includes("단계가 적어요")), bpCheck.warnings);
expect("unknown harness id is an error", checkBlueprint(bp, new Set()).errors.length === 2, checkBlueprint(bp, new Set()).errors);

const early = { ...bp, checkpoints: [{ id: "c1", after_stage_id: "s1", checks: ["입력이 다 모였는지"] }] };
expect(
  "checkpoint before the last AI stage is refused",
  checkBlueprint(early).errors.some((e) => e.includes("3단계 뒤")),
  checkBlueprint(early).errors,
);
expect("no checkpoint is refused", checkBlueprint({ ...bp, checkpoints: [] }).errors.length === 1);
expect("trigger and delivery required", checkBlueprint({ ...bp, trigger: " ", delivery: "" }).errors.length === 2);
expect("vague check warns", isVagueCheck("읽어 본다") && !isVagueCheck("숫자를 원본과 대조"));

const payload = toBlueprintPayload(bp);
expect("payload drops blank checks", payload.checkpoints[0].checks.length === 2);
expect("payload numbers stages", payload.stages.map((s) => s.order).join() === "1,2,3,4,5");
expect("checkpoint keeps stage id and order", payload.checkpoints[0].after_stage_id === "s3" && payload.checkpoints[0].after_stage === 3);
const two = { ...bp, checkpoints: [...bp.checkpoints, { id: "c0", after_stage_id: "s2", checks: ["요약에 빠진 사람"] }] };
expect("first checkpoint is the earliest stage", firstCheckpoint(two)?.id === "c0");

// --- Time log dry run ---

const dryInput = parseTimeLogInput({
  task: "주간업무보고 작성",
  method: "pipeline",
  started_at: "2026-10-14T01:00:00Z",
  ended_at: "2026-10-14T01:12:00Z",
  interruptions: 0,
  evidence_ref: null,
  dry_run: { blueprint_event_id: 42, checkpoint_id: "c1" },
});
expect("dry run parses", dryInput?.dry_run?.blueprint_event_id === 42);
expect("dry run on pipeline is valid", dryInput !== null && checkTimeLog(dryInput).length === 0);
expect(
  "dry run on before is refused",
  dryInput !== null && checkTimeLog({ ...dryInput, method: "before" }).length === 1,
);
expect("malformed dry run is a bad request", parseTimeLogInput({ ...dryInput, dry_run: { blueprint_event_id: "x" } }) === null);

// --- Baseline ---

const rows = [
  { id: 10, created_at: "2026-10-01T09:00:00Z", data: { version: 1, task: "주간업무보고 작성", method: "before", started_at: "2026-09-30T23:00:00Z", ended_at: "2026-10-01T01:05:00Z", interruptions: 2, evidence_ref: null } },
  { id: 11, created_at: "2026-10-14T02:00:00Z", data: { version: 1, task: "주간업무보고 작성", method: "pipeline", started_at: "2026-10-14T01:00:00Z", ended_at: "2026-10-14T01:12:00Z", interruptions: 0, evidence_ref: null, dry_run: { blueprint_event_id: 42, checkpoint_id: "c1" } } },
  { id: 12, created_at: "2026-10-14T03:00:00Z", data: { version: 1, task: "회의록", method: "harness", started_at: "2026-10-14T01:00:00Z", ended_at: "2026-10-14T01:30:00Z", interruptions: 0, evidence_ref: null } },
];
const entries = beforeEntriesFrom(rows);
expect("only the before entry is citable", entries.length === 1 && entries[0].id === 10, entries);

const draft = {
  ...emptyBaseline(),
  task: "주간업무보고 작성",
  current_method_stages: ["업데이트 모으기", "요약", "양식"],
  time_log_event_id: 10,
  frequency: { count: 1, per: "week" as const },
  quality_checklist: ["섹션 순서가 맞다", "숫자가 원본과 같다", "합니다체", "A4 한 장"],
  confirmed: true,
};
const blCheck = checkBaseline(draft, entries);
expect("complete baseline passes", blCheck.errors.length === 0, blCheck.errors);
expect("dry-run entry cannot be cited", checkBaseline({ ...draft, time_log_event_id: 11 }, entries).errors.length === 1);
expect("no before entry gives the Week 4 instruction", checkBaseline(draft, []).errors.some((e) => e.includes("4주차")));
expect("three checklist lines refused", checkBaseline({ ...draft, quality_checklist: ["a", "b", "c"] }, entries).errors.length === 1);
expect("frequency 0 refused", checkBaseline({ ...draft, frequency: { count: 0, per: "week" } }, entries).errors.length === 1);
expect("other task warns", checkBaseline({ ...draft, task: "회의록 정리" }, entries).warnings.length === 1);
const locked = toBaselinePayload(draft, entries[0], "2026-10-14T05:00:00Z");
expect("minutes come from the entry", locked.minutes_per_instance === 125, locked.minutes_per_instance);
expect("payload carries the entry id", locked.time_log_event_id === 10 && locked.time_logged_at === "2026-10-01T09:00:00Z");

// --- Workspace ---

const ws = {
  assistant: "claude" as const,
  assistant_other: "",
  path: "browser" as const,
  workspace_name: "주간업무보고",
  instructions_set: true,
  references_uploaded: false,
  test_followed: false,
  uploads_blocked: true,
};
const wsCheck = checkWorkspace(ws);
expect("failed test is allowed with the fix shown", wsCheck.errors.length === 0 && wsCheck.warnings.length === 2, wsCheck);
expect("unanswered is refused", checkWorkspace({ ...ws, test_followed: null }).errors.length === 1);
const learning = mergeLearning({ version: 1, style: "keep", blocked_tools: ["x"] }, toWorkspacePayload(ws));
expect("learning merge keeps reserved fields", learning.style === "keep" && learning.blocked_tools?.[0] === "x");
expect("workspace not ready after a failed test", learning.workspace_ready === false && learning.uploads_blocked === true);

// --- Harness template provenance ---

const base = { id: "h1", name: "주간업무보고", doc_type: "보고서", role: "r", context: "c", format: "f", rules: ["a"], example: "", fallbacks: "x" };
expect("template_id does not make a new version", sameHarness(base, { ...base, template_id: "SP-HL-01" }));
const saved = toHarnessPayload({ ...base, template_id: "SP-HL-01" }, 1);
expect("template_id is saved", saved.template_id === "SP-HL-01");
expect("template_id reads back", harnessFromSaved(saved)?.item.template_id === "SP-HL-01");
expect("bad template_id is dropped", toHarnessPayload({ ...base, template_id: "../x" }, 1).template_id === undefined);

if (failed > 0) {
  console.log(`\n${failed} failed`);
  process.exit(1);
}
console.log("\nall passed");
