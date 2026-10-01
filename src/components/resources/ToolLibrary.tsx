"use client";

// 도구 view: level bar + at most five picks, everything else one scroll or
// one tap further (docs/app/phases/ui-tools-redesign.md §5). The server
// passes the tool list as fetched (sort_order, no drafts); the level, the
// search and the three sheet filters are client state only and reset when
// the learner leaves the tab. A few hundred entries, so it all runs in memory.

import { useEffect, useMemo, useRef, useState } from "react";
import {
  DIFFICULTY_LABEL,
  TOOL_CATEGORIES,
  type Difficulty,
  type ToolCategory,
  type ToolEntry,
  type ToolPath,
  type TrackCode,
} from "@/lib/resources/types";
import {
  LEVELS,
  compareForLearner,
  groupQueryResults,
  levelShort,
  matchesQuery,
  oneLiner,
  resolvePicks,
  snippetFor,
  type LevelPicks,
} from "@/lib/resources/picks";
import { FilterSheet } from "./FilterSheet";
import { LevelSwitch } from "./LevelSwitch";
import { FOCUS_RING, ToolRow } from "./ToolCard";

const SUGGESTIONS = ["회의록", "주간보고", "보고서", "리서치", "엑셀"];

const BROWSE_FIRST = 10; // rows of "다른 도구" before 더 보기
const RESULT_FIRST = 20; // rows of a result list before 더 보기
const MORE_STEP = 20;

const HEADING = `text-base font-extrabold leading-tight rounded-sm ${FOCUS_RING}`;
const ROWS = "nb-card overflow-hidden";

function MoreButton({ left, onClick }: { left: number; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`nb-btn nb-btn-white mt-3 min-h-11 w-full px-4 text-sm ${FOCUS_RING}`}
    >
      더 보기 ({left}개 남음)
    </button>
  );
}

function ResetButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`-mt-1 min-h-11 shrink-0 rounded-lg px-1 text-sm font-bold underline underline-offset-2 ${FOCUS_RING}`}
    >
      조건 지우기
    </button>
  );
}

export function ToolLibrary({
  tools,
  picks,
  myLevel,
  learnerPath,
  track,
}: {
  /** fetchTools() result as is: sort_order ascending, drafts already hidden by RLS. */
  tools: ToolEntry[];
  /** content/resources/picks.json */
  picks: LevelPicks[];
  /** null when the survey recorded no depth flag: L1 is shown and no level is claimed. */
  myLevel: Difficulty | null;
  learnerPath: ToolPath | null;
  track: TrackCode | null;
}) {
  const [level, setLevel] = useState<Difficulty>(myLevel ?? 1);
  const [query, setQuery] = useState("");
  const [taughtOnly, setTaughtOnly] = useState(false);
  const [category, setCategory] = useState<ToolCategory | "">("");
  const [myPathOnly, setMyPathOnly] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [more, setMore] = useState(0); // rows added by 더 보기
  const [announcement, setAnnouncement] = useState("");

  const barRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  // What to do once the next render is on screen: "level" (step-up / back
  // button: focus the heading, level bar to the top), "search" (a filter set
  // from below the fold: bring the search row back), "heading" (focus only),
  // "filter" (the sheet has closed: focus goes back to its button).
  const afterRender = useRef<"level" | "search" | "heading" | "filter" | null>(null);

  // Runs after FilterSheet's own effect, so the dialog is already closed.
  useEffect(() => {
    const todo = afterRender.current;
    if (!todo) return;
    afterRender.current = null;
    if (todo === "filter") {
      filterButtonRef.current?.focus({ preventScroll: true });
      return;
    }
    const bar = barRef.current;
    if (todo !== "search") headingRef.current?.focus({ preventScroll: true });
    if (!bar) return;
    if (todo === "level") bar.scrollIntoView({ block: "start" });
    else if (todo === "search" && bar.getBoundingClientRect().top < 0) {
      bar.scrollIntoView({ block: "start" });
    }
  });

  // Defensive: RLS already hides drafts.
  const visible = useMemo(() => tools.filter((t) => t.status !== "draft"), [tools]);

  const picksByLevel = useMemo(() => {
    const out = {} as Record<Difficulty, { tools: ToolEntry[]; reason: string }>;
    for (const l of LEVELS) out[l] = resolvePicks(picks, visible, l, track);
    return out;
  }, [picks, visible, track]);

  const categoriesByLevel = useMemo(() => {
    const out = {} as Record<Difficulty, { id: ToolCategory; count: number }[]>;
    for (const l of LEVELS) {
      const counts = new Map<ToolCategory, number>();
      for (const t of visible) {
        if (t.difficulty === l) counts.set(t.category, (counts.get(t.category) ?? 0) + 1);
      }
      out[l] = TOOL_CATEGORIES.filter((c) => counts.has(c)).map((c) => ({
        id: c,
        count: counts.get(c) ?? 0,
      }));
    }
    return out;
  }, [visible]);

  const q = query.trim();
  const filterCount = Number(taughtOnly) + Number(category !== "") + Number(myPathOnly);
  const resultMode = q !== "" || filterCount > 0;
  const pick = picksByLevel[level];
  const hasPicks = pick.tools.length > 0;
  const isMyLevel = myLevel !== null && level === myLevel;
  const levelBadge = DIFFICULTY_LABEL[level].badge;
  const Ln = levelShort(level);

  const lists = useMemo(() => {
    const order = compareForLearner(learnerPath, track);
    const atLevel = visible.filter((t) => t.difficulty === level);
    const passes = (t: ToolEntry) =>
      (!taughtOnly || t.status === "taught") &&
      (category === "" || t.category === category) &&
      (!myPathOnly || learnerPath === null || t.paths.includes(learnerPath));

    const pickIds = new Set(picksByLevel[level].tools.map((t) => t.id));
    const others = atLevel.filter((t) => !pickIds.has(t.id)).sort(order);

    let reachable: ToolEntry[] = [];
    let harder: ToolEntry[] = [];
    if (q !== "") {
      // A search looks at every level.
      const hits = visible.filter((t) => passes(t) && matchesQuery(t, q));
      ({ reachable, harder } = groupQueryResults(hits, level, learnerPath, track));
    } else if (taughtOnly || category !== "" || myPathOnly) {
      // Filters alone stay inside the selected level.
      reachable = atLevel.filter(passes).sort(order);
    }
    return { levelCount: atLevel.length, others, reachable, harder };
  }, [visible, level, q, taughtOnly, category, myPathOnly, learnerPath, track, picksByLevel]);

  const resultCount = lists.reachable.length + lists.harder.length;
  const limit = (resultMode ? RESULT_FIRST : BROWSE_FIRST) + more;
  // Rows remount, and so close, whenever the level, the query or a filter changes.
  const rowsKey = [level, q, taughtOnly, category, myPathOnly].join("|");

  // --- actions ---------------------------------------------------------------

  function changeLevel(next: Difficulty, fromButton = false) {
    if (next === level) return;
    setLevel(next);
    setMore(0);
    if (category !== "" && !categoriesByLevel[next].some((c) => c.id === category)) {
      setCategory("");
    }
    const count = picksByLevel[next].tools.length;
    setAnnouncement(
      !resultMode && count > 0 ? `${DIFFICULTY_LABEL[next].badge} 추천 ${count}개` : "",
    );
    if (fromButton) afterRender.current = "level";
  }

  function changeQuery(value: string) {
    setQuery(value);
    setMore(0);
    setSuggestOpen(value === "");
  }

  function chooseSuggestion(word: string) {
    setQuery(word);
    setMore(0);
    setSuggestOpen(false);
    inputRef.current?.blur(); // closes the phone keyboard so the results show
  }

  function clearAll() {
    setQuery("");
    setTaughtOnly(false);
    setCategory("");
    setMyPathOnly(false);
    setMore(0);
    afterRender.current = "heading"; // the button that had focus is gone
  }

  function resetSheet() {
    setTaughtOnly(false);
    setCategory("");
    setMyPathOnly(false);
    setMore(0);
  }

  function closeSheet() {
    if (!sheetOpen) return;
    setSheetOpen(false);
    afterRender.current = "filter";
  }

  // --- pieces ----------------------------------------------------------------

  const lineFor = (tool: ToolEntry): React.ReactNode => {
    if (q === "") return oneLiner(tool.what_it_is);
    const s = snippetFor(tool, q);
    if (!s.hit) return s.lead;
    return (
      <>
        {s.lead}
        <mark className="rounded-[3px] bg-[var(--nb-yellow)] px-0.5 font-semibold text-[var(--nb-ink)]">
          {s.hit}
        </mark>
        {s.tail}
      </>
    );
  };

  const rows = (list: ToolEntry[]) => (
    <ul key={rowsKey} className={ROWS}>
      {list.map((tool) => (
        <ToolRow key={tool.id} tool={tool} line={lineFor(tool)} />
      ))}
    </ul>
  );

  let body: React.ReactNode;
  if (!resultMode) {
    const shownOthers = lists.others.slice(0, limit);
    body = (
      <>
        {hasPicks && (
          <section aria-labelledby="tool-picks-heading">
            <h2 id="tool-picks-heading" ref={headingRef} tabIndex={-1} className={HEADING}>
              {isMyLevel ? "내 레벨에 맞는 추천" : `${levelBadge} 추천`}
            </h2>
            <p className="mb-1.5 text-[13px] leading-[1.45] text-gray-700">{pick.reason}</p>
            {rows(pick.tools)}
          </section>
        )}

        {hasPicks && (level < 4 || (myLevel !== null && !isMyLevel)) && (
          <div className="flex flex-col items-center gap-2">
            {level < 4 && (
              <button
                type="button"
                onClick={() => changeLevel((level + 1) as Difficulty, true)}
                className={`nb-btn nb-btn-white min-h-11 w-full px-4 text-sm ${FOCUS_RING}`}
              >
                한 단계 위, {DIFFICULTY_LABEL[(level + 1) as Difficulty].badge} 추천 보기
              </button>
            )}
            {myLevel !== null && !isMyLevel && (
              <button
                type="button"
                onClick={() => changeLevel(myLevel, true)}
                className={`min-h-11 rounded-lg px-3 text-sm font-bold underline underline-offset-2 ${FOCUS_RING}`}
              >
                내 레벨 {levelShort(myLevel)}로 돌아가기
              </button>
            )}
          </div>
        )}

        {lists.others.length > 0 && (
          <section aria-labelledby="tool-level-heading">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2
                id="tool-level-heading"
                ref={hasPicks ? undefined : headingRef}
                tabIndex={hasPicks ? undefined : -1}
                className={HEADING}
              >
                {hasPicks
                  ? `${Ln}의 다른 도구 ${lists.others.length}개`
                  : `${Ln} 도구 ${lists.others.length}개`}
              </h2>
              <button
                type="button"
                aria-pressed={taughtOnly}
                onClick={() => {
                  setTaughtOnly(true);
                  setMore(0);
                  afterRender.current = "search";
                }}
                className={`nb-badge min-h-11 shrink-0 bg-[var(--nb-paper)] px-4 text-sm ${FOCUS_RING}`}
              >
                수업 도구만
              </button>
            </div>
            {rows(shownOthers)}
            {lists.others.length > shownOthers.length && (
              <MoreButton
                left={lists.others.length - shownOthers.length}
                onClick={() => setMore((n) => n + MORE_STEP)}
              />
            )}
          </section>
        )}
      </>
    );
  } else if (resultCount === 0) {
    body = (
      <div role="status" className="nb-flat flex flex-col items-center gap-1 px-4 py-5 text-center">
        <p className="text-sm leading-relaxed text-gray-700">
          {q !== ""
            ? `‘${q}’에 맞는 도구를 아직 못 찾았어요. 다른 말로 다시 찾아보세요.`
            : `이 조건에 맞는 ${Ln} 도구가 아직 없어요. 조건을 조금 풀어 보세요.`}
        </p>
        <button
          type="button"
          onClick={clearAll}
          className={`min-h-11 rounded-lg px-3 text-sm font-bold underline underline-offset-2 ${FOCUS_RING}`}
        >
          조건 지우기
        </button>
      </div>
    );
  } else {
    const shownReachable = lists.reachable.slice(0, limit);
    const shownHarder = lists.harder.slice(0, Math.max(0, limit - lists.reachable.length));
    const shown = shownReachable.length + shownHarder.length;
    const both = lists.reachable.length > 0 && lists.harder.length > 0;
    const onlyTaught = taughtOnly && category === "" && !myPathOnly;
    body = (
      <section aria-labelledby="tool-result-heading">
        <div className="mb-2">
          <div className="flex items-center justify-between gap-2">
            <h2 id="tool-result-heading" aria-live="polite" className={`min-w-0 ${HEADING}`}>
              {q !== ""
                ? `‘${q}’ 검색 결과 ${resultCount}개`
                : onlyTaught
                  ? `수업에서 다루는 ${Ln} 도구 ${resultCount}개`
                  : `조건에 맞는 ${Ln} 도구 ${resultCount}개`}
            </h2>
            <ResetButton onClick={clearAll} />
          </div>
          {q !== "" && both && (
            <p className="text-[13px] leading-[1.45] text-gray-700">
              지금 레벨에서 쓸 수 있는 도구부터 보여 드려요.
            </p>
          )}
        </div>

        {shownReachable.length > 0 && rows(shownReachable)}
        {shownHarder.length > 0 && (
          <>
            <h3
              className={[
                "mb-2 text-sm font-extrabold",
                shownReachable.length > 0 ? "mt-4" : "",
              ].join(" ")}
            >
              더 높은 레벨의 도구 {lists.harder.length}개
            </h3>
            <ul key={`${rowsKey}|harder`} className={ROWS}>
              {shownHarder.map((tool) => (
                <ToolRow key={tool.id} tool={tool} line={lineFor(tool)} />
              ))}
            </ul>
          </>
        )}
        {resultCount > shown && (
          <MoreButton left={resultCount - shown} onClick={() => setMore((n) => n + MORE_STEP)} />
        )}
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div ref={barRef} className="scroll-mt-5">
        <LevelSwitch value={level} myLevel={myLevel} onChange={(next) => changeLevel(next)} />
      </div>

      <div
        className="flex flex-col gap-2"
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setSuggestOpen(false);
        }}
      >
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="search"
            enterKeyHint="search"
            value={query}
            onChange={(e) => changeQuery(e.target.value)}
            onFocus={() => {
              if (query === "") setSuggestOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
            placeholder="이름이나 할 일로 찾기"
            aria-label="도구 검색"
            className="nb-input min-h-11 min-w-0 flex-1 px-3.5 text-base"
          />
          <button
            ref={filterButtonRef}
            type="button"
            aria-haspopup="dialog"
            aria-label={filterCount > 0 ? `필터 열기, ${filterCount}개 적용 중` : "필터 열기"}
            onClick={() => {
              setSuggestOpen(false);
              setSheetOpen(true);
            }}
            className={[
              "nb-btn min-h-11 shrink-0 px-3.5 text-sm",
              filterCount > 0 ? "nb-btn-primary" : "nb-btn-white",
              FOCUS_RING,
            ].join(" ")}
          >
            {filterCount > 0 ? `필터 ${filterCount}` : "필터"}
          </button>
        </div>

        {suggestOpen && (
          // mousedown is cancelled so the field keeps focus until the chip's
          // click has run; otherwise the blur would remove the chips first.
          <div onMouseDown={(e) => e.preventDefault()}>
            <p className="mb-1.5 text-xs font-bold text-gray-700">자주 찾는 일</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((word) => (
                <button
                  key={word}
                  type="button"
                  onClick={() => chooseSuggestion(word)}
                  className={`nb-badge min-h-11 bg-[var(--nb-paper)] px-4 text-sm ${FOCUS_RING}`}
                >
                  {word}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {body}

      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>

      <FilterSheet
        open={sheetOpen}
        onClose={closeSheet}
        level={level}
        taughtOnly={taughtOnly}
        onTaughtOnly={(v) => {
          setTaughtOnly(v);
          setMore(0);
        }}
        category={category}
        onCategory={(c) => {
          setCategory(c);
          setMore(0);
        }}
        categories={categoriesByLevel[level]}
        learnerPath={learnerPath}
        myPathOnly={myPathOnly}
        onMyPathOnly={(v) => {
          setMyPathOnly(v);
          setMore(0);
        }}
        resultCount={resultMode ? resultCount : lists.levelCount}
        onReset={resetSheet}
      />
    </div>
  );
}
