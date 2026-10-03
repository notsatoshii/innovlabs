// Teaser preview of the one-pager (review A19): the report's frame with the
// track name, the "지금 내 업무" slot and the first two week rows, every line
// of content drawn as a blurred grey bar. Nothing here is generated or read
// from the curriculum: it shows the shape of the reward, not its content, so
// it cannot promise anything (CLAUDE.md rule 4) and the registration gate
// still comes after the teaser (rule 3). Server-safe, no state.

/** Widths of the placeholder lines, so the bars look like text, not a grid. */
const MIRROR_LINES = ["94%", "61%"];
const WEEK_ROWS = [
  { week: 1, title: "52%", lines: ["84%"] },
  { week: 2, title: "64%", lines: ["78%"] },
];

function Bar({ width, tone = "light" }: { width: string; tone?: "light" | "dark" }) {
  return (
    <span
      className={`block h-2.5 rounded-full blur-[1.5px] ${
        tone === "dark" ? "bg-gray-400" : "bg-gray-200"
      }`}
      style={{ width }}
    />
  );
}

export default function ReportPreview({ trackName }: { trackName: string }) {
  return (
    <figure className="nb-card relative mb-6 overflow-hidden">
      <div aria-hidden className="h-[19rem] px-4 pt-4 select-none">
        <div className="flex items-center justify-between gap-2">
          <p className="nb-accent text-xs font-extrabold">나의 맞춤 리포트</p>
          <span className="nb-sticker">미리보기</span>
        </div>
        <p className="mt-1 text-xl font-extrabold leading-snug tracking-tight">{trackName}</p>

        <p className="mt-3 mb-2 text-xs font-semibold text-gray-600">지금 내 업무</p>
        <div className="flex flex-col gap-1.5">
          {MIRROR_LINES.map((w, i) => (
            <Bar key={i} width={w} />
          ))}
        </div>

        <p className="mt-3 mb-2 text-xs font-semibold text-gray-600">주차별로 이렇게 배워요</p>
        <div className="flex flex-col gap-2">
          {WEEK_ROWS.map((row) => (
            <div key={row.week} className="nb-flat px-3 py-2">
              <p className="nb-accent mb-1 text-[11px] font-extrabold">{row.week}주차</p>
              <Bar width={row.title} tone="dark" />
              <div className="mt-1.5 flex flex-col gap-1.5">
                {row.lines.map((w, i) => (
                  <Bar key={i} width={w} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Fade into the card and say what the reader is looking at. */}
      <figcaption className="absolute inset-x-0 bottom-0 flex items-end justify-center bg-linear-to-b from-transparent via-white/80 via-60% to-white px-4 pt-8 pb-3">
        <span className="flex items-center gap-1.5 text-sm font-bold text-gray-800">
          <svg
            width={16}
            height={16}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.4}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <rect x="5" y="11" width="14" height="10" rx="2" />
            <path d="M8 11V8a4 4 0 0 1 8 0v3" />
          </svg>
          <span className="sr-only">맞춤 리포트 미리보기. </span>
          등록하시면 리포트 전체가 열려요
        </span>
      </figcaption>
    </figure>
  );
}
