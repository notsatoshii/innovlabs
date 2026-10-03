// The blueprint drawn from its stage table (phase-2c C2): one vertical chain
// of boxes, top to bottom, with the trigger first, each stage as a box tagged
// P or T and who does it, every checkpoint as its own marked box right after
// the stage it follows, and the delivery last. Nothing is uploaded or drawn by
// hand; the paper sheet in the room is still where people sketch.
//
// Server-safe (no hooks): the learner's editor renders it live from the draft,
// and a staff view can render it from a submitted BlueprintSubmittedPayload.
// Accepts both shapes: only ids, names, kinds, actors and checks are read.

import { Fragment } from "react";
import type { BlueprintActor } from "@/lib/profile/events";
import { ACTOR_LABELS, isAssistantActor, writtenChecks } from "../rules-week3";

export interface DiagramStage {
  id: string;
  name: string;
  kind: "P" | "T" | null;
  actor: BlueprintActor | null;
}

export interface DiagramCheckpoint {
  id: string;
  after_stage_id: string;
  checks: string[];
}

function Arrow() {
  return (
    <li aria-hidden className="flex h-5 justify-center">
      <span className="relative block h-full w-0.5 bg-[var(--nb-ink)] opacity-60">
        <span className="absolute -bottom-0.5 left-1/2 h-0 w-0 -translate-x-1/2 border-x-[5px] border-t-[6px] border-x-transparent border-t-[var(--nb-ink)]" />
      </span>
    </li>
  );
}

function EndBox({ label, text }: { label: string; text: string }) {
  const value = text.replace(/\s+/g, " ").trim();
  return (
    <li className="rounded-full border border-dashed border-[var(--nb-ink)] px-4 py-2 text-center text-sm leading-snug">
      <span className="font-extrabold">{label}</span>{" "}
      <span className={value ? "" : "text-gray-500"}>{value || "아직 안 적었어요"}</span>
    </li>
  );
}

export function BlueprintDiagram({
  stages,
  checkpoints,
  trigger,
  delivery,
}: {
  stages: DiagramStage[];
  checkpoints: DiagramCheckpoint[];
  trigger: string;
  delivery: string;
}) {
  const after = new Map<string, DiagramCheckpoint[]>();
  for (const c of checkpoints) {
    const list = after.get(c.after_stage_id);
    if (list) list.push(c);
    else after.set(c.after_stage_id, [c]);
  }

  return (
    <ol aria-label="설계도 그림" className="mx-auto flex w-full max-w-sm flex-col">
      <EndBox label="시작:" text={trigger} />
      {stages.map((stage, index) => {
        const ai = isAssistantActor(stage.actor);
        const name = stage.name.replace(/\s+/g, " ").trim();
        return (
          <Fragment key={stage.id}>
            <Arrow />
            <li
              className={`rounded-xl border px-3 py-2.5 ${
                ai ? "border-[var(--nb-ink)] bg-[var(--nb-cyan)]" : "border-[var(--nb-line)] bg-[var(--nb-paper)]"
              }`}
            >
              <div className="flex items-start gap-2">
                <span className="shrink-0 text-xs font-extrabold tabular-nums leading-5">{index + 1}</span>
                <span className={`min-w-0 flex-1 break-words text-sm font-bold leading-5 ${name ? "" : "text-gray-500"}`}>
                  {name || "이름 없는 단계"}
                </span>
                {stage.kind && (
                  <span className="nb-badge shrink-0 bg-[var(--nb-paper)] px-1.5 text-[11px] font-extrabold">
                    {stage.kind}
                  </span>
                )}
              </div>
              <p className="mt-1 pl-4 text-xs text-gray-700">
                {stage.actor ? ACTOR_LABELS[stage.actor] : "누가 할지 아직 안 골랐어요"}
              </p>
            </li>
            {(after.get(stage.id) ?? []).map((c) => {
              const checks = writtenChecks(c);
              return (
                <Fragment key={c.id}>
                  <Arrow />
                  <li className="rounded-xl border-2 border-[var(--nb-ink)] bg-[var(--nb-yellow)] px-3 py-2.5">
                    <p className="text-xs font-extrabold">
                      <span aria-hidden>✓ </span>확인 지점
                    </p>
                    {checks.length > 0 ? (
                      <ul className="mt-1 flex list-disc flex-col gap-0.5 pl-4 text-xs leading-snug">
                        {checks.map((check, i) => (
                          <li key={i} className="break-words">
                            {check}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-1 text-xs text-gray-700">무엇을 확인할지 아직 안 적었어요</p>
                    )}
                  </li>
                </Fragment>
              );
            })}
          </Fragment>
        );
      })}
      <Arrow />
      <EndBox label="전달:" text={delivery} />
    </ol>
  );
}

