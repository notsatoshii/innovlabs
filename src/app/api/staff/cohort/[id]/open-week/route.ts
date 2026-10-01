// POST /api/staff/cohort/[id]/open-week — set the staff override for which
// weeks are open (phase-2 P4). Request: OpenWeekRequest (open_week 0–12).
// Response: ApiResult<{ cohort: Cohort }>. Weeks whose date has come stay
// open whatever this is set to (isWeekOpen). Service role, after requireStaff().

import { ok, bad, requireStaff } from "@/lib/auth/guards";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Cohort } from "@/lib/courses/types";
import { TOTAL_WEEKS, isUuid } from "@/components/staff/format";
import { badJson, noSuchCohort, notConfigured, readBody, serverError } from "../../../_shared";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireStaff();
  if ("response" in auth) return auth.response;

  const { id } = await params;
  if (!isUuid(id)) return noSuchCohort();

  const body = await readBody(req);
  if (!body) return badJson();
  const openWeek = body.open_week;
  if (typeof openWeek !== "number" || !Number.isInteger(openWeek) || openWeek < 0 || openWeek > TOTAL_WEEKS) {
    return bad("validation", 400, [`0에서 ${TOTAL_WEEKS} 사이의 주차를 골라 주세요.`]);
  }

  const admin = supabaseAdmin();
  if (!admin) return notConfigured();

  const { data, error } = await admin
    .from("cohort")
    .update({ open_week: openWeek })
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) return serverError("open_week_failed", error.message);
  if (!data) return noSuchCohort();
  return ok({ cohort: data as Cohort });
}
