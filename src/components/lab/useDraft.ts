"use client";

// Server-side autosave for a lab draft (phase-2 P5): a phone dying mid-lab
// loses nothing. The server page loads the stored draft once and passes it in
// as `initial`; every change after that is saved with PUT /api/drafts/[kind]
// 1.5 seconds after the learner stops typing.
//
// The store lives outside React state so that saving never depends on render
// timing: one request in flight at a time, a change made during a save is
// sent right after it, a failed save retries with a growing delay (and at
// once when the connection comes back), and whatever is unsaved is flushed
// when the page is hidden or the editor unmounts.

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import type { DraftKind } from "@/lib/courses/types";

export type SaveState =
  | "idle" // nothing changed since the page loaded
  | "saving" // a change is waiting for, or in, a request
  | "saved"
  | "error"; // the last attempt failed; retrying

export type SaveProblem = "network" | "signed_out" | "too_large";

interface Snapshot<T> {
  draft: T;
  state: SaveState;
  problem: SaveProblem | null;
}

const DEBOUNCE_MS = 1500;
const RETRY_MS = [2000, 5000, 10000, 30000];
/**
 * Browsers cap fetch keepalive bodies at 64 KB. Korean text is three bytes a
 * character in UTF-8, so 20,000 characters always fits; a larger draft is
 * sent without keepalive (it may not finish if the tab is closing).
 */
const KEEPALIVE_MAX_CHARS = 20000;

class DraftStore<T> {
  private snapshot: Snapshot<T>;
  private listeners = new Set<() => void>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private dirty = false;
  private inFlight = false;
  private failures = 0;
  /** The save in flight, or the last one; settle() waits on it. */
  private flight: Promise<void> = Promise.resolve();

  constructor(
    private readonly kind: DraftKind,
    initial: T,
  ) {
    this.snapshot = { draft: initial, state: "idle", problem: null };
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = () => this.snapshot;

  private emit(patch: Partial<Snapshot<T>>) {
    this.snapshot = { ...this.snapshot, ...patch };
    for (const listener of this.listeners) listener();
  }

  private schedule(ms: number) {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.save();
    }, ms);
  }

  update(next: T | ((prev: T) => T)) {
    const draft =
      typeof next === "function" ? (next as (prev: T) => T)(this.snapshot.draft) : next;
    if (Object.is(draft, this.snapshot.draft)) return;
    this.dirty = true;
    this.failures = 0;
    this.emit({ draft, state: "saving", problem: null });
    this.schedule(DEBOUNCE_MS);
  }

  /** Saves now if there is anything unsaved. `leaving` asks the browser to finish the request after the page goes away. */
  save(leaving = false): Promise<void> {
    if (!this.dirty || this.inFlight) return Promise.resolve(); // an in-flight save re-runs itself when it finds `dirty` set
    this.flight = this.send(leaving);
    return this.flight;
  }

  /**
   * Resolves once the server has the current draft, or a save failed. For a
   * link to a page that reads this draft on the server: the debounce or the
   * unmount flush would otherwise race that page's read.
   */
  async settle(): Promise<void> {
    for (let i = 0; i < 4 && (this.dirty || this.inFlight); i++) {
      await (this.inFlight ? this.flight : this.save());
      if (this.snapshot.state === "error") return;
    }
  }

  private async send(leaving: boolean): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.inFlight = true;
    this.dirty = false;
    if (this.snapshot.state !== "saving") this.emit({ state: "saving" });

    const body = JSON.stringify({ data: this.snapshot.draft });
    let problem: SaveProblem | null = null;
    try {
      const res = await fetch(`/api/drafts/${this.kind}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: leaving && body.length <= KEEPALIVE_MAX_CHARS,
      });
      if (res.status === 401) problem = "signed_out";
      else if (res.status === 413) problem = "too_large";
      else if (!res.ok) problem = "network";
    } catch {
      problem = "network";
    }
    this.inFlight = false;

    if (problem === null) {
      this.failures = 0;
      if (this.dirty) this.schedule(0);
      else this.emit({ state: "saved", problem: null });
      return;
    }

    this.dirty = true;
    this.failures += 1;
    this.emit({ state: "error", problem });
    // Signing in again or shrinking the draft is the learner's move; retrying alone cannot fix those.
    if (problem === "network") {
      this.schedule(RETRY_MS[Math.min(this.failures, RETRY_MS.length) - 1]);
    }
  }

  /** Browser hooks for the lifetime of the editor. Returns the cleanup. */
  attach(): () => void {
    const flush = () => {
      void this.save(true);
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    const onOnline = () => {
      void this.save();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flush);
    window.addEventListener("online", onOnline);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("online", onOnline);
      flush(); // leaving the lab page inside the app
    };
  }
}

export interface DraftHandle<T> {
  draft: T;
  /** Accepts a value or an updater, like a state setter. Schedules the save. */
  setDraft: (next: T | ((prev: T) => T)) => void;
  saveState: SaveState;
  saveProblem: SaveProblem | null;
  /** Try the save again right now (the 다시 시도 button). */
  retry: () => void;
  /** Resolves once the server has the current draft (or a save failed); see DraftStore.settle. */
  settle: () => Promise<void>;
}

export function useDraft<T>(kind: DraftKind, initial: T): DraftHandle<T> {
  // One store per mounted editor; `initial` is read once, like useState.
  const [store] = useState(() => new DraftStore<T>(kind, initial));
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);

  useEffect(() => store.attach(), [store]);

  const setDraft = useCallback((next: T | ((prev: T) => T)) => store.update(next), [store]);
  const retry = useCallback(() => {
    void store.save();
  }, [store]);
  const settle = useCallback(() => store.settle(), [store]);

  return {
    draft: snapshot.draft,
    setDraft,
    saveState: snapshot.state,
    saveProblem: snapshot.problem,
    retry,
    settle,
  };
}
