import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "로그인" };

// A signed-in account with a profile has nothing to do here.
export default async function LoginLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (session?.profile) redirect("/app/profile");
  return children;
}
