"use client";

// 30분 진단 상담 CTA under the 학원 result (phase-hagwon.md H6). One click
// writes an `inquiry` row (source app-hagwon, interest training) and then a
// consult_requested event. Success is remembered in sessionStorage so a
// reload does not post twice; a failed insert keeps the button for a retry.

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { logEventRemote } from "@/lib/survey/remote";
import { EVENT_TYPES, type ConsultRequestedPayload } from "@/lib/profile/events";
import type { HagwonResult } from "@/lib/hagwon/types";
import { MODULES, RESULT_COPY } from "@/lib/hagwon/modules";

const DONE_KEY = "hagwon_consult_requested_v1";
const MESSAGE_MAX = 4000; // same cap as POST /api/inquiry

interface Props {
  displayName: string;
  /** 학원명 (user_profile.company_name). */
  companyName: string | null;
  jobTitle: string | null;
  email: string;
  result: HagwonResult;
}

type State = "idle" | "sending" | "done" | "error";

/** One line the team reads in the inquiry table: modules, hours, Q12. */
function summary(result: HagwonResult): string {
  const modules =
    result.recommended.map((id) => `${id} ${MODULES[id].name}`).join(", ") || "없음";
  const hours = `주 ${result.hours.low}–${result.hours.high}시간`;
  const goal = result.successGoal ?? "없음";
  return `[학원 진단] 추천 모듈: ${modules}; ${hours}; 목표: ${goal}`.slice(0, MESSAGE_MAX);
}

export default function ConsultCta({ displayName, companyName, jobTitle, email, result }: Props) {
  const [state, setState] = useState<State>("idle");

  // A request sent earlier in this browser session stays "done".
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      if (sessionStorage.getItem(DONE_KEY) === "1") setState("done");
    } catch {
      // storage blocked: stay idle
    }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const request = async () => {
    setState("sending");
    try {
      const { error } = await supabaseBrowser().from("inquiry").insert({
        name: displayName,
        company: companyName?.trim() || "미입력",
        role: jobTitle?.trim() || "원장",
        email,
        interest: "training",
        team_size: null,
        message: summary(result),
        locale: "ko",
        source: "app-hagwon",
        user_agent: typeof navigator === "undefined" ? null : navigator.userAgent.slice(0, 300),
      });
      if (error) {
        setState("error");
        return;
      }
    } catch {
      setState("error");
      return;
    }
    await logEventRemote(EVENT_TYPES.consult_requested, {
      version: 1,
      path: "hagwon",
      modules: result.recommended,
      hours: [result.hours.low, result.hours.high],
    } satisfies ConsultRequestedPayload);
    try {
      sessionStorage.setItem(DONE_KEY, "1");
    } catch {
      // non-fatal: a reload may show the button again
    }
    setState("done");
  };

  if (state === "done") {
    return (
      <div className="nb-card px-5 py-6 text-center">
        <p className="mb-1 text-[15px] font-bold">신청을 받았습니다.</p>
        <p className="text-sm text-gray-500">영업일 기준 이틀 안에 연락드리겠습니다.</p>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        disabled={state === "sending"}
        onClick={request}
        className="nb-btn nb-btn-primary w-full py-4 text-[15px]"
      >
        {state === "sending" ? "신청 중..." : RESULT_COPY.cta}
      </button>
      {state === "error" && (
        <p className="mt-2 text-sm text-red-500">
          신청을 보내지 못했습니다. 잠시 후 다시 시도해 주시기 바랍니다.
        </p>
      )}
    </div>
  );
}
