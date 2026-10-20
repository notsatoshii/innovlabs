"use client";

// Shared runtime for one mission: the API calls every interaction makes, the
// XP bookkeeping the pill and the reward screen read, the lab drafts the own-
// work beats write, and browser-only state (pasted assistant outputs, branch
// choices) that never leaves the page.

import { createContext, useCallback, useContext, useRef, useState } from "react";
import type { DraftHandle } from "@/components/lab/useDraft";
import type { EditorCategory } from "@/components/lab/work-map/types";
import type { DrillDraft, WorkMapDraft } from "@/lib/courses/types";
import type { AnswerRequest, AnswerResponse, StepRequest, StepResponse, XpPart } from "@/lib/course/types";

/** Browser-only state shared between screens of one mission. Never posted. */
export interface LocalState {
  /** Pasted assistant outputs by I11 round (B1). */
  rounds: Partial<Record<1 | 2, string>>;
  /** Value picked on an I7 without a right answer, by interaction id. */
  choices: Record<string, string>;
  /** A checklist was ticked out of order (I10 ordered). */
  slip: boolean;
  /** Drill steps done before the drill sheet was submitted; sent after it. */
  deferred: { id: string; part: XpPart }[];
}

export interface PlayerApi {
  missionId: string;
  caps: Record<XpPart, number>;
  reduced: boolean;
  /** Pack documents by id, from the mission's doc blocks and I11 packText. */
  packs: Record<string, string>;
  local: LocalState;
  setLocal: (patch: (prev: LocalState) => LocalState) => void;
  /** Records a server award: bumps the pill and the part's running total. */
  onAward: (part: XpPart | undefined, amount: number, missionXp: number) => void;
  workMap: DraftHandle<WorkMapDraft>;
  drill: DraftHandle<DrillDraft>;
  categories: EditorCategory[];
  /** Category id the M1.1 seed rows go under (the Q7/Q8 category, else the first). */
  seedCategory: string;
  /** Candidate #1's task name from the work map, for the drill sheet. */
  drillTask: string;
  /** Saves progress on the current screen (I8 leaves the page). */
  saveProgress: () => Promise<void>;
}

export const PlayerContext = createContext<PlayerApi | null>(null);

export function usePlayer(): PlayerApi {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer outside MissionPlayer");
  return ctx;
}

async function postJson<T>(url: string, body: unknown): Promise<T | null> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    const json = (await res.json().catch(() => null)) as unknown;
    if (!json || typeof json !== "object") return null;
    // Accept both a bare payload and the app's { ok, data } envelope.
    const env = json as { ok?: boolean; data?: unknown };
    if (env.ok === true && env.data && typeof env.data === "object") return env.data as T;
    if (env.ok === false) return null;
    return json as T;
  } catch {
    return null;
  }
}

export function postAnswer(body: AnswerRequest) {
  return postJson<AnswerResponse>("/api/course/answer", body);
}
export function postStep(body: StepRequest) {
  return postJson<StepResponse>("/api/course/step", body);
}

type Pending =
  | { kind: "answer"; body: AnswerRequest; part?: XpPart }
  | { kind: "step"; body: StepRequest; part?: XpPart };

/**
 * One interaction's server calls. A failed call never blocks learning: the
 * caller marks the step done anyway, `failed` shows the retry line, and a
 * retry resends every call that failed (the server is idempotent per item).
 */
export function useAward() {
  const { missionId, onAward } = usePlayer();
  const [failed, setFailed] = useState(false);
  const pending = useRef<Pending[]>([]);

  const run = useCallback(
    async (p: Pending): Promise<AnswerResponse | StepResponse | null> => {
      const res = p.kind === "answer" ? await postAnswer(p.body) : await postStep(p.body);
      if (!res) {
        pending.current.push(p);
        setFailed(true);
        return null;
      }
      onAward(p.part, res.amount, res.missionXp);
      return res;
    },
    [onAward],
  );

  const answer = useCallback(
    (interactionId: string, value: AnswerRequest["answer"], part?: XpPart, itemKey?: string) =>
      run({
        kind: "answer",
        body: { missionId, interactionId, answer: value, ...(itemKey ? { itemKey } : {}) },
        part,
      }) as Promise<AnswerResponse | null>,
    [missionId, run],
  );

  const step = useCallback(
    (interactionId: string, part?: XpPart) =>
      run({ kind: "step", body: { missionId, interactionId }, part }) as Promise<StepResponse | null>,
    [missionId, run],
  );

  const retry = useCallback(async () => {
    const queue = pending.current;
    pending.current = [];
    setFailed(false);
    for (const p of queue) await run(p);
  }, [run]);

  return { answer, step, failed, retry };
}

/** The line under an interaction whose award did not reach the server. */
export function NetLine({ failed, onRetry }: { failed: boolean; onRetry: () => void }) {
  if (!failed) return null;
  return (
    <div className="c-net" role="status">
      <span>연결이 불안정해서 XP를 아직 못 보냈어요. 계속 진행해도 돼요.</span>
      <button type="button" onClick={onRetry}>
        다시 보내기
      </button>
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
