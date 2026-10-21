"use client";

// The mission player: one screen at a time with the beat rail, the XP pill
// and one primary button that stays disabled until every interaction on the
// screen reports done. Moving on posts progress (the furthest screen); the
// screen after the last is the end, which first sends whatever waits in the
// outbox, then posts `done`. The reward (XP count-up, badges, the next
// mission) is shown only once the server accepted `done`; when it refused,
// the end names the screens whose steps are not recorded and takes the
// learner back to them (review P0-1). XP shown is what the server paid
// (O1-D4).
//
// Screen state shared between screens (B1's material choice, the pasted
// rounds, an out-of-order slip) is saved to the learner's own course_local
// row (POST /api/course/local, readable by the learner only; migration 0013)
// on every change, so closing the tab or switching devices keeps it; the
// page passes the stored row in as `localInitial`. This tab also keeps a
// copy in sessionStorage with the outbox, so a reload before a save landed
// loses nothing (review P1-8); a failed save is sent again when the
// connection comes back and before the mission's end.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Block, MissionContent, ProgressResponse, XpPart } from "@/lib/course/types";
import type { DrillDraft, WorkMapDraft } from "@/lib/courses/types";
import { liveSlots, resolveSlots, visibleBlocks, type LiveValues } from "@/lib/course/fill";
import { useDraft } from "@/components/lab/useDraft";
import type { EditorCategory } from "@/components/lab/work-map/types";
import { Blocks, interactionsOf, packsOf } from "./Blocks";
import { MediaCard } from "./MediaCard";
import {
  EMPTY_LOCAL,
  NetLine,
  PlayerContext,
  pendingKey,
  postJson,
  readSession,
  retryable,
  writeSession,
  type CallError,
  type CallResult,
  type LocalState,
  type Pending,
  type PlayerApi,
} from "./context";
import { InteractionView } from "./InteractionView";
import { MoaSprite, preloadMoaSheets } from "./MoaSprite";
import { RewardScreen, type LevelEnd, type LevelProgress } from "./RewardScreen";
import { useReducedMotion } from "./useReducedMotion";

export interface MissionPlayerProps {
  /** Slots resolved on the server, except the live Work Map slots. */
  mission: MissionContent;
  /** The live slots' values when the page loaded (the player fills them from the draft). */
  live: LiveValues;
  /** Where to open: the first screen with an unrecorded step, else the furthest reached; 0 for a finished mission. */
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
  /** The level's end card, for the boss (what comes after Level 1). */
  levelEnd: LevelEnd | null;
  workMapInitial: WorkMapDraft;
  drillInitial: DrillDraft;
  categories: EditorCategory[];
  seedCategory: string;
  drillTask: string;
  drillTask2: string;
  /** The mission's kept screen state from course_local (empty when none). */
  localInitial?: LocalState;
}

type Finish =
  | { state: "sending" }
  | { state: "ok"; badges: string[] }
  | { state: "missing"; ids: string[] }
  | { state: "error"; error: CallError };

const localKey = (id: string) => `c-local:${id}`;
const outboxKey = (id: string) => `c-outbox:${id}`;

function postProgress(missionId: string, screen: number, done?: boolean): Promise<CallResult<ProgressResponse>> {
  return postJson<ProgressResponse>("/api/course/progress", { missionId, screen, ...(done ? { done: true } : {}) }, true);
}

/** A screen's name for the "not recorded yet" list: its heading, else its beat and number. */
function screenName(mission: MissionContent, k: number): string {
  const s = mission.screens[k];
  const h = s?.blocks.find((b): b is Extract<Block, { t: "h" }> => b.t === "h");
  const text = h ? h.text.replace(/\*\*/g, "").split("\n")[0] : "";
  if (text) return text.length > 40 ? `${text.slice(0, 39)}…` : text;
  return `${k + 1}번째 화면 · ${s?.beat ?? ""}`;
}

export default function MissionPlayer(props: MissionPlayerProps) {
  const { skipPassed } = props;
  const router = useRouter();
  const reduced = useReducedMotion();
  const workMap = useDraft<WorkMapDraft>("work_map", props.workMapInitial);
  const drill = useDraft<DrillDraft>("drill", props.drillInitial);

  // The live Work Map slots follow the draft being edited (review P1-1).
  const live = liveSlots(workMap.draft, props.live);
  const liveSig = JSON.stringify(live);
  const mission = useMemo(
    () => resolveSlots(props.mission, JSON.parse(liveSig) as LiveValues),
    [props.mission, liveSig],
  );
  const screens = mission.screens;
  const last = screens.length - 1;

  const skipped = useCallback((k: number) => skipPassed && !!screens[k]?.skippable, [skipPassed, screens]);
  const firstFrom = useCallback(
    (k: number) => {
      let n = k;
      while (n < screens.length && skipped(n)) n++;
      return n;
    },
    [screens.length, skipped],
  );

  const [index, setIndex] = useState(() => firstFrom(Math.min(Math.max(0, props.startScreen), last)));
  const [done, setDone] = useState<ReadonlySet<string>>(() => new Set());
  const [xp, setXp] = useState(props.xp);
  const [parts, setParts] = useState(props.parts);
  const [bump, setBump] = useState(0);
  const [local, setLocalState] = useState<LocalState>(() => props.localInitial ?? EMPTY_LOCAL);
  const [finish, setFinish] = useState<Finish | null>(null);
  const [outbox, setOutbox] = useState<Pending[]>([]);
  // 모아's reaction to the last answer; `n` replays the same mood twice in a row.
  const [reaction, setReaction] = useState<{ mood: "nod" | "wince"; n: number; at: number } | null>(null);
  const screenRef = useRef<HTMLElement>(null);
  const outboxRef = useRef<Pending[]>([]);
  const chain = useRef<Promise<unknown>>(Promise.resolve());
  const flushRef = useRef<() => Promise<boolean>>(async () => true);
  // Bumped when browser-only state came back after a reload: the screen
  // remounts so its interactions start from it.
  const [restored, setRestored] = useState(0);

  const packs = useMemo(() => {
    const out: Record<string, string> = {};
    for (const s of screens) packsOf(s.blocks, out);
    return out;
  }, [screens]);

  const onAward = useCallback(
    (part: XpPart | undefined, amount: number, missionXp: number) => {
      setXp(missionXp);
      if (amount > 0) {
        setBump((n) => n + 1);
        if (part) {
          setParts((prev) => {
            const cur = prev[part] ?? { got: 0, cap: props.mission.caps[part] ?? 0 };
            return { ...prev, [part]: { ...cur, got: Math.min(cur.cap, cur.got + amount) } };
          });
        }
      }
    },
    [props.mission.caps],
  );

  // --- Screen state: saved to the learner's row; this tab keeps a copy ---
  const localRef = useRef<LocalState>(local);
  const localDirty = useRef(false);
  const localSaving = useRef<Promise<boolean> | null>(null);

  /** Sends the current screen state to course_local; true when it is stored. */
  const saveLocal = useCallback(async (): Promise<boolean> => {
    while (localSaving.current) await localSaving.current;
    let stored = true;
    // A change made while a save was in flight goes out on the next pass.
    while (localDirty.current) {
      localDirty.current = false;
      const cur = localRef.current;
      const rounds = Object.fromEntries(Object.entries(cur.rounds).filter(([, v]) => !!v));
      const body = {
        missionId: props.mission.id,
        ...(Object.keys(rounds).length > 0 ? { rounds } : {}),
        ...(Object.keys(cur.choices).length > 0 ? { choices: cur.choices } : {}),
        ...(cur.slip ? { slip: true } : {}),
      };
      if (Object.keys(body).length === 1) return true;
      const run = postJson<{ updatedAt: string }>("/api/course/local", body).then((res) => {
        // Sent again when the connection comes back, or before the mission's end.
        if (!res.ok && retryable(res.error)) localDirty.current = true;
        return res.ok;
      });
      localSaving.current = run;
      stored = await run;
      localSaving.current = null;
      if (!stored) return false;
    }
    return stored;
  }, [props.mission.id]);

  useEffect(() => {
    const savedLocal = readSession<LocalState>(localKey(props.mission.id));
    const savedBox = readSession<Pending[]>(outboxKey(props.mission.id));
    // Restoring after hydration: the server render cannot see sessionStorage.
    // This tab's copy is the newest when it exists (a save may not have landed).
    queueMicrotask(() => {
      if (savedLocal && typeof savedLocal === "object") {
        const restoredLocal: LocalState = {
          rounds: { ...(props.localInitial?.rounds ?? {}), ...(savedLocal.rounds ?? {}) },
          choices: { ...(props.localInitial?.choices ?? {}), ...(savedLocal.choices ?? {}) },
          slip: savedLocal.slip === true || props.localInitial?.slip === true,
        };
        localRef.current = restoredLocal;
        setLocalState(restoredLocal);
        setRestored((n) => n + 1);
        localDirty.current = true;
        void saveLocal();
      }
      if (Array.isArray(savedBox) && savedBox.length > 0) {
        outboxRef.current = savedBox;
        setOutbox(savedBox);
        void flushRef.current();
      }
    });
    // Once, on mount: later prop changes come from a reload, which remounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.mission.id]);

  const setLocal = useCallback(
    (patch: (prev: LocalState) => LocalState) => {
      const next = patch(localRef.current);
      localRef.current = next;
      writeSession(localKey(props.mission.id), next);
      setLocalState(next);
      localDirty.current = true;
      void saveLocal();
    },
    [props.mission.id, saveLocal],
  );

  const storeOutbox = useCallback(
    (next: Pending[]) => {
      outboxRef.current = next;
      setOutbox(next);
      writeSession(outboxKey(props.mission.id), next.length > 0 ? next : null);
    },
    [props.mission.id],
  );

  /** One call through the queue: in order, one at a time. */
  const sendNow = useCallback(
    <T,>(p: Pending): Promise<CallResult<T>> => {
      const run = async (): Promise<CallResult<T>> => {
        const res = await postJson<T>(p.kind === "answer" ? "/api/course/answer" : "/api/course/step", p.body);
        if (res.ok) {
          const d = res.data as unknown as { amount: number; missionXp: number };
          onAward(p.part, d.amount, d.missionXp);
        }
        return res;
      };
      const next = chain.current.then(run, run);
      chain.current = next.catch(() => undefined);
      return next;
    },
    [onAward],
  );

  const send = useCallback(
    async <T,>(p: Pending): Promise<CallResult<T>> => {
      const res = await sendNow<T>(p);
      const key = pendingKey(p);
      const without = outboxRef.current.filter((x) => pendingKey(x) !== key);
      if (res.ok || !retryable(res.error)) {
        if (without.length !== outboxRef.current.length) storeOutbox(without);
      } else {
        storeOutbox([...without, p]);
      }
      return res;
    },
    [sendNow, storeOutbox],
  );

  const flush = useCallback(async (): Promise<boolean> => {
    const queue = outboxRef.current.slice();
    for (const p of queue) await send(p);
    return outboxRef.current.length === 0;
  }, [send]);

  useEffect(() => {
    flushRef.current = flush;
  }, [flush]);

  // Send the outbox and the screen state again when the connection comes back.
  useEffect(() => {
    const onOnline = () => {
      void flush();
      void saveLocal();
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [flush, saveLocal]);

  const queued = useMemo(() => new Set(outbox.map(pendingKey)), [outbox]);

  const react = useCallback(
    (ok: boolean) => setReaction((r) => ({ mood: ok ? "nod" : "wince", n: (r?.n ?? 0) + 1, at: index })),
    [index],
  );

  // --- The end ---
  const finishMission = useCallback(async (): Promise<boolean> => {
    setFinish({ state: "sending" });
    await workMap.settle();
    await drill.settle();
    await flush();
    const localStored = await saveLocal();
    // `done` goes with the last screen's index (the route refuses any other).
    const res = await postProgress(props.mission.id, last, true);
    if (res.ok) {
      setFinish({ state: "ok", badges: res.data.badges });
      // This tab's copy goes once the row holds it; otherwise it stays for the next save.
      if (localStored) writeSession(localKey(props.mission.id), null);
      return true;
    }
    if (res.error.code === "steps_missing") setFinish({ state: "missing", ids: res.error.problems });
    else setFinish({ state: "error", error: res.error });
    return false;
  }, [drill, flush, last, props.mission.id, saveLocal, workMap]);

  const leaveTo = useCallback(
    async (href: string) => {
      if (index === last) {
        setIndex(screens.length);
        const ok = await finishMission();
        if (ok) router.push(href);
        return;
      }
      await postProgress(props.mission.id, index);
      router.push(href);
    },
    [finishMission, index, last, props.mission.id, router, screens.length],
  );

  const api: PlayerApi = {
    missionId: props.mission.id,
    mission,
    caps: mission.caps,
    reduced,
    packs,
    local,
    setLocal,
    send,
    flush,
    queued,
    workMap,
    drill,
    categories: props.categories,
    seedCategory: props.seedCategory,
    drillTask: props.drillTask,
    drillTask2: props.drillTask2,
    live,
    alreadyDone: props.alreadyDone,
    leaveTo,
    react,
  };

  const onEnd = index >= screens.length;
  const screen = onEnd ? null : screens[index];
  // Blocks with `if` follow the learner's choices on this mission (B1's data check).
  const shownBlocks = screen ? visibleBlocks(screen.blocks, local.choices) : [];
  const pending = interactionsOf(shownBlocks).filter((it) => !done.has(it.id));
  // A reaction belongs to the screen it happened on; otherwise 모아 thinks
  // while the screen still has steps open, and rests when it has none.
  const liveReaction = reaction && reaction.at === index ? reaction : null;
  const coachMood = liveReaction ? liveReaction.mood : pending.length > 0 ? "think" : "idle";

  // Each new screen starts at the top with focus on it, for screen readers.
  useEffect(() => {
    try {
      window.scrollTo({ top: 0 });
    } catch {
      // Older browsers: no scroll reset.
    }
    screenRef.current?.focus({ preventScroll: true });
  }, [index]);

  const next = () => {
    // The reaction sheets load after the first step, not on page load (review P2-8).
    preloadMoaSheets();
    const to = firstFrom(index + 1);
    setIndex(to);
    if (to >= screens.length) void finishMission();
    else {
      void postProgress(props.mission.id, to);
      if (outboxRef.current.length > 0) void flush();
    }
  };

  /** Back to a screen whose step is not recorded: its interactions must be done again. */
  const goBackTo = (k: number) => {
    const ids = new Set(interactionsOf(screens[k].blocks).map((it) => it.id));
    setDone((prev) => new Set([...prev].filter((id) => !ids.has(id))));
    setFinish(null);
    setIndex(k);
  };

  const markDone = useCallback((id: string) => {
    setDone((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
  }, []);

  const renderInteraction = useCallback(
    (block: Extract<Block, { t: "i" }>) => <InteractionView i={block.i} onDone={() => markDone(block.i.id)} />,
    [markDone],
  );

  const maxXp = Object.values(mission.caps).reduce((s, n) => s + n, 0);


  const finished = finish?.state === "ok";
  const levelNow: LevelProgress = {
    ...props.level,
    xp: props.level.xp - props.xp + xp,
    done: props.level.done + (props.alreadyDone || !finished ? 0 : 1),
  };

  // Screens that hold a step the server is missing, in order, once each.
  const missingScreens =
    finish?.state === "missing"
      ? [
          ...new Set(
            finish.ids
              .map((id) => screens.findIndex((s) => interactionsOf(s.blocks).some((it) => it.id === id)))
              .filter((k) => k >= 0),
          ),
        ].sort((a, b) => a - b)
      : [];

  const stepNo = Math.min(index, screens.length) + 1;

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
              <i className={onEnd ? "is-on" : ""} />
            </div>
            <div key={bump} className={`c-xp${bump > 0 && !reduced ? " is-bump" : ""}`} role="status">
              <span className="sr-only">이 미션 </span>
              {xp} XP
            </div>
          </div>
          <div className="c-beat">
            <div>
              {stepNo}단계
              <b>{screen ? screen.beat : "보상"}</b>
            </div>
            {screen && (
              <MoaSprite
                key={`${index}-${liveReaction?.n ?? 0}`}
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
            key={`${index}-${restored}`}
          >
            {screen ? (
              <>
                {screen.media && <MediaCard media={screen.media} />}
                <Blocks blocks={shownBlocks} renderInteraction={renderInteraction} />
                <div className="c-next">
                  <button
                    type="button"
                    className="nb-btn nb-btn-primary c-btn"
                    disabled={pending.length > 0}
                    onClick={next}
                  >
                    {screen.next ?? (index === last ? "보상 받기" : "다음")}
                  </button>
                </div>
              </>
            ) : finished ? (
              <RewardScreen
                mission={mission}
                xp={xp}
                earned={Math.max(0, xp - props.xp)}
                parts={parts}
                level={levelNow}
                newBadges={finish.badges}
                nextMission={props.nextMission}
                levelEnd={props.levelEnd}
                reduced={reduced}
                saved={{
                  workMap: workMap.draft,
                  drill: drill.draft,
                  rounds: local.rounds,
                  choices: local.choices,
                  categories: props.categories,
                  live,
                }}
              />
            ) : (
              <EndPending
                finish={finish}
                names={missingScreens.map((k) => ({ k, name: screenName(mission, k) }))}
                onBack={goBackTo}
                onRetry={() => void finishMission()}
              />
            )}
          </section>
        </div>
      </div>
    </PlayerContext.Provider>
  );
}

/** The end before the server accepted `done`: sending, what is missing, or why it failed. */
function EndPending({
  finish,
  names,
  onBack,
  onRetry,
}: {
  finish: Finish | null;
  names: { k: number; name: string }[];
  onBack: (k: number) => void;
  onRetry: () => void;
}) {
  if (!finish || finish.state === "sending") {
    return (
      <div className="flex flex-col items-center gap-3 py-6" role="status">
        <MoaSprite mood="think" size={64} />
        <p className="c-p">미션 기록을 확인하고 있어요…</p>
      </div>
    );
  }
  if (finish.state === "missing") {
    return (
      <div className="flex flex-col gap-3" role="alert">
        <h2 className="c-h">아직 기록되지 않은 단계가 있어요</h2>
        <p className="c-p">
          아래 화면의 단계가 서버에 저장되지 않아서 미션을 끝낼 수 없어요. 그 화면으로 돌아가서 한 번만
          다시 해 주세요. 이미 적은 내용은 그대로 있어요.
        </p>
        <ul className="flex flex-col gap-2">
          {names.map(({ k, name }) => (
            <li key={k} className="c-missing">
              <span>{name}</span>
              <button type="button" className="c-sbtn is-pri" onClick={() => onBack(k)}>
                이 화면 다시 하기
              </button>
            </li>
          ))}
        </ul>
        {names.length === 0 && (
          <button type="button" className="nb-btn nb-btn-white c-btn" onClick={onRetry}>
            다시 확인하기
          </button>
        )}
      </div>
    );
  }
  if (finish.state === "error") {
    return (
      <div className="flex flex-col gap-3" role="alert">
        <h2 className="c-h">미션을 아직 끝내지 못했어요</h2>
        <NetLine error={finish.error} onRetry={onRetry} />
        <Link href="/app/course" className="nb-btn nb-btn-white c-btn">
          레벨 지도로
        </Link>
      </div>
    );
  }
  return null;
}
