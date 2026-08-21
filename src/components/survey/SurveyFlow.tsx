"use client";

// Employee survey flow — one step per screen, in-memory + sessionStorage state.
// Phase 1: no backend. Submission freezes an immutable response (spec rule 2).

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  B2B_PRIVACY_STATEMENT,
  Q5_TITLE,
  QUESTIONS,
  SECTION_NAMES,
  TASK_CLUSTERS,
} from "@/lib/survey/questions";
import { buildSteps, type Step } from "@/lib/survey/flow";
import {
  scoreSurvey,
  type AiPolicyId,
  type DepartmentId,
  type MgmtScopeId,
  type PcEnvId,
  type RankId,
  type ScoringInput,
} from "@/lib/survey/scoring";
import {
  SCHEMA_VERSION,
  type HourBucket,
  type Q5Variant,
  type SurveyResponse,
  type TaskClusterId,
  type TaskHours,
} from "@/lib/survey/types";
import { appendEvent, loadDraft, loadResponse, saveDraft, submitResponse } from "@/lib/survey/storage";
import { insertSurveyResponse, logEventRemote } from "@/lib/survey/remote";
import { HourButtons, MultiSelect, SingleSelect, TextAnswer } from "./inputs";
import { HourGrid } from "./HourGrid";

type Answers = Record<string, unknown>;

export function SurveyFlow({
  q5Variant,
  orgCode,
}: {
  q5Variant: Q5Variant;
  orgCode: string | null;
}) {
  const router = useRouter();
  const steps = useMemo(() => buildSteps(q5Variant, orgCode !== null), [q5Variant, orgCode]);

  const [answers, setAnswers] = useState<Answers>({});
  const [stepIndex, setStepIndex] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Latest answers for callbacks deferred via setTimeout (auto-advance): a
  // stale closure would drop the answer selected on the final step. Synced in
  // an effect, which always runs before the 250ms auto-advance timer fires.
  const answersRef = useRef<Answers>(answers);
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  // Restore draft / block re-entry after submission. sessionStorage is
  // client-only, so hydrating state from it inside a mount effect is intentional.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (loadResponse()) {
      router.replace("/teaser");
      return;
    }
    const draft = loadDraft();
    if (draft && draft.q5Variant === q5Variant && draft.orgCode === orgCode) {
      setAnswers(draft.answers);
      setStepIndex(Math.min(draft.step, steps.length - 1));
    }
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Persist draft on every change.
  useEffect(() => {
    if (!hydrated) return;
    saveDraft({ answers, step: stepIndex, q5Variant, orgCode });
  }, [answers, stepIndex, hydrated, q5Variant, orgCode]);

  useEffect(() => () => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
  }, []);

  if (!hydrated) return null;

  const step = steps[stepIndex];
  const taskHours = (answers.task_hours ?? {}) as Partial<Record<TaskClusterId, HourBucket>>;

  const set = (key: string, value: unknown) =>
    setAnswers((prev) => ({ ...prev, [key]: value }));

  const isStepComplete = (s: Step): boolean => {
    if (s.kind === "hours-grid")
      return TASK_CLUSTERS.every((c) => taskHours[c.id] !== undefined);
    if (s.kind === "hours-seq") return taskHours[s.cluster] !== undefined;
    const q = QUESTIONS[s.questionId];
    if (q.optional) return true;
    const field = FIELD_BY_QUESTION[q.id] ?? q.id;
    const v = answers[field];
    if (q.type === "single") {
      if (typeof v !== "string" || v === "") return false;
      const opt = q.options?.find((o) => o.id === v);
      if (opt?.otherInput) {
        const other = answers[`${field}_other`];
        return typeof other === "string" && other.trim() !== "";
      }
      return true;
    }
    if (q.type === "multi") return Array.isArray(v) && v.length > 0;
    return typeof v === "string" && v.trim() !== "";
  };

  const goNext = () => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    if (stepIndex < steps.length - 1) {
      setStepIndex(stepIndex + 1);
      window.scrollTo(0, 0);
    } else {
      finish();
    }
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

  /** Auto-advance UX for pure single-taps (no free-text follow-up pending). */
  const autoAdvance = () => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    advanceTimer.current = setTimeout(goNext, 250);
  };

  const finish = () => {
    const a = answersRef.current;
    const input: ScoringInput = {
      taskHours: a.task_hours as TaskHours,
      topTimeSink: a.top_time_sink as TaskClusterId,
      mostRepetitive: a.most_repetitive as TaskClusterId,
      department: a.department as DepartmentId,
      rank: a.rank as RankId,
      mgmtScope: a.mgmt_scope as MgmtScopeId,
      aiPolicy: a.ai_policy as AiPolicyId,
      pcEnv: a.pc_env as PcEnvId,
    };
    const scoring = scoreSurvey(input);

    const response: SurveyResponse = {
      schema_version: SCHEMA_VERSION,
      path: "employee",
      submitted_at: new Date().toISOString(),
      q5_variant: q5Variant,
      org_code: orgCode,
      answers: a,
      scoring,
    };
    submitResponse(response);
    appendEvent({ type: "survey_completed", data: { q5_variant: q5Variant } });
    if (scoring.decision.type === "assigned") {
      appendEvent({ type: "track_assigned", data: { track: scoring.decision.track } });
    }
    // Mirror to Supabase (fire-and-forget; ensureResponseRow retries at registration).
    void insertSurveyResponse(response).then((id) => {
      void logEventRemote("survey_completed", { q5_variant: q5Variant, ok: id !== null });
    });
    router.push("/teaser");
  };

  // --- rendering ---

  const sectionName = SECTION_NAMES[step.section];
  const progress = Math.round(((stepIndex + 1) / steps.length) * 100);
  const complete = isStepComplete(step);
  const isLast = stepIndex === steps.length - 1;

  let title = "";
  let subtitle: string | undefined;
  let body: React.ReactNode = null;
  let needsNextButton = true;

  if (step.kind === "hours-grid") {
    title = Q5_TITLE;
    body = (
      <HourGrid
        value={taskHours}
        onChange={(cluster, bucket) => set("task_hours", { ...taskHours, [cluster]: bucket })}
      />
    );
  } else if (step.kind === "hours-seq") {
    const cluster = TASK_CLUSTERS.find((c) => c.id === step.cluster)!;
    title = Q5_TITLE;
    subtitle = cluster.label;
    needsNextButton = false;
    body = (
      <HourButtons
        value={taskHours[step.cluster] ?? null}
        onSelect={(bucket) => {
          set("task_hours", { ...taskHours, [step.cluster]: bucket });
          autoAdvance();
        }}
      />
    );
  } else {
    const q = QUESTIONS[step.questionId];
    title = q.title;
    subtitle = q.subtitle;
    // Map question ids → core field names (common core contract).
    const field = FIELD_BY_QUESTION[q.id] ?? q.id;
    if (q.type === "single") {
      const selectedOpt = q.options?.find((o) => o.id === answers[field]);
      needsNextButton = Boolean(selectedOpt?.otherInput) || Boolean(q.optional);
      body = (
        <SingleSelect
          options={q.options ?? []}
          value={(answers[field] as string) ?? null}
          otherText={(answers[`${field}_other`] as string) ?? ""}
          onSelect={(id, otherText) => {
            const opt = q.options?.find((o) => o.id === id);
            set(field, id);
            set(`${field}_other`, opt?.otherInput ? otherText : undefined);
            if (!opt?.otherInput) autoAdvance();
          }}
        />
      );
    } else if (q.type === "multi") {
      body = (
        <MultiSelect
          options={q.options ?? []}
          value={(answers[field] as string[]) ?? []}
          onChange={(ids) => set(field, ids)}
        />
      );
    } else {
      body = (
        <TextAnswer
          value={(answers[field] as string) ?? ""}
          placeholder={q.placeholder}
          multiline={q.multiline}
          onChange={(text) => set(field, text)}
        />
      );
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 pb-10 pt-4">
      {/* Header: back + progress */}
      <div className="mb-6 flex items-center gap-3">
        <button
          type="button"
          onClick={goBack}
          aria-label="이전"
          className="-ml-2 rounded-full p-2 text-gray-500 active:bg-gray-100"
        >
          ←
        </button>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-blue-600 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-xs tabular-nums text-gray-400">
          {stepIndex + 1}/{steps.length}
        </span>
      </div>

      {orgCode && stepIndex === 0 && (
        <p className="mb-4 rounded-lg bg-gray-50 px-3 py-2 text-xs leading-relaxed text-gray-500">
          {B2B_PRIVACY_STATEMENT}
        </p>
      )}

      <p className="mb-1 text-xs font-medium text-blue-600">{sectionName}</p>
      <h1 className="mb-1 text-lg font-bold leading-snug text-gray-900">{title}</h1>
      {subtitle && <p className="mb-4 text-sm text-gray-500">{subtitle}</p>}
      <div className="mt-3">{body}</div>

      <div className="mt-auto pt-6">
        {needsNextButton && (
          <button
            type="button"
            disabled={!complete}
            onClick={goNext}
            className="w-full rounded-xl bg-blue-600 py-3.5 text-[15px] font-semibold text-white transition-opacity disabled:opacity-30"
          >
            {isLast ? "결과 보기" : "다음"}
          </button>
        )}
        {step.kind === "question" && QUESTIONS[step.questionId].optional && (
          <button
            type="button"
            onClick={goNext}
            className="mt-2 w-full py-2 text-sm text-gray-400"
          >
            건너뛰기
          </button>
        )}
      </div>
    </div>
  );
}

/** Question id → common-core / path-variant field name on the response. */
const FIELD_BY_QUESTION: Record<string, string> = {
  q1: "industry",
  q2: "company_size",
  q3: "department",
  q4: "rank",
  q5a: "mgmt_scope",
  q6: "top_time_sink",
  q7: "most_repetitive",
  q8: "mirror_text",
  q9: "friction_text",
  q10: "ai_maturity",
  q11: "tools_used",
  q12: "ai_policy",
  q13: "pc_env",
  q14: "work_stack",
  q15: "primary_goal",
  q16: "ten_hours_text",
  q17: "learning_time",
  q18: "success_definition",
  qb1: "org_dept",
  qb2: "org_team",
  attribution: "attribution",
};
