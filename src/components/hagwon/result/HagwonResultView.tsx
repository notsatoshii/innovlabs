// Full result for the 학원 path, schema v0.2 §Result page, in the schema's
// order: (1) 주 N–M시간 with the two biggest buckets, (2) 추천 모듈,
// (3) 먼저 준비할 것, (4) 다루지 않는 것, (5) 시작 세션, (6) the CTA. Pure
// rendering of a HagwonResult (recomputed from the stored answers by the
// caller); the CTA is a client node the page supplies. Copy is 합니다체; the
// hours line stays a range with its caveat, never a promise.

import type { HagwonResult, ModuleId } from "@/lib/hagwon/types";
import {
  HOURS_BUCKET_LABEL,
  MODULES,
  OUT_OF_SCOPE,
  PREP_LABEL,
  RESULT_COPY,
} from "@/lib/hagwon/modules";
import { SectionTitle } from "@/components/profile/display";

interface Props {
  result: HagwonResult;
  displayName: string;
  /** Q4 included 출결·결제 정리: add the "use your program's feature" line. */
  attendanceBilling: boolean;
  /** Section 6: the consult CTA (client component), supplied by the page. */
  cta: React.ReactNode;
}

export default function HagwonResultView({ result, displayName, attendanceBilling, cta }: Props) {
  const { hours } = result;
  const pastExam = result.modules.find((m) => m.id === "M4")?.pastExamAnalysis === true;

  return (
    <div className="flex flex-col gap-5">
      {/* 1. 주 N–M시간 */}
      <section className="nb-card px-5 py-5">
        <p className="mb-1 text-xs font-bold text-gray-500">{displayName}님 학원의 자동화 대상</p>
        <p className="text-3xl font-extrabold tracking-tight">
          주 {hours.low}–{hours.high}시간
        </p>
        <p className="mt-2 text-sm leading-relaxed text-gray-700">
          {RESULT_COPY.hoursLine(hours.low, hours.high)}
        </p>
        {hours.top.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-xs font-bold text-gray-500">시간이 가장 많이 드는 일</p>
            <ol className="flex flex-col gap-2">
              {hours.top.map((key, index) => (
                <li key={key} className="nb-flat flex items-center gap-3 px-3 py-2.5">
                  <span className="nb-badge shrink-0 bg-[var(--nb-yellow)] px-2 text-xs font-extrabold">
                    {index + 1}
                  </span>
                  <span className="text-sm leading-snug">{HOURS_BUCKET_LABEL[key]}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
        {result.reliabilityFlag && (
          <p className="mt-3 text-xs leading-relaxed text-gray-500">
            원장님이 직접 답하신 결과가 아니어서 실제와 차이가 있을 수 있습니다.
          </p>
        )}
      </section>

      {/* 2. 추천 모듈 */}
      <section>
        <SectionTitle>추천 모듈</SectionTitle>
        {result.consultFirst ? (
          <div className="nb-flat px-4 py-4">
            <p className="text-sm leading-relaxed text-gray-700">{RESULT_COPY.consultFirst}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {result.recommended.map((id) => (
              <ModuleCard key={id} id={id} pastExam={id === "M4" && pastExam} />
            ))}
          </div>
        )}
      </section>

      {/* 3. 먼저 준비할 것 (omitted when nothing nearly passed a gate) */}
      {result.prep.length > 0 && (
        <section>
          <SectionTitle>먼저 준비할 것</SectionTitle>
          <div className="flex flex-col gap-3">
            {result.prep.map((item) => (
              <div key={item} className="nb-flat px-4 py-3">
                <h3 className="text-sm font-extrabold">{PREP_LABEL[item].title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-gray-700">
                  {PREP_LABEL[item].body}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 4. 다루지 않는 것 */}
      <section className="nb-flat px-4 py-3">
        <h2 className="text-sm font-extrabold">이번 진단에서 다루지 않는 것</h2>
        <p className="mt-1 text-sm leading-relaxed text-gray-700">{OUT_OF_SCOPE.join(" · ")}</p>
        {attendanceBilling && (
          <p className="mt-2 text-sm leading-relaxed text-gray-700">
            {RESULT_COPY.attendanceBilling}
          </p>
        )}
      </section>

      {/* 5. 원장님 2시간 시작 세션 (Q11 = 안 써봄) */}
      {result.starterSession && (
        <section className="nb-card bg-[var(--nb-yellow)] px-5 py-4">
          <h2 className="text-sm font-extrabold">원장님 2시간 시작 세션</h2>
          <p className="mt-1 text-sm leading-relaxed">{RESULT_COPY.starterSession}</p>
        </section>
      )}

      {/* 6. 30분 진단 상담 */}
      <section className="flex flex-col gap-3">
        {result.successGoal && (
          <div className="nb-flat px-4 py-3">
            <p className="text-xs font-bold text-gray-500">적어 주신 목표</p>
            <p className="mt-1 text-sm leading-relaxed">“{result.successGoal}”</p>
          </div>
        )}
        <p className="text-sm leading-relaxed text-gray-700">
          진단 상담은 30분이며, 위 결과와 적어 주신 목표를 놓고 어디서 시작할지 함께
          정합니다.
        </p>
        {cta}
      </section>
    </div>
  );
}

function ModuleCard({ id, pastExam }: { id: ModuleId; pastExam: boolean }) {
  const info = MODULES[id];
  return (
    <div className="nb-card px-4 py-4">
      <div className="flex items-center gap-2">
        <span className="nb-badge shrink-0 bg-[var(--nb-yellow)] px-2 text-xs font-extrabold">
          {id}
        </span>
        <h3 className="text-[15px] font-extrabold leading-snug">{info.name}</h3>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-gray-700">{info.change}</p>
      {pastExam && <p className="mt-2 text-xs font-bold text-gray-800">기출 분석·모의고사 포함</p>}
    </div>
  );
}
