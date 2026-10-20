// Online course O1: route, XP and RLS checks against the dev server and the
// real database (docs/app/phases/phase-online.md, "O1 build plan").
//
//   CHECK_TAG=$TAG node scripts/checks/course-o1.mjs $DIR
//
// $DIR holds learner-cookie.txt and blank-cookie.txt from
// scripts/test-session.ts (see README.md; one --tag for both). Needs migration
// 0012 applied. CHECK_BASE defaults to http://localhost:3005.
//
// The script uses its own fixture missions, never the real course: it
// upserts them into course_content with the service role as spine0 Levels 11
// and 12 (spine0 has Levels 1 to 3 only, so no learner sees them) with ids
// M12.Z1, M12.Z2, M12.Z3, S12Z, M11.Z1, S11Z, and deletes them at the end. It
// resets the two accounts' course rows for those missions first and removes
// them, the learner's work_map and drill drafts and the work_map_submitted
// events it inserted at the end. The fixture text is not product content.
//
// Covers: anon 401 on every route; no-profile 409; answer idempotency; combo,
// retry and hint amounts; caps; locked mission refused; step verification
// refusals and passes; an I11 saved with the review example recorded at 0
// XP; progress forward-only, done only on the last screen and only after
// every own-work step and every paying item (409 steps_missing names them);
// badge once; skip test start (startedAt + elapsed, a stale start restarts
// the clock), pass, credit, credited item pays 0, one attempt only (a
// repeat gets the stored result back), not offered once a mission is done;
// L1 review 2026-10-21: the skip test passes past its clock and a neutral
// tap (a computed cell) uses no tap; an I3 neutral tap is not stored; an
// I7 over the learner's rows pays on 맞아요 / 바꾸기 only; an I7 with
// evidence pays only after a work_map_submitted since the mission opened;
// the 2라운드 카드 steps are verified against the drill draft;
// and RLS: a learner reads own course_xp only, cannot insert, anon reads
// nothing.
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const S = process.argv[2];
if (!S) {
  console.error("usage: node scripts/checks/course-o1.mjs <dir with the cookie files>");
  process.exit(2);
}
const BASE = process.env.CHECK_BASE ?? "http://localhost:3005";
const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split(/\r?\n/).map((l) => /^([A-Z0-9_]+)=(.*)$/.exec(l.trim())).filter(Boolean).map((m) => [m[1], m[2]]),
);
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL, ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const admin = createClient(URL_, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });

function account(file) {
  const snippet = readFileSync(`${S}/${file}`, "utf8");
  const pairs = [...snippet.matchAll(/document\.cookie="([^;"]+);/g)].map((m) => m[1]);
  const session = JSON.parse(
    Buffer.from(pairs.map((p) => p.slice(p.indexOf("=") + 1)).join("").replace(/^base64-/, ""), "base64url").toString("utf8"),
  );
  const email = session.user.email;
  if (!email.endsWith("@innovlabs.test")) throw new Error(`${file} is not a test account`);
  const tag = /\+([a-z0-9-]+)@innovlabs\.test$/.exec(email)?.[1] ?? null;
  return { cookie: pairs.join("; "), token: session.access_token, id: session.user.id, tag };
}
const learner = account("learner-cookie.txt");
const other = account("blank-cookie.txt");
{
  const want = process.env.CHECK_TAG ?? null;
  if (learner.tag !== other.tag) throw new Error("the cookie files are from different runs (mixed --tag)");
  if (want !== null && learner.tag !== want) throw new Error(`the cookie files are for tag ${learner.tag ?? "(none)"}, not CHECK_TAG=${want}`);
}
// The blank account must stay without a profile (the no_profile check).
{
  const { data } = await admin.from("user_profile").select("user_id").eq("user_id", other.id).maybeSingle();
  if (data) console.log("note: the blank account has a profile; the no_profile check is skipped");
}

const results = [];
function check(name, cond, detail) {
  results.push({ name, pass: !!cond });
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${cond ? "" : "  -> " + JSON.stringify(detail).slice(0, 600)}`);
}
async function call(method, path, body, who) {
  const res = await fetch(BASE + path, {
    method,
    headers: { "content-type": "application/json", origin: BASE, ...(who ? { cookie: who.cookie } : {}) },
    ...(body === undefined ? {} : { body: typeof body === "string" ? body : JSON.stringify(body) }),
  });
  return { status: res.status, json: await res.json().catch(() => null) };
}
const post = (path, body, who) => call("POST", path, body, who);
const put = (path, body, who) => call("PUT", path, body, who);
const get = (path, who) => call("GET", path, undefined, who);
const answer = (body) => post("/api/course/answer", body, learner);
const step = (missionId, interactionId, extra = {}) => post("/api/course/step", { missionId, interactionId, ...extra }, learner);
const progress = (body) => post("/api/course/progress", body, learner);
function rest(path, init = {}, token = ANON) {
  return fetch(`${URL_}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: ANON, authorization: `Bearer ${token}`, "content-type": "application/json", prefer: "return=representation", ...(init.headers ?? {}) },
  });
}
async function restRows(path, token) {
  const r = await rest(path, {}, token);
  const body = await r.json().catch(() => null);
  return { status: r.status, rows: Array.isArray(body) ? body : null, body };
}
const refused = (s) => s === 401 || s === 403 || s === 404;

// --- Fixtures (not product content) -------------------------------------------

const cards = (n) => Array.from({ length: n }, (_, k) => ({ key: `c${k + 1}`, text: `점검 카드 ${k + 1}`, answer: k % 2 ? "j" : "p", why: "점검용이에요." }));
const i6 = (id, part = "예측") => ({ id, type: "I6", options: [{ v: "a", label: "가" }, { v: "b", label: "나" }], answer: "b", xp: { part, right: 10 }, reveal: "점검용이에요." });
const screen = (id, beat, blocks, extra = {}) => ({ id, beat, blocks, ...extra });
const mission = (over) => ({ version: 1, course: "spine0", title: "점검 미션", minutes: 5, coach: "점검이에요.", ...over });

const Z1 = mission({
  id: "M12.Z1", level: 12, ord: 1,
  caps: { 예측: 10, 해보기: 30, 알기: 10, "내 업무에": 30, 확인: 10, 실습: 20 },
  badges: [{ id: "zz_check_badge", label: "점검" }],
  screens: [
    screen("s1", "상황", [{ t: "i", i: i6("s1.p") }]),
    screen("s2", "해보기", [{ t: "i", i: { id: "s2.sort", type: "I1", bins: ["p", "j"], cards: cards(9), xp: { part: "해보기", per: 5, retry: 2 } } }]),
    screen("s3", "해보기", [{ t: "i", i: { id: "s3.spot", type: "I3", doc: "첫 문장이에요. 지어낸 숫자 99% 상승이에요. 끝 문장이에요.", target: "지어낸 숫자 99% 상승", xp: { part: "알기", right: 10, afterHint: 4 }, hintAfter: 1, rightLine: "찾았어요." } }]),
    screen("s4", "내 업무에", [{ t: "i", i: { id: "s4.seed", type: "I9", target: "seed_rows", xp: { part: "내 업무에", right: 30 } } }]),
    screen("s5", "확인", [
      { t: "i", i: { id: "s5.check", type: "I10", items: [{ key: "a", label: "점검" }], xp: { part: "확인", right: 10 } } },
      { t: "i", i: { id: "s5.lab", type: "I11", round: 1, steps: ["점검용이에요."], minChars: 10, exampleText: "점검용 예시 결과예요.", xp: { part: "실습", right: 20 } } },
    ]),
  ],
});
const Z2 = mission({
  id: "M12.Z2", level: 12, ord: 2,
  caps: { 예측: 10, "내 업무에": 40 },
  screens: [
    screen("s1", "상황", [{ t: "i", i: i6("s1.p") }]),
    screen("s2", "내 업무에", [{ t: "i", i: { id: "s2.classify", type: "I9", target: "work_map_classify", xp: { part: "내 업무에", right: 20 } } }]),
    screen("s3", "내 업무에", [{ t: "i", i: { id: "s3.cand", type: "I9", target: "work_map_candidates", xp: { part: "내 업무에", right: 20 } } }]),
  ],
});
// L1 review 2026-10-21: neutral taps, the row check, evidence, the 2라운드 카드.
const Z3 = mission({
  id: "M12.Z3", level: 12, ord: 3,
  caps: { 해보기: 20, 확인: 20, 카드: 0 },
  screens: [
    screen("s1", "해보기", [{ t: "i", i: { id: "s1.spot", type: "I3", doc: "첫 문장이에요. 지어낸 숫자 99% 상승이에요. 계산한 값 +8%예요.", target: "지어낸 숫자 99% 상승", xp: { part: "해보기", right: 20, afterHint: 5 }, hintAfter: 1, rightLine: "찾았어요.", wrongLine: "재료에 있어요.", neutral: [{ find: "+8%", line: "계산한 값이에요." }] } }]),
    screen("s2", "확인", [{ t: "i", i: { id: "s2.row", type: "I7", from: "work_map_rows", fromLine: "그 줄이 지금 {kind} 돼 있어요. 맞나요?", options: [], xp: { part: "확인", right: 10 } } }]),
    screen("s3", "확인", [{ t: "i", i: { id: "s3.when", type: "I7", options: [{ v: "soon", label: "곧" }, { v: "later", label: "나중에" }], xp: { part: "확인", right: 10 }, evidence: "work_map_submitted" } }]),
    screen("s4", "내 업무에", [
      { t: "i", i: { id: "s4.card", type: "I9", target: "round2_card_start", xp: { part: "카드", right: 0 } } },
      { t: "i", i: { id: "s4.card2", type: "I9", target: "round2_card", xp: { part: "카드", right: 0 } } },
    ]),
  ],
});
const skipTest = (id, level) =>
  mission({
    id, level, ord: 1, kind: "skip_test", caps: { 시험: 0 },
    screens: [
      screen("t1", "해보기", [{ t: "i", i: { id: "t1.sort", type: "I1", bins: ["p", "j"], cards: cards(2), xp: { part: "시험", per: 0, retry: 0 } } }]),
      screen("t2", "해보기", [{ t: "i", i: { id: "t2.pick", type: "I2", docs: [{ v: "A", label: "가", text: "지어낸 숫자가 있어요." }, { v: "B", label: "나", text: "출처가 있어요." }], answer: "B", xp: { part: "시험", right: 0 }, wrongLine: "다시 봐요.", chips: [{ name: "숫자", find: "지어낸 숫자" }] } }]),
      screen("t3", "해보기", [{ t: "i", i: { id: "t3.spot", type: "I3", doc: "첫 문장이에요. 지어낸 숫자 99% 상승이에요. 계산한 값 +8%예요.", target: "지어낸 숫자 99% 상승", xp: { part: "시험", right: 0, afterHint: 0 }, hintAfter: 2, rightLine: "찾았어요.", neutral: [{ find: "+8%", line: "계산한 값이에요." }] } }]),
    ],
  });
const S12 = skipTest("S12Z", 12);
const S11 = skipTest("S11Z", 11);
const Y1 = mission({
  id: "M11.Z1", level: 11, ord: 1,
  caps: { 해보기: 20, 예측: 10 },
  screens: [
    screen("s1", "해보기", [{ t: "i", i: { id: "s1.sort", type: "I1", bins: ["p", "j"], cards: cards(4), xp: { part: "해보기", per: 5, retry: 2 } } }], { skippable: true }),
    screen("s2", "확인", [{ t: "i", i: i6("s2.p") }]),
  ],
});
const FIXTURES = [Z1, Z2, Z3, S12, Y1, S11];
/** A work_map draft body for PUT /api/drafts/work_map with two rows of the given kinds. */
const draft = (kinds) => ({
  data: {
    version: 1,
    extraCategories: [],
    rows: [
      { id: "r1", category: "a", task: "주간보고 취합", hours: 2, kind: kinds[0] },
      { id: "r2", category: "c", task: "판매 숫자 정리", hours: 1.5, kind: kinds[1] },
    ],
    candidates: [],
  },
});
const IDS = FIXTURES.map((m) => m.id);

async function reset() {
  for (const t of ["course_xp", "course_progress", "course_badge"]) {
    const q = admin.from(t).delete().in("user_id", [learner.id, other.id]);
    const { error } = t === "course_badge" ? await q.eq("badge_id", "zz_check_badge") : await q.in("mission_id", IDS);
    if (error) throw new Error(`reset ${t}: ${error.message}`);
  }
  await admin.from("artifact_draft").delete().eq("user_id", learner.id).in("kind", ["work_map", "drill"]);
}

// --- Setup ---------------------------------------------------------------------

await reset();
{
  const now = new Date().toISOString();
  const { error } = await admin.from("course_content").upsert(
    FIXTURES.map((m) => ({ mission_id: m.id, course: m.course, level: m.level, ord: m.ord, version: 1, data: m, updated_at: now })),
    { onConflict: "mission_id" },
  );
  if (error) throw new Error(`fixtures: ${error.message}`);
}
const insertedEventIds = [];

try {
  // --- Anon and no profile ---
  for (const [method, path] of [["POST", "/api/course/answer"], ["POST", "/api/course/step"], ["POST", "/api/course/progress"], ["POST", "/api/course/skip"], ["GET", "/api/course/state?course=spine0&level=12"]]) {
    const r = await call(method, path, method === "POST" ? { missionId: "M12.Z1", interactionId: "s1.p", answer: "b" } : undefined, null);
    check(`anon ${method} ${path.split("?")[0]} -> 401`, r.status === 401, r);
  }
  {
    const { data } = await admin.from("user_profile").select("user_id").eq("user_id", other.id).maybeSingle();
    if (!data) {
      const r = await post("/api/course/answer", { missionId: "M12.Z1", interactionId: "s1.p", answer: "b" }, other);
      check("no profile -> 409 no_profile", r.status === 409 && r.json?.error === "no_profile", r);
    }
  }

  // --- State ---
  {
    const r = await get("/api/course/state?course=spine0&level=12", learner);
    const d = r.json?.data;
    check("state L12: three path missions, Z1 open, Z2 and Z3 locked", r.status === 200 && d?.missions?.length === 3 && d.missions[0].status === "open" && d.missions[1].status === "locked" && d.missions[2].status === "locked", r);
    check("state L12: xpMax is the sum of the caps", d?.xpMax === 110 + 50 + 40 && d?.missions?.[0]?.xpMax === 110, d);
    check("state L12: skip test offered, badge offered not earned", d?.skipTest?.available === true && d?.badges?.some((b) => b.id === "zz_check_badge" && !b.earned), d);
    const badParam = await get("/api/course/state?course=nope&level=12", learner);
    check("state with a bad course -> 400", badParam.status === 400, badParam);
  }

  // --- Answer: single item, idempotent ---
  {
    const a = await answer({ missionId: "M12.Z1", interactionId: "s1.p", answer: "b" });
    check("I6 right pays 10", a.status === 200 && a.json?.data?.amount === 10 && a.json.data.correct === true && a.json.data.missionXp === 10, a);
    const b = await answer({ missionId: "M12.Z1", interactionId: "s1.p", answer: "b" });
    check("same item twice pays once", b.status === 200 && b.json?.data?.amount === 0 && b.json.data.missionXp === 10, b);
    const c = await answer({ missionId: "M12.Z1", interactionId: "s1.p", answer: "zzz" });
    check("non-option answer -> 400", c.status === 400, c);
    const big = await answer({ missionId: "M12.Z1", interactionId: "s1.p", answer: "x".repeat(20000) });
    check("oversized body -> 413", big.status === 413, big);
  }

  // --- Answer: I1 combo, retry, caps ---
  {
    const got = [];
    for (const k of [1, 2, 3, 4, 5]) {
      const r = await answer({ missionId: "M12.Z1", interactionId: "s2.sort", itemKey: `c${k}`, answer: k % 2 ? "p" : "j" });
      got.push(r.json?.data);
    }
    check("I1 combo: 5,5,5,10,10", JSON.stringify(got.map((d) => d?.amount)) === "[5,5,5,10,10]", got);
    check("I1 combo x2 on the 4th", got[3]?.combo === 2, got[3]);
    check("caps: 해보기 capped at 30 (10 + 30)", got[4]?.missionXp === 40, got[4]);
    const wrong = await answer({ missionId: "M12.Z1", interactionId: "s2.sort", itemKey: "c6", answer: "p" });
    check("I1 wrong first try: 0, retry", wrong.json?.data?.amount === 0 && wrong.json.data.retry === true && wrong.json.data.correct === false, wrong);
    const retry = await answer({ missionId: "M12.Z1", interactionId: "s2.sort", itemKey: "c6#2", answer: "j" });
    check("I1 retry right pays 2 (total stays capped)", retry.json?.data?.amount === 2 && retry.json.data.missionXp === 40, retry);
    const again = await answer({ missionId: "M12.Z1", interactionId: "s2.sort", itemKey: "c6#2", answer: "j" });
    check("I1 retry replay pays 0", again.json?.data?.amount === 0, again);
    const third = await answer({ missionId: "M12.Z1", interactionId: "s2.sort", itemKey: "c6#3", answer: "j" });
    check("I1 third attempt -> 400", third.status === 400, third);
    const notAllowed = await answer({ missionId: "M12.Z1", interactionId: "s2.sort", itemKey: "c1#2", answer: "p" });
    check("I1 retry of a right card -> 409", notAllowed.status === 409 && notAllowed.json?.error === "retry_not_allowed", notAllowed);
    const reset1 = await answer({ missionId: "M12.Z1", interactionId: "s2.sort", itemKey: "c7", answer: "p" });
    check("I1 streak reset after a miss (x1, 5 paid; total stays capped at 40)", reset1.json?.data?.amount === 5 && reset1.json.data.combo === 1 && reset1.json.data.missionXp === 40, reset1);
  }

  // --- Answer: I3 hint ---
  {
    const miss = await answer({ missionId: "M12.Z1", interactionId: "s3.spot", answer: "첫 문장이에요." });
    check("I3 wrong tap pays 0", miss.json?.data?.amount === 0 && miss.json.data.correct === false, miss);
    const hit = await answer({ missionId: "M12.Z1", interactionId: "s3.spot", answer: "지어낸 숫자 99% 상승이에요." });
    check("I3 found after the hint pays afterHint (4)", hit.json?.data?.amount === 4 && hit.json.data.missionXp === 44, hit);
  }

  // --- Wrong route for the item ---
  {
    const a = await answer({ missionId: "M12.Z1", interactionId: "s4.seed", answer: "x" });
    check("answer on a step -> 400 not_answer_item", a.status === 400 && a.json?.error === "not_answer_item", a);
    const s = await step("M12.Z1", "s1.p");
    check("step on an answer item -> 400 not_step", s.status === 400 && s.json?.error === "not_step", s);
    const u = await answer({ missionId: "M12.Z1", interactionId: "nope", answer: "b" });
    check("unknown interaction -> 404", u.status === 404, u);
    const m = await answer({ missionId: "M99.Q", interactionId: "s1.p", answer: "b" });
    check("unknown mission -> 404", m.status === 404, m);
  }

  // --- Locked mission ---
  {
    const a = await answer({ missionId: "M12.Z2", interactionId: "s1.p", answer: "b" });
    check("answer on a locked mission -> 409", a.status === 409 && a.json?.error === "mission_locked", a);
    const s = await step("M12.Z2", "s2.classify");
    check("step on a locked mission -> 409", s.status === 409, s);
    const p = await progress({ missionId: "M12.Z2", screen: 0 });
    check("progress on a locked mission -> 409", p.status === 409, p);
  }

  // --- Step verification (seed_rows) ---
  {
    const none = await step("M12.Z1", "s4.seed");
    check("seed_rows without a draft -> 422", none.status === 422 && none.json?.problems?.[0] === "seed_rows_too_few", none);
    const saved = await put("/api/drafts/work_map", draft([null, null]), learner);
    check("draft saved through /api/drafts", saved.status === 200, saved);
    const ok1 = await step("M12.Z1", "s4.seed");
    check("seed_rows with 2 rows pays 30", ok1.status === 200 && ok1.json?.data?.amount === 30 && ok1.json.data.missionXp === 74, ok1);
    const ok2 = await step("M12.Z1", "s4.seed");
    check("step twice pays once", ok2.status === 200 && ok2.json?.data?.amount === 0 && ok2.json.data.missionXp === 74, ok2);
  }

  // --- Progress ---
  {
    const a = await progress({ missionId: "M12.Z1", screen: 2 });
    check("progress to screen 2", a.status === 200 && a.json?.data?.screen === 2 && a.json.data.doneAt === null, a);
    const b = await progress({ missionId: "M12.Z1", screen: 1 });
    check("progress never moves back", b.json?.data?.screen === 2, b);
    const c = await progress({ missionId: "M12.Z1", screen: 99 });
    check("screen past the end -> 400", c.status === 400 && c.json?.error === "bad_screen", c);
    const d = await progress({ missionId: "M12.Z1", screen: 3, done: true });
    check("done before the last screen -> 400", d.status === 400 && d.json?.error === "not_last_screen", d);
    const early = await progress({ missionId: "M12.Z1", screen: 4, done: true });
    check(
      "done waits for every paying item, not only I9 (review P2-1)",
      early.status === 409 && early.json?.error === "steps_missing" && JSON.stringify(early.json.problems) === '["s5.check","s5.lab"]',
      early,
    );
    const checkStep = await step("M12.Z1", "s5.check");
    check("I10 step pays 10", checkStep.json?.data?.amount === 10, checkStep);
    const badFlag = await step("M12.Z1", "s5.lab", { example: "yes" });
    check("step with a non-boolean example -> 400", badFlag.status === 400, badFlag);
    const example = await step("M12.Z1", "s5.lab", { example: true });
    check("I11 with the review example: recorded, 0 XP (audience review #9)", example.status === 200 && example.json?.data?.amount === 0, example);
    const exampleAgain = await step("M12.Z1", "s5.lab");
    check("I11 after the example: the item is taken, pays 0", exampleAgain.json?.data?.amount === 0, exampleAgain);
    const e = await progress({ missionId: "M12.Z1", screen: 4, done: true });
    check("done on the last screen: doneAt + badge", e.status === 200 && !!e.json?.data?.doneAt && JSON.stringify(e.json.data.badges) === '["zz_check_badge"]', e);
    const f = await progress({ missionId: "M12.Z1", screen: 4, done: true });
    check("done again: same doneAt, no new badge", f.json?.data?.doneAt === e.json?.data?.doneAt && f.json.data.badges.length === 0, f);
    const { count } = await admin.from("course_badge").select("badge_id", { count: "exact", head: true }).eq("user_id", learner.id).eq("badge_id", "zz_check_badge");
    check("badge row exists once", count === 1, count);
  }

  // --- Z2 opens; classify and candidates verification; steps before done ---
  {
    const st = await get("/api/course/state?course=spine0&level=12", learner);
    check("state: Z1 done, Z2 open, badge earned, skip test no longer offered", st.json?.data?.missions?.[0]?.status === "done" && st.json.data.missions[1].status === "open" && st.json.data.badges.find((b) => b.id === "zz_check_badge")?.earned === true && st.json.data.skipTest.available === false, st.json?.data);
    const skip = await post("/api/course/skip", { level: 12, cards: ["p", "j"], pick: "B", spotTaps: ["지어낸 숫자 99% 상승이에요."], seconds: 10 }, learner);
    check("skip test once a mission is done -> 409 not_available", skip.status === 409 && skip.json?.error === "not_available", skip);

    const early = await progress({ missionId: "M12.Z2", screen: 2, done: true });
    check(
      "done before the steps -> 409 steps_missing with their ids",
      early.status === 409 && early.json?.error === "steps_missing" && JSON.stringify(early.json.problems) === '["s1.p","s2.classify","s3.cand"]',
      early,
    );
    const z2p = await answer({ missionId: "M12.Z2", interactionId: "s1.p", answer: "a" });
    check("Z2 I6 wrong answer is recorded (pays 0)", z2p.status === 200 && z2p.json?.data?.amount === 0, z2p);
    const unmarked = await step("M12.Z2", "s2.classify");
    check("classify with unmarked rows -> 422", unmarked.status === 422 && unmarked.json?.problems?.[0] === "work_map_classify_unmarked", unmarked);
    await put("/api/drafts/work_map", draft(["M", "T"]), learner);
    const mixed = await step("M12.Z2", "s2.classify");
    check("classify with an M row -> 422", mixed.status === 422, mixed);
    await put("/api/drafts/work_map", draft(["P", "T"]), learner);
    const classified = await step("M12.Z2", "s2.classify");
    check("classify with every row P/T pays 20", classified.json?.data?.amount === 20, classified);
    const noMap = await step("M12.Z2", "s3.cand");
    check("candidates without a work map submitted since the mission opened -> 422", noMap.status === 422 && noMap.json?.problems?.[0] === "work_map_not_submitted", noMap);
    const { data: ev, error } = await admin
      .from("profile_event")
      .insert({ user_id: learner.id, type: "work_map_submitted", visibility: "learner", data: { version: 1, check: "course-o1" } })
      .select("id")
      .single();
    if (error) throw new Error(`event insert: ${error.message}`);
    insertedEventIds.push(ev.id);
    const withMap = await step("M12.Z2", "s3.cand");
    check("candidates after a work_map_submitted event pays 20", withMap.json?.data?.amount === 20 && withMap.json.data.missionXp === 40, withMap);
    const done = await progress({ missionId: "M12.Z2", screen: 2, done: true });
    check("Z2 done after its steps", done.status === 200 && !!done.json?.data?.doneAt, done);
  }

  // --- L1 review 2026-10-21 (Z3): neutral tap, row check, evidence, the card ---
  {
    const neutral = await answer({ missionId: "M12.Z3", interactionId: "s1.spot", answer: "계산한 값 +8%예요." });
    check("I3 neutral tap: answered, pays 0", neutral.status === 200 && neutral.json?.data?.amount === 0 && neutral.json.data.correct === null, neutral);
    const { count: neutralRows } = await admin.from("course_xp").select("id", { count: "exact", head: true }).eq("user_id", learner.id).eq("mission_id", "M12.Z3").like("item", "s1.spot#%");
    check("I3 neutral tap is not stored", neutralRows === 0, neutralRows);
    const hit = await answer({ missionId: "M12.Z3", interactionId: "s1.spot", answer: "지어낸 숫자 99% 상승이에요." });
    check("I3 found after a neutral tap pays right (no hint used)", hit.json?.data?.amount === 20, hit);

    const pickRow = await answer({ missionId: "M12.Z3", interactionId: "s2.row", answer: "r1" });
    check("row check: a row id is no answer -> 400", pickRow.status === 400, pickRow);
    const kept = await answer({ missionId: "M12.Z3", interactionId: "s2.row", answer: "ok" });
    check("row check: 맞아요 pays 10", kept.status === 200 && kept.json?.data?.amount === 10, kept);

    const noEvidence = await answer({ missionId: "M12.Z3", interactionId: "s3.when", answer: "soon" });
    check("evidence: no work_map_submitted since Z3 opened -> 422, nothing paid", noEvidence.status === 422 && noEvidence.json?.problems?.[0] === "work_map_not_submitted", noEvidence);
    const { data: ev2, error: e2 } = await admin
      .from("profile_event")
      .insert({ user_id: learner.id, type: "work_map_submitted", visibility: "learner", data: { version: 1, check: "course-o1" } })
      .select("id")
      .single();
    if (e2) throw new Error(`event insert: ${e2.message}`);
    insertedEventIds.push(ev2.id);
    const withEvidence = await answer({ missionId: "M12.Z3", interactionId: "s3.when", answer: "later" });
    check("evidence: after the submit, any answer pays 10", withEvidence.status === 200 && withEvidence.json?.data?.amount === 10, withEvidence);

    const noCard = await step("M12.Z3", "s4.card");
    check("card: no 2라운드 카드 in the drill draft -> 422", noCard.status === 422 && noCard.json?.problems?.[0] === "round2_card_missing", noCard);
    const emptyCard = { version: 1, task: "", differences: ["", "", "", ""], invention: "", leftForHuman: "", card: { instruction: "", exampleAt: "", templateAt: "", path: "" } };
    await put("/api/drafts/drill", { data: emptyCard }, learner);
    const start = await step("M12.Z3", "s4.card");
    check("card: M1.2 state with empty places is recorded", start.status === 200, start);
    const noLine = await step("M12.Z3", "s4.card2");
    check("card: B1 state without an instruction line -> 422", noLine.status === 422 && noLine.json?.problems?.[0] === "round2_card_no_instruction", noLine);
    await put("/api/drafts/drill", { data: { ...emptyCard, card: { ...emptyCard.card, instruction: "예시와 똑같이 써 주세요.", path: "pack" } } }, learner);
    const final = await step("M12.Z3", "s4.card2");
    check("card: B1 state with its line is recorded", final.status === 200, final);
    const z3done = await progress({ missionId: "M12.Z3", screen: 3, done: true });
    check("Z3 done after its steps", z3done.status === 200 && !!z3done.json?.data?.doneAt, z3done);
  }

  // --- Skip test (Level 11) ---
  {
    const st = await get("/api/course/state?course=spine0&level=11", learner);
    check("state L11: skip test offered", st.json?.data?.skipTest?.available === true && st.json.data.skipTest.result === null, st.json?.data);
    const bodyBad = await post("/api/course/skip", { level: 11, cards: "p", pick: "B", spotTaps: [], seconds: 1 }, learner);
    check("skip with a bad body -> 400", bodyBad.status === 400, bodyBad);
    const start = await progress({ missionId: "S11Z", screen: 0 });
    check(
      "skip test start recorded, with startedAt and elapsed",
      start.status === 200 && typeof start.json?.data?.startedAt === "string" && typeof start.json.data.elapsed === "number" && start.json.data.elapsed < 10,
      start,
    );
    const stale = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    await admin.from("course_progress").update({ updated_at: stale }).eq("user_id", learner.id).eq("mission_id", "S11Z");
    const restart = await progress({ missionId: "S11Z", screen: 0 });
    check("a stale skip start (no result) restarts the clock (review P1-3)", restart.status === 200 && restart.json?.data?.elapsed < 10, restart);
    const resume = await progress({ missionId: "S11Z", screen: 0 });
    check("a running skip start is kept", resume.json?.data?.startedAt === restart.json?.data?.startedAt, resume);
    const doneSkip = await progress({ missionId: "S11Z", screen: 0, done: true });
    check("progress cannot finish a skip test", doneSkip.status === 400, doneSkip);
    // Past the 3-minute clock on the server: the clock is a display only now.
    await admin.from("course_progress").update({ updated_at: new Date(Date.now() - 240 * 1000).toISOString() }).eq("user_id", learner.id).eq("mission_id", "S11Z");
    const pass = await post("/api/course/skip", { level: 11, cards: ["p", "j"], pick: "B", spotTaps: ["계산한 값 +8%예요.", "첫 문장이에요.", "지어낸 숫자 99% 상승이에요."], seconds: 30 }, learner);
    check("skip pass credits the skippable items (4 x 5), past the clock; a neutral tap uses no tap", pass.status === 200 && pass.json?.data?.result === "passed" && pass.json.data.credited === 20, pass);
    const played = await answer({ missionId: "M11.Z1", interactionId: "s1.sort", itemKey: "c1", answer: "p" });
    check("a credited item pays 0 when played", played.status === 200 && played.json?.data?.amount === 0 && played.json.data.missionXp === 20, played);
    const notCredited = await answer({ missionId: "M11.Z1", interactionId: "s2.p", answer: "b" });
    check("an unskippable item still pays", notCredited.json?.data?.amount === 10, notCredited);
    const twice = await post("/api/course/skip", { level: 11, cards: ["j", "p"], pick: "A", spotTaps: [], seconds: 999 }, learner);
    check(
      "skip test one attempt: a repeat gets the stored pass back, credits nothing new (review P1-2)",
      twice.status === 200 && twice.json?.data?.result === "passed" && twice.json.data.replay === true && twice.json.data.credited === 0,
      twice,
    );
    const after = await get("/api/course/state?course=spine0&level=11", learner);
    check("state L11: result passed, not offered", after.json?.data?.skipTest?.result === "passed" && after.json.data.skipTest.available === false, after.json?.data);
  }

  // --- RLS ---
  {
    const { error } = await admin.from("course_xp").insert({ user_id: other.id, mission_id: "M12.Z1", part: "예측", item: "rls.probe", amount: 0, correct: null });
    if (error) throw new Error(`other row: ${error.message}`);
    const own = await restRows(`course_xp?select=user_id,mission_id&mission_id=in.(${IDS.join(",")})`, learner.token);
    check("learner reads own course_xp rows only", own.status === 200 && own.rows?.length > 0 && own.rows.every((r) => r.user_id === learner.id), own);
    const theirs = await restRows(`course_xp?select=id&user_id=eq.${other.id}`, learner.token);
    check("learner cannot read another learner's course_xp", theirs.status === 200 && theirs.rows?.length === 0, theirs);
    const ins = await rest("course_xp", { method: "POST", body: JSON.stringify({ user_id: learner.id, mission_id: "M12.Z1", part: "예측", item: "self.paid", amount: 500 }) }, learner.token);
    check("learner cannot insert course_xp", refused(ins.status), ins.status);
    const prog = await rest("course_progress", { method: "POST", body: JSON.stringify({ user_id: learner.id, mission_id: "M12.Z2", screen: 0, done_at: new Date().toISOString() }) }, learner.token);
    check("learner cannot insert course_progress", refused(prog.status), prog.status);
    const badge = await rest("course_badge", { method: "POST", body: JSON.stringify({ user_id: learner.id, badge_id: "zz_self", mission_id: "M12.Z1" }) }, learner.token);
    check("learner cannot insert course_badge", refused(badge.status), badge.status);
    const upd = await rest(`course_xp?user_id=eq.${learner.id}`, { method: "PATCH", body: JSON.stringify({ amount: 500 }) }, learner.token);
    check("learner cannot update course_xp", refused(upd.status), upd.status);
    const content = await restRows(`course_content?select=mission_id&mission_id=in.(${IDS.join(",")})`, learner.token);
    check("learner reads course_content", content.status === 200 && content.rows?.length === IDS.length, content);
    const contentWrite = await rest("course_content", { method: "POST", body: JSON.stringify({ mission_id: "M12.Z9", course: "spine0", level: 12, ord: 9, version: 1, data: {} }) }, learner.token);
    check("learner cannot write course_content", refused(contentWrite.status), contentWrite.status);
    for (const t of ["course_content", "course_xp", "course_progress", "course_badge"]) {
      const a = await restRows(`${t}?select=*&limit=1`, ANON);
      check(`anon reads nothing from ${t}`, refused(a.status) || (a.status === 200 && a.rows?.length === 0), a.status);
    }
  }
} finally {
  // --- Cleanup ---
  await reset();
  if (insertedEventIds.length > 0) await admin.from("profile_event").delete().in("id", insertedEventIds);
  const { error } = await admin.from("course_content").delete().in("mission_id", IDS);
  if (error) console.error(`fixture cleanup failed: ${error.message}`);
}

const failed = results.filter((r) => !r.pass).length;
console.log(`\n${results.length - failed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
