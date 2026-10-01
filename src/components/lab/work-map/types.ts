// Props shared by the three Work Map steps.

import type { WorkMapDraft } from "@/lib/courses/types";

export interface EditorCategory {
  id: string;
  label: string;
  /** The survey's answer for a seeded category ("주 3–5시간"); null for a learner-added one. */
  hint: string | null;
  /** Added by the learner in the editor (renamable, removable). */
  extra: boolean;
}

export type SetWorkMap = (next: WorkMapDraft | ((prev: WorkMapDraft) => WorkMapDraft)) => void;
