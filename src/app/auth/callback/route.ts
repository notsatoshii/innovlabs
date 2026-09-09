// OAuth (Google / Kakao) PKCE callback: exchange the auth code for a session,
// then continue to `next` (login flow) or the registration details step.

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

const DEFAULT_NEXT = "/register?step=details";

/**
 * Public origin of this request. Behind the reverse proxy request.url reflects
 * the container's bind address (0.0.0.0:3000), so prefer forwarded headers.
 */
function publicOrigin(request: Request): string {
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!host) return new URL(request.url).origin;
  const proto =
    request.headers.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/**
 * Accept `next` only as a same-origin relative path: must start with a single
 * "/" (so no "//evil.com" or "/\evil.com"), and must resolve to our origin.
 */
function safeNext(raw: string | null, origin: string): string | null {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) {
    return null;
  }
  try {
    const resolved = new URL(raw, origin);
    if (resolved.origin !== origin) return null;
    return resolved.pathname + resolved.search + resolved.hash;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const origin = publicOrigin(request);
  const next = safeNext(url.searchParams.get("next"), origin);

  if (code) {
    const supabase = await supabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next ?? DEFAULT_NEXT, origin));
    }
  }

  // Login attempts (next=/app/...) report back to /login; the register flow
  // keeps its existing error landing.
  const errorTo = next?.startsWith("/app") ? "/login?error=auth" : "/register?error=auth";
  return NextResponse.redirect(new URL(errorTo, origin));
}
