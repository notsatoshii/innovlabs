"use client";

// I7 선택하기. One pick (or exactly `pick` picks) locks the item. With an
// answer it is scored once; without one it is a judgment call that only
// branches (the choice is kept in the browser for later screens, e.g. B1's
// 내 재료로 / 해담리빙 재료로 / 후보 2번으로 바꾸기, and comes back after a
// reload).
//
// Options from the learner's own rows (`from`):
//   "seed_rows"      the M1.1 seed rows from the work map draft; seed row k
//                    answers as the content's option k (M1.1 확인, review P2-5)
//   "work_map_rows"  every row of the work map, nothing posted; after the pick
//                    `fromLine` asks whether the row's 처리/판단 is right, with
//                    맞아요 / 바꾸기 (바꾸기 flips that row; M1.4 확인, audience
//                    review #17). With xp, the 확인 pays on that 맞아요 /
//                    바꾸기 tap, once the mark is saved, never on the pick
//                    (L1 review 2026-10-21: XP on evidence).
//
// An option with `hold` (B1 아직 없어요) shows its feedback and leaves the
// item open, so the learner can come back and pick again. Options with `if`
// show only after the named choice (B1: 내 재료로 on a company assistant,
// 내 메모로 on a personal account).

import { useEffect, useState } from "react";
import type { I7Choose as I7 } from "@/lib/course/types";
import { choiceHolds } from "@/lib/course/fill";
import { Rich } from "./Blocks";
import { NetLine, amountText, useAward, usePlayer, type InteractionProps } from "./context";

const KIND_LABEL: Record<string, string> = { P: "처리", T: "판단", M: "섞임" };
const KIND_TO: Record<string, string> = { P: "처리로", T: "판단으로" };
const KIND_IS: Record<string, string> = { P: "처리예요", T: "판단이에요" };

export function I7Choose({ i: raw, onDone }: InteractionProps<I7>) {
  const { local, setLocal, workMap, react, drillTask2 } = usePlayer();
  const fromSeeds = raw.from === "seed_rows" || (!raw.from && raw.options.length === 0);
  const fromRows = raw.from === "work_map_rows";
  const rows = workMap.draft.rows.filter((r) => r.task.trim());
  const i: I7 = fromSeeds
    ? {
        ...raw,
        answer: undefined,
        layout: "list",
        options: rows
          .filter((r) => r.id.startsWith("seed-"))
          .slice(0, 3)
          .map((r, k) => ({
            v: raw.options[k]?.v ?? String(k + 1),
            label: `${r.task}${r.kind ? ` · ${KIND_LABEL[r.kind]}` : ""}`,
            feedback: raw.options[k]?.feedback,
          })),
      }
    : fromRows
      ? {
          ...raw,
          answer: undefined,
          layout: "list",
          options: rows.map((r) => ({ v: r.id, label: `${r.task}${r.kind ? ` · ${KIND_LABEL[r.kind]}` : ""}` })),
        }
      : { ...raw, options: raw.options.filter((o) => choiceHolds(o.if, local.choices)) };
  // Seed rows post the content's option value; work map rows post only the
  // 맞아요 / 바꾸기 check, and only when it pays.
  const canPost = !fromRows && (!fromSeeds || raw.options.length > 0);
  const rowPaid = fromRows && !!raw.xp;
  const empty = i.options.length === 0;
  useEffect(() => {
    if (empty) onDone();
  }, [empty, onDone]);
  const { answer, error, retry } = useAward();
  const answers = i.answer === undefined ? null : Array.isArray(i.answer) ? i.answer : [i.answer];
  const need = answers && answers.length > 1 ? answers.length : (i.pick ?? 1);
  // A branch choice made before a reload comes back from the browser. Only
  // for a choice that posts nothing: one that pays must be sent again.
  const keptChoice = !answers && !(canPost && i.xp) && !rowPaid ? local.choices[i.id] : undefined;
  const [sel, setSel] = useState<string[]>(() => (keptChoice ? [keptChoice] : []));
  const [locked, setLocked] = useState(() => !!keptChoice);
  const [paid, setPaid] = useState<number | null>(null);
  const [checked, setChecked] = useState<"ok" | "flipped" | null>(null);
  const [held, setHeld] = useState<string | null>(null);

  useEffect(() => {
    if (keptChoice) onDone();
    // Only for a choice restored on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const layout =
    i.layout ?? (i.options.length <= 4 && i.options.every((o) => o.label.length <= 8) ? "grid" : "list");

  const finish = async (chosen: string[]) => {
    setLocked(true);
    setHeld(null);
    if (answers) react(chosen.length === answers.length && chosen.every((v) => answers.includes(v)));
    // A paying row check waits for its 맞아요 / 바꾸기 (a row that is neither
    // 처리 nor 판단 has nothing to check).
    const row = rowPaid ? workMap.draft.rows.find((r) => r.id === chosen[0]) : undefined;
    if (!rowPaid || !(row?.kind === "P" || row?.kind === "T")) onDone();
    if (!answers) setLocal((l) => ({ ...l, choices: { ...l.choices, [i.id]: chosen[0] } }));
    if (canPost && (answers || i.xp)) {
      const res = await answer(i.id, need > 1 ? chosen : chosen[0], i.xp?.part);
      if (res) setPaid(res.amount);
    }
  };

  const tap = (v: string) => {
    if (locked) return;
    if (i.options.find((o) => o.v === v)?.hold) {
      setHeld(v);
      return;
    }
    if (need === 1) {
      setSel([v]);
      void finish([v]);
      return;
    }
    const next = sel.includes(v) ? sel.filter((x) => x !== v) : [...sel, v];
    setSel(next);
    if (next.length === need) void finish(next);
  };

  /** The paying row check: the mark is saved first, then the 확인 is posted. */
  const confirmRow = async (value: "ok" | "flip") => {
    if (!rowPaid) return;
    onDone();
    await workMap.settle();
    const res = await answer(i.id, value, raw.xp?.part);
    if (res) setPaid(res.amount);
  };

  /** 바꾸기: the picked row goes from 처리 to 판단 or back (the classify step stays valid). */
  const flip = () => {
    const id = sel[0];
    workMap.setDraft((d) => ({
      ...d,
      rows: d.rows.map((r) => (r.id === id ? { ...r, kind: r.kind === "P" ? "T" : r.kind === "T" ? "P" : r.kind } : r)),
    }));
    setChecked("flipped");
    void confirmRow("flip");
  };

  const keep = () => {
    setChecked("ok");
    void confirmRow("ok");
  };

  const right = answers ? sel.length === answers.length && sel.every((v) => answers.includes(v)) : null;
  const optionFeedback = need === 1 ? i.options.find((o) => o.v === sel[0])?.feedback : undefined;
  const line = !locked
    ? null
    : (optionFeedback ?? (right === true ? i.feedbackRight : right === false ? i.feedbackWrong : undefined));
  const pickedRow = fromRows && locked ? workMap.draft.rows.find((r) => r.id === sel[0]) : undefined;
  const heldLine = held ? i.options.find((o) => o.v === held)?.feedback : undefined;

  if (empty) {
    return (
      <p className="c-small">
        {fromRows
          ? "고를 줄이 아직 없어요. 워크맵에 줄을 적으면 여기에 나와요."
          : "고를 조각이 아직 없어요. 앞 화면에서 조각을 저장하면 여기에 나와요."}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {need > 1 && !locked && <p className="c-small">({need}개 선택)</p>}
      <div className={`c-opts${layout === "list" ? " is-list" : ""}`} role="group">
        {i.options.map((o) => {
          let cls = sel.includes(o.v) ? " is-pick" : "";
          if (locked && answers) {
            if (answers.includes(o.v)) cls = " is-right";
            else if (sel.includes(o.v)) cls = " is-wrong";
          }
          return (
            <button
              key={o.v}
              type="button"
              className={`c-opt${cls}`}
              disabled={locked}
              aria-pressed={sel.includes(o.v) || held === o.v}
              onClick={() => tap(o.v)}
            >
              {o.label}
            </button>
          );
        })}
      </div>
      {locked && (line || right !== null) && (
        <div className={`c-fb${right === true ? " is-ok" : ""}`} role="status">
          {line ? <Rich text={line} /> : right ? "맞아요." : "초록색이 정답이에요."}
          {amountText(paid)}
        </div>
      )}
      {heldLine && (
        <div className="c-fb" role="status">
          <Rich text={heldLine} />
        </div>
      )}
      {locked && sel[0] === "candidate2" && (
        <div className="c-fb" role="status">
          {drillTask2
            ? `이번 보스전은 후보 2번으로 해요: '${drillTask2}'. 워크맵의 후보 1번은 그대로예요.`
            : "후보 2번이 아직 없어요. 이번 보스전은 후보 1번으로 해요."}
        </div>
      )}
      {pickedRow && (pickedRow.kind === "P" || pickedRow.kind === "T") && raw.fromLine && checked === "ok" && rowPaid && (
        <div className="c-fb is-ok" role="status">
          {`그대로 둘게요.${amountText(paid)}`}
        </div>
      )}
      {pickedRow && (pickedRow.kind === "P" || pickedRow.kind === "T") && raw.fromLine && checked !== "ok" && (
        <div className="c-fb" role="status">
          {checked === "flipped" ? (
            `바꿨어요. 이 줄은 이제 ${KIND_IS[pickedRow.kind]}.${amountText(paid)}`
          ) : (
            <>
              <Rich text={raw.fromLine.replace("{kind}", KIND_TO[pickedRow.kind])} />
              <div className="c-acts mt-2">
                <button type="button" className="c-sbtn is-pri" onClick={keep}>
                  맞아요
                </button>
                <button type="button" className="c-sbtn" onClick={flip}>
                  바꾸기
                </button>
              </div>
            </>
          )}
        </div>
      )}
      <NetLine error={error} onRetry={() => void retry()} />
    </div>
  );
}
