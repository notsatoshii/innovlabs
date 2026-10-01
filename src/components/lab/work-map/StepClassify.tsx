"use client";

// Work Map step 2 (lab Part 2): mark every row P, T, or M with the temp test,
// split every M into a P row and a T row, and read the P total.

import { useState } from "react";
import { totals } from "@/lib/courses/work-map";
import type { RowKind, WorkMapDraft, WorkMapRow } from "@/lib/courses/types";
import { ChoiceGroup, HoursStepper, type Choice } from "../inputs";
import { WORK_MAP_LIMITS, formatHours, newId, splitMixedRow } from "../rules";
import type { EditorCategory, SetWorkMap } from "./types";

const KIND_CHOICES: Choice<RowKind>[] = [
  { value: "P", tag: "P", label: "처리" },
  { value: "T", tag: "T", label: "판단" },
  { value: "M", tag: "M", label: "섞임" },
];

export function StepClassify({
  categories,
  draft,
  setDraft,
  onGoWrite,
}: {
  categories: EditorCategory[];
  draft: WorkMapDraft;
  setDraft: SetWorkMap;
  onGoWrite: () => void;
}) {
  // Rows whose name and hours are open for editing here (a fresh split opens both halves).
  const [editing, setEditing] = useState<ReadonlySet<string>>(() => new Set());

  const updateRow = (id: string, patch: Partial<Pick<WorkMapRow, "task" | "hours" | "kind">>) => {
    setDraft((d) => ({ ...d, rows: d.rows.map((r) => (r.id === id ? { ...r, ...patch } : r)) }));
  };

  const toggleEditing = (id: string) => {
    setEditing((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const split = (row: WorkMapRow) => {
    const ids = { p: newId("r"), t: newId("r") };
    setDraft((d) => splitMixedRow(d, row.id, ids));
    setEditing((prev) => new Set([...prev, ids.p, ids.t]));
  };

  const sum = totals(draft.rows);
  const unclassified = draft.rows.filter((r) => r.kind === null).length;
  const mixed = draft.rows.filter((r) => r.kind === "M").length;
  const classified = draft.rows.length - unclassified;
  const allThinking = classified >= 5 && sum.p_hours === 0 && sum.m_hours === 0;
  const pShare = sum.p_hours + sum.t_hours > 0 ? Math.round((sum.p_hours / (sum.p_hours + sum.t_hours)) * 100) : null;
  // A split would add a row; at the cap there is no room for it.
  const canSplit = draft.rows.length < WORK_MAP_LIMITS.rows;

  return (
    <div className="flex flex-col gap-4">
      <section className="nb-flat px-4 py-4 text-sm leading-relaxed">
        <h2 className="mb-2 text-base font-extrabold">2. 분류하기</h2>
        <p className="nb-flat bg-[var(--nb-yellow)] px-3 py-2.5 font-bold">
          유능한 파견 직원에게 반나절 안에 설명할 수 있다면 처리(P)예요.
        </p>
        <dl className="mt-3 flex flex-col gap-1.5">
          <div className="flex gap-2">
            <dt className="w-16 shrink-0 font-extrabold">P 처리</dt>
            <dd>옮기고, 바꾸고, 찾고, 정리하고, 되풀이하는 일</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-16 shrink-0 font-extrabold">T 판단</dt>
            <dd>무엇이 중요한지 정하고, 잘됐는지 가리고, 처음 겪는 일을 풀고, 사람과 이야기하는 일</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-16 shrink-0 font-extrabold">M 섞임</dt>
            <dd>
              둘이 섞인 일. 그대로 둘 수 없고 두 줄로 나눠야 해요. ‘주간보고 쓰기’라면 ‘숫자 모아서
              양식에 넣기’(P)와 ‘무엇을 강조할지 정하고 의견 쓰기’(T)로요.
            </dd>
          </div>
        </dl>
      </section>

      {draft.rows.length === 0 && (
        <section className="nb-flat px-4 py-4 text-sm">
          <p>아직 적은 업무가 없어요. 먼저 업무를 적어 주세요.</p>
          <button type="button" onClick={onGoWrite} className="nb-btn nb-btn-white mt-3 px-4 py-2.5 text-sm">
            업무 적으러 가기
          </button>
        </section>
      )}

      {categories.map((category) => {
        const rows = draft.rows.filter((r) => r.category === category.id);
        if (rows.length === 0) return null;
        return (
          <section key={category.id} className="nb-card px-4 py-4">
            <h3 className="text-[15px] font-extrabold leading-snug">{category.label || "이름 없는 영역"}</h3>
            <ul className="mt-3 flex flex-col gap-2.5">
              {rows.map((row) => {
                const name = row.task.trim() || "이름 없는 업무";
                const open = editing.has(row.id);
                return (
                  <li key={row.id} className="nb-flat p-3">
                    {open ? (
                      <div className="flex flex-col gap-2">
                        <input
                          type="text"
                          aria-label="업무 이름"
                          value={row.task}
                          maxLength={WORK_MAP_LIMITS.task}
                          placeholder={row.kind === "T" ? "예: 무엇을 강조할지 정하고 의견 쓰기" : "예: 숫자 모아서 양식에 넣기"}
                          onChange={(e) => updateRow(row.id, { task: e.target.value })}
                          className="nb-input w-full px-3 py-2.5 text-[15px] placeholder:text-gray-400"
                        />
                        <div className="flex items-center justify-between gap-2">
                          <HoursStepper
                            value={row.hours}
                            onChange={(hours) => updateRow(row.id, { hours })}
                            label={name}
                          />
                          <button
                            type="button"
                            onClick={() => toggleEditing(row.id)}
                            className="min-h-11 shrink-0 px-2 text-sm font-bold underline underline-offset-4"
                          >
                            닫기
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-2">
                        <p className="min-w-0 flex-1 break-words text-[15px] leading-snug">
                          {name}
                          <span className="ml-2 whitespace-nowrap text-xs font-bold text-gray-600">
                            주 {formatHours(row.hours)}시간
                          </span>
                        </p>
                        <button
                          type="button"
                          onClick={() => toggleEditing(row.id)}
                          aria-label={`${name} 이름과 시간 고치기`}
                          className="-my-2 min-h-11 shrink-0 px-1 text-sm font-bold underline underline-offset-4"
                        >
                          고치기
                        </button>
                      </div>
                    )}

                    <div className="mt-2.5">
                      <ChoiceGroup
                        name={`kind-${row.id}`}
                        legend={`${name} 분류`}
                        legendHidden
                        columns
                        options={KIND_CHOICES}
                        value={row.kind}
                        onChange={(kind) => updateRow(row.id, { kind })}
                      />
                    </div>

                    {row.kind === "M" && (
                      <div className="mt-2.5 flex flex-col gap-2 text-sm">
                        <p className="text-gray-700">
                          처리하는 부분과 판단하는 부분, 두 줄로 나눠 주세요. 시간은 반반으로 나뉘니
                          나눈 뒤에 이름과 시간을 실제에 맞게 고치면 돼요.
                        </p>
                        <button
                          type="button"
                          onClick={() => split(row)}
                          disabled={!canSplit}
                          className="nb-btn nb-btn-primary self-start px-4 py-2.5 text-sm"
                        >
                          나누기
                        </button>
                        {!canSplit && (
                          <p className="text-gray-700">
                            줄 수가 가득 찼어요. 다른 줄을 하나 지우면 나눌 수 있어요.
                          </p>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      {draft.rows.length > 0 && (
        <section className="nb-card px-4 py-4">
          <h3 className="text-[15px] font-extrabold">합계</h3>
          <dl className="mt-2 grid grid-cols-2 gap-2 text-center">
            <div className="nb-flat bg-[var(--nb-lime)] px-2 py-3">
              <dt className="text-xs font-bold">P 처리</dt>
              <dd className="text-xl font-extrabold">주 {formatHours(sum.p_hours)}시간</dd>
            </div>
            <div className="nb-flat px-2 py-3">
              <dt className="text-xs font-bold">T 판단</dt>
              <dd className="text-xl font-extrabold">주 {formatHours(sum.t_hours)}시간</dd>
            </div>
          </dl>
          <p className="mt-3 text-sm font-bold leading-relaxed">
            이 P 합계가 바로 이 과정에서 줄이려는 시간이에요.
            {pShare !== null && unclassified === 0 && mixed === 0 && (
              <span className="font-normal text-gray-700"> 지금은 전체의 {pShare}%예요.</span>
            )}
          </p>
          {(unclassified > 0 || mixed > 0) && (
            <p className="mt-2 text-sm text-gray-700">
              {unclassified > 0 && <>아직 분류하지 않은 업무가 {unclassified}줄 있어요. </>}
              {mixed > 0 && (
                <>
                  M으로 남은 업무가 {mixed}줄(주 {formatHours(sum.m_hours)}시간) 있어요. 나눠야 합계에
                  들어가요.
                </>
              )}
            </p>
          )}
          {allThinking && (
            <p className="mt-2 text-sm text-gray-700">
              전부 T로 보인다면, 가장 귀찮은 일 하나를 떠올려 보세요. 어려워서 귀찮은가요, 되풀이라서
              귀찮은가요? 되풀이라서 귀찮다면 P예요.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
