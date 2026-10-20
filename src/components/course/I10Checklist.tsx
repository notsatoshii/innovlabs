"use client";

// I10 체크리스트. Each item ticks on tap; `ordered` refuses a tick that skips
// ahead and shows `orderLine` (the slip is remembered for B1's feedback).
// An item with a packId gets a 복사 button for that pack document, or, when
// the learner chose their own material (an earlier I7 picked "own"), a
// "내 것 붙여 넣었어요" button that ticks it.

import { useState } from "react";
import type { I10Checklist as I10 } from "@/lib/course/types";
import { Rich } from "./Blocks";
import { NetLine, amountText, ownMaterial, useAward, usePlayer, type InteractionProps } from "./context";
import { CopyButton } from "./CopyButton";

export function I10Checklist({ i, onDone }: InteractionProps<I10>) {
  const { packs, local, setLocal } = usePlayer();
  const { step, error, retry } = useAward();
  const [ticked, setTicked] = useState<ReadonlySet<string>>(() => new Set());
  const [slip, setSlip] = useState(false);
  const [paid, setPaid] = useState<number | null>(null);
  const ownMode = ownMaterial(local);

  const tick = async (k: number) => {
    const key = i.items[k].key;
    if (ticked.has(key)) return;
    if (i.ordered && i.items.slice(0, k).some((it) => !ticked.has(it.key))) {
      setSlip(true);
      setLocal((l) => ({ ...l, slip: true }));
      return;
    }
    setSlip(false);
    const all = new Set(ticked).add(key);
    setTicked(all);
    if (all.size === i.items.length) {
      onDone();
      if (i.xp) {
        const res = await step(i.id, i.xp.part);
        if (res) setPaid(res.amount);
      }
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="c-ticks">
        {i.items.map((it, k) => {
          const on = ticked.has(it.key);
          const pack = it.packId ? packs[it.packId] : undefined;
          const own = ownMode && !!it.packId;
          return (
            <div key={it.key} className="flex flex-col gap-1.5">
              <div className={`c-tick${on ? " is-on" : ""}`}>
                <button type="button" className="c-tb" aria-pressed={on} onClick={() => void tick(k)}>
                  <span className="c-box" aria-hidden>
                    {on ? "✓" : ""}
                  </span>
                  <span>
                    {i.items.length > 1 ? `${k + 1}. ` : ""}
                    {it.label}
                    {it.say ? ` — ${it.say}` : ""}
                  </span>
                </button>
                {own ? (
                  <button
                    type="button"
                    className={`c-sbtn${on ? " is-ticked" : ""}`}
                    onClick={() => void tick(k)}
                  >
                    {on ? "✓ 내 것 붙여 넣었어요" : "내 것 붙여 넣었어요"}
                  </button>
                ) : (
                  pack && <CopyButton text={pack} label="복사" />
                )}
              </div>
              {!own && pack && it.packId && (
                <details className="c-details">
                  <summary>재료 보기</summary>
                  <pre className="c-doc">{pack}</pre>
                </details>
              )}
            </div>
          );
        })}
      </div>
      {slip && (
        <div className="c-fb is-no" role="status">
          <Rich text={i.orderLine ?? "1번부터 차례로 넣어요."} />
        </div>
      )}
      {paid ? <p className="c-okline">{`다 넣었어요.${amountText(paid)}`}</p> : null}
      <NetLine error={error} onRetry={() => void retry()} />
    </div>
  );
}
