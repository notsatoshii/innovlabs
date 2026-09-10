"use client";

// 도구 라이브러리 filters + list. The server passes the already-ordered list
// (learner's track first, then path, then sort_order); this component only
// narrows it. A few hundred entries at most, so filtering in memory is fine.

import { useMemo, useState } from "react";
import {
  CATEGORY_LABEL,
  DIFFICULTY_LABEL,
  STATUS_LABEL,
  TOOL_CATEGORIES,
  type Difficulty,
  type ToolCategory,
  type ToolEntry,
  type ToolPath,
  type ToolStatus,
} from "@/lib/resources/types";
import { ToolCard } from "./ToolCard";

const DIFFICULTIES: Difficulty[] = [1, 2, 3, 4];
const STATUSES = Object.keys(STATUS_LABEL) as Exclude<ToolStatus, "draft">[];

const PATH_LABEL: Record<ToolPath, string> = {
  browser: "브라우저 경로",
  agent: "에이전트·서버 경로",
};

function toggleIn<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={[
        "nb-badge min-h-8 px-3 text-xs",
        active ? "bg-[var(--nb-yellow)]" : "bg-[var(--nb-paper)]",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

export function ToolLibrary({
  tools,
  learnerPath,
}: {
  tools: ToolEntry[];
  /** null when the survey did not record a depth flag: the toggle is hidden. */
  learnerPath: ToolPath | null;
}) {
  const [difficulties, setDifficulties] = useState<Difficulty[]>([]);
  const [category, setCategory] = useState<ToolCategory | "">("");
  const [statuses, setStatuses] = useState<Exclude<ToolStatus, "draft">[]>([]);
  const [myPathOnly, setMyPathOnly] = useState(false);
  const [query, setQuery] = useState("");

  // Only offer categories that have at least one tool.
  const categories = useMemo(() => {
    const present = new Set(tools.map((t) => t.category));
    return TOOL_CATEGORIES.filter((c) => present.has(c));
  }, [tools]);

  const visible = useMemo(
    () =>
      tools.filter(
        (t) =>
          matchesQuery(t, query) &&
          (difficulties.length === 0 || difficulties.includes(t.difficulty)) &&
          (category === "" || t.category === category) &&
          (statuses.length === 0 ||
            (t.status !== "draft" && statuses.includes(t.status))) &&
          (!myPathOnly || learnerPath === null || t.paths.includes(learnerPath)),
      ),
    [tools, difficulties, category, statuses, myPathOnly, learnerPath, query],
  );

  const filtered =
    difficulties.length > 0 ||
    category !== "" ||
    statuses.length > 0 ||
    myPathOnly ||
    query.trim() !== "";

  function reset() {
    setDifficulties([]);
    setCategory("");
    setStatuses([]);
    setMyPathOnly(false);
    setQuery("");
  }

  return (
    <div className="flex flex-col gap-4">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="도구 이름이나 키워드로 찾기"
        aria-label="도구 검색"
        className="nb-input w-full px-4 py-2.5 text-[15px]"
      />
      <section className="nb-flat flex flex-col gap-3 px-4 py-4" aria-label="필터">
        <div>
          <p className="mb-1.5 text-xs font-bold text-gray-500">난이도</p>
          <div className="flex flex-wrap gap-1.5">
            {DIFFICULTIES.map((d) => (
              <Chip
                key={d}
                active={difficulties.includes(d)}
                onClick={() => setDifficulties((prev) => toggleIn(prev, d))}
              >
                {DIFFICULTY_LABEL[d].badge}
              </Chip>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="tool-category" className="mb-1.5 block text-xs font-bold text-gray-500">
            분류
          </label>
          <select
            id="tool-category"
            value={category}
            onChange={(e) => setCategory(e.target.value as ToolCategory | "")}
            className="nb-input w-full px-3 py-2 text-sm"
          >
            <option value="">전체</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABEL[c]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <p className="mb-1.5 text-xs font-bold text-gray-500">상태</p>
          <div className="flex flex-wrap gap-1.5">
            {STATUSES.map((s) => (
              <Chip
                key={s}
                active={statuses.includes(s)}
                onClick={() => setStatuses((prev) => toggleIn(prev, s))}
              >
                {STATUS_LABEL[s]}
              </Chip>
            ))}
          </div>
        </div>

        {learnerPath && (
          <label className="flex min-h-8 items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={myPathOnly}
              onChange={(e) => setMyPathOnly(e.target.checked)}
              className="h-4 w-4"
            />
            내 경로만 보기
            <span className="text-xs font-normal text-gray-500">({PATH_LABEL[learnerPath]})</span>
          </label>
        )}

        <p className="flex items-center justify-between text-xs text-gray-500">
          <span>
            {visible.length}개 도구
            {filtered && ` · 전체 ${tools.length}개`}
          </span>
          {filtered && (
            <button type="button" onClick={reset} className="font-bold underline">
              필터 지우기
            </button>
          )}
        </p>
      </section>

      {visible.length === 0 ? (
        <p className="nb-flat px-4 py-6 text-center text-sm text-gray-600">
          이 조건에 맞는 도구가 아직 없어요. 필터를 조금 풀어 보세요.
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {visible.map((tool) => (
            <li key={tool.id}>
              <ToolCard tool={tool} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Case-insensitive match on name, tags, category, and the four text fields. */
function matchesQuery(t: ToolEntry, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const hay = [
    t.name,
    t.id,
    t.category,
    ...t.tags,
    t.what_it_is,
    t.use_it_to ?? "",
    t.why_it_matters ?? "",
    t.watch_out ?? "",
    t.korean_notes ?? "",
  ]
    .join(" ")
    .toLowerCase();
  return q.split(/\s+/).every((word) => hay.includes(word));
}
