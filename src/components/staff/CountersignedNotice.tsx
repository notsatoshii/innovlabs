"use client";

// The success line after a countersign (?countersigned=1). The reload keeps
// the scroll position (scroll: false), so the line sits where the button was
// and, if it still lands off screen, scrolls itself into view once, clear of
// the sticky header.

import { useEffect, useRef } from "react";

export default function CountersignedNotice() {
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
      강사 확인을 마쳤어요. 이 기준선은 이제 바꿀 수 없어요.
    </p>
  );
}
