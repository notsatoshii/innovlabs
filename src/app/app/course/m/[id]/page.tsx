// /app/course/m/[id]: the mission player (phase-online O1). Server component:
// loads the mission, refuses a locked one (back to the map with a note),
// resolves the {{slots}} for this learner on the server, and hands the
// player the resolved content, the resume screen, the capped XP, and the
// lab drafts the own-work beats write.

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getMission } from "@/lib/course/content";
import { resolveMissionFor } from "@/lib/course/slots";
import { getLevelState } from "@/lib/course/state";
import type { LevelState } from "@/lib/course/types";
import MissionPlayer from "@/components/course/MissionPlayer";
import { loadOwnWork } from "../../load";

export const metadata: Metadata = { title: "미션" };

export default async function MissionPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  // The /app layout already guarantees a profile; this keeps the types honest.
  if (!session?.profile) redirect("/start");
  const { user, profile } = session;

  const { id } = await params;
  const missionId = decodeURIComponent(id);
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

  const [{ mission: resolved }, own] = await Promise.all([resolveMissionFor(mission, profile), loadOwnWork(profile)]);

  const next = level.missions[index + 1];
  const done = level.missions.filter((m) => m.status === "done").length;

  return (
    <main className="w-full">
      <MissionPlayer
        mission={resolved}
        startScreen={state.status === "done" ? 0 : state.screen}
        xp={state.xp}
        parts={state.parts}
        skipPassed={level.skipTest.result === "passed"}
        level={{ xp: level.xp, xpMax: level.xpMax, done, total: level.missions.length }}
        alreadyDone={state.status === "done"}
        nextMission={next ? { id: next.id, title: next.title } : null}
        workMapInitial={own.workMap}
        drillInitial={own.drill}
        categories={own.categories}
        seedCategory={own.seedCategory}
        drillTask={own.drillTask}
      />
    </main>
  );
}
