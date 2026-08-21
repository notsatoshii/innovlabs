"use client";

// Answer input widgets — mobile-first, thumb-sized tap targets.

import { useState } from "react";
import type { Option } from "@/lib/survey/questions";
import { HOUR_BUCKET_LABELS, type HourBucket } from "@/lib/survey/types";

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
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
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
      {selected?.otherInput && (
        <input
          type="text"
          autoFocus
          value={otherText}
          onChange={(e) => onSelect(selected.id, e.target.value)}
          placeholder="직무를 직접 입력해 주세요"
          className="nb-input mt-1 w-full px-4 py-3 text-[15px]"
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
    <div className="flex flex-col gap-2">
      {options.map((opt) => {
        const checked = value.includes(opt.id);
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => toggle(opt.id)}
            className={`nb-btn flex w-full items-center gap-3 px-4 py-3.5 text-left text-[15px] ${
              checked
                ? "nb-selected"
                : "nb-btn-white font-normal"
            }`}
          >
            <span
              aria-hidden
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 border-[var(--nb-ink)] text-xs ${
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
  onChange,
}: {
  value: string;
  placeholder?: string;
  multiline?: boolean;
  onChange: (text: string) => void;
}) {
  const [touched, setTouched] = useState(false);
  const cls =
    "nb-input w-full px-4 py-3 text-[15px] leading-relaxed placeholder:text-gray-400";
  return multiline ? (
    <textarea
      value={value}
      rows={5}
      placeholder={placeholder}
      onChange={(e) => {
        setTouched(true);
        onChange(e.target.value);
      }}
      className={cls}
      aria-invalid={touched && value.trim() === ""}
    />
  ) : (
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={(e) => {
        setTouched(true);
        onChange(e.target.value);
      }}
      className={cls}
      aria-invalid={touched && value.trim() === ""}
    />
  );
}

/** Q5 sequential variant: one cluster per screen, 5 hour buckets. */
export function HourButtons({
  value,
  onSelect,
}: {
  value: HourBucket | null;
  onSelect: (bucket: HourBucket) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      {HOUR_BUCKET_LABELS.map((label, i) => (
        <button
          key={label}
          type="button"
          onClick={() => onSelect(i as HourBucket)}
          className={`nb-btn w-full px-4 py-3.5 text-left text-[15px] ${
            value === i
              ? "nb-selected"
              : "nb-btn-white font-normal"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
