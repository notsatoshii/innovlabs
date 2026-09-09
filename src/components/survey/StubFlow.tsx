"use client";

// Shared 3-screen waitlist stub for the solopreneur / student paths (spec:
// two single selects + email capture). Phase 1: answers stay in sessionStorage.

import { useState } from "react";
import Link from "next/link";
import type { Option } from "@/lib/survey/questions";
import { appendEvent } from "@/lib/survey/storage";
import { insertWaitlist } from "@/lib/survey/remote";
import { SingleSelect } from "./inputs";

export interface StubScreen {
  field: string;
  title: string;
  options: Option[];
}

export function StubFlow({
  path,
  audience,
  screens,
  waitlistMessage,
}: {
  path: "solo" | "student";
  /** e.g. "1인 사업자" / "학생과 취업 준비생" — rendered as "{audience}용 진단" on the intro. */
  audience: string;
  screens: [StubScreen, StubScreen];
  waitlistMessage: string;
}) {
  const [started, setStarted] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [done, setDone] = useState(false);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const submit = async () => {
    setBusy(true);
    setFailed(false);
    const ok = await insertWaitlist({ path, email: email.trim(), answers });
    setBusy(false);
    if (!ok) {
      setFailed(true);
      return;
    }
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
        <h1 className="mb-3 text-2xl font-extrabold">신청이 완료됐어요</h1>
        <p className="mb-10 text-[15px] leading-relaxed text-gray-600">
          열리는 대로 가장 먼저 알려드릴게요. 기다려 주셔서 감사합니다.
        </p>
        <Link href="/" className="nb-accent text-sm font-bold underline">
          처음으로 돌아가기
        </Link>
      </main>
    );
  }

  // Coming-soon intro: sets expectations before any questions are asked.
  if (!started) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center px-6 py-16">
        <span className="nb-sticker mb-4 w-fit">준비 중</span>
        <h1 className="mb-3 text-3xl font-extrabold leading-snug tracking-tight">
          {audience}용 진단은
          <br />지금 준비 중이에요
        </h1>
        <p className="mb-8 text-[15px] leading-relaxed text-gray-600">
          지금은 직장인 진단만 먼저 열려 있어요. 이메일을 남겨 두시면 열리는 날
          바로 알려드릴게요.
        </p>
        <button
          type="button"
          onClick={() => setStarted(true)}
          className="nb-btn nb-btn-primary mb-2 w-full py-3.5 text-[15px]"
        >
          오픈 알림 받기 (1분)
        </button>
        <Link href="/start" className="w-full py-2.5 text-center text-sm text-gray-400">
          돌아가기
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
          onClick={() => (step === 0 ? setStarted(false) : setStep(step - 1))}
          aria-label="이전"
          className="-ml-2 rounded-full p-2 text-gray-500 active:bg-gray-100"
        >
          ←
        </button>
        <div className="nb-track h-3.5 flex-1">
          <div
            className="nb-fill"
            style={{ width: `${((step + 1) / 3) * 100}%` }}
          />
        </div>
        <span className="text-xs tabular-nums text-gray-400">{step + 1}/3</span>
      </div>

      {screen ? (
        <>
          <h1 className="mb-6 text-xl font-extrabold leading-snug">{screen.title}</h1>
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
          <h1 className="mb-3 text-xl font-extrabold leading-snug">
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
            className="nb-input w-full px-4 py-3 text-[15px]"
          />
          <label className="mt-4 flex items-start gap-2.5 text-xs leading-relaxed text-gray-600">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0"
            />
            <span>
              오픈 알림과 AI 활용 소식(뉴스레터)을 받기 위해 이메일을 수집·이용하는
              데 동의합니다. 수신 거부와 삭제는 언제든 요청하실 수 있습니다. (필수)
            </span>
          </label>
          {failed && (
            <p className="mt-3 text-xs text-red-500">
              전송이 안 됐어요. 잠시 후 다시 시도해 주세요. 계속 안 되면 새로고침한
              뒤 다시 눌러 주세요.
            </p>
          )}
          <div className="mt-auto pt-6">
            <button
              type="button"
              disabled={!emailValid || !consent || busy}
              onClick={submit}
              className="nb-btn nb-btn-primary w-full py-3.5 text-[15px]"
            >
              {busy ? "신청 중..." : "알림 신청하기"}
            </button>
          </div>
        </>
      )}
    </main>
  );
}
