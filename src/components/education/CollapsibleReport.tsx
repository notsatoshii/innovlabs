"use client";

// The 맞춤 리포트 on 나의 AI 교육, folded after the first view (review A16).
// The report is open until the learner has actually scrolled it into view
// once; this device then remembers that (localStorage, per user, so a second
// account on a shared PC gets its own first view). On later visits it shows
// the title and "리포트 펼치기". The report stays in the page while folded
// (hidden), so opening it is instant and nothing is fetched again.

import { useEffect, useId, useRef, useState } from "react";

const SEEN_PREFIX = "innovlabs_report_seen_v1:";

/** Remember that this user has seen the report on this device. Never throws. */
export function markReportSeen(userId: string): void {
  try {
    window.localStorage.setItem(SEEN_PREFIX + userId, "1");
  } catch {
    // storage blocked: the report simply stays open next time
  }
}

function hasSeenReport(userId: string): boolean {
  try {
    return window.localStorage.getItem(SEEN_PREFIX + userId) === "1";
  } catch {
    return false;
  }
}

export default function CollapsibleReport({
  userId,
  trackName,
  children,
}: {
  userId: string;
  trackName: string;
  children: React.ReactNode;
}) {
  // Server render and first paint: open (a first-time reader never sees a
  // jump). A returning reader's report folds right after mount; it sits at
  // the bottom of the tab, below the fold on a phone.
  const [open, setOpen] = useState(true);
  const bodyId = useId();
  const bodyRef = useRef<HTMLDivElement>(null);

  // localStorage is client-only; reading it in a mount effect is intentional.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (hasSeenReport(userId)) {
      setOpen(false);
      return;
    }
    // First view = the report reached the screen, not merely the page loaded
    // (it is the last section of the tab).
    const body = bodyRef.current;
    if (!body || typeof IntersectionObserver === "undefined") {
      markReportSeen(userId);
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        markReportSeen(userId);
        observer.disconnect();
      }
    });
    observer.observe(body);
    return () => observer.disconnect();
  }, [userId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return (
    <div>
      {open ? (
        <div className="mb-2 flex justify-end">
          <button
            type="button"
            aria-expanded
            aria-controls={bodyId}
            onClick={() => setOpen(false)}
            className="min-h-11 px-2 text-sm font-semibold text-gray-600 underline underline-offset-4"
          >
            리포트 접기
          </button>
        </div>
      ) : (
        <div className="nb-card px-5 py-5">
          <p className="nb-accent mb-1 text-xs font-extrabold">나의 맞춤 리포트</p>
          <h2 className="text-xl font-extrabold leading-snug tracking-tight">{trackName}</h2>
          <p className="mt-1 text-sm leading-relaxed text-gray-600">
            진단 답변을 바탕으로 쓴 리포트예요. 주차별로 무엇을 배우는지 다시 보실 수 있어요.
          </p>
          <button
            type="button"
            aria-expanded={false}
            aria-controls={bodyId}
            onClick={() => setOpen(true)}
            className="nb-btn nb-btn-white mt-4 flex min-h-11 w-full items-center justify-center px-4 text-sm"
          >
            리포트 펼치기
          </button>
        </div>
      )}
      <div id={bodyId} ref={bodyRef} hidden={!open}>
        {children}
      </div>
    </div>
  );
}
