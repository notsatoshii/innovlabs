"use client";

// I8 타이머: the week's timer quest. In O1 the timer itself is the lab's time
// log (server timestamps, evidence upload): 퀘스트 받기 records the quest,
// then 시간 기록 열기 leaves for the time log in the same tab. On the last
// screen the mission is finished first, so the boss never stays undone
// because the learner left from here (review P1-5); the player stays and
// shows what is missing when the server refuses. Minutes never pay XP; a
// saved entry with evidence may (P11). When candidate #1 does not recur
// weekly, the quest says "다음에 할 때" instead of this week, and the
// learner may pick the day they will do it next: 캘린더에 넣기 hands over an
// .ics file (an all-day event with a 9:00 alarm) for their own calendar. The
// app sends no reminders itself, so the line says the calendar does (NC-39).

import { useState } from "react";
import type { I8Timer as I8 } from "@/lib/course/types";
import { Rich } from "./Blocks";
import { NetLine, amountText, useAward, usePlayer, type InteractionProps } from "./context";

/** "2026-10-30" → "20261030"; the next day for an all-day DTEND. */
function icsDate(day: string, plus = 0): string {
  const [y, m, d] = day.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + plus));
  return `${t.getUTCFullYear()}${String(t.getUTCMonth() + 1).padStart(2, "0")}${String(t.getUTCDate()).padStart(2, "0")}`;
}

/** Text for an iCalendar field: backslash, comma, semicolon and line breaks escaped. */
function icsText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/([,;])/g, "\\$1").replace(/\r?\n/g, "\\n");
}

/** One all-day event on `day` with a 9:00 alarm, for the learner's own calendar. */
export function questIcs(day: string, task: string, now: Date = new Date()): string {
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const summary = task ? `평소 방식 퀘스트: '${task}' 시간 재기` : "평소 방식 퀘스트: 후보 1번 시간 재기";
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//InnovLabs//Course//KO",
    "BEGIN:VEVENT",
    `UID:quest-${icsDate(day)}-${now.getTime()}@innovlabs`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${icsDate(day)}`,
    `DTEND;VALUE=DATE:${icsDate(day, 1)}`,
    `SUMMARY:${icsText(summary)}`,
    `DESCRIPTION:${icsText("평소처럼 하면서 타이머를 켜세요. 시작, 끝, 끊긴 횟수를 시간 기록에 남겨요.")}`,
    "BEGIN:VALARM",
    "TRIGGER:PT9H",
    "ACTION:DISPLAY",
    `DESCRIPTION:${icsText(summary)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

function todayIso(): string {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
}

const METHOD_LABEL: Record<I8["method"], string> = {
  before: "평소 방식",
  harness: "하네스",
  pipeline: "파이프라인",
};

export function I8Timer({ i, onDone }: InteractionProps<I8>) {
  const { leaveTo, workMap, drillTask } = usePlayer();
  const { step, error, retry } = useAward();
  // Candidate #1's 얼마나 자주 score: 3 = weekly or more.
  const weekly = (workMap.draft.candidates[0]?.scores.recurs ?? 3) >= 3;
  const [taken, setTaken] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [paid, setPaid] = useState<number | null>(null);
  const [day, setDay] = useState("");
  const [icsDone, setIcsDone] = useState(false);

  const toCalendar = () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return;
    try {
      const blob = new Blob([questIcs(day, drillTask)], { type: "text/calendar;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "quest.ics";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setIcsDone(true);
    } catch {
      setIcsDone(false);
    }
  };

  const take = async () => {
    setTaken(true);
    onDone();
    // A paying timer is verified against a saved time log entry with
    // evidence, which does not exist yet here; only a free one is recorded now.
    if (i.xp) return;
    const res = await step(i.id);
    if (res) setPaid(res.amount);
  };

  const open = async () => {
    setLeaving(true);
    await leaveTo(`/app/lab/time-log?method=${i.method}`);
    setLeaving(false);
  };

  return (
    <div className="c-quest">
      <div className="flex items-baseline justify-between gap-2">
        <b className="c-display text-[18px]">퀘스트 · {METHOD_LABEL[i.method]}</b>
        <span className="c-small">{weekly ? "이번 주" : "다음에 할 때"}</span>
      </div>
      <div className="text-[15px] font-bold">
        <Rich text={i.label} />
      </div>
      {!taken ? (
        <button type="button" className="nb-btn nb-btn-white c-btn" onClick={() => void take()}>
          퀘스트 받기
        </button>
      ) : (
        <>
          <p className="c-okline" role="status">{`퀘스트를 받았어요.${amountText(paid)}`}</p>
          <p className="c-small">
            시작, 끝, 끊긴 횟수를 시간 기록에 남겨요. 결과물 스크린샷은 회사 밖으로 나가면 안 되는
            부분을 가리고 올리세요.
          </p>
          <p className="c-small">스크린샷이 없어도 돼요. 시간 기록은 그대로 저장돼요.</p>
          {!weekly && (
            <div className="flex flex-col gap-2">
              <p className="c-p">이 일은 언제 다시 하나요? 날짜를 고르면 그날 알림이 오도록 내 캘린더에 넣을 수 있어요.</p>
              <label className="c-label">
                날짜 고르기
                <input
                  type="date"
                  className="c-input"
                  min={todayIso()}
                  value={day}
                  onChange={(e) => {
                    setDay(e.target.value);
                    setIcsDone(false);
                  }}
                />
              </label>
              <button type="button" className="c-sbtn self-start" disabled={!day} onClick={toCalendar}>
                캘린더에 넣기
              </button>
              {icsDone && (
                <p className="c-okline" role="status">
                  캘린더 파일을 받았어요. 열어서 내 캘린더에 추가하세요.
                </p>
              )}
            </div>
          )}
          <button
            type="button"
            className="c-sbtn is-pri"
            disabled={leaving}
            onClick={() => void open()}
          >
            {leaving ? "여는 중…" : "시간 기록 열기"}
          </button>
        </>
      )}
      <NetLine error={error} onRetry={() => void retry()} />
    </div>
  );
}
