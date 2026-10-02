import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import StartFork from "./ForkScreen";

// /start. A signed-in learner who already has a profile has finished the
// diagnosis: a second survey would be dropped silently (deferred 3.8), so
// they get a short notice and a way to 나의 AI 교육 instead (review A15).
// Everyone else, including signed-in accounts without a profile, gets the
// fork as before.

export default async function StartPage() {
  const session = await getSession().catch(() => null);
  if (!session?.profile) return <StartFork />;

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 py-16">
      <p className="nb-accent mb-2 text-sm font-extrabold">AI 업무 진단</p>
      <h1 className="mb-3 text-3xl font-extrabold leading-snug tracking-tight">
        이미 진단을 마치셨어요
      </h1>
      <p className="mb-8 text-[15px] leading-relaxed text-gray-600">
        진단 결과는 나의 AI 교육에서 언제든 다시 보실 수 있어요.
      </p>
      <Link
        href="/app/education"
        className="nb-btn nb-btn-primary block w-full py-3.5 text-center text-[15px]"
      >
        나의 AI 교육으로 가기
      </Link>
    </main>
  );
}
