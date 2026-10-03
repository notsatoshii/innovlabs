// 코스 tab (docs/app/phases/phase-2.md: P1, P4, P8, P9). Server component.
//
// 학원 path          → 준비 중 placeholder (modules run through consulting).
// Enrolled           → cohort card, the 확정 트랙 card (phase-2c D2: only when
//                      staff confirmed a track for this cohort AND its Week 3
//                      is open), then the 12-week timeline with each week's
//                      open/locked state for that cohort.
// Not enrolled yet   → the learner's track, how the course runs, the cohort
//                      code box, then the same timeline with every week
//                      locked. No dates, no outcome promises.

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { buildTimeline, cohortTrackLabel, getMyCohort, isWeekOpenFor, learnerTrack } from "@/lib/courses/queries";
import { EVENT_TYPES } from "@/lib/profile/events";
import { supabaseServer } from "@/lib/supabase/server";
import { isConfirmTrack } from "@/components/staff/format";
import { formatDate } from "@/components/profile/display";
import type { TrackCode } from "@/lib/resources/types";
import { PlaceholderCard } from "@/components/app/PlaceholderCard";
import { CohortCard } from "@/components/courses/CohortCard";
import JoinCodeForm from "@/components/courses/JoinCodeForm";
import { Timeline } from "@/components/courses/Timeline";

export const metadata: Metadata = { title: "코스" };

export default async function CoursesPage() {
  const session = await getSession();
  // The /app layout already guarantees a profile; this keeps the types honest.
  if (!session?.profile) redirect("/start");
  const { profile } = session;

  if (profile.path === "hagwon") {
    return (
      <PlaceholderCard
        title="코스"
        body="학원 과정은 상담을 거쳐 모듈별로 진행합니다. 진행 자료는 준비되는 대로 이 자리에서 안내해 드리겠습니다."
      />
    );
  }

  const mine = await getMyCohort();

  if (mine) {
    // D2: the newest track_confirmed event for this cohort, read through the
    // learner's own client (learner-visible, own rows only). Shown only once
    // the cohort's Week 3 is open, so a track drafted the day before is not
    // seen before the room announcement. It changes nothing else here.
    let confirmed: { track: TrackCode; at: string } | null = null;
    if (isWeekOpenFor(mine, 3)) {
      const supabase = await supabaseServer();
      const { data, error } = await supabase
        .from("profile_event")
        .select("created_at, track:data->>track, cohort_id:data->>cohort_id")
        .eq("user_id", session.user.id)
        .eq("type", EVENT_TYPES.track_confirmed)
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) console.error("track confirmation read failed:", error.message);
      const row = data as { created_at: string; track: string | null; cohort_id: string | null } | null;
      if (row && row.cohort_id === mine.cohort.id && isConfirmTrack(row.track)) {
        confirmed = { track: row.track, at: row.created_at };
      }
    }

    return (
      <main className="flex w-full flex-col gap-5">
        <CohortCard cohort={mine.cohort} />
        {confirmed && (
          <section className="nb-card px-5 py-5">
            <p className="mb-1 text-xs font-extrabold text-[var(--nb-pink-deep)]">확정 트랙</p>
            <h2 className="text-lg font-extrabold leading-snug tracking-tight">
              {cohortTrackLabel(confirmed.track)}
            </h2>
            <p className="mt-1 text-sm text-gray-700">
              4주차부터 이 트랙으로 들어요 · {formatDate(confirmed.at) ?? ""} 확정
            </p>
          </section>
        )}
        <Timeline
          blocks={buildTimeline(mine.cohort)}
          note="수업일에 맞춰 한 주씩 열려요. 열린 주차는 언제든 다시 볼 수 있어요."
        />
      </main>
    );
  }

  const track = learnerTrack(profile.track);

  return (
    <main className="flex w-full flex-col gap-5">
      <section className="nb-card px-5 py-5">
        <p className="mb-1 text-xs font-extrabold text-[var(--nb-pink-deep)]">내 트랙</p>
        <h1 className="mb-2 text-2xl font-extrabold leading-snug tracking-tight">
          {track?.name ?? "트랙 선택 전"}
        </h1>
        <p className="text-[15px] leading-relaxed text-gray-800">
          {track?.oneLiner ?? "트랙이 정해지면 여기에서 바로 확인할 수 있어요."}
        </p>
      </section>

      <section>
        <h2 className="mb-1.5 text-base font-extrabold tracking-tight">수업은 이렇게 진행돼요</h2>
        <p className="text-[15px] leading-relaxed text-gray-800">
          12주 동안 매주 한 번, 2시간씩 수업해요. 예제가 아니라 내 실제 업무를 가져와 수업
          시간에 직접 만들어 보고, 다음 수업 전까지 실무에 써 봐요.
        </p>
      </section>

      <section className="nb-card px-5 py-5">
        <h2 className="mb-3 text-base font-extrabold tracking-tight">수강 코드 등록</h2>
        <JoinCodeForm />
      </section>

      <Timeline
        blocks={buildTimeline(null)}
        note="수강 코드를 등록하면 수업일에 맞춰 한 주씩 열려요."
      />
    </main>
  );
}
