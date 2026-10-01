"use client";

// One tool entry in the 도구 view (docs/app/phases/ui-tools-redesign.md §5.4).
// ToolRow is the collapsed line: name, short level badge, one sentence.
// Tapping it opens ToolDetail in place: the v0.3 four-line entry
// (phase-1.md §6 view 1), same content and order as the old always-open card.

import { useId, useState } from "react";
import {
  CATEGORY_LABEL,
  DIFFICULTY_LABEL,
  STATUS_LABEL,
  type ToolEntry,
} from "@/lib/resources/types";
import { levelName, levelShort } from "@/lib/resources/picks";

/** Level fills. Lime and cyan are fills only: the text on them stays ink. */
export const DIFFICULTY_FILL: Record<ToolEntry["difficulty"], string> = {
  1: "bg-[var(--nb-lime)]",
  2: "bg-[var(--nb-cyan)]",
  3: "bg-[var(--nb-yellow)]",
  4: "bg-[var(--nb-pink)]",
};

/** Visible keyboard focus for controls that have none of their own (nb-btn, plain buttons). */
export const FOCUS_RING =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--nb-ink)]";

/** "300k" for 300 000, "12.5k" for 12 500, "850" below a thousand. */
export function formatStars(stars: number): string {
  if (stars < 1000) return String(stars);
  const k = stars / 1000;
  const text = k >= 100 ? k.toFixed(0) : k.toFixed(1).replace(/\.0$/, "");
  return `${text}k`;
}

/** "2026-06-01" → "2026-06"; anything else is shown as-is. */
export function formatMonth(date: string): string {
  const m = /^(\d{4})-(\d{2})/.exec(date);
  return m ? `${m[1]}-${m[2]}` : date;
}

function Line({ label, text }: { label: string; text: string | null }) {
  if (!text) return null;
  return (
    <div>
      <p className="text-[11px] font-bold text-gray-500">{label}</p>
      <p className="text-sm leading-relaxed">{text}</p>
    </div>
  );
}

/** The full entry: badges, four labelled lines, cost line, Korean note, link. */
export function ToolDetail({ tool }: { tool: ToolEntry }) {
  const status = tool.status === "draft" ? null : STATUS_LABEL[tool.status];
  const licenseCost = [tool.license, tool.cost].filter(Boolean).join(" · ");

  return (
    <div className="px-3 pb-3.5">
      <div className="flex flex-wrap gap-1.5 text-[11px]">
        <span
          className={`nb-badge px-2 py-0.5 ${DIFFICULTY_FILL[tool.difficulty]}`}
          title={DIFFICULTY_LABEL[tool.difficulty].who}
        >
          {DIFFICULTY_LABEL[tool.difficulty].badge}
        </span>
        <span className="nb-badge bg-[var(--nb-paper)] px-2 py-0.5">
          {CATEGORY_LABEL[tool.category]}
        </span>
        {status && (
          <span className="nb-badge bg-[var(--nb-paper)] px-2 py-0.5 font-semibold text-gray-700">
            {status}
          </span>
        )}
      </div>

      <div className="mt-3 flex flex-col gap-2.5">
        <Line label="이게 뭐냐면" text={tool.what_it_is} />
        <Line label="이럴 때 써요" text={tool.use_it_to} />
        <Line label="왜 중요하냐면" text={tool.why_it_matters} />
        <Line label="주의할 점" text={tool.watch_out} />
      </div>

      {(licenseCost || tool.stars !== null) && (
        <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-600">
          {licenseCost && <span>{licenseCost}</span>}
          {tool.stars !== null && (
            <span>
              ⭐ {formatStars(tool.stars)}
              {tool.stars_dated && ` · ${formatMonth(tool.stars_dated)} 기준`}
            </span>
          )}
        </p>
      )}

      {tool.korean_notes && (
        <p className="nb-flat mt-3 bg-[var(--nb-yellow)] px-3 py-2 text-xs leading-relaxed">
          {tool.korean_notes}
        </p>
      )}

      {tool.url && (
        <a
          href={tool.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`nb-btn nb-btn-white mt-4 inline-flex min-h-11 items-center px-4 text-sm ${FOCUS_RING}`}
        >
          바로 가기 ↗<span className="sr-only"> 새 창에서 열려요</span>
        </a>
      )}
    </div>
  );
}

/**
 * One list row. Collapsed: name, level badge, `line` clamped to two rendered
 * lines, chevron. Open: the line gives way to ToolDetail. Each row keeps its
 * own open state; the list remounts its rows (by key) to close them all.
 */
export function ToolRow({ tool, line }: { tool: ToolEntry; line: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const buttonId = `${id}-header`;
  const panelId = `${id}-detail`;

  return (
    <li className="border-t-2 border-[var(--nb-ink)] first:border-t-0">
      <h3>
        <button
          type="button"
          id={buttonId}
          aria-expanded={open}
          aria-controls={open ? panelId : undefined}
          onClick={() => setOpen((v) => !v)}
          className="block min-h-11 w-full px-3 py-1.5 text-left focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-[color:var(--nb-ink)]"
        >
          <span className={`flex gap-1.5 ${open ? "items-start" : "items-center"}`}>
            <span
              className={[
                "min-w-0 text-[15px] font-extrabold leading-snug",
                open ? "break-words" : "truncate",
              ].join(" ")}
            >
              {tool.name}
            </span>
            <span
              className={`nb-badge shrink-0 px-1.5 text-[11px] leading-4 ${DIFFICULTY_FILL[tool.difficulty]}`}
            >
              {levelShort(tool.difficulty)}
              <span className="sr-only"> {levelName(tool.difficulty)}</span>
            </span>
            <svg
              aria-hidden
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={[
                "ml-auto shrink-0 transition-transform duration-150 motion-reduce:transition-none",
                open ? "rotate-180" : "",
              ].join(" ")}
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </span>
          {/* Full row width, under the chevron: more entries fit on one line. */}
          {!open && (
            <span className="line-clamp-2 text-[13px] font-normal leading-[1.45] text-gray-700">
              {line}
            </span>
          )}
        </button>
      </h3>
      {open && (
        <div id={panelId} role="region" aria-labelledby={buttonId}>
          <ToolDetail tool={tool} />
        </div>
      )}
    </li>
  );
}
