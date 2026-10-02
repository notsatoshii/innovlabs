// Rasterises the InnovLabs mark (lime tile, black asterisk, pink centre: the
// same geometry as the SVG favicon in src/layouts/Base.astro and the app's
// src/app/icon.svg) into apple-touch-icon.png (180px) and favicon.ico
// (16/32/48px PNG entries). Plain Node, no dependencies.
//
//   node scripts/make-icons.mjs [outDir]     # default: public/
//
// The app (repo root) uses copies of the same files: src/app/apple-icon.png
// and src/app/favicon.ico.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

const LIME = [0xb8, 0xff, 0x29];
const INK = [0x00, 0x00, 0x00];
const PINK = [0xff, 0x4d, 0x8d];

// Mark in a 64-unit box, centred at (32, 32): three 10x46 bars at 0/60/-60deg,
// an 8x8 pink square in the middle.
const BARS = [0, 60, -60].map((deg) => (deg * Math.PI) / 180);
function colorAt(x, y) {
  const dx = x - 32;
  const dy = y - 32;
  if (Math.abs(dx) <= 4 && Math.abs(dy) <= 4) return PINK;
  for (const a of BARS) {
    const rx = dx * Math.cos(a) + dy * Math.sin(a);
    const ry = -dx * Math.sin(a) + dy * Math.cos(a);
    if (Math.abs(rx) <= 5 && Math.abs(ry) <= 23) return INK;
  }
  return LIME;
}

// 4x4 supersampling per output pixel.
function render(size) {
  const ss = 4;
  const px = Buffer.alloc(size * size * 4);
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      const sum = [0, 0, 0];
      for (let sj = 0; sj < ss; sj++) {
        for (let si = 0; si < ss; si++) {
          const c = colorAt(((i + (si + 0.5) / ss) * 64) / size, ((j + (sj + 0.5) / ss) * 64) / size);
          sum[0] += c[0];
          sum[1] += c[1];
          sum[2] += c[2];
        }
      }
      const o = (j * size + i) * 4;
      px[o] = Math.round(sum[0] / (ss * ss));
      px[o + 1] = Math.round(sum[1] / (ss * ss));
      px[o + 2] = Math.round(sum[2] / (ss * ss));
      px[o + 3] = 255;
    }
  }
  return px;
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function png(size) {
  const px = render(size);
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let j = 0; j < size; j++) {
    raw[j * (size * 4 + 1)] = 0; // filter: none
    px.copy(raw, j * (size * 4 + 1) + 1, j * size * 4, (j + 1) * size * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ICO with PNG-encoded entries (supported by every browser in use).
function ico(sizes) {
  const images = sizes.map((s) => png(s));
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(sizes.length, 4);
  let offset = 6 + 16 * sizes.length;
  const entries = sizes.map((s, k) => {
    const e = Buffer.alloc(16);
    e[0] = s >= 256 ? 0 : s;
    e[1] = s >= 256 ? 0 : s;
    e.writeUInt16LE(1, 4); // planes
    e.writeUInt16LE(32, 6); // bits per pixel
    e.writeUInt32LE(images[k].length, 8);
    e.writeUInt32LE(offset, 12);
    offset += images[k].length;
    return e;
  });
  return Buffer.concat([header, ...entries, ...images]);
}

const outDir = process.argv[2] ?? 'public';
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'apple-touch-icon.png'), png(180));
writeFileSync(join(outDir, 'favicon.ico'), ico([16, 32, 48]));
console.log(`Wrote apple-touch-icon.png and favicon.ico to ${outDir}`);
