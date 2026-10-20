"use client";

// One interaction block → its component. Types not used in Level 1 render a
// short note and count as done, so a screen never locks on unknown content.

import type { Interaction } from "@/lib/course/types";
import { I1Sort } from "./I1Sort";
import { I2Pick } from "./I2Pick";
import { I3Spot } from "./I3Spot";
import { I4Score } from "./I4Score";
import { I6Predict } from "./I6Predict";
import { I7Choose } from "./I7Choose";
import { I8Timer } from "./I8Timer";
import { I9MyTask } from "./I9MyTask";
import { I10Checklist } from "./I10Checklist";
import { I11AssistantLab } from "./I11AssistantLab";
import { Seam } from "./Seam";
import { Terms } from "./Terms";
import { useEffect } from "react";

export function InteractionView({ i, onDone }: { i: Interaction; onDone: () => void }) {
  switch (i.type) {
    case "I1":
      return <I1Sort i={i} onDone={onDone} />;
    case "I2":
      return <I2Pick i={i} onDone={onDone} />;
    case "I3":
      return <I3Spot i={i} onDone={onDone} />;
    case "I4":
      return <I4Score i={i} onDone={onDone} />;
    case "I6":
      return <I6Predict i={i} onDone={onDone} />;
    case "I7":
      return <I7Choose i={i} onDone={onDone} />;
    case "I8":
      return <I8Timer i={i} onDone={onDone} />;
    case "I9":
      return <I9MyTask i={i} onDone={onDone} />;
    case "I10":
      return <I10Checklist i={i} onDone={onDone} />;
    case "I11":
      return <I11AssistantLab i={i} onDone={onDone} />;
    case "terms":
      return <Terms i={i} onDone={onDone} />;
    case "seam":
      return <Seam i={i} onDone={onDone} />;
    default:
      return <Unknown onDone={onDone} />;
  }
}

function Unknown({ onDone }: { onDone: () => void }) {
  useEffect(() => onDone(), [onDone]);
  return <p className="c-small">이 활동은 아직 준비 중이에요.</p>;
}
