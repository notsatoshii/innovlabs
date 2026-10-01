// /staff/cohort/[id] — one cohort: its join code, which weeks are open,
// add a learner by email, and the roster with Week 1 progress.
//
// Every read uses the staff member's own client (RLS staff select policies on
// cohort, enrollment, user_profile, profile_event). The three write controls
// post to /api/staff/cohort/[id]/open-week and /enroll.

import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import type { Cohort, Enrollment } from "@/lib/courses/types";
import { EVENT_TYPES } from "@/lib/profile/events";
import type { UserProfile } from "@/lib/profile/types";
import { requireStaffPage } from "@/components/staff/guard";
import {
  COHORT_STATUS_LABEL,
  ENROLLMENT_STATUS_LABEL,
  cohortTrackLabel,
  fmtDate,
  fmtDay,
  isUuid,
  pathLabel,
  surveyTrackLabel,
  weekStates,
} from "@/components/staff/format";
import { Card, Chip, Empty, Facts, ScrollTable } from "@/components/staff/ui";
import CopyCode from "@/components/staff/CopyCode";
import EnrollForm from "@/components/staff/EnrollForm";
import OpenWeekControl from "@/components/staff/OpenWeekControl";
import StatusControl from "@/components/staff/StatusControl";

type RosterProfile = Pick<
  UserProfile,
  "user_id" | "display_name" | "company_name" | "job_title" | "track" | "path"
>;

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

export default async function StaffCohortPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaffPage();
  const { id } = await params;
  if (!isUuid(id)) notFound();

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
  let failed = !!enrollmentResult.error;
  if (userIds.length > 0) {
    const [profileResult, eventResult] = await Promise.all([
      supabase
        .from("user_profile")
        .select("user_id, display_name, company_name, job_title, track, path")
        .in("user_id", userIds),
      supabase
        .from("profile_event")
        .select("user_id, type")
        .in("user_id", userIds)
        .in("type", WEEK1_TYPES)
        .limit(5000),
    ]);
    failed = failed || !!profileResult.error || !!eventResult.error;
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

      {/* 2. Weeks: open by date versus opened early by staff */}
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

      {/* 3. Add a learner by email */}
      <Card title="수강생 직접 추가">
        <p className="mb-3 text-sm leading-relaxed text-gray-700">
          코드를 입력하기 어려운 분은 가입한 이메일로 여기서 바로 추가할 수 있어요. 진단과 회원가입을 마친
          분만 추가돼요.
        </p>
        <EnrollForm cohortId={cohort.id} />
      </Card>

      {/* 4. Roster */}
      <Card title={`수강생 명단 (${activeCount}명)`} aside="이름을 누르면 그 수강생의 기록이 열려요.">
        {failed && (
          <p role="alert" className="mb-3 text-sm text-red-600">
            명단을 다 불러오지 못했어요. 새로고침해 주세요.
          </p>
        )}
        {enrollments.length === 0 ? (
          <Empty>아직 등록한 수강생이 없어요.</Empty>
        ) : (
          <ScrollTable head={["이름", "회사 · 직함", "진단 트랙", "구분", "등록일", "1주차"]} minWidth="min-w-[52rem]">
            {enrollments.map((enrollment) => {
              const profile = profiles.get(enrollment.user_id);
              const progress = week1.get(enrollment.user_id) ?? { workMap: false, drill: false, timeLogs: 0 };
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
                </tr>
              );
            })}
          </ScrollTable>
        )}
      </Card>
    </main>
  );
}
