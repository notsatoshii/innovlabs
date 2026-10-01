// /app/lab/drill: the Week 1 basics drill sheet (SP-W1-BAS, lab Part 4).
// Server component: loads the autosaved draft, the candidate names from the
// submitted Work Map (to prefill which task the drill ran on), and whether a
// drill was already submitted. All reads go through the learner's own client.

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseServer } from "@/lib/supabase/server";
import { EVENT_TYPES } from "@/lib/profile/events";
import { formatDate } from "@/components/profile/display";
import DrillForm from "@/components/lab/DrillForm";
import { LabHeader } from "@/components/lab/LabHeader";
import { emptyDrill, parseDrillDraft } from "@/components/lab/rules";

export const metadata: Metadata = { title: "기본기 바로잡기" };

export default async function DrillPage() {
  const session = await getSession();
  // The /app layout already guarantees a profile; this keeps the types honest.
  if (!session?.profile) redirect("/start");
  const { user, profile } = session;
  // The 12-week course is the employee path (phase-2 P8).
  if (profile.path !== "employee") redirect("/app/courses");

  const supabase = await supabaseServer();
  const [draftResult, lastResult] = await Promise.all([
    supabase
      .from("artifact_draft")
      .select("data")
      .eq("user_id", user.id)
      .eq("kind", "drill")
      .maybeSingle(),
    supabase
      .from("profile_event")
      .select("created_at")
      .eq("user_id", user.id)
      .eq("type", EVENT_TYPES.drill_completed)
      .order("created_at", { ascending: false })
      .limit(1),
  ]);
  if (draftResult.error) console.error("drill draft read failed:", draftResult.error.message);
  if (lastResult.error) console.error("drill event read failed:", lastResult.error.message);

  const workMap = profile.work_map;
  const candidates = workMap
    ? [...workMap.candidates]
        .sort((a, b) => a.rank - b.rank)
        .map((c) => workMap.rows[c.task_row]?.task ?? "")
        .filter((name) => name.length > 0)
    : [];

  const initialDraft = parseDrillDraft(draftResult.data?.data) ?? emptyDrill(candidates[0] ?? "");
  const lastAt = (lastResult.data?.[0] as { created_at: string } | undefined)?.created_at;

  return (
    <main className="flex w-full flex-col gap-5">
      <LabHeader title="기본기 바로잡기">
        <p>
          같은 업무를 어시스턴트에게 두 번 맡겨 보고, 평소처럼 부탁했을 때와 제대로 부탁했을 때
          무엇이 달라지는지 적어요.
        </p>
      </LabHeader>
      <DrillForm
        initialDraft={initialDraft}
        candidates={candidates}
        completedOn={lastAt ? (formatDate(lastAt) ?? "이전") : null}
      />
    </main>
  );
}
