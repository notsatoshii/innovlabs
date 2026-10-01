// The 12-week timeline on the 코스 tab, grouped by block. Server component.
// Weeks are single-line rows so the whole course scans in one thumb scroll
// at 375px. Each row links to its week page.

import Link from "next/link";
import type { TimelineBlock, TimelineWeek } from "@/lib/courses/queries";

const ICON_PROPS = {
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.4,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function Timeline({ blocks, note }: { blocks: TimelineBlock[]; note: string }) {
  return (
    <section aria-labelledby="course-timeline-title">
      <h2 id="course-timeline-title" className="text-base font-extrabold tracking-tight">
        12주 구성
      </h2>
      <p className="mb-3 mt-1 text-sm leading-relaxed text-gray-700">{note}</p>
      <div className="flex flex-col gap-3">
        {blocks.map((block) => (
          <div key={block.from} className="nb-flat overflow-hidden">
            <div className="border-b-2 border-[var(--nb-ink)] bg-[var(--background)] px-3 py-2">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="min-w-0 text-sm font-extrabold">{block.title}</h3>
                <span className="shrink-0 text-xs font-bold tabular-nums text-gray-600">
                  {block.from}–{block.to}주
                </span>
              </div>
              <p className="mt-0.5 text-xs leading-snug text-gray-600">{block.summary}</p>
            </div>
            <ol className="divide-y divide-gray-200">
              {block.weeks.map((week) => (
                <li key={week.week}>
                  <WeekRow week={week} />
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </section>
  );
}

function WeekRow({ week }: { week: TimelineWeek }) {
  const className = [
    "flex min-h-11 items-center gap-2 px-3 py-2",
    week.open ? "text-[var(--nb-ink)]" : "text-gray-500",
  ].join(" ");

  const content = (
    <>
      <span className="w-9 shrink-0 text-xs font-extrabold tabular-nums">{week.week}주</span>
      <span className="min-w-0 flex-1 truncate text-sm font-semibold">{week.title}</span>
      {week.current && (
        <span className="nb-badge shrink-0 bg-[var(--nb-yellow)] px-2 text-[11px] leading-5 text-[var(--nb-ink)]">
          이번 주
        </span>
      )}
      {week.open ? (
        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 border-[var(--nb-ink)] bg-[var(--nb-lime)]">
          <svg {...ICON_PROPS} width={10} height={10} strokeWidth={3.2}>
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
          <span className="sr-only">열림</span>
        </span>
      ) : (
        <span className="grid h-5 w-5 shrink-0 place-items-center">
          <svg {...ICON_PROPS}>
            <rect x="5" y="11" width="14" height="9" rx="2" />
            <path d="M8 11V8a4 4 0 0 1 8 0v3" />
          </svg>
          <span className="sr-only">잠김</span>
        </span>
      )}
      <svg {...ICON_PROPS} className="shrink-0">
        <path d="M9 6l6 6-6 6" />
      </svg>
    </>
  );

  // Every week has a page: Weeks 1–3 in full, the rest as the fixed
  // structure (title and summary), which is also where a title too long for
  // one line can be read whole.
  return (
    <Link
      href={`/app/courses/week/${week.week}`}
      title={week.title}
      className={`${className} active:bg-gray-100`}
    >
      {content}
    </Link>
  );
}
