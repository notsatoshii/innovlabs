import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";

// A signed-in learner who already registered (has a profile) has nothing to
// do on the gate: send them to 나의 AI 교육 instead of "먼저 진단을 완료해
// 주세요 … 로그인" (review A14). Accounts without a profile, mid-OAuth or
// mid-registration, still reach the page.
export default async function RegisterLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (session?.profile) redirect("/app/education");
  return children;
}
