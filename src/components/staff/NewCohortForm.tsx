"use client";

// 새 코호트 form → POST /api/staff/cohort. The server generates the join code;
// on success the list above is refreshed and the new code is shown here.

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Cohort, CreateCohortRequest } from "@/lib/courses/types";
import { errorMessage, postStaff } from "./api";
import { COHORT_TRACKS, isCohortTrack } from "./format";
import { COHORT_NAME_MAX, COHORT_NOTE_MAX } from "./limits";

const INPUT = "nb-input w-full px-4 py-3 text-[15px]";

export default function NewCohortForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [track, setTrack] = useState("");
  const [startsOn, setStartsOn] = useState("");
  const [scheduleNote, setScheduleNote] = useState("");
  const [venue, setVenue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<Cohort | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreated(null);
    if (!name.trim()) return setError("코호트 이름을 적어 주세요.");
    if (!isCohortTrack(track)) return setError("트랙을 골라 주세요.");
    setError(null);
    setBusy(true);
    const request: CreateCohortRequest = {
      name: name.trim(),
      track_code: track,
      starts_on: startsOn || null,
      schedule_note: scheduleNote.trim() || null,
      venue: venue.trim() || null,
    };
    const result = await postStaff<{ cohort: Cohort }>("/api/staff/cohort", request);
    setBusy(false);
    if (!result.ok) return setError(errorMessage(result));
    setCreated(result.data.cohort);
    setName("");
    setTrack("");
    setStartsOn("");
    setScheduleNote("");
    setVenue("");
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Field label="코호트 이름" required>
          <input
            type="text"
            value={name}
            maxLength={COHORT_NAME_MAX}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 2026년 10월 화요일 저녁반"
            className={INPUT}
          />
        </Field>
        <Field label="트랙" required>
          <select value={track} onChange={(e) => setTrack(e.target.value)} className={INPUT}>
            <option value="">트랙을 골라 주세요</option>
            {COHORT_TRACKS.map((t) => (
              <option key={t.code} value={t.code}>
                {t.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="시작일" hint="넣어 두면 그날부터 매주 한 주차씩 저절로 열려요.">
          <input type="date" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} className={INPUT} />
        </Field>
        <Field label="수업 일정">
          <input
            type="text"
            value={scheduleNote}
            maxLength={COHORT_NOTE_MAX}
            onChange={(e) => setScheduleNote(e.target.value)}
            placeholder="예: 매주 화요일 19:00–21:00"
            className={INPUT}
          />
        </Field>
        <Field label="장소">
          <input
            type="text"
            value={venue}
            maxLength={COHORT_NOTE_MAX}
            onChange={(e) => setVenue(e.target.value)}
            placeholder="예: 역삼역 근처 강의실"
            className={INPUT}
          />
        </Field>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={busy} className="nb-btn nb-btn-primary px-5 py-2.5 text-sm">
          {busy ? "만드는 중…" : "코호트 만들기"}
        </button>
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
        {created && (
          <p role="status" className="text-sm text-gray-700">
            ‘{created.name}’ 코호트를 만들었어요. 참여 코드는{" "}
            <strong className="font-mono tracking-widest">{created.code}</strong>
            예요.
          </p>
        )}
      </div>
    </form>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-bold text-gray-800">
        {label}
        {required ? (
          <span className="ml-1 text-[var(--nb-pink-deep)]">*</span>
        ) : (
          <span className="ml-1 text-xs font-medium text-gray-600">선택</span>
        )}
      </span>
      {children}
      {hint && <span className="mt-1.5 block text-xs leading-relaxed text-gray-500">{hint}</span>}
    </label>
  );
}
