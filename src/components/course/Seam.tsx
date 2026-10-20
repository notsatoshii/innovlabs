"use client";

// Drag the seam (M1.4 알기): a bar sits in one of the gaps between chunks;
// drag it (or tap a gap) to where 처리 turns into 판단. Gap k sits before
// chunk k, so gap 0 is the start. A wrong gap shows its line and the learner
// tries again; the right gap colours the chunks and is sent once.

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { ISeam } from "@/lib/course/types";
import { NetLine, amountText, useAward, type InteractionProps } from "./context";

export function Seam({ i, onDone }: InteractionProps<ISeam>) {
  const { answer, error, retry } = useAward();
  const [pos, setPos] = useState(0);
  const [hover, setHover] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const [line, setLine] = useState<{ ok: boolean; text: string } | null>(null);
  const [paid, setPaid] = useState<number | null>(null);
  const gaps = useRef<(HTMLButtonElement | null)[]>([]);
  const dragging = useRef(false);

  const place = async (g: number) => {
    if (done) return;
    setPos(g);
    if (g === 0) return;
    if (g === i.answer) {
      setDone(true);
      setLine({ ok: true, text: i.lines[String(g)] ?? "맞아요." });
      onDone();
      const res = await answer(i.id, g, i.xp.part);
      if (res) setPaid(res.amount);
    } else {
      setLine({ ok: false, text: i.lines[String(g)] ?? (g < i.answer ? "한 칸 더 오른쪽이에요." : "한 칸 더 왼쪽이에요.") });
    }
  };

  const nearest = (x: number, y: number) => {
    let best = 0;
    let bd = Infinity;
    gaps.current.forEach((el, k) => {
      if (!el) return;
      const r = el.getBoundingClientRect();
      const d = Math.hypot(r.left + r.width / 2 - x, (r.top + r.height / 2 - y) * 1.5);
      if (d < bd) {
        bd = d;
        best = k;
      }
    });
    return best;
  };

  const onDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (done) return;
    const g = (e.target as HTMLElement).closest(".c-gap");
    if (!g || !g.classList.contains("is-cur")) return;
    dragging.current = true;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // The tap path still works.
    }
    e.preventDefault();
  };
  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    const k = nearest(e.clientX, e.clientY);
    setHover(k !== pos ? k : null);
  };
  const onUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    dragging.current = false;
    setHover(null);
    void place(nearest(e.clientX, e.clientY));
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="c-small">막대를 끌어서, 처리가 판단으로 바뀌는 곳에 놓으세요. 틈을 눌러도 돼요.</p>
      <div
        className="c-seam"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={() => {
          dragging.current = false;
          setHover(null);
        }}
      >
        {i.chunks.map((chunk, k) => (
          <span key={k} className="contents">
            <button
              ref={(el) => {
                gaps.current[k] = el;
              }}
              type="button"
              className={`c-gap${pos === k ? " is-cur" : ""}${hover === k ? " is-hover" : ""}`}
              aria-label={k === 0 ? "막대 (맨 앞)" : `${i.chunks[k - 1]} 뒤에서 나누기`}
              aria-pressed={pos === k}
              disabled={done}
              onClick={() => void place(k)}
            />
            <span className={`c-ck${done ? (k < i.answer ? " is-p" : " is-j") : ""}`}>{chunk}</span>
          </span>
        ))}
      </div>
      {line && (
        <div className={`c-fb ${line.ok ? "is-ok" : "is-no"}`} role="status">
          {line.text}
          {line.ok ? amountText(paid) : ""}
        </div>
      )}
      <NetLine error={error} onRetry={() => void retry()} />
    </div>
  );
}
