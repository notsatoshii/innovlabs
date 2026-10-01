"use client";

// Q5 grid variant (A/B pilot): 8 task-cluster rows × 5 hour buckets.
// On a phone this renders as stacked rows with a compact 5-segment control.

import { TASK_CLUSTERS } from "@/lib/survey/questions";
import type { HourBucket, TaskClusterId } from "@/lib/survey/types";

// Compact forms of the spec scale (거의 없음 / 1–2시간 / 3–5시간 / 6–10시간 /
// 10시간 이상): the unit moves to the helper line so five fit across a phone.
const SHORT_LABELS = ["거의 없음", "1–2", "3–5", "6–10", "10 이상"];

export function HourGrid({
  value,
  onChange,
}: {
  value: Partial<Record<TaskClusterId, HourBucket>>;
  onChange: (cluster: TaskClusterId, bucket: HourBucket) => void;
}) {
  const answered = TASK_CLUSTERS.map((c) => value[c.id] !== undefined);
  const remaining = answered.filter((a) => !a).length;
  // A row counts as skipped once a row below it has an answer. Marking it
  // tells the respondent why 다음 is still disabled.
  const lastAnswered = answered.lastIndexOf(true);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-gray-500">
        일주일에 쓰는 시간을 줄마다 골라 주세요. 숫자는 시간이에요.
      </p>
      {TASK_CLUSTERS.map((cluster, index) => {
        const selected = value[cluster.id];
        const skipped = selected === undefined && index < lastAnswered;
        return (
          <div key={cluster.id} className="nb-flat p-3">
            <p className="mb-2 text-sm font-bold">
              {cluster.label}
              {skipped && (
                <span className="nb-accent ml-2 text-xs font-bold">아직 고르지 않았어요</span>
              )}
            </p>
            <div className="grid grid-cols-5 gap-1" role="radiogroup" aria-label={cluster.label}>
              {SHORT_LABELS.map((label, i) => (
                <button
                  key={label}
                  type="button"
                  role="radio"
                  aria-checked={selected === i}
                  onClick={() => onChange(cluster.id, i as HourBucket)}
                  className={`min-h-11 rounded-lg border-2 border-[var(--nb-ink)] px-0.5 py-2 text-xs leading-tight ${
                    selected === i
                      ? "nb-selected font-bold"
                      : "bg-white text-gray-600"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        );
      })}
      {remaining > 0 && remaining < TASK_CLUSTERS.length && (
        <p className="text-xs text-gray-600" aria-live="polite">
          {remaining}줄이 남았어요. 모두 고르면 다음으로 넘어갈 수 있어요.
        </p>
      )}
    </div>
  );
}
