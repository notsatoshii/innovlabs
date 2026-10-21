"use client";

// The learner's 처리 / 판단 hours as one bar (M1.4 합계, NC-19). Hours come
// from the live Work Map slots, so the bar follows the classify step. With
// `guess`, a marker shows where an earlier I6 guess (kept in this browser by
// I6 `keep`) put the line between 처리 and 판단; without a kept guess there is
// no marker. Both parts carry their words and hours (never colour alone).

import { useEffect, useState } from "react";
import type { BarGuess } from "@/lib/course/types";
import { readKept, usePlayer } from "./context";

export function PJBar({ guess }: { guess?: BarGuess }) {
  const { live } = usePlayer();
  const p = Number(live.p_hours) || 0;
  const j = Number(live.j_hours) || 0;
  const [kept, setKept] = useState<string | null>(null);

  // After hydration: the server render cannot see localStorage.
  useEffect(() => {
    if (!guess) return;
    const v = readKept(guess.key);
    queueMicrotask(() => setKept(v));
  }, [guess]);

  const total = p + j;
  if (total <= 0) return null;
  const pPct = Math.round((p / total) * 1000) / 10;
  const share = guess && kept !== null ? guess.share[kept] : undefined;
  // The marker sits where 판단 would start if the guess held: 1 - the guessed 판단 share.
  const markAt = share === undefined ? null : Math.min(100, Math.max(0, Math.round((1 - share) * 1000) / 10));

  return (
    <div className="c-pjbar">
      <div
        className="c-pjbar-track"
        role="img"
        aria-label={`처리 ${live.p_hours}시간, 판단 ${live.j_hours}시간${markAt !== null && guess ? `. ${guess.label} 표시가 있어요` : ""}`}
      >
        <i className="is-p" style={{ width: `${pPct}%` }} />
        <i className="is-j" style={{ width: `${100 - pPct}%` }} />
        {markAt !== null && <span className="c-pjbar-mark" style={{ left: `${markAt}%` }} aria-hidden />}
      </div>
      <div className="c-pjbar-legend" aria-hidden>
        <span className="is-p">처리 {live.p_hours}시간</span>
        <span className="is-j">판단 {live.j_hours}시간</span>
      </div>
      {markAt !== null && guess && (
        <p className="c-small" aria-hidden>
          ▏ {guess.label}
        </p>
      )}
    </div>
  );
}
