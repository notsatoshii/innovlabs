// Session refresh (Next 16 "proxy", formerly middleware).
//
// Server Components cannot write cookies, so an expired Supabase access token
// would never be rotated on a plain page view. This proxy binds a Supabase
// client to the request/response cookies and calls auth.getUser(), which
// refreshes the token when needed and rewrites the auth cookies on the
// response. No redirects happen here: /app/layout.tsx and the pages own that.

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return response;

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        // Keep the request in sync so downstream server code sees the fresh
        // token, then rebuild the response so the browser receives it too.
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Do not remove: this call is what triggers the refresh.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  // Every non-static route: the root layout reads the session on all of them.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\.(?:svg|png|ico|jpg|jpeg|webp)$).*)"],
};
