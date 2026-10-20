"use client";

// I9 내 업무 입력: the learner's own work, written into the same drafts and
// artifact routes as the Week 1 labs (phase-online O1-D5), so staff see one
// record whichever format the learner took.
//
//   seed_rows            2–3 pieces of the Q8 task, each 처리/판단 → work_map draft rows
//   work_map_rows        the lab's StepWrite (rows + hours), gate 12–25 rows, 25–50 h
//   work_map_extra_row   one more row → work_map draft
//   work_map_classify    the lab's StepClassify (P/T, mixed rows split)
//   work_map_candidates  the lab's StepCandidates, then POST /api/artifacts/work-map
//   drill_invention      the span Round 2 invented → drill draft
//   drill_left_for_human one line → drill draft, then POST /api/artifacts/drill
//
// Each target ends with POST /api/course/step after the draft reached the
// server (settle), because the server checks the draft before paying. A step
// is marked done only when it was recorded, or when it waits in the outbox
// for a resend (no connection); when the draft did not save or the server
// could not verify the step, the screen stays open and says why, with the
// button to try again (review P0-1).

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { I9MyTask as I9 } from "@/lib/course/types";
import type { ApiResult, DrillDraft, WorkMapDraft, WorkMapRow } from "@/lib/courses/types";
import { checkWorkMap, totals, type WorkMapRules } from "@/lib/courses/work-map";
import { HoursStepper, ProblemList, SaveStatus } from "@/components/lab/inputs";
import { DRILL_LIMITS, checkExtraCategories, formatHours, newId, writtenDifferences } from "@/components/lab/rules";
import { StepCandidates } from "@/components/lab/work-map/StepCandidates";
import { StepClassify } from "@/components/lab/work-map/StepClassify";
import { StepWrite } from "@/components/lab/work-map/StepWrite";
import { NetLine, amountText, materialChoice, retryable, useAward, usePlayer, type InteractionProps } from "./context";
import { SpanDoc, type Segment } from "./SpanDoc";

/** A row names a task when it ends in a verb nominal (~하기, ~적기, …). */
const VERB = /기$/;
const ROW_ERR = "'~하기'로 끝나게 적어 주세요. 예: '지난주 숫자 옮겨 적기'.";
export const validTask = (t: string) => t.trim().length >= 4 && VERB.test(t.trim());

export function I9MyTask(props: InteractionProps<I9>) {
  switch (props.i.target) {
    case "seed_rows":
      return <SeedRows {...props} />;
    case "work_map_rows":
      return <MapRows {...props} />;
    case "work_map_extra_row":
      return <ExtraRow {...props} />;
    case "work_map_classify":
      return <Classify {...props} />;
    case "work_map_candidates":
      return <Candidates {...props} />;
    case "drill_invention":
      return <Invention {...props} />;
    case "drill_left_for_human":
      return <LeftForHuman {...props} />;
  }
}

/** The online course lets candidate #1 recur monthly (audience review #12). */
const COURSE_RULES: WorkMapRules = { firstRecurs: "month" };

const SAVE_FAILED: Record<string, string> = {
  signed_out: "로그인이 풀려서 저장하지 못했어요. 다른 탭에서 다시 로그인한 뒤 한 번 더 눌러 주세요.",
  too_large: "내용이 너무 길어서 저장하지 못했어요. 조금 줄인 뒤 다시 눌러 주세요.",
  network: "아직 저장하지 못했어요. 연결을 확인하고 한 번 더 눌러 주세요. 적은 내용은 그대로 있어요.",
};

/**
 * Sends the step once the draft is on the server. Marks done when the step
 * was recorded or waits in the outbox; otherwise the screen stays open.
 */
function useFinish(i: I9, onDone: () => void, draft: { settle: () => Promise<boolean>; saveProblem: string | null }) {
  const award = useAward();
  const [paid, setPaid] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  const [busy, setBusy] = useState(false);
  const [unsaved, setUnsaved] = useState(false);
  const finish = async (): Promise<boolean> => {
    setBusy(true);
    setUnsaved(false);
    const saved = await draft.settle();
    if (!saved) {
      setBusy(false);
      setUnsaved(true);
      return false;
    }
    const res = await award.stepResult(i.id, i.xp.part);
    setBusy(false);
    if (res.ok) setPaid(res.data.amount);
    if (res.ok || retryable(res.error)) {
      setFinished(true);
      onDone();
      return true;
    }
    return false; // not recorded: award.error says why, the button stays
  };
  const saveLine = unsaved ? (SAVE_FAILED[draft.saveProblem ?? "network"] ?? SAVE_FAILED.network) : null;
  return { finish, finished, busy, paid, saveLine, error: award.error, retry: award.retry };
}

/** A finished mission played again: saving here changes the learner's live work (review P2-11). */
function ReplayNote({ what }: { what: string }) {
  const { alreadyDone } = usePlayer();
  if (!alreadyDone) return null;
  return <p className="c-small">이미 끝낸 미션이에요. 여기서 저장하면 {what}이 바뀌어요.</p>;
}

function FinishLines({ f }: { f: { saveLine: string | null; error: ReturnType<typeof useAward>["error"]; retry: () => Promise<void> } }) {
  return (
    <>
      {f.saveLine && (
        <p className="c-hint" role="alert">
          {f.saveLine}
        </p>
      )}
      <NetLine error={f.error} onRetry={() => void f.retry()} />
    </>
  );
}

// --- seed_rows ----------------------------------------------------------------

const SEED_PREFIX = "seed-";

function SeedRows({ i, onDone }: InteractionProps<I9>) {
  const { workMap, seedCategory } = usePlayer();
  const existing = workMap.draft.rows.filter((r) => r.id.startsWith(SEED_PREFIX));
  const [texts, setTexts] = useState<string[]>(() => [0, 1, 2].map((k) => existing[k]?.task ?? ""));
  const [marks, setMarks] = useState<("p" | "j" | null)[]>(() =>
    [0, 1, 2].map((k) => (existing[k]?.kind === "P" ? "p" : existing[k]?.kind === "T" ? "j" : null)),
  );
  const f = useFinish(i, onDone, workMap);
  const { finished, paid } = f;

  const filled = texts.map((t, k) => ({ t: t.trim(), k })).filter((x) => x.t);
  let hint = "";
  for (const { t, k } of filled) {
    if (!validTask(t)) {
      hint = ROW_ERR;
      break;
    }
    if (!marks[k]) hint = hint || "각 조각에 처리인지 판단인지 표시해 주세요.";
  }
  if (!hint && filled.length === 1) hint = "조각을 하나 더 적어 주세요. 2개는 있어야 해요.";
  const ok = !hint && filled.length >= 2;
  const allJudge = ok && filled.every(({ k }) => marks[k] === "j");

  const save = () => {
    const rows: WorkMapRow[] = filled.map(({ t, k }, n) => ({
      id: `${SEED_PREFIX}${n + 1}`,
      category: seedCategory,
      task: t,
      hours: existing[n]?.hours ?? 1,
      kind: marks[k] === "p" ? "P" : "T",
    }));
    workMap.setDraft((d: WorkMapDraft) => ({
      ...d,
      rows: [...rows, ...d.rows.filter((r) => !r.id.startsWith(SEED_PREFIX))],
      candidates: d.candidates.filter((c) => !c.rowId.startsWith(SEED_PREFIX) || rows.some((r) => r.id === c.rowId)),
    }));
    void f.finish();
  };

  return (
    <div className="flex flex-col gap-3">
      <ReplayNote what="워크맵의 씨앗 줄" />
      {[0, 1, 2].map((k) => (
        <div key={k} className="c-row">
          <input
            type="text"
            className={`c-input${texts[k].trim() && !validTask(texts[k]) ? " is-bad" : ""}`}
            maxLength={40}
            value={texts[k]}
            disabled={finished}
            aria-label={`조각 ${k + 1}`}
            placeholder={`예: ${i.placeholders?.[k] ?? ""}${k === 2 ? " (선택)" : ""}`}
            onChange={(e) => setTexts((prev) => prev.map((x, n) => (n === k ? e.target.value : x)))}
          />
          <div className="c-seg" role="group" aria-label={`조각 ${k + 1} 처리 또는 판단`}>
            {(["p", "j"] as const).map((m) => (
              <button
                key={m}
                type="button"
                disabled={finished}
                aria-pressed={marks[k] === m}
                className={marks[k] === m ? `is-on is-${m}` : ""}
                onClick={() => setMarks((prev) => prev.map((x, n) => (n === k ? m : x)))}
              >
                {m === "p" ? "처리" : "판단"}
              </button>
            ))}
          </div>
        </div>
      ))}
      {hint && (
        <p className="c-hint" role="status">
          {hint}
        </p>
      )}
      {allJudge && !finished && (
        <p className="c-warn">
          전부 판단으로 표시하셨어요. 그중 하나는 &apos;옮기고 맞추는&apos; 조각이 아닐까요? 귀찮은
          이유가 &apos;어려워서&apos;가 아니라 &apos;반복이라서&apos;라면 처리예요.
        </p>
      )}
      {finished ? (
        <p className="c-okline" role="status">{`워크맵 씨앗 ${filled.length}줄을 저장했어요.${amountText(paid)}`}</p>
      ) : (
        <button type="button" className="nb-btn nb-btn-white c-btn" disabled={!ok || f.busy} onClick={save}>
          {f.busy ? "저장하는 중…" : "조각 저장"}
        </button>
      )}
      <FinishLines f={f} />
    </div>
  );
}

// --- work_map_rows -------------------------------------------------------------

function MapRows({ i, onDone }: InteractionProps<I9>) {
  const { workMap, categories } = usePlayer();
  const { draft, setDraft, saveState, saveProblem, retry: retrySave } = workMap;
  const f = useFinish(i, onDone, workMap);
  const { finished, paid } = f;

  const named = draft.rows.filter((r) => r.task.trim());
  const bad = named.filter((r) => !validTask(r.task));
  const withHours = named.filter((r) => validTask(r.task) && r.hours > 0);
  const total = withHours.reduce((s, r) => s + r.hours, 0);
  const n = named.length - bad.length;

  const lines: string[] = [];
  if (n < 10) lines.push("업무가 너무 크게 적혔어요. '회의'는 '상태 공유 회의'와 '결정 회의'로 나눠 보세요.");
  else if (n < 12) lines.push("한두 줄만 더요. 어제 오후에 한 일 중 빠진 게 있어요.");
  else if (n > 25) lines.push("조금 합쳐도 돼요. 같은 목적의 줄은 하나로요.");
  if (n >= 12 && total < 25) {
    lines.push(`시간을 더해 보니 ${formatHours(total)}시간이에요. 일주일치가 아니에요. 줄마다 시간을 한 번 더 보세요.`);
  }
  if (total > 50) lines.push(`${formatHours(total)}시간이에요. 겹쳐 적힌 줄이 있을 거예요. 같은 일이 두 영역에 있는지 보세요.`);
  const ok = withHours.length >= 12 && withHours.length <= 25 && total >= 25 && total <= 50 && bad.length === 0;

  return (
    <div className="c-embed">
      <ReplayNote what="워크맵" />
      <div className="flex justify-end">
        <SaveStatus state={saveState} problem={saveProblem} onRetry={retrySave} />
      </div>
      <StepWrite categories={categories} draft={draft} setDraft={setDraft} />
      <div className="nb-flat c-sticky flex flex-col gap-1.5 px-4 py-3 text-sm" role="status">
        <p className="font-bold">
          워크맵 {n}줄 · {formatHours(total)}시간
          {named.length - bad.length - withHours.length > 0 && (
            <span className="c-small"> · 시간 없음 {named.length - bad.length - withHours.length}줄</span>
          )}
        </p>
        {bad.length > 0 && (
          <p className="c-hint">
            {ROW_ERR} ({bad.map((r) => r.task.trim()).slice(0, 3).join(", ")}
            {bad.length > 3 ? " 외" : ""})
          </p>
        )}
        {lines.map((l) => (
          <p key={l} className="c-small">
            {l}
          </p>
        ))}
        {finished ? (
          <p className="c-okline">{`워크맵을 저장했어요.${amountText(paid)}`}</p>
        ) : (
          <button
            type="button"
            className="nb-btn nb-btn-white c-btn"
            disabled={!ok || f.busy}
            onClick={() => void f.finish()}
          >
            {f.busy ? "저장하는 중…" : "워크맵 저장"}
          </button>
        )}
      </div>
      <FinishLines f={f} />
    </div>
  );
}

// --- work_map_extra_row ---------------------------------------------------------

function ExtraRow({ i, onDone }: InteractionProps<I9>) {
  const { workMap, categories } = usePlayer();
  const [task, setTask] = useState("");
  const [hours, setHours] = useState(1);
  const [category, setCategory] = useState(categories[0]?.id ?? "a");
  const [tried, setTried] = useState(false);
  // The row once added; a retry after a failed save must not add it twice.
  const [addedId, setAddedId] = useState<string | null>(null);
  const f = useFinish(i, onDone, workMap);
  const { finished, paid } = f;

  const add = () => {
    setTried(true);
    if (!validTask(task) || !(hours > 0)) return;
    const id = addedId ?? newId("r");
    setAddedId(id);
    workMap.setDraft((d: WorkMapDraft) => ({
      ...d,
      rows: [
        ...d.rows.filter((r) => r.id !== id),
        { id, category, task: task.trim(), hours, kind: d.rows.find((r) => r.id === id)?.kind ?? null },
      ],
    }));
    void f.finish();
  };

  return (
    <div className="flex flex-col gap-3">
      <input
        type="text"
        className={`c-input${tried && !validTask(task) ? " is-bad" : ""}`}
        maxLength={40}
        value={task}
        disabled={finished}
        placeholder={i.placeholders?.[0] ?? "~하기"}
        aria-label="더할 업무"
        onChange={(e) => setTask(e.target.value)}
      />
      <div className="flex flex-wrap items-center gap-3">
        <select
          className="c-input"
          style={{ width: "auto", flex: 1 }}
          value={category}
          disabled={finished}
          aria-label="영역"
          onChange={(e) => setCategory(e.target.value)}
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        <HoursStepper value={hours} onChange={setHours} label="일주일 시간" />
      </div>
      {tried && !validTask(task) && (
        <p className="c-hint" role="status">
          {ROW_ERR}
        </p>
      )}
      {finished ? (
        <p className="c-okline" role="status">{`한 줄 더했어요.${amountText(paid)}`}</p>
      ) : (
        <button type="button" className="c-sbtn is-pri self-start" disabled={f.busy} onClick={add}>
          {addedId ? "다시 저장" : "줄 더하기"}
        </button>
      )}
      <FinishLines f={f} />
    </div>
  );
}

// --- work_map_classify ----------------------------------------------------------

function Classify({ i, onDone }: InteractionProps<I9>) {
  const router = useRouter();
  const { workMap, categories } = usePlayer();
  const { draft, setDraft, saveState, saveProblem, retry: retrySave } = workMap;
  const f = useFinish(i, onDone, workMap);
  const { finished, paid } = f;
  const left = draft.rows.filter((r) => r.kind !== "P" && r.kind !== "T").length;
  const ok = draft.rows.length > 0 && left === 0;
  const t = totals(draft.rows);

  return (
    <div className="c-embed">
      <ReplayNote what="워크맵의 처리·판단" />
      <div className="flex justify-end">
        <SaveStatus state={saveState} problem={saveProblem} onRetry={retrySave} />
      </div>
      <StepClassify
        categories={categories}
        draft={draft}
        setDraft={setDraft}
        onGoWrite={() => router.push("/app/course/m/M1.3")}
      />
      <div className="nb-flat c-sticky flex flex-col gap-1.5 px-4 py-3 text-sm" role="status">
        <p className="font-bold">
          {left > 0 ? `${left}줄 남았어요` : `처리 ${formatHours(t.p_hours)}시간 · 판단 ${formatHours(t.t_hours)}시간`}
        </p>
        {finished ? (
          <p className="c-okline">{`가르기를 저장했어요.${amountText(paid)}`}</p>
        ) : (
          <button
            type="button"
            className="nb-btn nb-btn-white c-btn"
            disabled={!ok || f.busy}
            onClick={() => void f.finish()}
          >
            {f.busy ? "저장하는 중…" : "저장"}
          </button>
        )}
      </div>
      <FinishLines f={f} />
    </div>
  );
}

// --- work_map_candidates --------------------------------------------------------

type Submit =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "done" }
  | { kind: "failed"; message: string; problems: string[]; blocking: boolean };

function Candidates({ i, onDone }: InteractionProps<I9>) {
  const router = useRouter();
  const { workMap } = usePlayer();
  const { draft, setDraft, saveState, saveProblem, retry: retrySave } = workMap;
  const f = useFinish(i, onDone, workMap);
  const { paid } = f;
  const [submit, setSubmit] = useState<Submit>({ kind: "idle" });
  const check = checkWorkMap(draft, COURSE_RULES);
  const errors = [...check.errors, ...checkExtraCategories(draft)];

  const send = async () => {
    setSubmit({ kind: "sending" });
    await workMap.settle();
    let res: Response | null = null;
    try {
      res = await fetch("/api/artifacts/work-map", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft, rules: "course" }),
      });
    } catch {
      res = null;
    }
    const result = res ? ((await res.json().catch(() => null)) as ApiResult<unknown> | null) : null;
    if (res?.ok && result?.ok) {
      setSubmit({ kind: "done" });
      void f.finish();
      return;
    }
    // The step is verified against this submission, so without it the
    // mission cannot end: every failure keeps the button (review P0-1).
    setSubmit({
      kind: "failed",
      blocking: true,
      message:
        res?.status === 401
          ? "로그인이 풀렸어요. 다른 탭에서 다시 로그인한 뒤 제출해 주세요. 적은 내용은 그대로 있어요."
          : res?.status === 422
            ? "아래 항목을 고친 뒤 다시 제출해 주세요."
            : "지금은 제출하지 못했어요. 워크맵은 저장돼 있어요. 잠시 뒤 다시 제출해 주세요.",
      problems: result && !result.ok ? (result.problems ?? []) : [],
    });
  };

  return (
    <div className="c-embed">
      <ReplayNote what="제출한 워크맵" />
      <div className="flex justify-end">
        <SaveStatus state={saveState} problem={saveProblem} onRetry={retrySave} />
      </div>
      <StepCandidates
        draft={draft}
        setDraft={setDraft}
        onGoClassify={() => router.push("/app/course/m/M1.4")}
        firstNote="후보 1번은 자주 하는 업무가 좋아요. 매주 하는 업무가 가장 좋고, 2주나 한 달에 한 번 하는 업무도 돼요."
      />
      <section className="nb-card flex flex-col gap-3 px-4 py-4">
        {submit.kind === "done" ? (
          <>
            <p className="nb-flat bg-[var(--nb-lime)] px-3 py-2.5 text-[15px] font-extrabold" role="status">
              워크맵을 제출했어요.{amountText(paid)}
            </p>
            {!f.finished && !f.busy && (
              <button type="button" className="nb-btn nb-btn-white c-btn" onClick={() => void f.finish()}>
                기록 다시 보내기
              </button>
            )}
          </>
        ) : (
          <>
            <button
              type="button"
              className="nb-btn nb-btn-primary c-btn"
              disabled={errors.length > 0 || submit.kind === "sending"}
              onClick={() => void send()}
            >
              {submit.kind === "sending" ? "제출하는 중…" : submit.kind === "failed" ? "다시 제출하기" : "워크맵 제출하기"}
            </button>
            {submit.kind === "failed" && (
              <div role="alert" className="text-sm text-red-700">
                <p className="font-bold">{submit.message}</p>
                {submit.problems.length > 0 && (
                  <ul className="mt-1 flex list-disc flex-col gap-1 pl-5">
                    {submit.problems.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            <ProblemList errors={errors} warnings={check.warnings} />
            <p className="c-small">제출한 워크맵은 본인과 이노랩스 강사진만 볼 수 있어요.</p>
          </>
        )}
      </section>
      <FinishLines f={f} />
    </div>
  );
}

// --- drill_invention / drill_left_for_human --------------------------------------
//
// Both write one field of the drill sheet (the B1 comparison chips wrote its
// differences). Whichever is saved last submits the sheet to
// /api/artifacts/drill and then records both steps (the step route pays a
// drill step only after drill_completed). The field saved first lives in the
// drill draft on the server, so a reload in between loses nothing (review
// P1-8). Any failure to submit keeps the button: without the sheet the
// steps cannot be recorded (review P0-1).

const PACK_TASK = "연습용 자료 묶음";
/** The sheet run on candidate #2 is tagged (L1.md B1 S1). */
const CANDIDATE2_TAG = "후보 2번";
const HINT_AFTER_MS = 30000;
const MIN_LEFT = 6;

type DrillField = "invention" | "leftForHuman";

/** The drill steps of the mission by field (B1: s5.invention and s5.left). */
function drillSteps(mission: { screens: { blocks: unknown[] }[] }): { field: DrillField; id: string; part: string }[] {
  const out: { field: DrillField; id: string; part: string }[] = [];
  const walk = (blocks: unknown[]) => {
    for (const b of blocks as { t: string; i?: I9 | { type: string }; blocks?: unknown[] }[]) {
      if (b.t === "fallback" && b.blocks) walk(b.blocks);
      const it = b.t === "i" ? (b.i as I9) : null;
      if (it?.type === "I9" && (it.target === "drill_invention" || it.target === "drill_left_for_human")) {
        out.push({ field: it.target === "drill_invention" ? "invention" : "leftForHuman", id: it.id, part: it.xp.part });
      }
    }
  };
  for (const s of mission.screens) walk(s.blocks);
  return out;
}

function useDrillSheet(i: I9, onDone: () => void, field: DrillField) {
  const { drill, drillTask, drillTask2, local, mission } = usePlayer();
  const award = useAward();
  const [submit, setSubmit] = useState<Submit>({ kind: "idle" });
  const [paid, setPaid] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);

  const choice = materialChoice(local);
  const withTask = (d: DrillDraft): DrillDraft => ({
    ...d,
    // The boss runs on candidate #1, candidate #2 when the learner switched
    // (tagged), or the pack; an older lab draft's task gives way.
    task:
      choice === "pack"
        ? PACK_TASK
        : choice === "candidate2" && drillTask2
          ? `${CANDIDATE2_TAG} · ${drillTask2}`.slice(0, DRILL_LIMITS.task)
          : drillTask || d.task.trim() || PACK_TASK,
  });
  const other: DrillField = field === "invention" ? "leftForHuman" : "invention";
  const diffsMissing = writtenDifferences(drill.draft).length < DRILL_LIMITS.minDifferences;

  const save = async (value: string) => {
    const next = withTask({ ...drill.draft, [field]: value.trim() });
    drill.setDraft(next);
    if (!next[other].trim()) {
      // The other field is still to come; this one is in the drill draft.
      setFinished(true);
      onDone();
      return;
    }
    setSubmit({ kind: "sending" });
    await drill.settle();
    let res: Response | null = null;
    try {
      res = await fetch("/api/artifacts/drill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft: next }),
      });
    } catch {
      res = null;
    }
    const result = res ? ((await res.json().catch(() => null)) as ApiResult<unknown> | null) : null;
    if (res?.ok && result?.ok) {
      setSubmit({ kind: "done" });
      // This step, then the other drill step whose field is in the sheet.
      const r = await award.stepResult(i.id, i.xp.part);
      if (r.ok) setPaid(r.data.amount);
      for (const d of drillSteps(mission)) {
        if (d.id !== i.id && next[d.field].trim()) await award.stepResult(d.id, d.part);
      }
      if (r.ok || retryable(r.error)) {
        setFinished(true);
        onDone();
      }
      return;
    }
    setSubmit({
      kind: "failed",
      blocking: true,
      message:
        res?.status === 401
          ? "로그인이 풀렸어요. 다른 탭에서 다시 로그인한 뒤 저장해 주세요. 적은 내용은 그대로 있어요."
          : res?.status === 422
            ? "아래 항목을 고친 뒤 다시 눌러 주세요."
            : "지금은 비교표를 보내지 못했어요. 적은 내용은 저장돼 있어요. 잠시 뒤 다시 눌러 주세요.",
      problems: result && !result.ok ? (result.problems ?? []) : [],
    });
  };

  return { save, submit, paid, finished, diffsMissing, error: award.error, retry: award.retry };
}

/** Difference lines, shown only when the sheet still lacks four (the chips screen was skipped or lost). */
function DiffFallback() {
  const { drill } = usePlayer();
  const diffs = drill.draft.differences.slice();
  while (diffs.length < DRILL_LIMITS.minDifferences) diffs.push("");
  const setDiff = (k: number, v: string) =>
    drill.setDraft((d: DrillDraft) => {
      const differences = d.differences.slice();
      while (differences.length < DRILL_LIMITS.minDifferences) differences.push("");
      differences[k] = v;
      return { ...d, differences };
    });
  return (
    <div className="flex flex-col gap-2">
      <p className="c-small">
        비교표에 1라운드와 2라운드의 다른 점이 4개 있어야 보낼 수 있어요. 여기서 채워 주세요.
      </p>
      {diffs.map((d, k) => (
        <input
          key={k}
          type="text"
          className="c-input"
          maxLength={DRILL_LIMITS.difference}
          value={d}
          aria-label={`다른 점 ${k + 1}`}
          placeholder="예: 구조 - 2라운드만 지난주와 같은 제목"
          onChange={(e) => setDiff(k, e.target.value)}
        />
      ))}
    </div>
  );
}

function SheetStatus({ sheet }: { sheet: ReturnType<typeof useDrillSheet> }) {
  const { submit } = sheet;
  return (
    <>
      {submit.kind === "failed" && (
        <div role="alert" className="text-sm text-red-700">
          <p className="font-bold">{submit.message}</p>
          {submit.problems.length > 0 && (
            <ul className="mt-1 flex list-disc flex-col gap-1 pl-5">
              {submit.problems.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      {submit.kind === "done" && <p className="c-okline">비교표를 저장했어요.</p>}
      <NetLine error={sheet.error} onRetry={() => void sheet.retry()} />
    </>
  );
}

function Invention({ i, onDone }: InteractionProps<I9>) {
  const { local, drill } = usePlayer();
  const [value, setValue] = useState(drill.draft.invention);
  const [chosen, setChosen] = useState<number | null>(null);
  const [hint, setHint] = useState(false);
  const sheet = useDrillSheet(i, onDone, "invention");
  const round2 = local.rounds[2];
  const locked = sheet.finished || sheet.submit.kind === "sending";
  // The sheet goes in from here when the line for a person is already saved.
  const blockedByDiffs = !!drill.draft.leftForHuman.trim() && sheet.diffsMissing;

  useEffect(() => {
    const t = setTimeout(() => setHint(true), HINT_AFTER_MS);
    return () => clearTimeout(t);
  }, []);

  const tap = (seg: Segment) => {
    if (locked) return;
    setChosen(seg.index);
    setValue(seg.text.trim().slice(0, DRILL_LIMITS.invention));
  };

  return (
    <div className="flex flex-col gap-3">
      {round2 ? (
        <SpanDoc
          text={round2}
          label="2라운드 결과. 문장을 누르면 아래 칸에 들어가요"
          onTap={tap}
          classOf={(seg) => (seg.index === chosen ? "is-chosen" : "")}
        />
      ) : (
        <p className="c-small">
          2라운드 결과가 이 화면에 없어요. 어시스턴트 대화를 보면서 아래에 적어 주세요.
        </p>
      )}
      <input
        type="text"
        className="c-input"
        maxLength={DRILL_LIMITS.invention}
        value={value}
        disabled={locked}
        aria-label="지어낸 부분"
        placeholder={round2 ? "문장을 누르면 여기에 들어와요" : (i.placeholders?.[0] ?? "재료에 없는 숫자, 날짜, 계획")}
        onChange={(e) => setValue(e.target.value)}
      />
      {hint && !locked && !value.trim() && (
        <p className="c-small" role="status">
          숫자부터 보세요. 재료에 그 숫자가 있나요? 없으면 지어낸 거예요.
        </p>
      )}
      {blockedByDiffs && !locked && <DiffFallback />}
      {sheet.finished ? (
        <p className="c-okline" role="status">{`✓ 표시했어요.${amountText(sheet.paid)}`}</p>
      ) : (
        <button
          type="button"
          className="c-sbtn is-pri self-start"
          disabled={!value.trim() || locked || blockedByDiffs}
          onClick={() => void sheet.save(value)}
        >
          지어낸 것으로 표시
        </button>
      )}
      <SheetStatus sheet={sheet} />
    </div>
  );
}

function LeftForHuman({ i, onDone }: InteractionProps<I9>) {
  const { drill } = usePlayer();
  const [value, setValue] = useState(drill.draft.leftForHuman);
  const sheet = useDrillSheet(i, onDone, "leftForHuman");
  const locked = sheet.finished || sheet.submit.kind === "sending";
  // The sheet goes in from here when the invention is already marked.
  const blockedByDiffs = !!drill.draft.invention.trim() && sheet.diffsMissing;

  return (
    <div className="flex flex-col gap-3">
      <input
        type="text"
        className="c-input"
        maxLength={60}
        value={value}
        disabled={locked}
        aria-label="사람이 아직 해야 하는 일"
        placeholder={i.placeholders?.[0] ?? "맨 위에 올릴 성과 정하기"}
        onChange={(e) => setValue(e.target.value)}
      />
      {blockedByDiffs && !locked && <DiffFallback />}
      {sheet.finished ? (
        <p className="c-okline" role="status">{`✓ 저장했어요.${amountText(sheet.paid)}`}</p>
      ) : (
        <button
          type="button"
          className="c-sbtn is-pri self-start"
          disabled={value.trim().length < MIN_LEFT || locked || blockedByDiffs}
          onClick={() => void sheet.save(value)}
        >
          {sheet.submit.kind === "sending" ? "저장하는 중…" : "저장"}
        </button>
      )}
      <SheetStatus sheet={sheet} />
    </div>
  );
}
