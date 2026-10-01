// POST /api/staff/cohort/[id]/enroll — add a learner to a cohort by the email
// they registered with (phase-2 P1). Request: StaffEnrollRequest.
// Response: ApiResult<{ enrollment, learner: { user_id, display_name } }>.
//
// Enrollment has no client write policy and `enrolled` is a staff-written
// event: both inserts use the service role, and only after requireStaff().
// The learner must already have a user_profile (survey gate and registration
// done); otherwise 404 no_such_learner.

import type { SupabaseClient, User } from "@supabase/supabase-js";
import { ok, bad, requireStaff } from "@/lib/auth/guards";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Enrollment } from "@/lib/courses/types";
import { EVENT_TYPES } from "@/lib/profile/events";
import { isUuid } from "@/components/staff/format";
import { EMAIL_MAX } from "@/components/staff/limits";
import { badJson, noSuchCohort, notConfigured, readBody, serverError } from "../../../_shared";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// The admin API has no lookup by email, so page through the accounts.
// 50 pages of 200 covers 10,000 accounts; past that this needs an RPC.
const PER_PAGE = 200;
const MAX_PAGES = 50;

async function findUserByEmail(admin: SupabaseClient, email: string): Promise<User | null> {
  for (let page = 1; page <= MAX_PAGES; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: PER_PAGE });
    if (error) throw error;
    const hit = data.users.find((u) => u.email?.toLowerCase() === email);
    if (hit) return hit;
    if (data.users.length < PER_PAGE) return null;
  }
  return null;
}

function noSuchLearner() {
  return bad("no_such_learner", 404, [
    "이 이메일로 가입한 수강생을 찾지 못했어요.",
    "진단을 마치고 회원가입까지 끝낸 분만 추가할 수 있어요. 가입할 때 쓴 이메일이 맞는지도 확인해 주세요.",
  ]);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireStaff();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  if (!isUuid(id)) return noSuchCohort();

  const body = await readBody(req);
  if (!body) return badJson();
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || email.length > EMAIL_MAX || !EMAIL_RE.test(email)) {
    return bad("validation", 400, ["이메일 주소를 다시 확인해 주세요."]);
  }

  const admin = supabaseAdmin();
  if (!admin) return notConfigured();

  const { data: cohort, error: cohortError } = await admin
    .from("cohort")
    .select("id, track_code")
    .eq("id", id)
    .maybeSingle();
  if (cohortError) return serverError("cohort_lookup_failed", cohortError.message);
  if (!cohort) return noSuchCohort();

  let user: User | null;
  try {
    user = await findUserByEmail(admin, email);
  } catch (e) {
    return serverError("user_lookup_failed", e);
  }
  if (!user) return noSuchLearner();

  const { data: profile, error: profileError } = await admin
    .from("user_profile")
    .select("user_id, display_name")
    .eq("user_id", user.id)
    .maybeSingle();
  if (profileError) return serverError("profile_lookup_failed", profileError.message);
  if (!profile) return noSuchLearner();

  // Already on the roster: nothing to write. Bringing back someone who
  // dropped or completed would be a status change, and there is no route for
  // that yet, so say so instead of pretending.
  const { data: existing, error: existingError } = await admin
    .from("enrollment")
    .select("status")
    .eq("cohort_id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (existingError) return serverError("enrollment_lookup_failed", existingError.message);
  if (existing) return alreadyEnrolled((existing as Pick<Enrollment, "status">).status);

  const { data: enrollment, error: enrollError } = await admin
    .from("enrollment")
    .insert({ cohort_id: id, user_id: user.id, status: "active" })
    .select("*")
    .single();
  // 23505: the learner typed the code (or staff double-clicked) at the same moment.
  if (enrollError?.code === "23505") return alreadyEnrolled("active");
  if (enrollError || !enrollment) return serverError("enroll_failed", enrollError?.message);

  // Same payload as POST /api/cohort/join, with via "staff".
  const { error: eventError } = await admin.from("profile_event").insert({
    user_id: user.id,
    type: EVENT_TYPES.enrolled,
    visibility: "learner",
    data: { version: 1, cohort_id: id, track: cohort.track_code, via: "staff" },
  });
  if (eventError) {
    // Keep "enrolled ⇒ an enrolled event exists" (as the join route does):
    // take the new row back so a retry writes both.
    const { error: undoError } = await admin
      .from("enrollment")
      .delete()
      .eq("cohort_id", id)
      .eq("user_id", user.id);
    if (undoError) console.error("staff enroll: could not undo enrollment:", undoError.message);
    return serverError("enroll_event_failed", eventError.message);
  }

  return ok({
    enrollment: enrollment as Enrollment,
    learner: { user_id: user.id, display_name: (profile.display_name as string | null) ?? null },
  });
}

function alreadyEnrolled(status: Enrollment["status"]) {
  return bad("already_enrolled", 409, [
    status === "active"
      ? "이미 이 코호트 명단에 있는 분이에요."
      : "예전에 이 코호트에 등록했던 분이에요. 다시 수강 중으로 바꾸는 기능은 아직 없어서, 개발 담당자에게 알려 주세요.",
  ]);
}
