// 리소스 tab (docs/app/phases/phase-1.md §6). Server component with three
// sub-views switched by ?tab=: 도구 (tools table, RLS hides drafts, level
// picks from content/resources/picks.json), 용어집 (glossary table), 도구
// 스택 (content/resources/stack.json, no DB). Only the 도구 view's level
// bar, search and filters run on the client
// (docs/app/phases/ui-tools-redesign.md).

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseServer } from "@/lib/supabase/server";
import type { StackData } from "@/lib/resources/types";
import { levelFromDepthFlag, type LevelPicks } from "@/lib/resources/picks";
import {
  fetchGlossary,
  fetchTools,
  learnerPath,
  learnerTrackCode,
} from "@/lib/resources/queries";
import { GlossaryList } from "@/components/resources/GlossaryList";
import { StackView } from "@/components/resources/StackView";
import { SubViewTabs, parseResourceTab } from "@/components/resources/SubViewTabs";
import { ToolLibrary } from "@/components/resources/ToolLibrary";
import picksJson from "../../../../content/resources/picks.json";
import stackJson from "../../../../content/resources/stack.json";

export const metadata: Metadata = { title: "리소스" };

// The JSON is static content bundled at build time; the contract type is the
// source of truth for its shape. scripts/seed-resources.ts validates the two
// table files and checks every pick id against tools.json; stack.json is
// checked here by the cast.
const STACK: StackData = stackJson as StackData;
const PICKS = picksJson as LevelPicks[];

// The 도구 view has no purpose paragraph: its picks heading and reason line
// do that job, and the space goes to the picks.
const PURPOSE: Record<Exclude<ReturnType<typeof parseResourceTab>, "tools">, string> = {
  glossary: "수업에서 자주 나오는 말을 비유 하나와 한 문장으로 풀어 두었어요.",
  stack: "이번 분기에 저희가 실제로 쓰고 권하는 도구 조합이에요. 분기마다 다시 점검해요.",
};

export default async function ResourcesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSession();
  // The /app layout already guarantees a profile; this keeps the types honest.
  if (!session?.profile) redirect("/start");

  const tab = parseResourceTab((await searchParams).tab);
  const path = learnerPath(session.profile.depth_flag);
  const track = learnerTrackCode(session.profile.track);

  let body: React.ReactNode;
  if (tab === "tools") {
    const supabase = await supabaseServer();
    body = (
      <ToolLibrary
        tools={await fetchTools(supabase)}
        picks={PICKS}
        myLevel={levelFromDepthFlag(session.profile.depth_flag)}
        learnerPath={path}
        track={track}
      />
    );
  } else if (tab === "glossary") {
    const supabase = await supabaseServer();
    body = <GlossaryList entries={await fetchGlossary(supabase)} />;
  } else {
    body = <StackView stack={STACK} learnerPath={path} />;
  }

  // The 도구 view is a tight fit: the site header and the tab bar leave 540px
  // of a 375×667 phone, and three picks have to land inside it. So its page
  // header is one line (eyebrow and title on a shared baseline) and its
  // sections sit 12px apart. The other two sub-views keep the stacked header.
  if (tab === "tools") {
    return (
      <main className="flex w-full flex-col gap-3">
        <header className="flex items-baseline gap-2">
          <p className="text-xs font-extrabold text-[var(--nb-pink-deep)]">리소스</p>
          <h1 className="text-xl font-extrabold leading-snug tracking-tight">도구 라이브러리</h1>
        </header>
        <SubViewTabs active={tab} />
        {body}
      </main>
    );
  }

  return (
    <main className="flex w-full flex-col gap-4">
      <header>
        <p className="mb-1 text-xs font-extrabold text-[var(--nb-pink-deep)]">리소스</p>
        <h1 className="text-2xl font-extrabold leading-snug tracking-tight">
          {tab === "glossary" ? "용어집" : "이번 분기 도구 스택"}
        </h1>
        <p className="mt-1 text-sm leading-relaxed text-gray-700">{PURPOSE[tab]}</p>
      </header>
      <SubViewTabs active={tab} />
      {body}
    </main>
  );
}
