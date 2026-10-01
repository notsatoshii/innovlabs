"use client";

// "N주차까지 열기" → POST /api/staff/cohort/[id]/open-week. This sets the
// cohort's staff override (open_week); weeks whose date has come stay open
// whatever is chosen here (isWeekOpen in src/lib/courses/types.ts).

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Cohort, OpenWeekRequest } from "@/lib/courses/types";
import { errorMessage, postStaff } from "./api";
import { TOTAL_WEEKS } from "./format";

export default function OpenWeekControl({ cohortId, openWeek }: { cohortId: string; openWeek: number }) {
  const router = useRouter();
  const [value, setValue] = useState(openWeek);
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setState("saving");
    const request: OpenWeekRequest = { open_week: value };
    const result = await postStaff<{ cohort: Cohort }>(`/api/staff/cohort/${cohortId}/open-week`, request);
    if (!result.ok) {
      setState("idle");
      return setError(errorMessage(result));
    }
    setState("saved");
    router.refresh();
  };

  return (
    <form onSubmit={save} className="flex flex-wrap items-center gap-3">
      <label className="sr-only" htmlFor="open-week">
        미리 열어 둘 주차
      </label>
      <select
        id="open-week"
        value={value}
        onChange={(e) => {
          setValue(Number(e.target.value));
          setState("idle");
        }}
        className="nb-input px-4 py-2.5 text-[15px]"
      >
        <option value={0}>미리 열지 않기 (날짜대로만)</option>
        {Array.from({ length: TOTAL_WEEKS }, (_, i) => i + 1).map((week) => (
          <option key={week} value={week}>
            {week}주차까지 열기
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={state === "saving" || value === openWeek}
        className="nb-btn nb-btn-primary px-5 py-2.5 text-sm"
      >
        {state === "saving" ? "저장 중..." : "저장하기"}
      </button>
      {state === "saved" && (
        <span role="status" className="text-sm text-gray-500">
          저장했어요.
        </span>
      )}
      {error && (
        <span role="alert" className="text-sm text-red-600">
          {error}
        </span>
      )}
    </form>
  );
}
