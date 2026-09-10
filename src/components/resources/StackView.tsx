// 이번 분기 도구 스택: the A3 tables for both paths, rendered from
// content/resources/stack.json (no DB). Server component. Each table scrolls
// horizontally inside its own container so the page never does.

import type { StackData, StackRow, ToolPath } from "@/lib/resources/types";

function StackTable({ rows }: { rows: StackRow[] }) {
  return (
    <div className="nb-flat overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-[var(--nb-ink)] bg-[var(--nb-yellow)] text-left text-xs">
            <th scope="col" className="px-3 py-2 font-extrabold">역할</th>
            <th scope="col" className="px-3 py-2 font-extrabold">추천</th>
            <th scope="col" className="px-3 py-2 font-extrabold">대안</th>
            <th scope="col" className="px-3 py-2 font-extrabold">이유</th>
            <th scope="col" className="px-3 py-2 font-extrabold">비용</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={`${row.role}-${i}`}
              className={i < rows.length - 1 ? "border-b border-gray-300 align-top" : "align-top"}
            >
              <th scope="row" className="whitespace-nowrap px-3 py-2 text-left font-bold">
                {row.role}
              </th>
              <td className="whitespace-nowrap px-3 py-2 font-semibold">{row.pick}</td>
              <td className="whitespace-nowrap px-3 py-2 text-gray-700">{row.alternate ?? "—"}</td>
              <td className="min-w-[180px] px-3 py-2 leading-relaxed">{row.why}</td>
              <td className="whitespace-nowrap px-3 py-2">{row.cost}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CostLine({ label, text }: { label: string; text: string }) {
  return (
    <li className="flex gap-2 text-sm leading-relaxed">
      <span className="nb-badge shrink-0 self-start bg-[var(--nb-paper)] px-2 py-0.5 text-[11px]">
        {label}
      </span>
      <span>{text}</span>
    </li>
  );
}

export function StackView({
  stack,
  learnerPath,
}: {
  stack: StackData;
  learnerPath: ToolPath | null;
}) {
  const pathSentence =
    learnerPath === "browser"
      ? "진단 결과에 따라 브라우저 경로로 진행하고 있어요. 아래 첫 번째 표가 내 스택이에요."
      : learnerPath === "agent"
        ? "진단 결과에 따라 에이전트·서버 경로로 진행하고 있어요. 아래 두 번째 표가 내 스택이에요."
        : "어느 경로로 진행할지는 첫 수업에서 함께 정해요. 두 표를 모두 참고해 두세요.";

  return (
    <div className="flex flex-col gap-5">
      <p className="nb-flat bg-[var(--nb-yellow)] px-4 py-3 text-sm leading-relaxed">
        {pathSentence}
      </p>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-extrabold tracking-tight">
          브라우저 경로
          {learnerPath === "browser" && (
            <span className="nb-badge ml-2 bg-[var(--nb-lime)] px-2 py-0.5 align-middle text-[11px]">
              내 경로
            </span>
          )}
        </h2>
        <StackTable rows={stack.browser.rows} />
        <ul className="flex flex-col gap-1.5">
          <CostLine label="최소" text={stack.browser.minimum} />
          <CostLine label="권장" text={stack.browser.recommended} />
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-extrabold tracking-tight">
          에이전트·서버 경로
          {learnerPath === "agent" && (
            <span className="nb-badge ml-2 bg-[var(--nb-lime)] px-2 py-0.5 align-middle text-[11px]">
              내 경로
            </span>
          )}
        </h2>
        <StackTable rows={stack.agent.rows} />
        <ul className="flex flex-col gap-1.5">
          <CostLine label="최소" text={stack.agent.minimum} />
          <CostLine label="권장" text={stack.agent.recommended} />
          <CostLine label="풀세트" text={stack.agent.full} />
        </ul>
      </section>

      <p className="text-xs leading-relaxed text-gray-600">
        <span className="font-bold">{stack.dated} 기준.</span> {stack.note}
      </p>
    </div>
  );
}
