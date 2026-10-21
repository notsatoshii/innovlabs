"use client";

// I10 체크리스트. Each item ticks on tap; `ordered` refuses a tick that skips
// ahead and shows `orderLine` (the slip is remembered for B1's feedback).
// An item with a packId gets a 복사 button for that pack document, or, when
// the learner chose their own material (an earlier I7 picked "own"), a
// "내 것 붙여 넣었어요" button that ticks it, with the line to type under it.
//
// `shuffle` (B1 2라운드, R29): the items show in a fixed shuffled order and
// without numbers, so the order is recalled, not read; a ticked item shows
// its place. `firstAsk` sits above the items until the first tick, and a
// wrong first tick shows `firstLine` ("예시부터요."). The order is fixed (a
// rotation, not random), so the server render and the browser agree.

import { useState } from "react";
import type { I10Checklist as I10 } from "@/lib/course/types";
import { Rich } from "./Blocks";
import { NetLine, amountText, ownMaterial, useAward, usePlayer, type InteractionProps } from "./context";
import { CopyButton } from "./CopyButton";

/** Display order: content order, or a rotation by half that never starts with the first item. */
function displayOrder(n: number, shuffle: boolean): number[] {
  const order = Array.from({ length: n }, (_, k) => k);
  if (!shuffle || n < 2) return order;
  const by = Math.ceil(n / 2);
  return order.map((k) => (k + by) % n);
}

export function I10Checklist({ i, onDone }: InteractionProps<I10>) {
  const { packs, local, setLocal } = usePlayer();
  const { step, error, retry } = useAward();
  const [ticked, setTicked] = useState<ReadonlySet<string>>(() => new Set());
  const [slip, setSlip] = useState<"first" | "order" | null>(null);
  const [paid, setPaid] = useState<number | null>(null);
  const ownMode = ownMaterial(local);
  const shuffle = i.ordered === true && i.shuffle === true;

  const tick = async (k: number) => {
    const key = i.items[k].key;
    if (ticked.has(key)) return;
    if (i.ordered && i.items.slice(0, k).some((it) => !ticked.has(it.key))) {
      setSlip(ticked.size === 0 && i.firstLine ? "first" : "order");
      setLocal((l) => ({ ...l, slip: true }));
      return;
    }
    setSlip(null);
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

  const slipLine = slip === "first" ? i.firstLine : slip === "order" ? (i.orderLine ?? "1번부터 차례로 넣어요.") : null;

  return (
    <div className="flex flex-col gap-3">
      {i.firstAsk && ticked.size === 0 && (
        <p className="c-p">
          <b>
            <Rich text={i.firstAsk} />
          </b>
        </p>
      )}
      <div className="c-ticks">
        {displayOrder(i.items.length, shuffle).map((k) => {
          const it = i.items[k];
          const on = ticked.has(it.key);
          const pack = it.packId ? packs[it.packId] : undefined;
          const own = ownMode && !!it.packId;
          // Numbers say the order: shown from the start in content order, only once ticked when shuffled.
          const num = i.items.length > 1 && (!shuffle || on) ? `${k + 1}. ` : "";
          return (
            <div key={it.key} className="flex flex-col gap-1.5">
              <div className={`c-tick${on ? " is-on" : ""}`}>
                <button type="button" className="c-tb" aria-pressed={on} onClick={() => void tick(k)}>
                  <span className="c-box" aria-hidden>
                    {on ? "✓" : ""}
                  </span>
                  <span>
                    {num}
                    {it.label}
                    {it.say && !own ? ` — ${it.say}` : ""}
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
              {own && it.say && <p className="c-small">붙여 넣고 이렇게 쓰세요: &quot;{it.say}&quot;</p>}
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
      {slipLine && (
        <div className="c-fb is-no" role="status">
          <Rich text={slipLine} />
        </div>
      )}
      {paid ? <p className="c-okline">{`다 넣었어요.${amountText(paid)}`}</p> : null}
      <NetLine error={error} onRetry={() => void retry()} />
    </div>
  );
}
