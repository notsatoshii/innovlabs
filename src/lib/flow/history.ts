"use client";

// One browser history entry per step of a one-page flow (review A10), so the
// phone's back key goes one step back instead of leaving the survey, the
// 학원 survey or the registration.
//
// How it works:
//   - Every step the user moves forward to is pushed as a history entry for
//     the SAME url (no ?step=, so links, reloads and the server-read query
//     string stay exactly as they were). The step lives in history.state.
//   - Next.js patches pushState/replaceState and copies its own router state
//     into ours, so its popstate handler treats these entries as its own and
//     keeps the page mounted; this hook's popstate listener then sets the step.
//   - The in-page ← button goes through history.back() when the entry below
//     is the previous step, so the on-screen back and the phone's back key
//     never disagree. Otherwise (a restored draft starts mid-flow with no
//     entries below it) it steps back in place and rewrites the current entry.
//
// Nothing here stores answers. Drafts and the write-once response keep their
// own storage; history only carries "which screen".

import { useEffect, useRef } from "react";

const KEY = "__innovlabsFlow";

interface FlowEntry<T> {
  flow: string;
  step: T;
  /** The step of the entry directly below this one, when we pushed it. */
  from?: T;
}

function read<T>(state: unknown, flow: string): FlowEntry<T> | null {
  if (!state || typeof state !== "object") return null;
  const entry = (state as Record<string, unknown>)[KEY] as FlowEntry<T> | undefined;
  return entry && entry.flow === flow ? entry : null;
}

function write<T>(mode: "push" | "replace", entry: FlowEntry<T>): void {
  try {
    // Keep whatever else is on the current entry (Next.js copies its own
    // keys in on top). No url argument: the address stays the same.
    const data = { [KEY]: entry };
    if (mode === "push") window.history.pushState(data, "");
    else window.history.replaceState({ ...(window.history.state ?? {}), ...data }, "");
  } catch {
    // History blocked (very old webviews): the in-page buttons still work.
  }
}

/**
 * Wire a step state to browser history.
 *
 * @param flow     a name unique to this flow ("survey", "hagwon", "register")
 * @param step     the current step
 * @param ready    false until the flow has restored its draft; nothing is
 *                 written to history before that
 * @param onPop    called with the step of the entry the browser moved to
 */
export function useFlowHistory<T extends string | number>(
  flow: string,
  step: T,
  ready: boolean,
  onPop: (step: T) => void,
) {
  const onPopRef = useRef(onPop);
  useEffect(() => {
    onPopRef.current = onPop;
  }, [onPop]);

  // Label the entry the flow opened on with its first (or restored) step.
  const labelled = useRef(false);
  useEffect(() => {
    if (!ready || labelled.current) return;
    labelled.current = true;
    const current = read<T>(window.history.state, flow);
    // Coming back to an entry this flow already labelled (forward/back across
    // pages): keep its `from` so the in-page ← still uses history.back().
    write("replace", { flow, step, from: current?.from });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  useEffect(() => {
    const handler = (event: PopStateEvent) => {
      const entry = read<T>(event.state, flow);
      if (entry) onPopRef.current(entry.step);
    };
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, [flow]);

  return {
    /** Moving forward (or jumping) to `next`: adds a history entry. */
    push(next: T) {
      write("push", { flow, step: next, from: step });
    },
    /** Change the step without a new entry (the current one is rewritten). */
    replace(next: T) {
      write("replace", { flow, step: next });
    },
    /**
     * In-page back to `prev`. Returns true when the browser will deliver it
     * through popstate (the caller must not set the step itself).
     */
    back(prev: T): boolean {
      const current = read<T>(window.history.state, flow);
      if (current && current.step === step && current.from === prev) {
        window.history.back();
        return true;
      }
      write("replace", { flow, step: prev });
      return false;
    },
  };
}
