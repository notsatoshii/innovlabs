// Phase 2c route, RLS and grant checks against the dev server and the real
// database (docs/app/phases/phase-2c.md, build order step 4).
//
//   node scripts/checks/week3-labs.mjs $DIR
//
// $DIR holds learner-cookie.txt, staff-cookie.txt and blank-cookie.txt from
// scripts/test-session.ts (see README.md). Needs migration 0011 applied and
// the templates seeded. The script sets up its own state with the service
// role: it resets the Week 3 rows of the two disposable learner accounts,
// gives the blank account an employee profile (registered, never enrolled),
// makes a test cohort whose Week 3 has not opened, enrolls the learner, and
// opens Week 3 halfway through. It deletes that cohort at the end; the
// events go with the README cleanup. It never reads or prints template text,
// only counts.
//
// It touches only the accounts in $DIR. Make them with a run tag
// (`test-session.ts learner --tag <run>`) whenever another run or a browser
// pass may be using the plain accounts at the same time: the reset above
// would otherwise end that run's session state and rows.
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const S = process.argv[2];
if (!S) {
  console.error("usage: node scripts/checks/week3-labs.mjs <dir with the cookie files>");
  process.exit(2);
}
const BASE = process.env.CHECK_BASE ?? "http://localhost:3005"; // e.g. CHECK_BASE=http://localhost:3291
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
  if (!session.user.email.endsWith("@innovlabs.test")) throw new Error(`${file} is not a test account`);
  return { cookie: pairs.join("; "), token: session.access_token, id: session.user.id };
}
const learner = account("learner-cookie.txt");
const staff = account("staff-cookie.txt");
const other = account("blank-cookie.txt");

const results = [];
function check(name, cond, detail) {
  results.push({ name, pass: !!cond });
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${cond ? "" : "  -> " + JSON.stringify(detail).slice(0, 600)}`);
}
async function post(path, body, who) {
  const res = await fetch(BASE + path, {
    method: "POST",
    headers: { "content-type": "application/json", origin: BASE, ...(who ? { cookie: who.cookie } : {}) },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
  return { status: res.status, json: await res.json().catch(() => null) };
}
async function page(path, who) {
  const res = await fetch(BASE + path, { headers: who ? { cookie: who.cookie } : {}, redirect: "manual" });
  return { status: res.status, html: await res.text(), location: res.headers.get("location") };
}
function rest(path, init = {}, token = ANON) {
  return fetch(`${URL_}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: ANON,
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      prefer: "return=representation",
      ...(init.headers ?? {}),
    },
  });
}
async function restRows(path, token) {
  const r = await rest(path, {}, token);
  const body = await r.json().catch(() => null);
  return { status: r.status, rows: Array.isArray(body) ? body : null, body };
}
async function count(userId, type) {
  const { count: n, error } = await admin
    .from("profile_event")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("type", type);
  if (error) throw new Error(error.message);
  return n ?? 0;
}
const refused = (status) => status === 401 || status === 403 || status === 404;

// --- Setup (service role) ---

const WEEK3_TYPES = [
  "workspace_setup",
  "blueprint_submitted",
  "time_log_entry",
  "baseline_locked",
  "baseline_countersigned",
  "track_confirmed",
];
for (const who of [learner, other]) {
  const { error } = await admin.from("profile_event").delete().eq("user_id", who.id).in("type", WEEK3_TYPES);
  if (error) throw new Error(`reset events: ${error.message}`);
  await admin.from("artifact_draft").delete().eq("user_id", who.id).in("kind", ["blueprint", "baseline"]);
  await admin.from("enrollment").delete().eq("user_id", who.id);
}
const { data: otherProfile } = await admin.from("user_profile").select("user_id").eq("user_id", other.id).maybeSingle();
if (!otherProfile) {
  const { error } = await admin.from("user_profile").insert({
    user_id: other.id,
    path: "employee",
    track: "data_numbers",
    track_via: "auto",
    depth_flag: "browser_only",
    core: {},
    consented_at: new Date().toISOString(),
    consent_version: "2026-09-v2",
    marketing_consent: false,
    display_name: "다른 학습자",
  });
  if (error) throw new Error(`other profile: ${error.message}`);
}
// A learning snapshot field the workspace merge must keep.
await admin
  .from("user_profile")
  .update({ baseline: null, learning: { blocked_tools: ["claude"] } })
  .eq("user_id", learner.id);
await admin.from("user_profile").update({ baseline: null }).eq("user_id", other.id);

const code = Array.from({ length: 6 }, () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)]).join("");
const { data: cohort, error: cohortError } = await admin
  .from("cohort")
  .insert({ code, name: "2c 점검 코호트", track_code: "DOC", starts_on: "2099-01-05", open_week: 2, status: "running" })
  .select("id")
  .single();
if (cohortError) throw new Error(`cohort: ${cohortError.message}`);
{
  const { error } = await admin.from("enrollment").insert({ cohort_id: cohort.id, user_id: learner.id, status: "active" });
  if (error) throw new Error(`enroll: ${error.message}`);
}
const run = "t" + Date.now().toString(36);
const harnessRows = []; // 7b and 9 inserts, removed in finally
let dryEvidence = null; // section 4 upload, removed in finally

try {
  // --- 1. Guards ---
  for (const path of ["/api/artifacts/workspace", "/api/artifacts/blueprint", "/api/artifacts/baseline"]) {
    const r = await post(path, {}, null);
    check(`${path}: no session -> 401`, r.status === 401, r);
  }
  for (const route of ["countersign", "track"]) {
    let r = await post(`/api/staff/learner/${learner.id}/${route}`, { baseline_event_id: 1, track: "DOC" }, null);
    check(`staff ${route}: no session -> 401`, r.status === 401, r);
    r = await post(`/api/staff/learner/${learner.id}/${route}`, { baseline_event_id: 1, track: "DOC" }, learner);
    check(`staff ${route}: learner session -> 403`, r.status === 403, r);
  }

  // --- 2. Workspace check ---
  const ws = {
    assistant: "chatgpt", assistant_other: "", path: "browser", workspace_name: `주간보고 ${run}`,
    instructions_set: true, references_uploaded: true, test_followed: true, uploads_blocked: false,
  };
  let r = await post("/api/artifacts/workspace", "[1,2]", learner);
  check("workspace: not an object -> 400", r.status === 400, r);
  r = await post("/api/artifacts/workspace", { ...ws, assistant: null, workspace_name: "" }, learner);
  check("workspace: unanswered -> 422 with Korean problems", r.status === 422 && r.json?.problems?.length >= 2, r);
  // The empty-name problem uses the field's own label (워크스페이스 / 프로젝트 폴더), never 작업 공간.
  check(
    "workspace: empty name problem follows the browser field label",
    r.json?.problems?.includes("워크스페이스 이름을 적어 주세요.") && !JSON.stringify(r.json).includes("작업 공간"),
    r,
  );
  r = await post("/api/artifacts/workspace", { ...ws, path: "agent", workspace_name: "" }, learner);
  check("workspace: empty name problem follows the agent field label", r.status === 422 && r.json?.problems?.includes("프로젝트 폴더 이름을 적어 주세요."), r);
  r = await post("/api/artifacts/workspace", { ...ws, test_followed: false }, learner);
  check("workspace: failed test is recorded (200, not ready)", r.status === 200 && r.json?.data?.ready === false, r);
  r = await post("/api/artifacts/workspace", ws, learner);
  check("workspace: resubmit -> 200 ready", r.status === 200 && r.json?.data?.ready === true, r);
  check("workspace: each submit is a new event", (await count(learner.id, "workspace_setup")) === 2, null);
  {
    const { data } = await admin.from("user_profile").select("learning").eq("user_id", learner.id).single();
    const l = data.learning ?? {};
    check(
      "workspace: learning merged (blocked_tools kept, workspace fields set)",
      Array.isArray(l.blocked_tools) && l.blocked_tools.includes("claude") && l.workspace_ready === true && l.workspace_name === ws.workspace_name,
      l,
    );
  }

  // --- 3. Blueprint ---
  const stages = [
    { id: `s${run}a`, name: "자료 모으기", kind: "P", actor: "assistant", needs: "팀원 메일, 지난주 보고서", harness_id: null },
    { id: `s${run}b`, name: "요약하기", kind: "P", actor: "assistant_checked", needs: "주간보고 하네스", harness_id: null },
    { id: `s${run}c`, name: "팀장님 검토 반영", kind: "T", actor: "human", needs: "", harness_id: null },
  ];
  const checkpoints = [{ id: `c${run}a`, after_stage_id: `s${run}b`, checks: ["숫자가 원자료와 맞는지"] }];
  const bp = (over = {}) => ({
    version: 1, task: "월요일 주간보고", source: { work_map_event_id: null, candidate_rank: null },
    stages, checkpoints, trigger: "월요일 아침 8시", delivery: "팀장님께 메일로", dry_run_started_at: null, ...over,
  });
  r = await post("/api/artifacts/blueprint", { draft: "x" }, learner);
  check("blueprint: malformed draft -> 400", r.status === 400, r);
  r = await post("/api/artifacts/blueprint", { draft: bp({ stages: stages.slice(0, 2), checkpoints: [] }) }, learner);
  check("blueprint: two stages, no checkpoint -> 422", r.status === 422 && r.json?.problems?.length >= 2, r);
  r = await post("/api/artifacts/blueprint", { draft: bp({ checkpoints: [{ ...checkpoints[0], after_stage_id: `s${run}a` }] }) }, learner);
  check("blueprint: no checkpoint after the last AI stage -> 422", r.status === 422, r);
  r = await post("/api/artifacts/blueprint", { draft: bp({ stages: [{ ...stages[0], harness_id: "not-mine" }, ...stages.slice(1)] }) }, learner);
  check("blueprint: harness that is not the learner's -> 422", r.status === 422, r);
  r = await post("/api/artifacts/blueprint", { draft: bp({ source: { work_map_event_id: 1, candidate_rank: 1 } }) }, learner);
  check("blueprint: Work Map event that is not the learner's -> 422", r.status === 422, r);
  r = await post("/api/artifacts/blueprint", { draft: bp() }, learner);
  const bp1 = r.json?.data?.event_id;
  check("blueprint: valid -> 200 with an event id", r.status === 200 && Number.isInteger(bp1), r);
  r = await post("/api/artifacts/blueprint", { draft: bp() }, learner);
  check("blueprint: identical resubmit answers with the same event", r.status === 200 && r.json?.data?.event_id === bp1, r);
  r = await post("/api/artifacts/blueprint", { draft: bp({ delivery: "팀장님께 메일, 사본은 팀 채널에" }) }, learner);
  const bp2 = r.json?.data?.event_id;
  check("blueprint: changed resubmit -> a new version", r.status === 200 && Number.isInteger(bp2) && bp2 !== bp1, r);
  check("blueprint: two events stored", (await count(learner.id, "blueprint_submitted")) === 2, null);
  {
    const { data } = await admin.from("profile_event").select("data").eq("id", bp2).single();
    check("blueprint: T stage stored with actor human", data.data.stages[2].actor === "human" && data.data.stages[2].kind === "T", data.data.stages);
  }
  // The other learner's blueprint, for the ownership checks below.
  r = await post("/api/artifacts/blueprint", { draft: bp({ task: "다른 사람 설계도" }) }, other);
  const otherBp = r.json?.data?.event_id;
  check("blueprint: second learner can submit their own", r.status === 200 && Number.isInteger(otherBp), r);

  // --- 4. Time log: before entry and dry run ---
  // The before entry was worked two days ago and is logged now, so the work
  // date and the log date differ (every screen shows the work date).
  const at = (minutesAgo) => new Date(Date.now() - minutesAgo * 60000).toISOString();
  const TWO_DAYS = 2 * 24 * 60;
  const beforeStartedAt = at(TWO_DAYS + 180);
  const entry = (over = {}) => ({
    task: "월요일 주간보고", method: "before", started_at: beforeStartedAt, ended_at: at(TWO_DAYS + 135), interruptions: 1, evidence_ref: null, ...over,
  });
  r = await post("/api/artifacts/time-log", entry(), learner);
  check("time log: before entry (45 min) -> 200", r.status === 200, r);
  const dry = { blueprint_event_id: bp2, checkpoint_id: `c${run}a` };
  // A screenshot only the dry run cites: an "after", never baseline evidence.
  // The time log route wants the file to exist; removed in the finally.
  dryEvidence = `${learner.id}/time-log/${Date.now()}.png`;
  {
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
    const { error } = await admin.storage.from("evidence").upload(dryEvidence, png, { contentType: "image/png", upsert: true });
    if (error) throw new Error(`dry run evidence upload: ${error.message}`);
  }
  r = await post("/api/artifacts/time-log", entry({ method: "before", dry_run: dry }), learner);
  check("dry run: method before -> 422", r.status === 422, r);
  r = await post("/api/artifacts/time-log", entry({ method: "pipeline", dry_run: { ...dry, checkpoint_id: "nope" } }), learner);
  check("dry run: checkpoint the blueprint does not have -> 422", r.status === 422, r);
  r = await post("/api/artifacts/time-log", entry({ method: "pipeline", dry_run: { ...dry, blueprint_event_id: otherBp } }), learner);
  check("dry run: another learner's blueprint -> 422", r.status === 422, r);
  r = await post("/api/artifacts/time-log", entry({ method: "pipeline", started_at: at(60), ended_at: at(40), evidence_ref: dryEvidence, dry_run: dry }), learner);
  check("dry run: own blueprint, pipeline -> 200 with dry_run", r.status === 200 && r.json?.data?.entry?.dry_run?.blueprint_event_id === bp2, r);
  const { data: logRows } = await admin
    .from("profile_event")
    .select("id, data")
    .eq("user_id", learner.id)
    .eq("type", "time_log_entry");
  const beforeId = logRows.find((x) => x.data.method === "before" && !x.data.dry_run)?.id;
  const dryId = logRows.find((x) => x.data.dry_run)?.id;
  r = await post("/api/artifacts/time-log", entry({ task: "다른 사람 기록" }), other);
  const { data: otherLog } = await admin.from("profile_event").select("id").eq("user_id", other.id).eq("type", "time_log_entry").limit(1);
  const otherEntryId = otherLog?.[0]?.id;

  // --- 5. Baseline lock and countersign ---
  const bl = (over = {}) => ({
    version: 1, task: "월요일 주간보고",
    source: { work_map_event_id: null, candidate_rank: null, blueprint_event_id: bp2 },
    current_method_stages: ["팀원 메일 모으기", "엑셀로 합치기", "양식에 옮기기"],
    time_log_event_id: beforeId, frequency: { count: 1, per: "week" }, evidence_ref: null,
    quality_checklist: ["항목이 다 있다", "숫자가 원자료와 맞다", "말투가 맞다", "한 장 안이다"],
    confirmed: true, ...over,
  });
  r = await post("/api/artifacts/baseline", { draft: bl() }, learner);
  check("baseline: lock before Week 3 opens -> 403 week_closed", r.status === 403 && r.json?.error === "week_closed", r);
  r = await post("/api/artifacts/baseline", { draft: bl({ time_log_event_id: otherEntryId, source: { work_map_event_id: null, candidate_rank: null, blueprint_event_id: null } }) }, other);
  check("baseline: lock when not enrolled -> 403 not_enrolled", r.status === 403 && r.json?.error === "not_enrolled", r);
  r = await post(`/api/staff/learner/${learner.id}/countersign`, { baseline_event_id: 1 }, staff);
  check("countersign: before Week 3 opens -> 403 week_closed", r.status === 403 && r.json?.error === "week_closed", r);

  {
    const { error } = await admin.from("cohort").update({ open_week: 3 }).eq("id", cohort.id);
    if (error) throw new Error(`open week: ${error.message}`);
  }

  r = await post("/api/artifacts/baseline", { draft: bl({ time_log_event_id: dryId }) }, learner);
  check("baseline: citing a dry run -> 422", r.status === 422, r);
  r = await post("/api/artifacts/baseline", { draft: bl({ time_log_event_id: otherEntryId }) }, learner);
  check("baseline: citing another learner's entry -> 422", r.status === 422, r);
  r = await post("/api/artifacts/baseline", { draft: bl({ quality_checklist: ["하나", "둘", "셋"] }) }, learner);
  check("baseline: three checklist lines -> 422", r.status === 422, r);
  r = await post("/api/artifacts/baseline", { draft: bl({ confirmed: false }) }, learner);
  check("baseline: no confirmation tick -> 422", r.status === 422, r);
  r = await post("/api/artifacts/baseline", { draft: bl({ evidence_ref: `${learner.id}/not-cited.png` }) }, learner);
  check("baseline: evidence not cited by an own entry -> 422", r.status === 422, r);
  r = await post("/api/artifacts/baseline", { draft: bl({ evidence_ref: dryEvidence }) }, learner);
  check("baseline: evidence cited only by a dry run -> 422", r.status === 422, r);
  r = await post("/api/artifacts/baseline", { draft: { ...bl(), minutes_per_instance: 1 } }, learner);
  const lock1 = r.json?.data?.event_id;
  check(
    "baseline: lock -> 200, minutes from the cited entry (45), not the client",
    r.status === 200 && Number.isInteger(lock1) && r.json?.data?.baseline?.minutes_per_instance === 45,
    r,
  );
  r = await post("/api/artifacts/baseline", { draft: bl({ frequency: { count: 4, per: "month" } }) }, learner);
  const lock2 = r.json?.data?.event_id;
  check("baseline: lock again before countersign -> new event", r.status === 200 && Number.isInteger(lock2) && lock2 !== lock1, r);
  {
    const { data } = await admin.from("user_profile").select("baseline").eq("user_id", learner.id).single();
    check("baseline: snapshot replaced by the newest lock", data.baseline?.locked_event_id === lock2 && data.baseline?.frequency?.count === 4, data.baseline);
    check("baseline: snapshot carries the cited entry's work date (time_started_at)", data.baseline?.time_started_at === beforeStartedAt, data.baseline);
  }
  // Fifth pass: an identical re-lock (a stray tap on 다시 확정) writes nothing
  // and answers with the current event, so the countersign below is not stale.
  r = await post("/api/artifacts/baseline", { draft: bl({ task: "  월요일   주간보고 ", frequency: { count: 4, per: "month" } }) }, learner);
  check(
    "baseline: identical re-lock -> 200 with the current event id, unchanged",
    r.status === 200 && r.json?.data?.event_id === lock2 && r.json?.data?.unchanged === true,
    r,
  );
  check("baseline: identical re-lock wrote no event", (await count(learner.id, "baseline_locked")) === 2, null);
  {
    // The form: the locked draft unchanged keeps 다시 확정 disabled with its
    // line, and section 3 and 5 no longer call the before entry Week 1's.
    await admin.from("artifact_draft").upsert(
      { user_id: learner.id, kind: "baseline", data: bl({ frequency: { count: 4, per: "month" } }) },
      { onConflict: "user_id,kind" },
    );
    const be = await page("/app/lab/baseline", learner);
    const html = be.html.replace(/<!-- -->/g, "");
    const button = /<button[^>]*>기준선 다시 확정하기<\/button>/.exec(html)?.[0] ?? "";
    check(
      "baseline form: unchanged since the lock -> 다시 확정 disabled, with the line",
      be.status === 200 && button.includes("disabled") && html.includes("확정한 내용에서 바뀐 곳이 없어요"),
      { status: be.status, button },
    );
    check(
      "baseline form: before entry not labelled Week 1 (heading, evidence hint)",
      html.includes("시험 실행과 기존 방식 기록") && html.includes("시간 기록에 올린 화면 가운데서 골라요") &&
        !html.includes("1주차 기록") && !html.includes("1주차 시간 기록"),
      null,
    );
    await admin.from("artifact_draft").upsert(
      { user_id: learner.id, kind: "baseline", data: bl({ frequency: { count: 5, per: "month" } }) },
      { onConflict: "user_id,kind" },
    );
    const be2 = await page("/app/lab/baseline", learner);
    const html2 = be2.html.replace(/<!-- -->/g, "");
    const button2 = /<button[^>]*>기준선 다시 확정하기<\/button>/.exec(html2)?.[0] ?? "";
    check(
      "baseline form: a changed draft enables 다시 확정, no unchanged line",
      be2.status === 200 && button2.length > 0 && !button2.includes("disabled") && !html2.includes("확정한 내용에서 바뀐 곳이 없어요"),
      { status: be2.status, button2 },
    );
    await admin.from("artifact_draft").delete().eq("user_id", learner.id).eq("kind", "baseline");
  }

  // The functions are not reachable through PostgREST by learners or staff.
  for (const [who, token] of [["learner", learner.token], ["staff", staff.token]]) {
    let x = await rest("rpc/countersign_baseline", {
      method: "POST",
      body: JSON.stringify({ p_user: learner.id, p_baseline_event_id: lock2, p_by_user: learner.id, p_by_role: "instructor" }),
    }, token);
    check(`rpc countersign_baseline with a ${who} JWT -> refused`, refused(x.status), { status: x.status, body: (await x.text()).slice(0, 200) });
    x = await rest("rpc/lock_baseline", { method: "POST", body: JSON.stringify({ p_user: learner.id, p_payload: {} }) }, token);
    check(`rpc lock_baseline with a ${who} JWT -> refused`, refused(x.status), { status: x.status, body: (await x.text()).slice(0, 200) });
  }
  check("rpc refusals wrote nothing", (await count(learner.id, "baseline_countersigned")) === 0 && (await count(learner.id, "baseline_locked")) === 2, null);

  r = await post(`/api/staff/learner/${staff.id}/countersign`, { baseline_event_id: lock2 }, staff);
  check("countersign: staff on their own id -> 403 self", r.status === 403 && r.json?.error === "self", r);
  r = await post(`/api/staff/learner/${learner.id}/countersign`, { baseline_event_id: "x" }, staff);
  check("countersign: malformed id -> 400", r.status === 400, r);
  r = await post(`/api/staff/learner/${learner.id}/countersign`, { baseline_event_id: lock1 }, staff);
  check("countersign: stale baseline id -> 409 stale", r.status === 409 && r.json?.error === "stale", r);
  const [a, b] = await Promise.all([
    post(`/api/staff/learner/${learner.id}/countersign`, { baseline_event_id: lock2 }, staff),
    post(`/api/staff/learner/${learner.id}/countersign`, { baseline_event_id: lock2 }, staff),
  ]);
  check(
    "countersign: double tap -> both 200, one is 'already', same event",
    a.status === 200 && b.status === 200 &&
      [a.json?.data?.countersign?.already, b.json?.data?.countersign?.already].sort().join() === "false,true" &&
      a.json?.data?.countersign?.event_id === b.json?.data?.countersign?.event_id,
    { a, b },
  );
  check("countersign: one row written", (await count(learner.id, "baseline_countersigned")) === 1, null);
  {
    const { data } = await admin.from("profile_event").select("data").eq("user_id", learner.id).eq("type", "baseline_countersigned").single();
    check(
      "countersign: event names the baseline and the staff id and role, no email",
      data.data.baseline_event_id === lock2 && data.data.by_user_id === staff.id && data.data.by_role === "instructor" && !JSON.stringify(data.data).includes("@"),
      data.data,
    );
  }
  r = await post("/api/artifacts/baseline", { draft: bl({ frequency: { count: 2, per: "week" } }) }, learner);
  check("baseline: lock after countersign -> 409 frozen", r.status === 409 && r.json?.error === "frozen", r);
  {
    const { data } = await admin.from("user_profile").select("baseline").eq("user_id", learner.id).single();
    check(
      "baseline: snapshot still the countersigned lock",
      data.baseline?.locked_event_id === lock2 && !!data.baseline?.countersigned_at && data.baseline?.frequency?.count === 4,
      data.baseline,
    );
  }
  check("baseline: frozen lock wrote no event", (await count(learner.id, "baseline_locked")) === 2, null);

  // --- 6. Track confirmation ---
  r = await post(`/api/staff/learner/${learner.id}/track`, { track: "SPINE" }, staff);
  check("track: SPINE is not a confirmable track -> 400", r.status === 400, r);
  r = await post(`/api/staff/learner/${learner.id}/track`, { track: "SMB" }, staff);
  check("track: SMB -> 200 written", r.status === 200 && r.json?.data?.track_confirmed?.unchanged === false, r);
  r = await post(`/api/staff/learner/${learner.id}/track`, { track: "SMB" }, staff);
  check("track: same again -> unchanged, nothing written", r.status === 200 && r.json?.data?.track_confirmed?.unchanged === true && (await count(learner.id, "track_confirmed")) === 1, r);
  r = await post(`/api/staff/learner/${other.id}/track`, { track: "DOC" }, staff);
  check("track: learner with no active cohort -> 403", r.status === 403, r);
  {
    const { data } = await admin.from("user_profile").select("track").eq("user_id", learner.id).single();
    check("track: user_profile.track untouched", data.track === "docs_admin", data);
  }

  // --- 7. RLS and grants (0011) ---
  let q = await restRows("harness_template?select=id", ANON);
  check("templates: anon reads 0", q.rows?.length === 0 || refused(q.status), q);
  q = await restRows("harness_template?select=id", other.token);
  check("templates: registered, not enrolled learner reads 0", q.rows?.length === 0, q);
  q = await restRows("harness_template?select=id", learner.token);
  check("templates: enrolled learner reads 3", q.rows?.length === 3, { status: q.status, n: q.rows?.length });
  q = await restRows("harness_template?select=id", staff.token);
  check("templates: staff reads 3", q.rows?.length === 3, { status: q.status, n: q.rows?.length });
  let x = await rest("harness_template", { method: "POST", body: JSON.stringify({ id: "SP-HL-99", name: "x", doc_type: "x", parts: {}, sort_order: 99 }) }, learner.token);
  check("templates: learner insert refused", refused(x.status), { status: x.status });
  x = await rest("harness_template?id=eq.SP-HL-01", { method: "PATCH", body: JSON.stringify({ name: "바뀜" }) }, learner.token);
  check("templates: learner update refused", refused(x.status), { status: x.status });
  {
    const { data } = await admin.from("harness_template").select("id, name").order("id");
    check("templates: still 3 rows, none renamed", data.length === 3 && data.every((t) => t.name !== "바뀜"), data.map((t) => t.id));
  }

  x = await rest("rpc/cohort_week_signals", { method: "POST", body: JSON.stringify({ p_cohort: cohort.id }) }, learner.token);
  let body = await x.json().catch(() => null);
  check("cohort_week_signals: learner JWT -> 0 rows", x.status === 200 && Array.isArray(body) && body.length === 0, { status: x.status, body });
  x = await rest("rpc/cohort_week_signals", { method: "POST", body: JSON.stringify({ p_cohort: cohort.id }) }, staff.token);
  body = await x.json().catch(() => null);
  const sig = Array.isArray(body) ? body.find((row) => row.user_id === learner.id) : null;
  check(
    "cohort_week_signals: staff JWT -> the learner's Week 3 signals",
    x.status === 200 && sig && Number(sig.blueprint_count) === 2 && Number(sig.baseline_event_id) === lock2 && !!sig.countersigned_at &&
      sig.confirmed_track === "SMB" && Number(sig.dry_run_minutes) === 20 && sig.workspace_ready === true,
    { status: x.status, sig },
  );

  for (const type of ["workspace_setup", "blueprint_submitted", "time_log_entry", "baseline_locked", "baseline_countersigned"]) {
    const mine = await restRows(`profile_event?select=id&user_id=eq.${learner.id}&type=eq.${type}`, learner.token);
    const theirs = await restRows(`profile_event?select=id&user_id=eq.${learner.id}&type=eq.${type}`, other.token);
    const staffRead = await restRows(`profile_event?select=id&user_id=eq.${learner.id}&type=eq.${type}`, staff.token);
    check(
      `${type}: learner reads own, another learner 0, staff all`,
      mine.rows?.length > 0 && theirs.rows?.length === 0 && staffRead.rows?.length === mine.rows?.length,
      { mine: mine.rows?.length, theirs: theirs.rows?.length, staff: staffRead.rows?.length },
    );
  }
  q = await restRows(`user_profile?select=baseline&user_id=eq.${learner.id}`, other.token);
  check("user_profile (baseline): another learner reads 0", q.rows?.length === 0, q);
  q = await restRows(`user_profile?select=baseline&user_id=eq.${learner.id}`, staff.token);
  check("user_profile (baseline): staff reads it", q.rows?.[0]?.baseline?.locked_event_id === lock2, q);
  x = await rest("profile_event", {
    method: "POST",
    body: JSON.stringify({ user_id: learner.id, type: "baseline_countersigned", visibility: "learner", data: { version: 1, baseline_event_id: lock2 } }),
  }, learner.token);
  check("learner cannot insert a countersign event directly", refused(x.status) || x.status === 400, { status: x.status });
  x = await rest("profile_event", {
    method: "POST",
    body: JSON.stringify({ user_id: learner.id, type: "track_confirmed", visibility: "learner", data: { version: 1, track: "DOC" } }),
  }, learner.token);
  check("learner cannot insert a track_confirmed event directly", refused(x.status) || x.status === 400, { status: x.status });

  // --- 7b. Findings fixes (phase-2c Findings, 2026-10-04) ---
  // Two harnesses: A saved first, then B, then a new version of A. The
  // workspace lab lists them by first save (A before B), and the staff page's
  // raw event table never carries a harness example.
  {
    const mark = `EXAMPLEMARK${run}`;
    const harness = (id, name, version, at) => ({
      user_id: learner.id,
      type: "harness_saved",
      visibility: "learner",
      created_at: new Date(Date.now() - at * 60_000).toISOString(),
      data: {
        version: 1, harness_id: id, harness_version: version, name, doc_type: "보고서",
        parts: { role: "역할", context: "", format: "", rules: ["규칙"], example: mark, example_ref: null, fallbacks: "" },
      },
    });
    const { data, error } = await admin
      .from("profile_event")
      .insert([harness(`a${run}`, `첫하네스${run}`, 1, 30), harness(`b${run}`, `둘째하네스${run}`, 1, 20), harness(`a${run}`, `첫하네스${run}`, 2, 10)])
      .select("id");
    if (error) throw new Error(`harness rows: ${error.message}`);
    harnessRows.push(...data.map((r) => r.id));
    const ws3 = await page("/app/lab/workspace", learner);
    const ia = ws3.html.indexOf(`첫하네스${run}`), ib = ws3.html.indexOf(`둘째하네스${run}`);
    check("workspace lab lists harnesses by first save (A before B after A's v2)", ia >= 0 && ib >= 0 && ia < ib, { ia, ib });
    const st = await page(`/staff/learner/${learner.id}`, staff);
    check("staff learner page: no harness example text anywhere in the HTML", st.status === 200 && !st.html.includes(mark), { status: st.status });
  }
  {
    const tl = await page("/app/lab/time-log?from=baseline", learner);
    check(
      "time log from the baseline: Week 3 header, no Week 1 header, 11주차 line",
      tl.status === 200 && tl.html.includes("3주차 실습") && !tl.html.includes("1주차 실습") && tl.html.includes("11주차에 비교할 기준 숫자") && !tl.html.includes("처음 숫자") && !tl.html.includes("12주차") && !tl.html.includes("‘전’"),
      { status: tl.status },
    );
    const co = await page("/app/courses", learner);
    check("courses: cohort track row hidden once a track is confirmed", co.status === 200 && !co.html.includes("문서·행정 트랙"), { status: co.status });
    const ed = await page("/app/education", learner);
    // 진단 요약 (up to 등록일): the survey track (docs_admin) in 트랙, the confirmed SMB in its own row.
    const summary = ed.html.slice(ed.html.indexOf("진단 요약"), ed.html.indexOf("등록일"));
    check(
      "education: 진단 요약 keeps the survey track and adds a 확정 트랙 row",
      ed.status === 200 && summary.includes("문서·행정 트랙") && summary.includes("확정 트랙") && summary.includes("소규모 사업·스타트업 트랙") &&
        summary.indexOf("문서·행정 트랙") < summary.indexOf("확정 트랙"),
      { status: ed.status, summary: summary.length },
    );
    check(
      "education: a line above the report names the survey track it is written for and the confirmed track",
      ed.html.includes("이 리포트는 진단 트랙(문서·행정 트랙) 기준이에요. 4주차부터는 확정 트랙(소규모 사업·스타트업 트랙)으로 들어요."),
      null,
    );
    {
      // The roster's 1주차 column counts "before" entries only, not the dry run.
      const { data: logs } = await admin.from("profile_event").select("data").eq("user_id", learner.id).eq("type", "time_log_entry");
      const beforeCount = (logs ?? []).filter((x) => x.data?.method === "before" && !x.data?.dry_run).length;
      const sc = await page(`/staff/cohort/${cohort.id}`, staff);
      const roster = sc.html.replace(/<!-- -->/g, "").slice(sc.html.replace(/<!-- -->/g, "").indexOf("수강생 명단"));
      check(
        "cohort roster: 1주차 시간 기록 counts before entries only (dry runs and pipeline runs left out)",
        sc.status === 200 && (logs ?? []).length > beforeCount && roster.includes(`시간 기록 ${beforeCount}건`) && !roster.includes(`시간 기록 ${(logs ?? []).length}건`),
        { status: sc.status, beforeCount, all: (logs ?? []).length },
      );
    }
  }

  // --- 7c. Findings fixes, second browser pass (phase-2c Findings) ---
  {
    // The Week 3 assignment opens the time log in its own context: Week 3
    // header, method on 파이프라인, never the Week 1 "기존 방식" note.
    const w3 = await page("/app/courses/week/3", learner);
    check("week 3 assignment links to the time log with ?from=week3", w3.status === 200 && w3.html.includes('href="/app/lab/time-log?from=week3"'), { status: w3.status });
    const tl = await page("/app/lab/time-log?from=week3", learner);
    const pipelineSelected = /nb-selected[^"]*"[^>]*>(?:(?!<\/label>)[\s\S])*?<span>파이프라인<\/span>/.test(tl.html);
    check(
      "time log from the Week 3 assignment: Week 3 header, 파이프라인 preselected, no Week 1 note or 'before' line",
      tl.status === 200 && tl.html.includes("3주차 실습") && !tl.html.includes("1주차 실습") && pipelineSelected &&
        tl.html.includes("기준선에 쓰는 ‘기존 방식’ 기록이 아니에요") && !tl.html.includes("처음 기록") && !tl.html.includes("1주차에는 늘 하던 대로") && !tl.html.includes("11주차에 비교할"),
      { status: tl.status, pipelineSelected },
    );
    const tl1 = await page("/app/lab/time-log", learner);
    check("time log without ?from: still the Week 1 page on 기존 방식", tl1.status === 200 && tl1.html.includes("1주차 실습") && tl1.html.includes("1주차에는 늘 하던 대로"), { status: tl1.status });
    // The blueprint's sticky bar sits below the sticky site header, not under it.
    const bp = await page("/app/lab/blueprint", learner);
    check("blueprint sticky bar is offset by the header height", bp.status === 200 && bp.html.includes("sticky top-[var(--site-header-h)] z-20") && !bp.html.includes("sticky top-0 z-20"), { status: bp.status });
    // After the countersign the success line sits after the baseline, where the button was.
    const st = await page(`/staff/learner/${learner.id}?countersigned=1`, staff);
    const iLine = st.html.indexOf("강사 확인을 마쳤어요"), iSection = st.html.indexOf("3주차 · 파이프라인과 기준선");
    check("staff page after a countersign: success line inside the Week 3 card", st.status === 200 && iLine > iSection && iSection >= 0, { status: st.status, iLine, iSection });
  }

  // --- 7d. Findings fixes, third pass (phase-2c Findings) ---
  {
    // The cohort queue signs the evidence of a waiting baseline. The real
    // baseline is countersigned by now, so a waiting copy with evidence is
    // put on the profile for one page load and the real one restored.
    const { data: prof } = await admin.from("user_profile").select("baseline").eq("user_id", learner.id).single();
    const real = prof.baseline;
    const evPath = `${learner.id}/${run}-queue.png`;
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
    const { error: upError } = await admin.storage.from("evidence").upload(evPath, png, { contentType: "image/png", upsert: true });
    try {
      const { countersigned_at, countersigned_by, countersign_event_id, ...unsigned } = real;
      void countersigned_at; void countersigned_by; void countersign_event_id;
      await admin.from("user_profile").update({ baseline: { ...unsigned, evidence_ref: evPath } }).eq("user_id", learner.id);
      const q = await page(`/staff/cohort/${cohort.id}`, staff);
      const queue = q.html.slice(q.html.indexOf("기준선 확인 대기"), q.html.indexOf("트랙 확정"));
      check(
        "cohort queue: a waiting baseline's evidence opens (signed link, no failure line)",
        !upError && q.status === 200 && queue.includes("증빙 이미지 열기") && queue.includes("/object/sign/evidence/") && !queue.includes("이미지를 열 수 없어요"),
        { status: q.status, upError: upError?.message, queue: queue.length },
      );
    } finally {
      await admin.from("user_profile").update({ baseline: real }).eq("user_id", learner.id);
      await admin.storage.from("evidence").remove([evPath]);
    }

    // After a countersign from the queue (?countersigned=<userId>) the queue says whose.
    const cs = await page(`/staff/cohort/${cohort.id}?countersigned=${learner.id}`, staff);
    const iNotice = cs.html.indexOf("님 기준선 확인을 마쳤어요"), iQueue = cs.html.indexOf("기준선 확인 대기"), iTrack = cs.html.indexOf("트랙 확정");
    check("cohort page after a countersign: success line at the top of the queue", cs.status === 200 && iNotice > iQueue && iNotice < iTrack && iQueue >= 0, { status: cs.status, iNotice, iQueue, iTrack });
    const csNone = await page(`/staff/cohort/${cohort.id}?countersigned=${other.id}`, staff);
    check("cohort page: no success line for a learner who is not countersigned", csNone.status === 200 && !csNone.html.includes("님 기준선 확인을 마쳤어요"), { status: csNone.status });
    const ls = await page(`/staff/learner/${learner.id}?countersigned=${learner.id}`, staff);
    check("learner page reads ?countersigned=<userId> too", ls.status === 200 && ls.html.includes("강사 확인을 마쳤어요"), { status: ls.status });

    // A confirmation from another cohort is not current: staff see none, the
    // learner sees none, and the same track is written again for this cohort.
    const otherCohort = crypto.randomUUID();
    await admin.from("profile_event").insert({
      user_id: learner.id, type: "track_confirmed", visibility: "learner",
      data: { version: 1, track: "SMB", survey_track: "docs_admin", cohort_id: otherCohort, by_user_id: staff.id, by_role: "instructor" },
    });
    const before = await count(learner.id, "track_confirmed");
    const sc = await page(`/staff/cohort/${cohort.id}`, staff);
    const trackBlock = sc.html.slice(sc.html.indexOf("트랙 확정"), sc.html.indexOf("주차 열기"));
    check("cohort page: a confirmation made for another cohort shows as not confirmed", sc.status === 200 && trackBlock.includes("아직 확정 안 함") && !sc.html.slice(sc.html.indexOf("수강생 명단")).includes("확정 트랙"), { status: sc.status });
    const lc = await page("/app/courses", learner);
    check("courses: a confirmation made for another cohort is not shown", lc.status === 200 && !lc.html.includes("확정 트랙"), { status: lc.status });
    r = await post(`/api/staff/learner/${learner.id}/track`, { track: "SMB" }, staff);
    check(
      "track: same track after a cohort change -> written for this cohort",
      r.status === 200 && r.json?.data?.track_confirmed?.unchanged === false && (await count(learner.id, "track_confirmed")) === before + 1,
      r,
    );
    r = await post(`/api/staff/learner/${learner.id}/track`, { track: "SMB" }, staff);
    check("track: and again -> unchanged", r.status === 200 && r.json?.data?.track_confirmed?.unchanged === true && (await count(learner.id, "track_confirmed")) === before + 1, r);
    const sc2 = await page(`/staff/cohort/${cohort.id}`, staff);
    check("cohort page: the confirmation for this cohort shows in the roster again", sc2.status === 200 && sc2.html.slice(sc2.html.indexOf("수강생 명단")).includes("확정 트랙"), { status: sc2.status });
    // The 트랙 확정 row names the confirmed track, not only the survey track and a date.
    const trackBlock2 = sc2.html.slice(sc2.html.indexOf("트랙 확정"), sc2.html.indexOf("주차 열기"));
    check(
      "cohort page: 트랙 확정 row names the confirmed track beside the survey track",
      trackBlock2.includes("문서·행정 트랙") && trackBlock2.includes(" · 확정 사업자·스타트업 트랙 (") && !/트랙 · \d{4}\. \d+\. \d+\. 확정/.test(trackBlock2),
      { len: trackBlock2.length },
    );

    // The dry run sends the learner to the corrections page in Week 3 context.
    const bp = await page("/app/lab/blueprint", learner);
    check("blueprint dry run links to the corrections page with ?from=week3", bp.status === 200 && bp.html.includes('href="/app/lab/corrections?from=week3"') && !bp.html.includes('href="/app/lab/corrections"'), { status: bp.status });
    const cr = await page("/app/lab/corrections?from=week3", learner);
    check("corrections from the dry run: Week 3 header, not the Week 2 one", cr.status === 200 && cr.html.includes("3주차 실습") && !cr.html.includes("2주차 실습") && cr.html.includes("시험 실행의 확인 지점에서"), { status: cr.status });
    const cr2 = await page("/app/lab/corrections", learner);
    check("corrections without ?from: still the Week 2 page", cr2.status === 200 && cr2.html.includes("2주차 실습"), { status: cr2.status });
  }

  // --- 7e. Findings fixes, fourth pass (phase-2c Findings) ---
  {
    // One date for the baseline's "before" entry: the day the work was done
    // (two days ago), for the learner and staff alike. The log date (today)
    // shows only beside the staff flag.
    const seoul = { timeZone: "Asia/Seoul" };
    const workedLong = new Date(beforeStartedAt).toLocaleDateString("ko-KR", { ...seoul, year: "numeric", month: "long", day: "numeric" });
    const todayLong = new Date().toLocaleDateString("ko-KR", { ...seoul, year: "numeric", month: "long", day: "numeric" });
    const workedShort = new Date(beforeStartedAt).toLocaleDateString("ko-KR", { ...seoul, year: "numeric", month: "numeric", day: "numeric" });
    const todayShort = new Date().toLocaleDateString("ko-KR", { ...seoul, year: "numeric", month: "numeric", day: "numeric" });
    const bl3 = await page("/app/lab/baseline", learner);
    check(
      "learner baseline: the before time shows the work date, not the log date",
      bl3.status === 200 && bl3.html.includes(`${workedLong}에 잰`) && !bl3.html.includes(`${todayLong}에 잰`) && !bl3.html.includes("에 남긴 ‘기존 방식’ 기록"),
      { status: bl3.status, workedLong },
    );
    check("learner baseline: no ‘전’ wording, the evidence part is 하네스 쓰기 전 결과물", bl3.html.includes("하네스 쓰기 전 결과물") && !bl3.html.includes("‘전’"), null);
    const st3 = await page(`/staff/learner/${learner.id}`, staff);
    const beforeText = `기존 방식 · 업무 전체 45분 (${workedShort})`;
    check(
      "staff learner page: 기준 시간 and the 시험 실행 line use the work date",
      st3.status === 200 && st3.html.split(beforeText).length - 1 >= 2 && !st3.html.includes(`45분 (${todayShort})`),
      { status: st3.status, beforeText },
    );
    check(
      "staff learner page: the log date sits beside the 하루 안에 flag only",
      st3.html.includes("확정 전 하루 안에 남긴 기록") && st3.html.includes(`${todayShort}에 기록`),
      null,
    );
    check(
      "staff learner page: one name for the workspace (워크스페이스), raw label included",
      st3.html.includes("워크스페이스 준비됨") && st3.html.includes("워크스페이스 점검") && !st3.html.includes("작업 공간") && !st3.html.includes("작업 환경 준비"),
      null,
    );

    // A snapshot locked before time_started_at existed: the cohort queue
    // reads the cited entry's work date instead of the log date.
    const { data: prof } = await admin.from("user_profile").select("baseline").eq("user_id", learner.id).single();
    const real = prof.baseline;
    try {
      const { countersigned_at, countersigned_by, countersign_event_id, time_started_at, ...legacy } = real;
      void countersigned_at; void countersigned_by; void countersign_event_id; void time_started_at;
      await admin.from("user_profile").update({ baseline: legacy }).eq("user_id", learner.id);
      const q = await page(`/staff/cohort/${cohort.id}`, staff);
      const queue = q.html.slice(q.html.indexOf("기준선 확인 대기"), q.html.indexOf("트랙 확정"));
      check(
        "cohort queue: a snapshot without time_started_at still shows the work date",
        q.status === 200 && queue.includes(beforeText) && !queue.includes(`45분 (${todayShort})`) && !queue.includes("작업 공간"),
        { status: q.status, queue: queue.length },
      );
      const lb = await page("/app/lab/baseline", learner);
      check("learner baseline (frozen, read from the lock event) still shows the work date", lb.status === 200 && lb.html.includes(`${workedLong}에 잰`), { status: lb.status });
    } finally {
      await admin.from("user_profile").update({ baseline: real }).eq("user_id", learner.id);
    }

    // The Week 3 time log starts from the task the learner is on: the
    // baseline draft's (from=baseline), else the newest blueprint's.
    const switched = `후보 2 업무 ${run}`;
    await admin.from("artifact_draft").upsert(
      { user_id: learner.id, kind: "baseline", data: { version: 1, task: switched, current_method_stages: [], frequency: { count: null, per: "week" }, quality_checklist: [] } },
      { onConflict: "user_id,kind" },
    );
    const tlb = await page("/app/lab/time-log?from=baseline", learner);
    check("time log from the baseline: task starts from the baseline draft", tlb.status === 200 && tlb.html.includes(`value="${switched}"`), { status: tlb.status });
    const tlw = await page("/app/lab/time-log?from=week3", learner);
    check("time log from the Week 3 assignment: task starts from the newest blueprint", tlw.status === 200 && tlw.html.includes('value="월요일 주간보고"') && !tlw.html.includes(switched), { status: tlw.status });
    await admin.from("artifact_draft").delete().eq("user_id", learner.id).eq("kind", "baseline");
  }

  // --- 8. Pages (server-rendered with each account's own client) ---
  const pages = [
    ["/app/courses/week/3", learner, ["/app/lab/workspace", "/app/lab/blueprint", "/app/lab/blueprint#dry-run", "/app/lab/baseline", "/app/lab/time-log?from=week3"]],
    ["/app/lab/workspace", learner, ["워크스페이스 점검", ws.workspace_name]],
    ["/app/lab/blueprint", learner, ["파이프라인 설계도", "팀장님 검토 반영"]],
    ["/app/lab/baseline", learner, ["캡스톤 기준선", "강사 확인"]],
    ["/app/lab/time-log", learner, ["시험 실행"]],
    ["/app/lab/harness", learner, ["SP-HL-01", "SP-HL-03"]],
    ["/app/education", learner, ["파이프라인 설계도", "강사 확인 완료"]],
    ["/app/courses", learner, ["확정 트랙", "소규모 사업·스타트업 트랙"]],
    [`/staff/cohort/${cohort.id}`, staff, ["기준선 확인 대기", "트랙 확정", "기준선 확인 완료"]],
    [`/staff/learner/${learner.id}`, staff, ["팀장님 검토 반영", "시험 실행"]],
  ];
  for (const [path, who, needles] of pages) {
    const p = await page(path, who);
    const missing = needles.filter((n) => !p.html.includes(n));
    check(`page ${path.replace(learner.id, ":learner").replace(cohort.id, ":cohort")} -> 200 with ${needles.length} expected strings`, p.status === 200 && missing.length === 0, { status: p.status, location: p.location, missing });
  }
  const p = await page("/app/lab/harness", other);
  check("page /app/lab/harness for a learner who is not enrolled -> no templates sent", p.status === 200 && !p.html.includes("SP-HL-0"), { status: p.status });

  // --- 9. Findings fixes, sixth pass (phase-2c Findings) ---
  // Rows inserted here (a third harness, two blueprints, an agent-path
  // workspace check) are the newest of their type and go in the finally.
  {
    const insert = async (rows) => {
      const { data, error } = await admin.from("profile_event").insert(rows).select("id");
      if (error) throw new Error(`pass 6 rows: ${error.message}`);
      harnessRows.push(...data.map((row) => row.id));
    };
    const ago = (minutes) => new Date(Date.now() - minutes * 60_000).toISOString();
    // The option the server rendered as selected, and the option order.
    const selectOf = (html) => {
      const start = html.indexOf("<select");
      const block = html.slice(start, html.indexOf("</select>", start));
      const options = [...block.matchAll(/<option([^>]*)>/g)].map((m) => ({
        value: /value="([^"]*)"/.exec(m[1])?.[1],
        selected: /\sselected(=""|\s|$)/.test(m[1]),
      }));
      return { order: options.map((o) => o.value), selected: options.find((o) => o.selected)?.value ?? null };
    };

    // A third harness C, saved most recently of all: Week 2's default.
    await insert([{
      user_id: learner.id, type: "harness_saved", visibility: "learner", created_at: ago(1),
      data: {
        version: 1, harness_id: `c${run}`, harness_version: 1, name: `셋째하네스${run}`, doc_type: "보고서",
        parts: { role: "역할", context: "", format: "", rules: ["규칙"], example: "", example_ref: null, fallbacks: "" },
      },
    }]);
    // The newest blueprint links B (second saved, not the newest save) to
    // its AI stage before the first checkpoint, and C to a stage after it.
    const blueprintRow = (links, at) => ({
      user_id: learner.id, type: "blueprint_submitted", visibility: "learner", created_at: ago(at),
      data: {
        version: 1, task: "월요일 주간보고", source: { work_map_event_id: null, candidate_rank: null },
        stages: [
          { id: `s${run}p`, name: "자료 모으기", kind: "P", actor: "human", needs: "", harness_id: null, order: 1 },
          { id: `s${run}q`, name: "요약하기", kind: "P", actor: "assistant", needs: "", harness_id: links[0], order: 2 },
          { id: `s${run}r`, name: "양식에 맞추기", kind: "P", actor: "assistant_checked", needs: "", harness_id: links[1], order: 3 },
        ],
        checkpoints: [
          { id: `c${run}p`, after_stage_id: `s${run}q`, after_stage: 2, checks: ["숫자가 원자료와 맞는지"] },
          { id: `c${run}q`, after_stage_id: `s${run}r`, after_stage: 3, checks: ["양식이 맞는지"] },
        ],
        trigger: "월요일 아침 8시", delivery: "팀장님께 메일로",
      },
    });
    await insert([blueprintRow([`b${run}`, `c${run}`], 0.5)]);
    let cr = selectOf((await page("/app/lab/corrections?from=week3", learner)).html);
    check(
      "corrections from the dry run: harness of the AI stage before the first checkpoint preselected",
      cr.selected === `b${run}`,
      cr,
    );
    check(
      "corrections: harnesses listed by first save (A, B, C), as the workspace lab",
      cr.order.indexOf(`a${run}`) < cr.order.indexOf(`b${run}`) && cr.order.indexOf(`b${run}`) < cr.order.indexOf(`c${run}`) && cr.order.indexOf(`a${run}`) >= 0,
      cr,
    );
    const cr2 = selectOf((await page("/app/lab/corrections", learner)).html);
    check("corrections without ?from: the most recently saved harness preselected", cr2.selected === `c${run}`, cr2);
    // No linked harness on the newest blueprint: the first-saved harness.
    await insert([blueprintRow([null, null], 0.2)]);
    cr = selectOf((await page("/app/lab/corrections?from=week3", learner)).html);
    check("corrections from the dry run, nothing linked: the first-saved harness preselected", cr.selected === `a${run}`, cr);

    // The agent path: the harness card says project folder and files only.
    await insert([{
      user_id: learner.id, type: "workspace_setup", visibility: "learner", created_at: ago(0.1),
      data: { ...ws, version: 1, path: "agent", assistant: "claude_code", assistant_other: null },
    }]);
    const wa = await page("/app/lab/workspace", learner);
    check(
      "workspace lab, agent path: harness card titled 프로젝트 폴더, both harnesses as files",
      wa.status === 200 && wa.html.includes("프로젝트 폴더에 넣을 하네스") && wa.html.includes("두 하네스 모두 텍스트 파일로 저장해 프로젝트 폴더에 지시 파일로 넣어요.") &&
        !wa.html.includes("워크스페이스에 넣을 하네스") && !wa.html.includes("첫 번째 하네스는 복사해서 지시 칸에"),
      { status: wa.status },
    );
  }
} finally {
  if (harnessRows.length > 0) await admin.from("profile_event").delete().in("id", harnessRows);
  if (dryEvidence) await admin.storage.from("evidence").remove([dryEvidence]);
  const { error } = await admin.from("cohort").delete().eq("id", cohort.id);
  if (error) console.error("cohort cleanup failed:", error.message);
}

const failed = results.filter((x) => !x.pass).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed > 0 ? 1 : 0);
