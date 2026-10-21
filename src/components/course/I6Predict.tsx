"use client";

// I6 예측하기: guess, then reveal. Any answer reveals; the right one pays
// (and a wrong one pays xp.wrong when the content gives it: L1 pays any guess).
// With `keep`, the picked value stays in this browser for a later bar marker
// (M1.4 합계 shows the M1.1 guess). A reveal line that already names the XP
// ("+10이에요") does not get the amount appended again.

import { useState } from "react";
import type { I6Predict as I6 } from "@/lib/course/types";
import { Rich } from "./Blocks";
import { NetLine, amountText, useAward, usePlayer, writeKept, type InteractionProps } from "./context";

/** The amount after a reveal line, unless the line already says "+n". */
function after(line: string | undefined, paid: number | null): string {
  return line && /\+\d/.test(line) ? "" : amountText(paid);
}

export function I6Predict({ i, onDone }: InteractionProps<I6>) {
  const { answer, error, retry } = useAward();
  const { react } = usePlayer();
  const [picked, setPicked] = useState<string | null>(null);
  const [paid, setPaid] = useState<number | null>(null);
  const [showSource, setShowSource] = useState(false);

  const pick = async (v: string) => {
    if (picked) return;
    setPicked(v);
    if (i.keep) writeKept(i.keep, v);
    react(v === i.answer);
    onDone();
    const res = await answer(i.id, v, i.xp.part);
    if (res) setPaid(res.amount);
  };

  const right = picked === i.answer;
  return (
    <div className="flex flex-col gap-3">
      <div className="c-opts" role="group">
        {i.options.map((o) => {
          const cls = !picked
            ? ""
            : o.v === i.answer
              ? " is-right"
              : o.v === picked
                ? " is-wrong"
                : "";
          return (
            <button
              key={o.v}
              type="button"
              className={`c-opt${cls}`}
              disabled={picked !== null}
              aria-pressed={picked === o.v}
              onClick={() => void pick(o.v)}
            >
              {o.label}
            </button>
          );
        })}
      </div>
      {picked && (
        <div className="c-reveal" role="status">
          <Rich text={i.reveal} />
          {right ? (
            <div className="mt-1 font-bold text-[var(--course-good)]">
              {i.revealRight ? <Rich text={i.revealRight} /> : "맞혔어요."}
              {after(i.revealRight, paid)}
            </div>
          ) : (
            <div className="mt-1 text-[var(--course-muted)]">
              <Rich text={i.revealWrong ?? "아니어도 괜찮아요. 오늘 배울 내용이 바로 이거예요."} />
              {after(i.revealWrong, paid)}
            </div>
          )}
          {i.source && (
            <div className="mt-2">
              <button
                type="button"
                className="c-sbtn"
                aria-expanded={showSource}
                onClick={() => setShowSource((s) => !s)}
              >
                출처 보기
              </button>
              {showSource && <p className="c-small mt-2">출처: {i.source}</p>}
            </div>
          )}
        </div>
      )}
      <NetLine error={error} onRetry={() => void retry()} />
    </div>
  );
}
