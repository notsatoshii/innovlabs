// /app/course/skip: Level 1's skip test (건너뛰기 시험). Offered only while
// the level map says so (no mission of the level done, no result yet);
// otherwise back to the map with a note. Slots are resolved on the server.
// When the test was opened before and its clock is still inside the limit,
// the page says so and the test resumes that clock (review P1-3).

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getLevelMissions, skipTestOf } from "@/lib/course/content";
import { resolveMissionFor } from "@/lib/course/slots";
import { getLevelState, getMissionAccess, skipClockRunning } from "@/lib/course/state";
import type { LevelState } from "@/lib/course/types";
import SkipTest from "@/components/course/SkipTest";

export const metadata: Metadata = { title: "건너뛰기 시험" };

const COURSE = "spine0";
const LEVEL = 1;

export default async function SkipTestPage() {
  const session = await getSession();
  // The /app layout already guarantees a profile; this keeps the types honest.
  if (!session?.profile) redirect("/start");

  const all = await getLevelMissions(COURSE, LEVEL);
  const test = skipTestOf(all);
  let level: LevelState | null = null;
  try {
    level = await getLevelState(session.user.id, COURSE, LEVEL);
  } catch (e) {
    console.error("course level state failed:", (e as Error).message);
  }
  if (!test || !level?.skipTest.available) redirect("/app/course?note=skip");

  const { mission } = await resolveMissionFor(test, session.profile);
  const first = level.missions[0];

  // A start row without a result: the clock is running (or ran out, in which
  // case the next start gives a fresh clock).
  let running: number | null = null;
  try {
    running = skipClockRunning((await getMissionAccess(session.user.id, test)).progress);
  } catch (e) {
    console.error("skip test access read failed:", (e as Error).message);
  }

  return (
    <main className="w-full">
      <SkipTest
        test={mission}
        level={LEVEL}
        firstMission={first ? { id: first.id, title: first.title } : null}
        runningFor={running}
      />
    </main>
  );
}
