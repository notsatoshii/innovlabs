import type { Metadata } from "next";
import Link from "next/link";
import { COMPACT, ClayRow } from "@/components/ClayRow";
import { getSession } from "@/lib/auth/session";

// Korean 404 for every unmatched URL and every notFound() call (CLAUDE.md
// rule 1; the default page is English). Renders inside the root layout, so
// the header with the logo stays. Two ways back: the landing page, and the
// same destination the header button offers for this visitor.

export const metadata: Metadata = { title: "페이지를 찾을 수 없어요" };

export default async function NotFound() {
  // The root layout has already looked the session up for this request
  // (React cache), so this adds no extra trip. A failed lookup just shows
  // the signed-out links.
  const session = await getSession().catch(() => null);

  const second = session
    ? {
        href: session.profile ? "/app/profile" : "/start?reason=no_profile",
        label: "내 프로필",
      }
    : { href: "/login", label: "로그인" };

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 py-16">
      <ClayRow items={COMPACT} />
      <p className="nb-accent mb-2 text-sm font-extrabold">페이지를 찾을 수 없어요</p>
      <h1 className="mb-3 text-3xl font-extrabold leading-snug tracking-tight">
        찾으시는 페이지가
        <br />
        여기에는 없어요
      </h1>
      <p className="mb-8 text-[15px] leading-relaxed text-gray-600">
        주소가 잘못 입력됐거나 페이지가 옮겨졌을 수 있어요. 아래에서 이어서
        가실 수 있어요.
      </p>
      <div className="flex flex-col gap-3">
        <Link
          href="/"
          className="nb-btn nb-btn-primary block w-full py-3.5 text-center text-[15px]"
        >
          홈으로
        </Link>
        <Link
          href={second.href}
          className="nb-btn nb-btn-white block w-full py-3.5 text-center text-[15px]"
        >
          {second.label}
        </Link>
      </div>
    </main>
  );
}
