"use client";

// Add one time log entry (SP-W1-TL): task, method, start and end, how many
// times the work was interrupted, and an optional screenshot of the finished
// output. The screenshot goes straight from the browser to the private
// evidence bucket, into the learner's own folder (storage policy in 0007);
// the entry itself is validated again and written by POST /api/artifacts/time-log.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { ApiResult, TimeLogInput } from "@/lib/courses/types";
import { ChoiceGroup, CountStepper, type Choice } from "./inputs";
import {
  EVIDENCE_BUCKET,
  EVIDENCE_TYPES,
  METHOD_LABELS,
  TIME_LOG_LIMITS,
  checkTimeLog,
  evidenceRejection,
  formatMinutes,
  minutesBetween,
  newEvidencePath,
} from "./rules";

type Method = TimeLogInput["method"];

const METHOD_CHOICES: Choice<Method>[] = (["before", "harness", "pipeline"] as const).map((value) => ({
  value,
  label: METHOD_LABELS[value],
}));

/** A Date as the value a datetime-local input expects, in the device's own time zone. */
function toLocalInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** datetime-local value (device time) → ISO instant, or "" when empty or unreadable. */
function toIso(local: string): string {
  if (!local) return "";
  const date = new Date(local);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function uploadFailure(message: string): string {
  if (/size|large/i.test(message)) return "화면을 올리지 못했어요. 5MB까지만 올릴 수 있어요.";
  if (/mime/i.test(message)) return "화면을 올리지 못했어요. PNG, JPG, WebP 이미지만 올릴 수 있어요.";
  return "화면을 올리지 못했어요. 잠시 뒤 다시 누르거나, 화면을 빼고 먼저 기록해 주세요.";
}

type Status =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "done" }
  | { kind: "failed"; message: string; problems: string[] };

export default function TimeLogForm({
  userId,
  defaultTask,
}: {
  userId: string;
  /** Candidate 1 from the submitted Work Map, or "" when there is none yet. */
  defaultTask: string;
}) {
  const router = useRouter();
  const [task, setTask] = useState(defaultTask);
  const [method, setMethod] = useState<Method>("before");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [interruptions, setInterruptions] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  // Path of the file once it is in the bucket, so a retry does not upload it twice.
  const [uploadedPath, setUploadedPath] = useState<string | null>(null);
  // Remounts the file input to clear it (its value cannot be set from code).
  const [fileInputKey, setFileInputKey] = useState(0);
  const [tried, setTried] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const input: TimeLogInput = {
    task: task.trim(),
    method,
    started_at: toIso(start),
    ended_at: toIso(end),
    interruptions,
    evidence_ref: uploadedPath,
  };
  const errors = checkTimeLog(input);
  const minutes = minutesBetween(input.started_at, input.ended_at);
  const sending = status.kind === "sending";

  const touch = () => {
    if (status.kind !== "idle" && status.kind !== "sending") setStatus({ kind: "idle" });
  };

  const clearFile = () => {
    setFile(null);
    setUploadedPath(null);
    setFileError(null);
    setFileInputKey((k) => k + 1);
  };

  const pickFile = (picked: File | null) => {
    touch();
    setUploadedPath(null);
    if (!picked) {
      setFile(null);
      setFileError(null);
      return;
    }
    const reason = evidenceRejection(picked);
    if (reason) {
      setFile(null);
      setFileError(reason);
      setFileInputKey((k) => k + 1);
      return;
    }
    setFile(picked);
    setFileError(null);
  };

  const send = async () => {
    setTried(true);
    if (errors.length > 0) return;
    setStatus({ kind: "sending" });

    let evidenceRef = uploadedPath;
    if (file && !evidenceRef) {
      const path = newEvidencePath(userId, file.type);
      const { error } = await supabaseBrowser()
        .storage.from(EVIDENCE_BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false });
      if (error) {
        setStatus({ kind: "failed", message: uploadFailure(error.message), problems: [] });
        return;
      }
      evidenceRef = path;
      setUploadedPath(path);
    }

    let res: Response;
    try {
      res = await fetch("/api/artifacts/time-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...input, evidence_ref: evidenceRef }),
      });
    } catch {
      setStatus({ kind: "failed", message: "연결이 끊겼어요. 연결을 확인하고 다시 눌러 주세요.", problems: [] });
      return;
    }
    const result = (await res.json().catch(() => null)) as ApiResult<unknown> | null;
    if (res.ok && result?.ok) {
      // Keep the task and method for the next entry; clear what belongs to this one.
      setStart("");
      setEnd("");
      setInterruptions(0);
      clearFile();
      setTried(false);
      setStatus({ kind: "done" });
      router.refresh(); // the list below is server-rendered
      return;
    }
    setStatus({
      kind: "failed",
      message:
        res.status === 401
          ? "로그인이 풀렸어요. 다시 로그인한 뒤 기록해 주세요."
          : res.status === 422
            ? "아래 항목을 고친 뒤 다시 눌러 주세요."
            : res.status === 503
              ? "지금은 기록을 받을 수 없어요. 강사에게 알려 주세요."
              : "기록하지 못했어요. 잠시 뒤 다시 눌러 주세요.",
      problems: result && !result.ok ? (result.problems ?? []) : [],
    });
  };

  return (
    <form
      className="nb-card flex flex-col gap-5 px-4 py-4"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        void send();
      }}
    >
      <h2 className="text-base font-extrabold">기록 추가</h2>

      <div className="flex flex-col gap-2">
        <label htmlFor="time-log-task" className="text-sm font-bold">
          어떤 업무였나요?
        </label>
        <input
          id="time-log-task"
          type="text"
          value={task}
          maxLength={TIME_LOG_LIMITS.task}
          placeholder="예: 주간업무보고 초안 쓰기"
          onChange={(e) => {
            touch();
            setTask(e.target.value);
          }}
          className="nb-input w-full px-3 py-2.5 text-[15px] placeholder:text-gray-400"
        />
      </div>

      <div>
        <ChoiceGroup
          name="time-log-method"
          legend="어떤 방식으로 했나요?"
          columns
          options={METHOD_CHOICES}
          value={method}
          onChange={(value) => {
            touch();
            setMethod(value);
          }}
        />
        <p className="mt-2 text-xs text-gray-600">1주차에는 늘 하던 대로, ‘기존 방식’으로 기록해요.</p>
      </div>

      <div className="flex flex-col gap-3">
        {(
          [
            { id: "time-log-start", label: "시작한 시각", value: start, set: setStart },
            { id: "time-log-end", label: "끝난 시각", value: end, set: setEnd },
          ] as const
        ).map((field) => (
          <div key={field.id} className="flex flex-col gap-2">
            <label htmlFor={field.id} className="text-sm font-bold">
              {field.label}
            </label>
            <div className="flex gap-2">
              <input
                id={field.id}
                type="datetime-local"
                value={field.value}
                onChange={(e) => {
                  touch();
                  field.set(e.target.value);
                }}
                className="nb-input min-h-11 min-w-0 flex-1 px-3 py-2 text-[15px]"
              />
              <button
                type="button"
                aria-label={`${field.label}을 지금으로`}
                onClick={() => {
                  touch();
                  field.set(toLocalInput(new Date()));
                }}
                className="nb-btn nb-btn-white shrink-0 px-3.5 text-sm"
              >
                지금
              </button>
            </div>
          </div>
        ))}
        {minutes !== null && minutes > 0 && minutes <= TIME_LOG_LIMITS.maxMinutes && (
          <p className="text-sm font-bold">걸린 시간: {formatMinutes(minutes)}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-bold">
          중간에 끊긴 횟수
        </p>
        <CountStepper
          value={interruptions}
          onChange={(count) => {
            touch();
            setInterruptions(count);
          }}
          max={TIME_LOG_LIMITS.interruptions}
          label="중간에 끊긴 횟수"
          unit="번"
        />
        <p className="text-xs text-gray-600">전화, 메신저, 다른 요청으로 손을 뗀 횟수예요.</p>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="time-log-evidence" className="text-sm font-bold">
          완성본 화면 <span className="text-xs font-medium text-gray-500">선택</span>
        </label>
        <p className="text-xs text-gray-600">
          다 만든 결과물의 화면 캡처나 사진이에요. PNG, JPG, WebP, 5MB까지. 회사 밖으로 나가면 안
          되는 내용은 가리고 올려 주세요.
        </p>
        <input
          key={fileInputKey}
          id="time-log-evidence"
          type="file"
          accept={Object.keys(EVIDENCE_TYPES).join(",")}
          onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
          className="nb-input w-full px-3 py-2.5 text-sm file:mr-3 file:rounded-lg file:border file:border-[var(--nb-line)] file:bg-[var(--nb-paper)] file:px-3 file:py-1.5 file:text-sm file:font-bold"
        />
        {file && (
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="min-w-0 flex-1 truncate">{file.name}</span>
            <button
              type="button"
              onClick={() => {
                touch();
                clearFile();
              }}
              className="min-h-11 shrink-0 px-1 font-bold underline underline-offset-4"
            >
              화면 빼기
            </button>
          </div>
        )}
        {fileError && (
          <p role="alert" className="text-sm font-bold text-red-600">
            {fileError}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <button type="submit" disabled={sending} className="nb-btn nb-btn-primary w-full px-4 py-3.5 text-[15px]">
          {sending ? "기록하는 중…" : "기록하기"}
        </button>
        <div aria-live="polite" className="flex flex-col gap-2 text-sm">
          {status.kind === "done" && (
            <p className="nb-flat bg-[var(--nb-lime)] px-3 py-2.5 font-extrabold">
              기록했어요. 아래 목록에서 확인할 수 있어요.
            </p>
          )}
          {status.kind === "failed" && (
            <div className="text-red-600">
              <p className="font-bold">{status.message}</p>
              {status.problems.length > 0 && (
                <ul className="mt-1 flex list-disc flex-col gap-1 pl-5">
                  {status.problems.map((problem) => (
                    <li key={problem}>{problem}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {tried && errors.length > 0 && status.kind !== "failed" && (
            <ul className="flex list-disc flex-col gap-1 pl-5 text-red-600">
              {errors.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </form>
  );
}
