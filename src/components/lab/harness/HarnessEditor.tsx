"use client";

// Editor for one harness: the six parts of the harness card (SP-W2-HC) in the
// card's order, each with the card's question as helper text, then the
// one-page preview and the save button. Every keystroke goes into the shared
// draft (autosaved by the library); 저장하기 posts this one harness to
// /api/artifacts/harness, which checks it again and numbers the version.

import { useState } from "react";
import Link from "next/link";
import { HARNESS_LIMITS, type ApiResult, type HarnessDraftItem } from "@/lib/courses/types";
import { ONE_PAGE_EOJEOL, ONE_PAGE_WARNING, checkHarness, harnessEojeol, sameHarness } from "../rules";
import { useHarnessTemplates } from "../harness-templates/context";
import { TemplateHint } from "../harness-templates/TemplateHint";
import { TemplateStart } from "../harness-templates/TemplateStart";
import { startFromTemplate, templateFor, templateLeftoverWarning } from "../harness-templates/template-rules";
import { HarnessPreview } from "./HarnessPreview";
import { RulesEditor } from "./RulesEditor";
import type { RulePrefill, SavedView } from "./types";

const INPUT = "nb-input w-full px-3 py-2.5 text-base leading-relaxed placeholder:text-gray-400";

// The three templates the Week 2 lab starts from (SP-HL-01 to 03), as document types.
const DOC_TYPES = ["주간업무보고", "격식 있는 메일", "문서·회의 요약"];

type TextPart = "role" | "context" | "format" | "fallbacks";

// The harness card's own prompts, one question a part.
const PARTS: Record<TextPart, { order: number; title: string; question: string; placeholder: string; rows: number }> = {
  role: {
    order: 1,
    title: "역할",
    question: "이 어시스턴트는 누구를 위해 어떤 일을 하나요?",
    placeholder: "예: 영업지원팀 담당자가 팀장님께 올리는 주간업무보고의 초안을 쓴다.",
    rows: 3,
  },
  context: {
    order: 2,
    title: "맥락",
    question: "어떤 회사, 어떤 팀인가요? 읽는 사람은 누구이고, 이미 무엇을 알고 있나요?",
    placeholder: "예: 읽는 사람은 팀장님이다. 지난주 보고 내용은 이미 알고 계셔서 달라진 것만 궁금해하신다.",
    rows: 4,
  },
  format: {
    order: 3,
    title: "형식",
    question: "어떤 항목을 어떤 순서로, 얼마나 길게 쓰나요? 표인가요, 글인가요?",
    placeholder: "예: 주요 성과, 진행 중인 업무, 이슈, 다음 주 계획 순서로 쓴다. 한 장을 넘기지 않고, 실적 숫자는 표로 정리한다.",
    rows: 5,
  },
  fallbacks: {
    order: 6,
    title: "예외 처리",
    question: "정보가 빠져 있거나 자료가 형식에 맞지 않을 때는 어떻게 하나요?",
    placeholder: "예: 숫자나 이름이 빠져 있으면 지어내지 말고 [확인 필요]라고 표시한다. 형식에 맞지 않는 자료는 맨 아래에 따로 모아 적는다.",
    rows: 4,
  },
};

type SubmitState =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "done" }
  | { kind: "failed"; message: string; problems: string[] };

function failureMessage(status: number): string {
  if (status === 401) return "로그인이 풀렸어요. 다시 로그인한 뒤 저장해 주세요. 적은 내용은 그대로 있어요.";
  if (status === 422) return "아래 항목을 고친 뒤 다시 저장해 주세요.";
  if (status === 413) return "내용이 너무 길어요. 예시를 조금 줄인 뒤 다시 저장해 주세요.";
  if (status === 503) return "지금은 저장이 안 돼요. 강사에게 알려 주세요. 적은 내용은 그대로 있어요.";
  return "저장하지 못했어요. 잠시 뒤 다시 눌러 주세요.";
}

function PartHeading({
  order,
  title,
  question,
  htmlFor,
}: {
  order: number;
  title: string;
  question: string;
  htmlFor?: string;
}) {
  const heading = (
    <>
      <span className="nb-badge grid h-7 w-7 shrink-0 place-items-center bg-[var(--nb-yellow)] text-sm font-extrabold">
        {order}
      </span>
      <span className="text-base font-extrabold">{title}</span>
    </>
  );
  return (
    <div className="flex flex-col gap-1.5">
      {htmlFor ? (
        <label htmlFor={htmlFor} className="flex items-center gap-2">
          {heading}
        </label>
      ) : (
        <h2 className="flex items-center gap-2">{heading}</h2>
      )}
      <p className="text-sm leading-relaxed text-gray-700">{question}</p>
    </div>
  );
}

export default function HarnessEditor({
  item,
  onChange,
  saved,
  onSaved,
  onBack,
  onRemove,
  prefill,
  onPrefillClosed,
  pendingRuleIndex,
  onPendingRuleIndexChange,
  saveStatus,
}: {
  item: HarnessDraftItem;
  onChange: (change: (item: HarnessDraftItem) => HarnessDraftItem) => void;
  /** The latest saved version of this harness, or null before the first save. */
  saved: SavedView | null;
  /** Called with the version the server gave and the exact item that was saved. */
  onSaved: (version: number, item: HarnessDraftItem) => void;
  onBack: () => void;
  onRemove: () => void;
  prefill: RulePrefill | null;
  /** The prefilled sentence was added as a rule (its place in the rules) or set aside (null). */
  onPrefillClosed: (addedAt: number | null) => void;
  /** Place of the rule from the correction log that is not in a saved version yet, or null. */
  pendingRuleIndex: number | null;
  onPendingRuleIndexChange: (index: number | null) => void;
  /** The draft's autosave status line. */
  saveStatus: React.ReactNode;
}) {
  const [submit, setSubmit] = useState<SubmitState>({ kind: "idle" });
  // Templates (D1): empty unless the learner may read them. A harness started
  // from one shows its role, context and example as placeholders.
  const templates = useHarnessTemplates();
  const template = templateFor(item, templates);

  const check = checkHarness(item);
  // The one-page warning is shown with the preview, right above the save button.
  const leftover = templateLeftoverWarning(item, template);
  const warnings = [...check.warnings.filter((message) => message !== ONE_PAGE_WARNING), ...(leftover ? [leftover] : [])];
  const eojeol = harnessEojeol(item);
  const unchanged = saved !== null && sameHarness(item, saved.item);
  const sending = submit.kind === "sending";

  const set = (patch: Partial<HarnessDraftItem>) => onChange((prev) => ({ ...prev, ...patch }));

  const send = async () => {
    const sent = item;
    setSubmit({ kind: "sending" });
    let res: Response;
    try {
      res = await fetch("/api/artifacts/harness", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item: sent }),
      });
    } catch {
      setSubmit({ kind: "failed", message: "연결이 끊겼어요. 연결을 확인하고 다시 눌러 주세요.", problems: [] });
      return;
    }
    const result = (await res.json().catch(() => null)) as ApiResult<{
      harness_id: string;
      harness_version: number;
    }> | null;
    if (res.ok && result?.ok) {
      setSubmit({ kind: "done" });
      onSaved(result.data.harness_version, sent);
      return;
    }
    setSubmit({
      kind: "failed",
      message: failureMessage(res.status),
      problems: result && !result.ok ? (result.problems ?? []) : [],
    });
  };

  const textPart = (part: TextPart) => {
    const { order, title, question, placeholder, rows } = PARTS[part];
    const id = `harness-${part}`;
    const fromTemplate = template && (part === "role" || part === "context") ? template.parts[part] : null;
    return (
      <section className="nb-card flex flex-col gap-3 px-4 py-4">
        <PartHeading order={order} title={title} question={question} htmlFor={id} />
        <textarea
          id={id}
          rows={rows}
          value={item[part]}
          maxLength={HARNESS_LIMITS.field}
          placeholder={fromTemplate ?? placeholder}
          onChange={(e) => set({ [part]: e.target.value })}
          className={`${INPUT} resize-y`}
        />
        {fromTemplate && <TemplateHint text={fromTemplate} />}
      </section>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Sticky bar: the way back to the list, how long the harness is, save state. */}
      <div className="sticky top-0 z-20 -mx-6 border-b border-[var(--nb-line)] bg-[var(--background)] px-6 py-2">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            className="min-h-11 shrink-0 text-sm font-bold underline underline-offset-4"
          >
            ← 하네스 목록
          </button>
          <p className="text-right text-xs font-bold tabular-nums">
            규칙 {item.rules.length} / {HARNESS_LIMITS.maxRules} ·{" "}
            <span className={eojeol > ONE_PAGE_EOJEOL ? "text-red-600" : undefined}>
              {eojeol.toLocaleString("ko-KR")}어절
            </span>
          </p>
        </div>
        <div className="flex justify-end">{saveStatus}</div>
      </div>

      <TemplateStart
        item={item}
        templates={templates}
        saved={saved !== null}
        onStart={(chosen) => onChange((prev) => startFromTemplate(prev, chosen))}
      />

      <section className="nb-card flex flex-col gap-4 px-4 py-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="harness-name" className="text-[15px] font-extrabold">
            하네스 이름
          </label>
          <input
            id="harness-name"
            type="text"
            value={item.name}
            maxLength={HARNESS_LIMITS.name}
            placeholder="예: 팀장님께 올리는 주간보고"
            onChange={(e) => set({ name: e.target.value })}
            className={INPUT}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="harness-doc-type" className="text-[15px] font-extrabold">
            어떤 문서를 만드나요?
          </label>
          <input
            id="harness-doc-type"
            type="text"
            value={item.doc_type}
            maxLength={HARNESS_LIMITS.name}
            placeholder="예: 주간업무보고, 품의서, 고객사 안내 메일"
            onChange={(e) => set({ doc_type: e.target.value })}
            className={INPUT}
          />
          <div className="flex flex-wrap gap-2">
            {DOC_TYPES.map((docType) => (
              <button
                key={docType}
                type="button"
                aria-pressed={item.doc_type === docType}
                onClick={() => set({ doc_type: docType })}
                className={`min-h-11 rounded-full border border-[var(--nb-line)] px-3.5 text-sm ${
                  item.doc_type === docType ? "nb-selected font-bold" : "bg-[var(--nb-paper)]"
                }`}
              >
                {docType}
              </button>
            ))}
          </div>
          <p className="text-xs leading-relaxed text-gray-600">
            딱 맞는 게 없으면 직접 적어 주세요. 표를 정리하는 업무라면 결과물이 어떤 표인지 적으면 돼요.
          </p>
        </div>
      </section>

      {textPart("role")}
      {textPart("context")}
      {textPart("format")}

      <section className="nb-card flex flex-col gap-3 px-4 py-4">
        <PartHeading
          order={4}
          title="규칙"
          question="말투와 높임 수준은 어떻게 하나요? 늘 넣는 것, 넣으면 안 되는 것, 상사가 좋아하는 방식은요?"
        />
        <p className="text-xs leading-relaxed text-gray-600">
          한 줄에 하나씩, 열 개까지예요. 남이 보면 너무 사소해 보이는 규칙일수록 쓸모가 있어요.
        </p>
        <RulesEditor
          rules={item.rules}
          onChange={(change) => onChange((prev) => ({ ...prev, rules: change(prev.rules) }))}
          prefillRule={prefill ? prefill.rule : null}
          onPrefillClosed={onPrefillClosed}
          pendingIndex={pendingRuleIndex}
          onPendingIndexChange={onPendingRuleIndexChange}
        />
      </section>

      <section className="nb-card flex flex-col gap-3 px-4 py-4">
        <PartHeading
          order={5}
          title="예시"
          question="잘 쓴 완성본을 하나 보여 주세요. 내가 쓴 문서를 그대로 붙여 넣으면 돼요."
          htmlFor="harness-example"
        />
        <p className="text-sm font-bold leading-relaxed">
          붙여 넣기 전에 회사 밖으로 나가면 안 되는 내용부터 지워 주세요. 이름, 거래처, 금액 같은 것들이에요.
        </p>
        <textarea
          id="harness-example"
          rows={12}
          value={item.example}
          maxLength={HARNESS_LIMITS.example}
          placeholder={
            template?.parts.example ??
            "빈 양식 말고 다 쓴 문서를 넣어 주세요. 넣어도 괜찮은 문서가 없으면 연습용 자료의 예시를 써도 돼요."
          }
          onChange={(e) => set({ example: e.target.value })}
          className={`${INPUT} resize-y`}
        />
        {template && <TemplateHint text={template.parts.example} />}
        <p className="text-right text-xs tabular-nums text-gray-600">
          {item.example.length.toLocaleString("ko-KR")} / {HARNESS_LIMITS.example.toLocaleString("ko-KR")}자
        </p>
      </section>

      {textPart("fallbacks")}

      <HarnessPreview item={item} />

      <section className="nb-card flex flex-col gap-3 px-4 py-4">
        {unchanged && saved && submit.kind === "done" && (
          <div aria-live="polite" className="flex flex-col gap-3">
            <p className="nb-flat bg-[var(--nb-lime)] px-3 py-2.5 text-[15px] font-extrabold">
              새 버전(v{saved.version})으로 저장했어요.
            </p>
            <p className="text-sm leading-relaxed">
              이제 복사해서 새 대화에 붙여 넣고 돌려 보세요. 나온 결과를 고쳤다면 고친 것마다 수정 기록에 한
              줄씩 남겨 주세요.
            </p>
            <Link
              href={`/app/lab/corrections?h=${encodeURIComponent(item.id)}`}
              className="nb-btn nb-btn-primary block px-4 py-3 text-center text-[15px]"
            >
              수정 기록 남기러 가기
            </Link>
          </div>
        )}
        {unchanged && saved && submit.kind !== "done" && (
          <p className="text-sm leading-relaxed text-gray-700">
            저장한 내용(v{saved.version}) 그대로예요. 고친 뒤에 다시 저장할 수 있어요.
          </p>
        )}
        {!unchanged && (
          <>
            <button
              type="button"
              onClick={send}
              disabled={check.errors.length > 0 || sending}
              className="nb-btn nb-btn-primary w-full px-4 py-3.5 text-[15px]"
            >
              {sending ? "저장하는 중…" : "저장하기"}
            </button>
            {submit.kind === "failed" && (
              <div role="alert" className="text-sm text-red-600">
                <p className="font-bold">{submit.message}</p>
                {submit.problems.length > 0 && (
                  <ul className="mt-1 flex list-disc flex-col gap-1 pl-5">
                    {submit.problems.map((problem) => (
                      <li key={problem}>{problem}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            {check.errors.length > 0 && (
              <div className="text-sm">
                <p className="mb-1 font-bold">저장하려면 마저 채워 주세요</p>
                <ul className="flex list-disc flex-col gap-1 pl-5 text-gray-700">
                  {check.errors.map((message) => (
                    <li key={message}>{message}</li>
                  ))}
                </ul>
              </div>
            )}
            {warnings.length > 0 && (
              <div className="text-sm">
                <p className="mb-1 font-bold">한 번 더 살펴보세요 (그대로 저장해도 돼요)</p>
                <ul className="flex list-disc flex-col gap-1 pl-5 text-gray-700">
                  {warnings.map((message) => (
                    <li key={message}>{message}</li>
                  ))}
                </ul>
              </div>
            )}
            <p className="text-xs leading-relaxed text-gray-600">
              {saved
                ? `지금은 v${saved.version}까지 저장되어 있어요. 저장할 때마다 새 버전으로 남고, 이전 버전은 지워지지 않아요.`
                : "저장할 때마다 새 버전으로 남아요. 저장해 두면 수정 기록을 이 하네스에 남길 수 있어요."}
            </p>
          </>
        )}
      </section>

      {!saved && (
        <button
          type="button"
          onClick={onRemove}
          className="min-h-11 self-center px-2 text-sm font-bold text-gray-700 underline underline-offset-4"
        >
          이 하네스 지우기
        </button>
      )}
    </div>
  );
}
