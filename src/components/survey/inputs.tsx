"use client";

// Answer input widgets — mobile-first, thumb-sized tap targets.
// Text fields render at 16px (text-base): Safari on iPhone zooms the page on
// any focused field smaller than that.

import { useState } from "react";
import type { Option } from "@/lib/survey/questions";
import { HOUR_BUCKET_LABELS, type HourBucket } from "@/lib/survey/types";

/** Hard cap on every free-text answer (the text also feeds the report prompt). */
const TEXT_MAX_LENGTH = 1000;
/** Cap on the short "기타 (직접 입력)" follow-up. */
const OTHER_MAX_LENGTH = 100;

export function SingleSelect({
  options,
  value,
  otherText,
  onSelect,
}: {
  options: Option[];
  value: string | null;
  otherText: string;
  onSelect: (id: string, otherText: string) => void;
}) {
  const selected = options.find((o) => o.id === value);
  return (
    <div className="flex flex-col gap-2">
      <div role="radiogroup" className="flex flex-col gap-2">
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={value === opt.id}
            onClick={() => onSelect(opt.id, opt.otherInput ? otherText : "")}
            className={`nb-btn w-full px-4 py-3.5 text-left text-[15px] ${
              value === opt.id
                ? "nb-selected"
                : "nb-btn-white font-normal"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {selected?.otherInput && (
        <input
          type="text"
          autoFocus
          value={otherText}
          maxLength={OTHER_MAX_LENGTH}
          onChange={(e) => onSelect(selected.id, e.target.value)}
          placeholder="직무를 직접 입력해 주세요"
          aria-label="직무 직접 입력"
          className="nb-input mt-1 w-full px-4 py-3 text-base"
        />
      )}
    </div>
  );
}

export function MultiSelect({
  options,
  value,
  onChange,
}: {
  options: Option[];
  value: string[];
  onChange: (ids: string[]) => void;
}) {
  const toggle = (id: string) => {
    if (id === "none") {
      // "없음" is exclusive with everything else.
      onChange(value.includes("none") ? [] : ["none"]);
      return;
    }
    const next = value.includes(id)
      ? value.filter((v) => v !== id)
      : [...value.filter((v) => v !== "none"), id];
    onChange(next);
  };
  return (
    <div role="group" className="flex flex-col gap-2">
      {options.map((opt) => {
        const checked = value.includes(opt.id);
        return (
          <button
            key={opt.id}
            type="button"
            role="checkbox"
            aria-checked={checked}
            onClick={() => toggle(opt.id)}
            className={`nb-btn flex w-full items-center gap-3 px-4 py-3.5 text-left text-[15px] ${
              checked
                ? "nb-selected"
                : "nb-btn-white font-normal"
            }`}
          >
            <span
              aria-hidden
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border border-[var(--nb-line)] text-xs ${
                checked ? "bg-[var(--nb-ink)] text-white" : "bg-white"
              }`}
            >
              {checked ? "✓" : ""}
            </span>
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function TextAnswer({
  value,
  placeholder,
  multiline,
  shortAnswerHint,
  onChange,
}: {
  value: string;
  placeholder?: string;
  multiline?: boolean;
  /**
   * Shown under the field while the answer is shorter than 20 characters.
   * A nudge only: it never blocks 다음.
   */
  shortAnswerHint?: string;
  onChange: (text: string) => void;
}) {
  const [touched, setTouched] = useState(false);
  const cls =
    "nb-input w-full px-4 py-3 text-base leading-relaxed placeholder:text-gray-400";
  const trimmed = value.trim();
  const showHint = Boolean(shortAnswerHint) && trimmed.length > 0 && trimmed.length < 20;
  return (
    <>
      {multiline ? (
        <textarea
          value={value}
          rows={5}
          maxLength={TEXT_MAX_LENGTH}
          placeholder={placeholder}
          onChange={(e) => {
            setTouched(true);
            onChange(e.target.value);
          }}
          className={cls}
          aria-invalid={touched && trimmed === ""}
        />
      ) : (
        <input
          type="text"
          value={value}
          maxLength={TEXT_MAX_LENGTH}
          placeholder={placeholder}
          onChange={(e) => {
            setTouched(true);
            onChange(e.target.value);
          }}
          className={cls}
          aria-invalid={touched && trimmed === ""}
        />
      )}
      {showHint && (
        <p className="mt-2 text-xs leading-relaxed text-gray-600">{shortAnswerHint}</p>
      )}
    </>
  );
}

/** Q5 sequential variant: one cluster per screen, 5 hour buckets. */
export function HourButtons({
  value,
  label,
  onSelect,
}: {
  value: HourBucket | null;
  /** The task cluster this screen asks about (names the radio group). */
  label?: string;
  onSelect: (bucket: HourBucket) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-col gap-2">
      {HOUR_BUCKET_LABELS.map((bucketLabel, i) => (
        <button
          key={bucketLabel}
          type="button"
          role="radio"
          aria-checked={value === i}
          onClick={() => onSelect(i as HourBucket)}
          className={`nb-btn w-full px-4 py-3.5 text-left text-[15px] ${
            value === i
              ? "nb-selected"
              : "nb-btn-white font-normal"
          }`}
        >
          {bucketLabel}
        </button>
      ))}
    </div>
  );
}
