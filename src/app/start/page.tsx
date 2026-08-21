"use client";

// Section 0 — Entry fork: one screen, one question, three doors.
// Fork click volume is demand data (spec): logged as fork_selected events.

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { appendEvent } from "@/lib/survey/storage";
import type { Path } from "@/lib/survey/types";

const DOORS: {
  path: Path;
  href: string;
  label: string;
  sub: string;
  comingSoon?: boolean;
}[] = [
  {
    path: "employee",
    href: "/survey",
    label: "회사에서 일하고 있어요",
    sub: "직장인 · 공무원 · 공공기관",
  },
  {
    path: "solo",
    href: "/solo",
    label: "내 사업을 하고 있어요",
    sub: "자영업 · 1인 사업자 · 프리랜서 · 창업자",
    comingSoon: true,
  },
  {
    path: "student",
    href: "/student",
    label: "학생이거나 취업 준비 중이에요",
    sub: "대학생 · 취업 준비생 · 이직 준비생",
    comingSoon: true,
  },
];

function ForkScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const go = (door: (typeof DOORS)[number]) => {
    appendEvent({ type: "fork_selected", data: { path: door.path } });
    // Carry the B2B org code + Q5 pilot override through to the survey.
    const qs = new URLSearchParams();
    const org = searchParams.get("org");
    const q5 = searchParams.get("q5");
    if (org && door.path === "employee") qs.set("org", org);
    if (q5 && door.path === "employee") qs.set("q5", q5);
    router.push(qs.size > 0 ? `${door.href}?${qs.toString()}` : door.href);
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center px-6 py-16">
      <h1 className="mb-2 text-3xl font-extrabold leading-snug tracking-tight">
        어떤 상황에서 AI를
        <br />
        활용하고 싶으신가요?
      </h1>
      <p className="mb-8 text-sm text-gray-500">가장 가까운 상황을 골라 주세요.</p>
      <div className="flex flex-col gap-3">
        {DOORS.map((door) => (
          <button
            key={door.path}
            type="button"
            onClick={() => go(door)}
            className="nb-btn nb-btn-white w-full px-5 py-4 text-left"
          >
            <p className="flex items-center gap-2 text-[15px] font-bold">
              {door.label}
              {door.comingSoon && (
                <span className="nb-badge bg-[var(--nb-yellow)] px-2 py-0.5 text-[11px]">
                  오픈 준비 중
                </span>
              )}
            </p>
            <p className="mt-0.5 text-xs font-normal text-gray-600">{door.sub}</p>
          </button>
        ))}
      </div>
    </main>
  );
}

export default function StartPage() {
  return (
    <Suspense>
      <ForkScreen />
    </Suspense>
  );
}
