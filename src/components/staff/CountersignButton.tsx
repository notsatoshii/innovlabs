"use client";

// "김OO 님 기준선 확인" → POST /api/staff/learner/[userId]/countersign
// (phase-2c C5). The button names the learner and posts the baseline_locked
// event id the page displayed, so a lock the instructor never saw is refused
// (409 stale) instead of stamped. A double tap returns the first stamp.
// Two taps: the first arms the button ("한 번 더 누르면 확정돼요"), the second
// posts, since a countersign cannot be undone in the app (D3).

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { CountersignRequest } from "@/lib/courses/types";
import { errorMessage, postStaff } from "./api";
import type { CountersignResult } from "./results";

/** How long the second tap stays armed before the button goes back. */
const ARM_MS = 8000;

export default function CountersignButton({
  userId,
  learnerName,
  baselineEventId,
}: {
  userId: string;
  learnerName: string;
  baselineEventId: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<"idle" | "armed" | "saving" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  // A countersign freezes the baseline for good (D3), so the first tap only
  // arms the button; an armed button that is left alone goes back.
  useEffect(() => {
    if (state !== "armed") return;
    const timer = setTimeout(() => setState("idle"), ARM_MS);
    return () => clearTimeout(timer);
  }, [state]);

  const countersign = async () => {
    if (state === "idle") {
      setError(null);
      return setState("armed");
    }
    if (state !== "armed") return;
    setError(null);
    setState("saving");
    const request: CountersignRequest = { baseline_event_id: baselineEventId };
    const result = await postStaff<CountersignResult>(`/api/staff/learner/${userId}/countersign`, request);
    if (!result.ok) {
      setState("idle");
      return setError(errorMessage(result));
    }
    setState("done");
    // ?countersigned=1 keeps the Week 3 card where it was, with the
    // baseline first and a success line, so the result is on screen.
    router.replace(`${pathname}?countersigned=1`, { scroll: false });
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={countersign}
        disabled={state === "saving" || state === "done"}
        className="nb-btn nb-btn-primary flex min-h-11 w-full items-center justify-center px-5 text-sm sm:w-auto"
      >
        {state === "saving"
          ? "확인하는 중…"
          : state === "done"
            ? "확인했어요"
            : state === "armed"
              ? "한 번 더 누르면 확정돼요"
              : `${learnerName} 님 기준선 확인`}
      </button>
      {state === "armed" && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <p className="text-sm text-gray-700">확인하면 기준선이 고정되고, 지금은 되돌릴 수 없어요.</p>
          <button
            type="button"
            onClick={() => setState("idle")}
            className="min-h-11 px-1 text-sm font-semibold underline underline-offset-4"
          >
            취소
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
