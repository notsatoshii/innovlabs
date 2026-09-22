"use client";

// Answer widgets for the 학원 survey. Same look as the employee inputs
// (nb-btn / nb-selected), generic over the option id type because the
// hagwon contract uses numeric band indexes as well as string ids.

import type { Option } from "@/lib/hagwon/questions";

export function ChoiceList<T extends string | number>({
  options,
  value,
  onSelect,
}: {
  options: Option<T>[];
  value: T | null | undefined;
  onSelect: (id: T) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      {options.map((opt) => (
        <button
          key={String(opt.id)}
          type="button"
          onClick={() => onSelect(opt.id)}
          className={`nb-btn w-full px-4 py-3.5 text-left text-[15px] ${
            value === opt.id ? "nb-selected" : "nb-btn-white font-normal"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function MultiChoice<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Option<T>[];
  value: T[];
  onChange: (ids: T[]) => void;
}) {
  const toggle = (id: T) =>
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
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
              checked ? "nb-selected" : "nb-btn-white font-normal"
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

/** Sub-question heading inside a screen that holds two questions. */
export function SubLabel({ children }: { children: React.ReactNode }) {
  return <p className="mb-2 text-sm font-bold text-gray-700">{children}</p>;
}
