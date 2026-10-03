"use client";

// The success line after a countersign (?countersigned=<userId>). The reload
// keeps the scroll position (scroll: false), so on the learner page the line
// sits where the button was; on the cohort page it heads the queue, which
// has just lost the row. Either way, if it lands off screen it scrolls itself
// into view once, clear of the sticky header.

import { useEffect, useRef } from "react";

export default function CountersignedNotice({
  message = "강사 확인을 마쳤어요. 이 기준선은 이제 바꿀 수 없어요.",
}: {
  message?: string;
}) {
  const ref = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    ref.current?.scrollIntoView({ block: "nearest" });
  }, []);
  return (
    <p
      ref={ref}
      role="status"
      className="nb-flat scroll-mt-[calc(var(--site-header-h)+1rem)] scroll-mb-4 bg-[var(--nb-lime)] px-3 py-2.5 text-sm font-extrabold"
    >
      {message}
    </p>
  );
}
