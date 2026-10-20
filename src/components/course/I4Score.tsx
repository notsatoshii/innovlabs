"use client";

// I4 점수판 연습: score practice rows on the five criteria card (the same
// card as the Work Map, SCORE_CRITERIA). Each criterion is one item: right on
// the first try pays `per` × combo, a wrong tap shows the row's line and
// leaves one more try, which pays `retry`; a second miss reveals the answer.
// Item keys are "<row key>.<criterion 1-5>", "#2" on the retry (score.ts).

import { useState } from "react";
import type { I4Score as I4 } from "@/lib/course/types";
import { SCORE_CRITERIA } from "@/lib/courses/work-map";
import { Rich } from "./Blocks";
import { NetLine, useAward, usePlayer, type InteractionProps } from "./context";

type Cell = { tries: number; wrong: number[]; done: boolean; right: boolean };

export function I4Score({ i, onDone }: InteractionProps<I4>) {
  const { caps } = usePlayer();
  const { answer, failed, retry } = useAward();
  const [cells, setCells] = useState<Record<string, Cell>>({});
  const [streak, setStreak] = useState(0);
  const [pts, setPts] = useState(0);
  const [fb, setFb] = useState<{ cls: string; text: string } | null>(null);

  const total = i.rows.length * 5;
  const resolved = Object.values(cells).filter((c) => c.done).length;
  const finished = resolved === total;

  const tap = (rowIndex: number, crit: number, v: 1 | 2 | 3) => {
    const row = i.rows[rowIndex];
    const key = `${row.key}:${crit}`;
    const cell = cells[key] ?? { tries: 0, wrong: [], done: false, right: false };
    if (cell.done || cell.wrong.includes(v)) return;
    const right = row.answers[crit] === v;
    const tries = cell.tries + 1;
    let next: Cell;
    if (right) {
      const s = streak + 1;
      const m = s >= 8 ? 3 : s >= 4 ? 2 : 1;
      const g = tries > 1 ? i.xp.retry : i.xp.per * m;
      setStreak(s);
      setPts((p) => p + g);
      setFb({ cls: "is-ok", text: `맞아요. +${g}${m > 1 && tries === 1 ? ` (콤보 x${m})` : ""}` });
      next = { tries, wrong: cell.wrong, done: true, right: true };
    } else {
      setStreak(0);
      setFb({ cls: "is-no", text: row.lines[crit] ?? "다시 보세요." });
      next = { tries, wrong: [...cell.wrong, v], done: tries >= 2, right: false };
    }
    const all = { ...cells, [key]: next };
    setCells(all);
    if (Object.values(all).filter((c) => c.done).length === total) onDone();
    void answer(i.id, v, i.xp.part, `${row.key}.${crit + 1}${tries > 1 ? "#2" : ""}`);
  };

  const combo = streak >= 4 ? `콤보 x${streak >= 8 ? 3 : 2} · ${streak}연속` : streak >= 2 ? `${streak}연속` : "";

  return (
    <div className="flex flex-col gap-3">
      <div className="c-score" aria-live="polite">
        <span>점수 {total}개</span>
        <span className="c-combo">{combo}</span>
        <span>{pts}점</span>
      </div>
      {i.rows.map((row, ri) => {
        const rowDone = [0, 1, 2, 3, 4].every((k) => cells[`${row.key}:${k}`]?.done);
        const sum = row.answers.reduce((a, b) => a + b, 0);
        return (
          <div key={row.key} className="c-sc">
            <div className="c-schead">
              <b>{row.title}</b>
              <span className="c-sum">
                {rowDone ? sum : "–"}
                <small>/15</small>
              </span>
            </div>
            <div className="c-fact">
              <Rich text={row.fact} />
            </div>
            {SCORE_CRITERIA.map((c, k) => {
              const cell = cells[`${row.key}:${k}`];
              return (
                <div key={c.key} className="c-crit">
                  <span className="c-n" id={`${i.id}-${row.key}-${k}`}>
                    {k + 1}. {c.label}
                  </span>
                  <div className="c-tri" role="group" aria-labelledby={`${i.id}-${row.key}-${k}`}>
                    {([3, 2, 1] as const).map((v) => {
                      let cls = "";
                      if (cell?.done && row.answers[k] === v) cls = "is-right";
                      else if (cell?.wrong.includes(v)) cls = "is-wrong";
                      return (
                        <button
                          key={v}
                          type="button"
                          className={cls}
                          disabled={!!cell?.done || !!cell?.wrong.includes(v)}
                          onClick={() => tap(ri, k, v)}
                        >
                          <b>{v}</b>
                          {c.options[v - 1]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {rowDone && (
              <div className="c-okline">{sum >= 13 ? "강한 후보" : sum < 10 ? "아직 아니에요" : "후보가 될 수 있어요"}</div>
            )}
          </div>
        );
      })}
      {fb && !finished && (
        <div className={`c-fb c-sticky ${fb.cls}`} role="status">
          {fb.text}
        </div>
      )}
      {finished && (
        <>
          <div className="c-reveal" role="status">
            <Rich text={i.end} />
          </div>
          {caps[i.xp.part] !== undefined && (
            <p className="c-small">
              해보기 점수 {pts}점 → XP는 최대 {caps[i.xp.part]}까지 쌓여요.
            </p>
          )}
        </>
      )}
      <NetLine failed={failed} onRetry={retry} />
    </div>
  );
}
