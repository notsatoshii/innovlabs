// Client helper for the staff forms: POST JSON to /api/staff/* and turn the
// ApiResult into something a form can show. The routes send a Korean
// explanation in `problems`; the map below covers the codes that come from
// the shared guards (which send none) and network failures.

import type { ApiError, ApiResult } from "@/lib/courses/types";

export async function postStaff<T>(url: string, body: unknown): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json: unknown = await res.json().catch(() => null);
    if (json && typeof json === "object" && "ok" in json) return json as ApiResult<T>;
    return { ok: false, error: "unexpected" };
  } catch {
    return { ok: false, error: "network" };
  }
}

const MESSAGES: Record<string, string> = {
  not_authenticated: "로그인이 풀렸어요. 다시 로그인한 뒤 시도해 주세요.",
  not_staff: "운영 권한이 있는 계정만 할 수 있어요.",
  network: "연결이 끊겼어요. 인터넷을 확인하고 다시 시도해 주세요.",
};

export function errorMessage(result: ApiError): string {
  return (
    result.problems?.filter(Boolean).join(" ") ||
    MESSAGES[result.error] ||
    "처리하지 못했어요. 잠시 후 다시 시도해 주세요."
  );
}
