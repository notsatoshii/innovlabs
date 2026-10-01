// Employee-path registration through POST /api/register with a full employee response.
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
const S = process.argv[2];
const BASE = "http://localhost:3005";
const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split(/\r?\n/).map((l) => /^([A-Z0-9_]+)=(.*)$/.exec(l.trim())).filter(Boolean).map((m) => [m[1], m[2]]),
);
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL, ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const snippet = readFileSync(`${S}/blank-cookie.txt`, "utf8");
const pairs = [...snippet.matchAll(/document\.cookie="([^;"]+);/g)].map((m) => m[1]);
const cookie = pairs.join("; ");
const session = JSON.parse(Buffer.from(pairs.map((p) => p.slice(p.indexOf("=") + 1)).join("").replace(/^base64-/, ""), "base64url").toString("utf8"));
const log = (name, pass, detail) => console.log(`${pass ? "PASS" : "FAIL"}  ${name}${pass ? "" : "  -> " + JSON.stringify(detail).slice(0, 600)}`);

const id = randomUUID();
const answers = {
  department: "admin_hr", rank: "assistant", mgmt_scope: "none",
  task_hours: { a: 4, b: 2, c: 3, d: 0, e: 1, f: 2, g: 3, h: 1 },
  top_time_sink: "a", most_repetitive: "a",
  ai_policy: "approved_only", pc_env: "browser_only",
  industry: "it", company_size: "100-299", ai_maturity: 2, tools_used: ["chatgpt"], work_stack: ["ms365"],
  primary_goal: "time", success_definition: "주간 보고서 작성 시간을 줄이고 싶어요", learning_time: "weekday_evening",
  friction_text: "보고서 포맷 맞추기", mirror_text: "", ten_hours_text: "기획 업무", attribution: "search",
};

// 1. anonymous insert, exactly as the browser does it (no RETURNING)
let r = await fetch(`${URL_}/rest/v1/survey_response`, {
  method: "POST",
  headers: { apikey: ANON, authorization: `Bearer ${ANON}`, "content-type": "application/json", prefer: "return=minimal" },
  body: JSON.stringify({ id, schema_version: "1.1", path: "employee", q5_variant: "grid", org_code: null, answers, scoring: null }),
});
log("anon inserts a survey_response after 0010", r.status === 201, { status: r.status, body: await r.text() });
console.log("response id:", id);

// 2. anonymous funnel event, as the browser logs it
r = await fetch(`${URL_}/rest/v1/profile_event`, {
  method: "POST",
  headers: { apikey: ANON, authorization: `Bearer ${ANON}`, "content-type": "application/json", prefer: "return=minimal" },
  body: JSON.stringify({ user_id: null, survey_response_id: id, type: "survey_completed", visibility: "learner", data: { version: 1, test: true } }),
});
log("anon inserts an allowlisted event after 0010", r.status === 201, { status: r.status, body: await r.text() });

const post = (body, headers = {}) => fetch(`${BASE}/api/register`, { method: "POST", headers: { "content-type": "application/json", origin: BASE, cookie, ...headers }, body: JSON.stringify(body) }).then(async (x) => ({ status: x.status, json: await x.json().catch(() => null) }));

r = await post({ survey_response_id: id, display_name: "테스트 직장인", privacy_consent: true, marketing_consent: false }, { origin: "https://evil.example" });
log("register: foreign origin refused", r.status === 403, r);
r = await post({ survey_response_id: id, display_name: "테스트 직장인", privacy_consent: false, marketing_consent: false });
log("register: no consent -> 422", r.status === 422 && r.json?.error === "consent_required", r);
r = await post({ survey_response_id: randomUUID(), display_name: "테스트 직장인", privacy_consent: true, marketing_consent: false });
log("register: unknown response -> 404", r.status === 404, r);

r = await post({ survey_response_id: id, display_name: "테스트 직장인", company_name: "테스트 주식회사", job_title: "대리", privacy_consent: true, marketing_consent: false });
log("register: employee response -> created", r.status === 200 && r.json?.data?.created === true && r.json?.data?.path === "employee", r);

// 3. the profile as the new learner reads it (RLS: own row)
const p = await fetch(`${URL_}/rest/v1/user_profile?select=path,track,track_via,depth_flag,core,survey_response_id,consent_version,display_name,org_code`, { headers: { apikey: ANON, authorization: `Bearer ${session.access_token}` } }).then((x) => x.json());
const row = p[0];
console.log("profile:", JSON.stringify({ ...row, core: row?.core ? Object.keys(row.core) : null }));
log("profile row: employee path, a track, depth flag from pc_env, response linked", row?.path === "employee" && typeof row?.track === "string" && row?.depth_flag === "browser_only" && row?.survey_response_id === id && row?.track_via === "auto", row);

// 4. events written by the server
const ev = await fetch(`${URL_}/rest/v1/profile_event?select=type&user_id=eq.${session.user.id}`, { headers: { apikey: ANON, authorization: `Bearer ${session.access_token}` } }).then((x) => x.json());
log("registered event written", ev.some((e) => e.type === "registered"), ev);

// 5. the same response cannot seed a second profile; a second call updates identity only
r = await post({ survey_response_id: id, display_name: "테스트 직장인 2", privacy_consent: true, marketing_consent: true });
log("register again: existing row updated, not recreated", r.status === 200 && r.json?.data?.created === false, r);

// 6. pages for the new employee learner
for (const path of ["/app/profile", "/app/courses", "/app/education", "/app/lab/harness"]) {
  const res = await fetch(BASE + path, { headers: { cookie }, redirect: "manual" });
  log(`page ${path} -> 200`, res.status === 200, { status: res.status, location: res.headers.get("location") });
}
