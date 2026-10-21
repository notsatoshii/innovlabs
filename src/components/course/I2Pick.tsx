"use client";

// I2 둘 중 고르기: pick the document you could send, then difference chips
// appear one by one; a chip marks where the weaker document differs.
//
// Own-output mode (B1 비교): when the docs carry no text (or `own` is set),
// the two documents are the learner's pasted Round 1 and Round 2 outputs
// (kept in the learner's own course_local row). On a phone nothing fits side
// by side, so a toggle shows one round at a time (c4-09-1), with the `ask`
// line under it ("두 결과를 위 버튼으로 번갈아 볼 수 있어요…") above the pick
// buttons. The toggle sticks to the top while the round scrolls, switching
// keeps the same place in the other round, and a pasted table is a table
// (PastedText). After the pick the chips become one-line fields (a chip may
// carry its own placeholder); while writing them, either round opens in a
// bottom sheet, so the learner never scrolls back up to compare. Four filled
// lines unlock 비교 저장, which writes them to the drill draft's differences
// and records the pick.

import { forwardRef, useEffect, useRef, useState } from "react";
import type { I2Pick as I2 } from "@/lib/course/types";
import { Rich } from "./Blocks";
import { NetLine, amountText, useAward, usePlayer, type InteractionProps } from "./context";
import { PastedText } from "./PastedText";
import { SpanDoc, squash } from "./SpanDoc";

export function I2Pick({ i, onDone }: InteractionProps<I2>) {
  const own = i.own === true || (i.docs.length === 2 && i.docs.every((d) => !d.text.trim()));
  return own ? <OwnPick i={i} onDone={onDone} /> : <PackPick i={i} onDone={onDone} />;
}

function PackPick({ i, onDone }: InteractionProps<I2>) {
  const { reduced, react } = usePlayer();
  const { answer, error, retry } = useAward();
  const [picked, setPicked] = useState<string | null>(null);
  const [paid, setPaid] = useState<number | null>(null);
  const [shown, setShown] = useState(0);
  const [chip, setChip] = useState<number | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const weak = i.docs.find((d) => d.v !== i.answer) ?? i.docs[0];

  const pick = async (v: string) => {
    if (picked) return;
    setPicked(v);
    react(v === i.answer);
    if (v !== i.answer && i.chips.length) setChip(i.chips.length - 1); // the invented part first
    if (reduced) {
      setShown(i.chips.length);
      onDone();
    } else {
      i.chips.forEach((_, k) => {
        timers.current.push(
          setTimeout(() => {
            setShown(k + 1);
            if (k === i.chips.length - 1) onDone();
          }, 350 * (k + 1)),
        );
      });
      if (i.chips.length === 0) onDone();
    }
    const res = await answer(i.id, v, i.xp.part);
    if (res) setPaid(res.amount);
  };

  const find = chip !== null ? squash(i.chips[chip].find) : "";
  const marked = (text: string) => find.length > 0 && squash(text).length > 0 && (squash(text).includes(find) || find.includes(squash(text)));

  return (
    <div className="flex flex-col gap-3">
      {i.docs.map((d) => (
        <div key={d.v} className="flex flex-col gap-1.5">
          <div className="c-doclab">{d.label}</div>
          <SpanDoc
            text={d.text}
            label={d.label}
            classOf={(seg) => (picked && d.v === weak.v && marked(seg.text) ? "is-mark" : "")}
          />
        </div>
      ))}
      <div className="c-opts" role="group">
        {i.docs.map((d) => {
          const cls = !picked ? "" : d.v === i.answer ? " is-right" : d.v === picked ? " is-wrong" : "";
          return (
            <button
              key={d.v}
              type="button"
              className={`c-opt${cls}`}
              disabled={picked !== null}
              aria-pressed={picked === d.v}
              onClick={() => void pick(d.v)}
            >
              {d.label}
            </button>
          );
        })}
      </div>
      {picked && (
        <div className={`c-fb ${picked === i.answer ? "is-ok" : "is-no"}`} role="status">
          {picked === i.answer ? "맞아요." : <Rich text={i.wrongLine} />}
          {amountText(paid)}
        </div>
      )}
      {shown > 0 && (
        <>
          <p className="c-small">칩을 누르면 {weak.label}에서 어디가 다른지 표시돼요.</p>
          <div className="c-chips">
            {i.chips.slice(0, shown).map((c, k) => (
              <button
                key={c.name}
                type="button"
                className={`c-chip${reduced ? "" : " is-in"}${chip === k ? " is-on" : ""}`}
                aria-pressed={chip === k}
                onClick={() => setChip(k)}
              >
                {c.name}
              </button>
            ))}
          </div>
        </>
      )}
      <NetLine error={error} onRetry={() => void retry()} />
    </div>
  );
}

const MIN_LINES = 4;
const LINE_MAX = 40;

function OwnPick({ i, onDone }: InteractionProps<I2>) {
  const { local, drill } = usePlayer();
  const { answer, error, retry } = useAward();
  const [picked, setPicked] = useState<string | null>(null);
  const [lines, setLines] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [paid, setPaid] = useState<number | null>(null);
  const [view, setView] = useState(0);
  const [sheet, setSheet] = useState<number | null>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDialogElement>(null);

  /** Switch rounds at the same relative place, so the same part is compared. */
  const showRound = (k: number) => {
    const el = viewerRef.current;
    const ratio = el && el.scrollHeight > el.clientHeight ? el.scrollTop / (el.scrollHeight - el.clientHeight) : 0;
    setView(k);
    setTimeout(() => {
      const box = viewerRef.current;
      if (box) box.scrollTop = ratio * (box.scrollHeight - box.clientHeight);
    }, 0);
  };

  const openSheet = (k: number) => {
    setSheet(k);
    const d = sheetRef.current;
    if (d && !d.open) {
      try {
        d.showModal();
      } catch {
        d.setAttribute("open", "");
      }
    }
  };
  const closeSheet = () => {
    sheetRef.current?.close();
    setSheet(null);
  };

  const texts = [local.rounds[1] ?? "", local.rounds[2] ?? ""];
  const chips: I2["chips"] = i.chips.length
    ? i.chips
    : ["구조", "말투", "길이", "표", "2라운드가 잘한 점", "지어낸 것"].map((name) => ({ name, find: name }));
  const names = chips.map((c) => c.name);
  const placeholderOf = (name: string) => chips.find((c) => c.name === name)?.placeholder ?? "어디가 다른지 한 줄로";
  const shown = i.docs[view] ?? i.docs[0];
  const counted = Object.values(lines).filter((l) => l.trim()).length;

  const toggle = (name: string) => {
    if (saved) return;
    setLines((prev) => {
      const next = { ...prev };
      if (name in next) delete next[name];
      else next[name] = "";
      return next;
    });
  };

  const save = async () => {
    setSaved(true);
    const differences = Object.entries(lines)
      .filter(([, l]) => l.trim())
      .map(([name, l]) => `${name} - ${l.trim()}`);
    drill.setDraft((d) => ({ ...d, differences }));
    onDone();
    const res = await answer(i.id, picked ?? "", i.xp.part);
    if (res) setPaid(res.amount);
  };

  // Picking Round 1, or a checklist ticked out of order, fixes the first line.
  const orderLine = local.slip || (picked !== null && picked === i.docs[0]?.v);

  return (
    <div className="flex flex-col gap-3">
      <div className="c-compare">
        <RoundToggle docs={i.docs} view={view} onView={showRound} />
        <RoundText ref={viewerRef} label={shown.label} text={texts[view]} />
      </div>
      {i.ask && (
        <p className="c-p">
          <Rich text={i.ask} />
        </p>
      )}
      <div className="c-opts" role="group">
        {i.docs.map((d) => (
          <button
            key={d.v}
            type="button"
            className={`c-opt${picked === d.v ? " is-pick" : ""}`}
            disabled={picked !== null}
            aria-pressed={picked === d.v}
            onClick={() => setPicked(d.v)}
          >
            {d.label}
          </button>
        ))}
      </div>
      {picked && (
        <div className="flex flex-col gap-3">
          <p className="c-p">다른 점을 4개 이상 표시하세요. 칩을 누르고, 어디가 다른지 한 줄로요.</p>
          <div className="c-chips">
            {names.map((name) => (
              <button
                key={name}
                type="button"
                className={`c-chip${name in lines ? " is-on" : ""}`}
                aria-pressed={name in lines}
                disabled={saved}
                onClick={() => toggle(name)}
              >
                {name}
              </button>
            ))}
          </div>
          <div className="c-peek" role="group" aria-label="결과 다시 보기">
            <span className="c-small">칸을 채우면서 결과를 다시 볼 수 있어요.</span>
            <div className="c-acts">
              {i.docs.map((d, k) => (
                <button key={d.v} type="button" className="c-sbtn" onClick={() => openSheet(k)}>
                  {d.label} 보기
                </button>
              ))}
            </div>
          </div>
          {Object.keys(lines).map((name) => (
            <label key={name} className="c-label">
              {name}
              <input
                type="text"
                className="c-input"
                maxLength={LINE_MAX}
                value={lines[name]}
                disabled={saved}
                placeholder={placeholderOf(name)}
                onChange={(e) => setLines((prev) => ({ ...prev, [name]: e.target.value }))}
              />
            </label>
          ))}
          <p className="c-small" role="status">
            표시한 다른 점 {counted}개
          </p>
          {!saved ? (
            <button
              type="button"
              className="nb-btn nb-btn-white c-btn"
              disabled={counted < MIN_LINES}
              onClick={() => void save()}
            >
              비교 저장
            </button>
          ) : (
            <div className="c-reveal" role="status">
              <div className="c-small mb-1.5">예시 피드백 (고정 문장)</div>
              <div>잘된 점: 두 결과를 비교해서 다른 점을 {counted}개 찾았어요.</div>
              <div>
                고칠 점:{" "}
                {orderLine
                  ? "순서를 보세요. 예시 → 양식 → 재료 → 지시. 2라운드를 그 순서로 한 번 더 해 보면 달라져요."
                  : "재료에 없는 숫자나 계획이 있으면 지우거나 [확인 필요]로 바꾸세요."}
              </div>
              <div>확인할 것: 표의 숫자를 재료 원문과 한 줄씩 맞춰 보세요.</div>
              {paid ? <div className="c-okline mt-1.5">비교표를 저장했어요.{amountText(paid)}</div> : null}
            </div>
          )}
        </div>
      )}
      <NetLine error={error} onRetry={() => void retry()} />
      <dialog
        ref={sheetRef}
        className="c-sheet"
        aria-label={sheet !== null ? `${i.docs[sheet]?.label ?? ""} 결과` : "결과"}
        onClose={() => setSheet(null)}
        onClick={(e) => {
          // A tap on the dimmed backdrop (the dialog itself, outside its body) closes it.
          if (e.target === e.currentTarget) closeSheet();
        }}
      >
        {sheet !== null && (
          <div className="c-sheet-body">
            <RoundToggle docs={i.docs} view={sheet} onView={setSheet} />
            <RoundText label={i.docs[sheet]?.label ?? ""} text={texts[sheet]} />
            <button type="button" className="nb-btn nb-btn-white c-btn" onClick={closeSheet}>
              닫기
            </button>
          </div>
        )}
      </dialog>
    </div>
  );
}

function RoundToggle({ docs, view, onView }: { docs: I2["docs"]; view: number; onView: (k: number) => void }) {
  return (
    <div className="c-toggle" role="group" aria-label="볼 결과">
      {docs.map((d, k) => (
        <button key={d.v} type="button" className={view === k ? "is-on" : ""} aria-pressed={view === k} onClick={() => onView(k)}>
          {d.label}
        </button>
      ))}
    </div>
  );
}

const RoundText = forwardRef<HTMLDivElement, { label: string; text: string }>(function RoundText({ label, text }, ref) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="c-doclab">{label} 결과</div>
      {text ? (
        <div ref={ref} className="c-doc c-pasted" tabIndex={0} aria-label={`${label} 결과`}>
          <PastedText text={text} />
        </div>
      ) : (
        <p className="c-small">
          붙여 넣은 결과를 불러오지 못했어요. 어시스턴트 대화에서 결과를 보면서 비교해도 돼요.
        </p>
      )}
    </div>
  );
});
