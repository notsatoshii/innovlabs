// Renders 모아's sprite sheets into public/course/moa/.
//
// How: render-moa.html (beside this file) holds the course look board's
// three.js scene and acting code (three 0.160 from jsDelivr, so the machine
// needs network). Headless Chrome loads it with software WebGL (SwiftShader),
// the page renders 36 frames x 256 px per mood on a transparent background
// and writes each sheet's WebP data URL into the DOM; this script reads the
// dumped DOM and writes the files:
//   idle.webp think.webp wince.webp nod.webp cheer.webp  (9216 x 256 each)
//   still.webp                                            (idle frame 0, reduced motion)
//
// Run:   node scripts/course/render-moa.mjs [--q=0.88] [--chrome="<path to chrome>"]
// --q is the WebP quality (0..1); lower it if a sheet goes over ~400 KB.
// After a change to the acting, re-run and commit the new sheets.

import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, "../../public/course/moa");
const arg = (name, dflt) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : dflt;
};
const quality = arg("q", "0.88");
const chrome = arg(
  "chrome",
  process.platform === "win32"
    ? "C:/Program Files/Google/Chrome/Application/chrome.exe"
    : process.platform === "darwin"
      ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
      : "google-chrome",
);

const page = `${pathToFileURL(join(here, "render-moa.html")).href}?q=${quality}`;
const profile = mkdtempSync(join(tmpdir(), "moa-render-"));
let dom;
try {
  dom = execFileSync(
    chrome,
    [
      "--headless=new",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
      "--disable-gpu-sandbox",
      "--no-first-run",
      `--user-data-dir=${profile}`,
      "--virtual-time-budget=10000",
      "--dump-dom",
      page,
    ],
    { encoding: "utf8", maxBuffer: 256 * 1024 * 1024, timeout: 10 * 60 * 1000 },
  );
} finally {
  try {
    rmSync(profile, { recursive: true, force: true });
  } catch {
    // Chrome may still hold the profile for a moment; the OS cleans tmp.
  }
}

const status = /<pre id="status">([\s\S]*?)<\/pre>/.exec(dom)?.[1] ?? "(no status)";
if (status !== "done") {
  console.error(`render page did not finish: ${status}`);
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });
for (const name of ["idle", "think", "wince", "nod", "cheer", "still"]) {
  const m = new RegExp(`<pre id="sheet-${name}">data:image/webp;base64,([A-Za-z0-9+/=]+)</pre>`).exec(dom);
  if (!m) {
    console.error(`no WebP for ${name} (the browser may have fallen back to PNG)`);
    process.exit(1);
  }
  const buf = Buffer.from(m[1], "base64");
  writeFileSync(join(outDir, `${name}.webp`), buf);
  console.log(`${name}.webp  ${(buf.length / 1024).toFixed(0)} KB`);
}
