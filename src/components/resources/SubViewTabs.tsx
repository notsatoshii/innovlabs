// Three sub-view pills for the 리소스 tab, switched by ?tab=. Server
// component: plain links, so the page stays server-rendered.

import Link from "next/link";

export const RESOURCE_TABS = ["tools", "glossary", "stack"] as const;
export type ResourceTab = (typeof RESOURCE_TABS)[number];

export const RESOURCE_TAB_LABEL: Record<ResourceTab, string> = {
  tools: "도구",
  glossary: "용어집",
  stack: "도구 스택",
};

export function parseResourceTab(raw: string | string[] | undefined): ResourceTab {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return (RESOURCE_TABS as readonly string[]).includes(value ?? "")
    ? (value as ResourceTab)
    : "tools";
}

export function SubViewTabs({ active }: { active: ResourceTab }) {
  return (
    <nav aria-label="리소스 구분" className="grid grid-cols-3 gap-2">
      {RESOURCE_TABS.map((tab) => {
        const isActive = tab === active;
        return (
          <Link
            key={tab}
            href={tab === "tools" ? "/app/resources" : `/app/resources?tab=${tab}`}
            aria-current={isActive ? "page" : undefined}
            className={[
              "nb-btn flex min-h-10 items-center justify-center px-2 text-sm",
              isActive ? "nb-btn-primary" : "nb-btn-white",
            ].join(" ")}
          >
            {RESOURCE_TAB_LABEL[tab]}
          </Link>
        );
      })}
    </nav>
  );
}
