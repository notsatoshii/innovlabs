"use client";

// Shared 3-screen waitlist stub for the solopreneur / student paths (spec:
// two single selects + email capture). The row goes to public.waitlist; the
// done screen is shown only after that insert succeeded.

import { useState } from "react";
import Link from "next/link";
import { COMPACT, ClayRow } from "@/components/ClayRow";
import type { Option } from "@/lib/survey/questions";
import { appendEvent } from "@/lib/survey/storage";
import { supabaseBrowser } from "@/lib/supabase/client";
import { SingleSelect } from "./inputs";

export interface StubScreen {
  field: string;
  title: string;
  options: Option[];
}

/**
 * Version of the consent text on the email screen below. Separate from the
 * registration consent version: this text changed on 2026-10-01, when the
 * newsletter became its own optional box (개인정보보호법 §22: consent to
 * marketing must not be bundled into a required consent).
 */
const WAITLIST_CONSENT_VERSION = "waitlist-2026-10-v1";

/**
 * Insert the waitlist row with the newsletter choice as ticked. Written here
 * rather than through insertWaitlist() in lib/survey/remote.ts, which records
 * newsletter_consent: true for everyone.
 */
async function saveWaitlistEntry(entry: {
  path: "solo" | "student";
  email: string;
  answers: Record<string, string>;
  newsletterConsent: boolean;
}): Promise<boolean> {
  try {
    const { error } = await supabaseBrowser().from("waitlist").insert({
      path: entry.path,
      email: entry.email,
      answers: entry.answers,
      newsletter_consent: entry.newsletterConsent,
      consent_version: WAITLIST_CONSENT_VERSION,
    });
    // 23505 = duplicate (path, email): the person is already on the list.
    if (error && error.code !== "23505") return false;
    return true;
  } catch {
    return false;
  }
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
  // Two separate consents: the launch notice is required to join the list,
  // the newsletter is optional and off unless the person ticks it.
  const [noticeConsent, setNoticeConsent] = useState(false);
  const [newsletterConsent, setNewsletterConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [done, setDone] = useState(false);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const submit = async () => {
    setBusy(true);
    setFailed(false);
    const ok = await saveWaitlistEntry({
      path,
      email: email.trim(),
      answers,
      newsletterConsent,
    });
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
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 py-16 text-center">
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
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 py-16">
        <ClayRow items={COMPACT} />
        <span className="nb-sticker mb-4 w-fit">준비 중</span>
        <h1 className="mb-3 text-3xl font-extrabold leading-snug tracking-tight">
          {audience}용 진단은
          <br />지금 준비 중이에요
        </h1>
        <p className="mb-8 text-[15px] leading-relaxed text-gray-600">
          지금은 직장인 진단과 학원 진단이 먼저 열려 있어요. 이메일을 남겨 두시면
          열리는 대로 알려드릴게요.
        </p>
        <button
          type="button"
          onClick={() => setStarted(true)}
          className="nb-btn nb-btn-primary mb-2 w-full py-3.5 text-[15px]"
        >
          오픈 알림 받기 (1분)
        </button>
        <Link href="/start" className="w-full py-2.5 text-center text-sm text-gray-500">
          돌아가기
        </Link>
      </main>
    );
  }

  const screen = step < 2 ? screens[step as 0 | 1] : null;

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-6 pb-10 pt-4">
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
        <span className="text-xs tabular-nums text-gray-600">{step + 1}/3</span>
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
            maxLength={254}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="이메일 주소"
            aria-label="이메일 주소"
            className="nb-input w-full px-4 py-3 text-base"
          />
          <label className="mt-4 flex items-start gap-2.5 text-xs leading-relaxed text-gray-600">
            <input
              type="checkbox"
              checked={noticeConsent}
              onChange={(e) => setNoticeConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0"
            />
            <span>
              <strong className="text-[var(--nb-ink)]">(필수)</strong> 오픈 알림을 보내
              드리기 위해 이메일 주소를 수집·이용하는 데 동의합니다. 삭제는 언제든
              요청하실 수 있습니다.
            </span>
          </label>
          <label className="mt-3 flex items-start gap-2.5 text-xs leading-relaxed text-gray-600">
            <input
              type="checkbox"
              checked={newsletterConsent}
              onChange={(e) => setNewsletterConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0"
            />
            <span>
              <strong className="text-[var(--nb-ink)]">(선택)</strong> AI 활용
              소식(뉴스레터)도 이메일로 받겠습니다. 동의하지 않으셔도 오픈 알림은
              받으실 수 있고, 수신 거부는 언제든 하실 수 있습니다.
            </span>
          </label>
          {failed && (
            <p role="alert" className="mt-3 text-xs text-red-600">
              신청이 저장되지 않았어요. 입력하신 내용은 그대로 있으니 잠시 후 다시
              눌러 주세요.
            </p>
          )}
          <div className="mt-auto pt-6">
            <button
              type="button"
              disabled={!emailValid || !noticeConsent || busy}
              onClick={submit}
              className="nb-btn nb-btn-primary w-full py-3.5 text-[15px]"
            >
              {busy ? "신청 중…" : "알림 신청하기"}
            </button>
          </div>
        </>
      )}
    </main>
  );
}
