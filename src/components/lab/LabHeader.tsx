// Top of every Week 1 lab page: the way back to the week page, the lab's
// name, and a short line on what it is for. Server-safe.

import Link from "next/link";

export function LabHeader({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <header className="flex flex-col gap-2">
      <Link
        href="/app/courses/week/1"
        className="self-start py-1 text-sm font-bold underline underline-offset-4"
      >
        ← 1주차 수업으로
      </Link>
      <p className="text-xs font-extrabold text-[var(--nb-pink-deep)]">1주차 실습</p>
      <h1 className="text-2xl font-extrabold leading-snug tracking-tight">{title}</h1>
      <div className="flex flex-col gap-1.5 text-sm leading-relaxed text-gray-700">{children}</div>
    </header>
  );
}
