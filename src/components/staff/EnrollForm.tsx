"use client";

// Add a learner to the cohort by the email they registered with →
// POST /api/staff/cohort/[id]/enroll. For people who could not type the code.

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Enrollment, StaffEnrollRequest } from "@/lib/courses/types";
import { errorMessage, postStaff } from "./api";

interface EnrollResponse {
  enrollment: Enrollment;
  learner: { user_id: string; display_name: string | null };
}

export default function EnrollForm({ cohortId }: { cohortId: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdded(null);
    const value = email.trim();
    if (!value) return setError("수강생이 가입할 때 쓴 이메일을 적어 주세요.");
    setError(null);
    setBusy(true);
    const request: StaffEnrollRequest = { email: value };
    const result = await postStaff<EnrollResponse>(`/api/staff/cohort/${cohortId}/enroll`, request);
    setBusy(false);
    if (!result.ok) return setError(errorMessage(result));
    setAdded(result.data.learner.display_name?.trim() || value);
    setEmail("");
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <label className="sr-only" htmlFor="enroll-email">
          수강생 이메일
        </label>
        <input
          id="enroll-email"
          type="email"
          inputMode="email"
          autoComplete="off"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="수강생이 가입한 이메일"
          className="nb-input min-w-0 flex-1 basis-64 px-4 py-2.5 text-[15px]"
        />
        <button type="submit" disabled={busy} className="nb-btn nb-btn-primary px-5 py-2.5 text-sm">
          {busy ? "추가하는 중…" : "명단에 추가하기"}
        </button>
      </div>
      {error && (
        <p role="alert" className="text-sm leading-relaxed text-red-600">
          {error}
        </p>
      )}
      {added && (
        <p role="status" className="text-sm text-gray-700">
          {added} 님을 명단에 추가했어요.
        </p>
      )}
    </form>
  );
}
