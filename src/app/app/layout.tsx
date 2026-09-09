// App shell (Phase 1a): server auth guard + bottom tab bar.
//
// Signed out            → /login
// Signed in, no profile → /start?reason=no_profile (the survey gate comes
//                         first: CLAUDE.md rule 3)

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { TabBar } from "@/components/app/TabBar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.profile) redirect("/start?reason=no_profile");

  return (
    <>
      {/* Bottom padding clears the fixed tab bar (≈4.5rem) plus the safe area. */}
      <div className="mx-auto w-full max-w-lg flex-1 px-6 pt-6 pb-[calc(6rem+env(safe-area-inset-bottom))]">
        {children}
      </div>
      <TabBar />
    </>
  );
}
