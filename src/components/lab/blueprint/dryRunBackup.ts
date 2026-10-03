"use client";

// Browser-side backup of the dry-run timer (phase-2c, plan review 2): the
// server draft holds dry_run_started_at, and this keeps a copy plus the
// instant 정지 was tapped, so a phone that discarded the tab, or a draft save
// that had not landed yet, still knows when the run started and stopped.
//
// localStorage can be missing or throw (private mode, blocked site data), so
// every value is also kept in memory for the life of the page, and nothing
// here is the only record of anything that must persist: the time itself is
// stored when the learner posts the time log entry.

export interface DryRunBackup {
  started_at: string;
  stopped_at: string | null;
}

const memory = new Map<string, string | null>();
const listeners = new Set<() => void>();

export function backupKey(userId: string): string {
  return `innovlabs.blueprint.dry-run.${userId}`;
}

/** The raw stored string (a stable snapshot for useSyncExternalStore), or null. */
export function readBackupRaw(key: string): string | null {
  if (memory.has(key)) return memory.get(key) ?? null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function parseBackup(raw: string | null): DryRunBackup | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null) return null;
    const { started_at, stopped_at } = value as Record<string, unknown>;
    if (typeof started_at !== "string" || Number.isNaN(Date.parse(started_at))) return null;
    const stopped = typeof stopped_at === "string" && !Number.isNaN(Date.parse(stopped_at)) ? stopped_at : null;
    return { started_at, stopped_at: stopped };
  } catch {
    return null;
  }
}

export function writeBackup(key: string, value: DryRunBackup | null): void {
  const raw = value ? JSON.stringify(value) : null;
  memory.set(key, raw);
  try {
    if (raw) window.localStorage.setItem(key, raw);
    else window.localStorage.removeItem(key);
  } catch {
    // Memory still holds it for this page.
  }
  for (const listener of listeners) listener();
}

export function subscribeBackup(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = () => {
    memory.clear(); // another tab wrote it: read storage again
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}
