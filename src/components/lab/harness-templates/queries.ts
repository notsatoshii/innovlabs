// Server-side read of the harness templates (D1). Takes the learner's own
// Supabase client: RLS returns the rows to staff and to learners with an
// active enrollment, and nothing to anyone else. Any failure (the table not
// there yet, a network error) shows no sheet instead of breaking the page.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { HarnessTemplate } from "@/lib/courses/types";
import { parseTemplateRows } from "./template-rules";

export async function loadHarnessTemplates(supabase: SupabaseClient): Promise<HarnessTemplate[]> {
  const { data, error } = await supabase
    .from("harness_template")
    .select("id, name, doc_type, parts, sort_order, updated_at")
    .order("sort_order", { ascending: true })
    .limit(20);
  if (error) {
    console.error("harness template read failed:", error.message);
    return [];
  }
  return parseTemplateRows(data);
}
