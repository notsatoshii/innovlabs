// Page-level staff guard for everything under /staff. The layout calls it,
// and so does every page: a layout is not re-run on client navigation and
// renders alongside its page, so each page checks for itself before it reads.
// getSession() is cached per request, so the repeat costs nothing.
//
// Signed out → /login. Signed in without a staff role → 404 (the page does
// not admit it exists). Route handlers use requireStaff() from
// src/lib/auth/guards.ts instead.

import { notFound, redirect } from "next/navigation";
import { getSession, type Session } from "@/lib/auth/session";
import type { StaffRole } from "@/lib/profile/types";

export type StaffSession = Session & { staffRole: StaffRole };

export async function requireStaffPage(): Promise<StaffSession> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.staffRole) notFound();
  return session as StaffSession;
}
