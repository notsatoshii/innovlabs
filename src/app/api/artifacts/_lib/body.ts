// Shared by the lab routes (drafts and artifacts): read a JSON object body
// with a size cap, so an oversized or malformed request is refused before
// anything touches the database. The underscore folder keeps this out of
// routing.

import type { NextResponse } from "next/server";
import { bad } from "@/lib/auth/guards";
import type { ApiError } from "@/lib/courses/types";

/** Draft and artifact bodies are small JSON documents; 200 KB is far above any real one. */
export const MAX_JSON_BYTES = 200 * 1024;

export function byteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

export async function readJsonObject(
  req: Request,
  maxBytes = MAX_JSON_BYTES,
): Promise<{ body: Record<string, unknown> } | { response: NextResponse<ApiError> }> {
  let raw: string;
  try {
    raw = await req.text();
  } catch {
    return { response: bad("bad_json", 400) };
  }
  if (byteLength(raw) > maxBytes) return { response: bad("too_large", 413) };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { response: bad("bad_json", 400) };
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return { response: bad("bad_json", 400) };
  }
  return { body: parsed as Record<string, unknown> };
}
