"use client";

// "김OO 님 기준선 확인" → POST /api/staff/learner/[userId]/countersign
// (phase-2c C5). The button names the learner and posts the baseline_locked
// event id the page displayed, so a lock the instructor never saw is refused
// (409 stale) instead of stamped. A double tap returns the first stamp.

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CountersignRequest } from "@/lib/courses/types";
import { errorMessage, postStaff } from "./api";
import type { CountersignResult } from "./results";

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
  const [state, setState] = useState<"idle" | "saving" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  const countersign = async () => {
    if (state !== "idle") return;
    setError(null);
    setState("saving");
    const request: CountersignRequest = { baseline_event_id: baselineEventId };
    const result = await postStaff<CountersignResult>(`/api/staff/learner/${userId}/countersign`, request);
    if (!result.ok) {
      setState("idle");
      return setError(errorMessage(result));
    }
    setState("done");
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={countersign}
        disabled={state !== "idle"}
        className="nb-btn nb-btn-primary flex min-h-11 w-full items-center justify-center px-5 text-sm sm:w-auto"
      >
        {state === "saving" ? "확인하는 중…" : state === "done" ? "확인했어요" : `${learnerName} 님 기준선 확인`}
      </button>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
