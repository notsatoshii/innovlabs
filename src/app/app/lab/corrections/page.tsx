// /app/lab/corrections: the correction log (SP-W2-CL, Week 2 lab Part 4 and
// the Week 2 assignment; reused for the rest of the course). Server
// component: lists the learner's own correction_logged events (read through
// RLS), newest first and grouped by harness, under a form to add a line.
// A correction is always logged against a harness the learner has saved.
// Opened from the Week 3 dry run (?from=week3, "수정 기록 남기러 가기" on the
// blueprint): the Week 3 header and intro, the form on the harness the dry
// run used, and a way back to the blueprint once a line is saved, as the
// time log does for ?from=baseline.

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { supabaseServer } from "@/lib/supabase/server";
import { formatDate } from "@/components/profile/display";
import { pendingRuleCount, type CorrectionLine } from "@/components/lab/rules";
import CorrectionForm from "@/components/lab/corrections/CorrectionForm";
import MarkWrittenButton from "@/components/lab/corrections/MarkWrittenButton";
import { Week2LabHeader } from "@/components/lab/harness/Week2LabHeader";
import { Week3LabHeader } from "@/components/lab/Week3LabHeader";
import { byFirstSaved, loadCorrectionLines, loadSavedHarnesses } from "@/components/lab/harness/queries";
import { blueprintFromSaved, dryRunHarnessId } from "@/components/lab/rules-week3";
import { EVENT_TYPES } from "@/lib/profile/events";

export const metadata: Metadata = { title: "수정 기록" };

const BADGE = "nb-badge px-2 py-0.5 text-[11px]";

export default async function CorrectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ h?: string | string[]; from?: string | string[] }>;
}) {
  const session = await getSession();
  // The /app layout already guarantees a profile; this keeps the types honest.
  if (!session?.profile) redirect("/start");
  const { user, profile } = session;
  // The 12-week course is the employee path (phase-2 P8).
  if (profile.path !== "employee") redirect("/app/courses");

  const { h, from } = await searchParams;
  const fromWeek3 = from === "week3";

  const supabase = await supabaseServer();
  const [savedList, lines, blueprintResult] = await Promise.all([
    loadSavedHarnesses(supabase, user.id),
    loadCorrectionLines(supabase, user.id),
    // From the dry run: the newest blueprint names the harness it ran.
    fromWeek3
      ? supabase
          .from("profile_event")
          .select("data")
          .eq("user_id", user.id)
          .eq("type", EVENT_TYPES.blueprint_submitted)
          .order("created_at", { ascending: false })
          .order("id", { ascending: false })
          .limit(1)
          .maybeSingle()
      : null,
  ]);
  if (blueprintResult?.error) console.error("corrections blueprint read failed:", blueprintResult.error.message);

  // First-saved first, the workspace lab's order ("첫 번째 하네스" on top).
  const harnesses = byFirstSaved(savedList).map((saved) => ({
    id: saved.item.id,
    name: saved.item.name,
    doc_type: saved.item.doc_type,
  }));
  const harnessById = new Map(harnesses.map((harness) => [harness.id, harness]));

  // Which harness the form opens on:
  // - `?h=<id>` (from the editor's "수정 기록 남기러 가기");
  // - from the dry run, the harness linked to the AI stage before the newest
  //   blueprint's first checkpoint, else the first-saved one (the workspace
  //   lab's "첫 번째 하네스");
  // - otherwise the most recently saved one (Week 2: the one just worked on).
  let initialHarnessId = savedList[0]?.item.id ?? "";
  if (typeof h === "string" && harnessById.has(h)) {
    initialHarnessId = h;
  } else if (fromWeek3) {
    const blueprint = blueprintFromSaved((blueprintResult?.data as { data?: unknown } | null)?.data);
    initialHarnessId =
      (blueprint ? dryRunHarnessId(blueprint, new Set(harnessById.keys())) : null) ?? harnesses[0]?.id ?? "";
  }

  // Lines are newest first, so groups come out in order of their newest line.
  const groups = new Map<string, CorrectionLine[]>();
  for (const line of lines) {
    const group = groups.get(line.harness_id);
    if (group) group.push(line);
    else groups.set(line.harness_id, [line]);
  }
  const pending = pendingRuleCount(lines);

  const confidential = (
    <p className="font-bold text-[var(--nb-ink)]">회사 밖으로 나가면 안 되는 내용은 가리고 적어 주세요.</p>
  );

  return (
    <main className="flex w-full flex-col gap-5">
      {fromWeek3 ? (
        <Week3LabHeader title="수정 기록">
          <p>
            시험 실행의 확인 지점에서 고친 것을 한 줄씩 남겨요. 원래 문장과 고친 문장을 적고, 다음에도
            되풀이될지 표시해 두면 돼요.
          </p>
          {confidential}
        </Week3LabHeader>
      ) : (
        <Week2LabHeader title="수정 기록">
          <p>
            하네스로 나온 결과를 보내기 전에 손볼 때마다 한 줄씩 남겨요. 원래 문장과 고친 문장을 적고,
            다음에도 되풀이될지 표시해 두면 돼요.
          </p>
          {confidential}
        </Week2LabHeader>
      )}

      {harnesses.length > 0 ? (
        <CorrectionForm
          harnesses={harnesses}
          initialHarnessId={initialHarnessId}
          returnTo={fromWeek3 ? { href: "/app/lab/blueprint", label: "설계도로 돌아가기" } : undefined}
        />
      ) : (
        <section className="nb-card flex flex-col gap-3 px-4 py-4">
          <p className="text-[15px] font-extrabold">수정 기록은 저장한 하네스에 남겨요.</p>
          <p className="text-sm leading-relaxed text-gray-700">
            먼저 하네스를 하나 저장해 주세요. 그 하네스로 돌려 본 결과를 고치면서 여기에 적으면 돼요.
          </p>
          <Link
            href="/app/lab/harness"
            className="nb-btn nb-btn-primary block px-4 py-3 text-center text-[15px]"
          >
            하네스 라이브러리 열기
          </Link>
        </section>
      )}

      <section className="nb-card px-4 py-4">
        <h2 className="text-base font-extrabold">
          지금까지 남긴 수정 기록{" "}
          <span className="text-sm font-bold text-gray-600">{lines.length}건</span>
        </h2>
        <p className="mt-2 text-sm font-bold leading-relaxed">
          고칠 때마다 규칙으로 적어 둘 거리가 하나씩 생겨요.
        </p>
        {lines.length === 0 ? (
          <p className="mt-2 text-sm text-gray-600">아직 기록이 없어요.</p>
        ) : (
          <p className="nb-flat mt-3 bg-[var(--background)] px-3 py-2.5 text-sm leading-relaxed">
            {pending > 0 ? (
              <>
                또 고치게 될 텐데 아직 규칙으로 안 적은 내용이 <b>{pending}건</b> 있어요.
              </>
            ) : (
              "또 고치게 될 내용은 모두 규칙으로 적어 두었어요."
            )}
          </p>
        )}

        {[...groups.entries()].map(([harnessId, group]) => {
          const harness = harnessById.get(harnessId);
          return (
            <div key={harnessId} className="mt-5">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="min-w-0 flex-1 break-words text-[15px] font-extrabold leading-snug">
                  {harness?.name ?? "이름을 찾지 못한 하네스"}
                </h3>
                <span className="shrink-0 text-xs font-bold text-gray-600">{group.length}건</span>
              </div>
              {harness?.doc_type && harness.doc_type !== harness.name && (
                <p className="mt-0.5 break-words text-xs text-gray-600">{harness.doc_type}</p>
              )}
              <ol className="mt-2 flex flex-col gap-2.5">
                {group.map((line) => {
                  const open = line.recurring && !line.rule_written;
                  const firstOn = formatDate(line.created_at) ?? "";
                  // The same correction made again: say how often, and when last (if on another day).
                  const lastOn = line.times > 1 ? formatDate(line.last_at) : null;
                  return (
                    <li key={line.id} className="nb-flat px-3 py-3">
                      <dl className="flex flex-col gap-2 text-[15px] leading-relaxed">
                        <div>
                          <dt className="text-xs font-bold text-gray-600">원래 문장</dt>
                          <dd className="whitespace-pre-wrap break-words text-gray-700">{line.original}</dd>
                        </div>
                        <div>
                          <dt className="text-xs font-bold text-gray-600">고친 문장</dt>
                          <dd className="whitespace-pre-wrap break-words font-semibold">{line.changed_to}</dd>
                        </div>
                      </dl>
                      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                        <span
                          className={`${BADGE} ${line.recurring ? "bg-[var(--nb-yellow)]" : "bg-[var(--nb-paper)]"}`}
                        >
                          {line.recurring ? "또 고치게 될 내용" : "이번뿐"}
                        </span>
                        {line.rule_written ? (
                          <span className={`${BADGE} bg-[var(--nb-lime)]`}>규칙으로 적음</span>
                        ) : (
                          line.recurring && <span className={`${BADGE} bg-[var(--nb-paper)]`}>규칙으로 안 적음</span>
                        )}
                        {line.times > 1 && (
                          <span className={`${BADGE} bg-[var(--nb-paper)]`}>{line.times}번 고침</span>
                        )}
                        <span className="text-xs text-gray-600">
                          {firstOn}
                          {lastOn && lastOn !== firstOn && ` · 마지막 ${lastOn}`}
                        </span>
                      </div>
                      {open && (
                        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
                          {harness && (
                            <Link
                              href={`/app/lab/harness?h=${encodeURIComponent(harnessId)}&from=${line.id}`}
                              className="nb-btn nb-btn-primary px-4 py-2.5 text-sm"
                            >
                              규칙으로 추가하기
                            </Link>
                          )}
                          <MarkWrittenButton
                            correction={{
                              harness_id: line.harness_id,
                              original: line.original,
                              changed_to: line.changed_to,
                              recurring: line.recurring,
                              rule_written: line.rule_written,
                            }}
                          />
                        </div>
                      )}
                    </li>
                  );
                })}
              </ol>
            </div>
          );
        })}

        {lines.length > 0 && (
          <p className="mt-4 text-xs leading-relaxed text-gray-600">
            한번 남긴 기록은 고치거나 지울 수 없어요. 잘못 적었다면 새로 한 줄 더 남겨 주세요.
          </p>
        )}
      </section>
    </main>
  );
}
