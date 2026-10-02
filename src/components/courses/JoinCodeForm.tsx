"use client";

// Cohort code box on the 코스 tab (phase-2.md P1, P9). Six characters, A–Z
// and 0–9, formatted as the learner types. POSTs /api/cohort/join; on success
// the server-rendered page is refreshed into the enrolled view.

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ApiResult, JoinCohortRequest } from "@/lib/courses/types";

const CODE_LENGTH = 6;

type State =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success" }
  | { kind: "error"; message: string };

const IDLE_HINT = "첫 수업에서 강사님이 알려 드리는 여섯 자리 코드예요.";

const ERROR_MESSAGE: Record<string, string> = {
  invalid_code: "맞는 코드를 찾지 못했어요. 여섯 자리를 다시 확인해 주세요.",
  too_many_attempts: "여러 번 틀렸어요. 10분 뒤에 다시 시도해 주세요.",
  cohort_closed: "이미 끝난 과정의 코드예요. 강사님께 새 코드를 확인해 주세요.",
  enrollment_inactive: "이 과정은 코드로 다시 등록할 수 없어요. 강사님께 문의해 주세요.",
  not_authenticated: "로그인이 풀렸어요. 다시 로그인한 뒤 입력해 주세요.",
};
const FALLBACK_ERROR = "지금은 등록하지 못했어요. 잠시 후 다시 시도해 주세요.";

/** Uppercase, strip everything that is not A–Z or 0–9, cap at six. */
function formatCode(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, CODE_LENGTH);
}

export default function JoinCodeForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });

  const busy = state.kind === "submitting" || state.kind === "success";
  const complete = code.length === CODE_LENGTH;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complete || busy) return;
    setState({ kind: "submitting" });
    try {
      const payload: JoinCohortRequest = { code };
      const res = await fetch("/api/cohort/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await res.json().catch(() => null)) as ApiResult | null;
      if (result?.ok) {
        setState({ kind: "success" });
        // The page is server-rendered: pull the enrolled view.
        router.refresh();
        return;
      }
      setState({
        kind: "error",
        message: (result && !result.ok && ERROR_MESSAGE[result.error]) || FALLBACK_ERROR,
      });
    } catch {
      setState({ kind: "error", message: FALLBACK_ERROR });
    }
  };

  return (
    <form onSubmit={submit} noValidate>
      <label htmlFor="cohort-code" className="mb-1.5 block text-sm font-bold text-gray-800">
        수강 코드
      </label>
      <div className="flex items-stretch gap-2">
        <input
          id="cohort-code"
          name="code"
          type="text"
          inputMode="text"
          lang="en"
          autoComplete="off"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="done"
          placeholder="ABC123"
          value={code}
          disabled={busy}
          onChange={(e) => {
            setCode(formatCode(e.target.value));
            if (state.kind === "error") setState({ kind: "idle" });
          }}
          aria-describedby="cohort-code-status"
          aria-invalid={state.kind === "error"}
          className="nb-input min-w-0 flex-1 px-4 py-3 text-center font-mono text-xl font-extrabold tracking-[0.3em] placeholder:font-semibold placeholder:text-gray-300"
        />
        <button
          type="submit"
          disabled={!complete || busy}
          className="nb-btn nb-btn-primary shrink-0 px-4 text-sm"
        >
          {state.kind === "submitting" ? "확인 중…" : "등록하기"}
        </button>
      </div>
      <p
        id="cohort-code-status"
        role="status"
        aria-live="polite"
        className={`mt-2 text-sm leading-relaxed ${
          state.kind === "error"
            ? "font-semibold text-red-600"
            : state.kind === "success"
              ? "font-semibold text-gray-800"
              : "text-gray-600"
        }`}
      >
        {state.kind === "error"
          ? state.message
          : state.kind === "success"
            ? "등록됐어요. 내 과정을 불러오고 있어요."
            : IDLE_HINT}
      </p>
    </form>
  );
}
