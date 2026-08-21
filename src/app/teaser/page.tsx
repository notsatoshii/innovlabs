"use client";

// Teaser screen (pre-registration, no LLM — spec): track name + one-liner +
// computed stat from the respondent's own Q5 answers. When the score margin is
// under 1.5×, the respondent chooses between the top two tracks; skipping
// falls back to 문서·행정 (spec default). The choice is logged.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TRACKS } from "@/lib/survey/tracks";
import { weeklyHoursForTrack } from "@/lib/survey/scoring";
import type { SurveyResponse, TaskHours, TrackId } from "@/lib/survey/types";
import {
  appendEvent,
  loadAssignedTrack,
  loadResponse,
  saveAssignedTrack,
} from "@/lib/survey/storage";
import { logEventRemote } from "@/lib/survey/remote";

export default function TeaserPage() {
  const router = useRouter();
  const [response, setResponse] = useState<SurveyResponse | null>(null);
  const [track, setTrack] = useState<TrackId | null>(null);
  const [ready, setReady] = useState(false);

  // sessionStorage is client-only; hydrating state in a mount effect is intentional.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const r = loadResponse();
    if (!r || !r.scoring) {
      router.replace("/start");
      return;
    }
    setResponse(r);
    const saved = loadAssignedTrack() as TrackId | null;
    if (saved) {
      setTrack(saved);
    } else if (r.scoring.decision.type === "assigned") {
      setTrack(r.scoring.decision.track);
      saveAssignedTrack(r.scoring.decision.track);
    }
    setReady(true);
  }, [router]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!ready || !response?.scoring) return null;

  const choose = (t: TrackId, via: "user_choice" | "skip_default") => {
    saveAssignedTrack(t);
    appendEvent({ type: "track_assigned", data: { track: t, via } });
    void logEventRemote("track_assigned", { track: t, via });
    setTrack(t);
  };

  // --- Top-two choice screen ---
  if (!track && response.scoring.decision.type === "choice") {
    const [first, second] = response.scoring.decision.topTwo;
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center px-6 py-16">
        <p className="nb-accent mb-2 text-sm font-extrabold">진단 완료</p>
        <h1 className="mb-2 text-3xl font-extrabold leading-snug tracking-tight">
          두 가지 트랙이 모두
          <br />잘 맞는 것으로 나왔어요
        </h1>
        <p className="mb-8 text-sm text-gray-500">
          더 끌리는 쪽을 골라 주세요. 나중에 변경할 수 있어요.
        </p>
        <div className="flex flex-col gap-3">
          {[first, second].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => choose(t, "user_choice")}
              className="nb-btn nb-btn-white w-full px-5 py-4 text-left"
            >
              <p className="text-[15px] font-bold">{TRACKS[t].name}</p>
              <p className="mt-1 text-sm leading-relaxed text-gray-500">{TRACKS[t].oneLiner}</p>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => choose("docs_admin", "skip_default")}
          className="mt-4 w-full py-2 text-sm text-gray-400"
        >
          잘 모르겠어요, 추천해 주세요
        </button>
      </main>
    );
  }

  if (!track) return null;

  // --- Teaser result ---
  const weekly = weeklyHoursForTrack(
    response.answers.task_hours as TaskHours,
    track,
  );
  const yearly = Math.round(weekly * 52);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center px-6 py-16">
      <p className="nb-accent mb-2 text-sm font-extrabold">나에게 맞는 트랙</p>
      <h1 className="mb-3 text-4xl font-extrabold leading-tight tracking-tight">
        {TRACKS[track].name}
      </h1>
      <p className="mb-8 text-[15px] leading-relaxed text-gray-600">
        {TRACKS[track].oneLiner}
      </p>

      {weekly > 0 && (
        <div className="nb-card mb-8 bg-[var(--nb-pink)] px-5 py-4">
          <p className="text-sm leading-relaxed">
            지금 이 영역에 <strong>주당 약 {weekly}시간</strong>을 쓰고 계세요.
            <br />
            1년이면 <strong>약 {yearly}시간</strong>입니다.
          </p>
        </div>
      )}

      <p className="mb-4 text-sm leading-relaxed text-gray-500">
        등록하시면 내 업무 기준으로 작성된 맞춤 리포트를 받아보실 수 있어요.
      </p>
      <Link
        href="/register"
        className="nb-btn nb-btn-primary w-full py-4 text-center text-[15px]"
      >
        무료 등록하고 맞춤 리포트 받기
      </Link>
    </main>
  );
}
