// In-app browser handling for /register and /login (review finding P0-5).
//
// A link tapped in KakaoTalk, NAVER, Instagram, Facebook or LINE opens in
// that app's embedded webview. Google refuses OAuth there
// (403 disallowed_useragent), so on those screens the email code leads and
// the page offers to reopen itself in the phone's own browser.
//
// Client-only helpers. The underscore folder keeps this out of routing.

import { useSyncExternalStore } from "react";

export type InAppName = "kakaotalk" | "naver" | "instagram" | "facebook" | "line" | "other";

export interface InAppInfo {
  app: InAppName;
  os: "ios" | "android" | "other";
  /** Korean name used in the one-line explanation. */
  label: string;
}

const LABELS: Record<InAppName, string> = {
  kakaotalk: "카카오톡",
  naver: "네이버 앱",
  instagram: "인스타그램",
  facebook: "페이스북",
  line: "라인",
  other: "지금 쓰시는 앱",
};

/** The in-app browser this user agent belongs to, or null for a real browser. */
export function detectInApp(ua: string): InAppInfo | null {
  const os: InAppInfo["os"] = /Android/i.test(ua) ? "android" : /iPhone|iPad|iPod/i.test(ua) ? "ios" : "other";

  let app: InAppName | null = null;
  if (/KAKAOTALK/i.test(ua)) app = "kakaotalk";
  else if (/NAVER\(/i.test(ua)) app = "naver";
  else if (/Instagram/i.test(ua)) app = "instagram";
  else if (/FBAN|FBAV|FB_IAB/.test(ua)) app = "facebook";
  else if (/\bLine\//i.test(ua)) app = "line";
  // Other embedded webviews Google blocks the same way: Android WebView
  // ("; wv)"), a few Korean apps, and iOS webviews (no "Safari/" token).
  else if (/; wv\)|DaumApps|KAKAOSTORY|BAND\/|everytimeApp/i.test(ua)) app = "other";
  else if (os === "ios" && /AppleWebKit/i.test(ua) && !/Safari\//i.test(ua)) app = "other";

  return app ? { app, os, label: LABELS[app] } : null;
}

// --- hook: null on the server and during hydration, then the real answer ---

let cached: InAppInfo | null | undefined;

function snapshot(): InAppInfo | null {
  if (cached === undefined) cached = detectInApp(navigator.userAgent);
  return cached;
}

const subscribe = () => () => {};

export function useInApp(): InAppInfo | null {
  return useSyncExternalStore(subscribe, snapshot, () => null);
}

// --- leaving the in-app browser ---

/**
 * A URL that asks the host app to open `target` in the phone's own browser,
 * or null when this app has no dependable way (then the page offers a
 * copy-link button instead).
 *   KakaoTalk: its own scheme, iOS and Android.
 *   LINE:      the documented openExternalBrowser=1 query parameter.
 *   Android:   an intent URL for Chrome; if Chrome is missing the fallback
 *              URL reloads the same page in place.
 *   iOS (Instagram, NAVER, Facebook, ...): none.
 */
export function externalOpenUrl(info: InAppInfo, target: string): string | null {
  if (info.app === "kakaotalk") {
    return `kakaotalk://web/openExternal?url=${encodeURIComponent(target)}`;
  }
  let url: URL;
  try {
    url = new URL(target);
  } catch {
    return null;
  }
  if (info.app === "line") {
    url.searchParams.set("openExternalBrowser", "1");
    return url.toString();
  }
  if (info.os === "android") {
    const scheme = url.protocol.replace(":", "");
    return (
      `intent://${url.host}${url.pathname}${url.search}` +
      `#Intent;scheme=${scheme};package=com.android.chrome;` +
      `S.browser_fallback_url=${encodeURIComponent(target)};end`
    );
  }
  return null;
}

/** Copy to the clipboard; false when the webview allows neither API. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the legacy path
  }
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const done = document.execCommand("copy");
    document.body.removeChild(area);
    return done;
  } catch {
    return false;
  }
}
