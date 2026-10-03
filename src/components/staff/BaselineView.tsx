// A locked baseline for staff (Week 3 Part 4, phase-2c C4, C5): what the
// instructor reads in the ~20 seconds before countersigning. Task, the
// source "before" entry's minutes and the day the work was done (the same
// date the learner sees; the day it was logged appears only beside the flag
// for an entry logged within a day of the lock), frequency, the current method, the
// quality checklist, and both signatures. Server-safe, read-only; the
// countersign button is passed in by the page.

import Link from "next/link";
import type { BaselineSnapshot } from "@/lib/profile/types";
import { baselineWorkedAt, beforeLine, formatFrequency, loggedJustBeforeLock } from "@/components/lab/rules-week3";
import { fmtDate, fmtDateTime } from "./format";
import { Chip } from "./ui";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-4">
      <dt className="shrink-0 text-gray-500 sm:w-28">{label}</dt>
      <dd className="min-w-0 flex-1 break-words">{children}</dd>
    </div>
  );
}

export default function BaselineView({
  baseline,
  evidenceUrl,
  learnerHref,
  citedStartedAt,
}: {
  baseline: BaselineSnapshot;
  /** Signed URL for baseline.evidence_ref, when it could be signed. */
  evidenceUrl?: string;
  /** The learner's staff page (cohort queue only): where to look when the evidence could not be signed here. */
  learnerHref?: string;
  /** started_at of the cited time log entry, for snapshots without time_started_at. */
  citedStartedAt?: string | null;
}) {
  const late = loggedJustBeforeLock(baseline);
  const source = [
    baseline.source.candidate_rank ? `워크맵 후보 ${baseline.source.candidate_rank}순위` : null,
    baseline.source.blueprint_event_id ? "설계도에서 가져옴" : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <dl className="flex flex-col gap-2.5 text-sm">
      <Row label="캡스톤 업무">
        <span className="font-semibold">{baseline.task}</span>
        {source && <span className="block text-xs text-gray-500">{source}</span>}
      </Row>
      <Row label="기준 시간">
        <span className="font-semibold">
          {beforeLine(baseline.minutes_per_instance, fmtDate(baselineWorkedAt(baseline, citedStartedAt)))}
        </span>
        {late && (
          <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            <Chip tone="warn">확정 전 하루 안에 남긴 기록</Chip>
            <span className="text-xs text-gray-500">{`${fmtDate(baseline.time_logged_at)}에 기록`}</span>
          </span>
        )}
      </Row>
      <Row label="하는 빈도">{formatFrequency(baseline.frequency)}</Row>
      <Row label="지금 하는 방식">
        <ol className="list-decimal pl-5">
          {baseline.current_method_stages.map((stage, index) => (
            <li key={index}>{stage}</li>
          ))}
        </ol>
      </Row>
      <Row label="품질 체크리스트">
        <ul className="list-disc pl-5">
          {baseline.quality_checklist.map((line, index) => (
            <li key={index}>{line}</li>
          ))}
        </ul>
      </Row>
      <Row label="증빙">
        {evidenceUrl ? (
          <a href={evidenceUrl} target="_blank" rel="noreferrer" className="font-semibold underline underline-offset-4">
            증빙 이미지 열기
          </a>
        ) : baseline.evidence_ref ? (
          <span className="text-gray-500">
            이미지를 열 수 없어요
            {learnerHref && (
              <>
                {" · "}
                <Link href={learnerHref} className="font-semibold text-gray-700 underline underline-offset-4">
                  수강생 기록에서 보기
                </Link>
              </>
            )}
          </span>
        ) : (
          <span className="text-gray-500">없음</span>
        )}
      </Row>
      <Row label="확정">
        수강생 확정 {fmtDateTime(baseline.signed_at)}
        <span className="block">
          {baseline.countersigned_at ? (
            <Chip tone="done">강사 확인 완료 · {fmtDate(baseline.countersigned_at)}</Chip>
          ) : (
            <Chip tone="warn">강사 확인 대기</Chip>
          )}
        </span>
      </Row>
    </dl>
  );
}
