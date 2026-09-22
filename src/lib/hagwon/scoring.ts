// 학원 AI 진단 scoring, schema v0.2 §Modules, §Scoring, §Hours stat.
// Pure and deterministic: the same answers always give the same result, so
// the result is stored with the immutable response and recomputed anywhere
// else it is shown. Unit times and factors are the schema's first guesses;
// recalibrate after the pilot before/after.

import {
  HAGWON_SCHEMA_VERSION,
  type HagwonAnswers,
  type HagwonHours,
  type HagwonResult,
  type HoursBucket,
  type ModuleId,
  type ModuleScore,
  type PainItem,
  type PrepItem,
} from "./types";

const MODULES: ModuleId[] = ["M1", "M2", "M3", "M4", "M5"];

/** Q4 item → module. attendance_billing maps to none (프로그램 기능으로 해결 권장). */
const PAIN_MODULE: Record<PainItem, ModuleId | null> = {
  counsel_records: "M1",
  notices: "M1",
  teacher_reports: "M1",
  report_cards: "M2",
  worksheets: "M4",
  marketing: "M3",
  dropout: "M5",
  attendance_billing: null,
};

const RANK_POINTS = [5, 3, 1] as const;

/** Q10 → module for the 강사 weight (+2 when 강사 ≥ 4–8). */
const TEACHER_SINK_MODULE: Record<HagwonAnswers["q10"], ModuleId | null> = {
  worksheets: "M4",
  report_cards: "M2",
  counsel: "M1",
  exam_analysis: "M4",
  unsure: null,
};

function rankPoints(answers: HagwonAnswers): Record<ModuleId, number> {
  const points: Record<ModuleId, number> = { M1: 0, M2: 0, M3: 0, M4: 0, M5: 0 };
  answers.q4.forEach((item, i) => {
    const m = PAIN_MODULE[item];
    if (!m) return;
    // Two items on the same module: keep the higher only.
    points[m] = Math.max(points[m], RANK_POINTS[i] ?? 0);
  });
  return points;
}

/**
 * Volume 0–3 = band index of the module's count question. Q6a's 분기별 (index
 * 4) is a frequency, not a count; it counts as the lowest non-zero band (1).
 * ASSUMED, flagged in the plan for Eric.
 */
function volumePoints(answers: HagwonAnswers): Record<ModuleId, number> {
  const q6 = answers.q6a === 4 ? 1 : Math.min(answers.q6a, 3);
  return {
    M1: answers.q5a,
    M2: q6,
    M3: answers.q8a,
    M4: answers.q7a,
    M5: answers.q5a,
  };
}

function frictionPoints(answers: HagwonAnswers, secondary: boolean): Record<ModuleId, number> {
  const m1 =
    answers.q5b === "none" || answers.q5b === "kakao" ? 2 : answers.q5b === "manual_excel" ? 1 : 0;
  const m2 = answers.q6b === "excel" ? 1 : 0; // program 0; paper / teacher_each are gated
  const m3 = answers.q8b === "director" ? 2 : answers.q8b === "staff" ? 1 : 0;
  let m4 = 0;
  if (secondary) {
    m4 = answers.q7b === "scan_2y" ? 2 : answers.q7b === "paper_2y" ? 1 : 0;
  } else if (answers.q7a >= 2) {
    m4 = 1; // non-내신: 주 3–5 이상
  }
  const m5 = answers.q9 === "none" ? 2 : answers.q9 === "teacher" ? 1 : 0;
  return { M1: m1, M2: m2, M3: m3, M4: m4, M5: m5 };
}

/** 중등 내신 or 고등 입시 → Q7b was asked. */
export function isSecondary(answers: Pick<HagwonAnswers, "q1">): boolean {
  return answers.q1.includes("middle") || answers.q1.includes("high");
}

function gated(answers: HagwonAnswers, id: ModuleId, m1Recommended: boolean): boolean {
  switch (id) {
    case "M2":
      return answers.q6b === "paper" || answers.q6b === "teacher_each";
    case "M4":
      return answers.q7a === 0;
    case "M5":
      return !(answers.q3 === "program" || m1Recommended);
    default:
      return false;
  }
}

// --- Hours stat (주 N–M시간), derived from counts, never asked directly ---

/** Monthly 상담 band midpoints: ~10 / 11–30 / 31–80 / 80+ */
const COUNSEL_MID = [5, 20, 55, 100];
/** Monthly students receiving reports: 없음 / ~50 / 51–150 / 150+ / 분기별 (≈50 per quarter) */
const REPORT_MID = [0, 25, 100, 200, 50 / 3];
/** Weekly self-made sets: 안 만듦 / 주 1–2 / 주 3–5 / 주 6+ */
const WORKSHEET_MID = [0, 1.5, 4, 7];
/** Weekly posts: 안 함 / 월 1–3 (≈2 ÷ 4.3) / 주 1 / 주 2+ */
const POSTING_MID = [0, 2 / 4.3, 1, 2.5];
const WEEKS_PER_MONTH = 4.3;

export function estimateHours(answers: HagwonAnswers): HagwonHours {
  const counsel = ((COUNSEL_MID[answers.q5a] / WEEKS_PER_MONTH) * 20 * 0.5) / 60;
  const reportCards = ((REPORT_MID[answers.q6a] / WEEKS_PER_MONTH) * 12 * 0.7) / 60;
  const worksheets = (WORKSHEET_MID[answers.q7a] * 90 * 0.4) / 60;
  const marketing = (POSTING_MID[answers.q8a] * 60 * 0.6) / 60;
  const teacherNotices =
    answers.q4.includes("teacher_reports") || answers.q4.includes("notices") ? 1.5 : 0;

  const buckets: { key: HoursBucket; hours: number }[] = [
    { key: "counsel", hours: counsel },
    { key: "report_cards", hours: reportCards },
    { key: "worksheets", hours: worksheets },
    { key: "marketing", hours: marketing },
    { key: "teacher_notices", hours: teacherNotices },
  ];
  const total = buckets.reduce((s, b) => s + b.hours, 0);
  const top = [...buckets]
    .filter((b) => b.hours > 0)
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 2)
    .map((b) => b.key);

  return {
    buckets,
    total,
    low: Math.floor(0.8 * total),
    high: Math.ceil(1.2 * total),
    top,
  };
}

// --- Result ---

export function scoreHagwon(answers: HagwonAnswers): HagwonResult {
  const secondary = isSecondary(answers);
  const rank = rankPoints(answers);
  const volume = volumePoints(answers);
  const friction = frictionPoints(answers, secondary);
  const weightedModule = answers.q2_teachers >= 2 ? TEACHER_SINK_MODULE[answers.q10] : null;

  const raw = MODULES.map<ModuleScore>((id) => {
    const teacherWeight = weightedModule === id ? 2 : 0;
    const total = Math.min(10, rank[id] + volume[id] + friction[id] + teacherWeight);
    return { id, rank: rank[id], volume: volume[id], friction: friction[id], teacherWeight, total, gated: false };
  });

  // Gates. M5's gate depends on whether M1 ends up recommended, so rank the
  // others first, then decide M5.
  const byId = Object.fromEntries(raw.map((m) => [m.id, m])) as Record<ModuleId, ModuleScore>;
  for (const id of ["M2", "M4"] as const) byId[id].gated = gated(answers, id, false);
  byId.M4.pastExamAnalysis = secondary && answers.q7b === "scan_2y";

  const pick = (candidates: ModuleScore[]): ModuleId[] => {
    // A module nobody ranked and that has no volume (total 0) is never shown.
    const open = candidates
      .filter((m) => !m.gated && m.total > 0)
      .sort((a, b) => b.total - a.total);
    const chosen = open.slice(0, 2);
    if (open[2] && open[1] && open[1].total - open[2].total <= 2) chosen.push(open[2]);
    return chosen.map((m) => m.id);
  };

  const withoutM5 = pick(raw.filter((m) => m.id !== "M5"));
  byId.M5.gated = gated(answers, "M5", withoutM5.includes("M1"));
  const recommended = pick(raw);
  const topScore = Math.max(...raw.filter((m) => !m.gated).map((m) => m.total), 0);

  const prep: PrepItem[] = [];
  if (byId.M2.gated && rank.M2 > 0) prep.push("grades_to_excel");
  if (
    secondary &&
    !byId.M4.gated &&
    rank.M4 > 0 &&
    (answers.q7b === "paper_1y" || answers.q7b === "paper_2y")
  ) {
    prep.push("scan_past_exams");
  }

  return {
    kind: "hagwon",
    schema_version: HAGWON_SCHEMA_VERSION,
    modules: raw,
    recommended,
    consultFirst: topScore < 4,
    hours: estimateHours(answers),
    prep,
    starterSession: answers.q11 === "never",
    reliabilityFlag: answers.q0 !== "director",
    successGoal: answers.q12?.trim() ? answers.q12.trim() : null,
  };
}
