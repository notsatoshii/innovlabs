// 나의 AI 교육 tab. Server component: reads the living profile through
// getSession() and shows, top to bottom (review A16): the learning data
// (what to open this week), the diagnosis summary, then the personalized
// one-pager (folded after its first view, CollapsibleReport) with the
// waitlist CTA. It never reads survey_response (no select policy, by design).
// The learning data runs in course order: Work Map and time log (Week 1),
// harness library (Week 2), pipeline blueprint and baseline (Week 3, 2c).
//
// The one-pager is cached on the profile (one_pager column) after its first
// generation: when present it renders server-side at once; otherwise a small
// client loader POSTs /api/one-pager and renders the result.

import type { Metadata } from "next";
import Link from "next/link";
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
import CollapsibleReport from "@/components/education/CollapsibleReport";
import HagwonEducation from "@/components/education/HagwonEducation";
import TimeLogCard from "@/components/lab/TimeLogCard";
import { formatMinutes } from "@/components/lab/rules";
import {
  blueprintFromSaved,
  formatFrequency,
  isAssistantActor,
  parseBaselineSnapshot,
} from "@/components/lab/rules-week3";
import { EVENT_TYPES } from "@/lib/profile/events";
import { supabaseServer } from "@/lib/supabase/server";
import HarnessLibraryCard from "@/components/lab/harness/HarnessLibraryCard";

export const metadata: Metadata = { title: "나의 AI 교육" };

const PATH_LABEL: Record<Path, string> = {
  hagwon: "학원 원장",
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

  // 학원 path: modules instead of a track, no one-pager, no 학습 데이터 cards
  // (phase-hagwon.md H3/H5). Everything below is the employee course.
  if (profile.path === "hagwon") {
    return <HagwonEducation profile={profile} email={session.user.email ?? ""} />;
  }

  const trackName = (profile.track && TRACKS[profile.track]?.name) || "트랙 선택 전";
  const surveyDate = formatDate(profile.consented_at);
  const topTasks = topTaskCategories(profile.core ?? {});
  const workMap = profile.work_map;
  // Only a snapshot of the 2c shape counts (no baseline existed before 2c).
  const baseline = parseBaselineSnapshot(profile.baseline);
  // Same fallback as POST /api/one-pager, so the cached report and a freshly
  // generated one carry the same track name.
  const reportTrackName = TRACKS[profile.track ?? "docs_admin"].name;
  const cachedOnePager = isOnePager(profile.one_pager) ? profile.one_pager : null;

  return (
    <main className="flex w-full flex-col gap-5">
      <h1 className="sr-only">나의 AI 교육</h1>

      {/* 1. 학습 데이터: what to open this week comes first */}
      <section className="nb-card px-5 py-5">
        <p className="mb-1 text-xs font-extrabold text-[var(--nb-pink-deep)]">나의 AI 교육</p>
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
            <Link href="/app/lab/work-map" className={DATA_CARD_BUTTON}>
              {workMap ? "워크맵 열기" : "워크맵 만들러 가기"}
            </Link>
          </DataCard>
          <TimeLogCard userId={session.user.id} />
          <HarnessLibraryCard userId={session.user.id} />
          <BlueprintCard userId={session.user.id} />
          <DataCard title="기준선" ready={!!baseline}>
            {baseline ? (
              <>
                <p className="text-sm font-semibold">{baseline.task}</p>
                <p className="mt-1 text-sm text-gray-700">
                  회당 {formatMinutes(baseline.minutes_per_instance)} · {formatFrequency(baseline.frequency)}
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
            <Link href="/app/lab/baseline" className={DATA_CARD_BUTTON}>
              {baseline ? "기준선 열기" : "기준선 확정하러 가기"}
            </Link>
          </DataCard>
        </div>
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

      {/* 3. 맞춤 리포트 (inline one-pager + waitlist CTA). A cached report
          folds after its first view; the waitlist CTA stays outside the fold.
          A report still being generated is its first view, so it stays open. */}
      <section className="py-3">
        {cachedOnePager ? (
          <>
            <CollapsibleReport userId={session.user.id} trackName={reportTrackName}>
              <OnePagerView
                trackName={reportTrackName}
                onePager={cachedOnePager}
                headingLevel="h2"
              />
            </CollapsibleReport>
            <WaitlistCta trackName={reportTrackName} />
          </>
        ) : (
          <OnePagerLoader />
        )}
      </section>
    </main>
  );
}

/**
 * 파이프라인 설계도 card: the newest submitted blueprint (Week 3 Part 2),
 * read through the learner's own client (own events only, by RLS). Async so
 * the read stays out of the page body, like TimeLogCard.
 */
async function BlueprintCard({ userId }: { userId: string }) {
  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from("profile_event")
    .select("created_at, data")
    .eq("user_id", userId)
    .eq("type", EVENT_TYPES.blueprint_submitted)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) console.error("blueprint card read failed:", error.message);
  const row = data as { created_at: string; data: unknown } | null;
  const blueprint = row ? blueprintFromSaved(row.data) : null;
  const aiStages = blueprint ? blueprint.stages.filter((stage) => isAssistantActor(stage.actor)).length : 0;

  return (
    <DataCard title="파이프라인 설계도" ready={!!blueprint}>
      {blueprint && row ? (
        <>
          <p className="text-sm font-semibold">{blueprint.task}</p>
          <p className="mt-1 text-sm text-gray-700">
            단계 {blueprint.stages.length}개 · AI가 맡는 단계 {aiStages}개 · 확인 지점 {blueprint.checkpoints.length}개
          </p>
          <p className="mt-1 text-xs text-gray-500">{formatDate(row.created_at) ?? ""} 제출</p>
        </>
      ) : (
        <p className="text-sm text-gray-500">3주차 수업에서 그려요.</p>
      )}
      <Link href="/app/lab/blueprint" className={DATA_CARD_BUTTON}>
        {blueprint ? "설계도 열기" : "설계도 그리러 가기"}
      </Link>
    </DataCard>
  );
}

/** Full-width, 44px "…하러 가기" / "… 열기" button at the foot of a data card. */
const DATA_CARD_BUTTON =
  "nb-btn nb-btn-white mt-3 flex min-h-11 w-full items-center justify-center px-4 text-sm";

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
