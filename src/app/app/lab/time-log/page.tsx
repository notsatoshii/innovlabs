// /app/lab/time-log: the time log (SP-W1-TL), the Week 1 assignment and the
// "before" number for the Week 11 comparison (capstone_measured, scored
// against the baseline checklist; the session plan's "Week 12" line is the
// capstone as a whole). Server component: lists the
// learner's own time_log_entry events (read through RLS), newest first, with
// short-lived signed links to their evidence, above a form to add one.
// A Week 3 dry run (an entry with dry_run, phase-2c C1) carries a "시험 실행"
// badge here as everywhere a time log is listed: it timed stages 1 to the
// first checkpoint, not the whole task.
// Opened from the Week 3 baseline (?from=baseline, the learner has no
// "before" entry yet): the Week 3 header and copy, and a way back to the
// baseline once an entry is saved.
// Opened from the Week 3 assignment (?from=week3, the whole pipeline on real
// work): the Week 3 header and copy, and the method opens on 파이프라인, so
// the run is never offered as a baseline's "before" entry (beforeEntriesFrom).

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseServer } from "@/lib/supabase/server";
import { EVENT_TYPES } from "@/lib/profile/events";
import type { TimeLogInput } from "@/lib/courses/types";
import { LabHeader } from "@/components/lab/LabHeader";
import { Week3LabHeader } from "@/components/lab/Week3LabHeader";
import TimeLogForm from "@/components/lab/TimeLogForm";
import {
  EVIDENCE_BUCKET,
  METHOD_LABELS,
  formatMinutes,
  minutesBetween,
  parseTimeLogInput,
} from "@/components/lab/rules";
import { DRY_RUN_BADGE } from "@/components/lab/rules-week3";

export const metadata: Metadata = { title: "시간 기록" };

const SIGNED_URL_SECONDS = 60 * 60;

const DAY = new Intl.DateTimeFormat("ko-KR", {
  month: "long",
  day: "numeric",
  weekday: "short",
  timeZone: "Asia/Seoul",
});
const CLOCK = new Intl.DateTimeFormat("ko-KR", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Asia/Seoul",
});

/** "10월 1일 (목) 09:10 ~ 10:35"; the end shows its date only when it differs. */
function formatSpan(startedAt: string, endedAt: string): string {
  const start = new Date(startedAt);
  const end = new Date(endedAt);
  const startDay = DAY.format(start);
  const endDay = DAY.format(end);
  const endPart = startDay === endDay ? CLOCK.format(end) : `${endDay} ${CLOCK.format(end)}`;
  return `${startDay} ${CLOCK.format(start)} ~ ${endPart}`;
}

interface Entry extends TimeLogInput {
  id: number;
  minutes: number;
}

export default async function TimeLogPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string | string[] }>;
}) {
  const { from } = await searchParams;
  const fromBaseline = from === "baseline";
  const fromWeek3 = from === "week3";
  const session = await getSession();
  // The /app layout already guarantees a profile; this keeps the types honest.
  if (!session?.profile) redirect("/start");
  const { user, profile } = session;
  // The 12-week course is the employee path (phase-2 P8).
  if (profile.path !== "employee") redirect("/app/courses");

  const supabase = await supabaseServer();
  const { data: rows, error } = await supabase
    .from("profile_event")
    .select("id, data")
    .eq("user_id", user.id)
    .eq("type", EVENT_TYPES.time_log_entry)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) console.error("time log read failed:", error.message);

  const entries: Entry[] = [];
  for (const row of (rows ?? []) as { id: number; data: unknown }[]) {
    const parsed = parseTimeLogInput(row.data);
    const minutes = parsed ? minutesBetween(parsed.started_at, parsed.ended_at) : null;
    if (parsed && minutes !== null) entries.push({ ...parsed, id: row.id, minutes });
  }
  // Newest work first (an entry can be logged a day after the work was done).
  entries.sort((a, b) => Date.parse(b.started_at) - Date.parse(a.started_at));

  // The bucket is private: evidence opens through a signed link, made with the
  // learner's own client so the own-folder select policy applies.
  const evidenceUrl = new Map<string, string>();
  const paths = entries.flatMap((e) => (e.evidence_ref ? [e.evidence_ref] : []));
  if (paths.length > 0) {
    const { data: signed, error: signError } = await supabase.storage
      .from(EVIDENCE_BUCKET)
      .createSignedUrls(paths, SIGNED_URL_SECONDS);
    if (signError) console.error("evidence signing failed:", signError.message);
    for (const item of signed ?? []) {
      if (item.path && item.signedUrl && !item.error) evidenceUrl.set(item.path, item.signedUrl);
    }
  }

  const workMap = profile.work_map;
  const first = workMap?.candidates.find((c) => c.rank === 1);
  const candidateOne = (first && workMap?.rows[first.task_row]?.task) || "";

  // The week the before/after comparison is scored, same as the baseline lab's copy.
  const beforeLine = (
    <p className="font-bold text-[var(--nb-ink)]">
      지금 기록해 두지 않으면 11주차에 견줄 ‘전’ 숫자가 없어요.
    </p>
  );

  return (
    <main className="flex w-full flex-col gap-5">
      {fromWeek3 ? (
        <Week3LabHeader title="시간 기록">
          <p>
            이번 주 과제예요. 설계도의 첫 단계부터 전달까지 실제 업무로 한 번 돌리면서, 시작한 시각과 끝난
            시각, 중간에 끊긴 횟수를 남겨 주세요.
          </p>
        </Week3LabHeader>
      ) : fromBaseline ? (
        <Week3LabHeader title="시간 기록">
          <p>
            캡스톤으로 삼을 업무를 하네스 없이 예전 방식 그대로 한 번 하면서, 시작한 시각과 끝난 시각,
            중간에 끊긴 횟수를 남겨 주세요. 기록하고 나면 기준선에서 이 기록을 고를 수 있어요.
          </p>
          {beforeLine}
        </Week3LabHeader>
      ) : (
        <LabHeader title="시간 기록">
          <p>
            이번 주에 후보 1을 늘 하던 방식 그대로 하면서 시작한 시각과 끝난 시각, 중간에 끊긴 횟수를
            남겨 주세요. 같은 업무를 두 번 하면 두 번 다 기록해요.
          </p>
          {beforeLine}
          {!candidateOne && (
            <p>
              아직 워크맵을 제출하지 않았어요.{" "}
              <Link href="/app/lab/work-map" className="font-bold underline underline-offset-4">
                워크맵에서 후보 1을 먼저 골라 주세요.
              </Link>
            </p>
          )}
        </LabHeader>
      )}

      {fromWeek3 ? (
        <TimeLogForm
          userId={user.id}
          defaultTask={candidateOne}
          initialMethod="pipeline"
          methodNote="3주차 과제는 파이프라인으로 한 기록이라 ‘파이프라인’으로 남겨요. 기준선의 ‘전’ 기록으로는 쓰지 않아요."
        />
      ) : fromBaseline ? (
        <TimeLogForm
          userId={user.id}
          defaultTask={candidateOne}
          methodNote="기준선에 쓸 기록은 하네스를 쓰기 전, ‘기존 방식’으로 남겨요."
          returnTo={{ href: "/app/lab/baseline", label: "기준선으로 돌아가기" }}
        />
      ) : (
        <TimeLogForm userId={user.id} defaultTask={candidateOne} />
      )}

      <section className="nb-card px-4 py-4">
        <h2 className="text-base font-extrabold">
          지금까지의 기록{" "}
          <span className="text-sm font-bold text-gray-600">{entries.length}건</span>
        </h2>
        {entries.length === 0 ? (
          <p className="mt-2 text-sm text-gray-600">아직 기록이 없어요.</p>
        ) : (
          <ol className="mt-3 flex flex-col gap-2.5">
            {entries.map((entry) => {
              const url = entry.evidence_ref ? evidenceUrl.get(entry.evidence_ref) : undefined;
              return (
                <li key={entry.id} className="nb-flat px-3 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 flex-1 break-words text-[15px] font-bold leading-snug">
                      {entry.task}
                    </p>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <span className="nb-badge bg-[var(--nb-paper)] px-2 py-0.5 text-[11px]">
                        {METHOD_LABELS[entry.method]}
                      </span>
                      {entry.dry_run && (
                        <span className="nb-badge bg-[var(--nb-yellow)] px-2 py-0.5 text-[11px]">{DRY_RUN_BADGE}</span>
                      )}
                    </span>
                  </div>
                  {entry.dry_run && (
                    <p className="mt-1 text-xs text-gray-700">1단계부터 첫 확인 지점까지 잰 시간이에요.</p>
                  )}
                  <p className="mt-1.5 text-sm">
                    <b>{formatMinutes(entry.minutes)}</b>
                    <span className="text-gray-700"> · {formatSpan(entry.started_at, entry.ended_at)}</span>
                  </p>
                  <p className="mt-1 text-xs text-gray-600">
                    중간에 끊긴 횟수 {entry.interruptions}번
                    {entry.evidence_ref && (
                      <>
                        {" · "}
                        {url ? (
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-bold text-[var(--nb-ink)] underline underline-offset-4"
                          >
                            완성본 화면 보기
                          </a>
                        ) : (
                          "완성본 화면 있음"
                        )}
                      </>
                    )}
                  </p>
                </li>
              );
            })}
          </ol>
        )}
        {entries.length > 0 && (
          <p className="mt-3 text-xs leading-relaxed text-gray-600">
            한번 남긴 기록은 고치거나 지울 수 없어요. 잘못 적었다면 새로 하나 더 남기고 강사에게
            알려 주세요.
          </p>
        )}
      </section>
    </main>
  );
}
