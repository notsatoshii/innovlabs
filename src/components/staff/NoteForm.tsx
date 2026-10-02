"use client";

// 강사 메모 → POST /api/staff/learner/[userId]/note. The note becomes an
// `instructor_note` event with visibility "staff": the learner never sees it.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { errorMessage, postStaff } from "./api";
import { NOTE_MAX } from "./limits";

export default function NoteForm({ userId }: { userId: string }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = note.trim();
    if (!value) return setError("메모 내용을 적어 주세요.");
    setError(null);
    setState("saving");
    const result = await postStaff<{ note: { id: number; created_at: string } }>(
      `/api/staff/learner/${userId}/note`,
      { note: value },
    );
    if (!result.ok) {
      setState("idle");
      return setError(errorMessage(result));
    }
    setNote("");
    setState("saved");
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <label className="sr-only" htmlFor="instructor-note">
        강사 메모
      </label>
      <textarea
        id="instructor-note"
        value={note}
        maxLength={NOTE_MAX}
        rows={4}
        onChange={(e) => {
          setNote(e.target.value);
          setState("idle");
        }}
        placeholder="수업에서 눈에 띈 점이나 다음 주에 챙길 일을 적어 두세요."
        className="nb-input w-full px-4 py-3 text-[15px] leading-relaxed"
      />
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={state === "saving" || !note.trim()}
          className="nb-btn nb-btn-primary px-5 py-2.5 text-sm"
        >
          {state === "saving" ? "남기는 중…" : "메모 남기기"}
        </button>
        <span className="text-xs text-gray-500">
          {note.length} / {NOTE_MAX}자
        </span>
        {state === "saved" && (
          <span role="status" className="text-sm text-gray-500">
            메모를 남겼어요.
          </span>
        )}
        {error && (
          <span role="alert" className="text-sm text-red-600">
            {error}
          </span>
        )}
      </div>
    </form>
  );
}
