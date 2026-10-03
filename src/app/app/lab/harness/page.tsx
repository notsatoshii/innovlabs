// /app/lab/harness: the harness library (SP-W2-HC, Week 2 lab Parts 1 to 3).
// Server component: loads the learner's autosaved draft (every harness in
// progress, own row through RLS) and the latest saved version of each harness
// (own harness_saved events), then hands them to the client library, which
// shows the list or, at `?h=<id>`, the editor for one harness.
//
// `?h=<id>&from=<event id>` arrives from the correction log: the corrected
// sentence of that correction (read here from the learner's own events, never
// from the URL) is offered in the editor as the text of a new rule.
//
// The harness templates (D1, "템플릿으로 시작") are read here through the same
// client: RLS gives them to learners with an active enrollment and to staff,
// and an empty list hides the template sheet.

import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseServer } from "@/lib/supabase/server";
import type { HarnessDraft } from "@/lib/courses/types";
import { EVENT_TYPES } from "@/lib/profile/events";
import { formatDate } from "@/components/profile/display";
import { parseCorrectionInput, parseHarnessDraft, ruleDraftFromCorrection } from "@/components/lab/rules";
import HarnessLibrary from "@/components/lab/harness/HarnessLibrary";
import { Week2LabHeader } from "@/components/lab/harness/Week2LabHeader";
import { loadSavedHarnesses } from "@/components/lab/harness/queries";
import { HarnessTemplatesProvider } from "@/components/lab/harness-templates/context";
import { loadHarnessTemplates } from "@/components/lab/harness-templates/queries";
import type { RulePrefill, SavedView } from "@/components/lab/harness/types";

export const metadata: Metadata = { title: "하네스 라이브러리" };

export default async function HarnessPage({
  searchParams,
}: {
  searchParams: Promise<{ h?: string | string[]; from?: string | string[] }>;
}) {
  const session = await getSession();
  // The /app layout already guarantees a profile; this keeps the types honest.
  if (!session?.profile) redirect("/start");
  const { user, profile } = session;
  // The 12-week course is the employee path (phase-2 P8).
  if (profile.path !== "employee") redirect("/app/courses");

  const { h, from } = await searchParams;
  const fromId = typeof from === "string" && /^\d{1,15}$/.test(from) ? Number(from) : null;

  const supabase = await supabaseServer();
  const [draftResult, savedList, fromResult, templates] = await Promise.all([
    supabase
      .from("artifact_draft")
      .select("data, updated_at")
      .eq("user_id", user.id)
      .eq("kind", "harness")
      .maybeSingle(),
    loadSavedHarnesses(supabase, user.id),
    fromId === null
      ? null
      : supabase
          .from("profile_event")
          .select("id, data")
          .eq("id", fromId)
          .eq("user_id", user.id)
          .eq("type", EVENT_TYPES.correction_logged)
          .maybeSingle(),
    loadHarnessTemplates(supabase),
  ]);
  if (draftResult.error) console.error("harness draft read failed:", draftResult.error.message);
  if (fromResult?.error) console.error("correction read failed:", fromResult.error.message);

  // The draft holds what is being edited. A saved harness with no draft entry
  // (the draft row is gone, or it was saved from another device before the
  // draft caught up) comes back from its latest saved version. So does one
  // whose latest save is newer than the whole draft row: the autosave that
  // should have followed that save never landed (the tab was closed first),
  // and the draft's copy is the text from before it. Showing that copy would
  // offer the old text as an unsaved edit, and saving it would undo the save.
  const draft: HarnessDraft = parseHarnessDraft(draftResult.data?.data) ?? { version: 1, items: [] };
  // NaN when there is no row or no readable time; every comparison is then false and the draft stands.
  const draftAt = Date.parse(String(draftResult.data?.updated_at ?? ""));
  const draftIndex = new Map(draft.items.map((item, index) => [item.id, index]));
  const saved: Record<string, SavedView> = {};
  for (const harness of savedList) {
    saved[harness.item.id] = {
      version: harness.version,
      savedOn: formatDate(harness.saved_at) ?? "이전",
      item: harness.item,
    };
    const at = draftIndex.get(harness.item.id);
    if (at === undefined) draft.items.push(harness.item);
    else if (draftAt < Date.parse(harness.saved_at)) draft.items[at] = harness.item;
  }

  let prefill: RulePrefill | null = null;
  const correction = fromResult?.data ? parseCorrectionInput(fromResult.data.data) : null;
  if (fromId !== null && correction && correction.harness_id === h) {
    prefill = { eventId: fromId, rule: ruleDraftFromCorrection(correction.changed_to), correction };
  }

  return (
    <main className="flex w-full flex-col gap-5">
      <Week2LabHeader title="하네스 라이브러리">
        <p>
          새로 온 직원에게 일을 맡기기 전에 알려 줄 것을 한 장에 적어 두는 곳이에요. 역할, 맥락, 형식,
          규칙, 예시, 예외 처리 여섯 부분을 채우고, 복사해서 어시스턴트에 붙여 넣어요.
        </p>
        <p className="font-bold text-[var(--nb-ink)]">
          저장한 하네스와 적고 있는 내용은 본인과 강사·운영진만 볼 수 있어요. 팀장님 취향을 적은 규칙도
          마찬가지예요.
        </p>
      </Week2LabHeader>
      {/* The library reads the query string (useSearchParams), which wants a Suspense boundary. */}
      <Suspense fallback={null}>
        <HarnessTemplatesProvider templates={templates}>
          <HarnessLibrary initialDraft={draft} saved={saved} prefill={prefill} />
        </HarnessTemplatesProvider>
      </Suspense>
    </main>
  );
}
