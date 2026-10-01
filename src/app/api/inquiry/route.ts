// POST /api/inquiry — stores a business inquiry from the marketing site's
// Companies form in the `inquiry` table.
//
// The static site lives on another origin, so this route answers CORS for the
// origins listed in INQUIRY_ALLOWED_ORIGINS (comma-separated) and REFUSES
// every other origin: no match, no insert. There is no fallback origin; an
// unset variable closes the route. The row is written with the service role
// (migration 0009 removes the public insert policy), so the checks here
// cannot be skipped by posting to the database directly.

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { clientIp, createRateLimiter, isJsonRequest, readJsonBody } from "./_lib/request";

const INTERESTS = new Set(["training", "development", "both"]);
// Same numbers as the CHECK constraint on public.inquiry (migration 0009).
const MAX = { name: 120, company: 160, role: 120, email: 200, team_size: 40, message: 4000 };
const MAX_BODY_BYTES = 16 * 1024;

// Every attempt counts. 5 per IP and 60 in total per 10 minutes per instance.
const perIp = createRateLimiter({ windowMs: 10 * 60 * 1000, limit: 5 });
const overall = createRateLimiter({ windowMs: 10 * 60 * 1000, limit: 60, maxKeys: 1 });

let warnedUnset = false;

function allowedOrigin(req: Request): string | null {
  const list = (process.env.INQUIRY_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim().replace(/\/+$/, ""))
    .filter(Boolean);
  if (list.length === 0 && !warnedUnset) {
    warnedUnset = true;
    console.error("inquiry: INQUIRY_ALLOWED_ORIGINS is not set; every request is refused");
  }
  const origin = req.headers.get("origin");
  return origin && list.includes(origin) ? origin : null;
}

function cors(origin: string): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "600",
    Vary: "Origin",
  };
}

function refuse(): NextResponse {
  return NextResponse.json({ error: "origin_not_allowed" }, { status: 403, headers: { Vary: "Origin" } });
}

/** A string field: trimmed and capped. Anything that is not a string is a type error. */
function text(value: unknown, max: number, required: boolean): string | null | undefined {
  if (value === undefined || value === null) return required ? undefined : null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim().slice(0, max);
  if (!trimmed) return required ? undefined : null;
  return trimmed;
}

export async function OPTIONS(req: Request) {
  const origin = allowedOrigin(req);
  if (!origin) return refuse();
  return new NextResponse(null, { status: 204, headers: cors(origin) });
}

export async function POST(req: Request) {
  const origin = allowedOrigin(req);
  if (!origin) return refuse();
  const headers = cors(origin);
  const reply = (body: Record<string, unknown>, status: number) =>
    NextResponse.json(body, { status, headers });

  // A JSON content type forces a CORS preflight; a text/plain "simple
  // request" from another site never gets this far.
  if (!isJsonRequest(req)) return reply({ error: "unsupported_media_type" }, 415);

  if (!perIp(clientIp(req)) || !overall("all")) return reply({ error: "rate_limited" }, 429);

  const read = await readJsonBody(req, MAX_BODY_BYTES);
  if (!read.ok) return reply({ error: read.reason }, read.reason === "too_large" ? 413 : 400);
  const body = read.body;

  // Honeypot: real people never fill the hidden field.
  if (typeof body.website === "string" && body.website.trim()) return reply({ ok: true }, 200);

  const name = text(body.name, MAX.name, true);
  const company = text(body.company, MAX.company, true);
  const email = text(body.email, MAX.email, true);
  const interest = text(body.interest, 20, true);
  const role = text(body.role, MAX.role, false);
  const teamSize = text(body.team_size, MAX.team_size, false);
  const message = text(body.message, MAX.message, false);
  const localeOk = body.locale === undefined || body.locale === "ko" || body.locale === "en";

  if (
    !name ||
    !company ||
    !email ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    !interest ||
    !INTERESTS.has(interest) ||
    role === undefined ||
    teamSize === undefined ||
    message === undefined ||
    !localeOk
  ) {
    return reply({ error: "invalid" }, 422);
  }

  const admin = supabaseAdmin();
  if (!admin) {
    console.error("inquiry: SUPABASE_SECRET_KEY is not set; the inquiry was not stored");
    return reply({ error: "not_configured" }, 503);
  }

  const { error } = await admin.from("inquiry").insert({
    name,
    company,
    role,
    email,
    interest,
    team_size: teamSize,
    message,
    locale: body.locale === "en" ? "en" : "ko",
    source: "site",
    user_agent: req.headers.get("user-agent")?.slice(0, 300) ?? null,
  });
  if (error) {
    // 42P01 (Postgres) / PGRST205 (PostgREST) = table missing: migration not applied yet.
    const missing = error.code === "42P01" || error.code === "PGRST205";
    console.error(
      missing
        ? "inquiry: table public.inquiry is missing; apply supabase/migrations/0003_inquiry.sql"
        : `inquiry: insert failed: ${error.message}`,
    );
    return reply({ error: "store_failed" }, missing ? 503 : 500);
  }

  return reply({ ok: true }, 200);
}
