// One-pager shape. Pure types and a shape check: safe to import from client
// components (no fs, no SDK). The generator lives in ./generate.ts.

/**
 * Bumped whenever a cached report must not be shown any more. v1 reports were
 * generated from placeholder four-week fact sheets; anything without v: 2 is
 * treated as "no report yet" and regenerated.
 */
export const ONE_PAGER_VERSION = 2;

export interface OnePagerWeek {
  /** Week number, always one of content/courses/structure.json. */
  week: number;
  /** Week title, copied from structure.json by code (never model-written). */
  title: string;
  /** One sentence: model-written for the personalized weeks, static otherwise. */
  connection: string;
}

export interface OnePager {
  v: typeof ONE_PAGER_VERSION;
  mirror: string;
  weeks: OnePagerWeek[];
  outcome: string;
  closing: string;
}

/** Strict shape check for the profile's one_pager column (typed unknown). */
export function isOnePager(value: unknown): value is OnePager {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (v.v !== ONE_PAGER_VERSION) return false;
  if (
    typeof v.mirror !== "string" ||
    typeof v.outcome !== "string" ||
    typeof v.closing !== "string" ||
    !Array.isArray(v.weeks)
  ) {
    return false;
  }
  return v.weeks.every((w) => {
    if (!w || typeof w !== "object") return false;
    const row = w as Record<string, unknown>;
    return (
      typeof row.week === "number" &&
      Number.isInteger(row.week) &&
      typeof row.title === "string" &&
      typeof row.connection === "string"
    );
  });
}

/**
 * Body of a successful POST /api/one-pager, checked before rendering (review
 * A30): an ok response without a report used to throw "Cannot read
 * properties of undefined (reading 'mirror')". null = show the error state.
 */
export function parseOnePagerResponse(body: unknown): { trackName: string; onePager: OnePager } | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  if (typeof b.trackName !== "string" || !isOnePager(b.onePager)) return null;
  return { trackName: b.trackName, onePager: b.onePager };
}
