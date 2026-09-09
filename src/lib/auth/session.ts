// Server-side session + profile lookup for the app shell (Phase 1a).
// Call from server components, layouts, and route handlers only.

import { cache } from "react";
import type { User } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase/server";
import type { StaffRole, UserProfile } from "@/lib/profile/types";

export interface Session {
  user: User;
  /** null when the account has signed in but never completed the survey gate. */
  profile: UserProfile | null;
  /** 'admin' | 'instructor' | null, from public.staff_role(). */
  staffRole: StaffRole | null;
}

/**
 * Signed-in user with their profile, or null when signed out. Wrapped in
 * React cache() so the root layout and a nested layout share one lookup per
 * request.
 */
export const getSession = cache(async (): Promise<Session | null> => {
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  const [{ data: profile }, { data: staffRole }] = await Promise.all([
    supabase
      .from("user_profile")
      .select("*")
      .eq("user_id", auth.user.id)
      .maybeSingle(),
    supabase.rpc("staff_role"),
  ]);

  return {
    user: auth.user,
    profile: (profile as UserProfile | null) ?? null,
    staffRole: (staffRole as StaffRole | null) ?? null,
  };
});

/** Sign-in method label for the profile card, from Supabase identities. */
export function signInMethod(user: User): "google" | "kakao" | "email" {
  const provider = user.app_metadata?.provider;
  if (provider === "google" || provider === "kakao") return provider;
  return "email";
}
