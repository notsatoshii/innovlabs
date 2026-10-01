// Generation guard for POST /api/one-pager (review P0-4, P2-11). Server only,
// service role only: `authenticated` has no grant on these columns
// (migration 0004 revokes UPDATE, 0008 adds the columns).
//
// Columns (supabase/migrations/0008_one_pager_guard.sql):
//   one_pager_attempts       int, how many generations this profile has started
//   one_pager_generating_at  timestamptz, set while a generation is running
//
// The claim is a compare-and-swap on one_pager_attempts: a single UPDATE that
// only matches the value this request just read. Postgres re-checks the WHERE
// clause after waiting on the row lock, so of two concurrent requests exactly
// one updates the row; the other matches nothing and is told to wait. Every
// claim spends one attempt whether or not the generation later succeeds, which
// is what caps the spend per profile.

import type { SupabaseClient } from "@supabase/supabase-js";
import { isOnePager, type OnePager } from "./types";

/** Generations a profile may start, in total. After that: contact the team. */
export const MAX_ATTEMPTS = 3;

/**
 * A claim older than this is treated as abandoned (the process died mid-call).
 * Must stay above the worst case of one generation: two model calls, each up
 * to 45 s with one SDK retry, is about three minutes.
 */
export const CLAIM_STALE_MS = 5 * 60 * 1000;

export type ClaimResult =
  | { status: "claimed"; attempt: number }
  | { status: "in_progress" }
  | { status: "exhausted" }
  /** Guard columns missing or the query failed: generation must not run. */
  | { status: "unavailable"; reason: string };

export async function claimGeneration(
  admin: SupabaseClient,
  userId: string,
): Promise<ClaimResult> {
  const { data: row, error: readError } = await admin
    .from("user_profile")
    .select("one_pager_attempts, one_pager_generating_at")
    .eq("user_id", userId)
    .single();
  if (readError || !row) {
    return { status: "unavailable", reason: readError?.message ?? "no profile row" };
  }

  const attempts = typeof row.one_pager_attempts === "number" ? row.one_pager_attempts : 0;
  const startedAt = row.one_pager_generating_at
    ? Date.parse(row.one_pager_generating_at as string)
    : NaN;
  if (Number.isFinite(startedAt) && Date.now() - startedAt < CLAIM_STALE_MS) {
    return { status: "in_progress" };
  }
  if (attempts >= MAX_ATTEMPTS) return { status: "exhausted" };

  const { data: claimed, error: claimError } = await admin
    .from("user_profile")
    .update({
      one_pager_attempts: attempts + 1,
      one_pager_generating_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("one_pager_attempts", attempts)
    .select("user_id");
  if (claimError) return { status: "unavailable", reason: claimError.message };
  // Zero rows: another request took this attempt between our read and write.
  if (!claimed || claimed.length === 0) return { status: "in_progress" };

  return { status: "claimed", attempt: attempts + 1 };
}

/** Stores the report and releases the claim. Returns false when the write failed. */
export async function finishGeneration(
  admin: SupabaseClient,
  userId: string,
  onePager: OnePager,
): Promise<boolean> {
  const { error } = await admin
    .from("user_profile")
    .update({
      one_pager: onePager,
      one_pager_generated_at: new Date().toISOString(),
      one_pager_generating_at: null,
    })
    .eq("user_id", userId);
  if (error) console.error("one-pager save failed:", error.message);
  return !error;
}

/** Releases the claim after a failed generation. The attempt stays spent. */
export async function releaseClaim(admin: SupabaseClient, userId: string): Promise<void> {
  const { error } = await admin
    .from("user_profile")
    .update({ one_pager_generating_at: null })
    .eq("user_id", userId);
  if (error) console.error("one-pager claim release failed:", error.message);
}

/**
 * Waits for the request that holds the claim to finish and returns its report,
 * or null if none appeared in time. Lets a second tab show the same report
 * instead of an error.
 */
export async function waitForOnePager(
  admin: SupabaseClient,
  userId: string,
  opts: { timeoutMs: number; intervalMs: number },
): Promise<OnePager | null> {
  const deadline = Date.now() + opts.timeoutMs;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, opts.intervalMs));
    const { data, error } = await admin
      .from("user_profile")
      .select("one_pager, one_pager_generating_at")
      .eq("user_id", userId)
      .single();
    if (error || !data) return null;
    if (isOnePager(data.one_pager)) return data.one_pager;
    // The other request gave up (released its claim without a report).
    if (!data.one_pager_generating_at) return null;
  }
  return null;
}
