"use client";

// The 보상 beat the app renders after a mission's last screen, once the
// server accepted `done`: 모아 cheering, first what the mission saved (with
// [텍스트로 복사] where the mission has an export; L1 review: saved work
// before XP), then the XP this visit earned counting up
// over 0.9 s (review P2-6), the split by part as chips that pop in one by
// one, level progress with the bar filling, a burst of clay bits, the badges
// this mission awards, the coach line, and the way on. After the boss, the
// level's end card says what comes next (audience review #1). All of it
// holds still under reduced motion and is readable at rest. Timers only (no
// requestAnimationFrame): the hidden review pane does not run animation
// frames.

import { useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import type { MissionContent, XpPart } from "@/lib/course/types";
import type { DrillDraft, WorkMapDraft } from "@/lib/courses/types";
import type { EditorCategory } from "@/components/lab/work-map/types";
import { resolveSlots, type LiveValues, type SlotValues } from "@/lib/course/fill";
import { drillSheetText, rewardSlots, round2CardText, workMapText } from "@/lib/course/export";
import { Coach } from "./Coach";
import { CopyButton } from "./CopyButton";
import { MoaSprite } from "./MoaSprite";

export interface LevelProgress {
  xp: number;
  xpMax: number;
  done: number;
  total: number;
}

/** What the end of a level says (the boss's reward and the level map, once the boss is done). */
export interface LevelEnd {
  level: number;
  /** The learner's track by name; staff-confirmed wins over the survey's. Null without one. */
  trackName: string | null;
  trackFrom: "staff" | "survey" | null;
  /** Candidate #1 by name ("" without a work map). */
  candidate1: string;
}

/** What the player holds for the saved lines and the export (MissionContent.saved / export). */
export interface SavedSource {
  workMap: WorkMapDraft;
  drill: DrillDraft;
  /** Pasted assistant outputs this tab still holds (B1). */
  rounds: Partial<Record<1 | 2, string>>;
  /** Branch choices made on this mission (the M1.5 gut pick). */
  choices: Readonly<Record<string, string>>;
  categories: EditorCategory[];
  live: LiveValues;
}

/** The id of the mission's pick by feel (an I7 from "p_rows"), if it has one. */
function gutPickId(mission: MissionContent): string | null {
  for (const s of mission.screens) {
    for (const b of s.blocks) if (b.t === "i" && b.i.type === "I7" && b.i.from === "p_rows") return b.i.id;
  }
  return null;
}

/** The mission's saved lines with their slots filled, and its plain-text export. */
function savedOf(mission: MissionContent, src: SavedSource | null): { lines: string[]; text: string | null } {
  if (!src) return { lines: [], text: null };
  const gutId = gutPickId(mission);
  const reward = rewardSlots(src.workMap, src.drill, gutId ? src.choices[gutId] : undefined);
  const values = { ...src.live, ...reward } as unknown as Partial<SlotValues>;
  // A line whose reward slot has no value (no gut pick) is left out.
  const lines = (mission.saved ?? [])
    .filter((line) => !(Object.keys(reward) as (keyof typeof reward)[]).some((k) => reward[k] === "" && line.includes(`{{${k}}}`)))
    .map((line) => resolveSlots(line, values));
  const label = (id: string) => src.categories.find((c) => c.id === id)?.label ?? "";
  let text: string | null = null;
  if (mission.export === "work_map") text = workMapText(src.workMap, label);
  else if (mission.export === "round2_card") text = src.drill.card ? round2CardText(src.drill.card) : null;
  else if (mission.export === "drill_sheet") text = drillSheetText({ drill: src.drill, rounds: src.rounds, workMap: src.workMap });
  return { lines, text };
}

/** 는 or 은 after a level number read in Sino-Korean (2 이는, 3 삼은, 10 십은). */
function eunNeun(n: number): string {
  return [2, 4, 5, 9].includes(n % 10) ? "는" : "은";
}

/** The end of Level 1: what the learner has, the track, and honestly what comes next. */
export function LevelEndCard({ end }: { end: LevelEnd }) {
  return (
    <section className="c-levelend" aria-labelledby="c-levelend-h">
      <h2 id="c-levelend-h" className="c-h">
        레벨 {end.level} 완료. 다음은 이렇게 이어져요
      </h2>
      <p className="c-p">
        워크맵, 점수를 매긴 후보, 1라운드와 2라운드 비교표, 2라운드 카드가 남았어요. 워크맵은 언제든 다시 볼 수
        있어요.
      </p>
      {end.trackName && (
        <p className="c-p">
          {end.trackFrom === "staff" ? "강사진이 확인한 트랙은 " : "설문으로 추천된 트랙은 "}
          <b>{end.trackName}</b>이에요. 레벨 3까지는 모든 트랙이 함께 가고, 그다음부터 트랙별로 나뉘어요.
        </p>
      )}
      <p className="c-p">
        다음 레벨에서는 {end.candidate1 ? <>후보 1번 &apos;{end.candidate1}&apos;</> : "후보 1번"}에 쓸
        하네스를 만들어요. 하네스는 새로 온 동료에게 건네는 한 장짜리 작업 안내서 같은 거예요.
      </p>
      <p className="c-p">
        <b>
          레벨 {end.level + 1}
          {eunNeun(end.level + 1)} 아직 준비 중이에요.
        </b> 여는 날짜는 아직 정해지지 않았어요. 열리면 이 레벨
        지도에 바로 나타나요.
      </p>
      <p className="c-small">
        그동안 할 일이 하나 있어요. 후보 1번을 평소처럼 할 때 시간 기록을 남겨 두세요. 나중에 바뀐
        방식과 비교할 &apos;전&apos; 숫자가 돼요.
      </p>
      <div className="flex flex-col gap-2.5">
        <Link href="/app/lab/time-log?method=before" className="nb-btn nb-btn-primary c-btn">
          시간 기록 열기
        </Link>
        <Link href="/app/lab/work-map" className="nb-btn nb-btn-white c-btn">
          내 워크맵 보기
        </Link>
      </div>
    </section>
  );
}

const COUNT_MS = 900;
const BIT_COLORS = ["#ffd66b", "#8be3c0", "#a8d8ff", "#ffb3c6", "#ff9a7a", "#2f5bff", "#ff4f8b"];
/** 16 clay bits around a circle; fixed jitter so every render is the same. */
const BITS = Array.from({ length: 16 }, (_, k) => {
  const j = (n: number) => ((Math.sin((k + 1) * 12.9898 * n) * 43758.5453) % 1 + 1) % 1; // 0..1
  const a = (k / 16) * Math.PI * 2 + j(1) * 0.3;
  const d = 90 + j(2) * 70;
  return {
    background: BIT_COLORS[k % BIT_COLORS.length],
    "--x": `${Math.round(Math.cos(a) * d)}px`,
    "--y": `${Math.round(Math.sin(a) * d + 40)}px`,
    "--r": `${Math.round(j(3) * 360)}deg`,
    animationDelay: `${(j(4) * 0.15).toFixed(2)}s`,
    width: `${Math.round(8 + j(5) * 8)}px`,
    height: `${Math.round(8 + j(6) * 8)}px`,
  } as CSSProperties;
});

export function RewardScreen({
  mission,
  xp,
  earned,
  parts,
  level,
  newBadges,
  nextMission,
  levelEnd,
  reduced,
  saved = null,
}: {
  mission: MissionContent;
  /** The mission's capped total now. */
  xp: number;
  /** What this visit added (0 on a replay of a finished mission). */
  earned: number;
  parts: Record<XpPart, { got: number; cap: number }>;
  level: LevelProgress;
  /** Badge ids the progress call reported as newly awarded. */
  newBadges: string[];
  nextMission: { id: string; title: string } | null;
  /** After the boss: what comes after the level. */
  levelEnd: LevelEnd | null;
  reduced: boolean;
  /** The drafts the saved lines and the export read. */
  saved?: SavedSource | null;
}) {
  const { lines: savedLines, text: exportText } = savedOf(mission, saved);
  const [shown, setShown] = useState(reduced ? earned : 0);
  const [barOn, setBarOn] = useState(reduced);

  // XP counts up with an ease-out over 0.9 s; the bar starts filling after
  // the chips have popped in (about 1 s), as on the look board.
  useEffect(() => {
    if (reduced) return;
    const t0 = Date.now();
    const iv = setInterval(() => {
      const k = Math.min(1, (Date.now() - t0) / COUNT_MS);
      setShown(Math.round(earned * (1 - Math.pow(1 - k, 3))));
      if (k >= 1) clearInterval(iv);
    }, 30);
    const bar = setTimeout(() => setBarOn(true), 1000);
    return () => {
      clearInterval(iv);
      clearTimeout(bar);
    };
  }, [earned, reduced]);

  const value = reduced ? earned : shown;
  const max = Object.values(mission.caps).reduce((s, n) => s + n, 0);
  const hasQuest = mission.screens.some((s) => s.blocks.some((b) => b.t === "i" && b.i.type === "I8"));
  const pct = level.xpMax > 0 ? Math.min(100, Math.round((level.xp / level.xpMax) * 100)) : 0;
  const badges = mission.badges ?? [];

  return (
    <div className={`c-reward flex flex-col gap-4${reduced ? "" : " is-play"}`}>
      {!reduced && (
        <div className="c-bits" aria-hidden>
          {BITS.map((style, k) => (
            <i key={k} style={style} />
          ))}
        </div>
      )}
      <MoaSprite mood="cheer" size={132} className="c-reward-moa" />
      {(savedLines.length > 0 || exportText) && (
        <section className="c-saved" aria-label="저장한 것">
          {savedLines.map((line) => (
            <p key={line} className="c-okline">
              {line}
            </p>
          ))}
          {exportText && (
            <>
              <div className="c-acts">
                <CopyButton text={exportText} label="텍스트로 복사" failText="아래 텍스트를 길게 눌러 복사하세요" />
              </div>
              <details className="c-details">
                <summary>텍스트 보기</summary>
                <pre className="c-doc">{exportText}</pre>
              </details>
            </>
          )}
        </section>
      )}
      <div className="c-big" role="img" aria-label={`이번에 ${earned} XP를 받았어요`}>
        +<span aria-hidden>{value}</span>
        <small>{mission.xpLabel ?? "XP"}</small>
      </div>
      <p className="c-small text-center">
        이 미션 {xp} / {max} XP
      </p>
      <div className="c-split">
        {Object.entries(mission.caps).map(([part, cap], k) => (
          <span key={part} className="c-xchip" style={{ "--k": k } as CSSProperties}>
            <span>{part}</span>
            <b>
              +{Math.min(parts[part]?.got ?? 0, cap)} / {cap}
            </b>
          </span>
        ))}
      </div>
      <div className="c-lvl">
        <span className="c-segs" role="img" aria-label={`레벨 미션 ${level.done}/${level.total}`}>
          {Array.from({ length: level.total }, (_, k) => (
            <i key={k} className={k < level.done ? "is-on" : ""} />
          ))}
        </span>
        <span className="c-small" aria-hidden>
          진행 {level.done}/{level.total}
        </span>
        {mission.nextTitle && <span className="c-small">다음: {mission.nextTitle}</span>}
      </div>
      <div className="c-lvl">
        <div className="c-bar" aria-hidden>
          <i style={{ width: barOn || reduced ? `${pct}%` : 0 }} />
        </div>
        <span className="c-small">
          {level.xp} / {level.xpMax} XP
        </span>
      </div>
      {badges.map((b) => (
        <div
          key={b.id}
          className={`c-bigbadge${b.tool ? " is-tool" : ""}${reduced ? "" : " c-popin"}`}
          role="status"
        >
          <div className="c-medal" aria-hidden>
            {b.tool ? "카" : "★"}
          </div>
          <div>
            {b.label}
            <small>
              {b.sub ?? (newBadges.includes(b.id) ? "배지를 얻었어요" : "이미 받은 배지예요")}
            </small>
          </div>
        </div>
      ))}
      <Coach text={mission.coach} avatar={false} />
      {levelEnd && <LevelEndCard end={levelEnd} />}
      <div className="flex flex-col gap-2.5">
        {hasQuest && !levelEnd && (
          <Link href="/app/lab/time-log?method=before" className="nb-btn nb-btn-white c-btn">
            시간 기록 열기
          </Link>
        )}
        {nextMission && (
          <Link href={`/app/course/m/${encodeURIComponent(nextMission.id)}`} className="nb-btn nb-btn-primary c-btn">
            다음 미션: {nextMission.title}
          </Link>
        )}
        <Link href="/app/course" className="nb-btn nb-btn-white c-btn">
          레벨 지도로
        </Link>
      </div>
    </div>
  );
}
