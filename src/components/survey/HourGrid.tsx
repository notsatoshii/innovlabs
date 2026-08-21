"use client";

// Q5 grid variant (A/B pilot): 8 task-cluster rows × 5 hour buckets.
// On a phone this renders as stacked rows with a compact 5-segment control.

import { TASK_CLUSTERS } from "@/lib/survey/questions";
import { HOUR_BUCKET_LABELS, type HourBucket, type TaskClusterId } from "@/lib/survey/types";

const SHORT_LABELS = ["0", "1–2", "3–5", "6–10", "10+"];

export function HourGrid({
  value,
  onChange,
}: {
  value: Partial<Record<TaskClusterId, HourBucket>>;
  onChange: (cluster: TaskClusterId, bucket: HourBucket) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-gray-500">
        단위: 주당 시간 ({HOUR_BUCKET_LABELS[0]} / 1–2 / 3–5 / 6–10 / 10시간 이상)
      </p>
      {TASK_CLUSTERS.map((cluster) => {
        const selected = value[cluster.id];
        return (
          <div key={cluster.id} className="nb-flat p-3">
            <p className="mb-2 text-sm font-bold">{cluster.label}</p>
            <div className="grid grid-cols-5 gap-1" role="radiogroup" aria-label={cluster.label}>
              {SHORT_LABELS.map((label, i) => (
                <button
                  key={label}
                  type="button"
                  role="radio"
                  aria-checked={selected === i}
                  onClick={() => onChange(cluster.id, i as HourBucket)}
                  className={`rounded-lg border-2 border-[var(--nb-ink)] py-2 text-xs ${
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
    </div>
  );
}
