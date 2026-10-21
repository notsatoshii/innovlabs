// Text blocks of a mission screen. Content text accepts **bold** and line
// breaks only; slots were resolved on the server. Rendered as React nodes, so
// nothing in the content is ever parsed as HTML.

import { Fragment, type ReactNode } from "react";
import { COACH_NAME, withCoachName } from "@/lib/course/coach";
import type { Block, ToolCard } from "@/lib/course/types";
import { PJBar } from "./PJBar";

/** "**a**\nb" → <b>a</b><br/>b. An unpaired ** is shown as typed. */
export function Rich({ text }: { text: string }) {
  // "[코치]" in content shows as the coach's name.
  const lines = withCoachName(text).split("\n");
  return (
    <>
      {lines.map((line, li) => (
        <Fragment key={li}>
          {li > 0 && <br />}
          {boldParts(line)}
        </Fragment>
      ))}
    </>
  );
}

function boldParts(line: string): ReactNode[] {
  const parts = line.split("**");
  // An even number of parts means an unpaired marker: keep the line as typed.
  if (parts.length % 2 === 0) return [line];
  return parts.map((part, i) => (i % 2 === 1 ? <b key={i}>{part}</b> : <Fragment key={i}>{part}</Fragment>));
}

export function Blocks({
  blocks,
  renderInteraction,
}: {
  blocks: Block[];
  renderInteraction: (block: Extract<Block, { t: "i" }>, index: number) => ReactNode;
}) {
  return (
    <>
      {blocks.map((block, index) => {
        switch (block.t) {
          case "h":
            return (
              <h2 key={index} className="c-h">
                <Rich text={block.text} />
              </h2>
            );
          case "p":
            return (
              <p key={index} className="c-p">
                <Rich text={block.text} />
              </p>
            );
          case "quote":
            return (
              <div key={index} className="c-quote">
                <Rich text={block.text} />
              </div>
            );
          case "warn":
            return (
              <div key={index} className="c-warn" role="note">
                <Rich text={block.text} />
              </div>
            );
          case "small":
            return (
              <p key={index} className="c-small">
                <Rich text={block.text} />
              </p>
            );
          case "doc":
            return (
              <div key={index} className="flex flex-col gap-1.5">
                {block.label && <div className="c-doclab">{block.label}</div>}
                <pre className="c-doc" tabIndex={0}>
                  {withCoachName(block.text)}
                </pre>
              </div>
            );
          case "coach":
            // The coach's voice without the sprite (모아 already sits on the beat bar).
            return (
              <div key={index} className="c-coach">
                <div className="c-bubble">
                  <b>{COACH_NAME}</b>
                  <Rich text={block.text} />
                </div>
              </div>
            );
          case "reveal":
            return (
              <details key={index} className="c-details">
                <summary>{block.label}</summary>
                <p className="c-p mt-2">
                  <Rich text={block.text} />
                </p>
              </details>
            );
          case "bar":
            return <PJBar key={index} guess={block.guess} />;
          case "tool":
            return <ToolCardView key={index} card={block} />;
          case "fallback":
            return (
              <div key={index} className="c-fallback">
                <div className="c-lab">{block.label}</div>
                <Blocks blocks={block.blocks} renderInteraction={renderInteraction} />
              </div>
            );
          case "i":
            return <Fragment key={block.i.id}>{renderInteraction(block, index)}</Fragment>;
        }
      })}
    </>
  );
}

/** "2026-10-20" → "2026년 10월 20일". */
function dateKo(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${y}년 ${m}월 ${d}일`;
}

/**
 * A dated tool card (rulebook §3.6): the course word, its rule, what to do
 * first, what never goes in, and the dated picks (the only place product
 * names appear). The date is on the card, because the picks change.
 */
export function ToolCardView({ card }: { card: ToolCard }) {
  const [y, m] = card.asof.split("-");
  return (
    <section className="c-tool" aria-label={`도구 카드: ${card.name}`}>
      <div className="c-tool-hd">
        <span className="c-tool-ic" aria-hidden>
          카
        </span>
        <span className="c-tool-name">
          <small>도구 카드</small>
          {card.name}
        </span>
        <span className="c-tool-tag">
          부록 {y}-{m}
        </span>
      </div>
      <p className="c-tool-rule">
        <Rich text={card.rule} />
      </p>
      <ul className="c-tool-lines">
        {card.lines.map((line, k) => (
          <li key={k}>
            <Rich text={line} />
          </li>
        ))}
      </ul>
      <div className="c-warn" role="note">
        <Rich text={card.dont} />
      </div>
      <details className="c-details">
        <summary>{card.picksLabel ?? "어떤 어시스턴트가 있나요"}</summary>
        <dl className="c-tool-picks">
          {card.picks.map((pick) => (
            <div key={pick.name}>
              <dt>{pick.name}</dt>
              <dd>{pick.fact}</dd>
            </div>
          ))}
        </dl>
      </details>
      <p className="c-tool-date">{dateKo(card.asof)} 기준이에요. 바뀔 수 있어요.</p>
    </section>
  );
}

/** Every interaction on a screen, including any inside a fallback block. */
export function interactionsOf(blocks: Block[]): Extract<Block, { t: "i" }>["i"][] {
  const out: Extract<Block, { t: "i" }>["i"][] = [];
  for (const b of blocks) {
    if (b.t === "i") out.push(b.i);
    else if (b.t === "fallback") out.push(...interactionsOf(b.blocks));
  }
  return out;
}

/** Pack documents by id from doc blocks (I10 copy buttons read them). */
export function packsOf(blocks: Block[], into: Record<string, string> = {}): Record<string, string> {
  for (const b of blocks) {
    if (b.t === "doc" && b.packId) into[b.packId] = b.text;
    else if (b.t === "fallback") packsOf(b.blocks, into);
  }
  return into;
}
