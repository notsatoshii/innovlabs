// Text blocks of a mission screen. Content text accepts **bold** and line
// breaks only; slots were resolved on the server. Rendered as React nodes, so
// nothing in the content is ever parsed as HTML.

import { Fragment, type ReactNode } from "react";
import { withCoachName } from "@/lib/course/coach";
import type { Block } from "@/lib/course/types";

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
