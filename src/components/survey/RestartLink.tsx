"use client";

// "처음부터 다시 하기" under a teaser (review A9). One quiet text button; the
// first tap asks, the second forgets this browser's survey (reset.ts) and
// goes back to the fork. The stored survey_response row is never touched.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { forgetLocalSurvey } from "@/lib/survey/reset";
import type { SurveyResponse } from "@/lib/survey/types";

export default function RestartLink({
  response,
  formal = false,
}: {
  /** The response being forgotten: its org code and Q5 variant carry over. */
  response: SurveyResponse;
  /** 합니다체 on the 학원 path, 해요체 elsewhere. */
  formal?: boolean;
}) {
  const router = useRouter();
  const [asking, setAsking] = useState(false);

  const restart = () => {
    forgetLocalSurvey();
    // Same entry link as before (B2B org code, Q5 pilot variant), so the next
    // person on this PC lands in the same survey, from the first question.
    const qs = new URLSearchParams();
    if (response.path === "employee") {
      if (response.org_code) qs.set("org", response.org_code);
      if (response.q5_variant) qs.set("q5", response.q5_variant);
    }
    router.replace(qs.size > 0 ? `/start?${qs.toString()}` : "/start");
  };

  if (!asking) {
    return (
      <button
        type="button"
        onClick={() => setAsking(true)}
        className="mt-3 min-h-11 w-full text-sm font-semibold text-gray-600 underline underline-offset-4"
      >
        처음부터 다시 하기
      </button>
    );
  }

  return (
    <div role="group" aria-labelledby="restart-question" className="nb-flat mt-4 px-4 py-4">
      <p id="restart-question" className="text-sm leading-relaxed text-gray-800">
        {formal
          ? "이 결과를 이 기기에서 지우고 처음부터 다시 진단하시겠습니까?"
          : "이 결과를 이 기기에서 지우고 처음부터 다시 진단할까요?"}
      </p>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={restart}
          className="nb-btn nb-btn-white min-h-11 flex-1 px-3 text-sm"
        >
          지우고 다시 하기
        </button>
        <button
          type="button"
          autoFocus
          onClick={() => setAsking(false)}
          className="min-h-11 flex-1 px-3 text-sm font-semibold text-gray-600"
        >
          취소
        </button>
      </div>
    </div>
  );
}
