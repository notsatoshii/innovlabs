"use client";

// The 보상 beat the app renders after a mission's last screen: the mission's
// XP counting up, the split by part against its caps, level progress, the
// badges this mission awards, the coach line, and the way on. No count-up and
// no pop under reduced motion. Timers only (no requestAnimationFrame): the
// hidden review pane does not run animation frames.

import { useEffect, useState } from "react";
import Link from "next/link";
import type { MissionContent, XpPart } from "@/lib/course/types";
import { Rich } from "./Blocks";

export interface LevelProgress {
  xp: number;
  xpMax: number;
  done: number;
  total: number;
}

export function Coach({ text }: { text: string }) {
  return (
    <div className="c-coach">
      <div className="c-face" aria-hidden>
        코
      </div>
      <div>
        [코치] &ldquo;<Rich text={text} />&rdquo;
      </div>
    </div>
  );
}

export function RewardScreen({
  mission,
  xp,
  parts,
  level,
  newBadges,
  nextMission,
  reduced,
}: {
  mission: MissionContent;
  xp: number;
  parts: Record<XpPart, { got: number; cap: number }>;
  level: LevelProgress;
  /** Badge ids the progress call reported as newly awarded; null while it is in flight. */
  newBadges: string[] | null;
  nextMission: { id: string; title: string } | null;
  reduced: boolean;
}) {
  const [shown, setShown] = useState(reduced ? xp : 0);
  const [barOn, setBarOn] = useState(reduced);

  useEffect(() => {
    if (reduced) return;
    const step = Math.max(1, Math.round(xp / 30));
    let n = 0;
    const iv = setInterval(() => {
      n = Math.min(xp, n + step);
      setShown(n);
      if (n >= xp) clearInterval(iv);
    }, 30);
    const bar = setTimeout(() => setBarOn(true), 80);
    return () => {
      clearInterval(iv);
      clearTimeout(bar);
    };
  }, [xp, reduced]);

  const value = reduced ? xp : shown;
  const pct = level.xpMax > 0 ? Math.min(100, Math.round((level.xp / level.xpMax) * 100)) : 0;
  const badges = mission.badges ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="c-big" aria-label={`${xp} XP를 받았어요`}>
        +<span aria-hidden>{value}</span>
        <small>XP</small>
      </div>
      <div className="c-split">
        {Object.entries(mission.caps).map(([part, cap]) => (
          <span key={part} className="contents">
            <span>{part}</span>
            <span>
              +{Math.min(parts[part]?.got ?? 0, cap)} / {cap}
            </span>
          </span>
        ))}
      </div>
      <div className="c-lvl">
        <span className="c-segs" role="img" aria-label={`레벨 미션 ${level.done}/${level.total}`}>
          {Array.from({ length: level.total }, (_, k) => (
            <i key={k} className={k < level.done ? "is-on" : ""} />
          ))}
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
              {b.sub ?? (newBadges && !newBadges.includes(b.id) ? "이미 받은 배지예요" : "배지를 얻었어요")}
            </small>
          </div>
        </div>
      ))}
      <Coach text={mission.coach} />
      <div className="flex flex-col gap-2.5">
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
