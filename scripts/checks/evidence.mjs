// Evidence upload end to end: storage policies, the time-log route, signed URLs for learner and staff.
import { readFileSync } from "node:fs";
const S = process.argv[2];
const BASE = process.env.CHECK_BASE ?? "http://localhost:3005"; // e.g. CHECK_BASE=https://app.innovlab.me
const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split(/\r?\n/).map((l) => /^([A-Z0-9_]+)=(.*)$/.exec(l.trim())).filter(Boolean).map((m) => [m[1], m[2]]),
);
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL, ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY, SECRET = env.SUPABASE_SECRET_KEY;
function load(name) {
  const snippet = readFileSync(`${S}/${name}-cookie.txt`, "utf8");
  const pairs = [...snippet.matchAll(/document\.cookie="([^;"]+);/g)].map((m) => m[1]);
  const session = JSON.parse(Buffer.from(pairs.map((p) => p.slice(p.indexOf("=") + 1)).join("").replace(/^base64-/, ""), "base64url").toString("utf8"));
  return { cookie: pairs.join("; "), token: session.access_token, uid: session.user.id };
}
const learner = load("learner"), staff = load("staff"), other = load("blank");
const log = (name, pass, detail) => console.log(`${pass ? "PASS" : "FAIL"}  ${name}${pass ? "" : "  -> " + JSON.stringify(detail).slice(0, 500)}`);

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
const stamp = Date.now();
const path = `${learner.uid}/time-log/${stamp}.png`;
const up = (p, token, body, type) => fetch(`${URL_}/storage/v1/object/evidence/${p}`, { method: "POST", headers: { apikey: ANON, authorization: `Bearer ${token}`, "content-type": type }, body });

let r = await up(path, learner.token, PNG, "image/png");
log("learner uploads a PNG into own folder", r.status === 200, { status: r.status, body: await r.text() });
r = await up(`${other.uid}/time-log/${stamp}.png`, learner.token, PNG, "image/png");
log("learner upload into another learner's folder refused", r.status >= 400, { status: r.status });
r = await up(`${learner.uid}/time-log/${stamp + 1}.png`, learner.token, Buffer.from("<html>"), "text/html");
log("non-image upload refused", r.status >= 400, { status: r.status });
r = await up(`${learner.uid}/time-log/${stamp + 2}.png`, learner.token, Buffer.alloc(5 * 1024 * 1024 + 10), "image/png");
log("upload over 5 MB refused", r.status >= 400, { status: r.status });

const now = Date.now();
const post = (body) => fetch(`${BASE}/api/artifacts/time-log`, { method: "POST", headers: { "content-type": "application/json", cookie: learner.cookie }, body: JSON.stringify(body) }).then(async (x) => ({ status: x.status, json: await x.json().catch(() => null) }));
const entry = { task: "주간 보고서 작성", method: "before", started_at: new Date(now - 50 * 60000).toISOString(), ended_at: new Date(now - 5 * 60000).toISOString(), interruptions: 2 };
r = await post({ ...entry, evidence_ref: `${other.uid}/time-log/${stamp}.png` });
log("time log with someone else's evidence path -> 422", r.status === 422, r);
r = await post({ ...entry, evidence_ref: path });
log("time log with own evidence -> saved", r.status === 200 && r.json?.data?.entry?.evidence_ref === path, r);

const sign = (token) => fetch(`${URL_}/storage/v1/object/sign/evidence/${path}`, { method: "POST", headers: { apikey: ANON, authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify({ expiresIn: 60 }) }).then(async (x) => ({ status: x.status, json: await x.json().catch(() => null) }));
r = await sign(learner.token);
log("learner gets a signed URL for own evidence", r.status === 200 && !!r.json?.signedURL, r);
const img = await fetch(`${URL_}/storage/v1${r.json?.signedURL}`);
log("signed URL serves the image", img.status === 200 && (img.headers.get("content-type") || "").startsWith("image/png"), { status: img.status, type: img.headers.get("content-type") });
r = await sign(staff.token);
log("staff gets a signed URL for the learner's evidence", r.status === 200 && !!r.json?.signedURL, r);
r = await sign(other.token);
log("another learner gets no signed URL", r.status >= 400, r);
r = await fetch(`${URL_}/storage/v1/object/public/evidence/${path}`);
log("bucket is not public", r.status >= 400, { status: r.status });

let page = await fetch(`${BASE}/app/lab/time-log`, { headers: { cookie: learner.cookie } });
let html = await page.text();
log("learner time-log page shows the entry with a signed image", page.status === 200 && html.includes("주간 보고서 작성") && html.includes("/storage/v1/object/sign/evidence/"), { status: page.status, hasTask: html.includes("주간 보고서 작성"), hasSigned: html.includes("/object/sign/evidence/") });
page = await fetch(`${BASE}/staff/learner/${learner.uid}`, { headers: { cookie: staff.cookie } });
html = await page.text();
log("staff learner page shows the entry with a signed image", page.status === 200 && html.includes("주간 보고서 작성") && html.includes("/storage/v1/object/sign/evidence/"), { status: page.status, hasTask: html.includes("주간 보고서 작성"), hasSigned: html.includes("/object/sign/evidence/") });

// cleanup the stored object (service role)
r = await fetch(`${URL_}/storage/v1/object/evidence`, { method: "DELETE", headers: { apikey: SECRET, authorization: `Bearer ${SECRET}`, "content-type": "application/json" }, body: JSON.stringify({ prefixes: [path] }) });
log("test image removed from storage", r.status === 200, { status: r.status, body: (await r.text()).slice(0, 200) });
