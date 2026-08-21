// OAuth (Kakao / Google) PKCE callback: exchange the auth code for a session,
// then land on /register?step=finalize to seed the profile.

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

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

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const origin = publicOrigin(request);

  if (code) {
    const supabase = await supabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL("/register?step=finalize", origin));
    }
  }
  return NextResponse.redirect(new URL("/register?error=auth", origin));
}
