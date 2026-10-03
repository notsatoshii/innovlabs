"use client";

// Hands the templates the harness page read (through the learner's own
// client, so RLS decides who gets any) down to the editor without threading
// them through the library. An empty list means "no sheet": a learner without
// an active enrollment, or the table not there yet.

import { createContext, useContext } from "react";
import type { HarnessTemplate } from "@/lib/courses/types";

const HarnessTemplatesContext = createContext<HarnessTemplate[]>([]);

export function HarnessTemplatesProvider({
  templates,
  children,
}: {
  templates: HarnessTemplate[];
  children: React.ReactNode;
}) {
  return <HarnessTemplatesContext.Provider value={templates}>{children}</HarnessTemplatesContext.Provider>;
}

export function useHarnessTemplates(): HarnessTemplate[] {
  return useContext(HarnessTemplatesContext);
}
