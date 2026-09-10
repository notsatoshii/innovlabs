// 프로필 tab (docs/app/phases/phase-1.md §4). Server component: reads the
// living profile through getSession() and renders identity, consent, and
// account. Diagnosis, the one-pager, and learning data live on the
// 나의 AI 교육 tab. It never reads survey_response (no select policy, by
// design); the only editable fields are the identity trio and the
// marketing toggle.

import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession, signInMethod } from "@/lib/auth/session";
import { Row, SectionTitle, formatDate } from "@/components/profile/display";
import ProfileEditForm from "@/components/profile/ProfileEditForm";
import MarketingToggle from "@/components/profile/MarketingToggle";

// Placeholder until the deletion procedure exists (phase-1.md §11): requests
// go to Eric by mail. Swap for the real address or a form when decided.
const DELETION_REQUEST_EMAIL = "eric@diiant.com";

const METHOD_LABEL = { google: "구글", kakao: "카카오", email: "이메일" } as const;

/** Human label for a consent text version (raw ids stay in the database). */
function consentLabel(version: string): string {
  if (version.startsWith("2026-09")) return "2026년 9월 개정 안내문";
  if (version.startsWith("2026-08")) return "2026년 8월 안내문";
  return version;
}

export default async function ProfilePage() {
  const session = await getSession();
  // The /app layout already guarantees a profile; this keeps the types honest.
  if (!session?.profile) redirect("/start");
  const { user, profile } = session;

  const method = METHOD_LABEL[signInMethod(user)];
  const displayName = profile.display_name?.trim() || "이름 없음";
  const affiliation = [profile.company_name, profile.job_title]
    .map((v) => v?.trim())
    .filter(Boolean)
    .join(" · ");
  const deletionHref = `mailto:${DELETION_REQUEST_EMAIL}?subject=${encodeURIComponent("계정 삭제 요청")}`;

  return (
    <main className="flex w-full flex-col gap-5">
      {/* 1. Identity */}
      <section className="nb-card px-5 py-5">
        <p className="mb-1 text-xs font-extrabold text-[var(--nb-pink-deep)]">프로필</p>
        <h1 className="text-2xl font-extrabold leading-snug tracking-tight">
          {displayName}
        </h1>
        {affiliation && (
          <p className="mt-1 text-sm text-gray-700">{affiliation}</p>
        )}
        <dl className="mt-4 flex flex-col gap-1.5 text-sm">
          <Row label="이메일" value={user.email ?? "이메일 없음"} />
          <Row label="로그인" value={`${method} 계정`} />
        </dl>
        <p className="mt-4 border-t-2 border-[var(--nb-ink)] pt-3 text-xs leading-relaxed text-gray-500">
          진단 결과와 맞춤 리포트는{" "}
          <Link
            href="/app/education"
            className="font-semibold text-gray-700 underline underline-offset-4"
          >
            나의 AI 교육
          </Link>
          {" "}탭에서 볼 수 있어요.
        </p>
      </section>

      {/* 2. 동의 현황 */}
      <section className="nb-card px-5 py-5">
        <SectionTitle>동의 현황</SectionTitle>
        <dl className="mb-4 flex flex-col gap-1.5 text-sm">
          <Row label="동의한 안내문" value={consentLabel(profile.consent_version)} />
          <Row label="동의일" value={formatDate(profile.consented_at) ?? "기록 없음"} />
        </dl>
        <MarketingToggle initial={profile.marketing_consent} />
      </section>

      {/* 3. 계정 */}
      <section className="nb-card px-5 py-5">
        <SectionTitle>계정</SectionTitle>
        <ProfileEditForm
          displayName={profile.display_name ?? ""}
          companyName={profile.company_name}
          jobTitle={profile.job_title}
        />
        <div className="mt-6 flex flex-col gap-3 border-t-2 border-[var(--nb-ink)] pt-5">
          <form method="post" action="/auth/signout">
            <button type="submit" className="nb-btn nb-btn-white w-full py-3 text-sm">
              로그아웃
            </button>
          </form>
          <p className="text-xs leading-relaxed text-gray-500">
            계정과 학습 데이터를 지우고 싶으시면{" "}
            <a href={deletionHref} className="font-semibold text-gray-700 underline underline-offset-4">
              삭제 요청
            </a>
            을 보내 주세요. 확인 후 처리해 드려요.
          </p>
        </div>
      </section>
    </main>
  );
}
