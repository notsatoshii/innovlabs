// A pasted assistant output, readable on a 375 px phone (B1 비교, open
// sev-2 c4-09-1). Plain text keeps its line breaks and wraps; a Markdown
// pipe table (assistants answer "숫자는 표로" with one) becomes a real table
// in its own sideways-scrolling box instead of wrapped rows of pipes. Text
// only, never parsed as HTML.

import { Fragment } from "react";

type Part = { kind: "text"; text: string } | { kind: "table"; rows: string[][] };

const ROW_RE = /^\s*\|.*\|\s*$/;
const RULE_RE = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;

function cells(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());
}

/** Text and pipe tables, in order. A table is two or more `| … |` rows. */
export function splitPasted(text: string): Part[] {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const parts: Part[] = [];
  let buf: string[] = [];
  const flush = () => {
    if (buf.length > 0) parts.push({ kind: "text", text: buf.join("\n") });
    buf = [];
  };
  for (let k = 0; k < lines.length; ) {
    let end = k;
    while (end < lines.length && ROW_RE.test(lines[end])) end++;
    if (end - k >= 2) {
      flush();
      const rows = lines.slice(k, end).filter((l) => !RULE_RE.test(l)).map(cells);
      parts.push({ kind: "table", rows });
      k = end;
    } else {
      buf.push(lines[k]);
      k++;
    }
  }
  flush();
  return parts;
}

export function PastedText({ text }: { text: string }) {
  const parts = splitPasted(text);
  return (
    <>
      {parts.map((p, k) =>
        p.kind === "text" ? (
          p.text.trim() ? (
            <div key={k} className="c-pasted-text">
              {p.text.replace(/^\n+|\n+$/g, "")}
            </div>
          ) : (
            <Fragment key={k} />
          )
        ) : (
          <div key={k} className="c-tablewrap" tabIndex={0}>
            <table className="c-ptable">
              <tbody>
                {p.rows.map((row, r) => (
                  <tr key={r}>
                    {row.map((cell, c) =>
                      r === 0 ? <th key={c}>{cell}</th> : <td key={c}>{cell}</td>,
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ),
      )}
    </>
  );
}
