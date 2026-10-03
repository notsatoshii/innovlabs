"use client";

// 학원 path teaser (pre-registration, plan H3): the hours range with its
// caveat, the two biggest buckets, and the recommended module names only.
// Everything else on the schema's result page (what changes, 먼저 준비할 것,
// out-of-scope list, starter session, the 상담 CTA) waits behind the
// registration gate (CLAUDE.md rule 3). No LLM: the numbers come from the
// stored rule-based scoring.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HOURS_BUCKET_LABEL, MODULES, RESULT_COPY } from "@/lib/hagwon/modules";
import { isHagwonResult, type HagwonResult } from "@/lib/hagwon/types";
import { loadResponse } from "@/lib/survey/storage";
import type { SurveyResponse } from "@/lib/survey/types";
import RestartLink from "@/components/survey/RestartLink";

export default function HagwonResultPage() {
  const router = useRouter();
  const [result, setResult] = useState<HagwonResult | null>(null);
  const [response, setResponse] = useState<SurveyResponse | null>(null);

  // sessionStorage is client-only; hydrating state in a mount effect is intentional.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const r = loadResponse();
    if (!r || !isHagwonResult(r.scoring)) {
      router.replace("/hagwon");
      return;
    }
    setResult(r.scoring);
    setResponse(r);
  }, [router]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!result || !response) return null;

  const { hours, recommended, consultFirst, reliabilityFlag } = result;
  const topLabels = hours.top.map((key) => HOURS_BUCKET_LABEL[key]);

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 py-16">
      <p className="nb-accent mb-2 text-sm font-extrabold">진단 완료</p>
      <h1 className="mb-3 text-3xl font-extrabold leading-snug tracking-tight">
        학원 진단 결과가
        <br />
        나왔습니다
      </h1>
      {reliabilityFlag && (
        <p className="mb-4 text-xs leading-relaxed text-gray-500">
          원장님이 직접 답하시면 결과가 더 정확합니다.
        </p>
      )}

      <div className="nb-card mb-6 bg-[var(--nb-lime)] px-5 py-4">
        <p className="text-[15px] font-bold leading-relaxed">
          {hours.high < 1
            ? RESULT_COPY.hoursUnderOne
            : RESULT_COPY.hoursLine(hours.low, hours.high)}
        </p>
        {topLabels.length > 0 && (
          <p className="mt-2 text-sm leading-relaxed">
            시간이 가장 많이 드는 일은 <strong>{topLabels.join(", ")}</strong>입니다.
          </p>
        )}
      </div>

      <p className="nb-accent mb-2 text-xs font-extrabold">추천 모듈</p>
      {consultFirst ? (
        <p className="nb-flat mb-6 px-4 py-3 text-sm leading-relaxed text-gray-700">
          {RESULT_COPY.consultFirst}
        </p>
      ) : (
        <div className="mb-6 flex flex-col gap-3">
          {recommended.map((id) => (
            <div key={id} className="nb-card px-5 py-4">
              <p className="text-[15px] font-bold">{MODULES[id].name}</p>
            </div>
          ))}
        </div>
      )}

      <p className="mb-4 text-sm leading-relaxed text-gray-600">
        등록하시면 전체 결과와 준비 사항, 30분 진단 상담 신청까지 바로 이어집니다.
      </p>
      <Link
        href="/register"
        className="nb-btn nb-btn-primary w-full py-4 text-center text-[15px]"
      >
        등록하고 전체 결과 보기
      </Link>
      <RestartLink response={response} formal />
    </main>
  );
}
