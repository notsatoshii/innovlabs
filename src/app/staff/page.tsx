// /staff — cohorts, newest first, and the 새 코호트 form.
// Reads with the staff member's own client (RLS: cohort_select_staff,
// enrollment_select_staff). Writes go through POST /api/staff/cohort.

import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import type { Cohort, Enrollment } from "@/lib/courses/types";
import { requireStaffPage } from "@/components/staff/guard";
import {
  COHORT_STATUS_LABEL,
  cohortTrackLabel,
  fmtDay,
  openThrough,
} from "@/components/staff/format";
import { Card, Chip, Empty, Facts } from "@/components/staff/ui";
import CopyCode from "@/components/staff/CopyCode";
import NewCohortForm from "@/components/staff/NewCohortForm";

export default async function StaffHomePage() {
  await requireStaffPage();
  const supabase = await supabaseServer();

  const [cohortResult, enrollmentResult] = await Promise.all([
    supabase.from("cohort").select("*").order("created_at", { ascending: false }),
    supabase.from("enrollment").select("cohort_id, status"),
  ]);
  const cohorts = (cohortResult.data ?? []) as Cohort[];
  const enrollments = (enrollmentResult.data ?? []) as Pick<Enrollment, "cohort_id" | "status">[];
  const failed = !!cohortResult.error || !!enrollmentResult.error;

  // Enrolled = still on the roster (dropped learners are not counted).
  const counts = new Map<string, number>();
  for (const row of enrollments) {
    if (row.status === "dropped") continue;
    counts.set(row.cohort_id, (counts.get(row.cohort_id) ?? 0) + 1);
  }

  return (
    <main className="flex w-full flex-col gap-5">
      <section>
        <h1 className="mb-3 text-2xl font-extrabold leading-snug tracking-tight">코호트</h1>
        {failed && (
          <p role="alert" className="mb-3 text-sm text-red-600">
            목록을 다 불러오지 못했어요. 새로고침해 주세요.
          </p>
        )}
        {cohorts.length === 0 ? (
          <div className="nb-flat px-5 py-5">
            <Empty>아직 만든 코호트가 없어요. 아래에서 첫 코호트를 만들어 보세요.</Empty>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {cohorts.map((cohort) => {
              const through = openThrough(cohort);
              return (
                <li key={cohort.id} className="nb-card flex flex-col gap-4 px-5 py-5">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="min-w-0 text-lg font-extrabold leading-snug tracking-tight">
                      <Link href={`/staff/cohort/${cohort.id}`} className="underline underline-offset-4">
                        {cohort.name}
                      </Link>
                    </h2>
                    <Chip tone={cohort.status === "running" ? "done" : cohort.status === "done" ? "muted" : "warn"}>
                      {COHORT_STATUS_LABEL[cohort.status] ?? cohort.status}
                    </Chip>
                  </div>
                  <div>
                    <p className="mb-1.5 text-xs font-bold text-gray-500">참여 코드</p>
                    <CopyCode code={cohort.code} />
                  </div>
                  <Facts
                    single
                    items={[
                      { label: "트랙", value: cohortTrackLabel(cohort.track_code) },
                      { label: "시작일", value: fmtDay(cohort.starts_on) },
                      { label: "열린 주차", value: through > 0 ? `${through}주차까지` : "아직 없음" },
                      { label: "수강생", value: `${counts.get(cohort.id) ?? 0}명` },
                    ]}
                  />
                  <Link
                    href={`/staff/cohort/${cohort.id}`}
                    className="nb-btn nb-btn-white px-4 py-2.5 text-center text-sm"
                  >
                    명단과 주차 관리
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <Card title="새 코호트 만들기" aside="참여 코드는 만들 때 자동으로 정해져요.">
        <NewCohortForm />
      </Card>
    </main>
  );
}
