// Helpers shared by the /api/staff routes. Not a route itself (only route.ts
// files are). Every route calls requireStaff() FIRST and returns its response
// when it fails; nothing in this file touches the service role on its own.

import type { NextResponse } from "next/server";
import { bad } from "@/lib/auth/guards";
import type { ApiError } from "@/lib/courses/types";

/** The JSON body as a plain object, or null when it is missing or malformed. */
export async function readBody(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await req.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) return null;
    return body as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function badJson(): NextResponse<ApiError> {
  return bad("bad_json", 400, ["요청 내용을 읽지 못했어요. 화면을 새로고침한 뒤 다시 시도해 주세요."]);
}

/** SUPABASE_SECRET_KEY is not set on this server. */
export function notConfigured(): NextResponse<ApiError> {
  return bad("server_not_configured", 503, ["서버 설정이 아직 끝나지 않았어요. 개발 담당자에게 알려 주세요."]);
}

export function serverError(code: string, detail: unknown): NextResponse<ApiError> {
  console.error(`staff route ${code}:`, detail);
  return bad(code, 500, ["저장하지 못했어요. 잠시 후 다시 시도해 주세요."]);
}

export function noSuchCohort(): NextResponse<ApiError> {
  return bad("no_such_cohort", 404, ["코호트를 찾지 못했어요. 목록에서 다시 열어 주세요."]);
}
