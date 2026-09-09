"use client";

// Returning-user sign in (Phase 1a). Google live; Kakao greyed behind
// NEXT_PUBLIC_AUTH_KAKAO=1; email code as the fallback.
//
// Login never creates accounts (shouldCreateUser: false): new people go
// through the 10분 진단 first, and registration happens after the teaser
// (CLAUDE.md rule 3). /app/layout.tsx sends accounts without a profile to
// /start, so this page only needs to get the session established.

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { AuthError } from "@supabase/supabase-js";
import { supabaseBrowser } from "@/lib/supabase/client";

type Step = "method" | "email" | "code";

const KAKAO_LIVE = process.env.NEXT_PUBLIC_AUTH_KAKAO === "1";
const AFTER_LOGIN = "/app/profile";

/** GoTrue's answer when shouldCreateUser is false and the email is unknown. */
function isUnknownUser(error: AuthError): boolean {
  return (
    error.code === "otp_disabled" ||
    error.code === "signup_disabled" ||
    error.code === "user_not_found" ||
    /signups? not allowed/i.test(error.message)
  );
}

function LoginFlow() {
  const router = useRouter();
  const params = useSearchParams();

  const [step, setStep] = useState<Step>("method");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [unknownUser, setUnknownUser] = useState(false);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  // OAuth failures land back here with ?error=auth.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (params.get("error") === "auth") {
      setErrorMsg("로그인에 실패했어요. 다시 시도해 주세요.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const oauth = async (provider: "google" | "kakao") => {
    setBusy(true);
    setErrorMsg(null);
    setUnknownUser(false);
    const { error } = await supabaseBrowser().auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(AFTER_LOGIN)}`,
      },
    });
    if (error) {
      setBusy(false);
      setErrorMsg("로그인 연결에 실패했어요. 다시 시도해 주세요.");
    }
    // On success the browser navigates away.
  };

  // --- method: Google / Kakao / email ---
  if (step === "method") {
    return (
      <Shell title="다시 오셨네요" eyebrow="로그인">
        <p className="mb-8 text-sm leading-relaxed text-gray-500">
          처음이시라면{" "}
          <Link href="/start" className="font-bold text-[var(--nb-ink)] underline underline-offset-4">
            10분 진단
          </Link>
          부터 시작해 주세요. 진단을 마치고 등록한 뒤에 이곳에서 로그인하실 수 있어요.
        </p>
        {errorMsg && <ErrorLine msg={errorMsg} />}
        <div className="flex flex-col gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => oauth("google")}
            className="nb-btn nb-btn-white w-full py-3.5 text-[15px]"
          >
            Google로 계속하기
          </button>
          {KAKAO_LIVE ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => oauth("kakao")}
              className="nb-btn w-full bg-[#FEE500] py-3.5 text-[15px]"
            >
              카카오로 계속하기
            </button>
          ) : (
            <div className="relative">
              <button
                type="button"
                disabled
                aria-disabled
                className="nb-btn nb-disabled w-full bg-[#FEE500] py-3.5 text-[15px]"
              >
                카카오로 계속하기
              </button>
              <span className="nb-sticker absolute -top-2 right-3">준비 중</span>
            </div>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setErrorMsg(null);
              setStep("email");
            }}
            className="w-full py-2.5 text-sm text-gray-500"
          >
            이메일 코드로 로그인하기
          </button>
        </div>
      </Shell>
    );
  }

  // --- email entry (OTP request, existing accounts only) ---
  if (step === "email") {
    const sendCode = async () => {
      setBusy(true);
      setErrorMsg(null);
      setUnknownUser(false);
      const { error } = await supabaseBrowser().auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: false },
      });
      setBusy(false);
      if (error) {
        if (isUnknownUser(error)) {
          setUnknownUser(true);
        } else {
          setErrorMsg("인증 메일 발송에 실패했어요. 잠시 후 다시 시도해 주세요.");
        }
        return;
      }
      setStep("code");
    };
    return (
      <Shell title="이메일로 로그인하기" eyebrow="로그인">
        <p className="mb-6 text-sm leading-relaxed text-gray-500">
          등록하신 이메일 주소로 6자리 인증 코드를 보내드려요.
        </p>
        {errorMsg && <ErrorLine msg={errorMsg} />}
        {unknownUser && (
          <div className="nb-flat mb-5 bg-[var(--nb-yellow)] px-4 py-3 text-sm leading-relaxed">
            <p className="mb-1 font-bold">아직 등록된 계정이 아니에요.</p>
            <p>
              먼저 10분 진단을 완료하고 등록해 주세요.{" "}
              <Link href="/start" className="font-bold underline underline-offset-4">
                진단 시작하기
              </Link>
            </p>
          </div>
        )}
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setUnknownUser(false);
          }}
          placeholder="이메일 주소"
          className="nb-input w-full px-4 py-3 text-[15px]"
        />
        <div className="mt-6 flex flex-col gap-2">
          <PrimaryButton disabled={!emailValid || busy} onClick={sendCode}>
            {busy ? "발송 중..." : "인증 코드 받기"}
          </PrimaryButton>
          <button
            type="button"
            onClick={() => {
              setErrorMsg(null);
              setUnknownUser(false);
              setStep("method");
            }}
            className="w-full py-2 text-sm text-gray-400"
          >
            다른 방법으로 로그인하기
          </button>
        </div>
      </Shell>
    );
  }

  // --- code verify ---
  const verify = async () => {
    setBusy(true);
    setErrorMsg(null);
    const { error } = await supabaseBrowser().auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: "email",
    });
    if (error) {
      setBusy(false);
      setErrorMsg("코드가 올바르지 않아요. 다시 확인해 주세요.");
      return;
    }
    // Accounts without a profile are sent on to /start by the app layout.
    router.push(AFTER_LOGIN);
  };
  return (
    <Shell title="인증 코드 입력" eyebrow="로그인">
      <p className="mb-6 text-sm leading-relaxed text-gray-500">
        {email.trim()} 로 보내드린 6자리 코드를 입력해 주세요.
      </p>
      {errorMsg && <ErrorLine msg={errorMsg} />}
      <input
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
        placeholder="123456"
        className="nb-input w-full px-4 py-3 text-center text-xl tracking-[0.4em]"
      />
      <div className="mt-6 flex flex-col gap-2">
        <PrimaryButton disabled={code.length !== 6 || busy} onClick={verify}>
          {busy ? "확인 중..." : "로그인"}
        </PrimaryButton>
        <button
          type="button"
          onClick={() => {
            setCode("");
            setErrorMsg(null);
            setStep("email");
          }}
          className="w-full py-2 text-sm text-gray-400"
        >
          코드 다시 받기
        </button>
      </div>
    </Shell>
  );
}

// --- layout helpers (same shape as /register) ---

function Shell({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center px-6 py-16">
      {eyebrow && <p className="nb-accent mb-2 text-sm font-extrabold">{eyebrow}</p>}
      <h1 className="mb-4 text-2xl font-extrabold leading-snug tracking-tight">{title}</h1>
      {children}
    </main>
  );
}

function PrimaryButton({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="nb-btn nb-btn-primary w-full py-3.5 text-[15px]"
    >
      {children}
    </button>
  );
}

function ErrorLine({ msg }: { msg: string }) {
  return <p className="mb-4 text-sm text-red-500">{msg}</p>;
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginFlow />
    </Suspense>
  );
}
