// A locked baseline, read-only (SP-W3-BL). Shown on the baseline page in two
// states: locked and waiting for the instructor (the form stays below it,
// and locking again replaces it), and countersigned, when it is the whole
// page (D3: frozen). Learner screens name no staff member: "강사 확인 완료 ·
// 날짜" (C10). Server-safe.

import type { BaselineSnapshot } from "@/lib/profile/types";
import { formatDate } from "@/components/profile/display";
import { formatMinutes } from "../rules";
import { formatFrequency } from "../rules-week3";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs font-extrabold text-gray-600">{label}</dt>
      <dd className="min-w-0 break-words text-[15px] leading-relaxed">{children}</dd>
    </div>
  );
}

export default function BaselineSummary({
  baseline,
  evidenceUrl,
}: {
  baseline: BaselineSnapshot;
  /** Signed link to the evidence, when there is one and signing worked. */
  evidenceUrl: string | null;
}) {
  const countersigned = Boolean(baseline.countersigned_at);
  const signedOn = formatDate(baseline.signed_at) ?? "이전";
  const loggedOn = formatDate(baseline.time_logged_at);

  return (
    <section className="nb-card flex flex-col gap-4 px-4 py-4">
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-base font-extrabold">{countersigned ? "확정한 기준선" : "지금 확정된 기준선"}</h2>
        <span
          className={`nb-badge shrink-0 px-2 py-0.5 text-[11px] ${
            countersigned ? "bg-[var(--nb-lime)]" : "bg-[var(--nb-yellow)]"
          }`}
        >
          {countersigned ? `강사 확인 완료 · ${formatDate(baseline.countersigned_at) ?? ""}` : "강사 확인 전"}
        </span>
      </div>

      <dl className="flex flex-col gap-3.5">
        <Field label="캡스톤 업무">
          <span className="font-bold">{baseline.task}</span>
        </Field>
        <Field label="지금 하는 방식">
          <ol className="flex list-decimal flex-col gap-0.5 pl-5">
            {baseline.current_method_stages.map((stage, i) => (
              <li key={`${i}-${stage}`}>{stage}</li>
            ))}
          </ol>
        </Field>
        <Field label="한 번 할 때 걸리는 시간">
          <b>{formatMinutes(baseline.minutes_per_instance)}</b>
          {loggedOn && <span className="text-sm text-gray-600"> · {loggedOn}에 남긴 ‘기존 방식’ 기록</span>}
        </Field>
        <Field label="하는 횟수">{formatFrequency(baseline.frequency)}</Field>
        <Field label="‘전’ 증거">
          {baseline.evidence_ref ? (
            evidenceUrl ? (
              <a
                href={evidenceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold underline underline-offset-4"
              >
                완성본 화면 보기
              </a>
            ) : (
              "완성본 화면 있음"
            )
          ) : (
            <span className="text-gray-600">없음</span>
          )}
        </Field>
        <Field label="품질 체크리스트">
          <ul className="flex list-disc flex-col gap-0.5 pl-5">
            {baseline.quality_checklist.map((line, i) => (
              <li key={`${i}-${line}`}>{line}</li>
            ))}
          </ul>
        </Field>
        <Field label="확정한 날">{signedOn}</Field>
      </dl>

      <p className="text-xs leading-relaxed text-gray-600">
        {countersigned
          ? "강사 확인을 받은 기준선이라 이제 바꿀 수 없어요. 11주차에 전과 후 결과물을 이 체크리스트로 똑같이 채점해요."
          : "수업이 끝나기 전에 강사에게 확인을 받으세요. 확인을 받기 전에는 아래에서 고쳐 다시 확정할 수 있어요."}
      </p>
    </section>
  );
}
