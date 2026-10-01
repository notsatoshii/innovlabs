// POST /api/staff/cohort — create a cohort (docs/app/phases/phase-2.md P1, P2).
// Request: CreateCohortRequest. Response: ApiResult<{ cohort: Cohort }>.
// The cohort table has no client write policy: the insert uses the service
// role, and only after requireStaff() has passed.

import { randomInt } from "node:crypto";
import { ok, bad, requireStaff } from "@/lib/auth/guards";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Cohort, CreateCohortRequest } from "@/lib/courses/types";
import { isCohortTrack } from "@/components/staff/format";
import { COHORT_NAME_MAX, COHORT_NOTE_MAX } from "@/components/staff/limits";
import { badJson, notConfigured, readBody, serverError } from "../_shared";

// Join codes are read aloud and typed on phones: no I or O, no 0 or 1.
// 32 symbols, 6 places: about a billion codes.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;
const CODE_ATTEMPTS = 8;

function generateCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return code;
}

/** YYYY-MM-DD that is a real calendar day. */
function isDay(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function optionalText(value: unknown): string | null | undefined {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return undefined; // wrong type
  return value.trim() || null;
}

function parse(body: Record<string, unknown>): { value: CreateCohortRequest } | { problems: string[] } {
  const problems: string[] = [];

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) problems.push("코호트 이름을 적어 주세요.");
  else if (name.length > COHORT_NAME_MAX) problems.push(`코호트 이름은 ${COHORT_NAME_MAX}자 이내로 적어 주세요.`);

  const track = body.track_code;
  if (!isCohortTrack(track)) problems.push("트랙을 골라 주세요.");

  const startsOn = optionalText(body.starts_on);
  if (startsOn === undefined || (startsOn !== null && !isDay(startsOn))) {
    problems.push("시작일을 날짜 형식에 맞게 골라 주세요.");
  }

  const scheduleNote = optionalText(body.schedule_note);
  if (scheduleNote === undefined || (scheduleNote !== null && scheduleNote.length > COHORT_NOTE_MAX)) {
    problems.push(`수업 일정은 ${COHORT_NOTE_MAX}자 이내로 적어 주세요.`);
  }

  const venue = optionalText(body.venue);
  if (venue === undefined || (venue !== null && venue.length > COHORT_NOTE_MAX)) {
    problems.push(`장소는 ${COHORT_NOTE_MAX}자 이내로 적어 주세요.`);
  }

  if (problems.length > 0 || !isCohortTrack(track)) return { problems };
  return {
    value: {
      name,
      track_code: track,
      starts_on: startsOn ?? null,
      schedule_note: scheduleNote ?? null,
      venue: venue ?? null,
    },
  };
}

export async function POST(req: Request) {
  const auth = await requireStaff();
  if ("response" in auth) return auth.response;

  const body = await readBody(req);
  if (!body) return badJson();
  const parsed = parse(body);
  if ("problems" in parsed) return bad("validation", 400, parsed.problems);

  const admin = supabaseAdmin();
  if (!admin) return notConfigured();

  // cohort.code is unique: a collision comes back as 23505 and we draw again.
  for (let attempt = 0; attempt < CODE_ATTEMPTS; attempt++) {
    const { data, error } = await admin
      .from("cohort")
      .insert({ ...parsed.value, code: generateCode(), created_by: auth.email })
      .select("*")
      .single();
    if (!error && data) return ok({ cohort: data as Cohort });
    if (error?.code !== "23505") return serverError("cohort_insert_failed", error?.message);
  }
  return serverError("code_collision", `no free code after ${CODE_ATTEMPTS} draws`);
}
