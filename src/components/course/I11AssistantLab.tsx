"use client";

// I11 어시스턴트 실습: do a step in your own assistant and paste the result.
// The pasted text stays in this page's state (shared with the B1 비교 and
// 확인 screens) and is never sent to the server; only the fact that the step
// was done is recorded (POST /api/course/step).

import { useState } from "react";
import type { I11AssistantLab as I11 } from "@/lib/course/types";
import { Rich } from "./Blocks";
import { CopyButton } from "./CopyButton";
import { NetLine, amountText, useAward, usePlayer, type InteractionProps } from "./context";
import { squash } from "./SpanDoc";

const TOO_SHORT = "결과가 너무 짧아요. 어시스턴트의 답을 통째로 붙여 넣으세요.";
const SAME_AS_ROUND1 = "1라운드와 같은 글이에요. 2라운드는 새 대화의 결과예요.";
const MAX_CHARS = 20000;

export function I11AssistantLab({ i, onDone }: InteractionProps<I11>) {
  const { local, setLocal, packs } = usePlayer();
  const { step, failed, retry } = useAward();
  const [text, setText] = useState(local.rounds[i.round] ?? "");
  const [saved, setSaved] = useState(false);
  const [paid, setPaid] = useState<number | null>(null);
  const [ownTicked, setOwnTicked] = useState(false);
  const ownMode = Object.values(local.choices).includes("own");

  const v = text.trim();
  const materials = [i.packText, ...Object.values(packs)].filter((m): m is string => !!m).map(squash);
  let problem = "";
  if (v && (v.length < i.minChars || materials.includes(squash(v)))) problem = TOO_SHORT;
  else if (v && i.round === 2 && local.rounds[1] && squash(v) === squash(local.rounds[1])) problem = SAME_AS_ROUND1;

  const save = async () => {
    setLocal((l) => ({ ...l, rounds: { ...l.rounds, [i.round]: v } }));
    setSaved(true);
    onDone();
    const res = await step(i.id, i.xp.part);
    if (res) setPaid(res.amount);
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
      {problem && (
        <p className="c-hint" role="status">
          {problem}
        </p>
      )}
      {saved ? (
        <p className="c-okline" role="status">
          {`✓ ${i.round}라운드 완료${amountText(paid)}`}
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
      <NetLine failed={failed} onRetry={retry} />
    </div>
  );
}
