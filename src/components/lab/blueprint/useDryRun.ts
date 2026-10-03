"use client";

// The dry-run timer's state (phase-2c, plan review 2), shared by the sticky
// bar and the dry-run panel so both always agree. The start lives in the
// server draft (dry_run_started_at) with a browser backup; the stop lives in
// the backup until the entry is posted. Elapsed minutes come from the clock
// every time, so a reload or a discarded tab loses nothing.

import { useSyncExternalStore } from "react";
import type { BlueprintDraft } from "@/lib/courses/types";
import { minutesBetween } from "../rules";
import { dryRunElapsed } from "../rules-week3";
import { backupKey, parseBackup, readBackupRaw, subscribeBackup, writeBackup } from "./dryRunBackup";
import type { SetBlueprint } from "./types";

/** A browser backup older than this is a run nobody stopped; it is not brought back. */
const BACKUP_MAX_AGE_MS = 12 * 60 * 60 * 1000;
const TICK_MS = 15 * 1000;

const noSubscribe = () => () => {};

function readClock(): number {
  return Math.floor(Date.now() / TICK_MS) * TICK_MS;
}

function subscribeTick(listener: () => void): () => void {
  const timer = setInterval(listener, TICK_MS);
  const onVisible = () => {
    if (document.visibilityState === "visible") listener();
  };
  document.addEventListener("visibilitychange", onVisible);
  return () => {
    clearInterval(timer);
    document.removeEventListener("visibilitychange", onVisible);
  };
}

export interface DryRunTimer {
  startedAt: string | null;
  stoppedAt: string | null;
  running: boolean;
  /** Whole minutes since the start while running; null before the client clock is read. */
  elapsed: number | null;
  /** Whole minutes from start to stop once stopped, else null. */
  measured: number | null;
  start: () => void;
  stop: () => void;
  /** Back to no run: clears the draft's start and the backup. */
  reset: () => void;
}

export function useDryRun({
  userId,
  draft,
  setDraft,
  lastDryRunAt,
}: {
  userId: string;
  draft: BlueprintDraft;
  setDraft: SetBlueprint;
  /** created_at of the newest dry-run entry: a backup of a run already posted is ignored. */
  lastDryRunAt: string | null;
}): DryRunTimer {
  const key = backupKey(userId);
  const backupRaw = useSyncExternalStore(subscribeBackup, () => readBackupRaw(key), () => null);
  const backup = parseBackup(backupRaw);

  // The clock, re-read every 15 seconds while a run may be going. null on
  // the server, so the first paint never disagrees with the client.
  const mayRun = (draft.dry_run_started_at !== null || backup !== null) && !backup?.stopped_at;
  const now = useSyncExternalStore(mayRun ? subscribeTick : noSubscribe, readClock, () => null);

  // The server draft is the record; the backup fills in when the draft save
  // had not landed. A backup started before the newest posted dry run, or
  // more than 12 hours ago, belongs to a run that is over.
  const backupUsable =
    backup !== null &&
    now !== null &&
    now - Date.parse(backup.started_at) < BACKUP_MAX_AGE_MS &&
    (lastDryRunAt === null || Date.parse(lastDryRunAt) < Date.parse(backup.started_at));
  const startedAt = draft.dry_run_started_at ?? (backupUsable ? backup.started_at : null);
  const stoppedAt = backup && startedAt && backup.started_at === startedAt ? backup.stopped_at : null;
  const running = startedAt !== null && stoppedAt === null;

  const start = () => {
    const at = new Date().toISOString();
    writeBackup(key, { started_at: at, stopped_at: null });
    setDraft((d) => ({ ...d, dry_run_started_at: at }));
  };

  const stop = () => {
    if (!startedAt) return;
    writeBackup(key, { started_at: startedAt, stopped_at: new Date().toISOString() });
    // Keep the start in the server draft until the entry is posted.
    setDraft((d) => (d.dry_run_started_at ? d : { ...d, dry_run_started_at: startedAt }));
  };

  const reset = () => {
    writeBackup(key, null);
    setDraft((d) => (d.dry_run_started_at === null ? d : { ...d, dry_run_started_at: null }));
  };

  return {
    startedAt,
    stoppedAt,
    running,
    elapsed: running && now !== null ? dryRunElapsed(startedAt, now) : null,
    measured: startedAt && stoppedAt ? Math.max(0, minutesBetween(startedAt, stoppedAt) ?? 0) : null,
    start,
    stop,
    reset,
  };
}
