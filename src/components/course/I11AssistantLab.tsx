"use client";

// I11 어시스턴트 실습: do a step in your own assistant and paste the result.
// The pasted text stays in the browser (page state and this tab's
// sessionStorage, shared with the B1 비교 and 확인 screens) and is never sent
// to the server; only the fact that the step was done is recorded (POST
// /api/course/step).
//
// "예시 결과 넣기" fills the review example. A round saved with it is recorded
// at 0 XP and the screen says so before the learner saves (rulebook:
// evidence, never self-report; audience review #9).

import { useState } from "react";
import type { I11AssistantLab as I11 } from "@/lib/course/types";
import { Rich } from "./Blocks";
import { CopyButton } from "./CopyButton";
import { NetLine, amountText, ownMaterial, retryable, useAward, usePlayer, type InteractionProps } from "./context";
import { squash } from "./SpanDoc";

const TOO_SHORT = "결과가 너무 짧아요. 어시스턴트의 답을 통째로 붙여 넣으세요.";
const SAME_AS_ROUND1 = "1라운드와 같은 글이에요. 2라운드는 새 대화의 결과예요.";
const MAX_CHARS = 20000;

export function I11AssistantLab({ i, onDone }: InteractionProps<I11>) {
  const { local, setLocal, packs } = usePlayer();
  const { stepResult, error, retry } = useAward();
  const [text, setText] = useState(local.rounds[i.round] ?? "");
  const [saved, setSaved] = useState(false);
  const [paid, setPaid] = useState<number | null>(null);
  const [ownTicked, setOwnTicked] = useState(false);
  const ownMode = ownMaterial(local);

  const v = text.trim();
  const materials = [i.packText, ...Object.values(packs)].filter((m): m is string => !!m).map(squash);
  let problem = "";
  if (v && (v.length < i.minChars || materials.includes(squash(v)))) problem = TOO_SHORT;
  else if (v && i.round === 2 && local.rounds[1] && squash(v) === squash(local.rounds[1])) problem = SAME_AS_ROUND1;
  // The review example, not the learner's own assistant: recorded, not paid.
  const isExample = !!i.exampleText && !!v && squash(v) === squash(i.exampleText);

  const save = async () => {
    setLocal((l) => ({ ...l, rounds: { ...l.rounds, [i.round]: v } }));
    const res = await stepResult(i.id, i.xp.part, { example: isExample });
    if (res.ok) setPaid(res.data.amount);
    if (res.ok || retryable(res.error)) {
      setSaved(true);
      onDone();
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <ol className="flex list-decimal flex-col gap-2 pl-5 text-[15.5px] leading-relaxed">
        {i.steps.map((s, k) => (
          <li key={k}>
            <Rich text={s} />
          </li>
        ))}
      </ol>
      {i.packText &&
        (ownMode ? (
          <div className="c-acts">
            <button
              type="button"
              className={`c-sbtn${ownTicked ? " is-ticked" : ""}`}
              aria-pressed={ownTicked}
              onClick={() => setOwnTicked(true)}
            >
              {ownTicked ? "✓ 내 것 붙여 넣었어요" : "내 것 붙여 넣었어요"}
            </button>
          </div>
        ) : (
          <>
            <div className="c-acts">
              <CopyButton text={i.packText} />
            </div>
            <details className="c-details">
              <summary>재료 보기</summary>
              <pre className="c-doc">{i.packText}</pre>
            </details>
          </>
        ))}
      <label className="c-label">
        <span className="c-doclab text-[var(--course-ink)]">{i.round}라운드 결과</span>
        <textarea
          className={`c-input${problem ? " is-bad" : ""}`}
          value={text}
          maxLength={MAX_CHARS}
          disabled={saved}
          placeholder={`${i.round}라운드 결과를 여기에 붙여 넣으세요`}
          onChange={(e) => setText(e.target.value)}
        />
      </label>
      <p className="c-small">붙여 넣은 글은 이 화면에서만 써요. 서버로 보내지 않아요.</p>
      {i.exampleText && !saved && (
        <div className="c-acts">
          <button type="button" className="c-sbtn" onClick={() => setText(i.exampleText ?? "")}>
            예시 결과 넣기
          </button>
        </div>
      )}
      {isExample && !saved && (
        <p className="c-small" role="status">
          예시 결과로 하면 이 라운드는 XP가 0이에요. 내 어시스턴트의 결과를 붙여 넣으면 {i.xp.right} XP를 받아요.
        </p>
      )}
      {problem && (
        <p className="c-hint" role="status">
          {problem}
        </p>
      )}
      {saved ? (
        <p className="c-okline" role="status">
          {`✓ ${i.round}라운드 완료${amountText(paid)}${isExample ? " (예시 결과, XP 없음)" : ""}`}
        </p>
      ) : (
        <button
          type="button"
          className="nb-btn nb-btn-white c-btn"
          disabled={!v || !!problem}
          onClick={() => void save()}
        >
          붙여 넣기 완료
        </button>
      )}
      <NetLine error={error} onRetry={() => void retry()} />
    </div>
  );
}
