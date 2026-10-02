"use client";

// Registration gate (Phase 2) — always AFTER survey + teaser (spec rule 3).
// Flow: consent (개인정보보호법) → Kakao / Google / email OTP → details
// (표시 이름 · 회사명 · 직함, Phase 1a) → profile seeding.
//
// The profile is written by POST /api/register from the stored
// survey_response row; this page sends the row id, the identity fields and
// the consent flags (seedProfile in src/lib/survey/remote.ts).
//
// In-app browsers (KakaoTalk, NAVER, Instagram, ...; review finding P0-5):
// Google sign-in is refused there, so the email code leads and the page
// offers to reopen itself in the phone's own browser. That browser has none
// of this tab's storage, so the link carries the survey_response row id
// (?rid=…) and the registration finishes from the row alone ("hand-off").
// A 24-hour localStorage copy (src/lib/survey/backup.ts) covers a closed or second
// tab in the same browser.

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabaseBrowser } from "@/lib/supabase/client";
import { ensureResponseRow, seedProfile } from "@/lib/survey/remote";
import {
  loadAssignedTrack,
  loadConsent,
  loadEvents,
  loadResponse,
  loadResponseId,
  saveAssignedTrack,
  saveConsent,
  saveResponseId,
  submitResponse,
} from "@/lib/survey/storage";
import { isEmployeeScoring, type SurveyResponse, type TrackId } from "@/lib/survey/types";
import { loadHagwonDraft } from "@/components/hagwon/survey/draft";
import type { TrackChoice } from "@/app/api/register/_lib/contract";
import {
  COMPANY_NAME_MAX,
  DISPLAY_NAME_MAX,
  JOB_TITLE_MAX,
  normalizeIdentity,
  validateIdentity,
  type IdentityErrors,
} from "@/components/profile/fields";
import {
  clearBackup,
  handoffQuery,
  loadBackup,
  loadSessionHandoff,
  loadStoredHandoff,
  mirrorResponseToBackup,
  parseHandoff,
  saveHandoff,
  type Handoff,
  type TrackVia,
} from "@/lib/survey/backup";
import { useInApp } from "./_lib/inapp";
import ExternalBrowser from "./_lib/ExternalBrowser";

// Full policy lives on the marketing site when its URL is configured.
const PRIVACY_URL = process.env.NEXT_PUBLIC_SITE_URL
  ? `${process.env.NEXT_PUBLIC_SITE_URL}/privacy`
  : null;

type Step =
  | "consent"
  | "method"
  | "email"
  | "code"
  | "details"
  | "finalize"
  | "done"
  | "blocked"
  | "claimed";

/**
 * Where this registration gets its survey from: the response held in this
 * tab ("local"), or only the id of the stored row, received from an in-app
 * browser ("handoff").
 */
type Source = { kind: "local" } | { kind: "handoff"; handoff: Handoff };

/**
 * Track and how it was decided, as this tab knows it. The server re-scores
 * the stored answers and only honours a pick between its own top two.
 */
function localTrack(response: SurveyResponse): { track: TrackId | null; trackVia: TrackVia | null } {
  if (!isEmployeeScoring(response.scoring)) return { track: null, trackVia: null };
  const track = loadAssignedTrack() as TrackId | null;
  if (response.scoring.decision.type === "assigned") {
    return { track: track ?? response.scoring.decision.track, trackVia: "auto" };
  }
  const last = loadEvents()
    .filter((e) => e.type === "track_assigned")
    .at(-1);
  const via = last?.data?.via;
  if (via === "user_choice" || via === "skip_default") return { track, trackVia: via };
  // A restored tab has no event log; the copy remembers how the pick was made.
  return { track, trackVia: loadBackup()?.trackVia ?? "user_choice" };
}

function toTrackChoice(t: { track: TrackId | null; trackVia: TrackVia | null }): TrackChoice | null {
  if (!t.track || (t.trackVia !== "user_choice" && t.trackVia !== "skip_default")) return null;
  return { track: t.track, via: t.trackVia };
}

/**
 * Find the survey for this registration, in order: this tab's response; a
 * hand-off link (?rid=…); the hand-off this tab arrived with; the 24-hour
 * copy from an earlier tab; a stored hand-off. null = no survey: blocked.
 */
function resolveSource(params: URLSearchParams): { source: Source; hagwon: boolean } | null {
  const local = loadResponse();
  if (local) {
    mirrorResponseToBackup(local, { responseId: loadResponseId(), ...localTrack(local) });
    return { source: { kind: "local" }, hagwon: local.path === "hagwon" };
  }

  const fromLink = parseHandoff(params);
  if (fromLink) {
    saveHandoff(fromLink);
    return { source: { kind: "handoff", handoff: fromLink }, hagwon: fromLink.path === "hagwon" };
  }
  const arrived = loadSessionHandoff();
  if (arrived) return { source: { kind: "handoff", handoff: arrived }, hagwon: arrived.path === "hagwon" };

  const backup = loadBackup();
  if (backup?.response) {
    // Put the copy back into this tab. submitResponse is write-once and this
    // tab holds no response, so nothing is overwritten.
    submitResponse(backup.response);
    if (backup.responseId && !loadResponseId()) saveResponseId(backup.responseId);
    if (backup.track && !loadAssignedTrack()) saveAssignedTrack(backup.track);
    return { source: { kind: "local" }, hagwon: backup.response.path === "hagwon" };
  }
  const stored = loadStoredHandoff();
  if (stored) return { source: { kind: "handoff", handoff: stored }, hagwon: stored.path === "hagwon" };
  return null;
}

/** Name the identity provider gave us, if any, to prefill 표시 이름. */
function identityName(user: User): string {
  const meta = user.user_metadata ?? {};
  const candidate = meta.full_name ?? meta.name ?? "";
  return typeof candidate === "string" ? candidate.trim().slice(0, DISPLAY_NAME_MAX) : "";
}

function RegisterFlow() {
  const router = useRouter();
  const params = useSearchParams();

  const [step, setStep] = useState<Step | null>(null);
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  // 학원 path (phase-hagwon.md H5): same fields, but the organisation is a
  // 학원, and the result lives on 나의 AI 교육 rather than /report.
  const [isHagwon, setIsHagwon] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<IdentityErrors>({});
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [source, setSource] = useState<Source | null>(null);
  // KakaoTalk, NAVER, Instagram, ... webview, or null in a real browser.
  const inApp = useInApp();

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  // Copy: 해요체 for employees, 합니다체 on the 학원 path (schema copy rule).
  const t = (employee: string, hagwon: string) => (isHagwon ? hagwon : employee);

  // After auth: a returning account that already has a display name skips the
  // details step and the seeding (nothing to write); everyone else fills in
  // the details. Used by the OAuth return, the email-code path, and old
  // ?step=finalize links.
  const enterDetails = async () => {
    const supabase = supabaseBrowser();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      setErrorMsg(t("로그인이 필요해요. 다시 시도해 주세요.", "로그인이 필요합니다. 다시 시도해 주세요."));
      setStep("method");
      return;
    }
    const { data: row } = await supabase
      .from("user_profile")
      .select("display_name")
      .eq("user_id", auth.user.id)
      .maybeSingle();
    if (row?.display_name) {
      setStep("done");
      return;
    }
    setDisplayName((current) => current || identityName(auth.user));
    setStep("details");
  };

  // Entry routing: OAuth return lands on ?step=details (older links still
  // say ?step=finalize); everyone else starts at consent. No survey (neither
  // in this tab, nor a copy, nor a hand-off id) → back to the survey (gate
  // after survey).
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const resolved = resolveSource(new URLSearchParams(params.toString()));
    if (!resolved) {
      // No response yet: a 원장 who left the 학원 survey mid-way still has its
      // draft, which decides which survey the blocked screen points back to.
      setIsHagwon(loadHagwonDraft() !== null);
      setStep("blocked");
      return;
    }
    setSource(resolved.source);
    const hagwon = resolved.hagwon;
    setIsHagwon(hagwon);
    // The row id has been stored for this tab; keep it out of the address
    // bar and the browser history.
    if (params.get("rid")) window.history.replaceState(null, "", "/register");
    const entry = params.get("step");
    if (entry === "details" || entry === "finalize") {
      void enterDetails();
      return;
    }
    if (params.get("error") === "auth") {
      setErrorMsg(
        hagwon ? "로그인에 실패했습니다. 다시 시도해 주세요." : "로그인에 실패했어요. 다시 시도해 주세요.",
      );
    }
    setStep("consent");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Finalize: POST /api/register builds user_profile from the stored
  // survey_response row; this tab sends the row id, the details and consent.
  useEffect(() => {
    if (step !== "finalize") return;
    (async () => {
      const consent = loadConsent();
      if (!consent) {
        // Consent evaporated (e.g. new tab) — collect it again before seeding.
        setStep("consent");
        return;
      }
      const identity = normalizeIdentity({ displayName, companyName, jobTitle });
      const local = loadResponse();
      const handoff = source?.kind === "handoff" ? source.handoff : null;
      const result = await seedProfile({
        // Hand-off: the id came with the link. Otherwise seedProfile resolves
        // it from this tab and inserts the row first if that had failed.
        responseId: handoff?.responseId ?? null,
        trackChoice: handoff ? toTrackChoice(handoff) : local ? toTrackChoice(localTrack(local)) : null,
        marketingConsent: consent.marketing,
        displayName: identity.displayName,
        companyName: identity.companyName,
        jobTitle: identity.jobTitle,
      });
      if (result.ok) {
        // The server read the path from the stored row; trust that over the hint.
        if (result.path) setIsHagwon(result.path === "hagwon");
        clearBackup();
        setStep("done");
        return;
      }
      switch (result.error) {
        case "not_authenticated":
          setErrorMsg(t("로그인이 필요해요. 다시 시도해 주세요.", "로그인이 필요합니다. 다시 시도해 주세요."));
          setStep("method");
          break;
        case "display_name_required":
          setFieldErrors({ displayName: "표시 이름을 입력해 주세요." });
          setStep("details");
          break;
        case "consent_required":
          setStep("consent");
          break;
        case "response_claimed":
          setStep("claimed");
          break;
        case "response_required":
        case "response_not_found":
          // No profile without its baseline row: say so and let them retry.
          setErrorMsg(
            t(
              "진단 결과를 아직 저장하지 못했어요. 잠시 후 다시 눌러 주세요.",
              "진단 결과를 아직 저장하지 못했습니다. 잠시 후 다시 눌러 주세요.",
            ),
          );
          setStep("details");
          break;
        case "invalid_response":
          setErrorMsg(
            t(
              "진단 결과를 읽지 못했어요. 번거로우시겠지만 진단을 다시 진행해 주세요.",
              "진단 결과를 읽지 못했습니다. 번거로우시겠지만 진단을 다시 진행해 주세요.",
            ),
          );
          setStep("details");
          break;
        default:
          setErrorMsg(
            t("저장하지 못했어요. 잠시 후 다시 시도해 주세요.", "저장하지 못했습니다. 잠시 후 다시 시도해 주세요."),
          );
          setStep("details");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /**
   * Address that continues this registration in another browser: /register
   * with the stored row's id. null when the row is not in the database yet.
   */
  const handoffUrl = async (): Promise<string | null> => {
    let handoff: Handoff | null = source?.kind === "handoff" ? source.handoff : null;
    if (!handoff) {
      const local = loadResponse();
      const id = await ensureResponseRow();
      if (!local || !id) return null;
      handoff = { responseId: id, path: local.path, ...localTrack(local) };
    }
    return `${window.location.origin}/register?${handoffQuery(handoff)}`;
  };

  if (step === null) return null;

  // --- claimed: this response already seeded another account's profile ---
  if (step === "claimed") {
    return (
      <Shell title={t("이미 등록된 진단 결과예요", "이미 등록된 진단 결과입니다")}>
        <p className="mb-8 text-[15px] leading-relaxed text-gray-600">
          {t(
            "이 진단 결과는 다른 계정에 이미 등록되어 있어요. 처음 등록하실 때 쓰신 방법으로 로그인해 주세요.",
            "이 진단 결과는 다른 계정에 이미 등록되어 있습니다. 처음 등록하실 때 쓰신 방법으로 로그인해 주세요.",
          )}
        </p>
        <PrimaryButton
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            // The account just signed in has no profile; leave it before
            // showing the login screen, which would otherwise bounce back.
            await supabaseBrowser().auth.signOut();
            router.refresh();
            router.push("/login");
          }}
        >
          로그인 화면으로 가기
        </PrimaryButton>
      </Shell>
    );
  }

  // --- blocked: no survey yet ---
  if (step === "blocked") {
    return (
      <Shell title={t("먼저 진단을 완료해 주세요", "학원 진단을 먼저 마쳐 주세요")}>
        <p className="mb-8 text-[15px] leading-relaxed text-gray-600">
          {isHagwon
            ? "진단 결과는 답하신 내용을 바탕으로 나옵니다. 남은 문항에 먼저 답해 주세요."
            : "맞춤 리포트는 10분 진단 결과를 바탕으로 만들어져요. 진단을 먼저 완료해 주세요."}
        </p>
        <PrimaryButton onClick={() => router.push(isHagwon ? "/hagwon" : "/start")}>
          {t("진단 시작하기", "진단 이어서 하기")}
        </PrimaryButton>
        <p className="mt-5 text-center text-sm text-gray-500">
          {t("이미 등록하셨나요?", "이미 등록하셨습니까?")}{" "}
          <Link href="/login" className="font-bold text-[var(--nb-ink)] underline underline-offset-4">
            로그인
          </Link>
        </p>
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
            소셜 로그인 계정 식별자, 설문 응답 내용, 표시 이름,{" "}
            {t("회사명·직함(선택)", "학원명·직함(선택)")}
          </p>
          <p className="mb-2">
            <strong className="text-gray-800">수집 목적</strong> —{" "}
            {t(
              "맞춤형 학습 리포트 제공, 과정 운영 및 지도, 과정 안내.",
              "진단 결과 제공, 진단 상담 연락, 과정 운영 및 지도, 과정 안내.",
            )}{" "}
            InnovLabs 강사와 운영진은 과정 운영 및 지도를 위해 진단 결과와 수업 중
            작성하신 학습 기록을 열람합니다.
          </p>
          <p className="mb-2">
            <strong className="text-gray-800">보유 기간</strong> — 삭제를 요청하실 때까지
          </p>
          <p>
            <strong className="text-gray-800">이용자의 권리</strong> — 언제든지
            열람·정정·삭제를 요청하실 수 있으며, 동의를 거부할 수 있습니다. 다만{" "}
            {t(
              "동의하지 않으시면 맞춤 리포트 제공이 어렵습니다.",
              "동의하지 않으시면 진단 결과를 제공하기 어렵습니다.",
            )}
          </p>
          {PRIVACY_URL && (
            <p className="mt-3">
              <a
                href={PRIVACY_URL}
                target="_blank"
                rel="noreferrer"
                className="font-bold underline underline-offset-4"
              >
                개인정보처리방침 전문 보기
              </a>
            </p>
          )}
        </div>
        <label className="mb-3 flex items-start gap-2.5 text-sm text-gray-800">
          <input
            type="checkbox"
            checked={privacyAgreed}
            onChange={(e) => setPrivacyAgreed(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0"
          />
          <span>개인정보 수집·이용에 동의합니다. (필수)</span>
        </label>
        <label className="mb-8 flex items-start gap-2.5 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={marketing}
            onChange={(e) => setMarketing(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0"
          />
          <span>과정 소식·혜택 안내 수신에 동의합니다. (선택)</span>
        </label>
        <PrimaryButton
          disabled={!privacyAgreed}
          onClick={async () => {
            saveConsent({ agreedAt: new Date().toISOString(), marketing });
            // Already signed in (e.g. sent here from /app with no profile):
            // skip the sign-in step instead of asking for it twice.
            const { data } = await supabaseBrowser().auth.getUser();
            if (data.user) void enterDetails();
            else setStep("method");
          }}
        >
          동의하고 계속하기
        </PrimaryButton>
      </Shell>
    );
  }

  // --- method: Kakao / Google / email ---
  if (step === "method") {
    const kakaoEnabled = process.env.NEXT_PUBLIC_AUTH_KAKAO === "1";
    const oauth = async (provider: "kakao" | "google") => {
      setBusy(true);
      setErrorMsg(null);
      const { error } = await supabaseBrowser().auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) {
        setBusy(false);
        setErrorMsg(
          t(
            "로그인 창을 열지 못했어요. 다시 시도해 주세요.",
            "로그인 창을 열지 못했습니다. 다시 시도해 주세요.",
          ),
        );
      }
      // On success the browser navigates away.
    };

    // In-app browser: Google would end on an error page there, so the email
    // code is the main button, Kakao (when live) works inside KakaoTalk, and
    // the way out to a real browser sits underneath.
    if (inApp) {
      return (
        <Shell title={t("거의 다 왔어요!", "거의 다 왔습니다")} eyebrow="등록">
          <p className="nb-flat mb-6 bg-[var(--nb-yellow)] px-4 py-3 text-sm leading-relaxed">
            {t(
              `${inApp.label} 안에서는 구글 로그인이 열리지 않아, 이메일로 받는 인증 코드로 등록하시는 게 가장 빨라요.`,
              `${inApp.label} 안에서는 구글 로그인이 열리지 않아, 이메일로 받는 인증 코드로 등록하시는 편이 가장 빠릅니다.`,
            )}
          </p>
          {errorMsg && <ErrorLine msg={errorMsg} />}
          <div className="flex flex-col gap-3">
            <PrimaryButton
              disabled={busy}
              onClick={() => {
                setErrorMsg(null);
                setStep("email");
              }}
            >
              이메일 인증 코드로 계속하기
            </PrimaryButton>
            {kakaoEnabled && (
              <button
                type="button"
                disabled={busy}
                onClick={() => oauth("kakao")}
                className="nb-btn w-full bg-[#FEE500] py-3.5 text-[15px]"
              >
                카카오로 계속하기
              </button>
            )}
          </div>
          <ExternalBrowser inApp={inApp} getUrl={handoffUrl} purpose="register" formal={isHagwon} />
        </Shell>
      );
    }

    return (
      <Shell title={t("거의 다 왔어요!", "거의 다 왔습니다")} eyebrow="등록">
        <p className="mb-8 text-sm leading-relaxed text-gray-500">
          {t("로그인만 하시면 맞춤 리포트를 바로 보여드려요.", "로그인만 하시면 진단 결과를 바로 보여드립니다.")}
        </p>
        {errorMsg && <ErrorLine msg={errorMsg} />}
        <div className="flex flex-col gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => oauth("google")}
            className="nb-btn nb-btn-white w-full py-3.5 text-[15px]"
          >
            구글로 계속하기
          </button>
          {kakaoEnabled ? (
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
        setErrorMsg(
          t(
            "인증 메일을 보내지 못했어요. 잠시 후 다시 시도해 주세요.",
            "인증 메일을 보내지 못했습니다. 잠시 후 다시 시도해 주세요.",
          ),
        );
        return;
      }
      setStep("code");
    };
    return (
      <Shell title="이메일로 등록하기" eyebrow="등록">
        <p className="mb-6 text-sm leading-relaxed text-gray-500">
          {t("입력하신 주소로 6자리 인증 코드를 보내드려요.", "입력하신 주소로 6자리 인증 코드를 보내드립니다.")}
        </p>
        {errorMsg && <ErrorLine msg={errorMsg} />}
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="이메일 주소"
          className="nb-input w-full px-4 py-3 text-base"
        />
        <div className="mt-6 flex flex-col gap-2">
          <PrimaryButton disabled={!emailValid || busy} onClick={sendCode}>
            {busy ? "발송 중..." : "인증 코드 받기"}
          </PrimaryButton>
          <button
            type="button"
            onClick={() => setStep("method")}
            className="w-full py-2 text-sm text-gray-600"
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
      if (error) {
        setBusy(false);
        setErrorMsg(t("코드가 올바르지 않아요. 다시 확인해 주세요.", "코드가 올바르지 않습니다. 다시 확인해 주세요."));
        return;
      }
      await enterDetails();
      setBusy(false);
    };
    return (
      <Shell title="인증 코드 입력" eyebrow="등록">
        <p className="mb-6 text-sm leading-relaxed text-gray-500">
          {email.trim()}로 보내드린 6자리 코드를 입력해 주세요.
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
            className="w-full py-2 text-sm text-gray-600"
          >
            코드 다시 받기
          </button>
        </div>
      </Shell>
    );
  }

  // --- details: 표시 이름 (required) · 회사명 · 직함 (optional) ---
  if (step === "details") {
    const submit = () => {
      const errors = validateIdentity({ displayName, companyName, jobTitle });
      setFieldErrors(errors);
      if (Object.keys(errors).length > 0) return;
      setErrorMsg(null);
      setStep("finalize");
    };
    return (
      <Shell title={t("어떻게 불러드리면 될까요?", "어떻게 불러드리면 되겠습니까?")} eyebrow="등록">
        <p className="mb-6 text-sm leading-relaxed text-gray-500">
          {isHagwon
            ? "결과와 상담 안내에서 이 이름으로 부르겠습니다. 학원명과 직함을 적어 주시면 상담 준비에 참고하겠습니다."
            : "수업과 리포트에서 이 이름으로 불러드려요. 회사명과 직함은 적어 주시면 과정 안내에 참고할게요."}
        </p>
        {errorMsg && <ErrorLine msg={errorMsg} />}
        <div className="flex flex-col gap-4">
          <Field label="표시 이름" required error={fieldErrors.displayName}>
            <input
              type="text"
              autoComplete="name"
              maxLength={DISPLAY_NAME_MAX}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="예: 김민지"
              className="nb-input w-full px-4 py-3 text-base"
            />
          </Field>
          <Field
            label={isHagwon ? "학원명" : "회사명"}
            error={
              isHagwon
                ? fieldErrors.companyName?.replace("회사명", "학원명")
                : fieldErrors.companyName
            }
          >
            <input
              type="text"
              autoComplete="organization"
              maxLength={COMPANY_NAME_MAX}
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder={isHagwon ? "예: 하늘영어학원" : "예: 이노랩스"}
              className="nb-input w-full px-4 py-3 text-base"
            />
          </Field>
          <Field label="직함" error={fieldErrors.jobTitle}>
            <input
              type="text"
              autoComplete="organization-title"
              maxLength={JOB_TITLE_MAX}
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder={isHagwon ? "예: 원장" : "예: 마케팅팀 대리"}
              className="nb-input w-full px-4 py-3 text-base"
            />
          </Field>
        </div>
        <div className="mt-8">
          <PrimaryButton disabled={!displayName.trim()} onClick={submit}>
            등록 마치기
          </PrimaryButton>
        </div>
      </Shell>
    );
  }

  // --- finalize (spinner while seeding) ---
  if (step === "finalize") {
    return (
      <Shell title={t("등록을 마무리하고 있어요...", "등록을 마무리하고 있습니다...")}>
        <p className="text-sm text-gray-500">잠시만 기다려 주세요.</p>
      </Shell>
    );
  }

  // --- done ---
  return (
    <Shell title={t("등록이 끝났어요!", "등록이 끝났습니다")} eyebrow="환영합니다">
      <p className="mb-8 text-[15px] leading-relaxed text-gray-600">
        {isHagwon
          ? "이제 진단 결과 전체와 추천 모듈을 보실 수 있습니다."
          : "이제 답변하신 업무를 기준으로 쓴 맞춤 리포트를 보실 수 있어요."}
      </p>
      <PrimaryButton
        onClick={() => {
          router.refresh(); // header: 로그인 → 내 프로필
          router.push(isHagwon ? "/app/education" : "/report");
        }}
      >
        {isHagwon ? "전체 결과 보기" : "맞춤 리포트 보기"}
      </PrimaryButton>
      <Link
        href="/app/profile"
        className="mt-3 block w-full py-2.5 text-center text-sm font-semibold text-gray-500 underline underline-offset-4"
      >
        내 프로필 보기
      </Link>
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
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 py-16">
      {eyebrow && <p className="nb-accent mb-2 text-sm font-extrabold">{eyebrow}</p>}
      <h1 className="mb-4 text-2xl font-extrabold leading-snug tracking-tight">{title}</h1>
      {children}
    </main>
  );
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-bold text-gray-800">
        {label}
        {required ? (
          <span className="ml-1 text-[var(--nb-pink-deep)]">*</span>
        ) : (
          <span className="ml-1 text-xs font-medium text-gray-600">선택</span>
        )}
      </span>
      {children}
      {error && <span className="mt-1.5 block text-xs text-red-500">{error}</span>}
    </label>
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
