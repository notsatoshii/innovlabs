// A learner's submitted Work Map in full, for staff (Week 1, SP-W1-WM):
// every row grouped by category with P or T, the totals, and the three
// automation candidates with their five scores. Server-safe, read-only.
//
// The snapshot comes from a `work_map_submitted` event or the derived
// user_profile.work_map column; asWorkMap() tolerates a partial payload so a
// shape drift shows what it can instead of throwing.

import type { WorkMapSnapshot } from "@/lib/profile/types";
import { fmtHours } from "./format";
import { Chip, ScrollTable } from "./ui";

type Scores = WorkMapSnapshot["candidates"][number]["scores"];

// Short column names for staff; the learner-facing questions live with the lab.
const CRITERIA: { key: keyof Scores; label: string }[] = [
  { key: "recurs", label: "반복 주기" },
  { key: "digital_inputs", label: "자료 준비" },
  { key: "stable_rules", label: "방법 명확" },
  { key: "ownership", label: "내 일 범위" },
  { key: "low_cost_wrong", label: "틀려도 괜찮음" },
];

/** A usable snapshot, or null when the value is not one. */
export function asWorkMap(value: unknown): WorkMapSnapshot | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Partial<WorkMapSnapshot>;
  if (!Array.isArray(v.rows)) return null;
  const rows = v.rows.filter((r) => r && typeof r === "object");
  const sum = (kind: "P" | "T") =>
    rows.reduce((total, r) => total + (r.kind === kind && Number.isFinite(r.hours) ? r.hours : 0), 0);
  return {
    version: 1,
    submitted_at: typeof v.submitted_at === "string" ? v.submitted_at : "",
    categories: Array.isArray(v.categories) ? v.categories : [],
    rows,
    totals:
      v.totals && typeof v.totals.p_hours === "number" && typeof v.totals.t_hours === "number"
        ? v.totals
        : { p_hours: sum("P"), t_hours: sum("T") },
    candidates: Array.isArray(v.candidates) ? v.candidates.filter((c) => c && typeof c === "object") : [],
  };
}

export default function WorkMapView({ workMap }: { workMap: WorkMapSnapshot }) {
  const { rows, categories, totals } = workMap;
  const candidates = [...workMap.candidates].sort((a, b) => (a.rank ?? 9) - (b.rank ?? 9));
  const rankByRow = new Map(candidates.map((c) => [c.task_row, c.rank]));

  // Rows keep their snapshot index (candidates point at it) while grouped.
  const indexed = rows.map((row, index) => ({ row, index }));
  const known = new Set(categories.map((c) => c.id));
  const groups = [
    ...categories.map((category) => ({
      id: category.id,
      label: category.label,
      hoursSurvey: category.hours_survey,
      items: indexed.filter((item) => item.row.category === category.id),
    })),
    {
      id: "__other",
      label: "분류 없음",
      hoursSurvey: 0,
      items: indexed.filter((item) => !known.has(item.row.category)),
    },
  ].filter((group) => group.items.length > 0);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm leading-relaxed text-gray-700">
        업무 {rows.length}줄 · P(처리) 주 {fmtHours(totals.p_hours)}시간 · T(판단) 주 {fmtHours(totals.t_hours)}시간
        · 합계 주 {fmtHours(totals.p_hours + totals.t_hours)}시간
      </p>

      <ScrollTable head={["업무", "주당 시간", "구분", "후보"]} minWidth="min-w-[34rem]">
        {groups.map((group) => {
          const groupHours = group.items.reduce((total, item) => total + (item.row.hours || 0), 0);
          return [
            <tr key={`${group.id}-head`} className="bg-[var(--background)]">
              <td colSpan={4} className="text-xs font-extrabold">
                {group.label}
                <span className="ml-2 font-semibold text-gray-500">
                  워크맵 주 {fmtHours(groupHours)}시간
                  {group.hoursSurvey > 0 && ` · 진단 때는 주 ${fmtHours(group.hoursSurvey)}시간쯤`}
                </span>
              </td>
            </tr>,
            ...group.items.map(({ row, index }) => {
              const rank = rankByRow.get(index);
              return (
                <tr key={`${group.id}-${index}`}>
                  <td>{row.task}</td>
                  <td className="whitespace-nowrap">주 {fmtHours(row.hours)}시간</td>
                  <td>
                    <Chip tone={row.kind === "P" ? "done" : "info"}>{row.kind === "P" ? "P 처리" : "T 판단"}</Chip>
                  </td>
                  <td>{rank ? <Chip tone="warn">후보 {rank}</Chip> : null}</td>
                </tr>
              );
            }),
          ];
        })}
      </ScrollTable>

      <div>
        <h3 className="mb-2 text-sm font-extrabold">자동화 후보 세 가지</h3>
        {candidates.length === 0 ? (
          <p className="text-sm text-gray-500">고른 후보가 없어요.</p>
        ) : (
          <>
            <ScrollTable
              head={["순위", "업무", "주당 시간", ...CRITERIA.map((c) => c.label), "합계"]}
              minWidth="min-w-[52rem]"
            >
              {candidates.map((candidate) => {
                const row = rows[candidate.task_row];
                return (
                  <tr key={`${candidate.rank}-${candidate.task_row}`}>
                    <td className="whitespace-nowrap font-extrabold">{candidate.rank}순위</td>
                    <td>{row?.task ?? "업무를 찾을 수 없어요"}</td>
                    <td className="whitespace-nowrap">{row ? `주 ${fmtHours(row.hours)}시간` : ""}</td>
                    {CRITERIA.map((c) => (
                      <td key={c.key} className="whitespace-nowrap">
                        {candidate.scores?.[c.key] ?? "없음"}
                      </td>
                    ))}
                    <td className="whitespace-nowrap font-extrabold">{candidate.total}점</td>
                  </tr>
                );
              })}
            </ScrollTable>
            <p className="mt-2 text-xs leading-relaxed text-gray-500">
              항목마다 1~3점, 합계는 15점 만점이에요. 11점이 안 되는 후보는 수업에서 한 번 더 같이 살펴봐 주세요.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
