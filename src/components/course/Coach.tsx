// A coach line: 모아 (optional) and a speech bubble that pops in. The speaker
// name comes from COACH_NAME; "[코치]" in content shows as that name (Rich).

import { COACH_NAME } from "@/lib/course/coach";
import { Rich } from "./Blocks";
import { MoaSprite, type MoaMood } from "./MoaSprite";

export function Coach({ text, mood = "idle", avatar = true }: { text: string; mood?: MoaMood; avatar?: boolean }) {
  return (
    <div className="c-coach">
      {avatar && <MoaSprite mood={mood} size={64} className="c-coach-moa" />}
      <div className="c-bubble">
        <b>{COACH_NAME}</b>
        <Rich text={text} />
      </div>
    </div>
  );
}
