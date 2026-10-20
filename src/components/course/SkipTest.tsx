"use client";

// The level's skip test (건너뛰기 시험): the test mission's screens in order,
// its interactions in test mode (no feedback, no XP), a 3:00 clock in the
// pill. Opening it posts progress { screen: 0 } so the server times the set,
// and the clock follows the server's start (a reload resumes it, and the
// page says the time is already running; review P1-3). The end posts
// SkipRequest to /api/course/skip, which grades it and, on a pass, credits
// the skippable screens. One attempt: a repeated request gets the stored
// result back, so a lost answer never turns a pass into a fail (P1-2).

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type {
  Block,
  I1Sort as I1,
  I2Pick as I2,
  I3Spot as I3,
  Interaction,
  MissionContent,
  ProgressResponse,
  SkipRequest,
  SortAnswer,
} from "@/lib/course/types";
import { Blocks, interactionsOf } from "./Blocks";
import { SortDeck } from "./I1Sort";
import { MediaCard } from "./MediaCard";
import { SpanDoc, squash, type Segment } from "./SpanDoc";
import { useReducedMotion } from "./useReducedMotion";

const LIMIT_S = 180;
/** Wall clock, outside render (the clock state is set from timers and handlers only). */
const nowMs = () => Date.now();
const SPOT_TAPS = 2;

interface SkipResult {
  result: "passed" | "failed";
  /** The stored result of an earlier request (no per-item detail). */
  replay?: boolean;
  cardsRight?: number;
  cardsTotal?: number;
  pickRight?: boolean;
  spotFound?: boolean;
  inTime?: boolean;
}

function clock(left: number): string {
  return `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
}

export default function SkipTest({
  test,
  level,
  firstMission,
  runningFor = null,
}: {
  test: MissionContent;
  level: number;
  firstMission: { id: string; title: string } | null;
  /** Seconds the clock has already run (the test was opened before), or null. */
  runningFor?: number | null;
}) {
  const reduced = useReducedMotion();
  const screens = test.screens;
  const [index, setIndex] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [cards, setCards] = useState<string[]>([]);
  const [pick, setPick] = useState("");
  const [taps, setTaps] = useState<string[]>([]);
  const [result, setResult] = useState<SkipResult | null>(null);
  const [sendState, setSendState] = useState<"idle" | "sending" | "failed" | "unavailable">("idle");
  const sentRef = useRef(false);
  const screenRef = useRef<HTMLElement>(null);

  const sort = interactionsOf(screens.flatMap((s) => s.blocks)).find((x): x is I1 => x.type === "I1");
  const cardCount = sort?.cards.length ?? 0;
  const elapsed = startedAt ? Math.max(0, Math.floor((now - startedAt) / 1000)) : 0;
  const left = Math.max(0, LIMIT_S - elapsed);
  // At 0:00 the set ends wherever the learner is.
  const timedOut = startedAt !== null && left === 0;
  const onResult = index >= screens.length || timedOut;

  const send = useCallback(async () => {
    setSendState("sending");
    const seconds = startedAt ? Math.min(9999, Math.round((nowMs() - startedAt) / 1000)) : LIMIT_S + 1;
    const padded = Array.from({ length: cardCount }, (_, k) => cards[k] ?? "");
    const body: SkipRequest = { level, cards: padded, pick, spotTaps: taps, seconds };
    try {
      const res = await fetch("/api/course/skip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json().catch(() => null)) as { ok?: boolean; data?: SkipResult; error?: string } | null;
      if (res.ok && json?.ok && json.data) {
        setResult(json.data);
        setSendState("idle");
        return;
      }
      if (res.status === 409) {
        // Not offered any more (a mission of the level was finished meanwhile).
        setSendState("unavailable");
        return;
      }
    } catch {
      // falls through to the retry line
    }
    setSendState("failed");
  }, [cardCount, cards, level, pick, startedAt, taps]);

  const go = useCallback((to: number) => setIndex(to), []);

  // The clock ticks on a timer (no animation frames); at 0:00 the set ends.
  useEffect(() => {
    if (!startedAt || onResult) return;
    const iv = setInterval(() => setNow(nowMs()), 500);
    return () => clearInterval(iv);
  }, [startedAt, onResult]);

  useEffect(() => {
    if (!onResult || sentRef.current) return;
    sentRef.current = true;
    void send();
  }, [onResult, send]);

  useEffect(() => {
    try {
      window.scrollTo({ top: 0 });
    } catch {
      // no scroll reset
    }
    screenRef.current?.focus({ preventScroll: true });
  }, [index]);

  const start = () => {
    // A resumed clock starts where the server's is; the server's answer corrects it.
    const t = nowMs() - (runningFor ?? 0) * 1000;
    setStartedAt(t);
    setNow(nowMs());
    void fetch("/api/course/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ missionId: test.id, screen: 0 }),
    })
      .then((res) => res.json())
      .then((json: { ok?: boolean; data?: ProgressResponse }) => {
        const elapsed = json?.ok ? json.data?.elapsed : undefined;
        if (typeof elapsed === "number" && Number.isFinite(elapsed)) setStartedAt(nowMs() - elapsed * 1000);
      })
      .catch(() => undefined);
  };

  // A test without an intro screen starts on the first answer.
  const ensureStarted = () => {
    if (!startedAt) start();
  };
  const advance = () => go(index + 1);
  const screen = onResult ? null : screens[index];
  const inter = screen ? interactionsOf(screen.blocks) : [];

  const renderInteraction = (block: Extract<Block, { t: "i" }>) => (
    <TestInteraction
      i={block.i}
      reduced={reduced}
      onCard={(k, bin) => {
        ensureStarted();
        setCards((prev) => {
          const next = prev.slice();
          next[k] = bin;
          return next;
        });
      }}
      onPick={(v) => {
        ensureStarted();
        setPick(v);
        setTimeout(advance, reduced ? 0 : 250);
      }}
      onTap={(t) => {
        ensureStarted();
        setTaps((prev) => [...prev, t]);
      }}
      onEnd={() => setTimeout(advance, reduced ? 0 : 400)}
    />
  );

  return (
    <div className="c-root">
      <div className="flex items-baseline justify-between gap-2 text-[13px] text-[var(--course-muted)]">
        <b className="c-display text-[16px] text-[var(--course-ink)]">건너뛰기 시험</b>
        <span>3분 · 한 번만</span>
      </div>
      <div className="nb-card c-player">
        <div className="c-top">
          <Link href="/app/course" className="c-back" aria-label="레벨 지도로">
            ←
          </Link>
          <div className="c-rail" aria-hidden>
            {screens.map((_, k) => (
              <i key={k} className={k < index ? "is-done" : k === index ? "is-on" : ""} />
            ))}
            <i className={onResult ? "is-on" : ""} />
          </div>
          <div className="c-xp" role="timer" aria-label={`남은 시간 ${clock(left)}`}>
            {clock(startedAt ? left : LIMIT_S)}
          </div>
        </div>
        <div className="c-beat">
          <div>
            {onResult ? "결과" : screen?.beat}
          </div>
        </div>
        <section ref={screenRef} tabIndex={-1} className="c-screen" key={index}>
          {screen ? (
            <>
              {screen.media && <MediaCard media={screen.media} />}
              {index === 0 && !startedAt && runningFor !== null && (
                <p className="c-note" role="status">
                  이 시험은 이미 시작했어요. 시간은 그때부터 흐르고 있어요. 남은 시간은 {clock(LIMIT_S - runningFor)}
                  쯤이에요.
                </p>
              )}
              <Blocks blocks={screen.blocks} renderInteraction={renderInteraction} />
              {inter.length === 0 && (
                <div className="c-next">
                  <button
                    type="button"
                    className="nb-btn nb-btn-primary c-btn"
                    onClick={() => {
                      if (!startedAt) start();
                      advance();
                    }}
                  >
                    {index === 0 && !startedAt && runningFor !== null ? "이어서 보기" : (screen.next ?? (startedAt ? "다음" : "시작"))}
                  </button>
                </div>
              )}
            </>
          ) : (
            <ResultView
              result={result}
              sending={sendState === "sending"}
              failed={sendState === "failed"}
              unavailable={sendState === "unavailable"}
              onRetry={() => void send()}
              cardsGiven={cards.filter(Boolean).length}
              cardCount={cardCount}
              seconds={Math.min(elapsed, LIMIT_S)}
              timedOut={timedOut}
              firstMission={firstMission}
            />
          )}
        </section>
      </div>
    </div>
  );
}

function TestInteraction({
  i,
  reduced,
  onCard,
  onPick,
  onTap,
  onEnd,
}: {
  i: Interaction;
  reduced: boolean;
  onCard: (k: number, bin: SortAnswer) => void;
  onPick: (v: string) => void;
  onTap: (text: string) => void;
  onEnd: () => void;
}) {
  if (i.type === "I1") {
    return <SortDeck i={i} onDone={() => undefined} reduced={reduced} test={{ onAnswer: onCard, onEnd }} />;
  }
  if (i.type === "I2" || i.type === "I6" || i.type === "I7") return <TestPick i={i} onPick={onPick} />;
  if (i.type === "I3") return <TestSpot i={i} onTap={onTap} onEnd={onEnd} />;
  return null;
}

function TestPick({ i, onPick }: { i: Extract<Interaction, { type: "I2" | "I6" | "I7" }>; onPick: (v: string) => void }) {
  const [picked, setPicked] = useState<string | null>(null);
  const options = i.type === "I2" ? i.docs.map((d) => ({ v: d.v, label: d.label })) : i.options;
  const choose = (v: string) => {
    if (picked) return;
    setPicked(v);
    onPick(v);
  };
  return (
    <div className="flex flex-col gap-3">
      {i.type === "I2" &&
        (i as I2).docs.map((d) => (
          <div key={d.v} className="flex flex-col gap-1.5">
            <div className="c-doclab">{d.label}</div>
            <pre className="c-doc" tabIndex={0}>
              {d.text}
            </pre>
          </div>
        ))}
      <div className="c-opts" role="group">
        {options.map((o) => (
          <button
            key={o.v}
            type="button"
            className={`c-opt${picked === o.v ? " is-pick" : ""}`}
            disabled={picked !== null}
            onClick={() => choose(o.v)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function TestSpot({ i, onTap, onEnd }: { i: I3; onTap: (text: string) => void; onEnd: () => void }) {
  const [hit, setHit] = useState<number | null>(null);
  const [misses, setMisses] = useState<number[]>([]);
  const over = hit !== null || misses.length >= SPOT_TAPS;
  const tap = (seg: Segment) => {
    if (over || misses.includes(seg.index)) return;
    onTap(seg.text.trim());
    if (squash(seg.text).includes(squash(i.target))) {
      setHit(seg.index);
      onEnd();
      return;
    }
    const next = [...misses, seg.index];
    setMisses(next);
    if (next.length >= SPOT_TAPS) onEnd();
  };
  return (
    <SpanDoc
      text={i.doc}
      label="문장을 눌러서 고르세요"
      onTap={tap}
      classOf={(seg) => (seg.index === hit ? "is-hit" : misses.includes(seg.index) ? "is-miss" : "")}
    />
  );
}

function ResultView({
  result,
  sending,
  failed,
  unavailable,
  onRetry,
  cardsGiven,
  cardCount,
  seconds,
  timedOut,
  firstMission,
}: {
  result: SkipResult | null;
  sending: boolean;
  failed: boolean;
  unavailable: boolean;
  onRetry: () => void;
  cardsGiven: number;
  cardCount: number;
  seconds: number;
  timedOut: boolean;
  firstMission: { id: string; title: string } | null;
}) {
  if (!result && unavailable) {
    return (
      <div className="flex flex-col gap-3" role="status">
        <p className="c-p">이 시험은 지금 볼 수 없어요. 미션을 이미 시작했거나 끝낸 경우예요.</p>
        <Link href="/app/course" className="nb-btn nb-btn-white c-btn">
          레벨 지도로
        </Link>
      </div>
    );
  }
  if (!result) {
    return (
      <div className="flex flex-col gap-3" role="status">
        <p className="c-p">{sending || !failed ? "채점하고 있어요…" : "결과를 보내지 못했어요."}</p>
        {failed && (
          <button type="button" className="nb-btn nb-btn-white c-btn" onClick={onRetry}>
            다시 보내기
          </button>
        )}
      </div>
    );
  }
  const passed = result.result === "passed";
  const total = result.cardsTotal ?? cardCount;
  return (
    <div className="flex flex-col gap-4">
      <h2 className="c-h">{passed ? "통과했어요." : "괜찮아요. 미션으로 가요. 8분이면 돼요."}</h2>
      {result.cardsRight !== undefined && (
        <div className="c-split">
          <span>카드</span>
          <span>
            {result.cardsRight} / {total}
          </span>
          <span>둘 중 고르기</span>
          <span>{result.pickRight ? "맞음" : "아님"}</span>
          <span>틀린 곳 찾기 (두 번 안에)</span>
          <span>{result.spotFound ? "찾음" : "못 찾음"}</span>
          <span>시간</span>
          <span>
            {Math.floor(seconds / 60)}분 {seconds % 60}초{timedOut || result.inTime === false ? " (시간 끝)" : ""}
          </span>
        </div>
      )}
      {result.replay && <p className="c-small">이미 채점한 시험이에요. 시험은 한 번만 볼 수 있어서 처음 결과를 보여 드려요.</p>}
      {!result.replay && result.cardsRight === undefined && cardsGiven < cardCount && (
        <p className="c-small">시험은 한 번만 볼 수 있어요.</p>
      )}
      {passed && <p className="c-p">앞 미션의 알기와 해보기를 끝난 것으로 표시했어요.</p>}
      <div className="flex flex-col gap-2.5">
        {firstMission && (
          <Link href={`/app/course/m/${encodeURIComponent(firstMission.id)}`} className="nb-btn nb-btn-primary c-btn">
            미션 {firstMission.id.replace(/^M/, "")}로
          </Link>
        )}
        <Link href="/app/course" className="nb-btn nb-btn-white c-btn">
          레벨 지도로
        </Link>
      </div>
    </div>
  );
}
