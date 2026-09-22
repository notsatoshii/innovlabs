// 나의 AI 교육 for the 학원 path (phase-hagwon.md H3/H5): a short header,
// then the six-section result recomputed from the stored answers
// (profile.core), then the consult CTA. No one-pager, no waitlist, and no
// 학습 데이터 cards: those belong to the employee course. Server component;
// copy is 합니다체 to match the survey.

import type { UserProfile } from "@/lib/profile/types";
import type { HagwonAnswers, HagwonResult } from "@/lib/hagwon/types";
import { scoreHagwon } from "@/lib/hagwon/scoring";
import { Row, formatDate } from "@/components/profile/display";
import HagwonResultView from "@/components/hagwon/result/HagwonResultView";
import ConsultCta from "@/components/hagwon/result/ConsultCta";
import { supabaseServer } from "@/lib/supabase/server";
import { EVENT_TYPES } from "@/lib/profile/events";

/**
 * Minimal shape check before scoring: q4 must be the three ranked items and
 * the count questions numbers. Anything else shows the fallback card instead
 * of throwing inside a server component.
 */
function isHagwonAnswers(core: unknown): core is HagwonAnswers {
  if (!core || typeof core !== "object") return false;
  const a = core as Record<string, unknown>;
  const q4 = a.q4;
  if (!Array.isArray(q4) || q4.length !== 3 || !q4.every((v) => typeof v === "string")) {
    return false;
  }
  if (!Array.isArray(a.q1) || typeof a.q0 !== "string") return false;
  return ["q2_teachers", "q5a", "q6a", "q7a", "q8a"].every((key) => typeof a[key] === "number");
}

function compute(core: unknown): { result: HagwonResult; answers: HagwonAnswers } | null {
  if (!isHagwonAnswers(core)) return null;
  try {
    return { result: scoreHagwon(core), answers: core };
  } catch {
    return null;
  }
}

export default async function HagwonEducation({
  profile,
  email,
}: {
  profile: UserProfile;
  email: string;
}) {
  const computed = compute(profile.core);
  const displayName = profile.display_name?.trim() || "원장";
  // One consult request per account: the event log is the source of truth.
  const supabase = await supabaseServer();
  const { count } = await supabase
    .from("profile_event")
    .select("id", { count: "exact", head: true })
    .eq("user_id", profile.user_id)
    .eq("type", EVENT_TYPES.consult_requested);
  const alreadyRequested = (count ?? 0) > 0;
  const respondent = computed?.answers.q0 ?? "director";
  const RESPONDENT_LABEL = { director: "학원 원장", manager: "실장·부원장", staff: "학원 직원" } as const;

  return (
    <main className="flex w-full flex-col gap-5">
      <section className="nb-card px-5 py-5">
        <p className="mb-1 text-xs font-extrabold text-[var(--nb-pink-deep)]">나의 AI 교육</p>
        <h1 className="mb-3 text-2xl font-extrabold leading-snug tracking-tight">
          학원 진단 결과
        </h1>
        <dl className="flex flex-col gap-1.5 text-sm">
          <Row label="구분" value={RESPONDENT_LABEL[respondent]} />
          <Row label="등록일" value={formatDate(profile.consented_at) ?? "기록 없음"} />
        </dl>
      </section>

      {computed ? (
        <HagwonResultView
          result={computed.result}
          displayName={displayName}
          attendanceBilling={computed.answers.q4.includes("attendance_billing")}
          cta={
            <ConsultCta
              userId={profile.user_id}
              respondent={respondent}
              alreadyRequested={alreadyRequested}
              displayName={displayName}
              companyName={profile.company_name}
              jobTitle={profile.job_title}
              email={email}
              result={computed.result}
            />
          }
        />
      ) : (
        <section className="nb-card px-5 py-5">
          <p className="text-sm leading-relaxed text-gray-700">
            진단 기록을 불러오지 못했습니다. 잠시 후 다시 열어 주시고, 계속 보이지 않으면
            알려 주시기 바랍니다.
          </p>
        </section>
      )}
    </main>
  );
}
