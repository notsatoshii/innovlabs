// 운영 (staff) section shell (docs/app/phases/phase-2.md P2).
//
// Signed out → /login. Signed in without a staff role → 404. Every page
// below repeats the check through requireStaffPage(), and every read goes
// through the staff member's own Supabase client, so RLS is the last word.
//
// Lives at /staff, outside the /app shell, on purpose: /app sends any account
// without a survey profile to the survey, and a staff member (an instructor
// or founder who never took the survey) must still get in. The future admin
// subdomain points here. Staff mostly work on a laptop, so the section is
// wide; on a phone tables scroll inside their own boxes.

import type { Metadata } from "next";
import Link from "next/link";
import { requireStaffPage } from "@/components/staff/guard";

export const metadata: Metadata = { title: "운영" };

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  await requireStaffPage();

  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-6 pb-16 pt-6">
      <header className="mb-5 flex items-center justify-between gap-3 border-b border-[var(--nb-line)] pb-3">
        <Link href="/staff" className="flex items-baseline gap-2">
          <span className="text-xl font-extrabold tracking-tight">운영</span>
          <span className="text-xs font-semibold text-gray-500">코호트와 수강생</span>
        </Link>
        <Link
          href="/"
          className="shrink-0 text-sm font-semibold text-gray-700 underline underline-offset-4"
        >
          앱으로
        </Link>
      </header>
      {children}
    </div>
  );
}
