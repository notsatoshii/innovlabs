"use client";

// Waitlist CTA under the one-pager (v1: no payments — enrollment handled
// manually). Appends a course_waitlist_joined event; shared by /report and
// the 나의 AI 교육 tab so the logic lives once.
//
// The done state is shown only when the event row was written, and it is
// read back from the event log on mount, so a reload does not bring the
// button back and a second tap cannot add a second row (review P1-14).
// The insert is written here rather than through logEventRemote(), which
// swallows every error and so cannot tell this button whether it worked.

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { EVENT_TYPES } from "@/lib/profile/events";
import { loadResponseId } from "@/lib/survey/storage";

type State = "checking" | "idle" | "joining" | "joined" | "failed";

export default function WaitlistCta({
  trackName,
  alreadyJoined,
}: {
  trackName: string;
  /**
   * Pass from a server component that has already read the event log; when
   * omitted, the component looks it up itself on mount.
   */
  alreadyJoined?: boolean;
}) {
  const [state, setState] = useState<State>(
    alreadyJoined === undefined ? "checking" : alreadyJoined ? "joined" : "idle",
  );

  useEffect(() => {
    if (alreadyJoined !== undefined) return;
    let cancelled = false;
    (async () => {
      let joined = false;
      try {
        const supabase = supabaseBrowser();
        const { data: auth } = await supabase.auth.getUser();
        if (auth.user) {
          const { count } = await supabase
            .from("profile_event")
            .select("id", { count: "exact", head: true })
            .eq("user_id", auth.user.id)
            .eq("type", EVENT_TYPES.course_waitlist_joined);
          joined = (count ?? 0) > 0;
        }
      } catch {
        // Lookup failed: leave the button available.
      }
      if (!cancelled) setState(joined ? "joined" : "idle");
    })();
    return () => {
      cancelled = true;
    };
  }, [alreadyJoined]);

  const joinWaitlist = async () => {
    setState("joining");
    try {
      const supabase = supabaseBrowser();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        setState("failed");
        return;
      }
      const { error } = await supabase.from("profile_event").insert({
        user_id: auth.user.id,
        survey_response_id: loadResponseId(),
        type: EVENT_TYPES.course_waitlist_joined,
        data: { track: trackName },
      });
      setState(error ? "failed" : "joined");
    } catch {
      setState("failed");
    }
  };

  if (state === "joined") {
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
    <div>
      <button
        type="button"
        disabled={state === "checking" || state === "joining"}
        onClick={joinWaitlist}
        className="nb-btn nb-btn-primary w-full py-4 text-[15px]"
      >
        {state === "joining" ? "등록 중…" : "다음 기수 대기 등록하기"}
      </button>
      {state === "failed" && (
        <p role="alert" className="mt-3 text-center text-sm text-red-600">
          대기 등록이 저장되지 않았어요. 잠시 후 다시 눌러 주세요.
        </p>
      )}
    </div>
  );
}
