"use client";

// The template sheet (D1): SP-HL-01 to 03 in the harness card's six-part
// layout, read-only. It is also Week 2 Part 1's reading ("read all three,
// find the six parts"), so it opens for any harness; "이걸로 시작" shows only
// where starting is allowed (a harness never saved). A native modal <dialog>
// anchored to the bottom like the 도구 filter sheet: Esc, ✕ and a backdrop
// tap close it.

import { useEffect, useId, useRef, useState } from "react";
import type { HarnessTemplate } from "@/lib/courses/types";
import { COPIED } from "./template-rules";

const FOCUSABLE = 'button:not([disabled]), a[href], summary, [tabindex="0"]';

type PartKey = keyof HarnessTemplate["parts"];

// The harness card's order and titles, as in the editor.
const PARTS: { key: PartKey; order: number; title: string }[] = [
  { key: "role", order: 1, title: "역할" },
  { key: "context", order: 2, title: "맥락" },
  { key: "format", order: 3, title: "형식" },
  { key: "rules", order: 4, title: "규칙" },
  { key: "example", order: 5, title: "예시" },
  { key: "fallbacks", order: 6, title: "예외 처리" },
];

const isCopied = (key: PartKey) => (COPIED as readonly string[]).includes(key);

function PartBlock({
  order,
  title,
  badge,
  children,
}: {
  order: number;
  title: string;
  badge: string | null;
  children: React.ReactNode;
}) {
  return (
    <section className="nb-card flex flex-col gap-2.5 px-4 py-4">
      <h4 className="flex items-center gap-2">
        <span className="nb-badge grid h-7 w-7 shrink-0 place-items-center bg-[var(--nb-yellow)] text-sm font-extrabold">
          {order}
        </span>
        <span className="text-base font-extrabold">{title}</span>
        {badge && (
          <span className="nb-badge ml-auto shrink-0 bg-[var(--nb-paper)] px-2 py-0.5 text-[11px] font-bold">
            {badge}
          </span>
        )}
      </h4>
      {children}
    </section>
  );
}

export function TemplateSheet({
  open,
  onClose,
  templates,
  initialId,
  canStart,
  onStart,
}: {
  open: boolean;
  onClose: () => void;
  /** At least one; the caller renders nothing without templates. */
  templates: HarnessTemplate[];
  /** The template to show first (the one this harness started from), if any. */
  initialId: string | null;
  /** False for a harness that has a saved version: reading only. */
  canStart: boolean;
  onStart: (template: HarnessTemplate) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const chosenRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const [chosenId, setChosenId] = useState<string>(() => initialId ?? templates[0]?.id ?? "");
  const chosen = templates.find((template) => template.id === chosenId) ?? templates[0];

  // Drive the native dialog from `open`; keep the page behind it from scrolling.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!open) {
      if (dialog.open) dialog.close();
      return;
    }
    if (!dialog.open) dialog.showModal();
    chosenRef.current?.focus();
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = previous;
    };
  }, [open]);

  const choose = (id: string) => {
    setChosenId(id);
    bodyRef.current?.scrollTo({ top: 0 });
  };

  // The native modal keeps focus out of the page; this also keeps Tab inside the sheet.
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

  if (!chosen) return null;

  const badge = (key: PartKey) => (canStart ? (isCopied(key) ? "그대로 가져와요" : "직접 써요") : null);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClose={onClose}
      onKeyDown={onKeyDown}
      onClick={(e) => {
        // The content fills the dialog box, so a click on the dialog itself is a backdrop tap.
        if (e.target === e.currentTarget) onClose();
      }}
      className="nb-flat fixed inset-x-0 top-auto bottom-0 mx-auto h-[92dvh] max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-b-none border-b-0 bg-[var(--background)] p-0 text-[var(--nb-ink)] backdrop:bg-black/50 open:flex"
    >
      <div className="flex flex-col gap-2 border-b border-[var(--nb-line)] px-5 pt-3 pb-3">
        <div className="flex items-center justify-between gap-3">
          <h2 id={titleId} className="text-lg font-extrabold">
            하네스 템플릿
          </h2>
          <button
            type="button"
            aria-label="템플릿 닫기"
            onClick={onClose}
            className="-mr-2 grid h-11 w-11 shrink-0 place-items-center rounded-lg"
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
        <p className="text-sm leading-relaxed text-gray-700">
          모든 템플릿이 같은 여섯 부분으로 되어 있어요. 부분마다 무엇을 적었는지 비교해 보세요.
        </p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="템플릿 고르기">
          {templates.map((template) => (
            <button
              key={template.id}
              ref={template.id === chosen.id ? chosenRef : undefined}
              type="button"
              aria-pressed={template.id === chosen.id}
              onClick={() => choose(template.id)}
              className={`min-h-11 rounded-full border border-[var(--nb-line)] px-3.5 text-sm ${
                template.id === chosen.id ? "nb-selected font-bold" : "bg-[var(--nb-paper)]"
              }`}
            >
              {template.doc_type}
            </button>
          ))}
        </div>
      </div>

      <div ref={bodyRef} className="flex flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-5 py-4">
        <div className="flex flex-col gap-0.5">
          <h3 className="break-words text-base font-extrabold leading-snug">{chosen.name}</h3>
          <p className="text-xs text-gray-600">문서 종류: {chosen.doc_type}</p>
        </div>

        {PARTS.map(({ key, order, title }) => (
          <PartBlock key={key} order={order} title={title} badge={badge(key)}>
            {key === "rules" ? (
              <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-sm leading-relaxed">
                {chosen.parts.rules.map((rule, index) => (
                  <li key={index} className="break-words">
                    {rule}
                  </li>
                ))}
              </ol>
            ) : key === "example" ? (
              <div
                tabIndex={0}
                aria-label="예시 전체"
                className="nb-flat max-h-80 overflow-auto whitespace-pre-wrap break-words bg-[var(--background)] px-3 py-3 text-sm leading-relaxed"
              >
                {chosen.parts.example}
              </div>
            ) : (
              <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{chosen.parts[key]}</p>
            )}
          </PartBlock>
        ))}
      </div>

      <div className="flex flex-col gap-2 border-t border-[var(--nb-line)] px-5 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        {canStart ? (
          <>
            <button
              type="button"
              onClick={() => onStart(chosen)}
              className="nb-btn nb-btn-primary w-full px-4 py-3.5 text-[15px]"
            >
              이걸로 시작
            </button>
            <p className="text-xs leading-relaxed text-gray-600">
              형식, 규칙, 예외 처리는 그대로 가져와요. 역할, 맥락, 예시는 내 일에 맞게 직접 쓰도록 비워 두고,
              빈칸에 템플릿 내용을 흐리게 보여 드려요.
            </p>
          </>
        ) : (
          <p className="text-sm leading-relaxed text-gray-700">
            저장한 하네스는 템플릿으로 바꿀 수 없어요. 목록에서 새 하네스를 만들면 템플릿으로 시작할 수 있어요.
          </p>
        )}
      </div>
    </dialog>
  );
}
