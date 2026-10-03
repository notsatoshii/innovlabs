"use client";

// 트랙 확정 → POST /api/staff/learner/[userId]/track (phase-2c D2). One select
// and one save per learner. Prefilled with the newest confirmation, or with
// the survey track when nothing is confirmed yet; the prefill is only a
// suggestion until it is saved.

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import type { TrackConfirmRequest } from "@/lib/courses/types";
import type { TrackCode } from "@/lib/resources/types";
import { errorMessage, postStaff } from "./api";
import { CONFIRM_TRACKS } from "./format";
import type { TrackConfirmResult } from "./results";

export default function TrackConfirmControl({
  userId,
  learnerName,
  confirmed,
  suggested,
}: {
  userId: string;
  learnerName: string;
  /** The newest confirmed track, or null. */
  confirmed: TrackCode | null;
  /** The survey track as a code, used as the prefill when nothing is confirmed. */
  suggested: TrackCode | null;
}) {
  const router = useRouter();
  const selectId = useId();
  const [value, setValue] = useState<TrackCode | "">(confirmed ?? suggested ?? "");
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value) return setError("확정할 트랙을 골라 주세요.");
    setError(null);
    setState("saving");
    const request: TrackConfirmRequest = { track: value };
    const result = await postStaff<TrackConfirmResult>(`/api/staff/learner/${userId}/track`, request);
    if (!result.ok) {
      setState("idle");
      return setError(errorMessage(result));
    }
    setState("saved");
    router.refresh();
  };

  return (
    <form onSubmit={save} className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor={selectId}>
          {learnerName} 님 확정 트랙
        </label>
        <select
          id={selectId}
          value={value}
          onChange={(e) => {
            setValue(e.target.value as TrackCode | "");
            setState("idle");
            setError(null);
          }}
          className="nb-input min-h-11 min-w-0 flex-1 px-3 py-2 text-[15px] sm:flex-none"
        >
          {!value && <option value="">트랙 고르기</option>}
          {CONFIRM_TRACKS.map((t) => (
            <option key={t.code} value={t.code}>
              {t.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={state === "saving" || !value || value === confirmed}
          className="nb-btn nb-btn-white min-h-11 shrink-0 px-4 text-sm"
        >
          {state === "saving" ? "저장 중…" : "확정"}
        </button>
      </div>
      {state === "saved" && (
        <p role="status" className="text-xs text-gray-500">
          확정했어요.
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </form>
  );
}
