// 나의 AI 교육 tab. Server component: reads the living profile through
// getSession() and shows, top to bottom, the diagnosis summary, the
// personalized one-pager with the waitlist CTA, and the learning data
// snapshots. It never reads survey_response (no select policy, by design).
//
// The one-pager is cached on the profile (one_pager column) after its first
// generation: when present it renders server-side at once; otherwise a small
// client loader POSTs /api/one-pager and renders the result.

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import type { UserProfile } from "@/lib/profile/types";
import { TASK_CLUSTERS } from "@/lib/survey/questions";
import { TRACKS } from "@/lib/survey/tracks";
import {
  HOUR_BUCKET_LABELS,
  type HourBucket,
  type Path,
  type TaskClusterId,
} from "@/lib/survey/types";
import { Row, SectionTitle, formatDate } from "@/components/profile/display";
import OnePagerView, { isOnePager } from "@/components/report/OnePagerView";
import WaitlistCta from "@/components/report/WaitlistCta";
import OnePagerLoader from "@/components/education/OnePagerLoader";

export const metadata: Metadata = { title: "나의 AI 교육" };

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

export default async function EducationPage() {
  const session = await getSession();
  // The /app layout already guarantees a profile; this keeps the types honest.
  if (!session?.profile) redirect("/start");
  const { profile } = session;

  const trackName = (profile.track && TRACKS[profile.track]?.name) || "트랙 선택 전";
  const surveyDate = formatDate(profile.consented_at);
  const topTasks = topTaskCategories(profile.core ?? {});
  const workMap = profile.work_map;
  const baseline = profile.baseline;
  // Same fallback as POST /api/one-pager, so the cached report and a freshly
  // generated one carry the same track name.
  const reportTrackName = TRACKS[profile.track ?? "docs_admin"].name;
  const cachedOnePager = isOnePager(profile.one_pager) ? profile.one_pager : null;

  return (
    <main className="flex w-full flex-col gap-5">
      {/* 1. 진단 요약 */}
      <section className="nb-card px-5 py-5">
        <p className="mb-1 text-xs font-extrabold text-[var(--nb-pink-deep)]">나의 AI 교육</p>
        <h1 className="mb-3 text-2xl font-extrabold leading-snug tracking-tight">
          진단 요약
        </h1>
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

      {/* 2. 맞춤 리포트 (inline one-pager + waitlist CTA) */}
      <section className="py-3">
        {cachedOnePager ? (
          <>
            <OnePagerView
              trackName={reportTrackName}
              onePager={cachedOnePager}
              headingLevel="h2"
            />
            <WaitlistCta trackName={reportTrackName} />
          </>
        ) : (
          <OnePagerLoader />
        )}
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
      </section>
    </main>
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
