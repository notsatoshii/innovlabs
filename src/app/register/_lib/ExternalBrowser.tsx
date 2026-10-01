"use client";

// "Open in your own browser" block for in-app browsers (review finding P0-5),
// shared by /register and /login. Google sign-in is refused inside KakaoTalk,
// NAVER, Instagram and similar webviews; this offers the way out: a button
// that asks the host app to open the page externally where that is possible,
// and a copy-the-address fallback everywhere.

import { useState } from "react";
import { copyText, externalOpenUrl, type InAppInfo } from "./inapp";

type CopyState = "idle" | "copied" | "manual" | "failed";

export default function ExternalBrowser({
  inApp,
  getUrl,
  purpose,
  formal = false,
}: {
  inApp: InAppInfo;
  /** The address to continue at, or null when it cannot be built yet. */
  getUrl: () => Promise<string | null>;
  purpose: "register" | "login";
  /** 합니다체 (학원 path) instead of 해요체. */
  formal?: boolean;
}) {
  const [state, setState] = useState<CopyState>("idle");
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Whether this app can be asked to hand the page to the phone's browser.
  const canOpen = externalOpenUrl(inApp, "https://example.com/") !== null;
  const t = (casual: string, polite: string) => (formal ? polite : casual);

  const resolve = async (): Promise<string | null> => {
    setBusy(true);
    const next = await getUrl();
    setBusy(false);
    if (!next) {
      setState("failed");
      return null;
    }
    setUrl(next);
    return next;
  };

  const open = async () => {
    const target = await resolve();
    if (!target) return;
    const link = externalOpenUrl(inApp, target);
    if (link) window.location.href = link;
  };

  const copy = async () => {
    const target = await resolve();
    if (!target) return;
    setState((await copyText(target)) ? "copied" : "manual");
  };

  return (
    <div className="mt-8 border-t border-gray-200 pt-5">
      <p className="mb-3 text-sm leading-relaxed text-gray-500">
        {purpose === "register"
          ? t(
              "구글 계정으로 계속하시려면 Chrome이나 Safari에서 여시면 돼요. 진단 결과는 그대로 이어져요.",
              "구글 계정으로 계속하시려면 Chrome이나 Safari에서 여시면 됩니다. 진단 결과는 그대로 이어집니다.",
            )
          : "구글 계정으로 로그인하시려면 Chrome이나 Safari에서 여시면 돼요."}
      </p>
      <div className="flex flex-col gap-2">
        {canOpen && (
          <button
            type="button"
            disabled={busy}
            onClick={open}
            className="nb-btn nb-btn-white w-full py-3 text-[15px]"
          >
            기본 브라우저에서 열기
          </button>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={copy}
          className={
            canOpen
              ? "w-full py-2 text-sm text-gray-500 underline underline-offset-4"
              : "nb-btn nb-btn-white w-full py-3 text-[15px]"
          }
        >
          주소 복사하기
        </button>
      </div>
      {state === "copied" && (
        <p className="mt-3 text-sm leading-relaxed text-gray-700" role="status">
          {t(
            "주소를 복사했어요. Chrome이나 Safari 주소창에 붙여 넣어 주세요.",
            "주소를 복사했습니다. Chrome이나 Safari 주소창에 붙여 넣어 주세요.",
          )}
        </p>
      )}
      {state === "manual" && url && (
        <div className="mt-3">
          <p className="mb-2 text-sm leading-relaxed text-gray-700">
            {t(
              "아래 주소를 길게 눌러 복사한 뒤 Chrome이나 Safari 주소창에 붙여 넣어 주세요.",
              "아래 주소를 길게 눌러 복사하신 뒤 Chrome이나 Safari 주소창에 붙여 넣어 주세요.",
            )}
          </p>
          <input
            type="text"
            readOnly
            value={url}
            onFocus={(e) => e.currentTarget.select()}
            className="nb-input w-full px-3 py-2 text-base"
          />
        </div>
      )}
      {state === "failed" && (
        <p className="mt-3 text-sm text-red-500" role="alert">
          {t(
            "진단 결과를 아직 저장하지 못했어요. 잠시 후 다시 눌러 주세요.",
            "진단 결과를 아직 저장하지 못했습니다. 잠시 후 다시 눌러 주세요.",
          )}
        </p>
      )}
    </div>
  );
}
