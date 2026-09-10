// One tool entry in the v0.3 four-line format (phase-1.md §6 view 1).
// Plain component: rendered inside the client-side ToolLibrary list, so it
// imports nothing server-only.

import {
  CATEGORY_LABEL,
  DIFFICULTY_LABEL,
  STATUS_LABEL,
  type ToolEntry,
} from "@/lib/resources/types";

const DIFFICULTY_FILL: Record<ToolEntry["difficulty"], string> = {
  1: "bg-[var(--nb-lime)]",
  2: "bg-[var(--nb-cyan)]",
  3: "bg-[var(--nb-yellow)]",
  4: "bg-[var(--nb-pink)]",
};

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

export function ToolCard({ tool }: { tool: ToolEntry }) {
  const status = tool.status === "draft" ? null : STATUS_LABEL[tool.status];
  const licenseCost = [tool.license, tool.cost].filter(Boolean).join(" · ");

  return (
    <article className="nb-card px-4 py-4">
      <header>
        <h3 className="text-lg font-extrabold leading-tight tracking-tight break-words">
          {tool.name}
        </h3>
        <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
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
      </header>

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
          className="nb-btn nb-btn-white mt-4 inline-flex min-h-10 items-center px-4 text-sm"
        >
          바로 가기 ↗
        </a>
      )}
    </article>
  );
}
