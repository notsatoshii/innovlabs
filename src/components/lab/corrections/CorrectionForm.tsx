"use client";

// Add one line to the correction log (SP-W2-CL): which harness produced the
// output, the sentence as the assistant wrote it, the sentence as the learner
// changed it, whether the same correction will come back, and whether it has
// been written into the harness as a rule. The line is validated again and
// written by POST /api/artifacts/correction; the list under the form is
// server-rendered, so a successful entry refreshes the page.

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ApiResult, CorrectionInput } from "@/lib/courses/types";
import { ChoiceGroup, type Choice } from "../inputs";
import { CORRECTION_LIMITS, checkCorrection } from "../rules";

type YesNo = "yes" | "no";

const RECURRING_CHOICES: Choice<YesNo>[] = [
  { value: "yes", label: "네, 또 고칠 거예요" },
  { value: "no", label: "아니요, 이번뿐이에요" },
];
const WRITTEN_CHOICES: Choice<YesNo>[] = [
  { value: "yes", label: "네, 적었어요" },
  { value: "no", label: "아직이에요" },
];

const INPUT = "nb-input w-full resize-y px-3 py-2.5 text-base leading-relaxed placeholder:text-gray-400";

type Status =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "done"; pending: boolean }
  | { kind: "failed"; message: string; problems: string[] };

export default function CorrectionForm({
  harnesses,
  initialHarnessId,
}: {
  /** The learner's saved harnesses (at least one), newest save first. */
  harnesses: { id: string; name: string; doc_type: string }[];
  initialHarnessId: string;
}) {
  const router = useRouter();
  const [harnessId, setHarnessId] = useState(initialHarnessId);
  const [original, setOriginal] = useState("");
  const [changedTo, setChangedTo] = useState("");
  const [recurring, setRecurring] = useState<YesNo | null>(null);
  const [written, setWritten] = useState<YesNo>("no");
  const [tried, setTried] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const input: CorrectionInput = {
    harness_id: harnessId,
    original: original.trim(),
    changed_to: changedTo.trim(),
    recurring: recurring === "yes",
    rule_written: written === "yes",
  };
  const errors = [
    ...checkCorrection(input),
    ...(recurring === null ? ["다음에도 되풀이될지 골라 주세요."] : []),
  ];
  const sending = status.kind === "sending";

  const touch = () => {
    if (status.kind !== "idle" && status.kind !== "sending") setStatus({ kind: "idle" });
  };

  const send = async () => {
    setTried(true);
    if (errors.length > 0) return;
    setStatus({ kind: "sending" });

    let res: Response;
    try {
      res = await fetch("/api/artifacts/correction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
    } catch {
      setStatus({ kind: "failed", message: "연결이 끊겼어요. 연결을 확인하고 다시 눌러 주세요.", problems: [] });
      return;
    }
    const result = (await res.json().catch(() => null)) as ApiResult<unknown> | null;
    if (res.ok && result?.ok) {
      // Keep the harness for the next line; clear what belongs to this one.
      setOriginal("");
      setChangedTo("");
      setRecurring(null);
      setWritten("no");
      setTried(false);
      setStatus({ kind: "done", pending: input.recurring && !input.rule_written });
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
              ? "지금은 기록이 안 돼요. 강사에게 알려 주세요."
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
      <h2 className="text-base font-extrabold">고친 것 한 줄 남기기</h2>

      <div className="flex flex-col gap-2">
        <label htmlFor="correction-harness" className="text-sm font-bold">
          어떤 하네스로 나온 결과인가요?
        </label>
        <select
          id="correction-harness"
          value={harnessId}
          onChange={(e) => {
            touch();
            setHarnessId(e.target.value);
          }}
          className="nb-input min-h-11 w-full px-3 py-2.5 text-base"
        >
          {harnesses.map((harness) => (
            <option key={harness.id} value={harness.id}>
              {harness.name}
              {harness.doc_type && harness.doc_type !== harness.name ? ` (${harness.doc_type})` : ""}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="correction-original" className="text-sm font-bold">
          원래 문장
        </label>
        <p className="text-xs text-gray-600">어시스턴트가 쓴 그대로 옮겨 주세요.</p>
        <textarea
          id="correction-original"
          rows={3}
          value={original}
          maxLength={CORRECTION_LIMITS.text}
          placeholder="예: 이번 주에는 여러 업무를 원활하게 진행했습니다."
          onChange={(e) => {
            touch();
            setOriginal(e.target.value);
          }}
          className={INPUT}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="correction-changed" className="text-sm font-bold">
          고친 문장
        </label>
        <p className="text-xs text-gray-600">보내기 전에 내가 고쳐 쓴 문장이에요.</p>
        <textarea
          id="correction-changed"
          rows={3}
          value={changedTo}
          maxLength={CORRECTION_LIMITS.text}
          placeholder="예: 이번 주에 마친 업무는 세 건입니다. 건별 진행 상황은 아래 표와 같습니다."
          onChange={(e) => {
            touch();
            setChangedTo(e.target.value);
          }}
          className={INPUT}
        />
      </div>

      <ChoiceGroup
        name="correction-recurring"
        legend="다음에도 똑같이 고치게 될까요?"
        columns
        options={RECURRING_CHOICES}
        value={recurring}
        onChange={(value) => {
          touch();
          setRecurring(value);
        }}
      />

      <ChoiceGroup
        name="correction-written"
        legend="하네스에 규칙으로 적어 두었나요?"
        columns
        options={WRITTEN_CHOICES}
        value={written}
        onChange={(value) => {
          touch();
          setWritten(value);
        }}
      />

      <div className="flex flex-col gap-3">
        <button type="submit" disabled={sending} className="nb-btn nb-btn-primary w-full px-4 py-3.5 text-[15px]">
          {sending ? "기록하는 중…" : "기록하기"}
        </button>
        <div aria-live="polite" className="flex flex-col gap-2 text-sm">
          {status.kind === "done" && (
            <>
              <p className="nb-flat bg-[var(--nb-lime)] px-3 py-2.5 font-extrabold">
                기록했어요. 아래 목록에서 확인할 수 있어요.
              </p>
              {status.pending && (
                <p className="leading-relaxed">
                  또 고치게 될 내용이에요. 아래 목록에서 ‘규칙으로 추가하기’를 누르면 하네스에 바로 넣을 수 있어요.
                </p>
              )}
            </>
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
