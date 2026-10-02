"use client";

// The Week 1 basics drill sheet (SP-W1-BAS, lab Part 4): which task, at least
// four differences between the first and second attempt, the one thing the
// second attempt invented or got wrong, and the one line on what is still
// left for a person. The two outputs themselves stay in the learner's
// assistant; only these notes are stored. Draft autosaves (kind "drill").

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ApiResult, DrillDraft } from "@/lib/courses/types";
import { ProblemList, SaveStatus } from "./inputs";
import { DRILL_LIMITS, checkDrill } from "./rules";
import { useDraft } from "./useDraft";

const SYNTHETIC_PACK = "연습용 자료 묶음";

// What to look at when comparing (Part 4, step 3): structure, register, length, what it got right.
const DIFFERENCE_PLACEHOLDERS = [
  "예: 구성 - 2차는 우리 팀 양식 순서대로 나왔다",
  "예: 말투 - 2차는 보고서에 쓰는 말투다",
  "예: 길이 - 1차는 반 장, 2차는 한 장",
  "예: 2차가 제대로 맞힌 부분",
];

type SubmitState =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "done"; draft: DrillDraft }
  | { kind: "failed"; message: string; problems: string[] };

export default function DrillForm({
  initialDraft,
  candidates,
  completedOn,
}: {
  initialDraft: DrillDraft;
  /** Candidate task names from the submitted Work Map, in rank order. */
  candidates: string[];
  /** "10월 1일" when a drill was submitted before, else null. */
  completedOn: string | null;
}) {
  const router = useRouter();
  const { draft, setDraft, saveState, saveProblem, retry } = useDraft<DrillDraft>("drill", initialDraft);
  const [submit, setSubmit] = useState<SubmitState>({ kind: "idle" });
  // The problem list waits for the first tap on 제출하기 (review A13): a fresh
  // sheet should not open on four red errors. Until then the button only
  // looks disabled (aria-disabled), so the tap can reveal what is missing.
  const [attempted, setAttempted] = useState(false);

  const errors = checkDrill(draft);
  const accepted = submit.kind === "done" && submit.draft === draft;
  const taskChoices = [...candidates.map((name, i) => ({ label: `후보 ${i + 1}`, value: name })), {
    label: SYNTHETIC_PACK,
    value: SYNTHETIC_PACK,
  }];

  const setDifference = (index: number, value: string) => {
    setDraft((d) => ({ ...d, differences: d.differences.map((line, i) => (i === index ? value : line)) }));
  };

  const send = async () => {
    const sent = draft;
    setSubmit({ kind: "sending" });
    let res: Response;
    try {
      res = await fetch("/api/artifacts/drill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft: sent }),
      });
    } catch {
      setSubmit({ kind: "failed", message: "연결이 끊겼어요. 연결을 확인하고 다시 눌러 주세요.", problems: [] });
      return;
    }
    const result = (await res.json().catch(() => null)) as ApiResult<unknown> | null;
    if (res.ok && result?.ok) {
      setSubmit({ kind: "done", draft: sent });
      router.refresh();
      return;
    }
    setSubmit({
      kind: "failed",
      message:
        res.status === 401
          ? "로그인이 풀렸어요. 다시 로그인한 뒤 제출해 주세요. 적은 내용은 그대로 있어요."
          : res.status === 422
            ? "아래 항목을 고친 뒤 다시 제출해 주세요."
            : "제출하지 못했어요. 잠시 뒤 다시 눌러 주세요.",
      problems: result && !result.ok ? (result.problems ?? []) : [],
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <section className="nb-flat px-4 py-4 text-sm leading-relaxed">
        <ol className="flex flex-col gap-2">
          <li>
            <b>1차.</b> 어시스턴트에게 평소 하던 대로 한 문장으로 부탁해요.
          </li>
          <li>
            <b>2차.</b> 새 대화를 열고 잘된 완성본 예시, 양식, 이번 주 원자료를 이 순서로 준 다음,
            형식과 말투, 정보가 빠졌을 때 어떻게 할지를 담아 지시해요. 원자료를 먼저 넣으면 결과가
            오히려 나빠져요.
          </li>
        </ol>
        <p className="mt-3 font-bold">
          두 결과물은 여기에 올리지 않아요. 쓰시는 어시스턴트 대화에 그대로 두고, 비교한 내용만 적어
          주세요.
        </p>
      </section>

      <div className="flex justify-end">
        <SaveStatus state={saveState} problem={saveProblem} onRetry={retry} />
      </div>

      <section className="nb-card flex flex-col gap-3 px-4 py-4">
        <label htmlFor="drill-task" className="text-[15px] font-extrabold">
          어떤 업무로 해 봤나요?
        </label>
        <input
          id="drill-task"
          type="text"
          value={draft.task}
          maxLength={DRILL_LIMITS.task}
          placeholder="예: 주간업무보고 초안 쓰기"
          onChange={(e) => setDraft((d) => ({ ...d, task: e.target.value }))}
          className="nb-input w-full px-3 py-2.5 text-[15px] placeholder:text-gray-400"
        />
        <div className="flex flex-col gap-2">
          <p className="text-xs text-gray-600">
            후보 1의 자료가 기밀이거나 지금 없으면 후보 2나 연습용 자료 묶음으로 해도 돼요.
          </p>
          <div className="flex flex-wrap gap-2">
            {taskChoices.map((choice) => (
              <button
                key={choice.label}
                type="button"
                aria-pressed={draft.task === choice.value}
                onClick={() => setDraft((d) => ({ ...d, task: choice.value }))}
                className={`min-h-11 rounded-full border-2 border-[var(--nb-ink)] px-3.5 text-sm ${
                  draft.task === choice.value ? "nb-selected font-bold" : "bg-[var(--nb-paper)]"
                }`}
              >
                {choice.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="nb-card flex flex-col gap-3 px-4 py-4">
        <div>
          <h2 className="text-[15px] font-extrabold">1차와 2차, 무엇이 달라졌나요?</h2>
          <p className="mt-1 text-xs text-gray-600">
            두 결과를 나란히 놓고 네 가지 이상, 한 줄씩 짧게 적어 주세요. 구성, 말투, 길이, 제대로
            맞힌 부분을 보면 돼요.
          </p>
        </div>
        <ol className="flex flex-col gap-2">
          {draft.differences.map((line, index) => (
            <li key={index} className="flex items-center gap-2">
              <span aria-hidden className="w-5 shrink-0 text-center text-sm font-extrabold">
                {index + 1}
              </span>
              <input
                type="text"
                aria-label={`달라진 점 ${index + 1}`}
                value={line}
                maxLength={DRILL_LIMITS.difference}
                placeholder={DIFFERENCE_PLACEHOLDERS[index] ?? "예: 그 밖에 눈에 띈 차이"}
                onChange={(e) => setDifference(index, e.target.value)}
                className="nb-input min-w-0 flex-1 px-3 py-2.5 text-[15px] placeholder:text-gray-400"
              />
              {index >= DRILL_LIMITS.minDifferences && (
                <button
                  type="button"
                  aria-label={`달라진 점 ${index + 1} 지우기`}
                  onClick={() =>
                    setDraft((d) => ({ ...d, differences: d.differences.filter((_, i) => i !== index) }))
                  }
                  className="min-h-11 shrink-0 px-1 text-sm font-bold underline underline-offset-4"
                >
                  지우기
                </button>
              )}
            </li>
          ))}
        </ol>
        <button
          type="button"
          disabled={draft.differences.length >= DRILL_LIMITS.differences}
          onClick={() => setDraft((d) => ({ ...d, differences: [...d.differences, ""] }))}
          className="nb-btn nb-btn-white w-full px-4 py-2.5 text-sm"
        >
          + 한 줄 더
        </button>
      </section>

      <section className="nb-card flex flex-col gap-2 px-4 py-4">
        <label htmlFor="drill-invention" className="text-[15px] font-extrabold">
          2차 결과가 지어냈거나 틀린 것 하나
        </label>
        <p className="text-xs text-gray-600">
          없는 숫자를 만들었거나, 넘겨짚었거나, 틀리게 쓴 곳이요. 하나는 꼭 나와요.
        </p>
        <textarea
          id="drill-invention"
          rows={3}
          value={draft.invention}
          maxLength={DRILL_LIMITS.invention}
          placeholder="예: 원자료에 없는 ‘전주 대비 12% 증가’를 써 넣었다"
          onChange={(e) => setDraft((d) => ({ ...d, invention: e.target.value }))}
          className="nb-input w-full px-3 py-2.5 text-[15px] leading-relaxed placeholder:text-gray-400"
        />
      </section>

      <section className="nb-card flex flex-col gap-2 px-4 py-4">
        <label htmlFor="drill-left" className="text-[15px] font-extrabold">
          사람이 아직 해야 할 일
        </label>
        <p className="text-xs text-gray-600">
          2차 결과를 그대로 내보내려면 사람이 무엇을 더 해야 하나요? 한 줄로 적어 주세요.
        </p>
        <input
          id="drill-left"
          type="text"
          value={draft.leftForHuman}
          maxLength={DRILL_LIMITS.leftForHuman}
          placeholder="예: 어떤 성과를 맨 앞에 둘지 정하고, 숫자를 원자료와 맞춰 보기"
          onChange={(e) => setDraft((d) => ({ ...d, leftForHuman: e.target.value }))}
          className="nb-input w-full px-3 py-2.5 text-[15px] placeholder:text-gray-400"
        />
      </section>

      <section className="nb-card flex flex-col gap-3 px-4 py-4">
        {accepted ? (
          <div aria-live="polite" className="flex flex-col gap-3">
            <p className="nb-flat bg-[var(--nb-lime)] px-3 py-2.5 text-[15px] font-extrabold">
              기본기 바로잡기를 제출했어요.
            </p>
            <p className="text-sm leading-relaxed">
              이번 주 과제는 후보 1을 평소 방식대로 하면서 시간을 기록하는 거예요.
            </p>
            <Link
              href="/app/lab/time-log"
              className="nb-btn nb-btn-primary block px-4 py-3 text-center text-[15px]"
            >
              시간 기록 열기
            </Link>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={() => {
                if (errors.length > 0) {
                  setAttempted(true);
                  return;
                }
                void send();
              }}
              disabled={submit.kind === "sending"}
              aria-disabled={errors.length > 0 || undefined}
              className="nb-btn nb-btn-primary w-full px-4 py-3.5 text-[15px]"
            >
              {submit.kind === "sending" ? "제출하는 중…" : completedOn ? "다시 제출하기" : "제출하기"}
            </button>
            {submit.kind === "failed" && (
              <div role="alert" className="text-sm text-red-600">
                <p className="font-bold">{submit.message}</p>
                {submit.problems.length > 0 && (
                  <ul className="mt-1 flex list-disc flex-col gap-1 pl-5">
                    {submit.problems.map((problem) => (
                      <li key={problem}>{problem}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            <div aria-live="polite">{attempted && <ProblemList errors={errors} />}</div>
            {completedOn && (
              <p className="text-xs leading-relaxed text-gray-600">
                {completedOn}에 제출했어요. 다시 제출하면 기록이 하나 더 남아요.
              </p>
            )}
          </>
        )}
      </section>
    </div>
  );
}
