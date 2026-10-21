// /app/course/m/[id]: the mission player (phase-online O1). Server component:
// loads the mission, refuses a locked one (back to the map with a note),
// resolves the {{slots}} for this learner on the server (the live Work Map
// slots are filled by the player), and hands the player the resolved
// content, the resume screen, the capped XP, and the lab drafts the own-work
// beats write.

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getMyConfirmedTrack } from "@/lib/courses/queries";
import { getMission } from "@/lib/course/content";
import { resumeScreen } from "@/lib/course/score";
import { resolveMissionFor, trackNameOf } from "@/lib/course/slots";
import { getLevelState, readXpRows } from "@/lib/course/state";
import type { LevelState } from "@/lib/course/types";
import { supabaseServer } from "@/lib/supabase/server";
import MissionPlayer from "@/components/course/MissionPlayer";
import type { LevelEnd } from "@/components/course/RewardScreen";
import { localFromRow } from "@/lib/course/local";
import { loadCourseLocal, loadInterest, loadOwnWork } from "../../load";

export const metadata: Metadata = { title: "미션" };

export default async function MissionPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  // The /app layout already guarantees a profile; this keeps the types honest.
  if (!session?.profile) redirect("/start");
  const { user, profile } = session;

  const { id } = await params;
  let missionId: string;
  try {
    missionId = decodeURIComponent(id);
  } catch {
    // A malformed escape (%E0) is a missing mission, not a server error (review P2-7).
    redirect("/app/course?note=missing");
  }
  const mission = await getMission(missionId);
  if (!mission) redirect("/app/course?note=missing");
  if (mission.kind === "skip_test") redirect("/app/course/skip");

  let level: LevelState | null = null;
  try {
    level = await getLevelState(user.id, mission.course, mission.level);
  } catch (e) {
    console.error("course level state failed:", (e as Error).message);
  }
  const index = level?.missions.findIndex((m) => m.id === mission.id) ?? -1;
  const state = level && index >= 0 ? level.missions[index] : null;
  if (!level || !state) redirect("/app/course?note=missing");
  if (state.status === "locked") redirect("/app/course?note=locked");

  const [resolved, own, rows, confirmed, localRow, interested] = await Promise.all([
    resolveMissionFor(mission, profile, { keepLive: true }),
    loadOwnWork(profile),
    state.status === "done"
      ? Promise.resolve([])
      : supabaseServer()
          .then((db) => readXpRows(db, user.id, [mission.id]))
          .catch((e: unknown) => {
            console.error("course xp read failed:", (e as Error).message);
            return [];
          }),
    getMyConfirmedTrack(),
    loadCourseLocal(user.id, mission.id),
    mission.boss ? loadInterest(user.id, mission.course, mission.level + 1) : Promise.resolve(false),
  ]);

  const next = level.missions[index + 1];
  const done = level.missions.filter((m) => m.status === "done").length;
  // An unfinished mission reopens at the first screen whose step is not
  // recorded (a step lost to the network or a reload), else where it was left.
  const start = state.status === "done" ? 0 : resumeScreen(mission, state.screen, rows);

  const trackName = trackNameOf(profile.track, confirmed?.track ?? null);
  const levelEnd: LevelEnd | null = mission.boss
    ? {
        course: mission.course,
        level: mission.level,
        trackName,
        trackFrom: confirmed?.track ? "staff" : trackName ? "survey" : null,
        candidate1: own.drillTask,
        card: own.drill.card ?? null,
        interested,
      }
    : null;

  return (
    <main className="w-full">
      <MissionPlayer
        mission={resolved.mission}
        live={resolved.live}
        startScreen={start}
        xp={state.xp}
        parts={state.parts}
        skipPassed={level.skipTest.result === "passed"}
        level={{ xp: level.xp, xpMax: level.xpMax, done, total: level.missions.length }}
        alreadyDone={state.status === "done"}
        nextMission={next ? { id: next.id, title: next.title } : null}
        levelEnd={levelEnd}
        workMapInitial={own.workMap}
        drillInitial={own.drill}
        categories={own.categories}
        seedCategory={own.seedCategory}
        drillTask={own.drillTask}
        drillTask2={own.drillTask2}
        localInitial={localFromRow(localRow)}
      />
    </main>
  );
}
