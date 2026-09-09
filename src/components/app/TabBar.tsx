"use client";

// Fixed bottom tab bar for the /app shell. Five tabs; the three that are not
// built yet stay tappable (they open a placeholder page) but render greyed
// with a 준비 중 sticker. nb-disabled is deliberately NOT used here because it
// is non-interactive by contract.

import Link from "next/link";
import { usePathname } from "next/navigation";

interface Tab {
  href: string;
  label: string;
  icon: React.ReactNode;
  comingSoon?: boolean;
}

const ICON_PROPS = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

const TABS: Tab[] = [
  {
    href: "/app/profile",
    label: "프로필",
    icon: (
      <svg {...ICON_PROPS}>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
      </svg>
    ),
  },
  {
    href: "/app/courses",
    label: "코스",
    comingSoon: true,
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" />
        <path d="M4 20.5V5.5" />
        <path d="M8 7h8" />
      </svg>
    ),
  },
  {
    href: "/app/education",
    label: "나의 AI 교육",
    comingSoon: true,
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M12 3l2.2 5.3L20 10l-5.8 1.7L12 17l-2.2-5.3L4 10l5.8-1.7z" />
        <path d="M19 17l.8 1.9 1.9.8-1.9.8L19 22l-.8-1.9-1.9-.8 1.9-.8z" />
      </svg>
    ),
  },
  {
    href: "/app/resources",
    label: "리소스",
    comingSoon: true, // Phase 1b builds it
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      </svg>
    ),
  },
  {
    href: "/app/community",
    label: "커뮤니티",
    comingSoon: true,
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M4 5h16v10H9l-5 4z" />
      </svg>
    ),
  },
];

export function TabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="앱 메뉴"
      className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-[var(--nb-ink)] bg-[var(--nb-paper)] pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto grid w-full max-w-lg grid-cols-5">
        {TABS.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <li key={tab.href} className="relative">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={[
                  "flex h-16 flex-col items-center justify-center gap-1 px-1 text-[11px] leading-none",
                  active ? "font-extrabold" : "font-semibold",
                  tab.comingSoon ? "text-gray-400" : "text-[var(--nb-ink)]",
                ].join(" ")}
              >
                <span
                  className={[
                    "grid h-8 w-11 place-items-center rounded-lg",
                    active ? "bg-[var(--nb-yellow)] border-2 border-[var(--nb-ink)]" : "",
                    tab.comingSoon ? "opacity-50" : "",
                  ].join(" ")}
                >
                  {tab.icon}
                </span>
                <span className="whitespace-nowrap">{tab.label}</span>
              </Link>
              {tab.comingSoon && (
                <span
                  aria-hidden
                  className="nb-sticker pointer-events-none absolute right-1 top-1 px-1 py-0.5 text-[9px] leading-none"
                >
                  준비 중
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
