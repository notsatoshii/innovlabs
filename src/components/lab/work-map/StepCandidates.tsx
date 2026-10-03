"use client";

// Work Map step 3 (lab Part 3): from the P rows of an hour or more, pick
// three candidates in order and score each on the five criteria of the
// scoring card (SCORE_CRITERIA, shared with the server).

import { useState } from "react";
import { SCORE_CRITERIA, candidateTotal } from "@/lib/courses/work-map";
import type { CandidateScores, Score, WorkMapDraft } from "@/lib/courses/types";
import { ChoiceGroup, type Choice } from "../inputs";
import { emptyScores, formatHours } from "../rules";
import type { SetWorkMap } from "./types";

const SCORES: Score[] = [3, 2, 1]; // best first, as on the scoring card

export function StepCandidates({
  draft,
  setDraft,
  onGoClassify,
}: {
  draft: WorkMapDraft;
  setDraft: SetWorkMap;
  onGoClassify: () => void;
}) {
  // One scoring card open at a time keeps the page short on a phone.
  const [openRowId, setOpenRowId] = useState<string | null>(() => {
    const firstUnscored = draft.candidates.find((c) => candidateTotal(c.scores) === null);
    return firstUnscored?.rowId ?? null;
  });

  const byId = new Map(draft.rows.map((r) => [r.id, r]));
  const eligible = draft.rows
    .filter((r) => r.kind === "P" && r.hours >= 1)
    .sort((a, b) => b.hours - a.hours);
  const rankOf = (rowId: string) => draft.candidates.findIndex((c) => c.rowId === rowId);
  const picked = draft.candidates.length;

  const toggle = (rowId: string) => {
    if (rankOf(rowId) >= 0) {
      setDraft((d) => ({ ...d, candidates: d.candidates.filter((c) => c.rowId !== rowId) }));
      return;
    }
    if (picked >= 3) return;
    setDraft((d) =>
      d.candidates.length >= 3 || d.candidates.some((c) => c.rowId === rowId)
        ? d
        : { ...d, candidates: [...d.candidates, { rowId, scores: emptyScores() }] },
    );
    setOpenRowId(rowId);
  };

  const move = (index: number, by: -1 | 1) => {
    setDraft((d) => {
      const target = index + by;
      if (target < 0 || target >= d.candidates.length) return d;
      const candidates = [...d.candidates];
      [candidates[index], candidates[target]] = [candidates[target], candidates[index]];
      return { ...d, candidates };
    });
  };

  const setScore = (rowId: string, key: keyof CandidateScores, score: Score) => {
    setDraft((d) => ({
      ...d,
      candidates: d.candidates.map((c) =>
        c.rowId === rowId ? { ...c, scores: { ...c.scores, [key]: score } } : c,
      ),
    }));
  };

  return (
    <div className="flex flex-col gap-4">
      <section className="nb-flat px-4 py-4 text-sm leading-relaxed">
        <h2 className="mb-2 text-base font-extrabold">3. 후보 고르기</h2>
        <p>
          주 1시간 이상인 P 업무 가운데 자동화 후보 세 개를 순서대로 골라 주세요. 고른 뒤 후보마다
          다섯 항목에 1~3점을 매겨요.
        </p>
        <p className="nb-flat mt-3 bg-[var(--nb-yellow)] px-3 py-2.5 font-bold">
          후보 1은 매주 하는 업무여야 해요. 이번 주 시간 기록에 잡혀야 하거든요.
        </p>
        <p className="mt-3 text-gray-700">
          합계 13~15점이면 좋은 후보예요. 10점이 안 되면 4주차에 다룰 업무로는 맞지 않아요. 다른
          사람이 관리하는 업무는 점수가 높아도 후보 3으로 내리고, 후보 1과 2는 처음부터 끝까지 내
          일인 업무로 골라 주세요.
        </p>
      </section>

      <section className="nb-card px-4 py-4">
        <h3 className="text-[15px] font-extrabold">
          주 1시간 이상인 P 업무 <span className="text-sm font-bold text-gray-600">3개 중 {picked}개 고름</span>
        </h3>
        {eligible.length === 0 ? (
          <div className="mt-2 text-sm">
            <p>아직 주 1시간 이상인 P 업무가 없어요. 분류를 먼저 마쳐 주세요.</p>
            <button
              type="button"
              onClick={onGoClassify}
              className="nb-btn nb-btn-white mt-3 px-4 py-2.5 text-sm"
            >
              분류하러 가기
            </button>
          </div>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {eligible.map((row) => {
              const rank = rankOf(row.id);
              const chosen = rank >= 0;
              return (
                <li key={row.id}>
                  <button
                    type="button"
                    aria-pressed={chosen}
                    disabled={!chosen && picked >= 3}
                    onClick={() => toggle(row.id)}
                    className={`flex min-h-12 w-full items-center gap-3 rounded-xl border border-[var(--nb-line)] px-3 py-2 text-left text-[15px] leading-snug disabled:opacity-40 ${
                      chosen ? "nb-selected font-bold" : "bg-[var(--nb-paper)]"
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border border-[var(--nb-line)] text-xs font-extrabold ${
                        chosen ? "bg-[var(--nb-ink)] text-white" : "bg-[var(--nb-paper)]"
                      }`}
                    >
                      {chosen ? rank + 1 : ""}
                    </span>
                    <span className="min-w-0 flex-1 break-words">
                      {chosen && <span className="sr-only">후보 {rank + 1}: </span>}
                      {row.task.trim() || "이름 없는 업무"}
                    </span>
                    <span className="shrink-0 text-xs font-bold text-gray-700">
                      주 {formatHours(row.hours)}시간
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {eligible.length > 0 && eligible.length < 3 && (
          <p className="mt-3 text-sm leading-relaxed text-gray-700">
            1시간 넘는 P 업무가 세 개가 안 된다면, 하는 방식이 같은 자잘한 일을 한 줄로 묶어도 돼요.
            ‘팀원 6명 진행 상황 모으기(모든 채널)’처럼요.
          </p>
        )}
        {picked > 0 && picked < 3 && eligible.length >= 3 && (
          <p className="mt-3 text-sm text-gray-700">{3 - picked}개 더 골라 주세요. 다시 누르면 빠져요.</p>
        )}
      </section>

      {draft.candidates.map((candidate, index) => {
        const row = byId.get(candidate.rowId);
        const stale = !row || row.kind !== "P" || row.hours < 1;
        const total = candidateTotal(candidate.scores);
        const done = Object.values(candidate.scores).filter((v) => v !== null).length;
        const open = openRowId === candidate.rowId;
        const name = row?.task.trim() || "이름 없는 업무";
        return (
          <section key={candidate.rowId} className="nb-card px-4 py-4">
            <div className="flex items-start gap-3">
              <span className="nb-badge shrink-0 bg-[var(--nb-yellow)] px-2.5 py-0.5 text-xs font-extrabold">
                후보 {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="break-words text-[15px] font-extrabold leading-snug">{name}</h3>
                <p className="mt-0.5 text-xs font-bold text-gray-600">
                  {row ? `주 ${formatHours(row.hours)}시간 · ` : ""}
                  {total !== null ? `합계 ${total}점 / 15점` : `다섯 항목 중 ${done}개 매김`}
                </p>
              </div>
            </div>

            {stale && (
              <p className="mt-2 text-sm font-bold text-red-600">
                이 업무는 이제 후보가 될 수 없어요. P가 아니거나 주 1시간이 안 돼요. 빼고 다시 골라 주세요.
              </p>
            )}

            <div className="mt-2 flex flex-wrap items-center gap-x-4">
              <button
                type="button"
                onClick={() => setOpenRowId(open ? null : candidate.rowId)}
                aria-expanded={open}
                className="min-h-11 text-sm font-bold underline underline-offset-4"
              >
                {open ? "점수 접기" : total !== null ? "점수 다시 보기" : "점수 매기기"}
              </button>
              <button
                type="button"
                onClick={() => move(index, -1)}
                disabled={index === 0}
                aria-label={`후보 ${index + 1} 순위 올리기`}
                className="min-h-11 text-sm font-bold underline underline-offset-4 disabled:opacity-35"
              >
                ↑ 위로
              </button>
              <button
                type="button"
                onClick={() => move(index, 1)}
                disabled={index === draft.candidates.length - 1}
                aria-label={`후보 ${index + 1} 순위 내리기`}
                className="min-h-11 text-sm font-bold underline underline-offset-4 disabled:opacity-35"
              >
                ↓ 아래로
              </button>
              <button
                type="button"
                onClick={() => toggle(candidate.rowId)}
                aria-label={`후보 ${index + 1} 빼기`}
                className="min-h-11 text-sm font-bold underline underline-offset-4"
              >
                빼기
              </button>
            </div>

            {open && (
              <div className="mt-2 flex flex-col gap-5">
                {SCORE_CRITERIA.map((criterion) => {
                  const options: Choice<Score>[] = SCORES.map((score) => ({
                    value: score,
                    tag: `${score}점`,
                    label: criterion.options[score - 1],
                  }));
                  return (
                    <ChoiceGroup
                      key={criterion.key}
                      name={`score-${candidate.rowId}-${criterion.key}`}
                      legend={criterion.label}
                      options={options}
                      value={candidate.scores[criterion.key]}
                      onChange={(score) => setScore(candidate.rowId, criterion.key, score)}
                    />
                  );
                })}
                <p className="nb-flat px-3 py-2.5 text-sm font-bold">
                  {total !== null
                    ? `합계 ${total}점 / 15점`
                    : `아직 ${5 - done}개 항목이 남았어요.`}
                </p>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
