"use client";

// Shared 3-screen waitlist stub for the solopreneur / student paths (spec:
// two single selects + email capture). Phase 1: answers stay in sessionStorage.

import { useState } from "react";
import Link from "next/link";
import type { Option } from "@/lib/survey/questions";
import { appendEvent } from "@/lib/survey/storage";
import { SingleSelect } from "./inputs";

export interface StubScreen {
  field: string;
  title: string;
  options: Option[];
}

export function StubFlow({
  path,
  screens,
  waitlistMessage,
}: {
  path: "solo" | "student";
  screens: [StubScreen, StubScreen];
  waitlistMessage: string;
}) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const submit = () => {
    appendEvent({
      type: "stub_completed",
      data: { path, ...answers, email: email.trim() },
    });
    setDone(true);
  };

  if (done) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center px-6 py-16 text-center">
        <p className="mb-3 text-4xl">✅</p>
        <h1 className="mb-3 text-2xl font-bold text-gray-900">등록되었습니다</h1>
        <p className="mb-10 text-[15px] leading-relaxed text-gray-600">
          오픈 소식을 가장 먼저 알려드릴게요. 기다려 주셔서 감사합니다.
        </p>
        <Link href="/" className="text-sm text-blue-600">
          처음으로 돌아가기
        </Link>
      </main>
    );
  }

  const screen = step < 2 ? screens[step as 0 | 1] : null;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-6 pb-10 pt-4">
      <div className="mb-6 flex items-center gap-3">
        <button
          type="button"
          onClick={() => setStep(Math.max(0, step - 1))}
          aria-label="이전"
          className="-ml-2 rounded-full p-2 text-gray-500 active:bg-gray-100"
        >
          ←
        </button>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-blue-600 transition-all"
            style={{ width: `${((step + 1) / 3) * 100}%` }}
          />
        </div>
        <span className="text-xs tabular-nums text-gray-400">{step + 1}/3</span>
      </div>

      {screen ? (
        <>
          <h1 className="mb-6 text-lg font-bold leading-snug text-gray-900">{screen.title}</h1>
          <SingleSelect
            options={screen.options}
            value={answers[screen.field] ?? null}
            otherText=""
            onSelect={(id) => {
              setAnswers((prev) => ({ ...prev, [screen.field]: id }));
              setTimeout(() => setStep(step + 1), 250);
            }}
          />
        </>
      ) : (
        <>
          <h1 className="mb-3 text-lg font-bold leading-snug text-gray-900">
            오픈 알림 받기
          </h1>
          <p className="mb-6 text-sm leading-relaxed text-gray-500">{waitlistMessage}</p>
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="이메일 주소"
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-[15px] focus:border-blue-600 focus:outline-none"
          />
          <div className="mt-auto pt-6">
            <button
              type="button"
              disabled={!emailValid}
              onClick={submit}
              className="w-full rounded-xl bg-blue-600 py-3.5 text-[15px] font-semibold text-white transition-opacity disabled:opacity-30"
            >
              알림 신청하기
            </button>
          </div>
        </>
      )}
    </main>
  );
}
