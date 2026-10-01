// POST /api/staff/cohort/[id]/status — mark a cohort planned, running, or
// done. The join route refuses codes of a "done" cohort, so this is how a
// code is retired. Request: { status }. Response: ApiResult<{ cohort }>.
// Service role, after requireStaff().

import { ok, bad, requireStaff } from "@/lib/auth/guards";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Cohort } from "@/lib/courses/types";
import { isUuid } from "@/components/staff/format";
import { badJson, noSuchCohort, notConfigured, readBody, serverError } from "../../../_shared";

const STATUSES = ["planned", "running", "done"] as const;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireStaff();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  if (!isUuid(id)) return noSuchCohort();

  const body = await readBody(req);
  if (!body) return badJson();
  const status = body.status;
  if (typeof status !== "string" || !(STATUSES as readonly string[]).includes(status)) {
    return bad("validation", 400, ["상태를 다시 골라 주세요."]);
  }

  const admin = supabaseAdmin();
  if (!admin) return notConfigured();

  const { data, error } = await admin
    .from("cohort")
    .update({ status })
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) return serverError("status_failed", error.message);
  if (!data) return noSuchCohort();
  return ok({ cohort: data as Cohort });
}
