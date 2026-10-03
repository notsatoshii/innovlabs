// Disposable test accounts for the signed-in browser matrix (Phase 1a §10).
//
//   npx tsx scripts/test-session.ts learner   # account with a profile
//   npx tsx scripts/test-session.ts blank     # account without a profile
//   npx tsx scripts/test-session.ts staff     # instructor account (row in public.staff), no profile
//   npx tsx scripts/test-session.ts cleanup   # delete the accounts, their events and drafts
//
// Add `--tag <run>` to any of them to use a separate set of accounts, e.g.
// `learner --tag pass3` makes phase1a-learner+pass3@innovlabs.test. Give each
// parallel run (a check script, a browser pass) its own tag: signing an
// account in again rotates its password and the check scripts reset its
// rows, which breaks any other run on the same account. `cleanup --tag pass3`
// removes only that run's accounts and rows; plain `cleanup` only the
// untagged ones.
//
// Prints a document.cookie snippet that signs the preview browser in as the
// account (the same cookie shape @supabase/ssr writes). Needs
// NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SECRET_KEY
// in .env.local. Test accounts use the reserved .test TLD and never get mail.

import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
}
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SECRET = process.env.SUPABASE_SECRET_KEY!;
const REF = new URL(URL_).hostname.split(".")[0];

const BASE_ACCOUNTS = {
  learner: "phase1a-learner",
  blank: "phase1a-blank",
  staff: "phase2-staff",
} as const;
type Mode = keyof typeof BASE_ACCOUNTS;

/** `--tag <run>`: letters, digits and dashes only, so it is safe in an email local part. */
function readTag(args: string[]): string | null {
  const i = args.indexOf("--tag");
  if (i < 0) return null;
  const tag = args[i + 1];
  if (!tag || !/^[a-z0-9-]{1,24}$/.test(tag)) throw new Error("--tag needs a value of a-z, 0-9 and dashes (max 24)");
  return tag;
}
const TAG = readTag(process.argv.slice(2));

const ACCOUNTS = Object.fromEntries(
  Object.entries(BASE_ACCOUNTS).map(([mode, local]) => [mode, `${local}${TAG ? `+${TAG}` : ""}@innovlabs.test`]),
) as Record<Mode, string>;

const admin = createClient(URL_, SECRET, { auth: { persistSession: false } });

async function findUser(email: string) {
  for (let page = 1; page <= 20; page++) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    const found = data.users.find((u) => u.email === email);
    if (found) return found;
    if (data.users.length < 200) break;
  }
  return null;
}

async function ensureUser(email: string, password: string) {
  const existing = await findUser(email);
  if (existing) {
    await admin.auth.admin.updateUserById(existing.id, { password });
    return existing;
  }
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "테스트 학습자" },
  });
  if (error) throw error;
  return data.user;
}

async function ensureProfile(userId: string) {
  const { data } = await admin.from("user_profile").select("user_id").eq("user_id", userId).maybeSingle();
  if (data) return;
  const { error } = await admin.from("user_profile").insert({
    user_id: userId,
    path: "employee",
    track: "docs_admin",
    track_via: "auto",
    depth_flag: "browser_only",
    core: { task_hours: { a: 4, b: 2, c: 3, d: 0, e: 1, f: 2, g: 3, h: 1 }, industry: "it", company_size: "100-299" },
    consented_at: new Date().toISOString(),
    consent_version: "2026-09-v2",
    marketing_consent: false,
    display_name: "테스트 학습자",
    company_name: "테스트 주식회사",
    job_title: "대리",
  });
  if (error) throw error;
}

function cookieSnippet(session: unknown): string {
  const json = JSON.stringify(session);
  const value = "base64-" + Buffer.from(json, "utf8").toString("base64url");
  const name = `sb-${REF}-auth-token`;
  const MAX = 3180;
  const parts: string[] = [];
  if (value.length <= MAX) {
    parts.push(`document.cookie=${JSON.stringify(`${name}=${value}; path=/; SameSite=Lax`)};`);
  } else {
    for (let i = 0, n = 0; i < value.length; i += MAX, n++) {
      parts.push(`document.cookie=${JSON.stringify(`${name}.${n}=${value.slice(i, i + MAX)}; path=/; SameSite=Lax`)};`);
    }
  }
  return parts.join("\n");
}

async function main() {
  const mode = process.argv[2] as Mode | "cleanup";
  if (mode === "cleanup") {
    // Only this tag's accounts (exact emails, never a LIKE on the domain), so
    // another run's accounts and rows are left alone. Events and drafts go
    // first: deleting an account sets profile_event.user_id to null.
    await admin.from("staff").delete().eq("email", ACCOUNTS.staff);
    for (const email of Object.values(ACCOUNTS)) {
      const u = await findUser(email);
      if (!u) continue;
      const events = await admin.from("profile_event").delete().eq("user_id", u.id);
      const drafts = await admin.from("artifact_draft").delete().eq("user_id", u.id);
      if (events.error || drafts.error) {
        console.error(`could not remove the rows of ${email}; account kept:`, events.error?.message ?? drafts.error?.message);
        continue;
      }
      await admin.auth.admin.deleteUser(u.id); // cascades to user_profile and enrollment
      console.log("deleted", email, "with its events and drafts");
    }
    return;
  }
  const email = ACCOUNTS[mode];
  if (!email) throw new Error("usage: learner | blank | staff | cleanup [--tag <run>]");
  const password = randomBytes(18).toString("base64url");
  const user = await ensureUser(email, password);
  if (mode === "learner") await ensureProfile(user.id);
  if (mode === "staff") {
    // Disposable instructor. After migration 0009 the row is also bound to
    // the user id, which is what staff_role() matches first.
    const row: Record<string, unknown> = { email, role: "instructor" };
    let { error } = await admin.from("staff").upsert({ ...row, user_id: user.id }, { onConflict: "email" });
    if (error) ({ error } = await admin.from("staff").upsert(row, { onConflict: "email" })); // before 0009: no user_id column
    if (error) throw error;
  }

  const anon = createClient(URL_, ANON, { auth: { persistSession: false } });
  const { data, error } = await anon.auth.signInWithPassword({ email, password });
  if (error || !data.session) throw error ?? new Error("no session");
  console.log(`// ${mode}: ${email} (${user.id})`);
  console.log(cookieSnippet(data.session));
}

void main();
