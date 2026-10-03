"use client";

// Input widgets shared by the Week 1 labs. Sized for thumbs (44px targets)
// and built on native controls so the keyboard works without extra wiring:
// ChoiceGroup is a real radio group (arrow keys move, space selects).

import { useState } from "react";
import { WORK_MAP_LIMITS, formatHours, snapHours } from "./rules";
import type { SaveProblem, SaveState } from "./useDraft";

const STEP_BUTTON =
  "grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-[var(--nb-line)] bg-[var(--nb-paper)] text-lg font-bold disabled:opacity-35";

/** Weekly hours in 0.5 steps: − and + buttons around a field that also takes typing. */
export function HoursStepper({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (hours: number) => void;
  /** What the hours belong to, for screen readers. */
  label: string;
}) {
  // While the field has focus it shows what was typed ("2."), not the snapped value.
  const [typed, setTyped] = useState<string | null>(null);
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        aria-label={`${label}: 30분 줄이기`}
        disabled={value <= 0}
        onClick={() => onChange(snapHours(value - 0.5))}
        className={STEP_BUTTON}
      >
        −
      </button>
      <input
        type="text"
        inputMode="decimal"
        aria-label={`${label}: 일주일에 쓰는 시간`}
        value={typed ?? formatHours(value)}
        onFocus={(e) => e.target.select()}
        onChange={(e) => {
          const raw = e.target.value.replace(/[^0-9.]/g, "").slice(0, 4);
          setTyped(raw);
          const parsed = Number.parseFloat(raw);
          onChange(Number.isFinite(parsed) ? snapHours(parsed) : 0);
        }}
        onBlur={() => setTyped(null)}
        className="nb-input h-11 w-14 px-1 text-center text-[15px] font-bold"
      />
      <button
        type="button"
        aria-label={`${label}: 30분 늘리기`}
        disabled={value >= WORK_MAP_LIMITS.hours}
        onClick={() => onChange(snapHours(value + 0.5))}
        className={STEP_BUTTON}
      >
        +
      </button>
      <span className="text-sm text-gray-700">시간</span>
    </div>
  );
}

/** Whole-number counter (interruptions). */
export function CountStepper({
  value,
  onChange,
  max,
  label,
  unit,
}: {
  value: number;
  onChange: (count: number) => void;
  max: number;
  label: string;
  unit: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        aria-label={`${label} 하나 줄이기`}
        disabled={value <= 0}
        onClick={() => onChange(Math.max(0, value - 1))}
        className={STEP_BUTTON}
      >
        −
      </button>
      <output
        aria-label={label}
        className="nb-input grid h-11 w-14 place-items-center text-[15px] font-bold"
      >
        {value}
      </output>
      <button
        type="button"
        aria-label={`${label} 하나 늘리기`}
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        className={STEP_BUTTON}
      >
        +
      </button>
      <span className="text-sm text-gray-700">{unit}</span>
    </div>
  );
}

export interface Choice<V extends string | number> {
  value: V;
  label: string;
  /** Small leading tag, e.g. "3점" or "P". */
  tag?: string;
}

/** One-of-N as large tap targets over native radios. */
export function ChoiceGroup<V extends string | number>({
  name,
  legend,
  legendHidden,
  options,
  value,
  onChange,
  columns,
}: {
  /** Unique per group on the page (native radios group by name). */
  name: string;
  legend: string;
  legendHidden?: boolean;
  options: Choice<V>[];
  value: V | null;
  onChange: (value: V) => void;
  /** Side by side instead of stacked. Use only for short labels. */
  columns?: boolean;
}) {
  return (
    <fieldset className="min-w-0">
      <legend className={legendHidden ? "sr-only" : "mb-2 text-sm font-bold"}>{legend}</legend>
      <div
        className={columns ? "grid gap-2" : "flex flex-col gap-2"}
        style={columns ? { gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` } : undefined}
      >
        {options.map((option) => {
          const checked = value === option.value;
          return (
            <label
              key={String(option.value)}
              className={[
                "flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-[var(--nb-line)] py-2 text-sm leading-snug",
                "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--nb-pink-deep)]",
                // Three across on a 375px phone leaves about 90px a cell: tighter padding there.
                columns ? "justify-center px-1.5 text-center" : "px-3",
                checked ? "nb-selected font-bold" : "bg-[var(--nb-paper)]",
              ].join(" ")}
            >
              <input
                type="radio"
                name={name}
                className="sr-only"
                checked={checked}
                onChange={() => onChange(option.value)}
              />
              {option.tag && <span className="shrink-0 font-extrabold">{option.tag}</span>}
              <span>{option.label}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

const SAVE_PROBLEM_TEXT: Record<SaveProblem, string> = {
  network: "저장 실패 · 잠시 뒤 다시 저장해 볼게요",
  signed_out: "저장 실패 · 로그인이 풀렸어요. 다른 탭에서 다시 로그인한 뒤 눌러 주세요",
  too_large: "저장 실패 · 내용이 너무 길어요. 조금 줄여 주세요",
};

/** 저장됨 / 저장 중 / 저장 실패, announced politely to screen readers. */
export function SaveStatus({
  state,
  problem,
  onRetry,
}: {
  state: SaveState;
  problem: SaveProblem | null;
  onRetry: () => void;
}) {
  return (
    <div role="status" aria-live="polite" className="flex min-h-6 flex-wrap items-center gap-x-2 gap-y-1 text-xs">
      {state === "idle" && <span className="text-gray-600">적는 대로 자동 저장돼요</span>}
      {state === "saving" && <span className="text-gray-600">저장 중…</span>}
      {state === "saved" && (
        <span className="font-bold">
          <span aria-hidden>✓ </span>저장됨
        </span>
      )}
      {state === "error" && (
        <>
          <span className="font-bold text-red-600">{SAVE_PROBLEM_TEXT[problem ?? "network"]}</span>
          <button type="button" onClick={onRetry} className="font-bold underline underline-offset-2">
            다시 시도
          </button>
        </>
      )}
    </div>
  );
}

/** Red list for blocking problems, plain list for things to look at again. */
export function ProblemList({ errors, warnings }: { errors: string[]; warnings?: string[] }) {
  if (errors.length === 0 && (!warnings || warnings.length === 0)) return null;
  return (
    <div className="flex flex-col gap-3 text-sm">
      {errors.length > 0 && (
        <div>
          <p className="mb-1 font-bold text-red-600">제출하기 전에 고쳐 주세요</p>
          <ul className="flex list-disc flex-col gap-1 pl-5 text-red-600">
            {errors.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </div>
      )}
      {warnings && warnings.length > 0 && (
        <div>
          <p className="mb-1 font-bold">한 번 더 살펴보세요 (그대로 제출해도 돼요)</p>
          <ul className="flex list-disc flex-col gap-1 pl-5 text-gray-700">
            {warnings.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
