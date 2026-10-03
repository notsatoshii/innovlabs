// POST /api/staff/learner/[userId]/track — the instructor confirms the
// learner's Week 4 track (phase-2c D2). Request: TrackConfirmRequest
// { track }. Response: ApiResult<TrackConfirmResult>.
//
// Writes a learner-visible `track_confirmed` event (staff-written; browsers
// cannot insert it, migration 0009 allowlist). It is stored BESIDE the survey
// track: it may differ from it and may be SMB. user_profile.track is never
// read for writing and never written here; the one-pager and the course
// pages keep reading it. The newest event is the current confirmation, so a
// second save with the same track writes nothing.
//
// The learner must have an active enrollment (the event records its cohort).
// Staff identity is the user id and role, never an email (the learner reads
// this row). Service role, after requireStaff().

import { ok, bad, requireStaff } from "@/lib/auth/guards";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { findActiveCohort } from "@/lib/courses/queries";
import { EVENT_TYPES, visibilityFor, type TrackConfirmedPayload } from "@/lib/profile/events";
import type { TrackId } from "@/lib/survey/types";
import { isConfirmTrack, isUuid } from "@/components/staff/format";
import type { TrackConfirmResult } from "@/components/staff/results";
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
  const track = body.track;
  if (!isConfirmTrack(track)) return bad("validation", 400, ["확정할 트랙을 골라 주세요."]);

  const admin = supabaseAdmin();
  if (!admin) return notConfigured();

  const { data: profile, error: profileError } = await admin
    .from("user_profile")
    .select("user_id, track")
    .eq("user_id", userId)
    .maybeSingle();
  if (profileError) return serverError("profile_lookup_failed", profileError.message);
  if (!profile) return noSuchLearner();

  const found = await findActiveCohort(admin, userId);
  if (found.status === "error") {
    return bad("unavailable", 503, ["지금은 저장할 수 없어요. 잠시 후 다시 시도해 주세요."]);
  }
  if (found.status === "none") {
    return bad("not_enrolled", 403, ["이 수강생은 지금 수강 중인 코호트가 없어서 트랙을 확정할 수 없어요."]);
  }

  // Same track as the newest confirmation: nothing to append (double tap, re-save).
  const { data: latest, error: latestError } = await admin
    .from("profile_event")
    .select("id, created_at, track:data->>track")
    .eq("user_id", userId)
    .eq("type", EVENT_TYPES.track_confirmed)
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (latestError) return serverError("track_lookup_failed", latestError.message);
  const newest = latest as { id: number; created_at: string; track: string | null } | null;
  if (newest && newest.track === track) {
    const result: TrackConfirmResult = {
      track_confirmed: { event_id: newest.id, created_at: newest.created_at, track, unchanged: true },
    };
    return ok(result);
  }

  const payload: TrackConfirmedPayload = {
    version: 1,
    track,
    survey_track: ((profile as { track: string | null }).track as TrackId | null) ?? null,
    cohort_id: found.mine.cohort.id,
    by_user_id: auth.user.id,
    by_role: auth.staffRole,
  };
  const { data, error } = await admin
    .from("profile_event")
    .insert({
      user_id: userId,
      type: EVENT_TYPES.track_confirmed,
      visibility: visibilityFor(EVENT_TYPES.track_confirmed),
      data: payload,
    })
    .select("id, created_at")
    .single();
  if (error || !data) return serverError("track_confirm_failed", error?.message);

  const result: TrackConfirmResult = {
    track_confirmed: { event_id: data.id as number, created_at: data.created_at as string, track, unchanged: false },
  };
  return ok(result);
}
