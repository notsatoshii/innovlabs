"use client";

// Copies a pack document. The clipboard API needs a secure context (the
// review server runs over plain http), so a failure falls back to a hidden
// textarea + execCommand, and if that fails too the button tells the learner
// to long-press the material shown below it.

import { useState } from "react";

function legacyCopy(text: string): boolean {
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export function CopyButton({
  text,
  label = "재료 복사",
  failText = "재료 보기에서 길게 눌러 복사하세요",
  onCopied,
}: {
  text: string;
  label?: string;
  /** Shown when the browser refused the copy (the text is shown nearby to long-press). */
  failText?: string;
  onCopied?: () => void;
}) {
  const [state, setState] = useState<"idle" | "ok" | "fail">("idle");

  const copy = async () => {
    let ok = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        ok = true;
      }
    } catch {
      ok = false;
    }
    if (!ok) ok = legacyCopy(text);
    setState(ok ? "ok" : "fail");
    if (ok) onCopied?.();
  };

  return (
    <button
      type="button"
      className={`c-sbtn${state === "ok" ? " is-ticked" : ""}`}
      onClick={() => void copy()}
      aria-live="polite"
    >
      {state === "ok" ? "✓ 복사했어요" : state === "fail" ? failText : label}
    </button>
  );
}
