// /app/lab/workspace: the Week 3 Part 1 workspace check (SP-W3-CP; phase-2c
// C6) and the learner's saved harnesses as text for loading into it.
// Server component: reads the newest workspace_setup event (own row, through
// RLS) to start the form from the last answers, and the latest saved version
// of each harness (same reads as the harness library). The path defaults
// from the survey's depth flag; the learner can change it on the form.

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseServer } from "@/lib/supabase/server";
import { EVENT_TYPES } from "@/lib/profile/events";
import { formatDate } from "@/components/profile/display";
import { loadSavedHarnesses } from "@/components/lab/harness/queries";
import { defaultWorkspacePath, emptyWorkspace, parseWorkspaceInput } from "@/components/lab/rules-week3";
import HarnessExport, { type ExportHarness } from "@/components/lab/workspace/HarnessExport";
import WorkspaceForm from "@/components/lab/workspace/WorkspaceForm";
import { Week3LabHeader } from "@/components/lab/Week3LabHeader";

export const metadata: Metadata = { title: "워크스페이스 점검" };

export default async function WorkspacePage() {
  const session = await getSession();
  // The /app layout already guarantees a profile; this keeps the types honest.
  if (!session?.profile) redirect("/start");
  const { user, profile } = session;
  // The 12-week course is the employee path (phase-2 P8).
  if (profile.path !== "employee") redirect("/app/courses");

  const supabase = await supabaseServer();
  const [latestResult, saved] = await Promise.all([
    supabase
      .from("profile_event")
      .select("created_at, data")
      .eq("user_id", user.id)
      .eq("type", EVENT_TYPES.workspace_setup)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle(),
    loadSavedHarnesses(supabase, user.id),
  ]);
  if (latestResult.error) console.error("workspace check read failed:", latestResult.error.message);

  const latest = latestResult.data as { created_at: string; data: unknown } | null;
  const initial =
    (latest ? parseWorkspaceInput(latest.data) : null) ?? emptyWorkspace(defaultWorkspacePath(profile.depth_flag));
  const submittedOn = latest ? (formatDate(latest.created_at) ?? "이전") : null;

  const harnesses: ExportHarness[] = saved.map((h) => ({
    item: h.item,
    version: h.version,
    savedOn: formatDate(h.saved_at) ?? "이전",
  }));

  return (
    <main className="flex w-full flex-col gap-5">
      <Week3LabHeader title="워크스페이스 점검">
        <p>
          하네스와 참고 문서를 워크스페이스에 넣고 한 줄로 시험해 본 다음, 어떻게 됐는지 여기에 남겨요.
          강사가 이 기록을 보고 막힌 곳을 같이 봐 드려요.
        </p>
        <p className="font-bold text-[var(--nb-ink)]">회사 규정이 허용하는 자료만 워크스페이스에 올리세요.</p>
        {submittedOn && <p>{submittedOn}에 점검을 남겼어요. 다시 하면 새 기록으로 남아요.</p>}
      </Week3LabHeader>
      <HarnessExport harnesses={harnesses} />
      <WorkspaceForm initial={initial} submittedOn={submittedOn} />
    </main>
  );
}
