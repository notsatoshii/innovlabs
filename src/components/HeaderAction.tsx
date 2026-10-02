"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// The header's one button (내 프로필 when signed in, 로그인 when not), hidden
// where it only repeats or distracts (review A25): 내 프로필 inside /app, where
// the 프로필 tab already sits in the tab bar; 로그인 during /register, where the
// page itself is the sign-in step. 44px tall: a full tap target.
export function HeaderAction({ signedIn, href }: { signedIn: boolean; href: string }) {
  const pathname = usePathname();
  const hidden = signedIn
    ? pathname === "/app" || pathname.startsWith("/app/")
    : pathname === "/register" || pathname.startsWith("/register/");
  if (hidden) return null;

  return signedIn ? (
    <Link href={href} className="nb-btn nb-btn-white inline-flex min-h-11 items-center px-3.5 text-[13px]">
      내 프로필
    </Link>
  ) : (
    <Link
      href={href}
      className="nb-btn inline-flex min-h-11 items-center bg-[var(--nb-pink)] px-3.5 text-[13px]"
    >
      로그인
    </Link>
  );
}
