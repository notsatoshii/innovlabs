// POST /api/artifacts/correction: add one line to the correction log (SP-W2-CL).
// Body is a CorrectionInput. Re-validates with the same checkCorrection the
// form runs (both sentences 1 to 1,000 characters) plus one server-only
// check: harness_id must be a harness this learner has saved, looked up among
// the caller's own harness_saved events. The line is appended as a
// correction_logged event with the service role. Lines are never edited or
// removed; "now written as a rule" is the same line logged again with
// rule_written true (see collapseCorrections).

import { requireLearner, ok, bad } from "@/lib/auth/guards";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { EVENT_TYPES, type CorrectionLoggedPayload } from "@/lib/profile/events";
import { checkCorrection, parseCorrectionInput } from "@/components/lab/rules";
import { readJsonObject } from "../_lib/body";

export async function POST(req: Request) {
  const auth = await requireLearner();
  if ("response" in auth) return auth.response;

  // Two sentences of 1,000 Korean characters are about 6 KB.
  const read = await readJsonObject(req, 16 * 1024);
  if ("response" in read) return read.response;
  const input = parseCorrectionInput(read.body);
  if (!input) return bad("bad_request", 400);

  const errors = checkCorrection(input);
  if (errors.length > 0) return bad("validation", 422, errors);

  const admin = supabaseAdmin();
  if (!admin) return bad("not_configured", 503);

  const { count: saved, error: ownError } = await admin
    .from("profile_event")
    .select("id", { count: "exact", head: true })
    .eq("user_id", auth.user.id)
    .eq("type", EVENT_TYPES.harness_saved)
    .eq("data->>harness_id", input.harness_id);
  if (ownError || saved === null) {
    console.error("correction harness lookup failed:", ownError?.message ?? "no count");
    return bad("store_failed", 500);
  }
  if (saved === 0) {
    return bad("validation", 422, ["저장한 하네스에만 수정 기록을 남길 수 있어요. 하네스를 먼저 저장해 주세요."]);
  }

  const correction: CorrectionLoggedPayload = { version: 1, ...input };
  const { error } = await admin.from("profile_event").insert({
    user_id: auth.user.id,
    type: EVENT_TYPES.correction_logged,
    visibility: "learner",
    data: correction,
  });
  if (error) {
    console.error("correction event insert failed:", error.message);
    return bad("store_failed", 500);
  }

  return ok({ correction });
}
