// POST /api/artifacts/harness: save one harness as a new version (SP-W2-HC).
// Body { item } (a HarnessDraftItem). The item is normalised and judged again
// with the same checkHarness the editor runs. Nothing the client says about
// versions or ownership is used: the version is this learner's highest saved
// version of that harness_id plus one, read here with the query scoped to the
// caller's own user id. A harness_id is only a name inside one learner's
// library, so another learner using the same id touches nothing of this one's.
//
// The event carries the whole harness, example text included, and is written
// with the service role (learners cannot insert lab events, migration 0009).
// Saving again never edits an earlier version: the log keeps them all.
// Saving text that is already the latest version writes nothing and answers
// with that version, so a retry after a lost response does not add a copy.

import { requireLearner, ok, bad } from "@/lib/auth/guards";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { HARNESS_LIMITS } from "@/lib/courses/types";
import { EVENT_TYPES } from "@/lib/profile/events";
import {
  checkHarness,
  harnessFromSaved,
  parseHarnessItem,
  sameHarness,
  toHarnessPayload,
} from "@/components/lab/rules";
import { readJsonObject } from "../_lib/body";

/** One harness at every limit is about 43 KB of UTF-8; anything larger is not a harness. */
const MAX_BODY_BYTES = 64 * 1024;

/** Postgres unique_violation: another save took this version number first. */
const UNIQUE_VIOLATION = "23505";
/** More saves of one harness in flight at once than this is not a person. */
const MAX_ATTEMPTS = 5;

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

  // Read the latest version, then insert the next. Two saves that arrive
  // together would read the same number, so migration 0010 makes (learner,
  // harness, version) unique and the loser of the race reads again.
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    // The newest version of this harness, this learner's only. Highest number
    // rather than a count, so a gap in the history can never make the next
    // number collide forever. `data->harness_version` is jsonb: it sorts as a
    // number, not as text.
    const { data: newest, error: latestError } = await admin
      .from("profile_event")
      .select("data")
      .eq("user_id", auth.user.id)
      .eq("type", EVENT_TYPES.harness_saved)
      .eq("data->>harness_id", item.id)
      .order("data->harness_version", { ascending: false })
      .limit(1);
    if (latestError || !newest) {
      console.error("harness latest version read failed:", latestError?.message ?? "no rows");
      return bad("store_failed", 500);
    }
    const latest = newest.length > 0 ? harnessFromSaved(newest[0].data) : null;
    if (newest.length > 0 && !latest) {
      console.error("harness latest version unreadable for", item.id);
      return bad("store_failed", 500);
    }

    if (latest) {
      // Nothing changed since the last save: the same version, no new row.
      if (sameHarness(latest.item, item)) {
        return ok({ harness_id: item.id, harness_version: latest.version });
      }
      if (latest.version >= HARNESS_LIMITS.maxVersions) {
        return bad("validation", 422, [
          `한 하네스는 ${HARNESS_LIMITS.maxVersions}번까지 저장할 수 있어요. 새 하네스를 만들어 이어서 다듬어 주세요.`,
        ]);
      }
    } else {
      // A first save opens a new harness: hold the library to its cap. Every
      // harness has exactly one version 1 event, so those count the library.
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

    const payload = toHarnessPayload(item, (latest?.version ?? 0) + 1);
    const { error } = await admin.from("profile_event").insert({
      user_id: auth.user.id,
      type: EVENT_TYPES.harness_saved,
      visibility: "learner",
      data: payload,
    });
    if (!error) return ok({ harness_id: payload.harness_id, harness_version: payload.harness_version });
    if (error.code !== UNIQUE_VIOLATION) {
      console.error("harness event insert failed:", error.message);
      return bad("store_failed", 500);
    }
  }

  console.error("harness event insert failed: version still taken after retries");
  return bad("store_failed", 500);
}
