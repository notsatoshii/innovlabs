// 프로필 tab (docs/app/phases/phase-1.md §4). Server component: reads the
// living profile through getSession() and renders every section with a
// null-safe fallback. It never reads survey_response (no select policy, by
// design) and offers no way to edit core, track, or the derived columns;
// the only editable fields are the identity trio and the marketing toggle.

import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession, signInMethod } from "@/lib/auth/session";
import type { UserProfile } from "@/lib/profile/types";
import { TASK_CLUSTERS } from "@/lib/survey/questions";
import { TRACKS } from "@/lib/survey/tracks";
import {
  HOUR_BUCKET_LABELS,
  type HourBucket,
  type Path,
  type TaskClusterId,
} from "@/lib/survey/types";
import ProfileEditForm from "@/components/profile/ProfileEditForm";
import MarketingToggle from "@/components/profile/MarketingToggle";

// Placeholder until the deletion procedure exists (phase-1.md §11): requests
// go to Eric by mail. Swap for the real address or a form when decided.
const DELETION_REQUEST_EMAIL = "eric@diiant.com";

const METHOD_LABEL = { google: "구글", kakao: "카카오", email: "이메일" } as const;

const PATH_LABEL: Record<Path, string> = {
  employee: "직장인",
  solo: "1인 사업자·프리랜서",
  student: "학생·취업 준비생",
};

function depthSentence(flag: UserProfile["depth_flag"]): string {
  switch (flag) {
    case "full_agent":
      return "설치가 자유로운 환경이라 에이전트·서버 과정까지 함께 진행할 수 있어요.";
    case "browser_only":
      return "회사 환경에 맞춰 브라우저에서 쓰는 도구 중심으로 진행해요.";
    default:
      return "학습 환경은 아직 확인하지 못했어요.";
  }
}

/** Human label for a consent text version (raw ids stay in the database). */
function consentLabel(version: string): string {
  if (version.startsWith("2026-09")) return "2026년 9월 개정 안내문";
  if (version.startsWith("2026-08")) return "2026년 8월 안내문";
  return version;
}

function formatDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Seoul",
  });
}

const CLUSTER_IDS = new Set<string>(TASK_CLUSTERS.map((c) => c.id));

/** Top three Q5 categories by weekly hours, from core.task_hours. */
function topTaskCategories(core: Record<string, unknown>) {
  const raw = core.task_hours;
  if (!raw || typeof raw !== "object") return null;
  const entries = Object.entries(raw as Record<string, unknown>)
    .filter(
      (pair): pair is [TaskClusterId, HourBucket] =>
        CLUSTER_IDS.has(pair[0]) &&
        typeof pair[1] === "number" &&
        Number.isInteger(pair[1]) &&
        pair[1] >= 1 &&
        pair[1] <= 4,
    )
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 3);
  return entries.map(([id, bucket]) => ({
    id,
    label: TASK_CLUSTERS.find((c) => c.id === id)?.label ?? id,
    hours: HOUR_BUCKET_LABELS[bucket] ?? "",
  }));
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
  const trackName = (profile.track && TRACKS[profile.track]?.name) || "트랙 선택 전";
  const surveyDate = formatDate(profile.consented_at);
  const topTasks = topTaskCategories(profile.core ?? {});
  const workMap = profile.work_map;
  const baseline = profile.baseline;
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
      </section>

      {/* 2. 진단 요약 */}
      <section className="nb-card px-5 py-5">
        <SectionTitle>진단 요약</SectionTitle>
        <dl className="flex flex-col gap-1.5 text-sm">
          <Row label="구분" value={PATH_LABEL[profile.path]} />
          <Row label="트랙" value={trackName} />
          <Row label="등록일" value={surveyDate ?? "기록 없음"} />
        </dl>
        <p className="mt-3 text-sm leading-relaxed text-gray-700">
          {depthSentence(profile.depth_flag)}
        </p>
        <div className="mt-4">
          <p className="mb-2 text-xs font-bold text-gray-500">
            시간을 가장 많이 쓰는 업무
          </p>
          {topTasks && topTasks.length > 0 ? (
            <ol className="flex flex-col gap-2">
              {topTasks.map((task, index) => (
                <li key={task.id} className="nb-flat flex items-center gap-3 px-3 py-2.5">
                  <span className="nb-badge shrink-0 bg-[var(--nb-yellow)] px-2 text-xs font-extrabold">
                    {index + 1}
                  </span>
                  <span className="flex-1 text-sm leading-snug">{task.label}</span>
                  <span className="shrink-0 text-xs font-bold text-gray-600">
                    주 {task.hours}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-gray-500">
              진단에서 입력한 업무 시간 기록이 없어요.
            </p>
          )}
        </div>
      </section>

      {/* 3. 학습 데이터 */}
      <section className="nb-card px-5 py-5">
        <SectionTitle>학습 데이터</SectionTitle>
        <div className="flex flex-col gap-3">
          <DataCard title="워크맵" ready={!!workMap}>
            {workMap ? (
              <>
                <p className="text-sm text-gray-700">
                  P 업무 주 {workMap.totals.p_hours}시간 · T 업무 주{" "}
                  {workMap.totals.t_hours}시간
                </p>
                {workMap.candidates.length > 0 && (
                  <ol className="mt-2 flex flex-col gap-1 text-sm">
                    {[...workMap.candidates]
                      .sort((a, b) => a.rank - b.rank)
                      .slice(0, 3)
                      .map((candidate) => (
                        <li key={candidate.rank} className="flex gap-2">
                          <span className="shrink-0 font-bold">{candidate.rank}.</span>
                          <span>
                            {workMap.rows[candidate.task_row]?.task ?? "후보 업무"}
                          </span>
                        </li>
                      ))}
                  </ol>
                )}
              </>
            ) : (
              <p className="text-sm text-gray-500">1주차 수업에서 함께 만들어요.</p>
            )}
          </DataCard>
          <DataCard title="기준선" ready={!!baseline}>
            {baseline ? (
              <>
                <p className="text-sm font-semibold">{baseline.task}</p>
                <p className="mt-1 text-sm text-gray-700">
                  회당 {baseline.minutes_per_instance}분 · {baseline.frequency}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {baseline.countersigned_at
                    ? `강사 확인 완료 · ${formatDate(baseline.countersigned_at) ?? ""}`
                    : "강사 확인을 기다리고 있어요."}
                </p>
              </>
            ) : (
              <p className="text-sm text-gray-500">3주차에 확정해요.</p>
            )}
          </DataCard>
          <DataCard title="하네스 라이브러리" ready={false}>
            <p className="text-sm text-gray-500">2주차부터 쌓여요.</p>
          </DataCard>
        </div>
        <Link
          href="/report"
          className="nb-btn nb-btn-white mt-4 block w-full py-3 text-center text-sm"
        >
          맞춤 리포트 보기
        </Link>
      </section>

      {/* 4. 동의 현황 */}
      <section className="nb-card px-5 py-5">
        <SectionTitle>동의 현황</SectionTitle>
        <dl className="mb-4 flex flex-col gap-1.5 text-sm">
          <Row label="동의한 안내문" value={consentLabel(profile.consent_version)} />
          <Row label="동의일" value={formatDate(profile.consented_at) ?? "기록 없음"} />
        </dl>
        <MarketingToggle initial={profile.marketing_consent} />
      </section>

      {/* 5. 계정 */}
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

// --- small display helpers ---

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-3 text-base font-extrabold tracking-tight">{children}</h2>;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <dt className="w-16 shrink-0 text-gray-500">{label}</dt>
      <dd className="min-w-0 flex-1 break-words">{value}</dd>
    </div>
  );
}

function DataCard({
  title,
  ready,
  children,
}: {
  title: string;
  ready: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="nb-flat px-4 py-3">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <h3 className="text-sm font-extrabold">{title}</h3>
        <span
          className={`nb-badge px-2 text-[11px] font-bold ${
            ready ? "bg-[var(--nb-lime)]" : "bg-[var(--nb-paper)]"
          }`}
        >
          {ready ? "기록됨" : "아직 없음"}
        </span>
      </div>
      {children}
    </div>
  );
}
