// A submitted pipeline blueprint for staff (Week 3 Part 2, phase-2c C2):
// a vertical chain of stage boxes drawn from the stage table, with each
// checkpoint marked after the stage it follows, the trigger on top and the
// delivery at the bottom. Generated, never uploaded. Server-safe, read-only.

import type { BlueprintSubmittedPayload } from "@/lib/profile/events";
import { ACTOR_LABELS } from "@/components/lab/rules-week3";
import { Chip } from "./ui";

function Joint() {
  return <div aria-hidden className="ml-6 h-3 w-0.5 bg-[var(--nb-ink)]" />;
}

export default function BlueprintDiagram({
  blueprint,
  harnessNames,
}: {
  blueprint: BlueprintSubmittedPayload;
  /** harness_id → name, for stages linked to one of the learner's harnesses. */
  harnessNames?: ReadonlyMap<string, string>;
}) {
  const checkpointsAfter = new Map<string, BlueprintSubmittedPayload["checkpoints"]>();
  for (const checkpoint of blueprint.checkpoints) {
    const list = checkpointsAfter.get(checkpoint.after_stage_id) ?? [];
    list.push(checkpoint);
    checkpointsAfter.set(checkpoint.after_stage_id, list);
  }

  return (
    <ol className="flex flex-col" aria-label="파이프라인 설계도">
      <li className="nb-flat bg-[var(--background)] px-3 py-2 text-sm">
        <span className="text-xs font-extrabold text-gray-500">시작</span>
        <p className="break-words">{blueprint.trigger || "적지 않았어요"}</p>
      </li>
      {blueprint.stages.map((stage) => {
        const harness = stage.harness_id ? harnessNames?.get(stage.harness_id) : undefined;
        return (
          <li key={stage.id} className="flex flex-col">
            <Joint />
            <div className="nb-flat px-3 py-2.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-sm font-extrabold">{stage.order}단계</span>
                <Chip tone={stage.kind === "P" ? "done" : "info"}>{stage.kind === "P" ? "P 처리" : "T 판단"}</Chip>
                <Chip tone={stage.actor === "human" ? "muted" : "warn"}>{ACTOR_LABELS[stage.actor]}</Chip>
              </div>
              <p className="mt-1 break-words text-sm font-semibold">{stage.name}</p>
              {stage.needs && <p className="mt-0.5 break-words text-xs text-gray-700">필요한 것: {stage.needs}</p>}
              {stage.harness_id && (
                <p className="mt-0.5 break-words text-xs text-gray-700">
                  하네스: {harness ?? "찾을 수 없는 하네스"}
                </p>
              )}
            </div>
            {(checkpointsAfter.get(stage.id) ?? []).map((checkpoint) => (
              <div key={checkpoint.id} className="flex flex-col">
                <Joint />
                <div className="nb-flat bg-[var(--nb-yellow)] px-3 py-2">
                  <p className="text-xs font-extrabold">확인 지점 · {checkpoint.after_stage}단계 뒤</p>
                  <ul className="mt-1 list-disc pl-5 text-sm">
                    {checkpoint.checks.map((check, index) => (
                      <li key={index} className="break-words">
                        {check}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </li>
        );
      })}
      <li className="flex flex-col">
        <Joint />
        <div className="nb-flat bg-[var(--background)] px-3 py-2 text-sm">
          <span className="text-xs font-extrabold text-gray-500">전달</span>
          <p className="break-words">{blueprint.delivery || "적지 않았어요"}</p>
        </div>
      </li>
    </ol>
  );
}
