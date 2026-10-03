"use client";

// The Week 1 Work Map editor (SP-W1-WM): three steps on one screen, matching
// lab Parts 1 to 3. The draft autosaves to the server (useDraft); the rules
// shown under the submit button are checkWorkMap, the same function the
// submit route runs again on what it receives.

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { checkWorkMap } from "@/lib/courses/work-map";
import type { ApiResult, WorkMapDraft } from "@/lib/courses/types";
import type { WorkMapSnapshot } from "@/lib/profile/types";
import { ProblemList, SaveStatus } from "../inputs";
import { checkExtraCategories, formatHours } from "../rules";
import { useDraft } from "../useDraft";
import { StepCandidates } from "./StepCandidates";
import { StepClassify } from "./StepClassify";
import { StepWrite } from "./StepWrite";
import type { EditorCategory } from "./types";

export type WorkMapStep = 1 | 2 | 3;

const STEPS: { step: WorkMapStep; label: string }[] = [
  { step: 1, label: "업무 적기" },
  { step: 2, label: "분류하기" },
  { step: 3, label: "후보 고르기" },
];

type SubmitState =
  | { kind: "idle" }
  | { kind: "sending" }
  /** `draft` is the exact draft that was accepted; editing again clears the success panel. */
  | { kind: "done"; draft: WorkMapDraft; snapshot: WorkMapSnapshot }
  | { kind: "failed"; message: string; problems: string[] };

function failureMessage(status: number): string {
  if (status === 401) return "로그인이 풀렸어요. 다시 로그인한 뒤 제출해 주세요. 적은 내용은 그대로 있어요.";
  if (status === 422) return "아래 항목을 고친 뒤 다시 제출해 주세요.";
  if (status === 503) return "지금은 제출을 받을 수 없어요. 강사에게 알려 주세요. 적은 내용은 저장돼 있어요.";
  return "제출하지 못했어요. 잠시 뒤 다시 눌러 주세요.";
}

export default function WorkMapEditor({
  seedCategories,
  initialDraft,
  initialStep,
  submittedOn,
}: {
  /** The survey's eight categories with the learner's own hours answer as the hint. */
  seedCategories: EditorCategory[];
  initialDraft: WorkMapDraft;
  initialStep: WorkMapStep;
  /** "10월 1일" when a Work Map was submitted before, else null. */
  submittedOn: string | null;
}) {
  const router = useRouter();
  const { draft, setDraft, saveState, saveProblem, retry } = useDraft<WorkMapDraft>("work_map", initialDraft);
  const [step, setStep] = useState<WorkMapStep>(initialStep);
  const [submit, setSubmit] = useState<SubmitState>({ kind: "idle" });

  const categories: EditorCategory[] = [
    ...seedCategories,
    ...draft.extraCategories.map((c) => ({ id: c.id, label: c.label, hint: null, extra: true })),
  ];
  const check = checkWorkMap(draft);
  const errors = [...check.errors, ...checkExtraCategories(draft)];
  const written = draft.rows.reduce((sum, r) => sum + r.hours, 0);
  const inGuide = written >= 25 && written <= 50;
  const accepted = submit.kind === "done" && submit.draft === draft ? submit.snapshot : null;

  const goStep = (next: WorkMapStep) => {
    setStep(next);
    // Keep the step across a reload without adding history entries.
    window.history.replaceState(null, "", `?step=${next}`);
    window.scrollTo({ top: 0 });
  };

  const send = async () => {
    const sent = draft;
    setSubmit({ kind: "sending" });
    let res: Response;
    try {
      res = await fetch("/api/artifacts/work-map", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft: sent }),
      });
    } catch {
      setSubmit({ kind: "failed", message: "연결이 끊겼어요. 연결을 확인하고 다시 눌러 주세요.", problems: [] });
      return;
    }
    const result = (await res.json().catch(() => null)) as ApiResult<{ snapshot: WorkMapSnapshot }> | null;
    if (res.ok && result?.ok) {
      setSubmit({ kind: "done", draft: sent, snapshot: result.data.snapshot });
      router.refresh(); // the page's "submitted on" line and the 나의 AI 교육 card
      return;
    }
    setSubmit({
      kind: "failed",
      message: failureMessage(res.status),
      problems: result && !result.ok ? (result.problems ?? []) : [],
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Sticky bar: step switcher, running total, save state. */}
      <div className="sticky top-[var(--site-header-h)] z-20 -mx-6 border-b border-[var(--nb-line)] bg-[var(--background)] px-6 py-2.5">
        <nav aria-label="워크맵 단계">
          <ol className="grid grid-cols-3 gap-1.5">
            {STEPS.map(({ step: n, label }) => (
              <li key={n}>
                <button
                  type="button"
                  onClick={() => goStep(n)}
                  aria-current={step === n ? "step" : undefined}
                  className={`flex min-h-11 w-full items-center justify-center gap-1 rounded-xl border border-[var(--nb-line)] px-1 text-[13px] leading-tight ${
                    step === n ? "nb-selected font-extrabold" : "bg-[var(--nb-paper)] font-semibold"
                  }`}
                >
                  <span aria-hidden>{n}</span>
                  <span>{label}</span>
                </button>
              </li>
            ))}
          </ol>
        </nav>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs">
          <p className="font-bold">
            합계 주 {formatHours(written)}시간 · {draft.rows.length}줄
          </p>
          <SaveStatus state={saveState} problem={saveProblem} onRetry={retry} />
        </div>
        {/* Running total against the 25 to 50 hour guide: lime inside it, yellow outside. */}
        <div
          className="nb-track mt-1.5 h-2.5"
          role="img"
          aria-label={
            inGuide
              ? "합계가 보통 범위인 주 25~50시간 안에 있어요."
              : "합계가 보통 범위인 주 25~50시간 밖이에요."
          }
        >
          <div
            className={inGuide ? "nb-fill" : "nb-fill bg-[var(--nb-yellow)]"}
            style={{ width: `${Math.min(100, (written / 50) * 100)}%` }}
          />
        </div>
      </div>

      {step === 1 && <StepWrite categories={categories} draft={draft} setDraft={setDraft} />}
      {step === 2 && (
        <StepClassify
          categories={categories}
          draft={draft}
          setDraft={setDraft}
          onGoWrite={() => goStep(1)}
        />
      )}
      {step === 3 && (
        <>
          <StepCandidates draft={draft} setDraft={setDraft} onGoClassify={() => goStep(2)} />

          <section className="nb-card flex flex-col gap-3 px-4 py-4">
            {accepted ? (
              <div aria-live="polite" className="flex flex-col gap-3">
                <p className="nb-flat bg-[var(--nb-lime)] px-3 py-2.5 text-[15px] font-extrabold">
                  워크맵을 제출했어요.
                </p>
                <p className="text-sm leading-relaxed">
                  P 합계 주 {formatHours(accepted.totals.p_hours)}시간, T 합계 주{" "}
                  {formatHours(accepted.totals.t_hours)}시간이에요. 다음은 후보 1로 해 보는 기본기
                  바로잡기예요.
                </p>
                <Link
                  href="/app/lab/drill"
                  className="nb-btn nb-btn-primary block px-4 py-3 text-center text-[15px]"
                >
                  기본기 바로잡기로 가기
                </Link>
                <Link
                  href="/app/lab/time-log"
                  className="nb-btn nb-btn-white block px-4 py-3 text-center text-[15px]"
                >
                  시간 기록 열기
                </Link>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={send}
                  disabled={errors.length > 0 || submit.kind === "sending"}
                  className="nb-btn nb-btn-primary w-full px-4 py-3.5 text-[15px]"
                >
                  {submit.kind === "sending"
                    ? "제출하는 중…"
                    : submittedOn
                      ? "워크맵 다시 제출하기"
                      : "워크맵 제출하기"}
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
                <ProblemList errors={errors} warnings={check.warnings} />
                <p className="text-xs leading-relaxed text-gray-600">
                  제출한 워크맵은 본인과 이노랩스 강사진만 볼 수 있어요.
                  {submittedOn &&
                    " 다시 제출하면 새 내용으로 바뀌고, 이전에 제출한 내용도 기록에 남아요."}
                </p>
              </>
            )}
          </section>
        </>
      )}

      <div className="flex gap-2">
        {step > 1 && (
          <button
            type="button"
            onClick={() => goStep((step - 1) as WorkMapStep)}
            className="nb-btn nb-btn-white flex-1 px-4 py-3 text-sm"
          >
            이전: {STEPS[step - 2].label}
          </button>
        )}
        {step < 3 && (
          <button
            type="button"
            onClick={() => goStep((step + 1) as WorkMapStep)}
            className="nb-btn nb-btn-primary flex-1 px-4 py-3 text-sm"
          >
            다음: {STEPS[step].label}
          </button>
        )}
      </div>
    </div>
  );
}
