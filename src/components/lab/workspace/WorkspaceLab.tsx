"use client";

// The workspace lab's two cards, the harness export and the check form,
// sharing the chosen path: the export card's title and instructions follow
// the path picked on the form (agent path: both harnesses as files in a
// project folder), so one screen never gives two contradictory instructions.
// The assistant is shared too: on the agent path the card names and saves
// the file that agent reads (Claude Code: CLAUDE.md, Codex: AGENTS.md).

import { useState } from "react";
import type { WorkspaceInput } from "@/lib/courses/types";
import type { AssistantId } from "@/lib/profile/events";
import HarnessExport, { type ExportHarness, type WorkspacePath } from "./HarnessExport";
import WorkspaceForm from "./WorkspaceForm";

export default function WorkspaceLab({
  harnesses,
  initial,
  submittedOn,
}: {
  harnesses: ExportHarness[];
  initial: WorkspaceInput;
  submittedOn: string | null;
}) {
  const [path, setPath] = useState<WorkspacePath | null>(initial.path);
  const [assistant, setAssistant] = useState<AssistantId | null>(initial.assistant);
  return (
    <>
      <HarnessExport harnesses={harnesses} path={path} assistant={assistant} />
      <WorkspaceForm
        initial={initial}
        submittedOn={submittedOn}
        onPathChange={setPath}
        onAssistantChange={setAssistant}
      />
    </>
  );
}
