"use client";

// The Week 3 Part 1 workspace check (SP-W3-CP). One short form: which path
// (browser workspace or agent project folder), which assistant, the
// workspace's name, three yes/no checks and whether uploads are blocked at
// work. The curriculum's fix appears right under the answer that needs it; a
// failed test may still be submitted (the record says what happened) and
// resubmitted after the fix. The errors under the button are checkWorkspace,
// the same function the route runs on what it receives.

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { WORKSPACE_LIMITS, type ApiResult, type WorkspaceInput } from "@/lib/courses/types";
import type { AssistantId } from "@/lib/profile/events";
import { ChoiceGroup, ProblemList, type Choice } from "../inputs";
import {
  ASSISTANTS_BY_PATH,
  ASSISTANT_LABELS,
  WORKSPACE_FORGOT_FIX,
  WORKSPACE_UPLOAD_FIX,
  checkWorkspace,
} from "../rules-week3";

const INPUT = "nb-input w-full px-3 py-2.5 text-base leading-relaxed placeholder:text-gray-400";

type Path = "browser" | "agent";

const PATH_CHOICES: Choice<Path>[] = [
  { value: "browser", label: "브라우저에서 어시스턴트 쓰기" },
  { value: "agent", label: "에이전트로 프로젝트 폴더 쓰기" },
];

const YES_NO: Choice<"yes" | "no">[] = [
  { value: "yes", label: "네" },
  { value: "no", label: "아니요" },
];

/** Path-specific wording of the same four questions (session plan Part 1 and its agent-path box). */
const COPY: Record<
  Path,
  {
    how: string;
    nameLabel: string;
    namePlaceholder: string;
    instructions: string;
    references: string;
    test: string;
  }
> = {
  browser: {
    how: "어시스턴트에서 워크스페이스를 새로 만들고 후보 1의 이름을 붙이세요. 기능 이름과 위치는 어시스턴트마다 달라서 수업에서 안내해 드려요.",
    nameLabel: "워크스페이스 이름",
    namePlaceholder: "예: 월요일 주간보고",
    instructions: "첫 번째 하네스를 ‘항상 따르는 지시’ 칸에 붙여 넣었나요? 파일로만 올렸다면 ‘아니요’예요.",
    references: "참고 문서를 넣었나요? 업로드가 막혀서 지시 칸에 글로 붙여 넣었어도 ‘네’예요.",
    test: "이번 주 원자료를 넣고 “이번 주 것 초안 써 줘” 한 줄만 보냈을 때, 따로 말하지 않아도 하네스대로 나왔나요?",
  },
  agent: {
    how: "설치 도우미로 프로젝트 폴더를 만들고 후보 1의 이름을 붙이세요. 이 폴더가 내 워크스페이스예요.",
    nameLabel: "프로젝트 폴더 이름",
    namePlaceholder: "예: weekly-report",
    instructions: "하네스 두 개를 폴더에 지시 파일로 넣었나요?",
    references: "참고 문서를 폴더에 넣었나요?",
    test: "터미널에서 이번 주 원자료와 “이번 주 것 초안 써 줘” 한 줄만 줬을 때, 따로 말하지 않아도 하네스대로 나왔나요?",
  },
};

/** The agent path's version of WORKSPACE_FORGOT_FIX: there is no 지시 칸, only the file the agent always reads. */
const AGENT_FORGOT_FIX =
  "에이전트가 늘 읽는 지시 파일(Claude Code는 CLAUDE.md, Codex는 AGENTS.md)에 하네스를 넣었는지 확인하고 한 줄 시험을 다시 해 보세요.";

type SubmitState =
  | { kind: "idle" }
  | { kind: "sending" }
  /** `input` is the exact answers that were accepted; changing any answer clears the panel. */
  | { kind: "done"; input: WorkspaceInput; ready: boolean }
  | { kind: "failed"; message: string; problems: string[] };

function failureMessage(status: number): string {
  if (status === 401) return "로그인이 풀렸어요. 다시 로그인한 뒤 제출해 주세요. 고른 답은 그대로 있어요.";
  if (status === 422) return "아래 항목을 고친 뒤 다시 제출해 주세요.";
  if (status === 503) return "지금은 제출을 받을 수 없어요. 강사에게 알려 주세요.";
  return "제출하지 못했어요. 잠시 뒤 다시 눌러 주세요.";
}

function toChoice(value: boolean | null): "yes" | "no" | null {
  return value === null ? null : value ? "yes" : "no";
}

function Fix({ children }: { children: React.ReactNode }) {
  return (
    <p className="nb-flat bg-[var(--nb-yellow)] px-3 py-2 text-sm font-bold leading-relaxed">{children}</p>
  );
}

function YesNo({
  name,
  legend,
  value,
  onChange,
  children,
}: {
  name: string;
  legend: string;
  value: boolean | null;
  onChange: (value: boolean) => void;
  /** Shown under the answer (the curriculum's fix). */
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <ChoiceGroup
        name={name}
        legend={legend}
        options={YES_NO}
        value={toChoice(value)}
        onChange={(v) => onChange(v === "yes")}
        columns
      />
      {children}
    </div>
  );
}

export default function WorkspaceForm({
  initial,
  submittedOn,
}: {
  /** The newest check's answers, or an empty form with the default path. */
  initial: WorkspaceInput;
  /** "2026년 10월 14일" when a check was submitted before, else null. */
  submittedOn: string | null;
}) {
  const router = useRouter();
  const [input, setInput] = useState<WorkspaceInput>(initial);
  const [submit, setSubmit] = useState<SubmitState>({ kind: "idle" });

  const set = (patch: Partial<WorkspaceInput>) => setInput((prev) => ({ ...prev, ...patch }));
  const { errors } = checkWorkspace(input);
  const path: Path = input.path ?? "browser";
  const copy = COPY[path];
  const forgotFix = path === "agent" ? AGENT_FORGOT_FIX : WORKSPACE_FORGOT_FIX;
  const accepted = submit.kind === "done" && submit.input === input ? submit : null;

  const assistantChoices: Choice<AssistantId>[] = (input.path ? ASSISTANTS_BY_PATH[input.path] : []).map((id) => ({
    value: id,
    label: ASSISTANT_LABELS[id],
  }));

  const choosePath = (next: Path) => {
    // An assistant from the other path's list would be a contradiction: clear it.
    setInput((prev) => ({
      ...prev,
      path: next,
      assistant: prev.assistant && ASSISTANTS_BY_PATH[next].includes(prev.assistant) ? prev.assistant : null,
    }));
  };

  const send = async () => {
    const sent = input;
    setSubmit({ kind: "sending" });
    let res: Response;
    try {
      res = await fetch("/api/artifacts/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sent),
      });
    } catch {
      setSubmit({ kind: "failed", message: "연결이 끊겼어요. 연결을 확인하고 다시 눌러 주세요.", problems: [] });
      return;
    }
    const result = (await res.json().catch(() => null)) as ApiResult<{ ready: boolean }> | null;
    if (res.ok && result?.ok) {
      setSubmit({ kind: "done", input: sent, ready: result.data.ready });
      router.refresh(); // the page's "submitted on" line
      return;
    }
    setSubmit({
      kind: "failed",
      message: failureMessage(res.status),
      problems: result && !result.ok ? (result.problems ?? []) : [],
    });
  };

  return (
    <section className="nb-card flex flex-col gap-5 px-4 py-4">
      <ChoiceGroup
        name="workspace-path"
        legend="어떤 방식으로 하나요?"
        options={PATH_CHOICES}
        value={input.path}
        onChange={choosePath}
      />

      {input.path && (
        <>
          <p className="nb-flat bg-[var(--background)] px-3 py-2.5 text-sm leading-relaxed">{copy.how}</p>

          <div className="flex flex-col gap-2">
            <ChoiceGroup
              name="workspace-assistant"
              legend="어떤 AI를 쓰나요?"
              options={assistantChoices}
              value={input.assistant}
              onChange={(assistant) => set({ assistant })}
            />
            {input.assistant === "other" && (
              <input
                type="text"
                aria-label="쓰는 AI 이름"
                value={input.assistant_other}
                maxLength={WORKSPACE_LIMITS.assistantOther}
                placeholder="AI 이름"
                onChange={(e) => set({ assistant_other: e.target.value })}
                className={INPUT}
              />
            )}
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="workspace-name" className="text-sm font-bold">
              {copy.nameLabel}
            </label>
            <input
              id="workspace-name"
              type="text"
              value={input.workspace_name}
              maxLength={WORKSPACE_LIMITS.workspaceName}
              placeholder={copy.namePlaceholder}
              onChange={(e) => set({ workspace_name: e.target.value })}
              className={INPUT}
            />
            <p className="text-xs leading-relaxed text-gray-600">설계도 종이에도 같은 이름을 적어 두세요.</p>
          </div>

          <YesNo
            name="workspace-instructions"
            legend={copy.instructions}
            value={input.instructions_set}
            onChange={(instructions_set) => set({ instructions_set })}
          >
            {input.instructions_set === false && input.test_followed !== false && <Fix>{forgotFix}</Fix>}
          </YesNo>

          <YesNo
            name="workspace-references"
            legend={copy.references}
            value={input.references_uploaded}
            onChange={(references_uploaded) => set({ references_uploaded })}
          />

          <YesNo
            name="workspace-test"
            legend={copy.test}
            value={input.test_followed}
            onChange={(test_followed) => set({ test_followed })}
          >
            {input.test_followed === false && (
              <>
                <Fix>{forgotFix}</Fix>
                <p className="text-xs leading-relaxed text-gray-600">
                  이대로 제출해도 돼요. 고친 뒤 한 줄 시험을 다시 해 보고 한 번 더 제출하면 새 기록으로 남아요.
                </p>
              </>
            )}
          </YesNo>

          <YesNo
            name="workspace-uploads"
            legend="회사에서 파일 올리기가 막혀 있나요?"
            value={input.uploads_blocked}
            onChange={(uploads_blocked) => set({ uploads_blocked })}
          >
            {input.uploads_blocked === true && path === "browser" && <Fix>{WORKSPACE_UPLOAD_FIX}</Fix>}
          </YesNo>
        </>
      )}

      {accepted ? (
        <div aria-live="polite" className="flex flex-col gap-3">
          <p className="nb-flat bg-[var(--nb-lime)] px-3 py-2.5 text-[15px] font-extrabold">
            {accepted.ready ? "워크스페이스 점검을 남겼어요." : "점검 결과를 남겼어요."}
          </p>
          <p className="text-sm leading-relaxed">
            {accepted.ready
              ? "다음은 후보 1의 파이프라인 설계도예요."
              : "위의 방법으로 고친 뒤 한 줄 시험을 다시 해 보고, 한 번 더 제출해 주세요. 설계도는 먼저 그려도 돼요."}
          </p>
          <Link href="/app/lab/blueprint" className="nb-btn nb-btn-primary block px-4 py-3 text-center text-[15px]">
            설계도 그리러 가기
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={send}
            disabled={errors.length > 0 || submit.kind === "sending"}
            className="nb-btn nb-btn-primary w-full px-4 py-3.5 text-[15px]"
          >
            {submit.kind === "sending" ? "제출하는 중…" : submittedOn ? "점검 다시 제출하기" : "점검 제출하기"}
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
          {input.path && <ProblemList errors={errors} />}
          <p className="text-xs leading-relaxed text-gray-600">
            점검 결과는 본인과 강사·운영진만 볼 수 있어요.
            {submittedOn && " 다시 제출하면 새 기록으로 남고, 이전 기록도 그대로 있어요."}
          </p>
        </div>
      )}
    </section>
  );
}
