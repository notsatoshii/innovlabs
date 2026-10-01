// POST /api/artifacts/harness: save one harness as a new version (SP-W2-HC).
// Body { item } (a HarnessDraftItem). The item is normalised and judged again
// with the same checkHarness the editor runs. Nothing the client says about
// versions or ownership is used: the version is the number of harness_saved
// events this learner already has for that harness_id, plus one, counted here
// with the query scoped to the caller's own user id. A harness_id is only a
// name inside one learner's library, so another learner using the same id
// touches nothing of this one's.
//
// The event carries the whole harness, example text included, and is written
// with the service role (learners cannot insert lab events, migration 0009).
// Saving again never edits an earlier version: the log keeps them all.

import { requireLearner, ok, bad } from "@/lib/auth/guards";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { HARNESS_LIMITS } from "@/lib/courses/types";
import { EVENT_TYPES } from "@/lib/profile/events";
import { checkHarness, parseHarnessItem, toHarnessPayload } from "@/components/lab/rules";
import { readJsonObject } from "../_lib/body";

/** One harness at every limit is about 43 KB of UTF-8; anything larger is not a harness. */
const MAX_BODY_BYTES = 64 * 1024;

export async function POST(req: Request) {
  const auth = await requireLearner();
  if ("response" in auth) return auth.response;

  const read = await readJsonObject(req, MAX_BODY_BYTES);
  if ("response" in read) return read.response;
  const item = parseHarnessItem(read.body.item);
  if (!item) return bad("bad_request", 400);

  const { errors } = checkHarness(item);
  if (errors.length > 0) return bad("validation", 422, errors);

  const admin = supabaseAdmin();
  if (!admin) return bad("not_configured", 503);

  // Prior versions of this harness, this learner's only.
  const { count: prior, error: countError } = await admin
    .from("profile_event")
    .select("id", { count: "exact", head: true })
    .eq("user_id", auth.user.id)
    .eq("type", EVENT_TYPES.harness_saved)
    .eq("data->>harness_id", item.id);
  if (countError || prior === null) {
    console.error("harness version count failed:", countError?.message ?? "no count");
    return bad("store_failed", 500);
  }

  // A first save opens a new harness: hold the library to its cap. Every
  // harness has exactly one version 1 event, so those count the library.
  if (prior === 0) {
    const { count: harnesses, error: capError } = await admin
      .from("profile_event")
      .select("id", { count: "exact", head: true })
      .eq("user_id", auth.user.id)
      .eq("type", EVENT_TYPES.harness_saved)
      .eq("data->>harness_version", "1");
    if (capError || harnesses === null) {
      console.error("harness library count failed:", capError?.message ?? "no count");
      return bad("store_failed", 500);
    }
    if (harnesses >= HARNESS_LIMITS.maxHarnesses) {
      return bad("validation", 422, [`하네스는 ${HARNESS_LIMITS.maxHarnesses}개까지 저장할 수 있어요.`]);
    }
  }

  const payload = toHarnessPayload(item, prior + 1);
  const { error } = await admin.from("profile_event").insert({
    user_id: auth.user.id,
    type: EVENT_TYPES.harness_saved,
    visibility: "learner",
    data: payload,
  });
  if (error) {
    console.error("harness event insert failed:", error.message);
    return bad("store_failed", 500);
  }

  return ok({ harness_id: payload.harness_id, harness_version: payload.harness_version });
}
