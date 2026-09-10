"use client";

// Animated "리포트를 만들고 있어요" state shown while POST /api/one-pager
// runs. Content only: the caller supplies the wrapper (a full-height <main>
// on /report, a plain block inside the 나의 AI 교육 tab).

import { useEffect, useState } from "react";

const GENERATION_STEPS = [
  { label: "답변을 읽고 있어요", at: 0 },
  { label: "트랙 커리큘럼과 맞춰 보고 있어요", at: 4 },
  { label: "리포트를 쓰고 있어요", at: 9 },
];

export default function GeneratingScreen() {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const activeIndex = GENERATION_STEPS.reduce(
    (acc, step, i) => (elapsed >= step.at ? i : acc),
    0,
  );

  return (
    <div>
      <p className="nb-accent mb-2 text-sm font-extrabold">맞춤 리포트</p>
      <h1 className="mb-8 text-2xl font-extrabold leading-snug tracking-tight">
        내 업무 기준으로
        <br />
        리포트를 만들고 있어요
      </h1>

      <div className="mb-10 flex flex-col gap-4">
        {GENERATION_STEPS.map((step, i) => {
          const done = i < activeIndex;
          const active = i === activeIndex;
          return (
            <div
              key={step.label}
              className={`flex items-center gap-3 transition-opacity duration-500 ${
                done || active ? "opacity-100" : "opacity-35"
              }`}
            >
              {done ? (
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--nb-ink)] text-[10px] font-bold text-white">
                  ✓
                </span>
              ) : active ? (
                <span className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-[var(--nb-ink)] border-t-transparent" />
              ) : (
                <span className="h-5 w-5 shrink-0 rounded-full border-2 border-gray-400" />
              )}
              <span
                className={`text-[15px] ${
                  active ? "font-medium text-gray-900" : "text-gray-500"
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Skeleton preview of the incoming report */}
      <div className="flex flex-col gap-3" aria-hidden>
        <div className="skeleton-shimmer h-4 w-2/5 rounded-md" />
        <div className="skeleton-shimmer h-3 w-full rounded-md" />
        <div className="skeleton-shimmer h-3 w-11/12 rounded-md" />
        <div className="skeleton-shimmer h-3 w-3/4 rounded-md" />
        <div className="mt-3 flex flex-col gap-2">
          <div className="skeleton-shimmer h-16 w-full rounded-xl" />
          <div className="skeleton-shimmer h-16 w-full rounded-xl" />
        </div>
      </div>

      <p className="mt-8 text-center text-xs text-gray-400">
        길면 30초 정도 걸려요
      </p>
    </div>
  );
}
