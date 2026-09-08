// POST /api/inquiry — stores a business inquiry from the marketing site's
// Companies form in the `inquiry` table. Anonymous insert, no auth. The
// static site lives on another origin, so this route answers CORS for the
// origins listed in INQUIRY_ALLOWED_ORIGINS (comma-separated).

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const INTERESTS = new Set(["training", "development", "both"]);
const MAX = { name: 120, company: 160, role: 120, email: 200, team_size: 40, message: 4000 };

// Light in-memory rate limit per IP: 5 submissions per 10 minutes per instance.
const WINDOW_MS = 10 * 60 * 1000;
const LIMIT = 5;
const hits = new Map<string, number[]>();

function allowedOrigin(req: Request): string | null {
  const origin = req.headers.get("origin") ?? "";
  const list = (process.env.INQUIRY_ALLOWED_ORIGINS ?? "http://165.245.186.254:8080")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return list.includes(origin) ? origin : null;
}

function cors(origin: string | null) {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
  if (origin) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

function clean(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function OPTIONS(req: Request) {
  return new NextResponse(null, { status: 204, headers: cors(allowedOrigin(req)) });
}

export async function POST(req: Request) {
  const origin = allowedOrigin(req);
  const headers = cors(origin);

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= LIMIT) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400, headers });
  }

  // Honeypot: real people never fill the hidden field.
  if (clean(body.website, 10)) {
    return NextResponse.json({ ok: true }, { status: 200, headers });
  }

  const row = {
    name: clean(body.name, MAX.name),
    company: clean(body.company, MAX.company),
    role: clean(body.role, MAX.role) || null,
    email: clean(body.email, MAX.email),
    interest: clean(body.interest, 20),
    team_size: clean(body.team_size, MAX.team_size) || null,
    message: clean(body.message, MAX.message) || null,
    locale: body.locale === "en" ? "en" : "ko",
    source: "site",
    user_agent: req.headers.get("user-agent")?.slice(0, 300) ?? null,
  };

  if (!row.name || !row.company || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email) || !INTERESTS.has(row.interest)) {
    return NextResponse.json({ error: "invalid" }, { status: 422, headers });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return NextResponse.json({ error: "not_configured" }, { status: 503, headers });
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { error } = await supabase.from("inquiry").insert(row);
  if (error) {
    // 42P01 = table missing: the migration hasn't been applied yet.
    const status = error.code === "42P01" ? 503 : 500;
    return NextResponse.json({ error: "store_failed" }, { status, headers });
  }

  recent.push(now);
  hits.set(ip, recent);
  return NextResponse.json({ ok: true }, { status: 200, headers });
}
