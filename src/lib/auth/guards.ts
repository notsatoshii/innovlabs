// Guards for route handlers under src/app/api. Each returns either the
// caller's context or a ready NextResponse to return as-is, so a route reads:
//
//   const auth = await requireLearner();
//   if ("response" in auth) return auth.response;
//
// Service-role writes (supabaseAdmin) must only happen after one of these.

import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { getSession } from "@/lib/auth/session";
import type { StaffRole, UserProfile } from "@/lib/profile/types";
import type { ApiError } from "@/lib/courses/types";

function fail(error: string, status: number, problems?: string[]): { response: NextResponse<ApiError> } {
  return { response: NextResponse.json({ ok: false, error, problems }, { status }) };
}

export interface LearnerContext {
  user: User;
  profile: UserProfile;
  staffRole: StaffRole | null;
}

/** Signed in and past the survey gate (has a profile). */
export async function requireLearner(): Promise<LearnerContext | { response: NextResponse<ApiError> }> {
  const session = await getSession();
  if (!session) return fail("not_authenticated", 401);
  if (!session.profile) return fail("no_profile", 409);
  return { user: session.user, profile: session.profile, staffRole: session.staffRole };
}

export interface StaffContext {
  user: User;
  email: string;
  staffRole: StaffRole;
}

/** Signed in with a row in public.staff. */
export async function requireStaff(): Promise<StaffContext | { response: NextResponse<ApiError> }> {
  const session = await getSession();
  if (!session) return fail("not_authenticated", 401);
  if (!session.staffRole || !session.user.email) return fail("not_staff", 403);
  return { user: session.user, email: session.user.email, staffRole: session.staffRole };
}

/** Uniform JSON helpers for the routes. */
export function ok<T>(data: T): NextResponse {
  return NextResponse.json({ ok: true, data });
}
export function bad(error: string, status = 400, problems?: string[]): NextResponse<ApiError> {
  return NextResponse.json({ ok: false, error, problems }, { status });
}
