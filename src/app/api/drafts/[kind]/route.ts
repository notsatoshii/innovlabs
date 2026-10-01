// PUT /api/drafts/[kind]: autosave for a lab draft (phase-2 P5).
// Body { data }. Upserts the caller's own artifact_draft row through their
// own Supabase client, so the row-level policy in 0007 (user_id = auth.uid())
// is what authorises the write. The draft is working state: its shape is not
// judged here, only its size. The submit routes under /api/artifacts validate.

import { requireLearner, ok, bad } from "@/lib/auth/guards";
import { supabaseServer } from "@/lib/supabase/server";
import type { DraftKind } from "@/lib/courses/types";
import { MAX_JSON_BYTES, byteLength, readJsonObject } from "@/app/api/artifacts/_lib/body";

const KINDS: ReadonlySet<string> = new Set<DraftKind>([
  "work_map",
  "drill",
  "harness",
  "blueprint",
  "baseline",
]);

export async function PUT(req: Request, { params }: { params: Promise<{ kind: string }> }) {
  const auth = await requireLearner();
  if ("response" in auth) return auth.response;

  const { kind } = await params;
  if (!KINDS.has(kind)) return bad("unknown_kind", 404);

  // The envelope adds a few bytes around `data`; the cap that matters is on `data` itself.
  const read = await readJsonObject(req, MAX_JSON_BYTES + 1024);
  if ("response" in read) return read.response;
  const data = read.body.data;
  if (typeof data !== "object" || data === null || Array.isArray(data)) return bad("bad_request", 400);
  if (byteLength(JSON.stringify(data)) > MAX_JSON_BYTES) return bad("too_large", 413);

  const updatedAt = new Date().toISOString();
  const supabase = await supabaseServer();
  const { error } = await supabase
    .from("artifact_draft")
    .upsert(
      { user_id: auth.user.id, kind, data, updated_at: updatedAt },
      { onConflict: "user_id,kind" },
    );
  if (error) {
    console.error(`draft save failed (${kind}):`, error.message);
    return bad("store_failed", 500);
  }
  return ok({ updated_at: updatedAt });
}
