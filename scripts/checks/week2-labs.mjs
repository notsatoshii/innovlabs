// Phase 2b route test against the dev server (port 3005) and the real database.
import { readFileSync } from "node:fs";
const S = process.argv[2];
const BASE = "http://localhost:3005";
const snippet = readFileSync(`${S}/learner-cookie.txt`, "utf8");
const cookie = [...snippet.matchAll(/document\.cookie="([^;"]+);/g)].map((m) => m[1]).join("; ");
const results = [];
async function post(path, body, withCookie = true, raw = null) {
  const res = await fetch(BASE + path, {
    method: "POST",
    headers: { "content-type": "application/json", origin: BASE, ...(withCookie ? { cookie } : {}) },
    body: raw ?? JSON.stringify(body),
  });
  let json = null;
  try { json = await res.json(); } catch {}
  return { status: res.status, json };
}
function check(name, cond, detail) {
  results.push({ name, pass: !!cond });
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${cond ? "" : "  -> " + JSON.stringify(detail)}`);
}
const H = (id, over = {}) => ({
  id, name: "주간업무보고", doc_type: "주간 보고서", role: "팀의 주간 업무를 정리하는 담당자",
  context: "매주 금요일 팀장에게 올리는 보고", format: "제목, 이번 주 한 일, 다음 주 할 일 순서로 씁니다",
  rules: ["예시는 구조와 말투만 보여 줍니다. 예시의 사실이나 수치를 다시 쓰지 않습니다.", "숫자는 원문 그대로 씁니다"],
  example: "1. 이번 주 한 일\n- 견적서 3건 발송", fallbacks: "자료가 없으면 비워 두고 표시합니다", ...over,
});
const run = "t" + Date.now().toString(36);

let r = await post("/api/artifacts/harness", { item: H(`${run}-a`) }, false);
check("harness: no session -> 401", r.status === 401, r);

r = await post("/api/artifacts/harness", { item: { id: "bad id!" } });
check("harness: malformed id -> 400", r.status === 400, r);

r = await post("/api/artifacts/harness", { item: H(`${run}-a`, { name: "", rules: [] }) });
check("harness: missing fields -> 422 with Korean problems", r.status === 422 && r.json?.problems?.length >= 2, r);

r = await post("/api/artifacts/harness", { item: H(`${run}-a`, { rules: Array.from({ length: 11 }, (_, i) => `규칙 ${i + 1}`) }) });
check("harness: 11 rules -> 422", r.status === 422, r);

r = await post("/api/artifacts/harness", { item: H(`${run}-a`) });
check("harness: first save -> version 1", r.status === 200 && r.json?.data?.harness_version === 1, r);

r = await post("/api/artifacts/harness", { item: H(`${run}-a`, { context: "매주 금요일 오후 팀장에게 올리는 보고" }) });
check("harness: second save -> version 2 (JSON-path count)", r.status === 200 && r.json?.data?.harness_version === 2, r);

r = await post("/api/artifacts/harness", { item: H(`${run}-b`, { name: "회의록" }) });
check("harness: other id -> version 1 (count scoped by id)", r.status === 200 && r.json?.data?.harness_version === 1, r);

const big = H(`${run}-big`, {
  name: "가".repeat(60), role: "나".repeat(1500), context: "다".repeat(1500), format: "라".repeat(1500),
  fallbacks: "마".repeat(1500), example: "바".repeat(6000), rules: Array.from({ length: 10 }, () => "사".repeat(200)),
});
r = await post("/api/artifacts/harness", { item: big });
check("harness: every field at its limit -> saved", r.status === 200 && r.json?.data?.harness_version === 1, r);

r = await post("/api/artifacts/harness", { item: H(`${run}-over`, { example: "바".repeat(6001) }) });
check("harness: example over limit -> 422", r.status === 422, r);

r = await post("/api/artifacts/harness", null, true, "x".repeat(70 * 1024));
check("harness: oversized body -> 413", r.status === 413, r);

// corrections
r = await post("/api/artifacts/correction", { harness_id: `${run}-a`, original: "o", changed_to: "c", recurring: false, rule_written: false }, false);
check("correction: no session -> 401", r.status === 401, r);

r = await post("/api/artifacts/correction", { harness_id: `${run}-nope`, original: "원래 문장", changed_to: "고친 문장", recurring: false, rule_written: false });
check("correction: unknown harness -> 422", r.status === 422, r);

r = await post("/api/artifacts/correction", { harness_id: `${run}-a`, original: "", changed_to: "고친 문장", recurring: false, rule_written: false });
check("correction: empty original -> 422", r.status === 422, r);

r = await post("/api/artifacts/correction", { harness_id: `${run}-a`, original: "매출이 크게 늘었습니다", changed_to: "매출이 12% 늘었습니다", recurring: true, rule_written: false });
check("correction: valid -> saved", r.status === 200 && r.json?.data?.correction?.harness_id === `${run}-a`, r);

r = await post("/api/artifacts/correction", { harness_id: `${run}-a`, original: "매출이 크게 늘었습니다", changed_to: "매출이 12% 늘었습니다", recurring: true, rule_written: true });
check("correction: same line marked as rule -> saved", r.status === 200 && r.json?.data?.correction?.rule_written === true, r);

// library cap: fill to 12 harnesses, the 13th must be refused
let made = 3; // a, b, big
let capOk = true;
for (let i = 0; made < 12; i++, made++) {
  const x = await post("/api/artifacts/harness", { item: H(`${run}-f${i}`, { name: `채우기 ${i}` }) });
  if (x.status !== 200) { capOk = false; console.log("fill failed", x); break; }
}
r = await post("/api/artifacts/harness", { item: H(`${run}-13`, { name: "열세 번째" }) });
check("harness: 13th harness -> 422 (cap of 12)", capOk && r.status === 422, r);
r = await post("/api/artifacts/harness", { item: H(`${run}-a`, { context: "세 번째 저장" }) });
check("harness: at the cap, an existing harness still saves -> version 3", r.status === 200 && r.json?.data?.harness_version === 3, r);

// pages (server-rendered with the learner's own client, so RLS and the JSON-path select run)
async function page(path) {
  const res = await fetch(BASE + path, { headers: { cookie }, redirect: "manual" });
  return { status: res.status, html: await res.text(), location: res.headers.get("location") };
}
let p = await page("/app/lab/harness");
check("page /app/lab/harness -> 200 and lists saved harnesses", p.status === 200 && p.html.includes("회의록") && p.html.includes("주간업무보고"), { status: p.status, location: p.location, has1: p.html.includes("회의록"), len: p.html.length });
p = await page(`/app/lab/harness?h=${run}-a`);
check("page /app/lab/harness?h= -> 200 with the latest version text", p.status === 200 && p.html.includes("세 번째 저장"), { status: p.status, has: p.html.includes("세 번째 저장") });
p = await page("/app/lab/corrections");
check("page /app/lab/corrections -> 200 and shows the line once", p.status === 200 && p.html.includes("매출이 12% 늘었습니다"), { status: p.status, has: p.html.includes("매출이 12% 늘었습니다") });
p = await page("/app/education");
check("page /app/education -> 200", p.status === 200, { status: p.status, location: p.location });

const failed = results.filter((x) => !x.pass).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
