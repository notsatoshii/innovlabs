"use client";

// Work Map step 1 (lab Part 1): break each category into the tasks actually
// done every week, one row each, as a verb phrase with a rough hours guess.

import { useState } from "react";
import type { WorkMapDraft, WorkMapRow } from "@/lib/courses/types";
import { HoursStepper } from "../inputs";
import { WORK_MAP_LIMITS, formatHours, newId } from "../rules";
import type { EditorCategory, SetWorkMap } from "./types";

// The session plan's own examples of a verb phrase (Part 1, step 2).
const TASK_PLACEHOLDERS = ["예: 월요일 실적 숫자 취합하기", "예: 부장님 보고용 자료 양식 다시 맞추기"];

export function StepWrite({
  categories,
  draft,
  setDraft,
}: {
  categories: EditorCategory[];
  draft: WorkMapDraft;
  setDraft: SetWorkMap;
}) {
  // The row that was just added takes focus so the learner can keep typing.
  const [focusId, setFocusId] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState("");
  const full = draft.rows.length >= WORK_MAP_LIMITS.rows;

  const addRow = (category: string) => {
    if (full) return;
    const id = newId("r");
    setDraft((d) => ({ ...d, rows: [...d.rows, { id, category, task: "", hours: 1, kind: null }] }));
    setFocusId(id);
  };

  const updateRow = (id: string, patch: Partial<Pick<WorkMapRow, "task" | "hours">>) => {
    setDraft((d) => ({ ...d, rows: d.rows.map((r) => (r.id === id ? { ...r, ...patch } : r)) }));
  };

  const removeRow = (row: WorkMapRow) => {
    if (row.task.trim() && !window.confirm(`'${row.task.trim()}' 줄을 지울까요?`)) return;
    setDraft((d) => ({
      ...d,
      rows: d.rows.filter((r) => r.id !== row.id),
      candidates: d.candidates.filter((c) => c.rowId !== row.id),
    }));
  };

  const addCategory = () => {
    const label = newCategory.trim();
    if (!label || draft.extraCategories.length >= WORK_MAP_LIMITS.extraCategories) return;
    const used = draft.extraCategories.map((c) => Number(c.id.slice(1))).filter(Number.isFinite);
    const id = `x${Math.max(0, ...used) + 1}`;
    setDraft((d) => ({ ...d, extraCategories: [...d.extraCategories, { id, label }] }));
    setNewCategory("");
  };

  const renameCategory = (id: string, label: string) => {
    setDraft((d) => ({
      ...d,
      extraCategories: d.extraCategories.map((c) => (c.id === id ? { ...c, label } : c)),
    }));
  };

  const removeCategory = (category: EditorCategory) => {
    const count = draft.rows.filter((r) => r.category === category.id).length;
    if (count > 0 && !window.confirm(`'${category.label}'에 적은 업무 ${count}줄도 함께 지워져요. 지울까요?`)) {
      return;
    }
    setDraft((d) => {
      const gone = new Set(d.rows.filter((r) => r.category === category.id).map((r) => r.id));
      return {
        ...d,
        extraCategories: d.extraCategories.filter((c) => c.id !== category.id),
        rows: d.rows.filter((r) => !gone.has(r.id)),
        candidates: d.candidates.filter((c) => !gone.has(c.rowId)),
      };
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <section className="nb-flat px-4 py-4 text-sm leading-relaxed">
        <h2 className="mb-2 text-base font-extrabold">1. 업무 적기</h2>
        <p>
          진단 때 답한 업무 영역이 아래에 있어요. 영역마다 매주 실제로 하는 일을 한 줄에 하나씩
          적어 주세요. 해당 없는 영역은 비워 두면 돼요.
        </p>
        <p className="mt-2">
          <b>‘보고’</b>처럼 뭉뚱그리지 말고 <b>‘월요일 실적 숫자 취합하기’</b>처럼 무엇을 하는지
          드러나게 적어요. 시간은 어림잡아도 괜찮아요. 정확한 숫자는 이번 주 시간 기록에서 나와요.
        </p>
        <p className="mt-2 text-gray-700">
          다 적으면 보통 12~25줄, 합계는 주 25~50시간 사이에 들어와요. 위쪽 막대가 연두색이면 그
          안이에요.
        </p>
        <details className="mt-3">
          <summary className="cursor-pointer py-1 font-bold underline underline-offset-4">
            잘 떠오르지 않을 때
          </summary>
          <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5 text-gray-700">
            <li>지난주를 요일별로 훑어보면 빠뜨린 일이 보여요.</li>
            <li>매주 하는 일이 달라서 어렵다면, 어제 하루만 시간 순서대로 떠올려 보세요.</li>
            <li>
              ‘회의’, ‘이메일’ 한 줄로 남았다면 목적별로 나눠 보세요. 현황 공유 회의, 의사결정 회의,
              고객 메일, 내부 요청처럼요.
            </li>
          </ul>
        </details>
      </section>

      {categories.map((category) => {
        const rows = draft.rows.filter((r) => r.category === category.id);
        const written = rows.reduce((sum, r) => sum + r.hours, 0);
        return (
          <section key={category.id} className="nb-card px-4 py-4">
            {category.extra ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  aria-label="직접 추가한 업무 영역 이름"
                  value={category.label}
                  maxLength={WORK_MAP_LIMITS.categoryLabel}
                  onChange={(e) => renameCategory(category.id, e.target.value)}
                  className="nb-input min-w-0 flex-1 px-3 py-2 text-[15px] font-extrabold"
                />
                <button
                  type="button"
                  onClick={() => removeCategory(category)}
                  className="min-h-11 shrink-0 px-2 text-sm font-bold underline underline-offset-4"
                >
                  영역 지우기
                </button>
              </div>
            ) : (
              <h3 className="text-[15px] font-extrabold leading-snug">{category.label}</h3>
            )}
            <p className="mt-1 text-xs text-gray-600">
              {category.hint && <>진단 때 답한 시간: {category.hint} · </>}
              지금 적은 시간: 주 {formatHours(written)}시간
            </p>

            {rows.length > 0 && (
              <ul className="mt-3 flex flex-col gap-2.5">
                {rows.map((row, index) => (
                  <li key={row.id} className="nb-flat p-3">
                    <input
                      type="text"
                      aria-label={`${category.label} 업무 ${index + 1}`}
                      value={row.task}
                      maxLength={WORK_MAP_LIMITS.task}
                      placeholder={TASK_PLACEHOLDERS[index % TASK_PLACEHOLDERS.length]}
                      autoFocus={row.id === focusId}
                      enterKeyHint="next"
                      onChange={(e) => updateRow(row.id, { task: e.target.value })}
                      onKeyDown={(e) => {
                        // Enter on a filled row opens the next one: fast entry on a laptop.
                        if (e.key === "Enter" && !e.nativeEvent.isComposing && row.task.trim()) {
                          e.preventDefault();
                          addRow(category.id);
                        }
                      }}
                      className="nb-input w-full px-3 py-2.5 text-[15px] placeholder:text-gray-400"
                    />
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <HoursStepper
                        value={row.hours}
                        onChange={(hours) => updateRow(row.id, { hours })}
                        label={row.task.trim() || `업무 ${index + 1}`}
                      />
                      <button
                        type="button"
                        onClick={() => removeRow(row)}
                        aria-label={`${row.task.trim() || `업무 ${index + 1}`} 줄 지우기`}
                        className="min-h-11 shrink-0 px-2 text-sm font-bold underline underline-offset-4"
                      >
                        지우기
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <button
              type="button"
              onClick={() => addRow(category.id)}
              disabled={full}
              className="nb-btn nb-btn-white mt-3 w-full px-4 py-2.5 text-sm"
            >
              + 업무 추가
            </button>
          </section>
        );
      })}

      {full && (
        <p className="text-sm text-gray-700">
          한 워크맵에는 {WORK_MAP_LIMITS.rows}줄까지 적을 수 있어요. 비슷한 일은 한 줄로 묶어 주세요.
        </p>
      )}

      <section className="nb-flat px-4 py-4">
        <label htmlFor="work-map-new-category" className="mb-2 block text-sm font-bold">
          빠진 업무 영역이 있나요?
        </label>
        <div className="flex gap-2">
          <input
            id="work-map-new-category"
            type="text"
            value={newCategory}
            maxLength={WORK_MAP_LIMITS.categoryLabel}
            placeholder="예: 현장 점검"
            onChange={(e) => setNewCategory(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                e.preventDefault();
                addCategory();
              }
            }}
            className="nb-input min-w-0 flex-1 px-3 py-2.5 text-[15px] placeholder:text-gray-400"
          />
          <button
            type="button"
            onClick={addCategory}
            disabled={!newCategory.trim() || draft.extraCategories.length >= WORK_MAP_LIMITS.extraCategories}
            className="nb-btn nb-btn-white shrink-0 px-4 py-2.5 text-sm"
          >
            영역 추가
          </button>
        </div>
      </section>
    </div>
  );
}
