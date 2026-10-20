"use client";

// I3 틀린 곳 찾기: tap the planted error. A wrong tap strikes the sentence
// through; after `hintAfter` wrong taps the target's section is highlighted.
// Every tap is sent (a wrong one is logged as a tap), so the server can tell
// a find before the hint (`right`) from one after it (`afterHint`).

import { useState } from "react";
import type { I3Spot as I3 } from "@/lib/course/types";
import { Rich } from "./Blocks";
import { NetLine, amountText, useAward, type InteractionProps } from "./context";
import { SpanDoc, findSegment, segments, squash, type Segment } from "./SpanDoc";

export function I3Spot({ i, onDone }: InteractionProps<I3>) {
  const { answer, failed, retry } = useAward();
  const [misses, setMisses] = useState<ReadonlySet<number>>(() => new Set());
  const [found, setFound] = useState<number | null>(null);
  const [paid, setPaid] = useState<number | null>(null);

  const target = findSegment(segments(i.doc), i.target);
  const hinted = misses.size >= i.hintAfter;

  const tap = async (seg: Segment) => {
    if (found !== null || misses.has(seg.index)) return;
    const hit = squash(seg.text).includes(squash(i.target)) || (target && seg.index === target.index);
    if (!hit) {
      setMisses((m) => new Set(m).add(seg.index));
      void answer(i.id, seg.text.trim(), i.xp.part);
      return;
    }
    setFound(seg.index);
    onDone();
    const res = await answer(i.id, seg.text.trim(), i.xp.part);
    if (res) setPaid(res.amount);
  };

  const classOf = (seg: Segment) => {
    if (found === seg.index) return "is-hit";
    if (misses.has(seg.index)) return "is-miss";
    if (found === null && hinted && target && seg.section && seg.section === target.section) return "is-zone";
    return "";
  };

  return (
    <div className="flex flex-col gap-3">
      <SpanDoc text={i.doc} classOf={classOf} onTap={(seg) => void tap(seg)} label="문장을 눌러서 고르세요" />
      {found !== null ? (
        <div className="c-fb is-ok" role="status">
          <Rich text={i.rightLine} />
          {amountText(paid)}
        </div>
      ) : (
        misses.size > 0 && (
          <div className="c-fb is-no" role="status">
            {hinted ? "색이 칠해진 부분 안에 있어요." : "거기는 아니에요. 다시 찾아보세요."}
          </div>
        )
      )}
      <NetLine failed={failed} onRetry={retry} />
    </div>
  );
}
