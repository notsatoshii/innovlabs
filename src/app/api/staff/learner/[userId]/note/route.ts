// POST /api/staff/learner/[userId]/note — append an instructor note about a
// learner. Request: { note: string } (1–2000 characters after trimming).
// Response: ApiResult<{ note: { id, created_at } }>.
//
// Written as an `instructor_note` profile_event with visibility "staff", so
// the learner's own select policy never returns it (migration 0004). Append
// only: there is no edit or delete. Service role, after requireStaff().

import { ok, bad, requireStaff } from "@/lib/auth/guards";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { EVENT_TYPES, type InstructorNotePayload } from "@/lib/profile/events";
import { isUuid } from "@/components/staff/format";
import { NOTE_MAX } from "@/components/staff/limits";
import { badJson, notConfigured, readBody, serverError } from "../../../_shared";

function noSuchLearner() {
  return bad("no_such_learner", 404, ["수강생을 찾지 못했어요. 명단에서 다시 열어 주세요."]);
}

export async function POST(req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const auth = await requireStaff();
  if ("response" in auth) return auth.response;

  const { userId } = await params;
  if (!isUuid(userId)) return noSuchLearner();

  const body = await readBody(req);
  if (!body) return badJson();
  const note = typeof body.note === "string" ? body.note.trim() : "";
  if (!note) return bad("validation", 400, ["메모 내용을 적어 주세요."]);
  if (note.length > NOTE_MAX) return bad("validation", 400, [`메모는 ${NOTE_MAX}자 이내로 적어 주세요.`]);

  const admin = supabaseAdmin();
  if (!admin) return notConfigured();

  const { data: profile, error: profileError } = await admin
    .from("user_profile")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (profileError) return serverError("profile_lookup_failed", profileError.message);
  if (!profile) return noSuchLearner();

  const payload: InstructorNotePayload = { version: 1, note, by: auth.email };
  const { data, error } = await admin
    .from("profile_event")
    .insert({ user_id: userId, type: EVENT_TYPES.instructor_note, visibility: "staff", data: payload })
    .select("id, created_at")
    .single();
  if (error || !data) return serverError("note_failed", error?.message);

  return ok({ note: { id: data.id as number, created_at: data.created_at as string } });
}
