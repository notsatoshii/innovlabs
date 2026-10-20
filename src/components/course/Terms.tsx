"use client";

// Tap-to-reveal term cards (M1.1 알기). Done once every card was opened.

import { useState } from "react";
import type { ITerms } from "@/lib/course/types";
import { Rich } from "./Blocks";
import { NetLine, amountText, useAward, type InteractionProps } from "./context";

export function Terms({ i, onDone }: InteractionProps<ITerms>) {
  const { step, failed, retry } = useAward();
  const [open, setOpen] = useState<ReadonlySet<number>>(() => new Set());
  const [seen, setSeen] = useState<ReadonlySet<number>>(() => new Set());
  const [paid, setPaid] = useState<number | null>(null);

  const toggle = async (k: number) => {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
    if (seen.has(k)) return;
    const all = new Set(seen).add(k);
    setSeen(all);
    if (all.size === i.cards.length) {
      onDone();
      if (i.xp) {
        const res = await step(i.id, i.xp.part);
        if (res) setPaid(res.amount);
      }
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="c-small">{i.cards.length === 2 ? "두 단어를" : "단어를"} 눌러서 예시를 보세요.</p>
      <div className="c-terms">
        {i.cards.map((c, k) => (
          <button
            key={c.word}
            type="button"
            className={`c-term is-${c.kind}${open.has(k) ? " is-open" : ""}`}
            aria-expanded={open.has(k)}
            onClick={() => void toggle(k)}
          >
            <b>{c.word}</b>
            <br />
            <Rich text={c.def} />
            {open.has(k) && (
              <span className="c-ex">
                예: <Rich text={c.example} />
              </span>
            )}
          </button>
        ))}
      </div>
      {paid ? <p className="c-okline">{`다 봤어요.${amountText(paid)}`}</p> : null}
      <NetLine failed={failed} onRetry={retry} />
    </div>
  );
}
