// GET /api/course/state?course=spine0&level=1: the LevelState of the
// signed-in learner (src/lib/course/state.ts), for a client refresh after an
// award. Reads through the learner's own client (own rows by RLS). Never
// cached.

import { requireLearner, ok, bad } from "@/lib/auth/guards";
import { supabaseServer } from "@/lib/supabase/server";
import { getLevelState } from "@/lib/course/state";
import { COURSES } from "@/lib/course/validate";
import type { MissionContent } from "@/lib/course/types";

export async function GET(req: Request) {
  const auth = await requireLearner();
  if ("response" in auth) return auth.response;

  const params = new URL(req.url).searchParams;
  const course = params.get("course") ?? "";
  const levelRaw = params.get("level") ?? "";
  if (!COURSES.includes(course as MissionContent["course"]) || !/^[0-9]{1,2}$/.test(levelRaw)) {
    return bad("bad_request", 400);
  }
  const level = Number(levelRaw);
  if (level < 1 || level > 12) return bad("bad_request", 400);

  let state;
  try {
    state = await getLevelState(auth.user.id, course, level, await supabaseServer());
  } catch (e) {
    console.error((e as Error).message);
    return bad("read_failed", 500);
  }
  if (!state) return bad("no_content", 404);

  const res = ok(state);
  res.headers.set("Cache-Control", "no-store");
  return res;
}
