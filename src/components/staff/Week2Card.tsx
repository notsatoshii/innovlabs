// Week 2 on /staff/learner/[userId] (phase-2c, Staff views): per harness the
// name, document type, latest version and date, rule count, whether it has
// an example, and its correction and pending counts. Counts and labels only
// on the screen (the room rule, D4): the full text sits behind a closed
// "전체 내용 보기", and the example is not fetched until that is opened.
// Server-safe.

import { fmtDate } from "./format";
import HarnessExample from "./HarnessExample";
import type { Week2Data } from "./learner-weeks";
import { Card, Chip, Empty } from "./ui";

function Part({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-extrabold text-gray-500">{label}</p>
      <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">{children}</div>
    </div>
  );
}

export default function Week2Card({ data }: { data: Week2Data }) {
  const { harnesses } = data;
  return (
    <Card
      title="2주차 · 하네스"
      aside={`하네스 ${harnesses.length}개 · 수정 기록 ${data.corrections}건${
        data.pending > 0 ? ` · 규칙으로 옮길 반복 수정 ${data.pending}건` : ""
      }`}
    >
      {data.failed && (
        <p role="alert" className="mb-3 text-sm text-red-600">
          2주차 기록을 다 불러오지 못했어요. 새로고침해 주세요.
        </p>
      )}
      {data.truncated && <p className="mb-3 text-xs text-gray-500">기록이 많아 일부만 불러왔어요.</p>}
      {harnesses.length === 0 ? (
        <Empty>아직 저장한 하네스가 없어요.</Empty>
      ) : (
        <ul className="flex flex-col gap-3">
          {harnesses.map((h) => (
            <li key={h.harness_id} className="nb-flat px-4 py-3">
              <p className="break-words text-sm font-extrabold">{h.name}</p>
              {h.doc_type && <p className="break-words text-xs text-gray-700">{h.doc_type}</p>}
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Chip tone="info">
                  {h.version}번째 버전 · {fmtDate(h.saved_at)}
                </Chip>
                <Chip tone={h.rules.length > 0 ? "done" : "muted"}>규칙 {h.rules.length}개</Chip>
                <Chip tone={h.has_example ? "done" : "warn"}>{h.has_example ? "예시 있음" : "예시 없음"}</Chip>
                <Chip tone={h.corrections > 0 ? "done" : "muted"}>수정 기록 {h.corrections}건</Chip>
                {h.pending > 0 && <Chip tone="warn">규칙으로 옮길 반복 수정 {h.pending}건</Chip>}
                {h.template_id && <Chip tone="muted">템플릿 {h.template_id}에서 시작</Chip>}
              </div>
              <details className="mt-3">
                <summary className="cursor-pointer text-xs font-semibold underline underline-offset-4">
                  전체 내용 보기
                </summary>
                <div className="mt-3 flex flex-col gap-3 border-t border-[var(--nb-line)] pt-3">
                  <Part label="1. 역할">{h.role || "적지 않았어요"}</Part>
                  <Part label="2. 맥락">{h.context || "적지 않았어요"}</Part>
                  <Part label="3. 형식">{h.format || "적지 않았어요"}</Part>
                  <Part label="4. 규칙">
                    {h.rules.length > 0 ? (
                      <ol className="list-decimal whitespace-normal pl-5">
                        {h.rules.map((rule, index) => (
                          <li key={index}>{rule}</li>
                        ))}
                      </ol>
                    ) : (
                      "적지 않았어요"
                    )}
                  </Part>
                  <div>
                    <p className="text-xs font-extrabold text-gray-500">5. 예시</p>
                    {h.has_example ? (
                      <HarnessExample eventId={h.event_id} />
                    ) : (
                      <p className="text-sm text-gray-500">예시가 비어 있어요.</p>
                    )}
                  </div>
                  <Part label="6. 예외 처리">{h.fallbacks || "적지 않았어요"}</Part>
                  <p className="text-xs text-gray-500">모두 {h.saves}번 저장했어요.</p>
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}
      {data.orphanCorrections > 0 && (
        <p className="mt-3 text-xs text-gray-500">
          어느 하네스의 것인지 찾지 못한 수정 기록이 {data.orphanCorrections}건 있어요.
        </p>
      )}
    </Card>
  );
}
