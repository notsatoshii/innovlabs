// Week 3 on /staff/learner/[userId] (phase-2c, Staff views): the workspace
// check, the newest blueprint as a diagram, the dry run beside the Week 1
// time (both lines state their range: no difference, percentage or saving),
// the baseline with the countersign, and the Week 4 track confirmation.
// The page puts this card at the top while a baseline waits. Server-safe;
// the two controls are client components.

import type { BaselineSnapshot } from "@/lib/profile/types";
import type { TrackCode } from "@/lib/resources/types";
import { ASSISTANT_LABELS, beforeLine, dryRunLine } from "@/components/lab/rules-week3";
import BaselineView from "./BaselineView";
import BlueprintDiagram from "./BlueprintDiagram";
import CountersignButton from "./CountersignButton";
import CountersignedNotice from "./CountersignedNotice";
import TrackConfirmControl from "./TrackConfirmControl";
import { cohortTrackLabel, fmtDate, fmtDateTime } from "./format";
import type { Week3Data } from "./learner-weeks";
import { Card, Chip, Empty, Facts } from "./ui";

export interface Week3Gate {
  /** The learner has an active enrollment. */
  enrolled: boolean;
  /** Week 3 is open in that cohort (D5: the countersign route checks the same). */
  open: boolean;
  /** ISO, when closed and the cohort has a start date. */
  opensOn: string | null;
}

function Section({ title, aside, children }: { title: string; aside?: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-[var(--nb-line)] pt-4 first:border-t-0 first:pt-0">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className="text-sm font-extrabold">{title}</h3>
        {aside && <p className="text-xs text-gray-500">{aside}</p>}
      </div>
      {children}
    </section>
  );
}

function yesNo(value: boolean | null, yes: string, no: string): string {
  return value === null ? "답하지 않음" : value ? yes : no;
}

export default function Week3Card({
  userId,
  learnerName,
  data,
  baseline,
  baselineEvidenceUrl,
  harnessNames,
  gate,
  isSelf,
  surveyTrack,
  justCountersigned = false,
}: {
  userId: string;
  learnerName: string;
  data: Week3Data;
  baseline: BaselineSnapshot | null;
  baselineEvidenceUrl?: string;
  harnessNames: ReadonlyMap<string, string>;
  gate: Week3Gate;
  isSelf: boolean;
  surveyTrack: TrackCode | null;
  /** The countersign was just made on this page (?countersigned=<userId>): keep the baseline first and say so. */
  justCountersigned?: boolean;
}) {
  const waiting = !!baseline && !baseline.countersigned_at;
  const stamped = justCountersigned && !!baseline?.countersigned_at;
  const baselineFirst = waiting || stamped;
  const ws = data.workspace;
  const assistant = ws?.input.assistant
    ? ws.input.assistant === "other"
      ? ws.input.assistant_other || ASSISTANT_LABELS.other
      : ASSISTANT_LABELS[ws.input.assistant]
    : "고르지 않음";

  // The Week 1 figure beside the dry run: the baseline's entry once locked,
  // otherwise the newest "before" entry (C1).
  const before = baseline
    ? { minutes: baseline.minutes_per_instance, at: baseline.time_logged_at }
    : data.newestBefore;

  let countersign: React.ReactNode = null;
  if (baseline && waiting) {
    countersign = !gate.enrolled ? (
      <p className="text-sm text-gray-500">수강 중인 코호트가 없어서 지금은 확인할 수 없어요.</p>
    ) : !gate.open ? (
      <p className="text-sm text-gray-500">
        3주차가 열리면 확인할 수 있어요.{gate.opensOn ? ` (${fmtDate(gate.opensOn)}에 열려요)` : ""}
      </p>
    ) : isSelf ? (
      <p className="text-sm text-gray-500">본인 기준선은 다른 강사가 확인해요.</p>
    ) : (
      <CountersignButton userId={userId} learnerName={learnerName} baselineEventId={baseline.locked_event_id} />
    );
  }

  const baselineSection = (
    <Section title="기준선" aside={baseline ? `${fmtDateTime(baseline.signed_at)} 확정` : undefined}>
      {baseline ? (
        <div className="flex flex-col gap-3">
          <BaselineView baseline={baseline} evidenceUrl={baselineEvidenceUrl} />
          {/* Where the button was, so the reload (scroll kept) shows it. */}
          {stamped && <CountersignedNotice />}
          {countersign}
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {gate.open && (
            <span>
              <Chip tone="muted">체크리스트 미완성 · 4주차에 확인</Chip>
            </span>
          )}
          <Empty>아직 기준선을 확정하지 않았어요.</Empty>
        </div>
      )}
    </Section>
  );

  return (
    <Card title="3주차 · 파이프라인과 기준선" aside={waiting ? <Chip tone="warn">기준선 확인 대기</Chip> : undefined}>
      {data.failed && (
        <p role="alert" className="mb-3 text-sm text-red-600">
          3주차 기록을 다 불러오지 못했어요. 새로고침해 주세요.
        </p>
      )}
      <div className="flex flex-col gap-4">
        {/* While it waits, the baseline comes first: the countersign is the job.
            Right after the countersign it stays first, so the result is in view. */}
        {baselineFirst && baselineSection}
        <Section
          title="작업 공간"
          aside={
            ws ? `${fmtDateTime(ws.at)} 확인${ws.count > 1 ? ` · 모두 ${ws.count}번 확인했고, 가장 최근 것이에요` : ""}` : undefined
          }
        >
          {ws ? (
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap gap-1.5">
                <Chip tone={ws.input.instructions_set && ws.input.test_followed ? "done" : "warn"}>
                  {ws.input.instructions_set && ws.input.test_followed ? "작업 공간 준비됨" : "작업 공간 다시 확인 필요"}
                </Chip>
                {ws.input.uploads_blocked && <Chip tone="warn">회사에서 업로드 막힘</Chip>}
              </div>
              <Facts
                single
                items={[
                  { label: "쓰는 AI", value: assistant },
                  {
                    label: "방식",
                    value: ws.input.path === "agent" ? "에이전트(폴더)" : ws.input.path === "browser" ? "브라우저" : "고르지 않음",
                  },
                  { label: "공간 이름", value: ws.input.workspace_name || "적지 않음" },
                  { label: "지시 칸", value: yesNo(ws.input.instructions_set, "하네스를 넣었어요", "넣지 않았어요") },
                  { label: "참고 문서", value: yesNo(ws.input.references_uploaded, "넣었어요", "넣지 않았어요") },
                  {
                    label: "한 줄 시험",
                    value: yesNo(ws.input.test_followed, "하네스대로 답했어요", "하네스를 따르지 않았어요"),
                  },
                  { label: "업로드", value: yesNo(ws.input.uploads_blocked, "회사에서 막혀 있어요", "막혀 있지 않아요") },
                ]}
              />
            </div>
          ) : (
            <Empty>아직 작업 공간을 확인하지 않았어요.</Empty>
          )}
        </Section>

        <Section
          title="파이프라인 설계도"
          aside={
            data.blueprint
              ? `${fmtDateTime(data.blueprint.at)} 제출${
                  data.blueprint.count > 1 ? ` · 모두 ${data.blueprint.count}번 제출했고, 가장 최근 것이에요` : ""
                }`
              : undefined
          }
        >
          {data.blueprint ? (
            <div className="flex flex-col gap-2">
              <p className="break-words text-sm font-semibold">{data.blueprint.payload.task}</p>
              {data.blueprint.payload.source.candidate_rank && (
                <p className="text-xs text-gray-500">워크맵 후보 {data.blueprint.payload.source.candidate_rank}순위</p>
              )}
              <BlueprintDiagram blueprint={data.blueprint.payload} harnessNames={harnessNames} />
            </div>
          ) : (
            <Empty>아직 설계도를 제출하지 않았어요.</Empty>
          )}
        </Section>

        <Section title="시험 실행">
          {data.dryRun || before ? (
            <div className="flex flex-col gap-1.5 text-sm">
              <p className={data.dryRun ? "font-semibold" : "text-gray-500"}>
                {data.dryRun ? dryRunLine(data.dryRun.minutes, fmtDate(data.dryRun.at)) : "시험 실행 기록이 아직 없어요."}
              </p>
              <p className={before ? "font-semibold" : "text-gray-500"}>
                {before ? beforeLine(before.minutes, fmtDate(before.at)) : "기존 방식 시간 기록이 아직 없어요."}
              </p>
              <p className="text-xs text-gray-500">두 기록은 잰 범위가 달라요. 서로 빼서 비교하지 말아 주세요.</p>
            </div>
          ) : (
            <Empty>시험 실행 기록이 아직 없어요.</Empty>
          )}
        </Section>

        {!baselineFirst && baselineSection}

        <Section
          title="4주차 트랙 확정"
          aside={data.confirmedTrack ? `${fmtDateTime(data.confirmedTrack.at)} 확정` : undefined}
        >
          <p className="mb-2 text-sm text-gray-700">
            {data.confirmedTrack
              ? `지금 확정 트랙은 ${cohortTrackLabel(data.confirmedTrack.track)}이에요.`
              : surveyTrack
                ? `아직 확정하지 않았어요. 진단 트랙(${cohortTrackLabel(surveyTrack)})으로 채워 두었어요.`
                : "아직 확정하지 않았어요."}
          </p>
          {gate.enrolled ? (
            <TrackConfirmControl
              userId={userId}
              learnerName={learnerName}
              confirmed={data.confirmedTrack?.track ?? null}
              suggested={surveyTrack}
            />
          ) : (
            <p className="text-sm text-gray-500">수강 중인 코호트가 없어서 트랙을 확정할 수 없어요.</p>
          )}
        </Section>
      </div>
    </Card>
  );
}
