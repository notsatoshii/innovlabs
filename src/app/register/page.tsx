"use client";

// Registration gate (Phase 2) — always AFTER survey + teaser (spec rule 3).
// Flow: consent (개인정보보호법) → Kakao / Google / email OTP → profile seeding.

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { seedProfile } from "@/lib/survey/remote";
import {
  loadAssignedTrack,
  loadConsent,
  loadEvents,
  loadResponse,
  saveConsent,
} from "@/lib/survey/storage";
import type { TrackId } from "@/lib/survey/types";

type Step = "consent" | "method" | "email" | "code" | "finalize" | "done" | "blocked";

function trackVia(): "auto" | "user_choice" | "skip_default" | null {
  const r = loadResponse();
  if (!r?.scoring) return null;
  if (r.scoring.decision.type === "assigned") return "auto";
  const last = loadEvents()
    .filter((e) => e.type === "track_assigned")
    .at(-1);
  return (last?.data?.via as "user_choice" | "skip_default") ?? "user_choice";
}

function RegisterFlow() {
  const router = useRouter();
  const params = useSearchParams();

  const [step, setStep] = useState<Step | null>(null);
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  // Entry routing: OAuth return lands on ?step=finalize; everyone else starts
  // at consent. No survey response → back to the survey (gate after survey).
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!loadResponse()) {
      setStep("blocked");
      return;
    }
    if (params.get("step") === "finalize") {
      setStep("finalize");
      return;
    }
    if (params.get("error") === "auth") {
      setErrorMsg("로그인에 실패했어요. 다시 시도해 주세요.");
    }
    setStep("consent");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Finalize: seed user_profile from the frozen response.
  useEffect(() => {
    if (step !== "finalize") return;
    (async () => {
      const consent = loadConsent();
      if (!consent) {
        // Consent evaporated (e.g. new tab) — collect it again before seeding.
        setStep("consent");
        return;
      }
      const result = await seedProfile({
        track: (loadAssignedTrack() as TrackId | null) ?? null,
        trackVia: trackVia(),
        marketingConsent: consent.marketing,
      });
      if (result.ok) {
        setStep("done");
      } else if (result.error === "not_authenticated") {
        setErrorMsg("로그인이 필요해요. 다시 시도해 주세요.");
        setStep("method");
      } else {
        setErrorMsg("저장 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요.");
        setStep("method");
      }
    })();
  }, [step]);

  if (step === null) return null;

  // --- blocked: no survey yet ---
  if (step === "blocked") {
    return (
      <Shell title="먼저 진단을 완료해 주세요">
        <p className="mb-8 text-[15px] leading-relaxed text-gray-600">
          맞춤 리포트는 10분 진단 결과를 바탕으로 만들어져요. 진단을 먼저 완료해
          주세요.
        </p>
        <PrimaryButton onClick={() => router.push("/start")}>
          진단 시작하기
        </PrimaryButton>
      </Shell>
    );
  }

  // --- consent ---
  if (step === "consent") {
    return (
      <Shell title="개인정보 수집·이용 동의" eyebrow="등록">
        <div className="nb-flat mb-5 px-4 py-4 text-[13px] leading-relaxed text-gray-700">
          <p className="mb-2">
            <strong className="text-gray-800">수집 항목</strong> — 이메일 주소,
            소셜 로그인 계정 식별자, 설문 응답 내용
          </p>
          <p className="mb-2">
            <strong className="text-gray-800">수집 목적</strong> — 맞춤형 학습
            리포트 제공, 과정 운영 및 안내
          </p>
          <p className="mb-2">
            <strong className="text-gray-800">보유 기간</strong> — 회원 탈퇴
            또는 삭제 요청 시까지
          </p>
          <p>
            <strong className="text-gray-800">이용자의 권리</strong> — 언제든지
            열람·정정·삭제를 요청하실 수 있으며, 동의를 거부할 수 있습니다. 다만
            동의하지 않으시면 맞춤 리포트 제공이 어렵습니다.
          </p>
        </div>
        <label className="mb-3 flex items-start gap-2.5 text-sm text-gray-800">
          <input
            type="checkbox"
            checked={privacyAgreed}
            onChange={(e) => setPrivacyAgreed(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-blue-600"
          />
          <span>개인정보 수집·이용에 동의합니다. (필수)</span>
        </label>
        <label className="mb-8 flex items-start gap-2.5 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={marketing}
            onChange={(e) => setMarketing(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-blue-600"
          />
          <span>과정 소식·혜택 안내 수신에 동의합니다. (선택)</span>
        </label>
        <PrimaryButton
          disabled={!privacyAgreed}
          onClick={() => {
            saveConsent({ agreedAt: new Date().toISOString(), marketing });
            setStep("method");
          }}
        >
          동의하고 계속하기
        </PrimaryButton>
      </Shell>
    );
  }

  // --- method: Kakao / Google / email ---
  if (step === "method") {
    const oauth = async (provider: "kakao" | "google") => {
      setBusy(true);
      setErrorMsg(null);
      const { error } = await supabaseBrowser().auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) {
        setBusy(false);
        setErrorMsg("로그인 연결에 실패했어요. 다시 시도해 주세요.");
      }
      // On success the browser navigates away.
    };
    return (
      <Shell title="거의 다 왔어요!" eyebrow="등록">
        <p className="mb-8 text-sm leading-relaxed text-gray-500">
          간편하게 로그인하고 맞춤 리포트를 받아보세요.
        </p>
        {errorMsg && <ErrorLine msg={errorMsg} />}
        <div className="flex flex-col gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => oauth("kakao")}
            className="nb-btn w-full bg-[#FEE500] py-3.5 text-[15px]"
          >
            카카오로 계속하기
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => oauth("google")}
            className="nb-btn nb-btn-white w-full py-3.5 text-[15px]"
          >
            Google로 계속하기
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setErrorMsg(null);
              setStep("email");
            }}
            className="w-full py-2.5 text-sm text-gray-500"
          >
            이메일로 계속하기
          </button>
        </div>
      </Shell>
    );
  }

  // --- email entry (OTP request) ---
  if (step === "email") {
    const sendCode = async () => {
      setBusy(true);
      setErrorMsg(null);
      const { error } = await supabaseBrowser().auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: true },
      });
      setBusy(false);
      if (error) {
        setErrorMsg("인증 메일 발송에 실패했어요. 잠시 후 다시 시도해 주세요.");
        return;
      }
      setStep("code");
    };
    return (
      <Shell title="이메일로 등록하기" eyebrow="등록">
        <p className="mb-6 text-sm leading-relaxed text-gray-500">
          입력하신 주소로 6자리 인증 코드를 보내드려요.
        </p>
        {errorMsg && <ErrorLine msg={errorMsg} />}
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="이메일 주소"
          className="nb-input w-full px-4 py-3 text-[15px]"
        />
        <div className="mt-6 flex flex-col gap-2">
          <PrimaryButton disabled={!emailValid || busy} onClick={sendCode}>
            {busy ? "발송 중..." : "인증 코드 받기"}
          </PrimaryButton>
          <button
            type="button"
            onClick={() => setStep("method")}
            className="w-full py-2 text-sm text-gray-400"
          >
            다른 방법으로 등록하기
          </button>
        </div>
      </Shell>
    );
  }

  // --- code verify ---
  if (step === "code") {
    const verify = async () => {
      setBusy(true);
      setErrorMsg(null);
      const { error } = await supabaseBrowser().auth.verifyOtp({
        email: email.trim(),
        token: code.trim(),
        type: "email",
      });
      setBusy(false);
      if (error) {
        setErrorMsg("코드가 올바르지 않아요. 다시 확인해 주세요.");
        return;
      }
      setStep("finalize");
    };
    return (
      <Shell title="인증 코드 입력" eyebrow="등록">
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
            {busy ? "확인 중..." : "확인"}
          </PrimaryButton>
          <button
            type="button"
            onClick={() => setStep("email")}
            className="w-full py-2 text-sm text-gray-400"
          >
            코드 다시 받기
          </button>
        </div>
      </Shell>
    );
  }

  // --- finalize (spinner while seeding) ---
  if (step === "finalize") {
    return (
      <Shell title="등록을 마무리하고 있어요...">
        <p className="text-sm text-gray-500">잠시만 기다려 주세요.</p>
      </Shell>
    );
  }

  // --- done ---
  return (
    <Shell title="등록이 완료되었습니다!" eyebrow="환영합니다">
      <p className="mb-8 text-[15px] leading-relaxed text-gray-600">
        이제 내 업무 기준으로 작성된 맞춤 리포트를 확인하실 수 있어요.
      </p>
      <PrimaryButton onClick={() => router.push("/report")}>
        맞춤 리포트 보기
      </PrimaryButton>
    </Shell>
  );
}

// --- layout helpers ---

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

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterFlow />
    </Suspense>
  );
}
