// /staff/cohort/[id] — one cohort: its join code, which weeks are open,
// add a learner by email, and the roster with Week 1 to 3 progress.
// Phase 2c adds, at the top, the "기준선 확인 대기" queue (countersign inline,
// about 20 seconds a learner) and the "트랙 확정" block, and Week 2 and 3
// roster columns read from cohort_week_signals() (one aggregate row per
// learner; event rows are never counted here, C7).
//
// Every read uses the staff member's own client (RLS staff select policies on
// cohort, enrollment, user_profile, profile_event; cohort_week_signals is
// security invoker). The write controls post to /api/staff/cohort/[id]/*
// and /api/staff/learner/[userId]/countersign and /track.
//
// The queue signs each waiting baseline's evidence (own-folder paths only,
// one createSignedUrls call, same rule as the learner page), so the
// instructor sees the image before countersigning. After a countersign the
// page reloads as ?countersigned=<userId> and says so at the top of the
// queue. A confirmed track counts only when the newest track_confirmed event
// names this cohort, the rule the learner's own pages use
// (getMyConfirmedTrack), so a confirmation from an earlier cohort is not
// shown as current here (cohort_week_signals' confirmed_track is not used).

import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { isWeekOpen, type Cohort, type Enrollment } from "@/lib/courses/types";
import { EVENT_TYPES } from "@/lib/profile/events";
import type { UserProfile } from "@/lib/profile/types";
import { requireStaffPage } from "@/components/staff/guard";
import {
  COHORT_STATUS_LABEL,
  ENROLLMENT_STATUS_LABEL,
  cohortTrackLabel,
  fmtDate,
  fmtDateTime,
  fmtDay,
  isUuid,
  pathLabel,
  isConfirmTrack,
  surveyTrackCode,
  surveyTrackLabel,
  weekStates,
} from "@/components/staff/format";
import { ASSISTANT_LABELS, parseBaselineSnapshot } from "@/components/lab/rules-week3";
import type { AssistantId } from "@/lib/profile/events";
import type { BaselineSnapshot } from "@/lib/profile/types";
import type { TrackCode } from "@/lib/resources/types";
import { Card, Chip, Empty, Facts, ScrollTable } from "@/components/staff/ui";
import CopyCode from "@/components/staff/CopyCode";
import EnrollForm from "@/components/staff/EnrollForm";
import OpenWeekControl from "@/components/staff/OpenWeekControl";
import StatusControl from "@/components/staff/StatusControl";
import BaselineView from "@/components/staff/BaselineView";
import CountersignButton from "@/components/staff/CountersignButton";
import CountersignedNotice from "@/components/staff/CountersignedNotice";
import TrackConfirmControl from "@/components/staff/TrackConfirmControl";

type RosterProfile = Pick<
  UserProfile,
  "user_id" | "display_name" | "company_name" | "job_title" | "track" | "path" | "baseline"
>;

/** One row of cohort_week_signals() (migration 0011). */
interface WeekSignals {
  user_id: string;
  harness_count: number;
  harness_doc_types: string[] | null;
  correction_count: number;
  workspace_at: string | null;
  assistant: string | null;
  workspace_ready: boolean | null;
  uploads_blocked: boolean | null;
  blueprint_count: number;
  dry_run_minutes: number | null;
  dry_run_at: string | null;
  baseline_event_id: number | null;
  baseline_locked_at: string | null;
  countersigned_at: string | null;
  confirmed_track: string | null;
  track_confirmed_at: string | null;
}

const WEEK1_LIMIT = 5000;
const TRACK_EVENT_LIMIT = 2000;
const EVIDENCE_BUCKET = "evidence";
const SIGNED_URL_SECONDS = 600; // 10 minutes, as on the learner page

function assistantLabel(id: string | null): string {
  if (!id) return "";
  return ASSISTANT_LABELS[id as AssistantId] ?? id;
}

interface Week1 {
  workMap: boolean;
  drill: boolean;
  timeLogs: number;
}

const WEEK1_TYPES = [
  EVENT_TYPES.work_map_submitted,
  EVENT_TYPES.drill_completed,
  EVENT_TYPES.time_log_entry,
];

export default async function StaffCohortPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ countersigned?: string | string[] }>;
}) {
  const session = await requireStaffPage();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  // Set by CountersignButton after a countersign from the queue: whose baseline.
  const countersignedParam = (await searchParams).countersigned;
  const justCountersigned =
    typeof countersignedParam === "string" && isUuid(countersignedParam) ? countersignedParam : null;

  const supabase = await supabaseServer();
  const [cohortResult, enrollmentResult] = await Promise.all([
    supabase.from("cohort").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("enrollment")
      .select("cohort_id, user_id, status, enrolled_at")
      .eq("cohort_id", id)
      .order("enrolled_at", { ascending: true }),
  ]);
  const cohort = cohortResult.data as Cohort | null;
  if (!cohort) notFound();
  const enrollments = (enrollmentResult.data ?? []) as Enrollment[];
  const userIds = enrollments.map((e) => e.user_id);

  const profiles = new Map<string, RosterProfile>();
  const week1 = new Map<string, Week1>();
  const signals = new Map<string, WeekSignals>();
  // The newest track_confirmed per learner, kept only when it names this cohort.
  const confirmedHere = new Map<string, { track: TrackCode; at: string }>();
  let failed = !!enrollmentResult.error;
  let signalsFailed = false;
  let week1Truncated = false;
  if (userIds.length > 0) {
    const [profileResult, eventResult, signalResult, trackResult] = await Promise.all([
      supabase
        .from("user_profile")
        .select("user_id, display_name, company_name, job_title, track, path, baseline")
        .in("user_id", userIds),
      supabase
        .from("profile_event")
        .select("user_id, type")
        .in("user_id", userIds)
        .in("type", WEEK1_TYPES)
        .limit(WEEK1_LIMIT),
      supabase.rpc("cohort_week_signals", { p_cohort: id }),
      supabase
        .from("profile_event")
        .select("user_id, created_at, track:data->>track, cohort_id:data->>cohort_id")
        .in("user_id", userIds)
        .eq("type", EVENT_TYPES.track_confirmed)
        .order("id", { ascending: false })
        .limit(TRACK_EVENT_LIMIT),
    ]);
    failed = failed || !!profileResult.error || !!eventResult.error;
    // A missing function (0011 not applied) shows a note, not a crash.
    signalsFailed = !!signalResult.error;
    if (signalResult.error) console.error("staff cohort: cohort_week_signals failed:", signalResult.error.message);
    for (const row of (signalResult.data ?? []) as WeekSignals[]) signals.set(row.user_id, row);
    if (trackResult.error) console.error("staff cohort: track confirmations read failed:", trackResult.error.message);
    const seen = new Set<string>();
    for (const row of (trackResult.data ?? []) as {
      user_id: string;
      created_at: string;
      track: string | null;
      cohort_id: string | null;
    }[]) {
      if (seen.has(row.user_id)) continue; // newest first: the first row is the current confirmation
      seen.add(row.user_id);
      if (row.cohort_id === id && isConfirmTrack(row.track)) {
        confirmedHere.set(row.user_id, { track: row.track, at: row.created_at });
      }
    }
    week1Truncated = (eventResult.data ?? []).length >= WEEK1_LIMIT;
    for (const profile of (profileResult.data ?? []) as RosterProfile[]) {
      profiles.set(profile.user_id, profile);
    }
    for (const event of (eventResult.data ?? []) as { user_id: string; type: string }[]) {
      const progress = week1.get(event.user_id) ?? { workMap: false, drill: false, timeLogs: 0 };
      if (event.type === EVENT_TYPES.work_map_submitted) progress.workMap = true;
      else if (event.type === EVENT_TYPES.drill_completed) progress.drill = true;
      else if (event.type === EVENT_TYPES.time_log_entry) progress.timeLogs += 1;
      week1.set(event.user_id, progress);
    }
  }

  const weeks = weekStates(cohort);
  const activeCount = enrollments.filter((e) => e.status !== "dropped").length;
  const week3Open = isWeekOpen(cohort, 3);
  const nameOf = (userId: string) => profiles.get(userId)?.display_name?.trim() || "이름 없음";

  // The countersign queue: active learners whose newest lock has no
  // countersign (Week 4 stragglers included). The button posts the
  // baseline_locked event id of the snapshot shown, so a newer lock is
  // refused as stale rather than stamped unseen.
  const active = enrollments.filter((e) => e.status === "active");
  const waiting: { userId: string; baseline: BaselineSnapshot }[] = [];
  const unlocked: string[] = [];
  for (const enrollment of active) {
    const signal = signals.get(enrollment.user_id);
    const baseline = parseBaselineSnapshot(profiles.get(enrollment.user_id)?.baseline);
    if (baseline && !baseline.countersigned_at) waiting.push({ userId: enrollment.user_id, baseline });
    else if (!baseline && !signal?.baseline_event_id) unlocked.push(enrollment.user_id);
  }
  waiting.sort((a, b) => Date.parse(a.baseline.signed_at) - Date.parse(b.baseline.signed_at));
  const showWeek3Blocks = week3Open || waiting.length > 0;

  // Evidence for the waiting baselines: sign only files inside each
  // learner's own folder, in one call (staff select policy on the bucket).
  const evidencePaths = Array.from(
    new Set(
      waiting.flatMap(({ userId, baseline }) =>
        typeof baseline.evidence_ref === "string" && baseline.evidence_ref.startsWith(`${userId}/`)
          ? [baseline.evidence_ref]
          : [],
      ),
    ),
  );
  const signedUrls = new Map<string, string>();
  if (evidencePaths.length > 0) {
    const { data: signed, error: signError } = await supabase.storage
      .from(EVIDENCE_BUCKET)
      .createSignedUrls(evidencePaths, SIGNED_URL_SECONDS);
    if (signError) console.error("staff cohort: evidence signing failed:", signError.message);
    for (const item of signed ?? []) {
      if (item.path && item.signedUrl && !item.error) signedUrls.set(item.path, item.signedUrl);
    }
  }

  // The countersign just made from the queue, once it shows as stamped.
  const stampedName =
    justCountersigned && parseBaselineSnapshot(profiles.get(justCountersigned)?.baseline)?.countersigned_at
      ? nameOf(justCountersigned)
      : null;

  return (
    <main className="flex w-full flex-col gap-5">
      <Link href="/staff" className="text-sm font-semibold text-gray-700 underline underline-offset-4">
        ← 코호트 목록
      </Link>

      {/* 1. Cohort header and the join code */}
      <section className="nb-card flex flex-col gap-4 px-5 py-5">
        <div className="flex items-start justify-between gap-3">
          <h1 className="min-w-0 text-2xl font-extrabold leading-snug tracking-tight">{cohort.name}</h1>
          <Chip tone={cohort.status === "running" ? "done" : cohort.status === "done" ? "muted" : "warn"}>
            {COHORT_STATUS_LABEL[cohort.status] ?? cohort.status}
          </Chip>
        </div>
        <div>
          <p className="mb-1.5 text-xs font-bold text-gray-500">참여 코드</p>
          <CopyCode code={cohort.code} size="lg" />
          <p className="mt-2 text-sm leading-relaxed text-gray-700">
            수업에서 이 코드를 알려 주세요. 수강생이 코스 탭에 입력하면 바로 이 명단에 들어와요.
          </p>
        </div>
        <Facts
          items={[
            { label: "트랙", value: cohortTrackLabel(cohort.track_code) },
            { label: "시작일", value: fmtDay(cohort.starts_on) },
            { label: "수업 일정", value: cohort.schedule_note || "정하지 않음" },
            { label: "장소", value: cohort.venue || "정하지 않음" },
            { label: "만든 사람", value: cohort.created_by || "기록 없음" },
            { label: "만든 날", value: fmtDate(cohort.created_at) },
          ]}
        />
      </section>

      {/* 2. Week 3: the countersign queue, then the track block */}
      {showWeek3Blocks && (
        <Card title={`기준선 확인 대기 (${waiting.length}명)`} aside="먼저 확정한 분부터 보여 드려요.">
          {signalsFailed && (
            <p role="alert" className="mb-3 text-sm text-red-600">
              주차별 기록을 불러오지 못했어요. 새로고침해 주세요.
            </p>
          )}
          {stampedName && (
            <div className="mb-3">
              <CountersignedNotice message={`${stampedName} 님 기준선 확인을 마쳤어요.`} />
            </div>
          )}
          {waiting.length === 0 ? (
            <Empty>확인을 기다리는 기준선이 없어요.</Empty>
          ) : (
            <ul className="flex flex-col gap-2">
              {waiting.map(({ userId, baseline }) => (
                <li key={userId} className="nb-flat">
                  <details>
                    <summary className="flex min-h-11 cursor-pointer flex-wrap items-center gap-x-2 gap-y-1 px-4 py-2.5">
                      <span className="text-sm font-extrabold">{nameOf(userId)}</span>
                      <span className="min-w-0 flex-1 truncate text-sm text-gray-700">{baseline.task}</span>
                      <span className="text-xs text-gray-500">{fmtDateTime(baseline.signed_at)} 확정</span>
                      {/* A flex summary loses the disclosure marker, so say it. */}
                      <span className="text-xs font-semibold underline underline-offset-4">내용 보기</span>
                    </summary>
                    <div className="flex flex-col gap-3 border-t border-[var(--nb-line)] px-4 py-3">
                      <BaselineView
                        baseline={baseline}
                        evidenceUrl={baseline.evidence_ref ? signedUrls.get(baseline.evidence_ref) : undefined}
                        learnerHref={`/staff/learner/${userId}`}
                      />
                      {session.user.id === userId ? (
                        <p className="text-sm text-gray-500">본인 기준선은 다른 강사가 확인해요.</p>
                      ) : !week3Open ? (
                        <p className="text-sm text-gray-500">3주차가 열리면 확인할 수 있어요.</p>
                      ) : (
                        <CountersignButton
                          userId={userId}
                          learnerName={nameOf(userId)}
                          baselineEventId={baseline.locked_event_id}
                        />
                      )}
                      <Link
                        href={`/staff/learner/${userId}`}
                        className="text-xs font-semibold text-gray-700 underline underline-offset-4"
                      >
                        수강생 기록 전체 보기
                      </Link>
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          )}
          {week3Open && unlocked.length > 0 && (
            <div className="mt-4 border-t border-[var(--nb-line)] pt-3">
              <p className="mb-2 text-xs font-extrabold text-gray-500">아직 확정하지 않은 분 ({unlocked.length}명)</p>
              <ul className="flex flex-col gap-1.5">
                {unlocked.map((userId) => (
                  <li key={userId} className="flex flex-wrap items-center gap-2 text-sm">
                    <Link href={`/staff/learner/${userId}`} className="font-semibold underline underline-offset-4">
                      {nameOf(userId)}
                    </Link>
                    <Chip tone="muted">체크리스트 미완성 · 4주차에 확인</Chip>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}

      {showWeek3Blocks && active.length > 0 && (
        <Card title="트랙 확정" aside="4주차부터 들을 트랙이에요. 진단 트랙과 달라도 돼요.">
          <ul className="flex flex-col gap-3">
            {active.map((enrollment) => {
              const profile = profiles.get(enrollment.user_id);
              const confirmedRow = confirmedHere.get(enrollment.user_id) ?? null;
              const confirmed = confirmedRow?.track ?? null;
              return (
                <li
                  key={enrollment.user_id}
                  className="flex flex-col gap-2 border-b border-gray-200 pb-3 last:border-b-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-extrabold">{nameOf(enrollment.user_id)}</p>
                    <p className="text-xs text-gray-500">
                      진단 {surveyTrackLabel(profile?.track)}
                      {confirmedRow
                        ? ` · ${fmtDate(confirmedRow.at)} 확정`
                        : " · 아직 확정 안 함"}
                    </p>
                  </div>
                  <TrackConfirmControl
                    userId={enrollment.user_id}
                    learnerName={nameOf(enrollment.user_id)}
                    confirmed={confirmed}
                    suggested={surveyTrackCode(profile?.track)}
                  />
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {/* 3. Weeks: open by date versus opened early by staff */}
      <Card title="주차 열기">
        <p className="mb-3 text-sm leading-relaxed text-gray-700">
          {cohort.starts_on
            ? "시작일부터 매주 한 주차씩 저절로 열려요. 더 일찍 보여 주고 싶은 주차가 있을 때만 아래에서 미리 열어 주세요."
            : "시작일이 없어서 저절로 열리는 주차가 없어요. 수업에 맞춰 아래에서 직접 열어 주세요."}
        </p>
        <ol className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {weeks.map((w) => (
            <li
              key={w.week}
              className={`nb-flat px-2.5 py-2 ${
                w.by === "date" ? "bg-[var(--nb-lime)]" : w.by === "override" ? "bg-[var(--nb-cyan)]" : ""
              }`}
            >
              <p className="text-sm font-extrabold">{w.week}주차</p>
              <p className={`text-[11px] font-semibold ${w.open ? "text-[var(--nb-ink)]" : "text-gray-500"}`}>
                {w.by === "date" ? "날짜가 되어 열림" : w.by === "override" ? "미리 열어 둠" : "닫힘"}
              </p>
              <p className={`text-[11px] ${w.open ? "text-[var(--nb-ink)]" : "text-gray-500"}`}>
                {w.opensOn ? `${w.opensOn}${w.by === "date" ? "부터" : " 예정"}` : "날짜 없음"}
              </p>
            </li>
          ))}
        </ol>
        <OpenWeekControl cohortId={cohort.id} openWeek={cohort.open_week} />
        <div className="mt-4">
          <StatusControl cohortId={cohort.id} status={cohort.status} />
        </div>
        <p className="mt-3 text-xs leading-relaxed text-gray-500">
          {cohort.open_week > 0
            ? `지금은 ${cohort.open_week}주차까지 미리 열어 둔 상태예요. `
            : "지금은 미리 열어 둔 주차가 없어요. "}
          숫자를 낮춰도 날짜가 지나 이미 열린 주차는 닫히지 않아요.
        </p>
      </Card>

      {/* 4. Add a learner by email */}
      <Card title="수강생 직접 추가">
        <p className="mb-3 text-sm leading-relaxed text-gray-700">
          코드를 입력하기 어려운 분은 가입한 이메일로 여기서 바로 추가할 수 있어요. 진단과 회원가입을 마친
          분만 추가돼요.
        </p>
        <EnrollForm cohortId={cohort.id} />
      </Card>

      {/* 5. Roster */}
      <Card title={`수강생 명단 (${activeCount}명)`} aside="이름을 누르면 그 수강생의 기록이 열려요.">
        {failed && (
          <p role="alert" className="mb-3 text-sm text-red-600">
            명단을 다 불러오지 못했어요. 새로고침해 주세요.
          </p>
        )}
        {signalsFailed && !showWeek3Blocks && (
          <p role="alert" className="mb-3 text-sm text-red-600">
            2주차와 3주차 기록을 불러오지 못했어요. 새로고침해 주세요.
          </p>
        )}
        {week1Truncated && <p className="mb-3 text-xs text-gray-500">1주차 기록이 많아 일부만 불러왔어요.</p>}
        {enrollments.length === 0 ? (
          <Empty>아직 등록한 수강생이 없어요.</Empty>
        ) : (
          <ScrollTable
            head={["이름", "회사 · 직함", "진단 트랙", "구분", "등록일", "1주차", "2주차", "3주차"]}
            minWidth="min-w-[84rem]"
          >
            {enrollments.map((enrollment) => {
              const profile = profiles.get(enrollment.user_id);
              const progress = week1.get(enrollment.user_id) ?? { workMap: false, drill: false, timeLogs: 0 };
              const signal = signals.get(enrollment.user_id);
              const confirmedRow = confirmedHere.get(enrollment.user_id) ?? null;
              const affiliation = [profile?.company_name, profile?.job_title]
                .map((v) => v?.trim())
                .filter(Boolean)
                .join(" · ");
              return (
                <tr key={enrollment.user_id}>
                  <td className="whitespace-nowrap font-bold">
                    <Link
                      href={`/staff/learner/${enrollment.user_id}`}
                      className="underline underline-offset-4"
                    >
                      {profile?.display_name?.trim() || "이름 없음"}
                    </Link>
                    {enrollment.status !== "active" && (
                      <span className="ml-2 align-middle">
                        <Chip tone={enrollment.status === "completed" ? "info" : "muted"}>
                          {ENROLLMENT_STATUS_LABEL[enrollment.status] ?? enrollment.status}
                        </Chip>
                      </span>
                    )}
                  </td>
                  <td className="text-gray-700">{affiliation || "적지 않음"}</td>
                  <td className="whitespace-nowrap">{profile ? surveyTrackLabel(profile.track) : "프로필 없음"}</td>
                  <td className="whitespace-nowrap">{pathLabel(profile?.path)}</td>
                  <td className="whitespace-nowrap">{fmtDate(enrollment.enrolled_at)}</td>
                  <td>
                    <div className="flex flex-wrap gap-1.5">
                      <Chip tone={progress.workMap ? "done" : "muted"}>
                        {progress.workMap ? "워크맵 제출" : "워크맵 미제출"}
                      </Chip>
                      <Chip tone={progress.drill ? "done" : "muted"}>
                        {progress.drill ? "드릴 완료" : "드릴 미완료"}
                      </Chip>
                      <Chip tone={progress.timeLogs > 0 ? "done" : "muted"}>시간 기록 {progress.timeLogs}건</Chip>
                    </div>
                  </td>
                  <td>
                    {signal ? (
                      <div className="flex flex-col gap-1">
                        <div className="flex flex-wrap gap-1.5">
                          <Chip tone={signal.harness_count > 0 ? "done" : "muted"}>하네스 {signal.harness_count}개</Chip>
                          <Chip tone={signal.correction_count > 0 ? "done" : "muted"}>
                            수정 기록 {signal.correction_count}건
                          </Chip>
                        </div>
                        {(signal.harness_doc_types ?? []).length > 0 && (
                          <p className="text-xs text-gray-500">{(signal.harness_doc_types ?? []).join(", ")}</p>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-500">{enrollment.status === "active" ? "기록 없음" : ""}</span>
                    )}
                  </td>
                  <td>
                    {signal ? (
                      <div className="flex flex-col gap-1">
                        <div className="flex flex-wrap gap-1.5">
                          <Chip tone={!signal.workspace_at ? "muted" : signal.workspace_ready ? "done" : "warn"}>
                            {!signal.workspace_at
                              ? "작업 공간 미확인"
                              : signal.workspace_ready
                                ? "작업 공간 준비됨"
                                : "작업 공간 다시 확인 필요"}
                          </Chip>
                          {signal.uploads_blocked && <Chip tone="warn">업로드 막힘</Chip>}
                          <Chip tone={signal.blueprint_count > 0 ? "done" : "muted"}>
                            설계도 {signal.blueprint_count}번 제출
                          </Chip>
                          {signal.dry_run_minutes !== null && (
                            <Chip tone="info">시험 실행 {signal.dry_run_minutes}분</Chip>
                          )}
                          <Chip
                            tone={!signal.baseline_event_id ? "muted" : signal.countersigned_at ? "done" : "warn"}
                          >
                            {!signal.baseline_event_id
                              ? "기준선 미확정"
                              : signal.countersigned_at
                                ? "기준선 확인 완료"
                                : "기준선 확인 대기"}
                          </Chip>
                          {confirmedRow && (
                            <Chip tone="done">확정 트랙 {cohortTrackLabel(confirmedRow.track)}</Chip>
                          )}
                        </div>
                        {signal.assistant && <p className="text-xs text-gray-500">{assistantLabel(signal.assistant)}</p>}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-500">{enrollment.status === "active" ? "기록 없음" : ""}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </ScrollTable>
        )}
      </Card>
    </main>
  );
}
