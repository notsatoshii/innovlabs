"use client";

// The cohort's join code, large enough to read off a projector, with a copy
// button. The code is what the instructor shares in the room (phase-2 P1).

import { useState } from "react";

export default function CopyCode({ code, size = "md" }: { code: string; size?: "md" | "lg" }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setState("copied");
    } catch {
      setState("failed");
    }
    setTimeout(() => setState("idle"), 2000);
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span
        aria-label={`참여 코드 ${code.split("").join(" ")}`}
        className={`select-all rounded-lg border-2 border-[var(--nb-ink)] bg-[var(--nb-yellow)] px-3 py-1 font-mono font-extrabold tracking-[0.25em] ${
          size === "lg" ? "text-4xl sm:text-5xl" : "text-2xl"
        }`}
      >
        {code}
      </span>
      <button type="button" onClick={() => void copy()} className="nb-btn nb-btn-white px-3 py-1.5 text-xs">
        {state === "copied" ? "복사했어요" : "코드 복사"}
      </button>
      {state === "failed" && (
        <span role="status" className="text-xs text-red-600">
          복사하지 못했어요. 코드를 길게 눌러 직접 복사해 주세요.
        </span>
      )}
    </div>
  );
}
