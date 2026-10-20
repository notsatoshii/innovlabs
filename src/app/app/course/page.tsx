// /app/course: the online course's level map (phase-online O1). Server
// component. The /app layout guards sign-in and the survey gate; any learner
// with a profile sees World 0 Level 1 (O1-D1).

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getMyConfirmedTrack } from "@/lib/courses/queries";
import { trackNameOf } from "@/lib/course/slots";
import { getLevelState } from "@/lib/course/state";
import type { LevelState } from "@/lib/course/types";
import { LevelMap } from "@/components/course/LevelMap";
import type { LevelEnd } from "@/components/course/RewardScreen";
import { loadOwnWork } from "./load";

export const metadata: Metadata = { title: "온라인 과정" };

const NOTES: Record<string, string> = {
  locked: "그 미션은 아직 잠겨 있어요. 앞 미션을 먼저 끝내 주세요.",
  missing: "그 미션을 찾지 못했어요. 레벨 지도에서 다시 골라 주세요.",
  skip: "건너뛰기 시험은 지금 볼 수 없어요. 미션을 시작했거나 이미 본 경우예요.",
};

export default async function CoursePage({
  searchParams,
}: {
  searchParams: Promise<{ note?: string | string[] }>;
}) {
  const session = await getSession();
  // The /app layout already guarantees a profile; this keeps the types honest.
  if (!session?.profile) redirect("/start");

  let state: LevelState | null = null;
  try {
    state = await getLevelState(session.user.id, "spine0", 1);
  } catch (e) {
    console.error("course level state failed:", (e as Error).message);
  }

  const { note } = await searchParams;
  const noteText = typeof note === "string" ? (NOTES[note] ?? null) : null;

  if (!state) {
    return (
      <main className="flex w-full flex-col gap-4">
        <section className="nb-card px-5 py-5">
          <p className="mb-1 text-xs font-extrabold text-[var(--nb-pink-deep)]">온라인 과정</p>
          <h1 className="mb-2 text-2xl leading-snug">레벨 1을 준비하고 있어요</h1>
          <p className="text-[15px] leading-relaxed text-gray-700">
            미션을 불러오지 못했어요. 잠시 뒤 다시 열어 주세요.
          </p>
        </section>
        <Link href="/app/courses" className="nb-btn nb-btn-white block px-4 py-3 text-center text-[15px]">
          코스로 돌아가기
        </Link>
      </main>
    );
  }

  // After the boss: the track and what comes next (audience review #1).
  let levelEnd: LevelEnd | null = null;
  if (state.missions.some((m) => m.boss && m.status === "done")) {
    const [confirmed, own] = await Promise.all([getMyConfirmedTrack(), loadOwnWork(session.profile)]);
    const trackName = trackNameOf(session.profile.track, confirmed?.track ?? null);
    levelEnd = {
      level: state.level,
      trackName,
      trackFrom: confirmed?.track ? "staff" : trackName ? "survey" : null,
      candidate1: own.drillTask,
    };
  }

  return <LevelMap state={state} note={noteText} levelEnd={levelEnd} />;
}
