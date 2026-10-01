// Checks for the review fixes: idempotent re-save, big harness draft, privileges as seen by API roles.
import { readFileSync } from "node:fs";
const S = process.argv[2];
const BASE = "http://localhost:3005";
const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split(/\r?\n/).map((l) => /^([A-Z0-9_]+)=(.*)$/.exec(l.trim())).filter(Boolean).map((m) => [m[1], m[2]]),
);
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL, ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const snippet = readFileSync(`${S}/learner-cookie.txt`, "utf8");
const pairs = [...snippet.matchAll(/document\.cookie="([^;"]+);/g)].map((m) => m[1]);
const cookie = pairs.join("; ");
const session = JSON.parse(Buffer.from(pairs.map((p) => p.slice(p.indexOf("=") + 1)).join("").replace(/^base64-/, ""), "base64url").toString("utf8"));
const uid = session.user.id;
const log = (name, pass, detail) => console.log(`${pass ? "PASS" : "FAIL"}  ${name}${pass ? "" : "  -> " + JSON.stringify(detail).slice(0, 500)}`);
const api = (path, method, body) => fetch(BASE + path, { method, headers: { "content-type": "application/json", cookie }, body: JSON.stringify(body) }).then(async (r) => ({ status: r.status, json: await r.json().catch(() => null) }));
const rest = (path, init = {}, token = session.access_token) => fetch(`${URL_}/rest/v1/${path}`, { ...init, headers: { apikey: ANON, authorization: `Bearer ${token}`, "content-type": "application/json", prefer: "return=representation", ...(init.headers ?? {}) } });

// find a harness of this learner that is at version 3 (made by test-2b.mjs)
const rows = await (await rest(`profile_event?select=data&user_id=eq.${uid}&type=eq.harness_saved&data->>harness_version=eq.3`)).json();
const saved = rows[0].data;
const item = { id: saved.harness_id, name: saved.name, doc_type: saved.doc_type, ...saved.parts };
delete item.example_ref;

// 1. identical re-save: same version, no new row
const before = (await (await rest(`profile_event?select=id&user_id=eq.${uid}&type=eq.harness_saved`)).json()).length;
let r = await api("/api/artifacts/harness", "POST", { item });
const after = (await (await rest(`profile_event?select=id&user_id=eq.${uid}&type=eq.harness_saved`)).json()).length;
log("identical re-save returns the same version and writes nothing", r.status === 200 && r.json?.data?.harness_version === 3 && after === before, { r, before, after });

// 2. five different saves at once: five distinct, contiguous versions
const outs = await Promise.all(Array.from({ length: 5 }, (_, i) => api("/api/artifacts/harness", "POST", { item: { ...item, context: `동시 저장 ${i}` } })));
const versions = outs.map((o) => o.json?.data?.harness_version).sort((a, b) => a - b);
log("five parallel saves -> versions 4,5,6,7,8", JSON.stringify(versions) === "[4,5,6,7,8]", { versions, statuses: outs.map((o) => o.status) });

// 3. five identical saves at once: one new version, the rest answer with it
const same = await Promise.all(Array.from({ length: 5 }, () => api("/api/artifacts/harness", "POST", { item: { ...item, context: "같은 내용 동시 저장" } })));
const sv = same.map((o) => o.json?.data?.harness_version);
const stored = await (await rest(`profile_event?select=id&user_id=eq.${uid}&type=eq.harness_saved&data->>harness_id=eq.${item.id}`)).json();
log("five identical parallel saves all succeed, no duplicate version numbers stored", same.every((o) => o.status === 200) && stored.length >= 9 && stored.length <= 13, { sv, stored: stored.length });
const dup = await (await rest(`profile_event?select=v:data->>harness_version&user_id=eq.${uid}&type=eq.harness_saved&data->>harness_id=eq.${item.id}`)).json();
const vs = dup.map((d) => d.v);
log("stored version numbers are unique", new Set(vs).size === vs.length, { vs });

// 4. harness draft of ~500 KB is accepted (12 full harnesses); 700 KB refused
const full = (id) => ({ id, name: "가".repeat(60), doc_type: "문서", role: "나".repeat(1500), context: "다".repeat(1500), format: "라".repeat(1500), fallbacks: "마".repeat(1500), example: "바".repeat(6000), rules: Array.from({ length: 10 }, () => "사".repeat(200)) });
const draft = { version: 1, items: Array.from({ length: 12 }, (_, i) => full(`big-${i}`)) };
const bytes = Buffer.byteLength(JSON.stringify(draft));
r = await api("/api/drafts/harness", "PUT", { data: draft });
log(`harness draft of ${Math.round(bytes / 1024)} KB saves`, r.status === 200, r);
r = await api("/api/drafts/harness", "PUT", { data: { version: 1, items: [], pad: "x".repeat(700 * 1024) } });
log("harness draft of 700 KB refused with 413", r.status === 413, r);
r = await api("/api/drafts/drill", "PUT", { data: { version: 1, pad: "x".repeat(300 * 1024) } });
log("other draft kinds keep the 200 KB cap", r.status === 413, r);
// put a small draft back so the page shows saved state
r = await api("/api/drafts/harness", "PUT", { data: { version: 1, items: [] } });
log("draft reset", r.status === 200, r);

// 5. privileges after 0010, as the API roles see them
r = await rest(`profile_event?user_id=eq.${uid}&type=eq.harness_saved`, { method: "DELETE" });
log("learner DELETE on profile_event refused (no privilege)", r.status === 401 || r.status === 403, { status: r.status, body: (await r.text()).slice(0, 200) });
r = await rest(`profile_event?user_id=eq.${uid}`, { method: "PATCH", body: JSON.stringify({ visibility: "staff" }) });
log("learner UPDATE on profile_event refused (no privilege)", r.status === 401 || r.status === 403, { status: r.status });
r = await rest(`survey_response?id=eq.00000000-0000-0000-0000-000000000000`, { method: "PATCH", body: JSON.stringify({ path: "x" }) }, ANON);
log("anon UPDATE on survey_response refused (no privilege)", r.status === 401 || r.status === 403, { status: r.status });
r = await rest(`user_profile?user_id=eq.${uid}`, { method: "DELETE" });
log("learner DELETE on own user_profile refused", r.status === 401 || r.status === 403, { status: r.status });
r = await rest(`user_profile?user_id=eq.${uid}`, { method: "PATCH", body: JSON.stringify({ job_title: "과장" }) });
let body = await r.json().catch(() => null);
log("learner can still update own identity column", r.status === 200 && body?.[0]?.job_title === "과장", { status: r.status, body });
r = await rest(`user_profile?user_id=eq.${uid}`, { method: "PATCH", body: JSON.stringify({ track: "data_numbers" }) });
log("learner still cannot update a derived column (track)", r.status === 401 || r.status === 403, { status: r.status });
r = await rest(`artifact_draft?select=kind&user_id=eq.${uid}`);
body = await r.json();
log("learner reads own drafts", r.status === 200 && Array.isArray(body), { status: r.status, body });
r = await rest(`cohort`, { method: "POST", body: JSON.stringify({ name: "forged", code: "FORGED", track_code: "DOC" }) });
log("learner INSERT on cohort refused", r.status === 401 || r.status === 403, { status: r.status });
