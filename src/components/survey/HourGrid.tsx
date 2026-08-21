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
          <div key={cluster.id} className="rounded-xl border border-gray-200 bg-white p-3">
            <p className="mb-2 text-sm font-medium text-gray-800">{cluster.label}</p>
            <div className="grid grid-cols-5 gap-1" role="radiogroup" aria-label={cluster.label}>
              {SHORT_LABELS.map((label, i) => (
                <button
                  key={label}
                  type="button"
                  role="radio"
                  aria-checked={selected === i}
                  onClick={() => onChange(cluster.id, i as HourBucket)}
                  className={`rounded-lg border py-2 text-xs transition-colors ${
                    selected === i
                      ? "border-blue-600 bg-blue-600 font-semibold text-white"
                      : "border-gray-200 bg-gray-50 text-gray-600 active:bg-gray-100"
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
