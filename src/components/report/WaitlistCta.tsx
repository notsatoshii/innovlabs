"use client";

// Waitlist CTA under the one-pager (v1: no payments — enrollment handled
// manually). Appends a course_waitlist_joined event; shared by /report and
// the 나의 AI 교육 tab so the logic lives once.

import { useState } from "react";
import { logEventRemote } from "@/lib/survey/remote";

export default function WaitlistCta({ trackName }: { trackName: string }) {
  const [joined, setJoined] = useState(false);
  const [joining, setJoining] = useState(false);

  const joinWaitlist = async () => {
    setJoining(true);
    await logEventRemote("course_waitlist_joined", { track: trackName });
    setJoining(false);
    setJoined(true);
  };

  if (joined) {
    return (
      <div className="nb-card px-5 py-6 text-center">
        <p className="mb-1 text-[15px] font-bold">대기 등록이 완료됐어요</p>
        <p className="text-sm text-gray-500">
          다음 기수 모집이 시작되면 가장 먼저 알려드릴게요.
        </p>
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={joining}
      onClick={joinWaitlist}
      className="nb-btn nb-btn-primary w-full py-4 text-[15px]"
    >
      {joining ? "등록 중..." : "다음 기수 대기 등록하기"}
    </button>
  );
}
