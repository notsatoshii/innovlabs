"use client";

// The workspace lab's two cards, the harness export and the check form,
// sharing the chosen path: the export card's title and instructions follow
// the path picked on the form (agent path: both harnesses as files in a
// project folder), so one screen never gives two contradictory instructions.

import { useState } from "react";
import type { WorkspaceInput } from "@/lib/courses/types";
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
  return (
    <>
      <HarnessExport harnesses={harnesses} path={path} />
      <WorkspaceForm initial={initial} submittedOn={submittedOn} onPathChange={setPath} />
    </>
  );
}
