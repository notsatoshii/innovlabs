// Small 모아 sheets for the 48–64 px coach (review P2-8). The 256 px sheets
// (36 frames, 9216 x 256, about 9.4 MB each once decoded) stay for the
// 132 px reward; the coach and the beat row use 128 px frames (4608 x 128,
// a quarter of the memory), which is 2x for 64 px.
//
//   node scripts/course/downscale-moa.mjs
//
// Reads public/course/moa/<mood>.webp, writes public/course/moa/128/<mood>.webp.
// The CSS loads them with ?v=<n>; bump it in course.css when a sheet changes,
// because /course/moa/* is served with a one-year immutable cache.

import { mkdirSync } from "node:fs";
import sharp from "sharp";

const MOODS = ["idle", "think", "wince", "nod", "cheer"];
const FRAMES = 36;
const SIZE = 128;
const DIR = "public/course/moa";

mkdirSync(`${DIR}/128`, { recursive: true });
for (const mood of MOODS) {
  const src = `${DIR}/${mood}.webp`;
  const meta = await sharp(src).metadata();
  if (meta.width !== FRAMES * meta.height) throw new Error(`${src}: expected ${FRAMES} square frames, got ${meta.width}x${meta.height}`);
  const out = `${DIR}/128/${mood}.webp`;
  const info = await sharp(src)
    .resize(FRAMES * SIZE, SIZE, { kernel: "lanczos3" })
    .webp({ quality: 86, alphaQuality: 90, effort: 6 })
    .toFile(out);
  console.log(`${out}  ${info.width}x${info.height}  ${(info.size / 1024).toFixed(1)} KB`);
}
