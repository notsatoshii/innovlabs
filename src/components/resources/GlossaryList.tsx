// 용어집: term (with the loanword in parentheses when the doc flags one),
// one analogy, one sentence of meaning. Server component; the list arrives
// already ordered by sort_order.

import type { GlossaryEntry } from "@/lib/resources/types";

export function GlossaryList({ entries }: { entries: GlossaryEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="nb-flat px-4 py-6 text-center text-sm text-gray-600">
        용어집을 정리하고 있어요. 곧 채워 둘게요.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {entries.map((entry) => (
        <li key={entry.id} className="nb-card px-4 py-4">
          <h3 className="text-base font-extrabold leading-tight">
            {entry.term}
            {entry.loanword && (
              <span className="ml-1 text-sm font-semibold text-gray-600">
                ({entry.loanword})
              </span>
            )}
          </h3>
          <p className="mt-2 text-sm leading-relaxed">
            <span className="mr-1 text-[11px] font-bold text-gray-500">비유하자면</span>
            {entry.analogy}
          </p>
          <p className="mt-1.5 text-sm leading-relaxed">
            <span className="mr-1 text-[11px] font-bold text-gray-500">그러니까</span>
            {entry.meaning}
          </p>
        </li>
      ))}
    </ul>
  );
}
