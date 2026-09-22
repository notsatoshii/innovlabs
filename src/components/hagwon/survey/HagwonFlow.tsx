"use client";

// 학원 AI 진단 survey flow, schema v0.2 (docs/product/hagwon_survey_schema_v0.2.md).
// One screen per tap group, ~20 taps. Q4 (the primary router) is three
// single-select screens that hide already-chosen items: the schema's own
// fallback for phones (plan H4). Q7b appears only for 중등 내신 / 고등 입시.
// Submission freezes an immutable response (CLAUDE.md rule 2) with the
// rule-based hagwon scoring stored alongside; no LLM anywhere on this path.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Q0_RESPONDENT,
  Q1_TYPES,
  Q2_STUDENTS,
  Q2_TEACHERS,
  Q3_PROGRAM,
  Q4_PAIN,
  Q5A_COUNSEL,
  Q5B_RECORD,
  Q6A_REPORTS,
  Q6B_STORAGE,
  Q7A_WORKSHEETS,
  Q7B_PAST_EXAMS,
  Q8A_POSTING,
  Q8B_OWNER,
  Q9_WATCHER,
  Q10_TEACHER_SINK,
  Q11_AI_USAGE,
  QUESTION_TITLES,
} from "@/lib/hagwon/questions";
import { isSecondary, scoreHagwon } from "@/lib/hagwon/scoring";
import {
  HAGWON_SCHEMA_VERSION,
  isHagwonResult,
  type HagwonAnswers,
  type PainItem,
} from "@/lib/hagwon/types";
import type { SurveyResponse } from "@/lib/survey/types";
import { appendEvent, loadResponse, submitResponse } from "@/lib/survey/storage";
import { insertSurveyResponse, logEventRemote } from "@/lib/survey/remote";
import {
  clearHagwonDraft,
  loadHagwonDraft,
  saveHagwonDraft,
  type DraftAnswers,
} from "./draft";
import { ChoiceList, MultiChoice, SubLabel } from "./inputs";

type StepId =
  | "q0"
  | "q1"
  | "q2"
  | "q3"
  | "q4_1"
  | "q4_2"
  | "q4_3"
  | "q5"
  | "q6"
  | "q7"
  | "q8"
  | "q9"
  | "q10"
  | "q11"
  | "q12";

const STEPS: StepId[] = [
  "q0",
  "q1",
  "q2",
  "q3",
  "q4_1",
  "q4_2",
  "q4_3",
  "q5",
  "q6",
  "q7",
  "q8",
  "q9",
  "q10",
  "q11",
  "q12",
];

/** Small section label above the title, like the employee survey's sections. */
const SECTION: Record<StepId, string> = {
  q0: "학원 소개",
  q1: "학원 소개",
  q2: "학원 소개",
  q3: "학원 소개",
  q4_1: "없애고 싶은 일",
  q4_2: "없애고 싶은 일",
  q4_3: "없애고 싶은 일",
  q5: "학부모 상담",
  q6: "성적표",
  q7: "문제·시험",
  q8: "마케팅",
  q9: "학원 운영",
  q10: "학원 운영",
  q11: "학원 운영",
  q12: "마무리",
};

const Q12_MAX = 200;
const EMPTY_Q4: (PainItem | null)[] = [null, null, null];

function secondaryOf(a: DraftAnswers): boolean {
  return isSecondary({ q1: a.q1 ?? [] });
}

function isComplete(step: StepId, a: DraftAnswers): boolean {
  const q4 = a.q4 ?? EMPTY_Q4;
  switch (step) {
    case "q0":
      return a.q0 !== undefined;
    case "q1":
      return (a.q1?.length ?? 0) > 0;
    case "q2":
      return a.q2_students !== undefined && a.q2_teachers !== undefined;
    case "q3":
      return a.q3 !== undefined;
    case "q4_1":
      return q4[0] != null;
    case "q4_2":
      return q4[1] != null;
    case "q4_3":
      return q4[2] != null;
    case "q5":
      return a.q5a !== undefined && a.q5b !== undefined;
    case "q6":
      return a.q6a !== undefined && a.q6b !== undefined;
    case "q7":
      return a.q7a !== undefined && (!secondaryOf(a) || a.q7b !== undefined);
    case "q8":
      return a.q8a !== undefined && a.q8b !== undefined;
    case "q9":
      return a.q9 !== undefined;
    case "q10":
      return a.q10 !== undefined;
    case "q11":
      return a.q11 !== undefined;
    case "q12":
      return true;
  }
}

/** Validate the draft into the contract type; null while anything is missing. */
function toAnswers(a: DraftAnswers): HagwonAnswers | null {
  const q4 = a.q4 ?? EMPTY_Q4;
  if (
    a.q0 === undefined ||
    !a.q1 ||
    a.q1.length === 0 ||
    a.q2_students === undefined ||
    a.q2_teachers === undefined ||
    a.q3 === undefined ||
    q4[0] == null ||
    q4[1] == null ||
    q4[2] == null ||
    a.q5a === undefined ||
    a.q5b === undefined ||
    a.q6a === undefined ||
    a.q6b === undefined ||
    a.q7a === undefined ||
    a.q8a === undefined ||
    a.q8b === undefined ||
    a.q9 === undefined ||
    a.q10 === undefined ||
    a.q11 === undefined
  ) {
    return null;
  }
  const secondary = secondaryOf(a);
  if (secondary && a.q7b === undefined) return null;
  const name = a.q3 === "program" ? a.q3_name?.trim() : undefined;
  const goal = a.q12?.trim().slice(0, Q12_MAX);
  return {
    q0: a.q0,
    q1: a.q1,
    q2_students: a.q2_students,
    q2_teachers: a.q2_teachers,
    q3: a.q3,
    ...(name ? { q3_name: name } : {}),
    q4: [q4[0], q4[1], q4[2]],
    q5a: a.q5a,
    q5b: a.q5b,
    q6a: a.q6a,
    q6b: a.q6b,
    q7a: a.q7a,
    ...(secondary ? { q7b: a.q7b } : {}),
    q8a: a.q8a,
    q8b: a.q8b,
    q9: a.q9,
    q10: a.q10,
    q11: a.q11,
    ...(goal ? { q12: goal } : {}),
  };
}

export function HagwonFlow() {
  const router = useRouter();
  const [answers, setAnswers] = useState<DraftAnswers>({});
  const [stepIndex, setStepIndex] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Latest answers for the deferred auto-advance (a stale closure would drop
  // the answer tapped on the final auto-advancing step).
  const answersRef = useRef<DraftAnswers>(answers);
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  // Restore the draft, or send an already-submitted session to its result.
  // sessionStorage is client-only, so hydrating in a mount effect is intentional.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const existing = loadResponse();
    if (existing) {
      router.replace(isHagwonResult(existing.scoring) ? "/hagwon/result" : "/teaser");
      return;
    }
    const draft = loadHagwonDraft();
    if (draft) {
      setAnswers(draft.answers);
      setStepIndex(Math.min(Math.max(draft.step, 0), STEPS.length - 1));
    }
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!hydrated) return;
    saveHagwonDraft({ answers, step: stepIndex });
  }, [answers, stepIndex, hydrated]);

  useEffect(
    () => () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
    },
    [],
  );

  if (!hydrated) return null;

  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;
  const secondary = secondaryOf(answers);
  const q4 = answers.q4 ?? EMPTY_Q4;

  const goNext = () => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    if (isLast) {
      finish();
      return;
    }
    setStepIndex(stepIndex + 1);
    window.scrollTo(0, 0);
  };

  const goBack = () => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    if (stepIndex > 0) {
      setStepIndex(stepIndex - 1);
      window.scrollTo(0, 0);
    } else {
      router.push("/start");
    }
  };

  const autoAdvance = () => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    advanceTimer.current = setTimeout(goNext, 250);
  };

  /**
   * Apply a tap. When the tap completes the screen and the screen has no
   * free-text part pending, advance after a short pause (employee-survey UX).
   */
  const answer = (patch: DraftAnswers, advanceWhenComplete = true) => {
    const next = { ...answers, ...patch };
    setAnswers(next);
    if (advanceWhenComplete && isComplete(step, next)) autoAdvance();
  };

  /** Q4: set rank i; a duplicate in another slot is cleared. */
  const setRank = (i: 0 | 1 | 2, item: PainItem) => {
    const next = q4.map((slot, j) => (j === i ? item : slot === item ? null : slot));
    answer({ q4: next });
  };

  const finish = (override: DraftAnswers = {}) => {
    const built = toAnswers({ ...answersRef.current, ...override });
    if (!built) return;
    const scoring = scoreHagwon(built);
    const response: SurveyResponse = {
      schema_version: HAGWON_SCHEMA_VERSION,
      path: "hagwon",
      submitted_at: new Date().toISOString(),
      q5_variant: null,
      org_code: null,
      answers: { ...built },
      scoring,
    };
    submitResponse(response);
    clearHagwonDraft();
    appendEvent({ type: "survey_completed", data: { path: "hagwon" } });
    // Mirror to Supabase (fire-and-forget; ensureResponseRow retries at registration).
    void insertSurveyResponse(response).then((id) => {
      void logEventRemote("survey_completed", { path: "hagwon", ok: id !== null });
    });
    router.push("/hagwon/result");
  };

  // --- rendering ---

  const progress = Math.round(((stepIndex + 1) / STEPS.length) * 100);
  const complete = isComplete(step, answers);

  let title: string = "";
  let body: React.ReactNode = null;
  let needsNextButton = true;

  switch (step) {
    case "q0":
      title = QUESTION_TITLES.q0;
      needsNextButton = false;
      body = (
        <ChoiceList options={Q0_RESPONDENT} value={answers.q0} onSelect={(id) => answer({ q0: id })} />
      );
      break;
    case "q1":
      title = QUESTION_TITLES.q1;
      body = (
        <MultiChoice
          options={Q1_TYPES}
          value={answers.q1 ?? []}
          onChange={(ids) => answer({ q1: ids }, false)}
        />
      );
      break;
    case "q2":
      title = QUESTION_TITLES.q2;
      body = (
        <div className="flex flex-col gap-6">
          <div>
            <SubLabel>{QUESTION_TITLES.q2_students}</SubLabel>
            <ChoiceList
              options={Q2_STUDENTS}
              value={answers.q2_students}
              onSelect={(id) => answer({ q2_students: id })}
            />
          </div>
          <div>
            <SubLabel>{QUESTION_TITLES.q2_teachers}</SubLabel>
            <ChoiceList
              options={Q2_TEACHERS}
              value={answers.q2_teachers}
              onSelect={(id) => answer({ q2_teachers: id })}
            />
          </div>
        </div>
      );
      break;
    case "q3": {
      const isProgram = answers.q3 === "program";
      needsNextButton = isProgram;
      body = (
        <div className="flex flex-col gap-2">
          <ChoiceList
            options={Q3_PROGRAM}
            value={answers.q3}
            onSelect={(id) => answer({ q3: id }, id !== "program")}
          />
          {isProgram && (
            <div className="mt-2">
              <label htmlFor="q3_name" className="mb-1 block text-sm font-bold text-gray-700">
                {QUESTION_TITLES.q3_name} (선택)
              </label>
              <input
                id="q3_name"
                type="text"
                autoFocus
                maxLength={60}
                value={answers.q3_name ?? ""}
                onChange={(e) => answer({ q3_name: e.target.value }, false)}
                placeholder="쓰고 계신 프로그램 이름"
                className="nb-input w-full px-4 py-3 text-[15px]"
              />
            </div>
          )}
        </div>
      );
      title = QUESTION_TITLES.q3;
      break;
    }
    case "q4_1":
    case "q4_2":
    case "q4_3": {
      const i = (step === "q4_1" ? 0 : step === "q4_2" ? 1 : 2) as 0 | 1 | 2;
      const taken = q4.filter((item, j) => j !== i && item != null);
      title = QUESTION_TITLES[step];
      needsNextButton = false;
      body = (
        <ChoiceList
          options={Q4_PAIN.filter((o) => !taken.includes(o.id))}
          value={q4[i]}
          onSelect={(id) => setRank(i, id)}
        />
      );
      break;
    }
    case "q5":
      title = QUESTION_TITLES.q5;
      body = (
        <div className="flex flex-col gap-6">
          <div>
            <SubLabel>{QUESTION_TITLES.q5a}</SubLabel>
            <ChoiceList options={Q5A_COUNSEL} value={answers.q5a} onSelect={(id) => answer({ q5a: id })} />
          </div>
          <div>
            <SubLabel>{QUESTION_TITLES.q5b}</SubLabel>
            <ChoiceList options={Q5B_RECORD} value={answers.q5b} onSelect={(id) => answer({ q5b: id })} />
          </div>
        </div>
      );
      break;
    case "q6":
      title = QUESTION_TITLES.q6;
      body = (
        <div className="flex flex-col gap-6">
          <div>
            <SubLabel>{QUESTION_TITLES.q6a}</SubLabel>
            <ChoiceList options={Q6A_REPORTS} value={answers.q6a} onSelect={(id) => answer({ q6a: id })} />
          </div>
          <div>
            <SubLabel>{QUESTION_TITLES.q6b}</SubLabel>
            <ChoiceList options={Q6B_STORAGE} value={answers.q6b} onSelect={(id) => answer({ q6b: id })} />
          </div>
        </div>
      );
      break;
    case "q7":
      title = QUESTION_TITLES.q7;
      // Q7b only for 중등 내신 / 고등 입시 (schema); a single screen otherwise.
      needsNextButton = secondary;
      body = (
        <div className="flex flex-col gap-6">
          <div>
            {secondary && <SubLabel>{QUESTION_TITLES.q7a}</SubLabel>}
            <ChoiceList options={Q7A_WORKSHEETS} value={answers.q7a} onSelect={(id) => answer({ q7a: id })} />
          </div>
          {secondary && (
            <div>
              <SubLabel>{QUESTION_TITLES.q7b}</SubLabel>
              <ChoiceList options={Q7B_PAST_EXAMS} value={answers.q7b} onSelect={(id) => answer({ q7b: id })} />
            </div>
          )}
        </div>
      );
      break;
    case "q8":
      title = QUESTION_TITLES.q8;
      body = (
        <div className="flex flex-col gap-6">
          <div>
            <SubLabel>{QUESTION_TITLES.q8a}</SubLabel>
            <ChoiceList options={Q8A_POSTING} value={answers.q8a} onSelect={(id) => answer({ q8a: id })} />
          </div>
          <div>
            <SubLabel>{QUESTION_TITLES.q8b}</SubLabel>
            <ChoiceList options={Q8B_OWNER} value={answers.q8b} onSelect={(id) => answer({ q8b: id })} />
          </div>
        </div>
      );
      break;
    case "q9":
      title = QUESTION_TITLES.q9;
      needsNextButton = false;
      body = <ChoiceList options={Q9_WATCHER} value={answers.q9} onSelect={(id) => answer({ q9: id })} />;
      break;
    case "q10":
      title = QUESTION_TITLES.q10;
      needsNextButton = false;
      body = (
        <ChoiceList options={Q10_TEACHER_SINK} value={answers.q10} onSelect={(id) => answer({ q10: id })} />
      );
      break;
    case "q11":
      title = QUESTION_TITLES.q11;
      needsNextButton = false;
      body = <ChoiceList options={Q11_AI_USAGE} value={answers.q11} onSelect={(id) => answer({ q11: id })} />;
      break;
    case "q12": {
      const text = answers.q12 ?? "";
      title = QUESTION_TITLES.q12;
      body = (
        <div>
          <textarea
            value={text}
            rows={5}
            maxLength={Q12_MAX}
            placeholder="예: 매달 성적표 쓰느라 주말이 사라지는 일이 없어지면 좋겠습니다."
            onChange={(e) => answer({ q12: e.target.value.slice(0, Q12_MAX) }, false)}
            className="nb-input w-full px-4 py-3 text-[15px] leading-relaxed placeholder:text-gray-400"
          />
          <p className="mt-1 text-right text-xs tabular-nums text-gray-400">
            {text.length}/{Q12_MAX}
          </p>
        </div>
      );
      break;
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 pb-10 pt-4">
      <div className="mb-6 flex items-center gap-3">
        <button
          type="button"
          onClick={goBack}
          aria-label="이전"
          className="-ml-2 rounded-full p-2 text-gray-500 active:bg-gray-100"
        >
          ←
        </button>
        <div className="nb-track h-3.5 flex-1">
          <div className="nb-fill" style={{ width: `${progress}%` }} />
        </div>
        <span className="text-xs tabular-nums text-gray-400">
          {stepIndex + 1}/{STEPS.length}
        </span>
      </div>

      <p className="nb-accent mb-1 text-xs font-extrabold">{SECTION[step]}</p>
      <h1 className="mb-1 text-xl font-extrabold leading-snug">{title}</h1>
      <div className="mt-3">{body}</div>

      <div className="mt-auto pt-6">
        {needsNextButton && (
          <button
            type="button"
            disabled={!complete}
            onClick={goNext}
            className="nb-btn nb-btn-primary w-full py-3.5 text-[15px]"
          >
            {isLast ? "결과 보기" : "다음"}
          </button>
        )}
        {step === "q12" && (
          <button
            type="button"
            onClick={() => finish({ q12: undefined })}
            className="mt-2 w-full py-2 text-sm text-gray-400"
          >
            건너뛰기
          </button>
        )}
      </div>
    </div>
  );
}
