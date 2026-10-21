"use client";

// "레벨 N이 열리면 알려 주세요": one tap writes the learner's course_interest
// row (POST /api/course/interest, migration 0013). No XP (the rulebook pays
// for evidence only). The done state comes from the server: the page reads
// the row, and the route answers with it, so a reload or a second device
// shows the same thing and a second tap adds nothing.

import { useState } from "react";
import type { InterestResponse } from "@/lib/course/types";
import { postJson } from "./context";

type State = "idle" | "sending" | "joined" | "failed";

/** 가 or 이 after a level number read in Sino-Korean (2 이가, 3 삼이, 10 십이). */
function iGa(n: number): string {
  return [2, 4, 5, 9].includes(n % 10) ? "가" : "이";
}

export function LevelWaitlist({
  course,
  level,
  joined,
}: {
  course: string;
  level: number;
  /** The row exists already (read by the page). */
  joined: boolean;
}) {
  const [state, setState] = useState<State>(joined ? "joined" : "idle");

  const join = async () => {
    setState("sending");
    const res = await postJson<InterestResponse>("/api/course/interest", { course, level });
    setState(res.ok ? "joined" : "failed");
  };

  if (state === "joined") {
    return (
      <p className="c-okline" role="status">
        ✓ 신청했어요. 레벨 {level}
        {iGa(level)} 열리면 알려 드릴게요.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        className="nb-btn nb-btn-primary c-btn"
        disabled={state === "sending"}
        onClick={() => void join()}
      >
        레벨 {level}
        {iGa(level)} 열리면 알려 주세요
      </button>
      {state === "failed" && (
        <p className="c-hint" role="status">
          신청하지 못했어요. 잠시 뒤 다시 눌러 주세요.
        </p>
      )}
    </div>
  );
}
