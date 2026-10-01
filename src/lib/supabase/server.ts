// Server Supabase client for route handlers / server components.

import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";

export async function supabaseServer() {
  const cookieStore = await cookies();
  // Secure cookies whenever the request arrived over HTTPS (Caddy sets the
  // header); plain-HTTP local dev keeps working.
  const secure = (await headers()).get("x-forwarded-proto") === "https";
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: { secure },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component — safe to ignore when a route
            // handler or middleware refreshes the session instead.
          }
        },
      },
    },
  );
}
