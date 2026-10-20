"use client";

// 모아, the course coach, as a pre-rendered sprite sheet (36 frames per mood,
// rendered by scripts/course/render-moa.mjs at 256 px; the 128 px set from
// scripts/course/downscale-moa.mjs is used up to 64 px, a quarter of the
// decoded memory; review P2-8). CSS plays the sheet with steps(36, jump-none),
// and a sheet loads only when a sprite shows that mood. idle and think loop; wince, nod and cheer play
// once, then the sprite settles on idle (their last frame is idle frame 0, so
// the swap does not jump). To replay the same one-shot mood, remount with a
// new key. Under reduced motion the CSS shows a still image instead.

import { useState, type AnimationEvent, type CSSProperties } from "react";

export type MoaMood = "idle" | "think" | "wince" | "nod" | "cheer";

const DUR: Record<MoaMood, number> = { idle: 3.6, think: 2.4, wince: 1.6, nod: 1.4, cheer: 1.8 };
const ONCE: ReadonlySet<MoaMood> = new Set(["wince", "nod", "cheer"]);

/** Bump with the ?v= in course.css when a sheet changes (/course/moa/* is cached for a year). */
const SHEET_VERSION = 1;
/** Above this size the 256 px sheets are used (the reward's 132 px 모아). */
const SMALL_MAX = 64;

let preloaded = false;
/**
 * Warm the browser cache with the reaction sheets, so the next right or
 * wrong answer reacts at once. The mission player calls it after the
 * learner's first step, not on page load, so a visit that only looks costs
 * nothing extra on mobile data (review P2-8). The level map never does.
 */
export function preloadMoaSheets() {
  if (preloaded || typeof window === "undefined") return;
  preloaded = true;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  const urls = [
    ...(["wince", "nod"] satisfies MoaMood[]).map((m) => `/course/moa/128/${m}.webp?v=${SHEET_VERSION}`),
    `/course/moa/cheer.webp?v=${SHEET_VERSION}`,
  ];
  for (const src of urls) {
    const img = new Image();
    img.src = src;
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
      // Decorative: the coach's words are in the text next to it (review P2-9).
      aria-hidden
      className={`c-moa${once ? " is-once" : ""}${className ? ` ${className}` : ""}`}
      data-mood={shown}
      data-res={size > SMALL_MAX ? "lg" : undefined}
      style={{ width: size, height: size, "--moa-dur": `${DUR[shown]}s` } as CSSProperties}
      onAnimationEnd={onAnimationEnd}
    />
  );
}
