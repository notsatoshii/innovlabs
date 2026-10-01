// Curriculum facts for the one-pager. Server only (reads fact sheets from disk).
//
// CLAUDE.md rule 4: the model may not invent curriculum facts. So the week
// list (numbers and titles) is assembled HERE, in code, from
// content/courses/structure.json. The model only writes one sentence for each
// week in PERSONALIZED_WEEKS, and that sentence is validated in ./guard.ts.

import fs from "node:fs";
import path from "node:path";
import type { CourseStructure } from "@/lib/courses/types";
import type { TrackId } from "@/lib/survey/types";
import structureJson from "../../../content/courses/structure.json";

export const COURSE_STRUCTURE = structureJson as CourseStructure;

export type StructureWeek = CourseStructure["weeks"][number];

/** Every week number that exists in the course (1–12 today). */
export const VALID_WEEKS: ReadonlySet<number> = new Set(
  COURSE_STRUCTURE.weeks.map((w) => w.week),
);

export const TOTAL_WEEKS = COURSE_STRUCTURE.weeks.length;

/**
 * Weeks that get one model-written sentence. These are the weeks whose content
 * the program doc fixes for every track (docs/curriculum/
 * innovlabs-curriculum-program.md §2): the spine (1–3), the start of the
 * two-week deep dive (4), verification week (9), the system map and capstone
 * plan (10), and the capstone (11–12). Week 5 continues week 4, and weeks 6–8
 * have no published detail yet, so those rows carry static text instead: a
 * "personalized" sentence there could only be invented.
 */
export const PERSONALIZED_WEEKS = [1, 2, 3, 4, 9, 10, 11, 12] as const;
export type PersonalizedWeek = (typeof PERSONALIZED_WEEKS)[number];

for (const week of PERSONALIZED_WEEKS) {
  if (!VALID_WEEKS.has(week)) {
    throw new Error(`one-pager: personalized week ${week} is not in structure.json`);
  }
}

/** Shown on track-practice weeks whose detail is not published yet. */
const UNPUBLISHED_WEEK_NOTE =
  "트랙 실습을 이어 가는 주예요. 주차별 세부 내용은 과정 시작 전에 안내해요.";

/** Weeks 6–8 in today's structure: cartridge weeks the program doc does not fix. */
const UNPUBLISHED_WEEKS: ReadonlySet<number> = new Set([6, 7, 8]);

/**
 * The static sentence for a week: used for every non-personalized week, and as
 * the fallback when a model-written sentence fails validation.
 */
export function staticWeekSentence(week: StructureWeek): string {
  return UNPUBLISHED_WEEKS.has(week.week) ? UNPUBLISHED_WEEK_NOTE : week.summary;
}

/** The track fact sheet, with the maintainer comment stripped. */
export function loadFactSheet(track: TrackId): string {
  const file = path.join(process.cwd(), "content", "tracks", `${track}.md`);
  return fs
    .readFileSync(file, "utf-8")
    .replace(/<!--[\s\S]*?-->/g, "")
    .trim();
}

const KIND_LABEL: Record<StructureWeek["kind"], string> = {
  spine: "공통",
  cartridge: "트랙",
  capstone: "캡스톤",
};

/** Deterministic text rendering of structure.json for the cached system prefix. */
export function renderStructure(): string {
  const blocks = COURSE_STRUCTURE.blocks.map(
    (b) => `- ${b.title} (${b.weeks[0]}~${b.weeks[1]}주 차): ${b.summary}`,
  );
  const weeks = COURSE_STRUCTURE.weeks.map(
    (w) => `- ${w.week}주 차 [${KIND_LABEL[w.kind]}] ${w.title}: ${w.summary}`,
  );
  return [
    `전체 ${TOTAL_WEEKS}주 과정이에요.`,
    "",
    "블록:",
    ...blocks,
    "",
    "주차:",
    ...weeks,
  ].join("\n");
}
