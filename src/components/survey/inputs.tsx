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
          className={`w-full rounded-xl border px-4 py-3.5 text-left text-[15px] transition-colors ${
            value === opt.id
              ? "border-blue-600 bg-blue-50 font-medium text-blue-900"
              : "border-gray-200 bg-white text-gray-800 active:bg-gray-50"
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
          className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-3 text-[15px] focus:border-blue-600 focus:outline-none"
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
            className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3.5 text-left text-[15px] transition-colors ${
              checked
                ? "border-blue-600 bg-blue-50 font-medium text-blue-900"
                : "border-gray-200 bg-white text-gray-800 active:bg-gray-50"
            }`}
          >
            <span
              aria-hidden
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs ${
                checked ? "border-blue-600 bg-blue-600 text-white" : "border-gray-300 bg-white"
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
    "w-full rounded-xl border border-gray-300 px-4 py-3 text-[15px] leading-relaxed focus:border-blue-600 focus:outline-none placeholder:text-gray-400";
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
          className={`w-full rounded-xl border px-4 py-3.5 text-left text-[15px] transition-colors ${
            value === i
              ? "border-blue-600 bg-blue-50 font-medium text-blue-900"
              : "border-gray-200 bg-white text-gray-800 active:bg-gray-50"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
