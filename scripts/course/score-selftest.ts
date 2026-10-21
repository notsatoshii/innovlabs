// Self checks for the pure course engine: validateMission, scoreAnswer,
// stepAward, cappedTotals, skipCredits, gradeSkipTest, what `done` waits for
// (requiredForDone, missingForDone, resumeScreen), the browser filter
// (forBrowser), the live Work Map slots (fill.ts), and the pure slot
// functions. No database, no network.
//
//   npx tsx scripts/course/score-selftest.ts
//
// Exits non-zero on the first failed group's end with a count.

import { validateMission, validateLevel } from "../../src/lib/course/validate";
import {
  cappedTotals,
  evidenceOf,
  gradeSkipTest,
  isSpotHit,
  locateInteraction,
  missingForDone,
  neutralLine,
  requiredForDone,
  resumeScreen,
  round2CardProblem,
  scoreAnswer,
  skipCredits,
  stepAward,
  type Award,
  type PriorRow,
} from "../../src/lib/course/score";
import { docLabel, forBrowser, liveSlots, resolveSlots, workMapSlots } from "../../src/lib/course/fill";
import { candidateScoresLine, drillSheetText, gutPickLine, rewardSlots, round2CardLines, round2CardText, workMapText } from "../../src/lib/course/export";
import { COURSE_WORK_MAP_RULES, candidateTarget, checkWorkMap } from "../../src/lib/courses/work-map";
import { parseDrillDraft } from "../../src/components/lab/rules";
import type { WorkMapDraft } from "../../src/lib/courses/types";
import type { I3Spot, I7Choose, MissionContent } from "../../src/lib/course/types";

let pass = 0;
let fail = 0;
function check(name: string, cond: boolean, detail?: unknown): void {
  if (cond) pass++;
  else fail++;
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${cond ? "" : "  -> " + JSON.stringify(detail)}`);
}

// --- Fixture --------------------------------------------------------------------

const cards = Array.from({ length: 10 }, (_, n) => ({
  key: `c${n + 1}`,
  text: `카드 ${n + 1}`,
  answer: (n % 2 === 0 ? "p" : "j") as "p" | "j",
  why: "이유예요.",
}));

const fixture: MissionContent = {
  version: 1,
  id: "M1.9",
  course: "spine0",
  level: 1,
  ord: 1,
  title: "시험 미션",
  minutes: 8,
  caps: { 예측: 10, 해보기: 40, "내 업무에": 50, 알기: 10, 확인: 10 },
  badges: [{ id: "first_map", label: "첫 워크맵" }],
  coach: "잘했어요.",
  screens: [
    {
      id: "s1",
      beat: "상황",
      blocks: [
        { t: "p", text: "{{q8}}에 몇 시간 쓰세요?" },
        {
          t: "i",
          i: {
            id: "s1.predict",
            type: "I6",
            options: [
              { v: "a", label: "1시간" },
              { v: "b", label: "3시간" },
            ],
            answer: "b",
            xp: { part: "예측", right: 10 },
            reveal: "3시간이에요.",
          },
        },
      ],
    },
    {
      id: "s2",
      beat: "해보기",
      skippable: true,
      blocks: [{ t: "i", i: { id: "s2.sort", type: "I1", bins: ["p", "j"], cards, xp: { part: "해보기", per: 5, retry: 2 } } }],
    },
    {
      id: "s3",
      beat: "알기",
      skippable: true,
      blocks: [
        {
          t: "i",
          i: {
            id: "s3.spot",
            type: "I3",
            doc: "매출은 3억이에요. 전환율 12% 상승했어요. 비용은 그대로예요.",
            target: "전환율 12% 상승",
            xp: { part: "알기", right: 10, afterHint: 5 },
            hintAfter: 2,
            rightLine: "맞아요.",
          },
        },
      ],
    },
    {
      id: "s4",
      beat: "확인",
      blocks: [
        {
          t: "i",
          i: {
            id: "s4.score",
            type: "I4",
            rows: [{ key: "r1", title: "주간보고", fact: "매주 해요.", answers: [3, 2, 3, 1, 2], lines: ["a", "b", "c", "d", "e"] }],
            xp: { part: "확인", per: 2, retry: 1 },
            end: "끝이에요.",
          },
        },
      ],
    },
    {
      id: "s5",
      beat: "내 업무에",
      blocks: [{ t: "i", i: { id: "s5.seed", type: "I9", target: "seed_rows", xp: { part: "내 업무에", right: 50 } } }],
    },
    { id: "s6", beat: "보상", blocks: [{ t: "p", text: "끝!" }] },
  ],
};

// --- validateMission -----------------------------------------------------------------

{
  const r = validateMission(JSON.parse(JSON.stringify(fixture)));
  check("fixture validates", r.ok, r.ok ? null : r.errors);

  const bad = JSON.parse(JSON.stringify(fixture));
  bad.screens[1].blocks[0].i.cards[0].answer = "mix";
  bad.screens[2].blocks[0].i.target = "없는 문장";
  bad.screens[0].blocks[0].text = "반드시 ChatGPT로 {{nope}}";
  bad.screens[1].id = "s1";
  bad.caps = { 예측: 10 };
  bad.screens[4].skippable = true;
  bad.skipable = true;
  bad.xp = 999;
  const e = validateMission(bad);
  const errs = e.ok ? [] : e.errors.join("\n");
  check("bad: mix not a bin", !e.ok && /not one of the bins/.test(String(errs)), errs);
  check("bad: I3 target missing", /is not in the doc/.test(String(errs)), errs);
  check("bad: banned word", /uses "반드시"/.test(String(errs)), errs);
  check("bad: product name", /names the product "ChatGPT"/.test(String(errs)), errs);
  check("bad: unknown slot", /unknown slot \{\{nope\}\}/.test(String(errs)), errs);
  check("bad: duplicate screen id", /duplicate screen id "s1"/.test(String(errs)), errs);
  check("bad: part without cap", /part "해보기" has no cap/.test(String(errs)), errs);
  check("bad: own work skippable", /only 알기 and 해보기 screens can be skipped/.test(String(errs)), errs);
  check("bad: unknown key", /unknown key "skipable"/.test(String(errs)), errs);
  check("bad: declared total", /declares 999/.test(String(errs)), errs);

  const i2 = JSON.parse(JSON.stringify(fixture));
  i2.screens[0].blocks[1].i = {
    id: "s1.pick",
    type: "I2",
    docs: [
      { v: "A", label: "가", text: "숫자 12%가 있어요." },
      { v: "B", label: "나", text: "출처가 있어요." },
    ],
    answer: "B",
    xp: { part: "예측", right: 10 },
    wrongLine: "다시 봐요.",
    chips: [{ name: "지어낸 숫자", find: "출처" }],
  };
  const r2 = validateMission(i2);
  check("bad: I2 chip not in wrong doc", !r2.ok && /is not in the wrong document/.test(r2.errors.join()), r2);

  const i4 = JSON.parse(JSON.stringify(fixture));
  i4.screens[3].blocks[0].i.rows[0].answers = [3, 2, 3];
  const r4 = validateMission(i4);
  check("bad: I4 answers length 5", !r4.ok && /needs at least 5/.test(r4.errors.join()), r4);

  const level = validateLevel([fixture, { ...fixture, id: "B1", ord: 1, boss: true }]);
  check("validateLevel: duplicate ord", level.some((x) => /duplicate ord 1/.test(x)), level);
}

// --- scoreAnswer ---------------------------------------------------------------------

function run(prior: PriorRow[], interactionId: string, answer: unknown, itemKey?: string): Award | string {
  const loc = locateInteraction(fixture, interactionId)!;
  const r = scoreAnswer({ mission: fixture, interaction: loc.interaction, beat: loc.screen.beat, itemKey, answer, prior });
  if (!r.ok) return r.error;
  if (r.award.insert) prior.push({ id: prior.length + 1, item: r.award.item, part: r.award.part, amount: r.award.amount, correct: r.award.correct });
  return r.award;
}
const amt = (a: Award | string) => (typeof a === "string" ? a : a.amount);

{
  const rows: PriorRow[] = [];
  const got = cards.slice(0, 8).map((c) => run(rows, "s2.sort", c.answer, c.key));
  check(
    "I1 combo: 5,5,5 then x2 from the 4th, x3 from the 8th",
    JSON.stringify(got.map(amt)) === JSON.stringify([5, 5, 5, 10, 10, 10, 10, 15]),
    got.map(amt),
  );
  check("I1 combo field", typeof got[7] !== "string" && got[7].combo === 3, got[7]);
  const wrong = run(rows, "s2.sort", "p", "c10"); // c10 answer is j
  check("I1 wrong first try pays 0 and marks retry", typeof wrong !== "string" && wrong.amount === 0 && wrong.retry === true, wrong);
  const retry = run(rows, "s2.sort", "j", "c10#2");
  check("I1 retry right pays retry", amt(retry) === 2, retry);
  const again = run(rows, "s2.sort", "j", "c10#2");
  check("I1 retry replay pays 0, no insert", typeof again !== "string" && again.amount === 0 && again.replay === true && !again.insert, again);
  check("I1 third attempt is a bad item", run(rows, "s2.sort", "j", "c10#3") === "bad_item");
  check("I1 retry of a right card refused", run(rows, "s2.sort", "p", "c1#2") === "retry_not_allowed");
  check("I1 retry before first try refused", run(rows, "s2.sort", "p", "c9#2") === "retry_not_allowed");
  const after = run(rows, "s2.sort", "p", "c9");
  check("I1 streak resets after a miss (combo 1)", amt(after) === 5, after);
  const replay = run(rows, "s2.sort", "p", "c1");
  check("I1 replay pays 0", amt(replay) === 0, replay);
  check("I1 answer outside the bins", run(rows, "s2.sort", "mix", "c2") === "bad_answer");
  check("I1 unknown card", run(rows, "s2.sort", "p", "zz") === "bad_item");
  const totals = cappedTotals(fixture, rows);
  check("caps: 해보기 capped at 40", totals.parts["해보기"].got === 40 && totals.total === 40, totals);
}

{
  const rows: PriorRow[] = [];
  const t1 = run(rows, "s3.spot", "매출은 3억이에요.");
  const t2 = run(rows, "s3.spot", "비용은 그대로예요.");
  check("I3 wrong taps recorded as #tapN with 0", typeof t1 !== "string" && t1.item === "s3.spot#tap1" && typeof t2 !== "string" && t2.item === "s3.spot#tap2", [t1, t2]);
  const hit = run(rows, "s3.spot", "전환율 12% 상승했어요.");
  check("I3 found after the hint pays afterHint", amt(hit) === 5, hit);
  check("I3 found again pays 0", amt(run(rows, "s3.spot", "전환율 12% 상승했어요.")) === 0);
  const fresh: PriorRow[] = [];
  check("I3 found first pays right", amt(run(fresh, "s3.spot", "12%")) === 10);
  check("isSpotHit: unrelated text", !isSpotHit("매출은 3억이에요.", "전환율 12% 상승"));
}

{
  const rows: PriorRow[] = [];
  check("I6 right pays right", amt(run(rows, "s1.predict", "b")) === 10);
  check("I6 replay pays 0", amt(run(rows, "s1.predict", "a")) === 0);
  const other: PriorRow[] = [];
  const w = run(other, "s1.predict", "a");
  check("I6 wrong pays wrong (0)", typeof w !== "string" && w.amount === 0 && w.correct === false, w);
  check("I6 itemKey refused", run([], "s1.predict", "b", "x") === "bad_item");
  check("I6 non-option refused", run([], "s1.predict", "z") === "bad_answer");
}

{
  const rows: PriorRow[] = [];
  check("I4 right criterion pays per", amt(run(rows, "s4.score", 3, "r1.1")) === 2);
  const w = run(rows, "s4.score", 1, "r1.2");
  check("I4 wrong criterion marks retry", typeof w !== "string" && w.retry === true, w);
  check("I4 retry right pays retry", amt(run(rows, "s4.score", 2, "r1.2#2")) === 1);
  check("I4 criterion 6 refused", run(rows, "s4.score", 1, "r1.6") === "bad_item");
  check("I4 score 4 refused", run(rows, "s4.score", 4, "r1.3") === "bad_answer");
  check("I4 string score accepted", amt(run(rows, "s4.score", "3", "r1.3")) === 2);
}

{
  const loc = locateInteraction(fixture, "s5.seed")!;
  const a = stepAward(loc.interaction, loc.screen.beat, []);
  check("step pays xp.right once", a !== null && a.amount === 50 && a.insert, a);
  const b = stepAward(loc.interaction, loc.screen.beat, [{ id: 1, item: "s5.seed", part: "내 업무에", amount: 50, correct: null }]);
  check("step replay pays 0", b !== null && b.amount === 0 && !b.insert, b);
  const notStep = locateInteraction(fixture, "s1.predict")!;
  check("stepAward refuses an answer item", stepAward(notStep.interaction, "상황", []) === null);
  const ans = scoreAnswer({ mission: fixture, interaction: loc.interaction, beat: "내 업무에", answer: "x", prior: [] });
  check("scoreAnswer refuses a step", !ans.ok && ans.error === "not_answer_item", ans);
}

// --- Skip credits and grading ---------------------------------------------------------

{
  const rows: PriorRow[] = [{ id: 1, item: "s2.sort.c1", part: "해보기", amount: 5, correct: true }];
  const credits = skipCredits(fixture, rows);
  check("skip credits leave out answered items", !credits.some((c) => c.item === "skip:s2.sort.c1") && credits.some((c) => c.item === "skip:s2.sort.c2"), credits);
  check("skip credits cover I3 on a skippable screen", credits.some((c) => c.item === "skip:s3.spot" && c.amount === 10), credits);
  check("skip credits skip unskippable screens", !credits.some((c) => c.item.includes("s4.score") || c.item.includes("s5.seed")), credits);
  check("skip credits pay plain first-try rate", credits.filter((c) => c.item.startsWith("skip:s2.sort")).every((c) => c.amount === 5), credits);
  const credited: PriorRow[] = credits.map((c, n) => ({ id: n + 10, item: c.item, part: c.part, amount: c.amount, correct: true }));
  const later = run(credited, "s2.sort", "j", "c2");
  check("a credited item pays 0 when played", typeof later !== "string" && later.amount === 0 && !later.insert, later);
  check("credited spot pays 0 when played", amt(run(credited, "s3.spot", "전환율 12% 상승")) === 0);
}

{
  const test: MissionContent = {
    ...fixture,
    id: "S1",
    kind: "skip_test",
    caps: { 시험: 0 },
    badges: undefined,
    screens: [
      { id: "t1", beat: "해보기", blocks: [{ t: "i", i: { id: "t1.sort", type: "I1", bins: ["p", "j"], cards: cards.slice(0, 6), xp: { part: "시험", per: 0, retry: 0 } } }] },
      {
        id: "t2",
        beat: "해보기",
        blocks: [
          {
            t: "i",
            i: {
              id: "t2.pick",
              type: "I2",
              docs: [
                { v: "A", label: "가", text: "전환율 12% 상승" },
                { v: "B", label: "나", text: "출처가 있어요." },
              ],
              answer: "B",
              xp: { part: "시험", right: 0 },
              wrongLine: "다시 봐요.",
              chips: [{ name: "숫자", find: "12%" }],
            },
          },
        ],
      },
      {
        id: "t3",
        beat: "해보기",
        blocks: [
          {
            t: "i",
            i: {
              id: "t3.spot",
              type: "I3",
              doc: "매출은 3억이에요. 전환율 12% 상승했어요.",
              target: "전환율 12% 상승",
              xp: { part: "시험", right: 0, afterHint: 0 },
              hintAfter: 2,
              rightLine: "맞아요.",
            },
          },
        ],
      },
    ],
  };
  const v = validateMission(JSON.parse(JSON.stringify(test)));
  check("skip test fixture validates", v.ok, v.ok ? null : v.errors);
  const right = cards.slice(0, 6).map((c) => c.answer as string);
  const g = (over: Partial<{ cards: string[]; pick: string; spotTaps: string[]; seconds: number }>) => {
    const r = gradeSkipTest(test, { cards: right, pick: "B", spotTaps: ["전환율 12% 상승했어요."], seconds: 120, ...over });
    return r.ok ? r.grade.passed : r.error;
  };
  check("skip: all right passes", g({}) === true);
  check("skip: one card wrong fails", g({ cards: ["j", ...right.slice(1)] }) === false);
  check("skip: wrong pick fails", g({ pick: "A" }) === false);
  check("skip: found on the 2nd tap passes", g({ spotTaps: ["매출은 3억이에요.", "전환율 12% 상승했어요."] }) === true);
  check("skip: found on the 3rd tap fails", g({ spotTaps: ["매출은 3억이에요.", "x", "전환율 12% 상승했어요."] }) === false);
  // L1 review 2026-10-21: the clock is a display only (no timer on judgement).
  check("skip: over 180 s still passes", g({ seconds: 600 }) === true);
  {
    const r = gradeSkipTest(test, { cards: right, pick: "B", spotTaps: [], seconds: 600 });
    check("skip: inTime is still reported", r.ok && r.grade.inTime === false, r);
  }
  check("skip: card count mismatch is a bad answer", g({ cards: right.slice(1) }) === "bad_answer");
}

// --- Review fixes (2026-10-20): validation of the new fields ---------------------------

{
  const withRows = JSON.parse(JSON.stringify(fixture));
  withRows.screens[4].blocks.unshift({ t: "p", text: "짧아요", when: "q8_short" }, { t: "quote", text: "\"{{q8}}\"", when: "q8_ok" });
  withRows.screens[4].blocks.push({
    t: "i",
    i: { id: "s5.row", type: "I7", from: "work_map_rows", fromLine: "그 줄이 지금 {kind} 돼 있어요. 맞나요?", options: [] },
  });
  withRows.screens[0].media = { kind: "motion", seconds: 8 };
  withRows.screens[0].blocks[0].text = "{{candidate2}}로 해요.";
  const r = validateMission(withRows);
  check("valid: when blocks, I7 from work_map_rows, media without brief, {{candidate2}}", r.ok, r.ok ? null : r.errors);

  const bad = JSON.parse(JSON.stringify(withRows));
  bad.screens[4].blocks[0].when = "always";
  bad.screens[4].blocks[3].i.options = [{ v: "a", label: "가" }, { v: "b", label: "나" }];
  bad.screens[4].blocks[3].i.xp = { part: "확인", right: 10 };
  bad.screens[5].blocks.push({ t: "i", i: { id: "s6.c", type: "I7", fromLine: "줄", options: [{ v: "a", label: "가" }, { v: "b", label: "나" }] } });
  bad.screens[0].media = { kind: "screenshot", src: "/x.png" };
  const e2 = validateMission(bad);
  const errs = e2.ok ? "" : e2.errors.join("\n");
  check("bad: unknown when", /when: must be one of/.test(errs), errs);
  check("bad: work_map_rows with options", /must be empty with from "work_map_rows"/.test(errs), errs);
  check("work_map_rows with xp and a fromLine is allowed (L1 review 2026-10-21)", !/takes no answer/.test(errs) && !/pays only with a fromLine/.test(errs), errs);
  check("bad: fromLine without from", /only from "work_map_rows" has a fromLine/.test(errs), errs);
  check("bad: asset without Korean alt", /needs a Korean alt/.test(errs), errs);
}

// --- Review fixes: what `done` waits for, and where a mission reopens ------------------

{
  const required = requiredForDone(fixture).map((x) => x.interaction.id);
  check("requiredForDone: every paying item and the I9", JSON.stringify(required) === JSON.stringify(["s1.predict", "s2.sort", "s3.spot", "s4.score", "s5.seed"]), required);
  check("missingForDone: nothing recorded -> all", missingForDone(fixture, []).length === 5);
  const some = [{ item: "s1.predict" }, { item: "s2.sort.c3" }, { item: "s3.spot#tap1" }, { item: "s4.score.r1.2#2" }];
  check("missingForDone: a card, a wrong tap and a retry count as records", JSON.stringify(missingForDone(fixture, some)) === '["s5.seed"]', missingForDone(fixture, some));
  const credited = [{ item: "s1.predict" }, { item: "skip:s2.sort.c1" }, { item: "skip:s3.spot" }, { item: "s4.score.r1.1" }, { item: "s5.seed" }];
  check("missingForDone: skip credits count", missingForDone(fixture, credited).length === 0, missingForDone(fixture, credited));
  check("resumeScreen: furthest when all recorded", resumeScreen(fixture, 5, credited) === 5);
  check("resumeScreen: back to the first screen with a missing record", resumeScreen(fixture, 5, [{ item: "s1.predict" }, { item: "s2.sort.c1" }]) === 2);
  check("resumeScreen: the furthest screen's own items do not pull back", resumeScreen(fixture, 1, [{ item: "s1.predict" }]) === 1);
  check("resumeScreen: clamps past the end", resumeScreen(fixture, 99, credited) === fixture.screens.length - 1);

  const noXp = JSON.parse(JSON.stringify(fixture)) as MissionContent;
  noXp.screens[5].blocks.push(
    { t: "i", i: { id: "s6.q", type: "I8", label: "평소 방식", method: "before", xp: { part: "확인", right: 5 } } },
    { t: "i", i: { id: "s6.c", type: "I7", options: [{ v: "a", label: "가" }, { v: "b", label: "나" }] } },
    { t: "i", i: { id: "s6.r", type: "I7", from: "work_map_rows", options: [] } },
  );
  const req2 = requiredForDone(noXp).map((x) => x.interaction.id);
  check("requiredForDone: leaves out I8, a branch-only I7 and a row picker", !req2.includes("s6.q") && !req2.includes("s6.c") && !req2.includes("s6.r"), req2);

  const lab: MissionContent = JSON.parse(JSON.stringify(fixture));
  lab.screens[5].blocks.push({ t: "i", i: { id: "s6.r1", type: "I11", round: 1, steps: ["붙여 넣으세요."], minChars: 10, xp: { part: "확인", right: 50 } } });
  const it = locateInteraction(lab, "s6.r1")!.interaction;
  const paid = stepAward(it, "확인", []);
  const example = stepAward(it, "확인", [], { example: true });
  check("I11 step pays", paid?.amount === 50 && paid.insert, paid);
  check("I11 with the review example is recorded at 0", example?.amount === 0 && example.insert === true && example.item === "s6.r1", example);
  const seed = stepAward(locateInteraction(lab, "s5.seed")!.interaction, "내 업무에", [], { example: true });
  check("example flag does nothing outside I11", seed?.amount === 50, seed);
}

// --- Review fixes: the browser copy of a mission ----------------------------------------

{
  const m: MissionContent = JSON.parse(JSON.stringify(fixture));
  m.screens[0].media = { kind: "motion", seconds: 8, brief: "a calendar flips to Monday" };
  m.screens[4].blocks.unshift(
    { t: "p", text: "짧아요", when: "q8_short" },
    { t: "quote", text: "{{q8}}", when: "q8_ok" },
  );
  m.screens[5].blocks.push(
    { t: "doc", label: "재료 보기 (SP-1-R0)", text: "예시", packId: "SP-1-R0" },
    { t: "i", i: { id: "s6.order", type: "I10", items: [{ key: "a", label: "잘된 예시 하나", packId: "SP-1-R0" }] } },
  );
  const ok = forBrowser(m, { q8Short: false });
  const short = forBrowser(m, { q8Short: true });
  check("forBrowser: the media brief never reaches the browser", !("brief" in (ok.screens[0].media ?? {})) && ok.screens[0].media?.kind === "motion", ok.screens[0].media);
  check("forBrowser: q8_ok keeps the quote, drops the short line", ok.screens[4].blocks.some((b) => b.t === "quote") && !ok.screens[4].blocks.some((b) => b.t === "p" && b.text === "짧아요"));
  check("forBrowser: q8_short drops the quote", short.screens[4].blocks.some((b) => b.t === "p" && b.text === "짧아요") && !short.screens[4].blocks.some((b) => b.t === "quote"));
  const doc = ok.screens[5].blocks.find((b) => b.t === "doc");
  check("forBrowser: pack id out of the doc label, named by the checklist", doc?.t === "doc" && doc.label === "재료 보기 · 잘된 예시 하나", doc);
  check("forBrowser: the input is untouched", m.screens[0].media?.brief === "a calendar flips to Monday");
  check("docLabel: an id alone becomes its name", docLabel("(SP-X)", "SP-X", new Map([["SP-X", "양식"]])) === "양식");
  check("docLabel: without a name the id is just removed", docLabel("재료 보기 (SP-X)", "SP-X", new Map()) === "재료 보기");
}

// --- Review fixes: live Work Map slots and the course's candidate rule -----------------

{
  const draft: WorkMapDraft = {
    version: 1,
    extraCategories: [],
    rows: [
      { id: "r1", category: "a", task: "주간보고 쓰기", hours: 3, kind: "P" },
      { id: "r2", category: "b", task: "보고 방향 정하기", hours: 1.5, kind: "T" },
      { id: "r3", category: "b", task: "  ", hours: 0, kind: null },
      { id: "r4", category: "c", task: "월간 집계 하기", hours: 2, kind: "P" },
    ],
    candidates: [
      { rowId: "r1", scores: { recurs: 2, digital_inputs: 3, stable_rules: 3, ownership: 3, low_cost_wrong: 3 } },
      { rowId: "r4", scores: { recurs: 2, digital_inputs: 3, stable_rules: 3, ownership: 3, low_cost_wrong: 3 } },
    ],
  };
  const w = workMapSlots(draft, null);
  check("workMapSlots: empty rows are not counted (review P2-10)", w.row_count === "3", w);
  check("workMapSlots: hours and candidates from the draft", w.p_hours === "5" && w.j_hours === "1.5" && w.candidate1 === "주간보고 쓰기" && w.candidate2 === "월간 집계 하기", w);
  const fallback = { p_hours: "1", j_hours: "1", row_count: "2", p_count: "1", candidate1: "씨앗", candidate2: "씨앗" };
  check("liveSlots: the draft wins over the page-load values", liveSlots(draft, fallback).p_hours === "5");
  check("liveSlots: no rows -> the server's values", liveSlots({ ...draft, rows: [], candidates: [] }, fallback).p_hours === "1");
  const filled = resolveSlots({ a: "처리 {{p_hours}}시간, {{q8}}" }, { p_hours: "5" });
  check("resolveSlots: fills what it is given, leaves the rest", filled.a === "처리 5시간, {{q8}}", filled);

  const asLab = checkWorkMap(draft);
  const asCourse = checkWorkMap(draft, { firstRecurs: "month" });
  check("work map rule: the lab keeps candidate 1 weekly", asLab.errors.some((x) => x.includes("매주 하는 업무여야")), asLab.errors);
  check("work map rule: the course takes a monthly candidate 1 with a warning", !asCourse.errors.some((x) => x.includes("후보 1번은")) && asCourse.warnings.some((x) => x.includes("매주 하는 업무가 아니에요")), asCourse);
  const rare = { ...draft, candidates: [{ ...draft.candidates[0], scores: { ...draft.candidates[0].scores, recurs: 1 as const } }, draft.candidates[1]] };
  check("work map rule: the course still refuses a rarer one", checkWorkMap(rare, { firstRecurs: "month" }).errors.some((x) => x.includes("한 달에 한 번은")));
}

// --- L1 review 2026-10-21: neutral taps, row checks, evidence, the card, conditions ---

{
  const doc = "1) 성과\n- 클릭률이 3.9%로 올랐습니다.\n- 전환율이 12% 상승했습니다.\n| 클릭률 | 3.9% | 3.6% | +8% |";
  const spot: I3Spot = {
    id: "s4.spot",
    type: "I3",
    doc,
    target: "전환율이 12% 상승했습니다.",
    xp: { part: "해보기", right: 20, afterHint: 10 },
    hintAfter: 2,
    rightLine: "맞아요.",
    wrongLine: "이 내용은 재료에 있어요.",
    neutral: [{ find: "+8%", line: "+8%는 계산한 값이에요." }],
  };
  check("neutralLine: the +8% cell is neutral", neutralLine(spot, "| 클릭률 | 3.9% | 3.6% | +8% |") === "+8%는 계산한 값이에요.");
  check("neutralLine: another unit is not", neutralLine(spot, "- 클릭률이 3.9%로 올랐습니다.") === null);
  check("neutralLine: the target is never neutral", neutralLine({ ...spot, neutral: [{ find: "12%", line: "x" }] }, "전환율이 12% 상승했습니다.") === null);
  const m: MissionContent = {
    ...fixture,
    caps: { 해보기: 40 },
    screens: [{ id: "s1", beat: "해보기", blocks: [{ t: "i", i: spot }] }],
  };
  const n = scoreAnswer({ mission: m, interaction: spot, beat: "해보기", answer: "| 클릭률 | 3.9% | 3.6% | +8% |", prior: [] });
  check("I3 neutral tap: answered, not stored, pays 0", n.ok && !n.award.insert && n.award.amount === 0 && n.award.correct === null, n);
  const twoWrong: PriorRow[] = [
    { id: 1, item: "s4.spot#tap1", part: "해보기", amount: 0, correct: false },
    { id: 2, item: "s4.spot#tap2", part: "해보기", amount: 0, correct: false },
  ];
  const after = scoreAnswer({ mission: m, interaction: spot, beat: "해보기", answer: "전환율이 12% 상승했습니다.", prior: twoWrong });
  check("I3: found after two wrong taps pays afterHint", after.ok && after.award.amount === 10, after);
  const v = validateMission(JSON.parse(JSON.stringify(m)));
  check("valid: I3 with wrongLine and neutral", v.ok, v.ok ? null : v.errors);
  const badN = JSON.parse(JSON.stringify(m));
  badN.screens[0].blocks[0].i.neutral = [{ find: "없는 값", line: "x" }, { find: "12%", line: "y" }];
  const eN = validateMission(badN);
  const errN = eN.ok ? "" : eN.errors.join("\n");
  check("bad: neutral find not in the doc", /"없는 값" is not in the doc/.test(errN), errN);
  check("bad: neutral find overlaps the target", /overlaps the target/.test(errN), errN);

  // Skip test: a neutral tap is not one of the two taps.
  const test: MissionContent = {
    ...fixture,
    id: "S9",
    kind: "skip_test",
    caps: { 시험: 0 },
    badges: undefined,
    screens: [
      {
        id: "t1",
        beat: "해보기",
        blocks: [
          { t: "i", i: { id: "t1.sort", type: "I1", bins: ["p", "j"], cards: cards.slice(0, 2), xp: { part: "시험", per: 0, retry: 0 } } },
          {
            t: "i",
            i: {
              id: "t1.pick",
              type: "I2",
              docs: [
                { v: "A", label: "A", text: "가" },
                { v: "B", label: "B", text: "나" },
              ],
              answer: "B",
              xp: { part: "시험", right: 0 },
              wrongLine: "A예요.",
              chips: [{ name: "구조", find: "가" }],
            },
          },
          { t: "i", i: { ...spot, id: "t1.spot", xp: { part: "시험", right: 0, afterHint: 0 } } },
        ],
      },
    ],
  };
  const right = cards.slice(0, 2).map((c) => c.answer as string);
  const g = gradeSkipTest(test, { cards: right, pick: "B", spotTaps: ["- 클릭률이 3.9%로 올랐습니다.", "| 클릭률 | 3.9% | 3.6% | +8% |", "전환율이 12% 상승했습니다."], seconds: 50 });
  check("skip: a neutral tap does not use up a tap", g.ok && g.grade.passed, g);

  // I7 over the learner's rows: pays on the 맞아요 / 바꾸기 tap, not on the pick.
  const rowCheck: I7Choose = {
    id: "s6.row",
    type: "I7",
    from: "work_map_rows",
    fromLine: "그 줄이 지금 {kind} 돼 있어요. 맞나요?",
    options: [],
    xp: { part: "확인", right: 10 },
  };
  const rm: MissionContent = { ...fixture, caps: { 확인: 10 }, screens: [{ id: "s1", beat: "확인", blocks: [{ t: "i", i: rowCheck }] }] };
  const ok1 = scoreAnswer({ mission: rm, interaction: rowCheck, beat: "확인", answer: "flip", prior: [] });
  check("I7 row check: flip pays 10", ok1.ok && ok1.award.amount === 10 && ok1.award.correct === null, ok1);
  const bad1 = scoreAnswer({ mission: rm, interaction: rowCheck, beat: "확인", answer: "r1", prior: [] });
  check("I7 row check: a row id is not an answer", !bad1.ok && bad1.error === "bad_answer", bad1);
  check("I7 row check: done waits for it", requiredForDone(rm).some((x) => x.interaction.id === "s6.row"));
  check("valid: work_map_rows with xp and a fromLine", validateMission(JSON.parse(JSON.stringify(rm))).ok);
  const noLine = JSON.parse(JSON.stringify(rm));
  delete noLine.screens[0].blocks[0].i.fromLine;
  const eL = validateMission(noLine);
  check("bad: work_map_rows with xp needs a fromLine", !eL.ok && eL.errors.some((x) => x.includes("pays only with a fromLine")), eL);

  // Evidence and the 2라운드 카드.
  const weekly: I7Choose = { id: "s5.when", type: "I7", options: [{ v: "a", label: "가" }, { v: "b", label: "나" }], xp: { part: "확인", right: 10 }, evidence: "work_map_submitted" };
  check("evidenceOf: an I7 with evidence names it", evidenceOf(weekly) === "work_map_submitted");
  check("evidenceOf: others have none", evidenceOf(rowCheck) === null && evidenceOf(spot) === null);
  check("round2CardProblem: no card", round2CardProblem("round2_card_start", null) === "round2_card_missing");
  check("round2CardProblem: M1.2 card with empty places is fine", round2CardProblem("round2_card_start", { instruction: "" }) === null);
  check("round2CardProblem: B1 needs the instruction line", round2CardProblem("round2_card", { instruction: "  " }) === "round2_card_no_instruction");
  check("round2CardProblem: B1 with a line is fine", round2CardProblem("round2_card", { instruction: "예시와 똑같이 써 주세요." }) === null);
  const parsed = parseDrillDraft({ version: 1, task: "t", differences: [], invention: "", leftForHuman: "", card: { instruction: "지시", exampleAt: "폴더", templateAt: "", path: "odd" } });
  check("parseDrillDraft keeps the card, unknown path -> \"\"", parsed?.card?.instruction === "지시" && parsed.card.path === "", parsed);
  check("parseDrillDraft without a card has none", parseDrillDraft({ version: 1 })?.card === undefined);

  // Conditional blocks and options (B1's data check).
  const dc: MissionContent = {
    ...fixture,
    caps: { 확인: 10 },
    saved: ["저장됨: 조각 {{seed_count}}개 · {{p_hours}}시간"],
    export: "work_map",
    screens: [
      {
        id: "s1",
        beat: "상황",
        blocks: [
          { t: "i", i: { id: "s1.ready", type: "I7", options: [{ v: "ready", label: "열어 뒀어요" }, { v: "later", label: "아직 없어요", hold: true, feedback: "준비되면 이어서 해요." }] } },
          { t: "i", if: { choice: "s1.ready", in: ["ready"] }, i: { id: "s1.account", type: "I7", options: [{ v: "company", label: "회사" }, { v: "personal", label: "개인" }] } },
          { t: "warn", if: { choice: "s1.account", in: ["personal"] }, text: "개인 계정에는 회사 자료를 넣지 마세요." },
          { t: "i", if: { choice: "s1.account", in: ["company"] }, i: { id: "s1.okc", type: "I10", items: [{ key: "ok", label: "확인했어요" }] } },
        ],
      },
      {
        id: "s2",
        beat: "상황",
        blocks: [
          {
            t: "i",
            i: {
              id: "s2.material",
              type: "I7",
              options: [
                { v: "own", label: "내 재료로", if: { choice: "s1.account", in: ["company"] } },
                { v: "memo", label: "내 메모로", if: { choice: "s1.account", in: ["personal"] } },
                { v: "pack", label: "해담리빙 재료로" },
              ],
            },
          },
        ],
      },
    ],
  };
  const dv = validateMission(JSON.parse(JSON.stringify(dc)));
  check("valid: conditional blocks, held option, conditional options, saved with reward slots", dv.ok, dv.ok ? null : dv.errors);
  const dBad = JSON.parse(JSON.stringify(dc));
  dBad.screens[0].blocks[2].if = { choice: "s9.none", in: ["x"] };
  dBad.screens[0].blocks[3].if = { choice: "s1.account", in: ["nobody"] };
  dBad.screens[0].blocks.push({ t: "i", if: { choice: "s1.ready", in: ["ready"] }, i: { id: "s1.paid", type: "I10", items: [{ key: "a", label: "가" }], xp: { part: "확인", right: 10 } } });
  dBad.screens[0].blocks.push({ t: "p", text: "{{seed_count}}개" });
  dBad.screens[1].blocks[0].i.options[2].hold = true;
  dBad.screens[1].blocks[0].i.xp = { part: "확인", right: 10 };
  const de = validateMission(dBad);
  const derr = de.ok ? "" : de.errors.join("\n");
  check("bad: if names no I7", /"s9.none" is not an I7/.test(derr), derr);
  check("bad: if value is not an option", /"nobody" is not an option of s1.account/.test(derr), derr);
  check("bad: a scored step inside a conditional block", /inside a conditional block may not be scored/.test(derr), derr);
  check("bad: a reward slot outside saved", /\{\{seed_count\}\} is for mission.saved only/.test(derr), derr);
  check("bad: hold on a paying I7", /only an I7 without answer and xp may hold/.test(derr), derr);
}

// --- L1 review 2026-10-21: B1 비교 on the learner's own pasted rounds (own-output I2) -------

{
  const compare = {
    id: "s4.compare",
    type: "I2" as const,
    own: true,
    docs: [
      { v: "round1", label: "1라운드", text: "" },
      { v: "round2", label: "2라운드", text: "" },
    ],
    answer: "round2",
    xp: { part: "비교", right: 80, wrong: 80 },
    wrongLine: "순서를 보세요.",
    chips: [{ name: "구조", find: "구조" }],
  };
  const m: MissionContent = { ...fixture, caps: { 비교: 80 }, screens: [{ id: "s4", beat: "내 업무에", blocks: [{ t: "i", i: compare }] }] };
  const v = validateMission(JSON.parse(JSON.stringify(m)));
  check("valid: own-output I2 with empty docs and free chips", v.ok, v.ok ? null : v.errors);
  const r1 = scoreAnswer({ mission: m, interaction: compare, beat: "내 업무에", answer: "round1", prior: [] });
  check("own I2: picking 1라운드 costs nothing (80)", r1.ok && r1.award.amount === 80 && r1.award.correct === false, r1);
  const withText = JSON.parse(JSON.stringify(m));
  withText.screens[0].blocks[0].i.docs[0].text = "붙여 넣은 글";
  withText.screens[0].skippable = true;
  withText.screens[0].beat = "해보기";
  const e = validateMission(withText);
  const err = e.ok ? "" : e.errors.join("\n");
  check("bad: own I2 carrying text", /carries no document text/.test(err), err);
  check("bad: own I2 on a skippable screen", /own work and may not sit on a skippable screen/.test(err), err);
  const plain = JSON.parse(JSON.stringify(m));
  delete plain.screens[0].blocks[0].i.own;
  const ep = validateMission(plain);
  check("bad: a plain I2 still needs document text", !ep.ok && ep.errors.some((x) => x.includes("must not be empty")), ep);
}

// --- L1 review 2026-10-21: the course's Work Map rules and the exports --------------------

{
  const scores = (recurs: 1 | 2 | 3) => ({ recurs, digital_inputs: 3 as const, stable_rules: 3 as const, ownership: 3 as const, low_cost_wrong: 3 as const });
  const two: WorkMapDraft = {
    version: 1,
    extraCategories: [],
    rows: [
      { id: "r1", category: "a", task: "주간보고 쓰기", hours: 3, kind: "P" },
      { id: "r2", category: "b", task: "회의록 정리하기", hours: 0.5, kind: "P" },
      { id: "r3", category: "b", task: "보고 방향 정하기", hours: 4, kind: "T" },
    ],
    candidates: [
      { rowId: "r1", scores: scores(1) },
      { rowId: "r2", scores: scores(3) },
    ],
  };
  check("candidateTarget: the lab wants three", candidateTarget(two) === 3);
  check("candidateTarget: the course wants one per P row, up to three", candidateTarget(two, COURSE_WORK_MAP_RULES) === 2);
  const c = checkWorkMap(two, COURSE_WORK_MAP_RULES);
  check("course map: two P rows save with two candidates", c.errors.length === 0, c);
  check("course map: a rare candidate 1 is '비정기', a warning", c.warnings.some((x) => x.includes("비정기")), c.warnings);
  check("course map: no hour-sum or row-count note (M1.3 has them)", !c.warnings.some((x) => x.includes("25~50") || x.includes("10줄")), c.warnings);
  const lab = checkWorkMap(two);
  check("lab map: still three candidates, an hour each, weekly", lab.errors.some((x) => x.includes("세 개")) && lab.errors.some((x) => x.includes("1시간 이상")) && lab.errors.some((x) => x.includes("매주")), lab.errors);
  const one = checkWorkMap({ ...two, candidates: [two.candidates[0]] }, COURSE_WORK_MAP_RULES);
  check("course map: one candidate of two P rows is refused", one.errors.some((x) => x.includes("2개를 골라")), one.errors);

  const text = workMapText(two, (id) => (id === "a" ? "보고·문서" : "회의"));
  check("workMapText: tab rows and the totals", text.includes("보고·문서\t주간보고 쓰기\t3\t처리") && text.includes("처리 3.5시간 · 판단 4시간"), text);
  const card = { instruction: "예시와 똑같이 써 주세요.", exampleAt: "", templateAt: "공유 폴더", path: "pack" as const };
  const ct = round2CardText(card);
  check("round2CardText: pack path reads '다음 주 내 재료로', the order is fixed", ct.includes("잘된 예시가 있는 곳: 다음 주 내 재료로") && ct.includes("양식이 있는 곳: 공유 폴더") && ct.includes("1 잘된 예시 → 2 양식"), ct);
  check("round2CardLines: an empty place on the own path is '–'", round2CardLines({ ...card, path: "own" })[2].value === "–");
  check("candidateScoresLine: names, sums and '–'", candidateScoresLine(two) === "1번 '주간보고 쓰기' 13점 · 2번 '회의록 정리하기' 15점 · 3번 –", candidateScoresLine(two));
  const drill = { version: 1 as const, task: "주간보고 쓰기", differences: ["구조 - 같아요", "", "말투"], invention: "전환율 12%", leftForHuman: "맨 위 고르기", card };
  const sheet = drillSheetText({ drill, rounds: { 2: "2라운드 글" }, workMap: two });
  check("drillSheetText: sheet, rounds held, card, candidates", sheet.startsWith("비교표 · 주간보고 쓰기") && sheet.includes("2라운드 결과\n2라운드 글") && !sheet.includes("1라운드 결과") && sheet.includes("- 말투") && sheet.includes("2라운드 카드") && sheet.includes("후보\n1번"), sheet);
  const rs = rewardSlots({ ...two, rows: [...two.rows, { id: "seed-1", category: "a", task: "자료 모으기", hours: 1, kind: "P" }] }, drill);
  check("rewardSlots: seeds, hours, diffs, task", rs.seed_count === "1" && rs.total_hours === "8.5" && rs.diff_count === "2" && rs.drill_task === "주간보고 쓰기", rs);
}

// --- L1 group C rows (2026-10-21): new blocks, the gut pick, shuffled ticks, track lines ---

{
  const m: MissionContent = JSON.parse(JSON.stringify(fixture));
  m.xpLabel = "XP(경험치)";
  m.screens[0].blocks.push(
    { t: "coach", text: "틀려도 괜찮아요." },
    { t: "reveal", label: "눌러서 보기", text: "그렇다면 처리." },
    { t: "bar", guess: { key: "l1_guess", label: "첫 미션의 내 짐작", share: { "20": 0.111 } } },
    { t: "warn", when: "track_dat", text: "DAT 줄" },
    { t: "warn", when: "track_sal", text: "SAL 줄" },
  );
  m.screens[4].blocks.push({ t: "i", i: { id: "s5.gut", type: "I7", from: "p_rows", options: [] } });
  m.screens[5].blocks.push({
    t: "i",
    i: {
      id: "s6.ticks",
      type: "I10",
      ordered: true,
      shuffle: true,
      firstAsk: "첫 번째로 줄 것은?",
      firstLine: "예시부터요.",
      items: [{ key: "a", label: "잘된 예시 하나" }, { key: "b", label: "양식" }],
    },
  });
  m.saved = ["느낌으로 고른 줄: {{gut_pick}}", "처리 줄 {{p_count}}개"];
  const r = validateMission(m);
  check("valid: coach, reveal, bar, track whens, I7 from p_rows, shuffled ticks, gut_pick, p_count", r.ok, r.ok ? null : r.errors);
  check("requiredForDone: a p_rows pick is not waited for", !requiredForDone(m).some((x) => x.interaction.id === "s5.gut"));

  const bad: MissionContent = JSON.parse(JSON.stringify(m));
  (bad.screens[4].blocks.at(-1) as { i: I7Choose }).i.xp = { part: "확인", right: 10 };
  bad.screens[0].blocks.push({ t: "bar", guess: { key: "l1.guess", label: "x", share: { "20": 2 } } });
  const ticks = bad.screens[5].blocks.at(-1) as { i: { ordered?: boolean } };
  ticks.i.ordered = false;
  const e = validateMission(bad);
  const errs = e.ok ? "" : e.errors.join("\n");
  check("bad: p_rows with xp", /from "p_rows" takes no answer and no xp/.test(errs), errs);
  check("bad: bar share out of 0–1 and a dotted key", /must be a number 0–1/.test(errs) && /guess\.key/.test(errs), errs);
  check("bad: shuffle and firstLine need ordered", /only an ordered checklist is shuffled/.test(errs) && /only an ordered checklist has a firstLine/.test(errs), errs);

  const dat = forBrowser(m, { q8Short: false, track: "DAT" });
  const none = forBrowser(m, { q8Short: false, track: null });
  const texts = (x: MissionContent) => x.screens[0].blocks.map((b) => ("text" in b ? b.text : ""));
  check("forBrowser: track_dat shows for DAT only, track_sal hidden", texts(dat).includes("DAT 줄") && !texts(dat).includes("SAL 줄"));
  check("forBrowser: no track drops both track lines", !texts(none).includes("DAT 줄") && !texts(none).includes("SAL 줄"));

  const map: WorkMapDraft = {
    version: 1,
    extraCategories: [],
    rows: [
      { id: "r1", category: "a", task: "주간보고 쓰기", hours: 3, kind: "P" },
      { id: "r2", category: "a", task: "회의록 정리하기", hours: 1, kind: "P" },
      { id: "r3", category: "a", task: "방향 정하기", hours: 2, kind: "T" },
    ],
    candidates: [{ rowId: "r1", scores: { recurs: 3, digital_inputs: 3, stable_rules: 2, ownership: 3, low_cost_wrong: 2 } }],
  };
  check("gutPickLine: a scored candidate shows its sum", gutPickLine(map, "r1") === "'주간보고 쓰기' 13점", gutPickLine(map, "r1"));
  check("gutPickLine: a row that is no candidate says so", gutPickLine(map, "r2") === "'회의록 정리하기' · 후보에는 안 들었어요", gutPickLine(map, "r2"));
  check("gutPickLine: no pick is empty (the line is dropped)", gutPickLine(map, undefined) === "" && rewardSlots(map, { version: 1, task: "", differences: [], invention: "", leftForHuman: "" }).gut_pick === "");
  check("workMapSlots: p_count counts 처리 rows", workMapSlots(map, null).p_count === "2");
}

// --- Slots (pure part; the module also holds server loaders) ---------------------------

async function slotChecks(): Promise<void> {
  let mod: typeof import("../../src/lib/course/slots");
  try {
    mod = await import("../../src/lib/course/slots");
  } catch (e) {
    console.log(`SKIP  slots (module needs the Next server runtime: ${(e as Error).message.split("\n")[0]})`);
    return;
  }
  const base = { track: "docs_admin" as const, confirmedTrack: null, draft: null, snapshot: null };
  const a = mod.slotValues({ ...base, core: { mirror_text: "짧음", industry: "it_software", rank: "manager_mid" } });
  check("slots: short Q8 falls back", a.q8Fallback && a.values.q8 === mod.Q8_FALLBACK, a);
  check("slots: IT report name", a.values.report_name === "스프린트 리뷰 보고", a.values);
  check("slots: 과장·차장 reader", a.values.reader_title === "부장님", a.values);
  check("slots: track name", a.values.track_name === "문서·행정 트랙", a.values);
  const b = mod.slotValues({
    ...base,
    confirmedTrack: "SMB",
    core: { mirror_text: "매주 월요일 주간보고를 씁니다.", industry: "other", rank: "team_lead" },
    draft: {
      version: 1,
      extraCategories: [],
      rows: [
        { id: "r1", category: "a", task: "주간보고 쓰기", hours: 3, kind: "P" },
        { id: "r2", category: "b", task: "보고 방향 정하기", hours: 1.5, kind: "T" },
      ],
      candidates: [{ rowId: "r1", scores: { recurs: 3, digital_inputs: 3, stable_rules: 3, ownership: 3, low_cost_wrong: 3 } }],
    },
  });
  check("slots: real Q8 kept", !b.q8Fallback && b.values.q8 === "매주 월요일 주간보고를 씁니다.", b.values);
  check("slots: default report name", b.values.report_name === "팀 주간보고", b.values);
  check("slots: 팀장 reader is 임원", b.values.reader_title === "임원", b.values);
  check("slots: confirmed track wins", b.values.track_name === "소규모 사업·스타트업 트랙", b.values);
  check("slots: draft hours and rows", b.values.p_hours === "3" && b.values.j_hours === "1.5" && b.values.row_count === "2", b.values);
  check("slots: candidate1 from the draft", b.values.candidate1 === "주간보고 쓰기", b.values);
  check("slots: candidate2 falls back to candidate1", b.values.candidate2 === "주간보고 쓰기", b.values);
  check("slots: no track -> null name", mod.trackNameOf(null, null) === null && mod.trackNameOf("research_planning", null) === "리서치·기획 트랙");
  const resolved = mod.resolveSlots(fixture, b.values);
  const text = (resolved.screens[0].blocks[0] as { text: string }).text;
  check("slots: resolveSlots fills text", text === "매주 월요일 주간보고를 씁니다.에 몇 시간 쓰세요?", text);
  check("slots: resolveSlots does not touch the input", (fixture.screens[0].blocks[0] as { text: string }).text.includes("{{q8}}"));
}

void slotChecks().then(() => {
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail > 0 ? 1 : 0);
});
