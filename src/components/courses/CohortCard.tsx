// The enrolled learner's cohort card on the 코스 tab. Server component.
// Shows only what staff typed for the cohort; empty fields are left out
// rather than filled with a guess. The cohort code is never rendered.

import type { Cohort } from "@/lib/courses/types";
import { cohortTrackLabel } from "@/lib/courses/queries";
import { Row, formatDate } from "@/components/profile/display";

const STATUS: Record<Cohort["status"], { label: string; fill: string }> = {
  planned: { label: "개강 전", fill: "bg-[var(--nb-paper)]" },
  running: { label: "진행 중", fill: "bg-[var(--nb-lime)]" },
  done: { label: "종료", fill: "bg-[var(--nb-paper)]" },
};

export function CohortCard({ cohort }: { cohort: Cohort }) {
  const status = STATUS[cohort.status] ?? STATUS.planned;
  const startDate = formatDate(cohort.starts_on);

  return (
    <section className="nb-card px-5 py-5">
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="text-xs font-extrabold text-[var(--nb-pink-deep)]">내 과정</p>
        <span className={`nb-badge shrink-0 px-2 text-[11px] leading-5 ${status.fill}`}>
          {status.label}
        </span>
      </div>
      <h1 className="mb-3 break-words text-2xl font-extrabold leading-snug tracking-tight">
        {cohort.name}
      </h1>
      <dl className="flex flex-col gap-1.5 text-sm">
        <Row label="트랙" value={cohortTrackLabel(cohort.track_code)} />
        {cohort.schedule_note && <Row label="일정" value={cohort.schedule_note} />}
        {cohort.venue && <Row label="장소" value={cohort.venue} />}
        <Row label="시작일" value={startDate ?? "아직 정해지지 않았어요"} />
      </dl>
    </section>
  );
}
