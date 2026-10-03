"use client";

// Section 0 — Entry fork: one screen, one question, four doors (the two
// live doors first, the two 준비 중 doors below them).
// Fork click volume is demand data (spec): logged as fork_selected events.
//
// Shared office PCs (review A9): a finished survey stays in this browser for
// 24 hours (backup.ts), and every door used to lead straight back to it. Now,
// when this browser holds a finished survey, the fork says so above the doors
// with a button back to that result. Tapping a door anyway is the signal that
// a different person is starting: the old copy is forgotten (reset.ts) and
// the new survey starts from its first question. Opening /start alone never
// forgets anything, so the same person returning lands one tap from their
// result. The stored survey_response row is never touched.

import { useRouter, useSearchParams } from "next/navigation";
import { ClayRow } from "@/components/ClayRow";
import { Suspense, useEffect, useState } from "react";
import { appendEvent, loadEvents } from "@/lib/survey/storage";
import { logEventRemote } from "@/lib/survey/remote";
import { forgetLocalSurvey, peekLocalResponse } from "@/lib/survey/reset";
import type { Path, SurveyResponse } from "@/lib/survey/types";

const DOORS: {
  path: Path;
  href: string;
  label: string;
  sub: string;
  comingSoon?: boolean;
}[] = [
  {
    path: "employee",
    href: "/survey",
    label: "회사에서 일하고 있어요",
    sub: "직장인 · 공무원 · 공공기관",
  },
  {
    path: "hagwon",
    href: "/hagwon",
    label: "학원을 운영하고 있어요",
    sub: "원장 · 실장 · 학원 관리자",
  },
  {
    path: "solo",
    href: "/solo",
    label: "내 사업을 하고 있어요",
    sub: "자영업 · 1인 사업자 · 프리랜서 · 창업자",
    comingSoon: true,
  },
  {
    path: "student",
    href: "/student",
    label: "학생이거나 취업 준비 중이에요",
    sub: "대학생 · 취업 준비생 · 이직 준비생",
    comingSoon: true,
  },
];

function ForkScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // /app sends signed-in accounts that never finished the survey here (D6).
  const noProfile = searchParams.get("reason") === "no_profile";
  // A finished survey this browser still holds (this tab or the 24 h copy).
  const [previous, setPrevious] = useState<SurveyResponse | null>(null);

  // Browser storage is client-only; reading it in a mount effect is intentional.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setPrevious(peekLocalResponse());
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const go = (door: (typeof DOORS)[number]) => {
    // A new survey on a browser that still holds a finished one: someone
    // else is starting. Forget the old copy first, so the event log below
    // and the survey both start empty.
    if (previous) forgetLocalSurvey();
    // Also to profile_event: the spec's demand data has to outlive the tab
    // (review P1-12). Once per door per tab session, so stepping back to the
    // fork and tapping the same door again is not counted twice. Not
    // awaited: a slow or failed write never holds up the navigation.
    const alreadyLogged = loadEvents().some(
      (e) => e.type === "fork_selected" && e.data?.path === door.path,
    );
    appendEvent({ type: "fork_selected", data: { path: door.path } });
    if (!alreadyLogged) void logEventRemote("fork_selected", { path: door.path });
    // Carry the B2B org code + Q5 pilot override through to the survey.
    const qs = new URLSearchParams();
    const org = searchParams.get("org");
    const q5 = searchParams.get("q5");
    if (org && door.path === "employee") qs.set("org", org);
    if (q5 && door.path === "employee") qs.set("q5", q5);
    router.push(qs.size > 0 ? `${door.href}?${qs.toString()}` : door.href);
  };

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 py-12">
      <ClayRow />
      <h1 className="mb-2 text-3xl font-extrabold leading-snug tracking-tight">
        어떤 상황에서 AI를
        <br />
        활용하고 싶으신가요?
      </h1>
      <p className="mb-8 text-sm text-gray-500">가장 가까운 쪽을 골라 주세요.</p>
      {noProfile && (
        <p className="nb-flat mb-6 px-4 py-3 text-sm leading-relaxed text-gray-700">
          로그인은 됐는데 아직 진단 기록이 없어요. 10분 진단을 마치면 바로
          프로필로 이어드릴게요.
        </p>
      )}
      {previous && (
        <section
          aria-labelledby="previous-result"
          className="nb-card mb-6 bg-[var(--nb-yellow)] px-4 py-4"
        >
          <h2 id="previous-result" className="text-[15px] font-extrabold">
            이 기기에 마친 진단 결과가 남아 있어요
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-gray-800">
            직접 하신 진단이라면 결과를 이어서 보실 수 있어요. 새로 진단하시려면 아래에서
            골라 주세요. 남아 있던 결과는 이 기기에서 지워져요.
          </p>
          <button
            type="button"
            onClick={() =>
              router.push(previous.path === "hagwon" ? "/hagwon/result" : "/teaser")
            }
            className="nb-btn nb-btn-white mt-3 min-h-11 w-full px-4 text-[15px]"
          >
            결과 이어서 보기
          </button>
        </section>
      )}
      <div className="flex flex-col gap-3">
        {DOORS.map((door) => (
          <button
            key={door.path}
            type="button"
            onClick={() => go(door)}
            className="nb-btn nb-btn-white w-full rounded-3xl px-5 py-4 text-left"
          >
            <p className="flex items-center gap-2 text-[15px] font-bold">
              {door.label}
              {door.comingSoon && (
                <span className="nb-sticker">준비 중</span>
              )}
            </p>
            <p className="mt-0.5 text-xs font-normal text-gray-600">{door.sub}</p>
          </button>
        ))}
      </div>
    </main>
  );
}

/** Client part of /start (page.tsx decides between this and the done notice). */
export default function StartFork() {
  return (
    <Suspense>
      <ForkScreen />
    </Suspense>
  );
}
