// /app/lab/work-map: the Week 1 Work Map (SP-W1-WM, lab Parts 1 to 3).
// Server component: loads the survey-seeded categories from the profile, the
// learner's autosaved draft (own row, through RLS), and the submitted
// snapshot if there is one, then hands them to the client editor.

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseServer } from "@/lib/supabase/server";
import { emptyDraft, seedCategories } from "@/lib/courses/work-map";
import { formatDate } from "@/components/profile/display";
import { LabHeader } from "@/components/lab/LabHeader";
import { draftFromSnapshot, parseWorkMapDraft, surveyHoursLabel } from "@/components/lab/rules";
import WorkMapEditor, { type WorkMapStep } from "@/components/lab/work-map/WorkMapEditor";
import type { EditorCategory } from "@/components/lab/work-map/types";

export const metadata: Metadata = { title: "워크맵" };

export default async function WorkMapPage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string | string[] }>;
}) {
  const session = await getSession();
  // The /app layout already guarantees a profile; this keeps the types honest.
  if (!session?.profile) redirect("/start");
  const { user, profile } = session;
  // The 12-week course is the employee path (phase-2 P8).
  if (profile.path !== "employee") redirect("/app/courses");

  const supabase = await supabaseServer();
  const { data: stored, error } = await supabase
    .from("artifact_draft")
    .select("data")
    .eq("user_id", user.id)
    .eq("kind", "work_map")
    .maybeSingle();
  if (error) console.error("work map draft read failed:", error.message);

  // Draft first; a submitted map with no draft row is still editable; else blank.
  const initialDraft =
    parseWorkMapDraft(stored?.data) ??
    (profile.work_map ? draftFromSnapshot(profile.work_map) : emptyDraft());

  const categories: EditorCategory[] = seedCategories(profile.core ?? {}).map((c) => {
    const answer = surveyHoursLabel(c.hours_survey);
    return {
      id: c.id,
      label: c.label,
      hint: c.hours_survey > 0 ? `주 ${answer}` : answer,
      extra: false,
    };
  });

  const { step } = await searchParams;
  const initialStep: WorkMapStep = step === "2" ? 2 : step === "3" ? 3 : 1;

  return (
    <main className="flex w-full flex-col gap-5">
      <LabHeader title="워크맵">
        <p>
          내 일주일을 업무 단위로 적고, 처리와 판단으로 나눈 다음, 자동화할 후보 세 개를 골라요.
        </p>
        <p className="font-bold text-[var(--nb-ink)]">회사 기밀은 적지 마세요, 업무 이름만 적으면 돼요.</p>
        {profile.work_map && (
          <p>
            {formatDate(profile.work_map.submitted_at) ?? "이전"}에 제출했어요. 고쳐서 다시 제출할 수
            있어요.
          </p>
        )}
      </LabHeader>
      <WorkMapEditor
        seedCategories={categories}
        initialDraft={initialDraft}
        initialStep={initialStep}
        submittedOn={profile.work_map ? (formatDate(profile.work_map.submitted_at) ?? "이전") : null}
      />
    </main>
  );
}
