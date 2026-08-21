"use client";

// Personalized track one-pager (Phase 3), followed by the waitlist CTA —
// the final step of the v1 funnel. Auth-gated; content comes from
// POST /api/one-pager (cached on the profile after first generation).

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { logEventRemote } from "@/lib/survey/remote";
import type { OnePager } from "@/lib/onepager/generate";

type State =
  | { status: "loading" }
  | { status: "error"; code: string }
  | { status: "ready"; trackName: string; onePager: OnePager };

export default function ReportPage() {
  const router = useRouter();
  const [state, setState] = useState<State>({ status: "loading" });
  const [joined, setJoined] = useState(false);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabaseBrowser().auth.getUser();
      if (!data.user) {
        router.replace("/register");
        return;
      }
      const res = await fetch("/api/one-pager", { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setState({ status: "error", code: body.error ?? String(res.status) });
        return;
      }
      const body = await res.json();
      setState({ status: "ready", trackName: body.trackName, onePager: body.onePager });
    })();
  }, [router]);

  if (state.status === "loading") {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col items-center justify-center px-6 py-16 text-center">
        <p className="mb-3 text-sm font-medium text-blue-600">맞춤 리포트</p>
        <h1 className="mb-2 text-xl font-bold text-gray-900">
          내 업무 기준으로 리포트를 만들고 있어요
        </h1>
        <p className="text-sm text-gray-500">최대 30초 정도 걸릴 수 있어요.</p>
      </main>
    );
  }

  if (state.status === "error") {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center px-6 py-16">
        <h1 className="mb-3 text-xl font-bold text-gray-900">
          리포트를 준비하지 못했어요
        </h1>
        <p className="mb-8 text-sm leading-relaxed text-gray-500">
          {state.code === "generation_unavailable"
            ? "리포트 생성 기능을 준비 중입니다. 준비되는 대로 이메일로 알려드릴게요."
            : "일시적인 문제가 발생했어요. 잠시 후 다시 시도해 주세요."}
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="w-full rounded-xl bg-blue-600 py-3.5 text-[15px] font-semibold text-white"
        >
          다시 시도하기
        </button>
      </main>
    );
  }

  const { trackName, onePager } = state;

  const joinWaitlist = async () => {
    setJoining(true);
    await logEventRemote("course_waitlist_joined", { track: trackName });
    setJoining(false);
    setJoined(true);
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-6 pb-16 pt-10">
      <p className="mb-2 text-sm font-medium text-blue-600">나의 맞춤 리포트</p>
      <h1 className="mb-6 text-2xl font-bold leading-snug text-gray-900">{trackName}</h1>

      {/* Slot 1 — Mirror */}
      <section className="mb-8">
        <h2 className="mb-2 text-sm font-semibold text-gray-400">지금 나의 업무</h2>
        <p className="text-[15px] leading-relaxed text-gray-800">{onePager.mirror}</p>
      </section>

      {/* Slot 2 — Week mapping */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold text-gray-400">4주 동안 이렇게 배워요</h2>
        <div className="flex flex-col gap-3">
          {onePager.weeks.map((w) => (
            <div key={w.week} className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="mb-1 text-xs font-semibold text-blue-600">{w.week}주차</p>
              <p className="mb-1 text-[15px] font-semibold text-gray-900">{w.title}</p>
              <p className="text-sm leading-relaxed text-gray-600">{w.connection}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Slot 3 — Hedged outcome */}
      <section className="mb-8 rounded-2xl bg-blue-50 px-5 py-4">
        <h2 className="mb-2 text-sm font-semibold text-blue-700">3개월 뒤 기대할 수 있는 변화</h2>
        <p className="text-[15px] leading-relaxed text-blue-900">{onePager.outcome}</p>
      </section>

      {/* Slot 4 — Aspirational close */}
      <section className="mb-10">
        <p className="text-[15px] leading-relaxed text-gray-800">{onePager.closing}</p>
      </section>

      {/* Waitlist CTA (v1: no payments — enrollment handled manually) */}
      {joined ? (
        <div className="rounded-2xl bg-gray-50 px-5 py-6 text-center">
          <p className="mb-1 text-[15px] font-semibold text-gray-900">
            대기 등록이 완료되었습니다
          </p>
          <p className="text-sm text-gray-500">
            다음 기수 모집이 시작되면 가장 먼저 알려드릴게요.
          </p>
        </div>
      ) : (
        <button
          type="button"
          disabled={joining}
          onClick={joinWaitlist}
          className="w-full rounded-xl bg-blue-600 py-4 text-[15px] font-semibold text-white transition-opacity disabled:opacity-50"
        >
          {joining ? "등록 중..." : "다음 기수 수강 대기 등록하기"}
        </button>
      )}
    </main>
  );
}
