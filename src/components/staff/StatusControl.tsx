"use client";

// Cohort status → POST /api/staff/cohort/[id]/status. "종료" retires the join
// code: the code route refuses a finished cohort.

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Cohort } from "@/lib/courses/types";
import { errorMessage, postStaff } from "./api";

const OPTIONS: { value: Cohort["status"]; label: string }[] = [
  { value: "planned", label: "시작 전" },
  { value: "running", label: "진행 중" },
  { value: "done", label: "종료 (수강 코드 마감)" },
];

export default function StatusControl({ cohortId, status }: { cohortId: string; status: Cohort["status"] }) {
  const router = useRouter();
  const [value, setValue] = useState(status);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const result = await postStaff<{ cohort: Cohort }>(`/api/staff/cohort/${cohortId}/status`, { status: value });
    setSaving(false);
    if (!result.ok) return setError(errorMessage(result));
    router.refresh();
  };

  return (
    <form onSubmit={save} className="flex flex-wrap items-center gap-3">
      <label className="sr-only" htmlFor="cohort-status">
        코호트 상태
      </label>
      <select
        id="cohort-status"
        value={value}
        onChange={(e) => setValue(e.target.value as Cohort["status"])}
        className="nb-input px-4 py-2.5 text-[15px]"
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={saving || value === status}
        className="nb-btn nb-btn-white px-5 py-2.5 text-sm"
      >
        {saving ? "저장 중..." : "상태 바꾸기"}
      </button>
      {error && <p className="w-full text-sm text-red-500">{error}</p>}
    </form>
  );
}
