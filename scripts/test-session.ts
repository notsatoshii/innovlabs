// Disposable test accounts for the signed-in browser matrix (Phase 1a §10).
//
//   npx tsx scripts/test-session.ts learner   # account with a profile
//   npx tsx scripts/test-session.ts blank     # account without a profile
//   npx tsx scripts/test-session.ts cleanup   # delete both accounts
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

const ACCOUNTS = {
  learner: "phase1a-learner@innovlabs.test",
  blank: "phase1a-blank@innovlabs.test",
} as const;

const admin = createClient(URL_, SECRET, { auth: { persistSession: false } });

async function findUser(email: string) {
  const { data } = await admin.auth.admin.listUsers({ perPage: 200 });
  return data.users.find((u) => u.email === email) ?? null;
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
  const mode = process.argv[2] as keyof typeof ACCOUNTS | "cleanup";
  if (mode === "cleanup") {
    for (const email of Object.values(ACCOUNTS)) {
      const u = await findUser(email);
      if (u) {
        await admin.auth.admin.deleteUser(u.id); // cascades to user_profile
        console.log("deleted", email);
      }
    }
    return;
  }
  const email = ACCOUNTS[mode];
  if (!email) throw new Error("usage: learner | blank | cleanup");
  const password = randomBytes(18).toString("base64url");
  const user = await ensureUser(email, password);
  if (mode === "learner") await ensureProfile(user.id);

  const anon = createClient(URL_, ANON, { auth: { persistSession: false } });
  const { data, error } = await anon.auth.signInWithPassword({ email, password });
  if (error || !data.session) throw error ?? new Error("no session");
  console.log(`// ${mode}: ${email} (${user.id})`);
  console.log(cookieSnippet(data.session));
}

void main();
