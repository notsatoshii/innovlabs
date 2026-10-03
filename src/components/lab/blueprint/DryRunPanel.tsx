"use client";

// Lab Part 3, the dry run (phase-2c C1 and plan review 2). A timer that runs
// across a reload or a tab the phone discarded while the learner was in the
// assistant app: 시작 stores dry_run_started_at in the server draft (and a
// browser backup), and the elapsed time is always computed from the clock,
// never counted in memory. 정지 opens the time log form prefilled (method
// pipeline, dry run, the blueprint's task, start and end editable) so the
// learner confirms before anything is posted. Posting needs a submitted
// blueprint: the entry names its event id and its first checkpoint.
//
// The timer is available as soon as the draft has a task name; it does not
// wait for a submitted blueprint.

import { useState } from "react";
import Link from "next/link";
import type { BlueprintDraft } from "@/lib/courses/types";
import TimeLogForm, { type DryRunPrefill } from "../TimeLogForm";
import { formatMinutes } from "../rules";
import { DRY_RUN_BADGE, firstCheckpoint } from "../rules-week3";
import type { SubmittedView, TimeLines } from "./types";
import type { DryRunTimer } from "./useDryRun";

export function DryRunPanel({
  userId,
  draft,
  timer,
  submitted,
  timeLines,
}: {
  userId: string;
  draft: BlueprintDraft;
  timer: DryRunTimer;
  submitted: SubmittedView | null;
  timeLines: TimeLines;
}) {
  const { startedAt, stoppedAt, running, elapsed, measured, stop, reset } = timer;
  const [posted, setPosted] = useState<number | null>(null);

  const hasTask = draft.task.trim().length > 0;
  const checkpoint = submitted ? firstCheckpoint(submitted.blueprint) : null;

  const start = () => {
    setPosted(null);
    timer.start();
  };

  const prefill: DryRunPrefill | null =
    startedAt && stoppedAt && submitted && checkpoint
      ? {
          task: submitted.blueprint.task,
          started_at: startedAt,
          ended_at: stoppedAt,
          ref: { blueprint_event_id: submitted.eventId, checkpoint_id: checkpoint.id },
          rangeNote: `1단계부터 첫 확인 지점(${checkpoint.after_stage}단계 뒤)까지`,
          onPosted: (minutes) => {
            reset();
            setPosted(minutes);
          },
          onCancel: reset,
        }
      : null;

  return (
    <section id="dry-run" className="nb-card flex scroll-mt-28 flex-col gap-3 px-4 py-4">
      <h2 className="text-base font-extrabold">한 번 돌려 보기</h2>
      <p className="text-sm leading-relaxed">
        타이머를 켜고 설계도의 1단계부터 첫 확인 지점까지 워크스페이스에서 직접 해 보세요. 자료를 모아
        어시스턴트에게 주고, 결과를 받고, 확인 지점에서 적어 둔 것을 확인하면 돼요. 어시스턴트 앱으로
        옮겨 가도 타이머는 계속 가요.
      </p>
      <p className="text-sm leading-relaxed text-gray-700">
        실제 자료를 지금 쓸 수 없다면 연습용 자료로 시간을 재고, 실제 실행은 이번 주 과제에서 해요.
      </p>

      {posted !== null ? (
        <div aria-live="polite" className="flex flex-col gap-3">
          <p className="nb-flat bg-[var(--nb-lime)] px-3 py-2.5 text-[15px] font-extrabold">
            시험 실행 시간을 기록했어요. ({formatMinutes(posted)})
          </p>
          <p className="text-sm leading-relaxed">
            확인 지점에서 고칠 것을 하나 찾아 수정 기록에 남겨 주세요. 하나는 꼭 나와요.
          </p>
          <Link href="/app/lab/corrections" className="nb-btn nb-btn-primary block px-4 py-3 text-center text-[15px]">
            수정 기록 남기러 가기
          </Link>
          <button
            type="button"
            onClick={() => setPosted(null)}
            className="min-h-11 self-center px-2 text-sm font-bold underline underline-offset-4"
          >
            한 번 더 재기
          </button>
        </div>
      ) : !startedAt ? (
        <>
          <button
            type="button"
            onClick={start}
            disabled={!hasTask}
            className="nb-btn nb-btn-primary w-full px-4 py-3.5 text-[15px]"
          >
            타이머 시작
          </button>
          {!hasTask && <p className="text-sm text-gray-700">위에 업무 이름을 적으면 타이머를 쓸 수 있어요.</p>}
        </>
      ) : running ? (
        <div className="flex flex-col gap-3">
          <p role="timer" className="nb-flat bg-[var(--nb-yellow)] px-3 py-3 text-center text-lg font-extrabold">
            {DRY_RUN_BADGE} 중{elapsed !== null && ` · ${elapsed}분 지남`}
          </p>
          <button type="button" onClick={stop} className="nb-btn nb-btn-primary w-full px-4 py-3.5 text-[15px]">
            정지
          </button>
          <button
            type="button"
            onClick={() => {
              if (window.confirm("타이머를 처음으로 돌릴까요? 지금까지 잰 시간은 남지 않아요.")) reset();
            }}
            className="min-h-11 self-center px-2 text-sm font-bold underline underline-offset-4"
          >
            처음부터 다시
          </button>
        </div>
      ) : prefill ? (
        <TimeLogForm key={`${startedAt}-${stoppedAt}`} userId={userId} defaultTask={prefill.task} dryRun={prefill} />
      ) : (
        <div className="flex flex-col gap-3">
          <p className="nb-flat px-3 py-3 text-sm leading-relaxed">
            잰 시간은 <b>{formatMinutes(measured ?? 0)}</b>이에요.
            설계도를 제출하면 이 시간을 시간 기록에 남길 수 있어요. 위에서 설계도를 제출해 주세요. 잰
            시간은 그대로 있어요.
          </p>
          <button
            type="button"
            onClick={() => {
              if (window.confirm("이번 시험 실행은 기록하지 않을까요? 타이머가 처음으로 돌아가요.")) reset();
            }}
            className="min-h-11 self-center px-2 text-sm font-bold underline underline-offset-4"
          >
            기록하지 않고 처음으로
          </button>
        </div>
      )}

      {(timeLines.dryRun || timeLines.before) && (
        <div className="flex flex-col gap-1.5 border-t border-[var(--nb-line)] pt-3 text-sm">
          <h3 className="font-extrabold">기록한 시간</h3>
          {timeLines.dryRun && <p>{timeLines.dryRun}</p>}
          {timeLines.before && <p>{timeLines.before}</p>}
        </div>
      )}

      {posted === null && (
        <p className="text-xs leading-relaxed text-gray-600">
          확인 지점에서 고칠 것을 찾으면{" "}
          <Link href="/app/lab/corrections" className="font-bold text-[var(--nb-ink)] underline underline-offset-4">
            수정 기록
          </Link>
          에 남겨 주세요.
        </p>
      )}
    </section>
  );
}
