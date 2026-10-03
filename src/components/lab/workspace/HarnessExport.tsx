"use client";

// The learner's saved harnesses as text, for loading into the workspace
// (Week 3 pre-work: "both harnesses as text"; phase-2c Scope, independent of
// D1). Each harness has 복사하기 and 텍스트 파일로 저장. The text is
// assembleHarness, exactly what the harness library's preview copies. When
// the clipboard API is missing or refused, the text is opened and selected
// for the learner to copy by hand (same fallback as the library preview).

import { useRef, useState } from "react";
import Link from "next/link";
import type { HarnessDraftItem } from "@/lib/courses/types";
import { assembleHarness } from "../rules";

export interface ExportHarness {
  item: HarnessDraftItem;
  version: number;
  /** "2026년 10월 7일" */
  savedOn: string;
}

type Result = "copied" | "selected" | "saved" | "save_failed";

const RESULT_TEXT: Record<Result, string> = {
  copied: "복사했어요. 워크스페이스의 지시 칸에 붙여 넣으세요.",
  selected: "자동으로 복사하지 못했어요. 글 전체를 선택해 두었으니 그대로 복사해 주세요.",
  saved: "파일로 저장했어요. 다운로드 폴더를 확인해 주세요.",
  save_failed: "이 브라우저에서는 파일로 저장하지 못했어요. 복사하기를 써 주세요.",
};

/** A file name a phone or PC accepts: the harness name without path characters. */
function fileName(item: HarnessDraftItem): string {
  const base = item.name.replace(/[\\/:*?"<>|\n\r\t]/g, " ").replace(/\s+/g, " ").trim().slice(0, 50);
  return `${base || "하네스"}.txt`;
}

function HarnessRow({ harness }: { harness: ExportHarness }) {
  const text = assembleHarness(harness.item);
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const [result, setResult] = useState<Result | null>(null);

  const selectAll = () => {
    if (detailsRef.current) detailsRef.current.open = true;
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
      setResult("copied");
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
    setResult(done ? "copied" : "selected");
  };

  const save = () => {
    try {
      // The byte order mark lets older Windows Notepad read the Korean as UTF-8.
      const blob = new Blob(["﻿", text], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName(harness.item);
      document.body.appendChild(link);
      link.click();
      link.remove();
      // Some mobile browsers read the blob after click returns.
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      setResult("saved");
    } catch {
      setResult("save_failed");
    }
  };

  return (
    <li className="nb-flat flex flex-col gap-2.5 px-3 py-3">
      <div className="min-w-0">
        <p className="break-words text-[15px] font-bold leading-snug">
          {harness.item.name.trim() || "이름 없는 하네스"}
        </p>
        <p className="mt-0.5 text-xs text-gray-600">
          {harness.item.doc_type ? `${harness.item.doc_type} · ` : ""}
          v{harness.version} · {harness.savedOn} 저장
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={copy} className="nb-btn nb-btn-white min-h-11 px-2 text-sm">
          복사하기
        </button>
        <button type="button" onClick={save} className="nb-btn nb-btn-white min-h-11 px-2 text-sm">
          텍스트 파일로 저장
        </button>
      </div>
      <p role="status" aria-live="polite" className="min-h-5 text-sm font-bold">
        {result && RESULT_TEXT[result]}
      </p>
      <details ref={detailsRef} className="text-sm">
        <summary className="cursor-pointer py-1 font-bold underline underline-offset-4">내용 보기</summary>
        <pre
          ref={preRef}
          tabIndex={0}
          aria-label={`${harness.item.name || "하네스"} 전체 글`}
          className="nb-flat mt-2 max-h-80 overflow-auto whitespace-pre-wrap break-words bg-[var(--background)] px-3 py-3 font-sans text-sm leading-relaxed"
        >
          {text}
        </pre>
      </details>
    </li>
  );
}

export default function HarnessExport({ harnesses }: { harnesses: ExportHarness[] }) {
  return (
    <section className="nb-card px-4 py-4">
      <h2 className="text-base font-extrabold">워크스페이스에 넣을 하네스</h2>
      <p className="mt-1 text-sm leading-relaxed text-gray-700">
        저장한 하네스를 글로 꺼내요. 첫 번째 하네스는 복사해서 지시 칸에 붙여 넣고, 두 번째는 파일로 저장해
        올리면 돼요.
      </p>
      {harnesses.length === 0 ? (
        <div className="mt-3 flex flex-col gap-3">
          <p className="text-sm text-gray-600">아직 저장한 하네스가 없어요.</p>
          <Link
            href="/app/lab/harness"
            className="nb-btn nb-btn-white flex min-h-11 w-full items-center justify-center px-4 text-sm"
          >
            하네스 라이브러리로 가기
          </Link>
        </div>
      ) : (
        <ul className="mt-3 flex flex-col gap-2.5">
          {harnesses.map((harness) => (
            <HarnessRow key={harness.item.id} harness={harness} />
          ))}
        </ul>
      )}
    </section>
  );
}
