"use client";

// The level bar of the 도구 view (docs/app/phases/ui-tools-redesign.md §5.4).
// One joined bar, always exactly one level selected. A radio group: the
// selected cell is the only tab stop and the arrow keys move the selection.
// The learner's own level carries a "내 레벨" sticker that never moves.

import { useRef } from "react";
import { DIFFICULTY_LABEL, type Difficulty } from "@/lib/resources/types";
import { LEVELS, levelName, levelShort } from "@/lib/resources/picks";
import { DIFFICULTY_FILL } from "./ToolCard";

export function LevelSwitch({
  value,
  myLevel,
  onChange,
}: {
  value: Difficulty;
  /** null when the survey recorded no depth flag: no sticker is shown. */
  myLevel: Difficulty | null;
  onChange: (level: Difficulty) => void;
}) {
  const cells = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(e: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = -1;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (index + 1) % LEVELS.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp")
      next = (index + LEVELS.length - 1) % LEVELS.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = LEVELS.length - 1;
    if (next === -1) return;
    e.preventDefault();
    onChange(LEVELS[next]);
    cells.current[next]?.focus();
  }

  return (
    <div className="relative">
      <div role="radiogroup" aria-label="레벨 고르기" className="nb-flat grid grid-cols-4">
        {LEVELS.map((level, index) => {
          const selected = level === value;
          return (
            <button
              key={level}
              ref={(el) => {
                cells.current[index] = el;
              }}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={`${DIFFICULTY_LABEL[level].badge}${level === myLevel ? ", 내 레벨" : ""}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(level)}
              onKeyDown={(e) => onKeyDown(e, index)}
              className={[
                "relative flex min-h-12 flex-col items-center justify-center gap-0.5 border-l-2 border-[var(--nb-ink)] px-1 pt-1 leading-none text-[var(--nb-ink)]",
                "first:rounded-l-[10px] first:border-l-0 last:rounded-r-[10px]",
                "focus-visible:z-10 focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[color:var(--nb-ink)]",
                selected
                  ? `${DIFFICULTY_FILL[level]} shadow-[inset_0_-4px_0_0_var(--nb-ink)]`
                  : "bg-[var(--nb-paper)]",
              ].join(" ")}
            >
              <span className="text-sm font-extrabold leading-none">{levelShort(level)}</span>
              <span className="text-[11px] font-bold leading-none">{levelName(level)}</span>
            </button>
          );
        })}
      </div>
      {myLevel !== null && (
        <span
          aria-hidden
          style={{ left: `${(myLevel - 0.5) * 25}%` }}
          className="nb-sticker pointer-events-none absolute -top-3 z-20 -translate-x-1/2 whitespace-nowrap px-1.5 py-0.5 text-[10px] leading-none"
        >
          내 레벨
        </span>
      )}
    </div>
  );
}
