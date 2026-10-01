"use client";

// Part 4 of the harness card: the rules, one line each, ten at most (the
// ten-rule cap). A new rule is typed in the field under the list and added
// with 추가; a sentence carried over from the correction log starts there too.
// The "structure, not content" rule every harness needs is one tap away
// while no rule says it yet.

import { useEffect, useRef, useState } from "react";
import { HARNESS_LIMITS } from "@/lib/courses/types";
import { STRUCTURE_RULE, hasStructureRule } from "../rules";

const INPUT = "nb-input w-full px-3 py-2.5 text-base leading-relaxed placeholder:text-gray-400";

export function RulesEditor({
  rules,
  onChange,
  prefillRule,
  onPrefillClosed,
}: {
  rules: string[];
  onChange: (change: (rules: string[]) => string[]) => void;
  /** A corrected sentence from the correction log, or null. Read once, when the editor opens. */
  prefillRule: string | null;
  /** Called when the carried-over sentence was added as a rule (true) or set aside (false). */
  onPrefillClosed: (added: boolean) => void;
}) {
  const [newRule, setNewRule] = useState(prefillRule ?? "");
  const newRuleRef = useRef<HTMLTextAreaElement>(null);
  const fromLog = prefillRule !== null;
  const full = rules.length >= HARNESS_LIMITS.maxRules;
  const candidate = newRule.replace(/\s+/g, " ").trim();

  // Arriving from the correction log: bring the waiting sentence into view.
  useEffect(() => {
    if (fromLog) newRuleRef.current?.scrollIntoView({ block: "center" });
  }, [fromLog]);

  const add = () => {
    if (full || candidate.length === 0) return;
    onChange((list) => [...list, candidate.slice(0, HARNESS_LIMITS.rule)]);
    setNewRule("");
    if (fromLog) onPrefillClosed(true);
  };

  return (
    <div className="flex flex-col gap-3">
      {rules.length > 0 && (
        <ol className="flex flex-col gap-2">
          {rules.map((rule, index) => (
            <li key={index} className="flex items-start gap-2">
              <span aria-hidden className="w-5 shrink-0 pt-3 text-center text-sm font-extrabold">
                {index + 1}
              </span>
              <textarea
                rows={2}
                aria-label={`규칙 ${index + 1}`}
                value={rule}
                maxLength={HARNESS_LIMITS.rule}
                onChange={(e) => {
                  const value = e.target.value;
                  onChange((list) => list.map((line, i) => (i === index ? value : line)));
                }}
                className={`${INPUT} min-w-0 flex-1`}
              />
              <button
                type="button"
                aria-label={`규칙 ${index + 1} 지우기`}
                onClick={() => onChange((list) => list.filter((_, i) => i !== index))}
                className="min-h-11 shrink-0 px-1 text-sm font-bold underline underline-offset-4"
              >
                지우기
              </button>
            </li>
          ))}
        </ol>
      )}

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-2">
          <label htmlFor="harness-new-rule" className="text-sm font-bold">
            새 규칙
          </label>
          <span
            className={`text-xs font-bold tabular-nums ${
              rules.length > HARNESS_LIMITS.maxRules ? "text-red-600" : "text-gray-600"
            }`}
          >
            규칙 {rules.length} / {HARNESS_LIMITS.maxRules}
          </span>
        </div>
        {fromLog && (
          <p className="nb-flat bg-[var(--nb-yellow)] px-3 py-2 text-sm leading-relaxed">
            수정 기록에서 가져온 문장이에요. 다음에도 그대로 통하는 규칙으로 다듬은 뒤 추가해 주세요.
          </p>
        )}
        <textarea
          id="harness-new-rule"
          ref={newRuleRef}
          rows={2}
          value={newRule}
          maxLength={HARNESS_LIMITS.rule}
          placeholder="예: 부장님은 늘 전월 대비를 찾으시니 요청이 없어도 넣는다."
          onChange={(e) => setNewRule(e.target.value)}
          onKeyDown={(e) => {
            // Enter adds the rule. Not while Korean input is still composing a syllable.
            if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
            e.preventDefault();
            add();
          }}
          className={INPUT}
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={add}
            disabled={full || candidate.length === 0}
            className="nb-btn nb-btn-white flex-1 px-4 py-2.5 text-sm"
          >
            규칙 추가
          </button>
          {fromLog && (
            <button
              type="button"
              onClick={() => {
                setNewRule("");
                onPrefillClosed(false);
              }}
              className="min-h-11 shrink-0 px-2 text-sm font-bold underline underline-offset-4"
            >
              넣지 않기
            </button>
          )}
        </div>
        {full && (
          <p className="text-sm leading-relaxed text-gray-700">
            규칙은 열 개까지예요. 더 넣으려면 하나를 지우거나 둘을 하나로 합쳐 주세요. 예시가 이미 보여
            주는 규칙부터 지우면 돼요.
          </p>
        )}
      </div>

      {!hasStructureRule(rules) && (
        <div className="nb-flat flex flex-col gap-2 bg-[var(--background)] px-3 py-3 text-sm leading-relaxed">
          <p>
            <b>이 규칙이 아직 없어요.</b> 없으면 예시에 있던 지난 숫자가 새 초안에 섞여 나와요.
          </p>
          <p className="text-gray-700">“{STRUCTURE_RULE}”</p>
          <button
            type="button"
            disabled={full}
            onClick={() => onChange((list) => [...list, STRUCTURE_RULE])}
            className="nb-btn nb-btn-white px-4 py-2.5 text-sm"
          >
            이 규칙 넣기
          </button>
        </div>
      )}
    </div>
  );
}
