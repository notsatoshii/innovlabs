// /staff/learner/[userId] — everything staff may see about one learner
// (Eric, 2026-09-09: instructors have full read access; learners never see
// each other). Identity, survey answers, the Week 1 work (Work Map, drill,
// time log with evidence), instructor notes, and the raw event log.
//
// Every read uses the staff member's own client: the RLS staff select
// policies on user_profile, profile_event, enrollment, cohort and the
// evidence bucket are what allow it. The only write on this page is the
// note form → POST /api/staff/learner/[userId]/note.
//
// Not shown: the learner's email. It lives in auth.users, which no client
// can read; showing it would need the service role.

import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import type { Cohort, Enrollment } from "@/lib/courses/types";
import { EVENT_TYPES } from "@/lib/profile/events";
import type { UserProfile } from "@/lib/profile/types";
import { requireStaffPage } from "@/components/staff/guard";
import {
  ENROLLMENT_STATUS_LABEL,
  eventLabel,
  fmtDate,
  fmtDateTime,
  isUuid,
  jsonPreview,
  pathLabel,
  surveyTrackLabel,
} from "@/components/staff/format";
import { employeeSurveyRows, rawSurveyRows, taskHourRows } from "@/components/staff/survey";
import { Card, Chip, Empty, Facts, ScrollTable } from "@/components/staff/ui";
import NoteForm from "@/components/staff/NoteForm";
import WorkMapView, { asWorkMap } from "@/components/staff/WorkMapView";

interface EventRow {
  id: number;
  created_at: string;
  type: string;
  visibility: string;
  data: unknown;
}

const EVENT_COLUMNS = "id, created_at, type, visibility, data";
const RAW_EVENT_LIMIT = 200;
const EVIDENCE_BUCKET = "evidence";
const SIGNED_URL_SECONDS = 600; // 10 minutes

const ARTIFACT_TYPES = [
  EVENT_TYPES.work_map_submitted,
  EVENT_TYPES.drill_completed,
  EVENT_TYPES.time_log_entry,
  EVENT_TYPES.instructor_note,
];

const TRACK_VIA_LABEL: Record<string, string> = {
  auto: "진단 결과로 배정",
  user_choice: "본인이 선택",
  skip_default: "선택을 건너뛰어 기본값",
};

const DEPTH_LABEL: Record<string, string> = {
  full_agent: "설치가 자유로움 (에이전트 경로 가능)",
  browser_only: "브라우저 중심",
};

const METHOD_LABEL: Record<string, string> = {
  before: "원래 하던 방식",
  harness: "하네스 사용",
  pipeline: "파이프라인 사용",
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

/** First non-empty string among the given keys (payload names drifted between plans). */
function text(data: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "boolean") return value ? "찾았어요" : "찾지 못했어요";
  }
  return "";
}

function minutesBetween(start: unknown, end: unknown): number | null {
  if (typeof start !== "string" || typeof end !== "string") return null;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Number.isFinite(ms) && ms >= 0 ? Math.round(ms / 60000) : null;
}

export default async function StaffLearnerPage({ params }: { params: Promise<{ userId: string }> }) {
  await requireStaffPage();
  const { userId } = await params;
  if (!isUuid(userId)) notFound();

  const supabase = await supabaseServer();
  const [profileResult, artifactResult, rawResult, enrollmentResult] = await Promise.all([
    supabase.from("user_profile").select("*").eq("user_id", userId).maybeSingle(),
    supabase
      .from("profile_event")
      .select(EVENT_COLUMNS)
      .eq("user_id", userId)
      .in("type", ARTIFACT_TYPES)
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("profile_event")
      .select(EVENT_COLUMNS)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(RAW_EVENT_LIMIT),
    supabase.from("enrollment").select("cohort_id, user_id, status, enrolled_at").eq("user_id", userId),
  ]);
  const profile = profileResult.data as UserProfile | null;
  if (!profile) notFound();

  const artifacts = (artifactResult.data ?? []) as EventRow[];
  const rawEvents = (rawResult.data ?? []) as EventRow[];
  const enrollments = (enrollmentResult.data ?? []) as Enrollment[];
  const failed = !!artifactResult.error || !!rawResult.error || !!enrollmentResult.error;

  const cohortIds = enrollments.map((e) => e.cohort_id);
  const cohortResult =
    cohortIds.length > 0 ? await supabase.from("cohort").select("id, name").in("id", cohortIds) : { data: [] };
  const cohortNames = new Map(
    ((cohortResult.data ?? []) as Pick<Cohort, "id" | "name">[]).map((c) => [c.id, c.name]),
  );

  // Newest first throughout.
  const workMapEvents = artifacts.filter((e) => e.type === EVENT_TYPES.work_map_submitted);
  const drillEvents = artifacts.filter((e) => e.type === EVENT_TYPES.drill_completed);
  const timeLogs = artifacts.filter((e) => e.type === EVENT_TYPES.time_log_entry);
  const notes = artifacts.filter((e) => e.type === EVENT_TYPES.instructor_note);

  // The event carries the full artifact; the profile column is the derived copy.
  const workMap = asWorkMap(workMapEvents[0]?.data) ?? asWorkMap(profile.work_map);
  const workMapAt = workMapEvents[0]?.created_at ?? workMap?.submitted_at ?? null;
  const drill = drillEvents[0] ? record(drillEvents[0].data) : null;

  // Evidence: sign only files inside this learner's own folder.
  const evidencePaths = Array.from(
    new Set(
      timeLogs
        .map((e) => record(e.data).evidence_ref)
        .filter((ref): ref is string => typeof ref === "string" && ref.startsWith(`${userId}/`)),
    ),
  );
  const signedUrls = new Map<string, string>();
  if (evidencePaths.length > 0) {
    const { data: signed } = await supabase.storage
      .from(EVIDENCE_BUCKET)
      .createSignedUrls(evidencePaths, SIGNED_URL_SECONDS);
    for (const item of signed ?? []) {
      if (item.path && item.signedUrl && !item.error) signedUrls.set(item.path, item.signedUrl);
    }
  }

  const core = record(profile.core);
  const isEmployee = profile.path === "employee";
  const surveyRows = isEmployee ? employeeSurveyRows(core) : rawSurveyRows(core);
  const hourRows = isEmployee ? taskHourRows(core) : [];
  const displayName = profile.display_name?.trim() || "이름 없음";
  const affiliation = [profile.company_name, profile.job_title]
    .map((v) => v?.trim())
    .filter(Boolean)
    .join(" · ");
  const drillDifferences = drill && Array.isArray(drill.differences) ? drill.differences.map(String) : [];

  return (
    <main className="flex w-full flex-col gap-5">
      <Link href="/staff" className="text-sm font-semibold text-gray-700 underline underline-offset-4">
        ← 코호트 목록
      </Link>

      {/* 1. Identity */}
      <section className="nb-card px-5 py-5">
        <p className="mb-1 text-xs font-extrabold text-[var(--nb-pink-deep)]">수강생</p>
        <h1 className="text-2xl font-extrabold leading-snug tracking-tight">{displayName}</h1>
        {affiliation && <p className="mt-1 text-sm text-gray-700">{affiliation}</p>}
        <div className="mt-4">
          <Facts
            items={[
              { label: "구분", value: pathLabel(profile.path) },
              {
                label: "진단 트랙",
                value: profile.track
                  ? `${surveyTrackLabel(profile.track)}${
                      profile.track_via && TRACK_VIA_LABEL[profile.track_via]
                        ? ` (${TRACK_VIA_LABEL[profile.track_via]})`
                        : ""
                    }`
                  : "트랙 없음",
              },
              {
                label: "PC 환경",
                value: (profile.depth_flag && DEPTH_LABEL[profile.depth_flag]) || "확인 안 됨",
              },
              { label: "가입일", value: fmtDate(profile.created_at) },
              { label: "동의", value: `${fmtDate(profile.consented_at)} · ${profile.consent_version}` },
              { label: "소식 수신", value: profile.marketing_consent ? "동의함" : "동의 안 함" },
              { label: "소속 코드", value: profile.org_code || "없음" },
              {
                label: "맞춤 리포트",
                value: profile.one_pager_generated_at
                  ? `${fmtDate(profile.one_pager_generated_at)}에 생성`
                  : "아직 없음",
              },
              {
                label: "코호트",
                value:
                  enrollments.length === 0 ? (
                    "등록한 코호트가 없어요"
                  ) : (
                    <ul className="flex flex-col gap-1">
                      {enrollments.map((e) => (
                        <li key={e.cohort_id}>
                          <Link href={`/staff/cohort/${e.cohort_id}`} className="font-semibold underline underline-offset-4">
                            {cohortNames.get(e.cohort_id) ?? "이름 없는 코호트"}
                          </Link>{" "}
                          <span className="text-gray-500">
                            {ENROLLMENT_STATUS_LABEL[e.status] ?? e.status} · {fmtDate(e.enrolled_at)} 등록
                          </span>
                        </li>
                      ))}
                    </ul>
                  ),
              },
            ]}
          />
        </div>
        {failed && (
          <p role="alert" className="mt-4 text-sm text-red-600">
            기록을 다 불러오지 못했어요. 새로고침해 주세요.
          </p>
        )}
      </section>

      {/* 2. Survey answers (from the profile's core snapshot) */}
      <Card title="진단 응답">
        {surveyRows.length === 0 && hourRows.length === 0 ? (
          <Empty>저장된 진단 응답이 없어요.</Empty>
        ) : (
          <div className="flex flex-col gap-4">
            {hourRows.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-extrabold">업무별 주당 시간</h3>
                <ul className="grid grid-cols-1 gap-x-8 gap-y-1.5 text-sm lg:grid-cols-2">
                  {hourRows.map((row) => (
                    <li key={row.id} className="flex justify-between gap-3 border-b border-gray-200 pb-1.5">
                      <span className="min-w-0">{row.label}</span>
                      <span className="shrink-0 font-bold">{row.hours}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <dl className="flex flex-col gap-2.5 text-sm">
              {surveyRows.map((row) => (
                <div key={row.label} className="flex flex-col gap-0.5 lg:flex-row lg:gap-4">
                  <dt className="shrink-0 text-gray-500 lg:w-56">{row.label}</dt>
                  <dd className="min-w-0 flex-1 whitespace-pre-wrap break-words">{row.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </Card>

      {/* 3. Work Map */}
      <Card
        title="워크맵"
        aside={
          workMap
            ? `${fmtDateTime(workMapAt)} 제출${
                workMapEvents.length > 1 ? ` · 모두 ${workMapEvents.length}번 제출했고, 가장 최근 것이에요` : ""
              }`
            : undefined
        }
      >
        {workMap ? <WorkMapView workMap={workMap} /> : <Empty>아직 워크맵을 제출하지 않았어요.</Empty>}
      </Card>

      {/* 4. Drill */}
      <Card title="기본기 드릴" aside={drillEvents[0] ? `${fmtDateTime(drillEvents[0].created_at)} 완료` : undefined}>
        {drill ? (
          <dl className="flex flex-col gap-3 text-sm">
            {text(drill, "task") && <DrillRow label="드릴에 쓴 업무">{text(drill, "task")}</DrillRow>}
            <DrillRow label="1차와 2차 결과에서 찾은 차이">
              {drillDifferences.length > 0 ? (
                <ul className="list-disc pl-5">
                  {drillDifferences.map((difference, index) => (
                    <li key={index}>{difference}</li>
                  ))}
                </ul>
              ) : typeof drill.differences_count === "number" ? (
                `${drill.differences_count}가지`
              ) : (
                "적지 않았어요"
              )}
            </DrillRow>
            <DrillRow label="AI가 지어내거나 틀린 부분">
              {text(drill, "invention", "invention_found") || "적지 않았어요"}
            </DrillRow>
            <DrillRow label="사람이 마저 해야 할 일">
              {text(drill, "leftForHuman", "left_for_human", "whats_left_for_human") || "적지 않았어요"}
            </DrillRow>
          </dl>
        ) : (
          <Empty>아직 드릴을 마치지 않았어요.</Empty>
        )}
      </Card>

      {/* 5. Time log */}
      <Card
        title={`시간 기록 (${timeLogs.length}건)`}
        aside={evidencePaths.length > 0 ? "증빙 이미지는 10분 동안 열려요. 안 열리면 새로고침해 주세요." : undefined}
      >
        {timeLogs.length === 0 ? (
          <Empty>아직 남긴 시간 기록이 없어요.</Empty>
        ) : (
          <ScrollTable head={["업무", "방식", "시작", "걸린 시간", "끊긴 횟수", "증빙"]} minWidth="min-w-[48rem]">
            {timeLogs.map((event) => {
              const data = record(event.data);
              const minutes = minutesBetween(data.started_at, data.ended_at);
              const ref = typeof data.evidence_ref === "string" ? data.evidence_ref : null;
              const url = ref ? signedUrls.get(ref) : undefined;
              return (
                <tr key={event.id}>
                  <td>{text(data, "task") || "업무 이름 없음"}</td>
                  <td className="whitespace-nowrap">
                    {METHOD_LABEL[String(data.method)] ?? String(data.method ?? "")}
                  </td>
                  <td className="whitespace-nowrap">
                    {fmtDateTime(typeof data.started_at === "string" ? data.started_at : event.created_at)}
                  </td>
                  <td className="whitespace-nowrap font-bold">{minutes === null ? "알 수 없음" : `${minutes}분`}</td>
                  <td className="whitespace-nowrap">
                    {typeof data.interruptions === "number" ? `${data.interruptions}번` : "기록 없음"}
                  </td>
                  <td>
                    {url ? (
                      <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2">
                        {/* Signed URL to a private bucket: next/image would need the Supabase host configured. */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt={`${text(data, "task") || "시간 기록"} 증빙 이미지`}
                          loading="lazy"
                          className="h-14 w-14 rounded-md border border-[var(--nb-line)] object-cover"
                        />
                        <span className="whitespace-nowrap text-xs font-semibold underline underline-offset-4">
                          크게 보기
                        </span>
                      </a>
                    ) : ref ? (
                      <span className="text-xs text-gray-500">이미지를 열 수 없어요</span>
                    ) : (
                      <span className="text-xs text-gray-500">없음</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </ScrollTable>
        )}
      </Card>

      {/* 6. Instructor notes (staff-only events) */}
      <Card title="강사 메모" aside="수강생에게는 보이지 않아요. 운영진만 봐요.">
        <NoteForm userId={userId} />
        <div className="mt-5 border-t border-[var(--nb-line)] pt-4">
          {notes.length === 0 ? (
            <Empty>아직 남긴 메모가 없어요.</Empty>
          ) : (
            <ul className="flex flex-col gap-3">
              {notes.map((event) => {
                const data = record(event.data);
                return (
                  <li key={event.id} className="nb-flat px-4 py-3">
                    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{text(data, "note")}</p>
                    <p className="mt-2 text-xs text-gray-500">
                      {text(data, "by") || "작성자 기록 없음"} · {fmtDateTime(event.created_at)}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Card>

      {/* 7. Raw event log */}
      <Card
        title="전체 기록"
        aside={
          rawEvents.length >= RAW_EVENT_LIMIT
            ? `가장 최근 ${RAW_EVENT_LIMIT}건만 보여 드려요.`
            : "최근 것부터 보여 드려요."
        }
      >
        {rawEvents.length === 0 ? (
          <Empty>남은 기록이 없어요.</Empty>
        ) : (
          <ScrollTable head={["시간", "종류", "공개 범위", "내용"]} minWidth="min-w-[52rem]">
            {rawEvents.map((event) => (
              <tr key={event.id}>
                <td className="whitespace-nowrap text-gray-700">{fmtDateTime(event.created_at)}</td>
                <td className="whitespace-nowrap">
                  <span className="font-bold">{eventLabel(event.type)}</span>
                  <span className="block font-mono text-[11px] text-gray-500">{event.type}</span>
                </td>
                <td className="whitespace-nowrap">
                  <Chip tone={event.visibility === "staff" ? "warn" : "muted"}>
                    {event.visibility === "staff" ? "운영진만" : "수강생도 봄"}
                  </Chip>
                </td>
                <td className="w-full">
                  <details>
                    <summary className="cursor-pointer break-all font-mono text-xs text-gray-700">
                      {jsonPreview(event.data)}
                    </summary>
                    <pre className="mt-2 max-h-80 max-w-[40rem] overflow-auto rounded-md bg-[var(--background)] p-3 font-mono text-xs leading-relaxed">
                      {JSON.stringify(event.data, null, 2)}
                    </pre>
                  </details>
                </td>
              </tr>
            ))}
          </ScrollTable>
        )}
      </Card>
    </main>
  );
}

function DrillRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 lg:flex-row lg:gap-4">
      <dt className="shrink-0 text-gray-500 lg:w-56">{label}</dt>
      <dd className="min-w-0 flex-1 whitespace-pre-wrap break-words">{children}</dd>
    </div>
  );
}
