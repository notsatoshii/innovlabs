// Service-role Supabase client. Server only: never import from a client
// component, never expose SUPABASE_SECRET_KEY to the browser bundle.
// Used for writes the column-level grants deny to `authenticated`, such as
// caching the generated one-pager and (Phase 2) rebuilding profile snapshots
// from events. Returns null when the key is not configured so callers can
// degrade instead of crash.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function supabaseAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  if (!client) {
    client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}
