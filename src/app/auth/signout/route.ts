// Sign out: the profile page posts a plain <form> here. Clears the Supabase
// auth cookies through the server client, then sends the browser home.

import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * Public origin of this request. Behind the reverse proxy request.url reflects
 * the container's bind address, so prefer forwarded headers. (Same helper as
 * auth/callback/route.ts; route files may only export handlers, so it is
 * repeated here rather than exported from there.)
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

export async function POST(request: Request) {
  // Same-origin only: a cross-site form must not be able to sign the user out.
  const origin = request.headers.get("origin");
  if (origin && origin !== publicOrigin(request)) {
    return new NextResponse(null, { status: 403 });
  }
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  // 303 so the browser follows with GET after the form POST.
  return NextResponse.redirect(new URL("/", publicOrigin(request)), 303);
}
