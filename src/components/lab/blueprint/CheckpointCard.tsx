"use client";

// A checkpoint between two stage cards (SP-W3-BP, lab Part 2 step 4): what is
// checked at this point, one line each. "그냥 한번 읽어 볼게요" is not a check:
// the hint asks what the learner reads FOR, and the named checks become the
// Week 9 verification items.

import { BLUEPRINT_LIMITS, type BlueprintCheckpointDraft } from "@/lib/courses/types";
import { isVagueCheck } from "../rules-week3";

const INPUT = "nb-input w-full px-3 py-2.5 text-base leading-relaxed placeholder:text-gray-400";

// The session plan's own examples of what a checkpoint checks.
const CHECK_PLACEHOLDERS = [
  "예: 숫자가 원자료와 맞는지",
  "예: 사람 이름과 직함이 맞는지",
  "예: 말투가 팀장님께 올리는 보고에 맞는지",
  "예: [확인 필요] 표시가 남아 있지 않은지",
];

export function CheckpointCard({
  checkpoint,
  afterStage,
  focusIndex,
  onChange,
  onAddCheck,
  onRemove,
}: {
  checkpoint: BlueprintCheckpointDraft;
  /** 1-based number of the stage it follows. */
  afterStage: number;
  /** The check line that was just added (takes focus), or null. */
  focusIndex: number | null;
  onChange: (checks: string[]) => void;
  onAddCheck: () => void;
  onRemove: () => void;
}) {
  const full = checkpoint.checks.length >= BLUEPRINT_LIMITS.maxChecks;
  const vague = checkpoint.checks.some((c) => c.trim() && isVagueCheck(c));

  return (
    <section
      aria-label={`${afterStage}단계 뒤 확인 지점`}
      className="flex flex-col gap-2.5 rounded-xl border-2 border-[var(--nb-ink)] bg-[var(--nb-yellow)] p-3"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[15px] font-extrabold">
          <span aria-hidden>✓ </span>확인 지점 · {afterStage}단계 뒤
        </h3>
        <button
          type="button"
          onClick={onRemove}
          className="min-h-11 shrink-0 px-1 text-sm font-bold underline underline-offset-4"
        >
          확인 지점 빼기
        </button>
      </div>
      <p className="text-sm leading-relaxed">여기서 무엇을 확인하나요? 한 줄에 하나씩 적어요.</p>

      <ol className="flex flex-col gap-2">
        {checkpoint.checks.map((check, i) => (
          <li key={i} className="flex items-start gap-2">
            <input
              type="text"
              aria-label={`${afterStage}단계 뒤 확인할 것 ${i + 1}`}
              value={check}
              maxLength={BLUEPRINT_LIMITS.check}
              placeholder={CHECK_PLACEHOLDERS[i % CHECK_PLACEHOLDERS.length]}
              autoFocus={focusIndex === i}
              enterKeyHint="next"
              onChange={(e) => onChange(checkpoint.checks.map((c, j) => (j === i ? e.target.value : c)))}
              onKeyDown={(e) => {
                // Enter on a filled line opens the next one. Not while Korean input is composing.
                if (e.key === "Enter" && !e.nativeEvent.isComposing && check.trim()) {
                  e.preventDefault();
                  if (!full) onAddCheck();
                }
              }}
              className={`${INPUT} min-w-0 flex-1 bg-[var(--nb-paper)]`}
            />
            {checkpoint.checks.length > 1 && (
              <button
                type="button"
                aria-label={`확인할 것 ${i + 1} 지우기`}
                onClick={() => onChange(checkpoint.checks.filter((_, j) => j !== i))}
                className="min-h-11 shrink-0 px-1 text-sm font-bold underline underline-offset-4"
              >
                지우기
              </button>
            )}
          </li>
        ))}
      </ol>

      {vague && (
        <p className="text-sm leading-relaxed">
          <b>‘읽어 본다’만으로는 놓치기 쉬워요.</b> 무엇을 보려고 읽는지 적어 주세요.
        </p>
      )}

      <button
        type="button"
        onClick={onAddCheck}
        disabled={full}
        className="nb-btn nb-btn-white w-full px-4 py-2.5 text-sm"
      >
        + 확인할 것 추가
      </button>
    </section>
  );
}
