// POST /api/artifacts/work-map: submit the Week 1 Work Map (phase-2 P5, P7).
// Body { draft }. The posted draft is normalised and then judged again with
// the same checkWorkMap the editor runs, so nothing the client claims is
// trusted. On success the service role appends a work_map_submitted event and
// replaces user_profile.work_map (a derived column learners cannot write).
// Submitting again is allowed: each submission is a new event, so the log
// keeps every version while the profile shows the latest.

import { requireLearner, ok, bad } from "@/lib/auth/guards";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { checkWorkMap, toSnapshot } from "@/lib/courses/work-map";
import { EVENT_TYPES } from "@/lib/profile/events";
import { checkExtraCategories, parseWorkMapDraft } from "@/components/lab/rules";
import { readJsonObject } from "../_lib/body";

export async function POST(req: Request) {
  const auth = await requireLearner();
  if ("response" in auth) return auth.response;

  const read = await readJsonObject(req);
  if ("response" in read) return read.response;
  const draft = parseWorkMapDraft(read.body.draft);
  if (!draft) return bad("bad_request", 400);

  const errors = [...checkWorkMap(draft).errors, ...checkExtraCategories(draft)];
  if (errors.length > 0) return bad("validation", 422, errors);

  const admin = supabaseAdmin();
  if (!admin) return bad("not_configured", 503);

  const snapshot = toSnapshot(draft, auth.profile.core ?? {}, new Date().toISOString());

  const { error: eventError } = await admin.from("profile_event").insert({
    user_id: auth.user.id,
    type: EVENT_TYPES.work_map_submitted,
    visibility: "learner",
    data: snapshot,
  });
  if (eventError) {
    console.error("work map event insert failed:", eventError.message);
    return bad("store_failed", 500);
  }

  const { error: profileError } = await admin
    .from("user_profile")
    .update({ work_map: snapshot })
    .eq("user_id", auth.user.id);
  if (profileError) {
    // The event is the record; the snapshot can be rebuilt from it. Still an
    // error for the learner, who can submit again.
    console.error("work map snapshot update failed:", profileError.message);
    return bad("store_failed", 500);
  }

  return ok({ snapshot });
}
