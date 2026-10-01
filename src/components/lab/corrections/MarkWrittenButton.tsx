"use client";

// "I have written this one into the harness": the log is append-only, so the
// same line is posted again with rule_written true, and the list (which shows
// identical lines once) then counts it as written.

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ApiResult, CorrectionInput } from "@/lib/courses/types";

export default function MarkWrittenButton({ correction }: { correction: CorrectionInput }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "sending" | "failed">("idle");

  const mark = async () => {
    setState("sending");
    try {
      const res = await fetch("/api/artifacts/correction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...correction, rule_written: true }),
      });
      const result = (await res.json().catch(() => null)) as ApiResult<unknown> | null;
      if (res.ok && result?.ok) {
        router.refresh();
        return; // stays "sending" until the refreshed list drops this button
      }
    } catch {
      // Network failure: reported below.
    }
    setState("failed");
  };

  return (
    <>
      <button
        type="button"
        onClick={mark}
        disabled={state === "sending"}
        className="min-h-11 px-1 text-sm font-bold underline underline-offset-4 disabled:opacity-50"
      >
        {state === "sending" ? "표시하는 중…" : "이미 규칙으로 적었어요"}
      </button>
      {state === "failed" && (
        <p role="alert" className="w-full text-sm font-bold text-red-600">
          표시하지 못했어요. 잠시 뒤 다시 눌러 주세요.
        </p>
      )}
    </>
  );
}
