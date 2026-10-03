"use client";

// The editor's way into the template sheet (D1). Renders nothing when the
// learner can read no templates (not enrolled, or none seeded yet).
//   - A blank harness never saved: a card with "템플릿으로 시작".
//   - A harness never saved with something in it: a short line with
//     "템플릿 보기"; starting again asks before it replaces what is written.
//   - A saved harness: "템플릿 보기" for reading only.

import { useState } from "react";
import type { HarnessDraftItem, HarnessTemplate } from "@/lib/courses/types";
import { TemplateSheet } from "./TemplateSheet";
import { isBlankHarness, templateFor } from "./template-rules";

export function TemplateStart({
  item,
  templates,
  saved,
  onStart,
}: {
  item: HarnessDraftItem;
  templates: HarnessTemplate[];
  /** The harness has a saved version: the sheet is for reading only. */
  saved: boolean;
  onStart: (template: HarnessTemplate) => void;
}) {
  const [open, setOpen] = useState(false);
  if (templates.length === 0) return null;

  const blank = isBlankHarness(item);
  const from = templateFor(item, templates);

  const start = (template: HarnessTemplate) => {
    if (
      !blank &&
      !window.confirm(
        `${template.doc_type} 템플릿으로 다시 채울까요?\n지금 적은 내용은 지워지고, 역할·맥락·예시는 빈칸이 돼요.`,
      )
    ) {
      return;
    }
    onStart(template);
    setOpen(false);
    window.scrollTo({ top: 0 });
    // The first part to write is the role: put the cursor there.
    window.setTimeout(() => document.getElementById("harness-role")?.focus({ preventScroll: true }), 0);
  };

  const sheet = (
    <TemplateSheet
      open={open}
      onClose={() => setOpen(false)}
      templates={templates}
      initialId={from?.id ?? null}
      canStart={!saved}
      onStart={start}
    />
  );

  if (!saved && blank) {
    return (
      <section className="nb-card flex flex-col gap-3 bg-[var(--nb-cyan)] px-4 py-4">
        <h2 className="text-base font-extrabold">템플릿으로 시작할 수 있어요</h2>
        <p className="text-sm leading-relaxed">
          수업에서 함께 읽는 하네스 템플릿 가운데 하나를 골라 시작해요. 형식, 규칙, 예외 처리는 그대로
          가져오고 역할, 맥락, 예시는 내 일에 맞게 직접 써요.
        </p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="nb-btn nb-btn-white w-full px-4 py-3 text-[15px]"
        >
          템플릿으로 시작
        </button>
        <p className="text-xs leading-relaxed text-gray-700">처음부터 직접 쓰려면 아래 칸을 바로 채우면 돼요.</p>
        {sheet}
      </section>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <p className="min-w-0 flex-1 text-sm leading-relaxed text-gray-700">
        {from && !saved
          ? `${from.doc_type} 템플릿에서 시작했어요. 역할과 맥락은 직접 써 주세요.`
          : from
            ? `${from.doc_type} 템플릿에서 시작한 하네스예요.`
            : "수업에서 읽는 하네스 템플릿을 언제든 다시 볼 수 있어요."}
      </p>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="nb-btn nb-btn-white min-h-11 shrink-0 px-4 text-sm"
      >
        템플릿 보기
      </button>
      {sheet}
    </div>
  );
}
