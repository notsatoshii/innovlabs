// POST /api/course/interest: "tell me when Level N opens" (InterestRequest
// -> InterestResponse; migration 0013). One row per learner, course and
// level; a second tap returns the first row's date. Accepted only once the
// level before it is finished (every mission on its path done), so the list
// staff read holds learners who reached the end. Pays no XP (rulebook: XP
// for evidence only). Written with the service role after requireLearner().

import { requireLearner, ok, bad } from "@/lib/auth/guards";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";
import { getLevelState } from "@/lib/course/state";
import { COURSES } from "@/lib/course/validate";
import type { InterestResponse, MissionContent } from "@/lib/course/types";
import { readCourseBody } from "../_lib/request";

export async function POST(req: Request) {
  const auth = await requireLearner();
  if ("response" in auth) return auth.response;

  const read = await readCourseBody(req);
  if ("response" in read) return read.response;
  const { course, level } = read.body;
  if (typeof course !== "string" || !COURSES.includes(course as MissionContent["course"])) return bad("bad_request", 400);
  if (typeof level !== "number" || !Number.isInteger(level) || level < 2 || level > 12) return bad("bad_request", 400);

  const supabase = await supabaseServer();
  let before;
  try {
    before = await getLevelState(auth.user.id, course, level - 1, supabase);
  } catch (e) {
    console.error("course level state failed:", (e as Error).message);
    return bad("read_failed", 500);
  }
  if (!before || !before.missions.every((m) => m.status === "done")) return bad("level_not_done", 409);

  const admin = supabaseAdmin();
  if (!admin) return bad("not_configured", 503);
  const { error } = await admin
    .from("course_interest")
    .upsert({ user_id: auth.user.id, course, level }, { onConflict: "user_id,course,level", ignoreDuplicates: true });
  if (error) {
    console.error("course_interest upsert failed:", error.message);
    return bad("store_failed", 500);
  }
  const { data, error: readError } = await admin
    .from("course_interest")
    .select("created_at")
    .eq("user_id", auth.user.id)
    .eq("course", course)
    .eq("level", level)
    .single();
  if (readError || !data) {
    console.error("course_interest read failed:", readError?.message);
    return bad("read_failed", 500);
  }
  const response: InterestResponse = { course, level, since: (data as { created_at: string }).created_at };
  return ok(response);
}
