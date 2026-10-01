"use client";

// 한 장 미리보기: the harness as the plain text the learner pastes into an
// assistant (assembleHarness), with a copy button. The clipboard API needs a
// secure page, so when it is missing or refused the text is selected instead
// and the old copy command is tried; if that fails too, the learner copies
// the selection by hand.

import { useRef, useState } from "react";
import type { HarnessDraftItem } from "@/lib/courses/types";
import { ONE_PAGE_EOJEOL, ONE_PAGE_WARNING, assembleHarness, harnessEojeol, normalizeHarness } from "../rules";

type Copied = { text: string; how: "copied" | "selected" };

export function HarnessPreview({ item }: { item: HarnessDraftItem }) {
  const text = assembleHarness(item);
  const eojeol = harnessEojeol(item);
  const preRef = useRef<HTMLPreElement>(null);
  // Remembered with the text it was for, so the message goes away once the harness changes.
  const [copied, setCopied] = useState<Copied | null>(null);
  const result = copied && copied.text === text ? copied.how : null;

  const h = normalizeHarness(item);
  const missing = [
    h.role ? "" : "역할",
    h.context ? "" : "맥락",
    h.format ? "" : "형식",
    h.rules.length > 0 ? "" : "규칙",
    h.example ? "" : "예시",
    h.fallbacks ? "" : "예외 처리",
  ].filter((part) => part.length > 0);

  const selectAll = () => {
    const node = preRef.current;
    const selection = window.getSelection();
    if (!node || !selection) return;
    const range = document.createRange();
    range.selectNodeContents(node);
    selection.removeAllRanges();
    selection.addRange(range);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied({ text, how: "copied" });
      return;
    } catch {
      // No clipboard API on this page (plain http) or permission refused: fall through.
    }
    selectAll();
    let done = false;
    try {
      done = document.execCommand("copy");
    } catch {
      // Not supported: the text stays selected for the learner to copy.
    }
    setCopied({ text, how: done ? "copied" : "selected" });
  };

  return (
    <section className="nb-card flex flex-col gap-3 px-4 py-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-base font-extrabold">한 장 미리보기</h2>
        <span className="shrink-0 text-xs font-bold tabular-nums text-gray-600">
          예시 빼고 {eojeol.toLocaleString("ko-KR")}어절
        </span>
      </div>
      <p className="text-xs leading-relaxed text-gray-600">
        어시스턴트의 새 대화에 이대로 붙여 넣고, 이어서 이번 주 원자료를 넣으면 돼요.
      </p>

      {eojeol > ONE_PAGE_EOJEOL && (
        <p className="nb-flat bg-[var(--nb-yellow)] px-3 py-2 text-sm font-bold leading-relaxed">
          {ONE_PAGE_WARNING}
        </p>
      )}

      {text.length > 0 ? (
        <pre
          ref={preRef}
          tabIndex={0}
          aria-label="하네스 전체 글"
          className="nb-flat max-h-[28rem] overflow-auto whitespace-pre-wrap break-words bg-[var(--background)] px-3 py-3 font-sans text-sm leading-relaxed"
        >
          {text}
        </pre>
      ) : (
        <p className="nb-flat bg-[var(--background)] px-3 py-3 text-sm text-gray-600">
          위에서 적는 대로 여기에 한 장으로 모여요.
        </p>
      )}

      {text.length > 0 && missing.length > 0 && (
        <p className="text-xs leading-relaxed text-gray-600">아직 비어 있는 부분: {missing.join(", ")}</p>
      )}

      <button
        type="button"
        onClick={copy}
        disabled={text.length === 0}
        className="nb-btn nb-btn-white w-full px-4 py-3 text-[15px]"
      >
        복사하기
      </button>
      <p role="status" aria-live="polite" className="min-h-5 text-sm">
        {result === "copied" && <span className="font-bold">복사했어요. 새 대화에 붙여 넣으세요.</span>}
        {result === "selected" && (
          <span className="font-bold">
            자동으로 복사하지 못했어요. 글 전체를 선택해 두었으니 그대로 복사해 주세요.
          </span>
        )}
      </p>
    </section>
  );
}
