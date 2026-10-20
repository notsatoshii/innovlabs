"use client";

// I1 분류하기: a deck of cards sorted into bins by swipe (left = first bin,
// right = last bin) or by the bin buttons. Combo x2 from 4 right in a row, x3
// from 8. A wrong card comes back once at `retry` points. A right (or second
// wrong) 'mix' card splits into its pieces, sorted next. The points shown are
// the local reading; the XP pill shows what the server paid.
//
// `test` turns off scoring, feedback, retries and pieces (the skip test).

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { I1Sort as I1, SortAnswer } from "@/lib/course/types";
import { NetLine, useAward, usePlayer, type InteractionProps } from "./context";

interface Item {
  key: string;
  text: string;
  answer: SortAnswer;
  why?: string;
  split?: I1["cards"][number]["split"];
  piece?: boolean;
  of?: string;
  retry?: boolean;
  base: string; // the original card's key, for first-try counting
}

const BIN_LABEL: Record<SortAnswer, string> = { p: "◀ 처리", mix: "섞임", j: "판단 ▶" };
const BIN_CLASS: Record<SortAnswer, string> = { p: "is-p", mix: "is-mix", j: "is-j" };
const KIND_NAME: Record<SortAnswer, string> = { p: "처리", j: "판단", mix: "섞임" };

export interface SortTest {
  onAnswer: (cardIndex: number, bin: SortAnswer) => void;
  onEnd: () => void;
}

export function I1Sort(props: InteractionProps<I1>) {
  return <SortDeck {...props} />;
}

export function SortDeck({
  i,
  onDone,
  test,
  reduced: reducedProp,
}: InteractionProps<I1> & { test?: SortTest; reduced?: boolean }) {
  // The skip test renders outside a MissionPlayer: no context there.
  return test ? (
    <Deck i={i} onDone={onDone} test={test} reduced={!!reducedProp} caps={null} award={null} />
  ) : (
    <ScoredDeck i={i} onDone={onDone} />
  );
}

function ScoredDeck({ i, onDone }: InteractionProps<I1>) {
  const { caps, reduced } = usePlayer();
  const award = useAward();
  return <Deck i={i} onDone={onDone} reduced={reduced} caps={caps} award={award} />;
}

function Deck({
  i,
  onDone,
  test,
  reduced,
  caps,
  award,
}: InteractionProps<I1> & {
  test?: SortTest;
  reduced: boolean;
  caps: Record<string, number> | null;
  award: ReturnType<typeof useAward> | null;
}) {
  const [queue, setQueue] = useState<Item[]>(() =>
    i.cards.map((c) => ({ key: c.key, text: c.text, answer: c.answer, why: c.why, split: c.split, base: c.key })),
  );
  const [idx, setIdx] = useState(0);
  const [streak, setStreak] = useState(0);
  const [pts, setPts] = useState(0);
  const [wrong, setWrong] = useState<ReadonlySet<string>>(() => new Set());
  const [fb, setFb] = useState<{ cls: string; text: string }>({ cls: "", text: i.intro ?? "" });
  const [flying, setFlying] = useState<-1 | 0 | 1 | null>(null);
  const [comboPop, setComboPop] = useState(0);
  const busy = useRef(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; dx: number; on: boolean }>({ x: 0, dx: 0, on: false });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finished = idx >= queue.length;

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  useEffect(() => {
    if (!finished) return;
    if (test) test.onEnd();
    else onDone();
    // Runs once when the deck empties.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  const advance = () => {
    setFlying(null);
    setIdx((n) => n + 1);
    busy.current = false;
    const el = cardRef.current;
    if (el) el.style.transform = "";
  };

  const pick = (bin: SortAnswer) => {
    if (busy.current || finished) return;
    busy.current = true;
    const card = queue[idx];
    const ok = card.answer === bin;
    setFlying(bin === "p" ? -1 : bin === "j" ? 1 : 0);

    if (test) {
      test.onAnswer(idx, bin);
    } else {
      const extra: Item[] = [];
      const pieces = (): Item[] =>
        (card.split ?? []).map((p) => ({
          key: p.key,
          text: p.text,
          answer: p.answer,
          piece: true,
          of: card.text,
          base: p.key,
        }));
      if (ok) {
        const s = streak + 1;
        const m = s >= 8 ? 3 : s >= 4 ? 2 : 1;
        const g = card.retry ? i.xp.retry : i.xp.per * m;
        setStreak(s);
        setPts((p) => p + g);
        setComboPop((n) => n + 1);
        const combo = m > 1 && !card.retry ? ` (콤보 x${m})` : "";
        setFb({ cls: "is-ok", text: `${card.why ?? "맞아요."} +${g}${combo}` });
        if (card.answer === "mix") extra.push(...pieces());
      } else {
        setStreak(0);
        setWrong((w) => new Set(w).add(card.base));
        let line = card.why ? `아니에요. ${card.why}` : `아니에요. ${KIND_NAME[card.answer]}예요.`;
        if (!card.retry) {
          extra.push({ ...card, retry: true });
          line += " 이 카드는 한 번 더 나와요.";
        } else if (card.answer === "mix") {
          extra.push(...pieces());
        }
        setFb({ cls: "is-no", text: line });
      }
      if (extra.length) {
        setQueue((q) => {
          const next = q.slice();
          // Pieces come right after the card; a retry goes to the end.
          const retries = extra.filter((x) => x.retry && !x.piece);
          const parts = extra.filter((x) => x.piece);
          next.splice(idx + 1, 0, ...parts);
          next.push(...retries);
          return next;
        });
      }
      // Pieces are practice only: the server scores the content's cards
      // ("<key>" first try, "<key>#2" the retry).
      if (!card.piece) void award?.answer(i.id, bin, i.xp.part, card.retry ? `${card.key}#2` : card.key);
    }

    if (reduced) advance();
    else timer.current = setTimeout(advance, 260);
  };

  // Swipe: the card follows the finger; past 80px it counts as a pick.
  const onDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    drag.current = { x: e.clientX, dx: 0, on: true };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Older browsers: the drag still works while the finger stays on the card.
    }
    e.currentTarget.style.transition = "none";
  };
  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d.on) return;
    d.dx = e.clientX - d.x;
    const el = e.currentTarget;
    el.style.transform = `translateX(${d.dx}px) rotate(${d.dx / 18}deg)`;
    const l = el.querySelector<HTMLElement>(".c-tag.is-l");
    const r = el.querySelector<HTMLElement>(".c-tag.is-r");
    if (l) l.style.opacity = d.dx < -30 ? "1" : "0";
    if (r) r.style.opacity = d.dx > 30 ? "1" : "0";
  };
  const onUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d.on) return;
    d.on = false;
    const el = e.currentTarget;
    el.style.transition = "";
    el.querySelectorAll<HTMLElement>(".c-tag").forEach((t) => (t.style.opacity = "0"));
    if (d.dx < -80) pick(i.bins[0]);
    else if (d.dx > 80) pick(i.bins[i.bins.length - 1]);
    else el.style.transform = "";
  };

  const card = queue[idx];
  const nextCard = queue[idx + 1];
  const three = i.bins.length === 3;
  const combo = streak >= 4 ? `콤보 x${streak >= 8 ? 3 : 2} · ${streak}연속` : streak >= 2 ? `${streak}연속` : "";

  let endLine = "";
  if (finished && !test) {
    const firstRight = i.cards.filter((c) => !wrong.has(c.key)).length;
    if (wrong.size === 0) endLine = i.endAllRight ?? "끝났어요.";
    else if (i.lowBelow !== undefined && firstRight < i.lowBelow && i.endLow) endLine = i.endLow;
    else endLine = (i.endSome ?? "{n}장을 한 번에 맞혔어요.").replace("{n}", String(firstRight));
  }
  const cap = caps?.[i.xp.part];

  return (
    <div className="flex flex-col gap-3">
      <div className="c-score" aria-live="polite">
        <span>{finished ? `${queue.length} / ${queue.length}` : `${idx + 1} / ${queue.length}`}</span>
        {!test && (
          <>
            <span key={comboPop} className={`c-combo${comboPop && combo ? " is-pop" : ""}`}>
              {combo}
            </span>
            <span>{pts}점</span>
          </>
        )}
      </div>
      <div className="c-deck">
        {finished ? (
          !test && (
            <div className="c-card is-fin" role="status">
              <span style={{ whiteSpace: "pre-line" }}>{endLine}</span>
            </div>
          )
        ) : (
          <>
            {nextCard && (
              <div className={`c-card is-back${nextCard.piece ? " is-piece" : ""}`} aria-hidden>
                {nextCard.text}
              </div>
            )}
            <div
              key={`${card.key}${card.retry ? "r" : ""}-${idx}`}
              ref={cardRef}
              className={`c-card${card.piece ? " is-piece" : ""}${flying !== null ? " is-out" : ""}`}
              style={
                flying !== null
                  ? {
                      transform:
                        flying === 0
                          ? "translateY(-25%) scale(.9)"
                          : `translateX(${flying * 120}%) rotate(${flying * 8}deg)`,
                    }
                  : undefined
              }
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerCancel={onUp}
              aria-live="polite"
            >
              <span className="c-tag is-l" aria-hidden>
                {KIND_NAME[i.bins[0]]}
              </span>
              <span className="c-tag is-r" aria-hidden>
                {KIND_NAME[i.bins[i.bins.length - 1]]}
              </span>
              <div>{card.text}</div>
              {card.piece && card.of && <span className="c-sub">&quot;{card.of}&quot;에서 나온 조각</span>}
            </div>
          </>
        )}
      </div>
      <div className={`c-bins${three ? " is-three" : ""}`}>
        {i.bins.map((b) =>
          b === "mix" && card?.piece ? (
            <span key={b} aria-hidden />
          ) : (
            <button
              key={b}
              type="button"
              className={`c-bin ${BIN_CLASS[b]}`}
              disabled={finished}
              onClick={() => pick(b)}
            >
              {BIN_LABEL[b]}
            </button>
          ),
        )}
      </div>
      {!test && fb.text && (
        <div className={`c-fb ${fb.cls}`} role="status">
          {fb.text}
        </div>
      )}
      {!test && finished && cap !== undefined && (
        <p className="c-small">
          해보기 점수 {pts}점 → XP는 최대 {cap}까지 쌓여요.
        </p>
      )}
      {award && <NetLine failed={award.failed} onRetry={award.retry} />}
    </div>
  );
}
