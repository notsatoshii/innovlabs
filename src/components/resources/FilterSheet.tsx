"use client";

// 필터 sheet of the 도구 view (docs/app/phases/ui-tools-redesign.md §5.5).
// A native modal <dialog> anchored to the bottom, above the tab bar. Changes
// apply immediately; the primary button only closes the sheet and shows the
// live count. Esc, ✕, the primary button and a backdrop tap all close it.

import { useEffect, useId, useRef } from "react";
import {
  CATEGORY_LABEL,
  type Difficulty,
  type ToolCategory,
  type ToolPath,
} from "@/lib/resources/types";
import { FOCUS_RING } from "./ToolCard";

const PATH_LABEL: Record<ToolPath, string> = {
  browser: "브라우저 경로",
  agent: "에이전트·서버 경로",
};

const FOCUSABLE = 'button:not([disabled]), select:not([disabled]), a[href], input:not([disabled])';

/** A full-width checkbox row: the whole 44px line is the control. */
function CheckRow({
  checked,
  onChange,
  buttonRef,
  children,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  buttonRef?: React.Ref<HTMLButtonElement>;
  children: React.ReactNode;
}) {
  return (
    <button
      ref={buttonRef}
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`flex min-h-11 w-full items-center gap-3 rounded-lg text-left text-[15px] font-semibold ${FOCUS_RING}`}
    >
      <span
        aria-hidden
        className={[
          "grid h-6 w-6 shrink-0 place-items-center rounded-md border-2 border-[var(--nb-ink)]",
          checked ? "bg-[var(--nb-yellow)]" : "bg-[var(--nb-paper)]",
        ].join(" ")}
      >
        {checked && (
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        )}
      </span>
      <span>{children}</span>
    </button>
  );
}

export function FilterSheet({
  open,
  onClose,
  level,
  taughtOnly,
  onTaughtOnly,
  category,
  onCategory,
  categories,
  learnerPath,
  myPathOnly,
  onMyPathOnly,
  resultCount,
  onReset,
}: {
  open: boolean;
  onClose: () => void;
  /** The selected level: the 분류 options are the categories present at it. */
  level: Difficulty;
  taughtOnly: boolean;
  onTaughtOnly: (value: boolean) => void;
  category: ToolCategory | "";
  onCategory: (category: ToolCategory | "") => void;
  categories: { id: ToolCategory; count: number }[];
  /** null when the survey recorded no depth flag: the path row is hidden. */
  learnerPath: ToolPath | null;
  myPathOnly: boolean;
  onMyPathOnly: (value: boolean) => void;
  resultCount: number;
  onReset: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const firstRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const selectId = useId();

  // Drive the native dialog from the `open` prop and keep the page behind it
  // from scrolling while it is up.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!open) {
      if (dialog.open) dialog.close();
      return;
    }
    if (!dialog.open) dialog.showModal();
    firstRef.current?.focus();
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = previous;
    };
  }, [open]);

  // The native modal already keeps focus out of the page; this also stops
  // Tab from leaving the sheet for the browser's own controls.
  function onKeyDown(e: React.KeyboardEvent<HTMLDialogElement>) {
    if (e.key !== "Tab") return;
    const items = Array.from(e.currentTarget.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      data-level={level}
      // Esc: close through the parent's state right away instead of waiting
      // for the native close event, which the browser queues as a task.
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClose={onClose}
      onKeyDown={onKeyDown}
      onClick={(e) => {
        // The content fills the dialog box, so a click that lands on the
        // dialog element itself is a tap on the backdrop.
        if (e.target === e.currentTarget) onClose();
      }}
      className="nb-flat fixed inset-x-0 top-auto bottom-0 mx-auto max-h-[85dvh] w-full max-w-lg overflow-y-auto overscroll-contain rounded-b-none border-b-0 p-0 text-[var(--nb-ink)] backdrop:bg-black/50"
    >
      <div className="flex flex-col gap-2 px-5 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between">
          <h2 id={titleId} className="text-lg font-extrabold">
            필터
          </h2>
          <button
            type="button"
            aria-label="필터 닫기"
            onClick={onClose}
            className={`-mr-2 grid h-11 w-11 place-items-center rounded-lg ${FOCUS_RING}`}
          >
            <svg
              aria-hidden
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.6"
              strokeLinecap="round"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <CheckRow checked={taughtOnly} onChange={onTaughtOnly} buttonRef={firstRef}>
          수업에서 다루는 도구만
        </CheckRow>

        <div>
          <label htmlFor={selectId} className="mb-1 block text-xs font-bold text-gray-700">
            분류
          </label>
          <select
            id={selectId}
            value={category}
            onChange={(e) => onCategory(e.target.value as ToolCategory | "")}
            className="nb-input min-h-11 w-full px-3 text-base"
          >
            <option value="">전체</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {CATEGORY_LABEL[c.id]} ({c.count})
              </option>
            ))}
          </select>
        </div>

        {learnerPath && (
          <CheckRow checked={myPathOnly} onChange={onMyPathOnly}>
            내 경로만 보기 ({PATH_LABEL[learnerPath]})
          </CheckRow>
        )}

        <div className="mt-2 flex gap-3">
          <button
            type="button"
            onClick={onReset}
            className={`nb-btn nb-btn-white min-h-11 px-5 text-sm ${FOCUS_RING}`}
          >
            초기화
          </button>
          <button
            type="button"
            onClick={onClose}
            className={`nb-btn nb-btn-primary min-h-11 flex-1 px-4 text-sm ${FOCUS_RING}`}
          >
            {resultCount}개 보기
          </button>
        </div>
      </div>
    </dialog>
  );
}
