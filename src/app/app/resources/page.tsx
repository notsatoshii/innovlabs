// 리소스 tab (docs/app/phases/phase-1.md §6). Server component with three
// sub-views switched by ?tab=: 도구 (tools table, RLS hides drafts), 용어집
// (glossary table), 도구 스택 (content/resources/stack.json, no DB). Only
// the library's filter controls run on the client.

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseServer } from "@/lib/supabase/server";
import type { StackData } from "@/lib/resources/types";
import {
  fetchGlossary,
  fetchTools,
  learnerPath,
  learnerTrackCode,
  orderToolsForLearner,
} from "@/lib/resources/queries";
import { GlossaryList } from "@/components/resources/GlossaryList";
import { StackView } from "@/components/resources/StackView";
import { SubViewTabs, parseResourceTab } from "@/components/resources/SubViewTabs";
import { ToolLibrary } from "@/components/resources/ToolLibrary";
import stackJson from "../../../../content/resources/stack.json";

export const metadata: Metadata = { title: "리소스" };

// The JSON is static content bundled at build time; the contract type is the
// source of truth for its shape (scripts/seed-resources.ts validates the
// two table files, this one is checked here by the cast).
const STACK: StackData = stackJson as StackData;

const PURPOSE: Record<ReturnType<typeof parseResourceTab>, string> = {
  tools: "수업에서 다루는 도구를 난이도와 쓰임새별로 정리해 두었어요. 지금 내 경로에 맞는 것부터 보여 드려요.",
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
    const tools = orderToolsForLearner(await fetchTools(supabase), track, path);
    body = <ToolLibrary tools={tools} learnerPath={path} />;
  } else if (tab === "glossary") {
    const supabase = await supabaseServer();
    body = <GlossaryList entries={await fetchGlossary(supabase)} />;
  } else {
    body = <StackView stack={STACK} learnerPath={path} />;
  }

  return (
    <main className="flex w-full flex-col gap-4">
      <header>
        <p className="mb-1 text-xs font-extrabold text-[var(--nb-pink-deep)]">리소스</p>
        <h1 className="text-2xl font-extrabold leading-snug tracking-tight">
          {tab === "tools" ? "도구 라이브러리" : tab === "glossary" ? "용어집" : "이번 분기 도구 스택"}
        </h1>
        <p className="mt-1 text-sm leading-relaxed text-gray-700">{PURPOSE[tab]}</p>
      </header>
      <SubViewTabs active={tab} />
      {body}
    </main>
  );
}
