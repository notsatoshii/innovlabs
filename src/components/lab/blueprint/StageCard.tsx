"use client";

// One row of the stage table as a card (SP-W3-BP, lab Part 2 steps 1 to 3):
// the stage's name, P or T, who does it, what it needs, and optionally the
// saved harness that is its instructions. Choosing T makes the learner the
// actor and hides the actor control (T is judgement: the learner does it).
// Up and down buttons reorder; there is no drag on a phone.

import { BLUEPRINT_LIMITS, type BlueprintStageDraft } from "@/lib/courses/types";
import type { BlueprintActor } from "@/lib/profile/events";
import { ChoiceGroup, type Choice } from "../inputs";
import { ACTOR_LABELS, isAssistantActor } from "../rules-week3";
import type { HarnessOption } from "./types";

const INPUT = "nb-input w-full px-3 py-2.5 text-base leading-relaxed placeholder:text-gray-400";
const ICON_BUTTON =
  "grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-[var(--nb-line)] bg-[var(--nb-paper)] text-lg font-bold disabled:opacity-35";

const KIND_CHOICES: Choice<"P" | "T">[] = [
  { value: "P", tag: "P", label: "처리" },
  { value: "T", tag: "T", label: "판단" },
];

const ACTOR_CHOICES: Choice<BlueprintActor>[] = (["assistant", "assistant_checked", "human"] as const).map(
  (value) => ({ value, label: ACTOR_LABELS[value] }),
);

// The session plan's own Monday-report stages, as examples for the first rows.
const NAME_PLACEHOLDERS = [
  "예: 팀원들 진행 상황 메신저로 모으기",
  "예: 모은 내용 합쳐서 요약하기",
  "예: 보고 양식에 맞추기",
  "예: 팀장님께 검토받기",
];

function needsLabel(stage: BlueprintStageDraft): { label: string; placeholder: string } {
  if (stage.kind === "T") {
    return { label: "무엇을 보고 판단하나요?", placeholder: "예: 지난주 보고와 이번 주 숫자를 나란히 보고 강조할 것을 고른다." };
  }
  if (isAssistantActor(stage.actor)) {
    return {
      label: "AI가 무엇을 받아야 하나요? (자료, 하네스, 참고 문서)",
      placeholder: "예: 팀원 6명의 메신저 내용, 주간업무보고 하네스, 지난주 보고서",
    };
  }
  return { label: "무엇이 필요한가요?", placeholder: "예: 영업팀 실적 파일" };
}

export function StageCard({
  stage,
  index,
  count,
  harnesses,
  autoFocus,
  onChange,
  onMove,
  onRemove,
}: {
  stage: BlueprintStageDraft;
  index: number;
  count: number;
  harnesses: HarnessOption[];
  autoFocus: boolean;
  onChange: (patch: Partial<Omit<BlueprintStageDraft, "id">>) => void;
  onMove: (by: -1 | 1) => void;
  onRemove: () => void;
}) {
  const n = index + 1;
  const title = stage.name.trim() || `${n}단계`;
  const needs = needsLabel(stage);
  const linked = stage.harness_id ? harnesses.find((h) => h.id === stage.harness_id) : undefined;

  return (
    <section aria-label={`${n}단계`} className="nb-flat flex flex-col gap-3 p-3">
      <div className="flex items-start gap-2">
        <span
          aria-hidden
          className="mt-1.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--nb-ink)] text-sm font-extrabold text-white"
        >
          {n}
        </span>
        <input
          type="text"
          aria-label={`${n}단계 이름`}
          value={stage.name}
          maxLength={BLUEPRINT_LIMITS.stageName}
          placeholder={NAME_PLACEHOLDERS[Math.min(index, NAME_PLACEHOLDERS.length - 1)]}
          autoFocus={autoFocus}
          enterKeyHint="done"
          onChange={(e) => onChange({ name: e.target.value })}
          className={`${INPUT} min-w-0 flex-1 font-bold`}
        />
      </div>

      <ChoiceGroup
        name={`stage-kind-${stage.id}`}
        legend={`${n}단계는 처리인가요, 판단인가요?`}
        legendHidden
        columns
        options={KIND_CHOICES}
        value={stage.kind}
        onChange={(kind) =>
          // T is judgement: the learner does it, and a harness is a P stage's instructions.
          onChange(kind === "T" ? { kind, actor: "human", harness_id: null } : { kind })
        }
      />

      {stage.kind === "P" && (
        <ChoiceGroup
          name={`stage-actor-${stage.id}`}
          legend="누가 하나요?"
          columns
          options={ACTOR_CHOICES}
          value={stage.actor}
          onChange={(actor) => onChange(actor === "human" ? { actor, harness_id: null } : { actor })}
        />
      )}
      {stage.kind === "T" && <p className="text-sm text-gray-700">판단 단계는 내가 해요.</p>}

      <div className="flex flex-col gap-1.5">
        <label htmlFor={`stage-needs-${stage.id}`} className="text-sm font-bold">
          {needs.label}
        </label>
        <textarea
          id={`stage-needs-${stage.id}`}
          rows={2}
          value={stage.needs}
          maxLength={BLUEPRINT_LIMITS.needs}
          placeholder={needs.placeholder}
          onChange={(e) => onChange({ needs: e.target.value })}
          className={INPUT}
        />
      </div>

      {((stage.kind === "P" && isAssistantActor(stage.actor) && harnesses.length > 0) || stage.harness_id) && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`stage-harness-${stage.id}`} className="text-sm font-bold">
            이 단계의 하네스 <span className="text-xs font-medium text-gray-500">선택</span>
          </label>
          <select
            id={`stage-harness-${stage.id}`}
            value={stage.harness_id ?? ""}
            onChange={(e) => onChange({ harness_id: e.target.value || null })}
            className="nb-input min-h-11 w-full px-3 py-2 text-[15px]"
          >
            <option value="">연결하지 않음</option>
            {stage.harness_id && !linked && <option value={stage.harness_id}>찾지 못한 하네스</option>}
            {harnesses.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name || "이름 없는 하네스"}
                {h.doc_type ? ` · ${h.doc_type}` : ""}
              </option>
            ))}
          </select>
        </div>
      )}
      {stage.harness_id && !linked && (
        <p className="text-sm font-bold text-red-600">연결한 하네스를 찾지 못했어요. 다시 골라 주세요.</p>
      )}

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          aria-label={`${title} 위로 옮기기`}
          disabled={index === 0}
          onClick={() => onMove(-1)}
          className={ICON_BUTTON}
        >
          ↑
        </button>
        <button
          type="button"
          aria-label={`${title} 아래로 옮기기`}
          disabled={index === count - 1}
          onClick={() => onMove(1)}
          className={ICON_BUTTON}
        >
          ↓
        </button>
        <button
          type="button"
          aria-label={`${title} 지우기`}
          onClick={onRemove}
          className="ml-auto min-h-11 shrink-0 px-2 text-sm font-bold underline underline-offset-4"
        >
          지우기
        </button>
      </div>
    </section>
  );
}
