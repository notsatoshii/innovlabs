"use client";

// Shared runtime for one mission: the API calls every interaction makes, the
// XP bookkeeping the pill and the reward screen read, the lab drafts the own-
// work beats write, and browser-only state (pasted assistant outputs, branch
// choices) that never leaves the browser.
//
// Every award call goes through the player's one queue (`send`): calls run
// one at a time in order, so two quick answers cannot race each other on the
// server (review P2-3). A call that failed in a way a resend can fix (no
// connection, a 5xx, signed out) waits in the mission's outbox, which lives in
// sessionStorage, so it survives moving to the next screen and a reload. The
// outbox is sent again on 다시 보내기, when the connection comes back, on each
// new screen, and before the mission's end (review P0-1).

import { createContext, useCallback, useContext, useState } from "react";
import type { DraftHandle } from "@/components/lab/useDraft";
import type { EditorCategory } from "@/components/lab/work-map/types";
import type { DrillDraft, WorkMapDraft } from "@/lib/courses/types";
import type { LiveValues } from "@/lib/course/fill";
import type { AnswerRequest, AnswerResponse, MissionContent, StepRequest, StepResponse, XpPart } from "@/lib/course/types";

/** Browser-only state shared between screens of one mission. Never posted. */
export interface LocalState {
  /** Pasted assistant outputs by I11 round (B1). */
  rounds: Partial<Record<1 | 2, string>>;
  /** Value picked on an I7 without a right answer, by interaction id. */
  choices: Record<string, string>;
  /** A checklist was ticked out of order (I10 ordered). */
  slip: boolean;
}

export const EMPTY_LOCAL: LocalState = { rounds: {}, choices: {}, slip: false };

/** B1's material choice (s1.material): own material, the practice pack, or candidate #2. */
export type MaterialChoice = "own" | "pack" | "candidate2";

export function materialChoice(local: LocalState): MaterialChoice | null {
  const values = Object.values(local.choices);
  for (const v of ["candidate2", "own", "pack"] as const) if (values.includes(v)) return v;
  return null;
}

/** The learner works on their own task (own material or candidate #2): copy buttons give way. */
export function ownMaterial(local: LocalState): boolean {
  const c = materialChoice(local);
  return c === "own" || c === "candidate2";
}

// --- Calls ------------------------------------------------------------------------

/**
 * Why a call failed. network and signed_out can be fixed by sending again
 * (after signing in again); the others cannot, and say what is wrong.
 */
export interface CallError {
  kind: "network" | "signed_out" | "locked" | "invalid" | "refused";
  /** The route's error code ("not_verified", "steps_missing", …), when it answered. */
  code?: string;
  problems: string[];
}

export type CallResult<T> = { ok: true; data: T } | { ok: false; error: CallError };

export function errorOf(status: number, code: string | undefined, problems: string[]): CallError {
  if (status === 401) return { kind: "signed_out", code, problems };
  if (status === 409 && code === "mission_locked") return { kind: "locked", code, problems };
  // The first try of a card has not landed yet: the retry goes through once it has.
  if (status === 409 && code === "retry_not_allowed") return { kind: "network", code, problems };
  if (status === 422 || (status === 409 && code === "steps_missing")) return { kind: "invalid", code, problems };
  if (status >= 500 || status === 0) return { kind: "network", code, problems };
  return { kind: "refused", code, problems };
}

export async function postJson<T>(url: string, body: unknown, keepalive = false): Promise<CallResult<T>> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      ...(keepalive ? { keepalive: true } : {}),
    });
  } catch {
    return { ok: false, error: { kind: "network", problems: [] } };
  }
  const json = (await res.json().catch(() => null)) as
    | { ok?: boolean; data?: unknown; error?: string; problems?: unknown }
    | null;
  if (res.ok && json?.ok === true && json.data && typeof json.data === "object") return { ok: true, data: json.data as T };
  const problems = Array.isArray(json?.problems) ? json.problems.filter((p): p is string => typeof p === "string") : [];
  // A 2xx without the envelope is a proxy page or similar: treat it as no answer.
  return { ok: false, error: errorOf(res.ok ? 502 : res.status, typeof json?.error === "string" ? json.error : undefined, problems) };
}

export type Pending =
  | { kind: "answer"; body: AnswerRequest; part?: XpPart }
  | { kind: "step"; body: StepRequest; part?: XpPart };

export function pendingKey(p: Pending): string {
  return p.kind === "answer"
    ? `a:${p.body.interactionId}:${p.body.itemKey ?? ""}`
    : `s:${p.body.interactionId}`;
}

export function retryable(e: CallError): boolean {
  return e.kind === "network" || e.kind === "signed_out";
}

// --- Messages ---------------------------------------------------------------------

/** What the server could not verify for an own-work step (step route `problems`). */
const PROBLEM_TEXT: Record<string, string> = {
  seed_rows_too_few: "조각이 워크맵에 아직 저장되지 않았어요. 조각을 2개 이상 적고 다시 저장해 주세요.",
  work_map_rows_too_few: "시간까지 적힌 줄이 워크맵에 12줄보다 적게 저장돼 있어요. 줄과 시간을 확인하고 다시 저장해 주세요.",
  work_map_extra_row_too_few: "더한 줄이 워크맵에 아직 저장되지 않았어요. 한 번 더 더해 주세요.",
  work_map_classify_empty: "워크맵에 저장된 줄이 없어요. 미션 1.3에서 줄을 먼저 적어 주세요.",
  work_map_classify_unmarked: "처리나 판단을 고르지 않은 줄이 남아 있어요. 섞임인 줄은 둘로 쪼개 주세요.",
  work_map_not_submitted: "워크맵 제출이 아직 서버에 닿지 않았어요. 워크맵을 다시 제출해 주세요.",
  drill_not_submitted: "비교표가 아직 서버에 닿지 않았어요. 한 번 더 저장해 주세요.",
  time_log_missing: "시간 기록이 아직 없어요. 시간 기록을 남긴 뒤 다시 해 주세요.",
};

/** One Korean line for a failed call, by cause (review P1-6). */
export function errorText(e: CallError): string {
  switch (e.kind) {
    case "network":
      return "연결이 불안정해서 아직 기록하지 못했어요. 계속 진행해도 돼요. 미션을 끝낼 때 한 번 더 보내요.";
    case "signed_out":
      return "로그인이 풀렸어요. 다른 탭에서 다시 로그인한 뒤 '다시 보내기'를 눌러 주세요.";
    case "locked":
      return "이 미션은 아직 잠겨 있어요. 레벨 지도에서 앞 미션을 먼저 끝내 주세요.";
    case "invalid": {
      const known = e.problems.map((p) => PROBLEM_TEXT[p]).filter(Boolean);
      return known[0] ?? "이 단계를 아직 기록하지 못했어요. 화면의 내용을 확인하고 다시 해 주세요.";
    }
    case "refused":
      return "이 단계를 기록하지 못했어요. 화면을 새로 고친 뒤 다시 해 주세요.";
  }
}

// --- Player context ---------------------------------------------------------------

export interface PlayerApi {
  missionId: string;
  /** The mission as shown (slots filled). */
  mission: MissionContent;
  caps: Record<XpPart, number>;
  reduced: boolean;
  /** Pack documents by id, from the mission's doc blocks and I11 packText. */
  packs: Record<string, string>;
  local: LocalState;
  setLocal: (patch: (prev: LocalState) => LocalState) => void;
  /** Sends one award call through the mission's queue; a resend-able failure waits in the outbox. */
  send: <T extends AnswerResponse | StepResponse>(p: Pending) => Promise<CallResult<T>>;
  /** Sends the outbox again. True when it is empty afterwards. */
  flush: () => Promise<boolean>;
  /** Keys (pendingKey) waiting in the outbox. */
  queued: ReadonlySet<string>;
  workMap: DraftHandle<WorkMapDraft>;
  drill: DraftHandle<DrillDraft>;
  categories: EditorCategory[];
  /** Category id the M1.1 seed rows go under (the Q7/Q8 category, else the first). */
  seedCategory: string;
  /** Candidate #1 and #2 task names from the work map, for the drill sheet. */
  drillTask: string;
  drillTask2: string;
  /** The live Work Map slots as the player shows them now. */
  live: LiveValues;
  /** The mission was finished before this visit (a replay). */
  alreadyDone: boolean;
  /**
   * Leaves the mission for another page (I8 opens the time log). On the last
   * screen the mission is finished first; when the server refuses, the
   * player shows what is missing and stays (review P1-5).
   */
  leaveTo: (href: string) => Promise<void>;
  /** 모아 reacts to an answer the learner just gave: nod when right, wince when wrong. */
  react: (ok: boolean) => void;
}

export const PlayerContext = createContext<PlayerApi | null>(null);

export function usePlayer(): PlayerApi {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer outside MissionPlayer");
  return ctx;
}

/**
 * One interaction's server calls. A call that failed for a reason a resend
 * fixes waits in the mission's outbox and never blocks learning; the line
 * under the interaction says why and offers 다시 보내기. Other failures are
 * returned to the caller, which decides (the own-work steps stay open).
 */
export function useAward() {
  const { missionId, send, flush, queued } = usePlayer();
  const [error, setError] = useState<CallError | null>(null);
  // Outbox keys this interaction put there.
  const [mine, setMine] = useState<ReadonlySet<string>>(() => new Set());

  const run = useCallback(
    async <T extends AnswerResponse | StepResponse>(p: Pending): Promise<CallResult<T>> => {
      const res = await send<T>(p);
      const key = pendingKey(p);
      if (res.ok) {
        setMine((m) => (m.has(key) ? new Set([...m].filter((k) => k !== key)) : m));
        setError(null);
      } else {
        if (retryable(res.error)) setMine((m) => (m.has(key) ? m : new Set(m).add(key)));
        setError(res.error);
      }
      return res;
    },
    [send],
  );

  const answer = useCallback(
    async (interactionId: string, value: AnswerRequest["answer"], part?: XpPart, itemKey?: string) => {
      const res = await run<AnswerResponse>({
        kind: "answer",
        body: { missionId, interactionId, answer: value, ...(itemKey ? { itemKey } : {}) },
        part,
      });
      return res.ok ? res.data : null;
    },
    [missionId, run],
  );

  /** The step with its full result (own-work beats read the error). */
  const stepResult = useCallback(
    (interactionId: string, part?: XpPart, opts: { example?: boolean } = {}) =>
      run<StepResponse>({
        kind: "step",
        body: { missionId, interactionId, ...(opts.example ? { example: true } : {}) },
        part,
      }),
    [missionId, run],
  );

  const step = useCallback(
    async (interactionId: string, part?: XpPart, opts: { example?: boolean } = {}) => {
      const res = await stepResult(interactionId, part, opts);
      return res.ok ? res.data : null;
    },
    [stepResult],
  );

  const retry = useCallback(async () => {
    setError(null);
    await flush();
  }, [flush]);

  // Waiting in the outbox: shown until any flush (from any screen) sends it.
  const waiting = [...mine].some((k) => queued.has(k));
  const shown: CallError | null = error && retryable(error) ? (waiting ? error : null) : error;

  return { answer, step, stepResult, error: shown, failed: shown !== null, retry };
}

/** The line under an interaction whose call failed: why, and 다시 보내기 when a resend can help. */
export function NetLine({ error, onRetry }: { error: CallError | null; onRetry: () => void }) {
  if (!error) return null;
  return (
    <div className={`c-net${retryable(error) ? "" : " is-hard"}`} role="status">
      <span>{errorText(error)}</span>
      {retryable(error) && (
        <button type="button" onClick={onRetry}>
          다시 보내기
        </button>
      )}
    </div>
  );
}

/** "+10" when the server paid, nothing while waiting or on a replay. */
export function amountText(amount: number | null | undefined): string {
  return amount && amount > 0 ? ` +${amount}` : "";
}

/** Props every interaction component takes. `onDone` may be called more than once. */
export interface InteractionProps<T> {
  i: T;
  onDone: () => void;
}

/** Korean object particle for a slot value: 을 after a final consonant, else 를. */
export function eul(word: string): string {
  const c = word.trim().slice(-1).charCodeAt(0);
  if (!(c >= 0xac00 && c <= 0xd7a3)) return `${word}를`;
  return (c - 0xac00) % 28 > 0 ? `${word}을` : `${word}를`;
}

// --- sessionStorage (per-tab, browser only; every access may throw) ----------------

export function readSession<T>(key: string): T | null {
  try {
    const raw = window.sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeSession(key: string, value: unknown): void {
  try {
    if (value === null) window.sessionStorage.removeItem(key);
    else window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private mode or storage full: the state lives in the page only.
  }
}
