// Renders a generated track one-pager (the four constrained slots from
// src/lib/onepager/generate.ts). No client state, no data fetching: the
// report page and the 나의 AI 교육 tab both feed it a ready OnePager.
//
// headingLevel: "h1" on the standalone /report page, "h2" when the view sits
// inside a tab page that already has its own h1. Slot headings step down
// one level accordingly.

import type { OnePager } from "@/lib/onepager/generate";

/** Loose shape check for the profile's one_pager column (typed unknown). */
export function isOnePager(value: unknown): value is OnePager {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.mirror === "string" &&
    typeof v.outcome === "string" &&
    typeof v.closing === "string" &&
    Array.isArray(v.weeks)
  );
}

export default function OnePagerView({
  trackName,
  onePager,
  headingLevel = "h1",
}: {
  trackName: string;
  onePager: OnePager;
  headingLevel?: "h1" | "h2";
}) {
  const Title = headingLevel;
  const Slot = headingLevel === "h1" ? "h2" : "h3";

  return (
    <div>
      <p className="nb-accent mb-2 text-sm font-extrabold">나의 맞춤 리포트</p>
      <Title className="mb-6 text-3xl font-extrabold leading-snug tracking-tight">
        {trackName}
      </Title>

      {/* Slot 1 — Mirror */}
      <section className="mb-8">
        <Slot className="mb-2 text-sm font-semibold text-gray-400">지금 내 업무</Slot>
        <p className="text-[15px] leading-relaxed text-gray-800">{onePager.mirror}</p>
      </section>

      {/* Slot 2 — Week mapping */}
      <section className="mb-8">
        <Slot className="mb-3 text-sm font-semibold text-gray-400">주차별로 이렇게 배워요</Slot>
        <div className="flex flex-col gap-3">
          {onePager.weeks.map((w) => (
            <div key={w.week} className="nb-card p-4">
              <p className="nb-accent mb-1 text-xs font-extrabold">{w.week}주차</p>
              <p className="mb-1 text-[15px] font-bold">{w.title}</p>
              <p className="text-sm leading-relaxed text-gray-600">{w.connection}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Slot 3 — Hedged outcome */}
      <section className="nb-card mb-8 bg-[var(--nb-cyan)] px-5 py-4">
        <Slot className="mb-2 text-sm font-extrabold">3개월 뒤 기대할 수 있는 변화</Slot>
        <p className="text-[15px] leading-relaxed">{onePager.outcome}</p>
      </section>

      {/* Slot 4 — Aspirational close */}
      <section className="mb-10">
        <p className="text-[15px] leading-relaxed text-gray-800">{onePager.closing}</p>
      </section>
    </div>
  );
}
