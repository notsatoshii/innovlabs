"use client";

// The Week 3 Part 4 baseline form (SP-W3-BL; phase-2c C4). Six parts in the
// session plan's order: the capstone task, the current method's stages, the
// "before" entry whose minutes are the time per instance (chosen from
// a list, never typed), how often, the "before" evidence, and quality
// checklist v0; then the learner's own confirmation and 기준선 확정하기.
//
// The draft autosaves to the server (useDraft "baseline"). The rules under
// the button are checkBaseline, the same function the lock route runs again
// against the learner's own entries. Locking is possible only while Week 3
// is open (D5); the form explains the other states and keeps saving.

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BASELINE_LIMITS, type ApiResult, type BaselineDraft } from "@/lib/courses/types";
import type { BaselineSnapshot } from "@/lib/profile/types";
import { ChoiceGroup, ProblemList, SaveStatus, type Choice } from "../inputs";
import { formatMinutes } from "../rules";
import {
  baselineFromBlueprint,
  beforeLine,
  checkBaseline,
  dryRunLine,
  orderBeforeEntries,
  sameBaselineContent,
  sameTask,
} from "../rules-week3";
import { useDraft } from "../useDraft";
import type { BeforeEntryView, BlueprintRef, CandidateOption, DryRunView, LockGateView } from "./types";

const INPUT = "nb-input w-full px-3 py-2.5 text-base leading-relaxed placeholder:text-gray-400";
const SMALL_BUTTON =
  "min-h-11 shrink-0 rounded-xl border border-[var(--nb-line)] bg-[var(--nb-paper)] px-3 text-sm font-bold disabled:opacity-35";

/** The session plan's own examples of checklist lines (Part 4 step 4). */
const CHECKLIST_EXAMPLES = [
  "예: 항목이 다 있다",
  "예: 숫자가 원자료와 맞다",
  "예: 말투가 맞다",
  "예: 정해진 분량 안이다",
  "예: 부장님이 꼭 찾으시는 내용이 있다",
  "예: 이름과 직함이 정확하다",
];

/** The time log opened from here prefills the baseline draft's task and links back. */
const TIME_LOG_FROM_BASELINE = "/app/lab/time-log?from=baseline";

const PER_CHOICES: Choice<"week" | "month">[] = [
  { value: "week", label: "일주일에" },
  { value: "month", label: "한 달에" },
];

type SubmitState =
  | { kind: "idle" }
  | { kind: "sending" }
  /** `draft` is the exact draft that was locked; editing again clears the panel. */
  | { kind: "done"; draft: BaselineDraft }
  | { kind: "failed"; message: string; problems: string[] };

function failureMessage(status: number): string {
  if (status === 401) return "로그인이 풀렸어요. 다시 로그인한 뒤 확정해 주세요. 적은 내용은 그대로 있어요.";
  if (status === 403) return "지금은 확정할 수 없어요.";
  if (status === 422) return "아래 항목을 고친 뒤 다시 확정해 주세요.";
  if (status === 503) return "지금은 확정을 받을 수 없어요. 강사에게 알려 주세요. 적은 내용은 저장돼 있어요.";
  return "확정하지 못했어요. 잠시 뒤 다시 눌러 주세요.";
}

function PartHeading({ order, title, htmlFor }: { order: number; title: string; htmlFor?: string }) {
  const inner = (
    <>
      <span className="nb-badge grid h-7 w-7 shrink-0 place-items-center bg-[var(--nb-yellow)] text-sm font-extrabold">
        {order}
      </span>
      <span className="text-base font-extrabold">{title}</span>
    </>
  );
  return htmlFor ? (
    <label htmlFor={htmlFor} className="flex items-center gap-2">
      {inner}
    </label>
  ) : (
    <h2 className="flex items-center gap-2">{inner}</h2>
  );
}

/** Editable list of one-line inputs with add and remove (stages, checklist). */
function LineList({
  lines,
  onChange,
  min,
  max,
  label,
  placeholder,
  addLabel,
  numbered,
  maxLength,
}: {
  lines: string[];
  onChange: (lines: string[]) => void;
  /** Rows that always stay (no 빼기 below this). */
  min: number;
  max: number;
  /** "단계" / "체크리스트": screen-reader name of each row. */
  label: string;
  placeholder: (index: number) => string;
  addLabel: string;
  numbered?: boolean;
  maxLength: number;
}) {
  const set = (index: number, value: string) => onChange(lines.map((line, i) => (i === index ? value : line)));
  return (
    <div className="flex flex-col gap-2">
      <ol className="flex flex-col gap-2">
        {lines.map((line, i) => (
          <li key={i} className="flex items-center gap-2">
            <span aria-hidden className="w-5 shrink-0 text-right text-sm font-extrabold text-gray-600">
              {numbered ? `${i + 1}` : "·"}
            </span>
            <input
              type="text"
              aria-label={`${label} ${i + 1}`}
              value={line}
              maxLength={maxLength}
              placeholder={placeholder(i)}
              onChange={(e) => set(i, e.target.value)}
              className={`${INPUT} min-w-0 flex-1`}
            />
            {lines.length > min && (
              <button
                type="button"
                aria-label={`${label} ${i + 1} 빼기`}
                onClick={() => onChange(lines.filter((_, j) => j !== i))}
                className={SMALL_BUTTON}
              >
                빼기
              </button>
            )}
          </li>
        ))}
      </ol>
      {lines.length < max && (
        <button
          type="button"
          onClick={() => onChange([...lines, ""])}
          className="nb-btn nb-btn-white min-h-11 w-full px-4 text-sm"
        >
          {addLabel}
        </button>
      )}
    </div>
  );
}

export default function BaselineEditor({
  initialDraft,
  entries,
  dryRun,
  candidates,
  workMapEventId,
  blueprint,
  gate,
  lockedSnapshot,
}: {
  initialDraft: BaselineDraft;
  /** The learner's own "before" entries (beforeEntriesFrom), newest first. */
  entries: BeforeEntryView[];
  /** The newest dry run, or null. */
  dryRun: DryRunView | null;
  /** Work Map candidates in rank order (empty before a Work Map). */
  candidates: CandidateOption[];
  /** The newest work_map_submitted event the candidates come from, or null. */
  workMapEventId: number | null;
  /** The newest submitted blueprint, or null. */
  blueprint: BlueprintRef | null;
  gate: LockGateView;
  /** The locked baseline waiting for the instructor, or null before the first lock. */
  lockedSnapshot: BaselineSnapshot | null;
}) {
  const router = useRouter();
  const { draft, setDraft, saveState, saveProblem, retry, settle } = useDraft<BaselineDraft>("baseline", initialDraft);
  const [submit, setSubmit] = useState<SubmitState>({ kind: "idle" });

  const set = (patch: Partial<BaselineDraft>) => setDraft((prev) => ({ ...prev, ...patch }));
  const { errors, warnings } = checkBaseline(draft, entries);
  const accepted = submit.kind === "done" && submit.draft === draft;
  const locked = lockedSnapshot !== null;
  // 다시 확정 only once something differs from the locked baseline: an
  // identical lock would make the instructor's countersign stale for nothing.
  const unchanged = lockedSnapshot !== null && sameBaselineContent(draft, lockedSnapshot);

  const byId = new Map(entries.map((e) => [e.id, e]));
  const ordered = orderBeforeEntries(entries, draft.task).flatMap((e) => {
    const view = byId.get(e.id);
    return view ? [view] : [];
  });
  const chosen = draft.time_log_event_id === null ? null : (byId.get(draft.time_log_event_id) ?? null);
  // A switch of task in part 1 (say to candidate 2) can leave only entries of
  // another task: part 3 then asks for one of this task, not just a warning.
  const taskWritten = draft.task.trim().length > 0;
  const noSameTaskEntry = taskWritten && ordered.length > 0 && !ordered.some((e) => sameTask(e.task, draft.task));
  // The time log prefills its task from this draft on the server, so the
  // draft is saved before the page opens (not left to the debounce).
  const [leaving, setLeaving] = useState(false);
  const openTimeLog = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    if (leaving) return;
    setLeaving(true);
    void settle().finally(() => router.push(TIME_LOG_FROM_BASELINE));
  };
  // C1: the Week 1 figure beside the dry run is the chosen entry, else the newest.
  const week1 = chosen ?? entries[0] ?? null;
  // One option per evidence path (two entries can cite the same screenshot), then "none".
  const seenEvidence = new Set<string>();
  const evidenceOptions: { ref: string | null; entry: BeforeEntryView | null }[] = [];
  for (const e of entries) {
    if (!e.evidence_ref || seenEvidence.has(e.evidence_ref)) continue;
    seenEvidence.add(e.evidence_ref);
    evidenceOptions.push({ ref: e.evidence_ref, entry: e });
  }
  const hasEvidence = evidenceOptions.length > 0;
  evidenceOptions.push({ ref: null, entry: null });
  const blueprintNewer = blueprint !== null && draft.source.blueprint_event_id !== blueprint.eventId;

  const chooseCandidate = (c: CandidateOption) => {
    setDraft((prev) => {
      const keepBlueprint =
        blueprint !== null &&
        (blueprint.blueprint.source.candidate_rank === c.rank || sameTask(blueprint.blueprint.task, c.task));
      return {
        ...prev,
        task: c.task,
        source: {
          work_map_event_id: workMapEventId,
          candidate_rank: c.rank,
          blueprint_event_id: keepBlueprint ? blueprint.eventId : null,
        },
      };
    });
  };

  const takeBlueprint = () => {
    if (!blueprint) return;
    setDraft((prev) =>
      baselineFromBlueprint({ ...prev, task: "", current_method_stages: [] }, blueprint.blueprint, blueprint.eventId),
    );
  };

  const chooseEntry = (entry: BeforeEntryView) => {
    // The evidence follows the chosen entry; the learner may change it below.
    set({ time_log_event_id: entry.id, evidence_ref: entry.evidence_ref });
  };

  const send = async () => {
    const sent = draft;
    setSubmit({ kind: "sending" });
    let res: Response;
    try {
      res = await fetch("/api/artifacts/baseline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft: sent }),
      });
    } catch {
      setSubmit({ kind: "failed", message: "연결이 끊겼어요. 연결을 확인하고 다시 눌러 주세요.", problems: [] });
      return;
    }
    const result = (await res.json().catch(() => null)) as ApiResult<{ event_id: number }> | null;
    if (res.ok && result?.ok) {
      setSubmit({ kind: "done", draft: sent });
      router.refresh(); // the locked baseline above the form
      return;
    }
    const frozen = result !== null && !result.ok && result.error === "frozen";
    if (frozen) router.refresh(); // countersigned meanwhile: the page becomes the frozen view
    setSubmit({
      kind: "failed",
      message: frozen ? "강사 확인을 받은 기준선이라 바꿀 수 없어요." : failureMessage(res.status),
      problems: !frozen && result && !result.ok ? (result.problems ?? []) : [],
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <SaveStatus state={saveState} problem={saveProblem} onRetry={retry} />
      </div>

      {/* 1. Capstone task */}
      <section className="nb-card flex flex-col gap-3 px-4 py-4">
        <PartHeading order={1} title="캡스톤 업무" htmlFor="baseline-task" />
        <p className="text-sm leading-relaxed text-gray-700">
          보통 후보 1이에요. 설계도를 그려 보니 후보 1이 대부분 판단이었다면 후보 2로 바꿔도 돼요. 다만 오늘
          정한 업무로 끝까지 가요.
        </p>
        <input
          id="baseline-task"
          type="text"
          value={draft.task}
          maxLength={BASELINE_LIMITS.task}
          placeholder="예: 월요일 주간업무보고"
          onChange={(e) => set({ task: e.target.value })}
          className={INPUT}
        />
        {candidates.length > 0 && (
          <div className="flex flex-col gap-2">
            {candidates.map((c) => {
              const selected = draft.source.candidate_rank === c.rank && sameTask(draft.task, c.task);
              return (
                <button
                  key={c.rank}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => chooseCandidate(c)}
                  className={`flex min-h-11 items-center gap-2 rounded-xl border border-[var(--nb-line)] px-3 py-2 text-left text-sm leading-snug ${
                    selected ? "nb-selected font-bold" : "bg-[var(--nb-paper)]"
                  }`}
                >
                  <span className="shrink-0 font-extrabold">후보 {c.rank}</span>
                  <span className="min-w-0 break-words">{c.task}</span>
                </button>
              );
            })}
          </div>
        )}
        {blueprintNewer && blueprint && (
          <button type="button" onClick={takeBlueprint} className="nb-btn nb-btn-white min-h-11 w-full px-4 text-sm">
            설계도에서 업무와 단계 가져오기
          </button>
        )}
      </section>

      {/* 2. Current method */}
      <section className="nb-card flex flex-col gap-3 px-4 py-4">
        <PartHeading order={2} title="지금 하는 방식" />
        <p className="text-sm leading-relaxed text-gray-700">
          하네스를 쓰기 전, 지금 하는 단계를 순서대로 적어요. 설계도에서 가져왔다면 지금 하는 그대로인지만 보면
          돼요.
        </p>
        <LineList
          lines={draft.current_method_stages}
          onChange={(current_method_stages) => set({ current_method_stages })}
          min={BASELINE_LIMITS.minStages}
          max={BASELINE_LIMITS.maxStages}
          label="단계"
          placeholder={(i) => (i === 0 ? "예: 팀원들에게 실적 자료를 받는다" : "다음 단계")}
          addLabel="+ 단계 추가"
          maxLength={BASELINE_LIMITS.stage}
          numbered
        />
      </section>

      {/* 3. Time per instance: a "before" entry (logged in Week 1 or later) */}
      <section className="nb-card flex flex-col gap-3 px-4 py-4">
        <PartHeading order={3} title="한 번 할 때 걸리는 시간" />
        <p className="text-sm leading-relaxed text-gray-700">
          하네스를 쓰기 전 예전 방식으로 했을 때의 시간 기록을 하나 고르세요. 그 기록에 걸린 시간이 기준이 돼요.
        </p>
        {ordered.length === 0 ? (
          <div className="nb-flat flex flex-col gap-3 bg-[var(--nb-yellow)] px-3 py-3">
            <p className="text-sm font-bold leading-relaxed">
              아직 ‘기존 방식’ 시간 기록이 없어요. 이번 주에 이 업무를 예전 방식으로 한 번 하고 시간을 기록해
              주세요. 기준선이 하네스를 쓰기 전의 기록이어야 전후 비교에 의미가 있어요. 이때는 강사 확인을
              4주차에 받아요.
            </p>
            <Link
              href={TIME_LOG_FROM_BASELINE}
              onClick={openTimeLog}
              className="nb-btn nb-btn-white flex min-h-11 w-full items-center justify-center px-4 text-sm"
            >
              시간 기록하러 가기
            </Link>
          </div>
        ) : (
          <>
            <fieldset className="min-w-0">
              <legend className="sr-only">기준이 될 시간 기록</legend>
              <div className="flex flex-col gap-2">
                {ordered.map((entry) => {
                  const checked = draft.time_log_event_id === entry.id;
                  const same = sameTask(entry.task, draft.task);
                  return (
                    <label
                      key={entry.id}
                      className={[
                        "flex min-h-11 cursor-pointer flex-col gap-1 rounded-xl border border-[var(--nb-line)] px-3 py-2.5",
                        "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--nb-pink-deep)]",
                        checked ? "nb-selected" : "bg-[var(--nb-paper)]",
                      ].join(" ")}
                    >
                      <input
                        type="radio"
                        name="baseline-entry"
                        className="sr-only"
                        checked={checked}
                        onChange={() => chooseEntry(entry)}
                      />
                      <span className="flex items-start justify-between gap-2">
                        <span className="min-w-0 flex-1 break-words text-[15px] font-bold leading-snug">
                          {entry.task || "업무 이름 없음"}
                        </span>
                        {same && (
                          <span className="nb-badge shrink-0 bg-[var(--nb-lime)] px-2 py-0.5 text-[11px]">같은 업무</span>
                        )}
                      </span>
                      <span className="text-sm">
                        <b>{formatMinutes(entry.minutes)}</b>
                        <span className="text-gray-700"> · {entry.dayLabel}</span>
                        {entry.evidence_ref && <span className="text-gray-600"> · 완성본 화면 있음</span>}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
            {noSameTaskEntry ? (
              <div className="nb-flat flex flex-col gap-3 bg-[var(--nb-yellow)] px-3 py-3">
                <p className="text-sm font-bold leading-relaxed">
                  {`‘${draft.task.trim()}’ 업무를 예전 방식으로 한 기록은 아직 없어요. 다른 업무의 기록으로 확정하면 11주차에 서로 다른 업무를 비교하게 돼요. 이번 주에 이 업무를 예전 방식으로 한 번 하고 시간을 기록해 주세요. 이때는 강사 확인을 4주차에 받아요.`}
                </p>
                <Link
                  href={TIME_LOG_FROM_BASELINE}
                  onClick={openTimeLog}
                  className="nb-btn nb-btn-white flex min-h-11 w-full items-center justify-center px-4 text-sm"
                >
                  시간 기록하러 가기
                </Link>
              </div>
            ) : (
              <p className="text-sm text-gray-700">
                고를 기록이 없으면 새로 남겨 주세요.{" "}
                <Link
                  href={TIME_LOG_FROM_BASELINE}
                  onClick={openTimeLog}
                  className="inline-flex min-h-11 items-center font-bold underline underline-offset-4"
                >
                  시간 기록하러 가기
                </Link>
              </p>
            )}
          </>
        )}

        {dryRun && week1 && (
          <div className="nb-flat flex flex-col gap-1 bg-[var(--background)] px-3 py-2.5 text-sm leading-relaxed">
            <p className="text-xs font-extrabold text-gray-600">시험 실행과 기존 방식 기록</p>
            <p>{dryRunLine(dryRun.minutes, dryRun.dayLabel)}</p>
            <p>{beforeLine(week1.minutes, week1.dayLabel)}</p>
          </div>
        )}
      </section>

      {/* 4. Frequency */}
      <section className="nb-card flex flex-col gap-3 px-4 py-4">
        <PartHeading order={4} title="하는 횟수" htmlFor="baseline-count" />
        <ChoiceGroup
          name="baseline-per"
          legend="기간"
          legendHidden
          options={PER_CHOICES}
          value={draft.frequency.per}
          onChange={(per) => set({ frequency: { ...draft.frequency, per } })}
          columns
        />
        <div className="flex items-center gap-2">
          <input
            id="baseline-count"
            type="text"
            inputMode="numeric"
            value={draft.frequency.count === null ? "" : String(draft.frequency.count)}
            placeholder="0"
            onChange={(e) => {
              const digits = e.target.value.replace(/[^0-9]/g, "").slice(0, 3);
              set({ frequency: { ...draft.frequency, count: digits ? Number.parseInt(digits, 10) : null } });
            }}
            className="nb-input h-11 w-20 px-2 text-center text-[15px] font-bold"
          />
          <span className="text-sm text-gray-700">번 해요</span>
        </div>
      </section>

      {/* 5. Evidence */}
      <section className="nb-card flex flex-col gap-3 px-4 py-4">
        <PartHeading order={5} title="하네스 쓰기 전 결과물" />
        <p className="text-sm leading-relaxed text-gray-700">
          하네스를 쓰기 전 결과물 화면을 남겨요. 시간 기록에 올린 화면 가운데서 골라요. 없으면 비워
          둬도 돼요.
        </p>
        {!hasEvidence ? (
          <p className="text-sm text-gray-600">시간 기록에 올린 완성본 화면이 아직 없어요.</p>
        ) : (
          <fieldset className="min-w-0">
            <legend className="sr-only">하네스 쓰기 전 결과물</legend>
            <div className="flex flex-col gap-2">
              {evidenceOptions.map(({ ref, entry }) => {
                  const checked = draft.evidence_ref === ref;
                  return (
                    <div
                      key={ref ?? "none"}
                      className={`flex min-h-11 items-center gap-2 rounded-xl border border-[var(--nb-line)] px-3 py-2 ${
                        checked ? "nb-selected" : "bg-[var(--nb-paper)]"
                      }`}
                    >
                      <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-sm leading-snug has-[:focus-visible]:underline">
                        <input
                          type="radio"
                          name="baseline-evidence"
                          className="sr-only"
                          checked={checked}
                          onChange={() => set({ evidence_ref: ref })}
                        />
                        <span className={`min-w-0 break-words ${checked ? "font-bold" : ""}`}>
                          {entry ? `${entry.task || "업무 이름 없음"} · ${entry.dayLabel}의 완성본 화면` : "화면 없이 비워 둘게요"}
                        </span>
                      </label>
                      {entry?.evidenceUrl && (
                        <a
                          href={entry.evidenceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 py-2 text-sm font-bold underline underline-offset-4"
                        >
                          보기
                        </a>
                      )}
                    </div>
                  );
              })}
            </div>
          </fieldset>
        )}
      </section>

      {/* 6. Quality checklist v0 */}
      <section className="nb-card flex flex-col gap-3 px-4 py-4">
        <PartHeading order={6} title="품질 체크리스트" />
        <p className="text-sm leading-relaxed text-gray-700">
          이 업무에서 좋은 결과물이 무엇인지 {BASELINE_LIMITS.minChecklist}~{BASELINE_LIMITS.maxChecklist}줄로
          정해요. 11주차에 전과 후 결과물을 이 체크리스트로 똑같이 채점해요.
        </p>
        <LineList
          lines={draft.quality_checklist}
          onChange={(quality_checklist) => set({ quality_checklist })}
          min={BASELINE_LIMITS.minChecklist}
          max={BASELINE_LIMITS.maxChecklist}
          label="체크리스트"
          placeholder={(i) => CHECKLIST_EXAMPLES[i] ?? ""}
          addLabel="+ 한 줄 추가"
          maxLength={BASELINE_LIMITS.checklistLine}
        />
      </section>

      {/* Confirmation and lock */}
      <section className="nb-card flex flex-col gap-3 px-4 py-4">
        <label className="flex min-h-11 cursor-pointer items-start gap-3 text-[15px] leading-relaxed">
          <input
            type="checkbox"
            checked={draft.confirmed}
            onChange={(e) => set({ confirmed: e.target.checked })}
            className="mt-1 h-5 w-5 shrink-0 accent-[var(--nb-ink)]"
          />
          <span>지금 하는 방식 그대로 적었는지 제가 직접 확인했어요.</span>
        </label>

        {accepted ? (
          <div aria-live="polite" className="flex flex-col gap-2">
            <p className="nb-flat bg-[var(--nb-lime)] px-3 py-2.5 text-[15px] font-extrabold">기준선을 확정했어요.</p>
            <p className="text-sm leading-relaxed">
              수업이 끝나기 전에 강사에게 확인을 받으세요. 확인을 받기 전에는 고쳐서 다시 확정할 수 있어요.
            </p>
          </div>
        ) : gate.state === "open" ? (
          <>
            <button
              type="button"
              onClick={send}
              disabled={errors.length > 0 || unchanged || submit.kind === "sending"}
              className="nb-btn nb-btn-primary w-full px-4 py-3.5 text-[15px]"
            >
              {submit.kind === "sending" ? "확정하는 중…" : locked ? "기준선 다시 확정하기" : "기준선 확정하기"}
            </button>
            {unchanged && submit.kind !== "sending" && (
              <p className="text-sm leading-relaxed text-gray-700">
                확정한 내용에서 바뀐 곳이 없어요. 고친 뒤에 다시 확정할 수 있어요.
              </p>
            )}
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
            <ProblemList errors={errors} warnings={warnings} />
          </>
        ) : (
          <div className="nb-flat flex flex-col gap-2 bg-[var(--background)] px-3 py-3 text-sm leading-relaxed">
            <p className="font-bold">
              {gate.state === "closed" &&
                (gate.opensOn
                  ? `3주차 수업이 열리는 ${gate.opensOn}부터 확정할 수 있어요.`
                  : "3주차 수업이 열리면 확정할 수 있어요.")}
              {gate.state === "not_enrolled" && "수강 코드를 등록하면 확정할 수 있어요."}
              {gate.state === "error" && "수강 정보를 불러오지 못해 지금은 확정할 수 없어요. 잠시 뒤 새로고침해 주세요."}
            </p>
            <p className="text-gray-700">적는 내용은 그대로 저장돼요.</p>
            {gate.state === "not_enrolled" && (
              <Link href="/app/courses" className="self-start py-1 font-bold underline underline-offset-4">
                코스 탭에서 수강 코드 등록하기
              </Link>
            )}
          </div>
        )}

        <p className="text-xs leading-relaxed text-gray-600">
          강사가 확인하면 그 뒤로는 기준선을 바꿀 수 없어요. 기준선은 본인과 강사·운영진만 볼 수 있어요.
        </p>
      </section>
    </div>
  );
}
