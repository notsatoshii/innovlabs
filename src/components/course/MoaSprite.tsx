"use client";

// 모아, the course coach, as a pre-rendered sprite sheet (36 frames x 256 px
// per mood, rendered by scripts/course/render-moa.mjs). CSS plays the sheet
// with steps(36, jump-none). idle and think loop; wince, nod and cheer play
// once, then the sprite settles on idle (their last frame is idle frame 0, so
// the swap does not jump). To replay the same one-shot mood, remount with a
// new key. Under reduced motion the CSS shows a still image instead.

import { useState, type AnimationEvent, type CSSProperties } from "react";

export type MoaMood = "idle" | "think" | "wince" | "nod" | "cheer";

const DUR: Record<MoaMood, number> = { idle: 3.6, think: 2.4, wince: 1.6, nod: 1.4, cheer: 1.8 };
const ONCE: ReadonlySet<MoaMood> = new Set(["wince", "nod", "cheer"]);

let preloaded = false;
/**
 * Warm the browser cache with the reaction sheets, so the first right or
 * wrong answer reacts at once. The mission player calls it; the level map
 * does not (only idle shows there).
 */
export function preloadMoaSheets() {
  if (preloaded || typeof window === "undefined") return;
  preloaded = true;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  for (const m of ["think", "wince", "nod", "cheer"] satisfies MoaMood[]) {
    const img = new Image();
    img.src = `/course/moa/${m}.webp`;
  }
}

export function MoaSprite({
  mood,
  size = 64,
  onEnd,
  className,
}: {
  mood: MoaMood;
  /** Rendered width and height in px. */
  size?: number;
  /** Called when a one-shot mood has finished playing. */
  onEnd?: () => void;
  className?: string;
}) {
  // The one-shot mood that finished; while it matches `mood`, show idle.
  const [ended, setEnded] = useState<MoaMood | null>(null);
  const shown: MoaMood = ONCE.has(mood) && ended === mood ? "idle" : mood;
  const once = ONCE.has(shown);

  const onAnimationEnd = (e: AnimationEvent<HTMLSpanElement>) => {
    if (e.target !== e.currentTarget || !once) return;
    setEnded(mood);
    onEnd?.();
  };

  return (
    <span
      // A new mood remounts the span, so its sheet starts at frame 0.
      key={shown}
      role="img"
      aria-label="모아"
      className={`c-moa${once ? " is-once" : ""}${className ? ` ${className}` : ""}`}
      data-mood={shown}
      style={{ width: size, height: size, "--moa-dur": `${DUR[shown]}s` } as CSSProperties}
      onAnimationEnd={onAnimationEnd}
    />
  );
}
