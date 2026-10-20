"use client";

// A document split into sentences, each optionally tappable (I2 difference
// marks, I3 spot the error, the B1 invention find, the skip test). Sentences
// end at . ! ? followed by a space or the end of the line; a line that starts
// with "1)" … opens a section, which the I3 hint highlights.

import type { KeyboardEvent } from "react";

export interface Segment {
  index: number;
  text: string;
  /** Leading spaces kept outside the tappable span. */
  lead: string;
  section: string;
  newline?: boolean;
}

export function segments(doc: string): Segment[] {
  const out: Segment[] = [];
  let section = "";
  let index = 0;
  const lines = doc.split("\n");
  lines.forEach((line, li) => {
    const m = /^\s*(\d+\)|■)/.exec(line);
    if (m) section = `${li}:${m[1]}`;
    let buf = "";
    const flush = () => {
      if (!buf) return;
      const lead = /^\s*/.exec(buf)?.[0] ?? "";
      out.push({ index: index++, text: buf.slice(lead.length), lead, section });
      buf = "";
    };
    for (let i = 0; i < line.length; i++) {
      buf += line[i];
      if (".!?".includes(line[i]) && (i === line.length - 1 || line[i + 1] === " ")) flush();
    }
    flush();
    if (li < lines.length - 1) out.push({ index: -1, text: "", lead: "", section, newline: true });
  });
  return out;
}

/** The segment whose text contains `needle` (whitespace-insensitive). */
export function findSegment(segs: Segment[], needle: string): Segment | undefined {
  const n = squash(needle);
  if (!n) return undefined;
  return segs.find((s) => !s.newline && s.text && (squash(s.text).includes(n) || n.includes(squash(s.text))));
}

export function squash(s: string): string {
  return s.replace(/\s+/g, "");
}

export function SpanDoc({
  text,
  classOf,
  onTap,
  label,
}: {
  text: string;
  /** Extra class per segment: is-hit, is-miss, is-zone, is-mark, is-chosen. */
  classOf?: (seg: Segment) => string;
  /** Omit for a read-only document. */
  onTap?: (seg: Segment) => void;
  label?: string;
}) {
  const segs = segments(text);
  const onKey = (e: KeyboardEvent, seg: Segment) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onTap?.(seg);
    }
  };
  // The instruction goes in a line screen readers read; aria-label on <pre>
  // is not announced (review P2-9).
  return (
    <>
      {label && <span className="sr-only">{label}</span>}
      <pre className="c-doc" tabIndex={onTap ? undefined : 0}>
        {segs.map((seg, k) => {
          if (seg.newline) return "\n";
          const cls = classOf?.(seg) ?? "";
          if (!onTap || !seg.text.trim()) {
            return (
              <span key={k} className={cls}>
                {seg.lead}
                {seg.text}
              </span>
            );
          }
          return (
            <span key={k}>
              {seg.lead}
              <span
                role="button"
                tabIndex={0}
                className={cls}
                onClick={() => onTap(seg)}
                onKeyDown={(e) => onKey(e, seg)}
              >
                {seg.text}
              </span>
            </span>
          );
        })}
      </pre>
    </>
  );
}
