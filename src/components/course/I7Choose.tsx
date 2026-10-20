"use client";

// I7 선택하기. One pick (or exactly `pick` picks) locks the item. With an
// answer it is scored once; without one it is a judgment call that only
// branches (the choice is kept in the browser for later screens, e.g. B1's
// 내 재료로 / 해담리빙 재료로).
//
// Options from the learner's own rows: `from: "seed_rows"` (or an empty
// option list) lists the M1.1 seed rows from the work map draft, for M1.1's
// 확인 ("사람이 끝까지 가져가야 하는 조각 하나").

import { useEffect, useState } from "react";
import type { I7Choose as I7 } from "@/lib/course/types";
import { Rich } from "./Blocks";
import { NetLine, amountText, useAward, usePlayer, type InteractionProps } from "./context";

type I7From = I7 & { from?: "seed_rows" };
const KIND_LABEL: Record<string, string> = { P: "처리", T: "판단", M: "섞임" };

export function I7Choose({ i: raw, onDone }: InteractionProps<I7From>) {
  const { setLocal, workMap } = usePlayer();
  const fromSeeds = raw.from === "seed_rows" || raw.options.length === 0;
  // Seed row k answers as the content's option k (its value is what the
  // server knows), or as "1", "2", "3" when the content lists none.
  const i: I7 = fromSeeds
    ? {
        ...raw,
        answer: undefined,
        layout: "list",
        options: workMap.draft.rows
          .filter((r) => r.id.startsWith("seed-"))
          .slice(0, 3)
          .map((r, k) => ({
            v: raw.options[k]?.v ?? String(k + 1),
            label: `${r.task}${r.kind ? ` · ${KIND_LABEL[r.kind]}` : ""}`,
            feedback: raw.options[k]?.feedback,
          })),
      }
    : raw;
  const canPost = !fromSeeds || raw.options.length > 0;
  const empty = i.options.length === 0;
  useEffect(() => {
    if (empty) onDone();
  }, [empty, onDone]);
  const { answer, failed, retry } = useAward();
  const answers = i.answer === undefined ? null : Array.isArray(i.answer) ? i.answer : [i.answer];
  const need = answers && answers.length > 1 ? answers.length : (i.pick ?? 1);
  const [sel, setSel] = useState<string[]>([]);
  const [locked, setLocked] = useState(false);
  const [paid, setPaid] = useState<number | null>(null);

  const layout =
    i.layout ?? (i.options.length <= 4 && i.options.every((o) => o.label.length <= 8) ? "grid" : "list");

  const finish = async (chosen: string[]) => {
    setLocked(true);
    onDone();
    if (!answers) setLocal((l) => ({ ...l, choices: { ...l.choices, [i.id]: chosen[0] } }));
    if (canPost && (answers || i.xp)) {
      const res = await answer(i.id, need > 1 ? chosen : chosen[0], i.xp?.part);
      if (res) setPaid(res.amount);
    }
  };

  const tap = (v: string) => {
    if (locked) return;
    if (need === 1) {
      setSel([v]);
      void finish([v]);
      return;
    }
    const next = sel.includes(v) ? sel.filter((x) => x !== v) : [...sel, v];
    setSel(next);
    if (next.length === need) void finish(next);
  };

  const right = answers ? sel.length === answers.length && sel.every((v) => answers.includes(v)) : null;
  const optionFeedback = need === 1 ? i.options.find((o) => o.v === sel[0])?.feedback : undefined;
  const line = !locked
    ? null
    : (optionFeedback ?? (right === true ? i.feedbackRight : right === false ? i.feedbackWrong : undefined));

  if (empty) return <p className="c-small">고를 조각이 아직 없어요. 앞 화면에서 조각을 저장하면 여기에 나와요.</p>;

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
              aria-pressed={sel.includes(o.v)}
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
      <NetLine failed={failed} onRetry={retry} />
    </div>
  );
}
