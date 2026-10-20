"use client";

// The mission player: one screen at a time with the beat rail, the XP pill
// and one primary button that stays disabled until every interaction on the
// screen reports done. Moving on posts progress (the furthest screen); the
// screen after the last is the reward, which posts `done` and shows the
// badges. XP shown is what the server paid (O1-D4); a failed call never
// blocks the button.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Block, MissionContent, ProgressResponse, XpPart } from "@/lib/course/types";
import type { DrillDraft, WorkMapDraft } from "@/lib/courses/types";
import { useDraft } from "@/components/lab/useDraft";
import type { EditorCategory } from "@/components/lab/work-map/types";
import { Blocks, interactionsOf, packsOf } from "./Blocks";
import { MediaCard } from "./MediaCard";
import { NetLine, PlayerContext, type LocalState, type PlayerApi } from "./context";
import { InteractionView } from "./InteractionView";
import { MoaSprite, preloadMoaSheets } from "./MoaSprite";
import { RewardScreen, type LevelProgress } from "./RewardScreen";
import { useReducedMotion } from "./useReducedMotion";

export interface MissionPlayerProps {
  /** Slots already resolved on the server. */
  mission: MissionContent;
  /** Furthest screen reached before (resume point); 0 for a fresh or finished mission. */
  startScreen: number;
  /** Capped mission XP so far, and per part. */
  xp: number;
  parts: Record<XpPart, { got: number; cap: number }>;
  /** The level's skip test was passed: skippable screens are skipped. */
  skipPassed: boolean;
  /** Level totals before this visit, this mission included. */
  level: LevelProgress;
  alreadyDone: boolean;
  nextMission: { id: string; title: string } | null;
  workMapInitial: WorkMapDraft;
  drillInitial: DrillDraft;
  categories: EditorCategory[];
  seedCategory: string;
  drillTask: string;
}

async function postProgress(missionId: string, screen: number, done?: boolean): Promise<ProgressResponse | null> {
  try {
    const res = await fetch("/api/course/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ missionId, screen, ...(done ? { done: true } : {}) }),
      keepalive: true,
    });
    if (!res.ok) return null;
    const json = (await res.json().catch(() => null)) as { ok?: boolean; data?: ProgressResponse } | ProgressResponse | null;
    if (!json) return null;
    if ("ok" in json && json.ok === true && json.data) return json.data;
    if ("badges" in json) return json;
    return null;
  } catch {
    return null;
  }
}

export default function MissionPlayer(props: MissionPlayerProps) {
  const { mission, skipPassed } = props;
  const reduced = useReducedMotion();
  const screens = mission.screens;
  const skipped = useCallback((k: number) => skipPassed && !!screens[k]?.skippable, [skipPassed, screens]);
  const firstFrom = useCallback(
    (k: number) => {
      let n = k;
      while (n < screens.length && skipped(n)) n++;
      return n;
    },
    [screens.length, skipped],
  );

  const [index, setIndex] = useState(() => firstFrom(Math.min(Math.max(0, props.startScreen), screens.length - 1)));
  const [done, setDone] = useState<ReadonlySet<string>>(() => new Set());
  const [xp, setXp] = useState(props.xp);
  const [parts, setParts] = useState(props.parts);
  const [bump, setBump] = useState(0);
  const [local, setLocalState] = useState<LocalState>({ rounds: {}, choices: {}, slip: false, deferred: [] });
  const [reward, setReward] = useState<{ badges: string[] | null; failed: boolean } | null>(null);
  // 모아's reaction to the last answer; `n` replays the same mood twice in a row.
  const [reaction, setReaction] = useState<{ mood: "nod" | "wince"; n: number; at: number } | null>(null);
  const screenRef = useRef<HTMLElement>(null);

  const workMap = useDraft<WorkMapDraft>("work_map", props.workMapInitial);
  const drill = useDraft<DrillDraft>("drill", props.drillInitial);

  const packs = useMemo(() => {
    const out: Record<string, string> = {};
    for (const s of screens) packsOf(s.blocks, out);
    return out;
  }, [screens]);

  const onAward = useCallback((part: XpPart | undefined, amount: number, missionXp: number) => {
    setXp(missionXp);
    if (amount > 0) {
      setBump((n) => n + 1);
      if (part) {
        setParts((prev) => {
          const cur = prev[part] ?? { got: 0, cap: mission.caps[part] ?? 0 };
          return { ...prev, [part]: { ...cur, got: Math.min(cur.cap, cur.got + amount) } };
        });
      }
    }
  }, [mission.caps]);

  const setLocal = useCallback((patch: (prev: LocalState) => LocalState) => setLocalState(patch), []);
  const saveProgress = useCallback(async () => {
    await postProgress(mission.id, index);
  }, [mission.id, index]);
  const react = useCallback(
    (ok: boolean) => setReaction((r) => ({ mood: ok ? "nod" : "wince", n: (r?.n ?? 0) + 1, at: index })),
    [index],
  );

  const api: PlayerApi = {
    missionId: mission.id,
    caps: mission.caps,
    reduced,
    packs,
    local,
    setLocal,
    onAward,
    workMap,
    drill,
    categories: props.categories,
    seedCategory: props.seedCategory,
    drillTask: props.drillTask,
    saveProgress,
    react,
  };

  const onReward = index >= screens.length;
  const screen = onReward ? null : screens[index];
  const pending = screen ? interactionsOf(screen.blocks).filter((it) => !done.has(it.id)) : [];
  const last = index === screens.length - 1;
  // A reaction belongs to the screen it happened on; otherwise 모아 thinks
  // while the screen still has steps open, and rests when it has none.
  const live = reaction && reaction.at === index ? reaction : null;
  const coachMood = live ? live.mood : pending.length > 0 ? "think" : "idle";

  useEffect(preloadMoaSheets, []);

  // Each new screen starts at the top with focus on it, for screen readers.
  useEffect(() => {
    try {
      window.scrollTo({ top: 0 });
    } catch {
      // Older browsers: no scroll reset.
    }
    screenRef.current?.focus({ preventScroll: true });
  }, [index]);

  const finishMission = useCallback(async () => {
    setReward({ badges: null, failed: false });
    // `done` goes with the last screen's index (the route refuses any other).
    const res = await postProgress(mission.id, screens.length - 1, true);
    setReward(res ? { badges: res.badges, failed: false } : { badges: [], failed: true });
  }, [mission.id, screens.length]);

  const next = () => {
    const to = firstFrom(index + 1);
    setIndex(to);
    if (to >= screens.length) void finishMission();
    else void postProgress(mission.id, to);
  };

  const markDone = useCallback((id: string) => {
    setDone((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
  }, []);

  const renderInteraction = useCallback(
    (block: Extract<Block, { t: "i" }>) => <InteractionView i={block.i} onDone={() => markDone(block.i.id)} />,
    [markDone],
  );

  const maxXp = Object.values(mission.caps).reduce((s, n) => s + n, 0);
  const levelNow: LevelProgress = {
    ...props.level,
    xp: props.level.xp - props.xp + xp,
    done: props.level.done + (props.alreadyDone || !onReward ? 0 : 1),
  };

  return (
    <PlayerContext.Provider value={api}>
      <div className="c-root">
        <div className="flex items-baseline justify-between gap-2 text-[13px] text-[var(--course-muted)]">
          <b className="c-display text-[16px] text-[var(--course-ink)]">
            {mission.boss ? "" : `미션 ${mission.id.replace(/^M/, "")} `}
            {mission.title}
          </b>
          <span className="shrink-0">
            ⏱ {mission.minutes}분 · 최대 {maxXp} XP
          </span>
        </div>
        <div className="nb-card c-player">
          <div className="c-top">
            <Link href="/app/course" className="c-back" aria-label="레벨 지도로">
              ←
            </Link>
            <div className="c-rail" aria-hidden>
              {screens.map((_, k) => (
                <i
                  key={k}
                  className={skipped(k) ? "is-skip" : k < index ? "is-done" : k === index ? "is-on" : ""}
                />
              ))}
              <i className={onReward ? "is-on" : ""} />
            </div>
            <div
              key={bump}
              className={`c-xp${bump > 0 && !reduced ? " is-bump" : ""}`}
              role="status"
              aria-label={`이 미션 ${xp} XP`}
            >
              {xp} XP
            </div>
          </div>
          <div className="c-beat">
            <div>
              BEAT {Math.min(index, screens.length) + 1}
              <b>{screen ? screen.beat : "보상"}</b>
            </div>
            {screen && (
              <MoaSprite
                key={`${index}-${live?.n ?? 0}`}
                mood={coachMood}
                size={48}
                className="c-beat-moa"
                onEnd={() => setReaction(null)}
              />
            )}
          </div>
          <section
            ref={screenRef}
            tabIndex={-1}
            className="c-screen"
            aria-label={screen ? screen.beat : "보상"}
            key={index}
          >
            {screen ? (
              <>
                {screen.media && <MediaCard media={screen.media} />}
                <Blocks blocks={screen.blocks} renderInteraction={renderInteraction} />
                <div className="c-next">
                  <button
                    type="button"
                    className="nb-btn nb-btn-primary c-btn"
                    disabled={pending.length > 0}
                    onClick={next}
                  >
                    {screen.next ?? (last ? "보상 받기" : "다음")}
                  </button>
                </div>
              </>
            ) : (
              <>
                <RewardScreen
                  mission={mission}
                  xp={xp}
                  parts={parts}
                  level={levelNow}
                  newBadges={reward?.badges ?? null}
                  nextMission={props.nextMission}
                  reduced={reduced}
                />
                <NetLine failed={!!reward?.failed} onRetry={() => void finishMission()} />
              </>
            )}
          </section>
        </div>
      </div>
    </PlayerContext.Provider>
  );
}
