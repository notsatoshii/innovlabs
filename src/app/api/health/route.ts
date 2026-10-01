// GET /api/health — is the app up, configured, and able to reach its database
// (review findings P0-1, P1-27).
//
//   /api/health             process up + environment + one Supabase read.
//                           For the external uptime monitor: 200 or 503.
//   /api/health?probe=live  process up + environment only. For the container
//                           healthcheck, so a database outage does not mark
//                           the container itself unhealthy.
//
// The body is three booleans and nothing else. Reasons go to the server log
// (names of missing variables, the database error), never to the caller.

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { reportEnvOnce } from "./_lib/env";

// GET handlers are not cached by default, and this one reads the request URL,
// so it runs on every call.

const SUPABASE_TIMEOUT_MS = 2000;
// The endpoint is public: cache the database answer briefly so polling it
// hard costs one cheap read per window, not one per request.
const CACHE_MS = 10_000;

let last: { at: number; ok: boolean } | null = null;
let lastLogged: boolean | null = null;

async function supabaseReachable(): Promise<boolean> {
  const now = Date.now();
  if (last && now - last.at < CACHE_MS) return last.ok;

  let reachable = false;
  let reason = "";
  const admin = supabaseAdmin();
  if (!admin) {
    reason = "service role client is not configured";
  } else {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const controller = new AbortController();
      const timeout = new Promise<"timeout">((resolve) => {
        timer = setTimeout(() => {
          controller.abort();
          resolve("timeout");
        }, SUPABASE_TIMEOUT_MS);
      });
      // One row id from the baseline table, through the same client the
      // server routes use. Read only; the value is discarded.
      const query = admin.from("survey_response").select("id").limit(1).abortSignal(controller.signal);
      const result = await Promise.race([query, timeout]);
      if (result === "timeout") reason = `no answer within ${SUPABASE_TIMEOUT_MS} ms`;
      else if (result.error) reason = result.error.message;
      else reachable = true;
    } catch (e) {
      reason = e instanceof Error ? e.message : "request failed";
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  // Log on a change of state, not on every poll.
  if (lastLogged !== reachable) {
    if (reachable) console.log("[health] Supabase reachable");
    else console.error(`[health] Supabase NOT reachable: ${reason}`);
    lastLogged = reachable;
  }
  last = { at: now, ok: reachable };
  return reachable;
}

export async function GET(req: Request) {
  const liveOnly = new URL(req.url).searchParams.get("probe") === "live";
  const envOk = !reportEnvOnce().some((p) => p.level === "error");

  const headers = { "Cache-Control": "no-store" };
  if (liveOnly) {
    return NextResponse.json({ ok: envOk, checks: { env: envOk } }, { status: envOk ? 200 : 503, headers });
  }

  const supabaseOk = envOk ? await supabaseReachable() : false;
  const ok = envOk && supabaseOk;
  return NextResponse.json(
    { ok, checks: { env: envOk, supabase: supabaseOk } },
    { status: ok ? 200 : 503, headers },
  );
}
