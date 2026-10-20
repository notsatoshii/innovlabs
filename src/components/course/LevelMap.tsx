// The level map (/app/course): the level's XP, the mission path with the next
// mission ringed, the skip test offer, the level's end card once the boss is
// done (audience review #1), and the badges. The 하네스 덱 tile waits for
// Level 2, which does not exist yet. Server-safe: plain links, no client
// state, so it renders fully without hydration (모아 is the one small client
// island).
// Motion (CSS only, off under reduced motion): nodes pop in 60 ms apart, the
// next mission's dot pulses, the boss dot wobbles, the coach bubble pops in.

import Link from "next/link";
import type { CSSProperties } from "react";
import type { LevelState, MissionState } from "@/lib/course/types";
import { Coach } from "./Coach";
import { LevelEndCard, type LevelEnd } from "./RewardScreen";

/** 이에요 after a final consonant, else 예요 (for a quoted title). */
function ieyo(word: string): string {
  const c = word.trim().slice(-1).charCodeAt(0);
  if (!(c >= 0xac00 && c <= 0xd7a3)) return "이에요";
  return (c - 0xac00) % 28 > 0 ? "이에요" : "예요";
}

function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

/** "M1.1" → "1.1"; the boss dot says 보스 (review P0-3). */
function shortNo(m: MissionState): string {
  return m.boss ? "보스" : m.id.replace(/^M/, "");
}

function MissionNode({ m, next, order }: { m: MissionState; next: boolean; order: number }) {
  const no = shortNo(m);
  const name = `${m.boss ? "" : `미션 ${no} `}${m.title}`;
  const sub = [
    m.boss ? "보스" : null,
    `⏱ ${m.minutes}분`,
    m.status === "done" ? `${m.xp} / ${m.xpMax} XP · 완료` : `${m.xpMax} XP${m.status === "locked" ? " · 잠김" : ""}`,
  ]
    .filter(Boolean)
    .join(" · ");
  const cls = `c-node${m.boss ? " is-boss" : ""} is-${m.status}${next ? " is-next" : ""}`;
  const style = { "--k": order } as CSSProperties;
  const body = (
    <>
      <span className="c-dot" aria-hidden>
        {m.status === "done" ? "✓" : m.status === "locked" ? <LockIcon /> : no}
      </span>
      <span className="c-lbl">
        <span className="c-t">{name}</span>
        <span className="c-s">{sub}</span>
      </span>
    </>
  );
  if (m.status === "locked") {
    return (
      <div className={cls} style={style} aria-label={`${name}, 잠김. 앞 미션을 끝내면 열려요`} role="group">
        {body}
      </div>
    );
  }
  return (
    <Link
      href={`/app/course/m/${encodeURIComponent(m.id)}`}
      className={cls}
      style={style}
      aria-label={`${name}${m.status === "done" ? ", 완료. 다시 하기" : next ? ", 다음 미션" : ""}`}
    >
      {body}
    </Link>
  );
}

export function LevelMap({
  state,
  note,
  levelEnd = null,
}: {
  state: LevelState;
  note?: string | null;
  /** What comes after the level; shown once the boss is done. */
  levelEnd?: LevelEnd | null;
}) {
  const pct = state.xpMax > 0 ? Math.min(100, Math.round((state.xp / state.xpMax) * 100)) : 0;
  const nextMission = state.missions.find((m) => m.status === "open") ?? null;
  const nextId = nextMission?.id ?? null;
  const done = state.missions.filter((m) => m.status === "done").length;
  const bossDone = state.missions.some((m) => m.boss && m.status === "done");

  return (
    <main className="c-root">
      <header className="c-map-hdr">
        <Link href="/app/courses" className="self-start py-1 text-sm font-bold underline underline-offset-4">
          ← 코스로
        </Link>
        <p className="c-kicker">월드 0 · 기초</p>
        <h1 className="text-[28px] leading-tight">
          레벨 {state.level}
          {state.title ? ` · ${state.title}` : ""}
        </h1>
        {state.goal && <p className="c-small">{state.goal}</p>}
      </header>

      {note && (
        <p className="c-note" role="status">
          {note}
        </p>
      )}

      <div className="c-stats">
        <div className="c-stat">
          <span>레벨 {state.level}</span>
          <b>{state.xp} XP</b>
          <div className="c-bar" aria-hidden>
            <i style={{ width: `${pct}%` }} />
          </div>
          <span>최대 {state.xpMax} XP</span>
        </div>
        <div className="c-stat">
          <span>미션</span>
          <b>
            {done} / {state.missions.length}
          </b>
          <span className="c-segs" aria-hidden>
            {state.missions.map((m) => (
              <i key={m.id} className={m.status === "done" ? "is-on" : ""} />
            ))}
          </span>
          <span>{bossDone ? "레벨을 끝냈어요" : "보스전까지 차례로 열려요"}</span>
        </div>
      </div>

      {state.skipTest.available && (
        <Link href="/app/course/skip" className="c-skipcard">
          <span>
            <b>건너뛰기 시험</b>
            <small>3분 · 한 번만 볼 수 있어요</small>
          </span>
          <span className="c-sbtn is-pri">시험 보기</span>
        </Link>
      )}

      {nextMission && (
        <Coach
          text={`다음은 '${nextMission.title}'${ieyo(nextMission.title)}. ${nextMission.minutes}분이면 돼요.`}
          mood="idle"
        />
      )}

      <nav aria-label="미션 길" className="c-path">
        {state.missions.map((m, k) => (
          <MissionNode key={m.id} m={m} next={m.id === nextId} order={k} />
        ))}
      </nav>

      {state.skipTest.result && (
        <p className="c-small">
          건너뛰기 시험: {state.skipTest.result === "passed" ? "통과 (앞 미션의 알기·해보기 끝)" : "미통과"}
        </p>
      )}

      {bossDone && levelEnd && <LevelEndCard end={levelEnd} />}

      {state.badges.length > 0 && (
        <section className="c-sec">
          <h2>배지 · 도구 카드</h2>
          <div className="c-badges">
            {state.badges.map((b) => (
              <span
                key={b.id}
                className={`c-bdg${b.tool ? " is-tool" : ""}${b.earned ? " is-on" : ""}`}
                aria-label={`${b.label}${b.earned ? ", 얻음" : ", 아직"}`}
              >
                <span className="c-ic" aria-hidden />
                {b.label}
              </span>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
