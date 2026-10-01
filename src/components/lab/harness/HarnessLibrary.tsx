"use client";

// The harness library (SP-W2-HC): every harness the learner is working on,
// kept in one autosaved draft (artifact_draft kind "harness"). Two views on
// one page: the list, and the editor for one harness at `?h=<id>`. Switching
// views only changes the query string (native history, which the Next router
// follows), so the draft store stays mounted and nothing is refetched.

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { HARNESS_LIMITS, type HarnessDraft, type HarnessDraftItem } from "@/lib/courses/types";
import { formatDate } from "@/components/profile/display";
import { SaveStatus } from "../inputs";
import { emptyHarness, newId, sameHarness, writtenRules } from "../rules";
import { useDraft } from "../useDraft";
import HarnessEditor from "./HarnessEditor";
import type { RulePrefill, SavedView } from "./types";

export default function HarnessLibrary({
  initialDraft,
  saved,
  prefill,
}: {
  initialDraft: HarnessDraft;
  /** Latest saved version by harness id, as the server page read it. */
  saved: Record<string, SavedView>;
  prefill: RulePrefill | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { draft, setDraft, saveState, saveProblem, retry } = useDraft<HarnessDraft>("harness", initialDraft);
  // Versions saved in this visit, shown at once without waiting for the page to refresh.
  const [savedNow, setSavedNow] = useState<Record<string, SavedView>>({});

  const openId = searchParams.get("h");
  const openItem = openId ? (draft.items.find((item) => item.id === openId) ?? null) : null;
  const full = draft.items.length >= HARNESS_LIMITS.maxHarnesses;

  const savedFor = (id: string): SavedView | null => {
    const fromPage = saved[id];
    const fromVisit = savedNow[id];
    if (fromVisit && (!fromPage || fromVisit.version >= fromPage.version)) return fromVisit;
    return fromPage ?? null;
  };

  const show = (query: string) => {
    window.history.pushState(null, "", query || window.location.pathname);
    window.scrollTo({ top: 0 });
  };
  const open = (id: string) => show(`?h=${encodeURIComponent(id)}`);

  const addHarness = () => {
    if (full) return;
    const id = newId("h");
    setDraft((d) => ({ ...d, items: [...d.items, emptyHarness(id)] }));
    open(id);
  };

  const updateItem = (id: string, change: (item: HarnessDraftItem) => HarnessDraftItem) => {
    setDraft((d) => ({ ...d, items: d.items.map((item) => (item.id === id ? change(item) : item)) }));
  };

  const removeItem = (item: HarnessDraftItem) => {
    const label = item.name.trim() || "이름 없는 하네스";
    if (!window.confirm(`${label}\n이 하네스를 지울까요? 적은 내용이 모두 사라져요.`)) return;
    setDraft((d) => ({ ...d, items: d.items.filter((other) => other.id !== item.id) }));
    show("");
  };

  const status = <SaveStatus state={saveState} problem={saveProblem} onRetry={retry} />;

  if (openItem) {
    const prefillHere =
      prefill &&
      prefill.correction.harness_id === openItem.id &&
      searchParams.get("from") === String(prefill.eventId)
        ? prefill
        : null;

    const closePrefill = (added: boolean) => {
      // Drop `from` so a reload does not offer the same sentence again.
      window.history.replaceState(null, "", `?h=${encodeURIComponent(openItem.id)}`);
      if (!added || !prefillHere || prefillHere.correction.rule_written) return;
      // The correction is a rule now: log the same line again as written
      // (append-only; the log shows the two as one). If this fails, the
      // learner can still mark it from the correction log.
      void fetch("/api/artifacts/correction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...prefillHere.correction, rule_written: true }),
      }).catch(() => undefined);
    };

    return (
      <HarnessEditor
        key={openItem.id}
        item={openItem}
        onChange={(change) => updateItem(openItem.id, change)}
        saved={savedFor(openItem.id)}
        onSaved={(version, item) => {
          setSavedNow((now) => ({
            ...now,
            [item.id]: { version, savedOn: formatDate(new Date().toISOString()) ?? "오늘", item },
          }));
          router.refresh(); // the 나의 AI 교육 card and the correction log's harness list
        }}
        onBack={() => show("")}
        onRemove={() => removeItem(openItem)}
        prefill={prefillHere}
        onPrefillClosed={closePrefill}
        saveStatus={status}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-extrabold">
          내 하네스{" "}
          <span className="text-sm font-bold text-gray-600">
            {draft.items.length} / {HARNESS_LIMITS.maxHarnesses}
          </span>
        </h2>
        {status}
      </div>

      {draft.items.length === 0 ? (
        <div className="nb-flat px-4 py-4 text-sm leading-relaxed">
          <p className="font-bold">아직 만든 하네스가 없어요.</p>
          <p className="mt-1 text-gray-700">
            후보 1에서 만드는 문서부터 시작해 보세요. 여섯 부분을 차례로 채우면 한 장이 돼요.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {draft.items.map((item) => {
            const version = savedFor(item.id);
            const edited = version !== null && !sameHarness(item, version.item);
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => open(item.id)}
                  className="nb-card flex w-full flex-col gap-1.5 px-4 py-3.5 text-left"
                >
                  <span className="flex items-start justify-between gap-2">
                    <span className="min-w-0 flex-1 break-words text-base font-extrabold leading-snug">
                      {item.name.trim() || "이름 없는 하네스"}
                    </span>
                    <span
                      className={`nb-badge shrink-0 px-2 py-0.5 text-[11px] ${
                        version ? "bg-[var(--nb-lime)]" : "bg-[var(--nb-paper)]"
                      }`}
                    >
                      {version ? `v${version.version} 저장됨` : "아직 저장 전"}
                    </span>
                  </span>
                  <span className="break-words text-sm text-gray-700">
                    {item.doc_type.trim() || "문서 종류를 아직 적지 않았어요"} · 규칙{" "}
                    {writtenRules(item).length} / {HARNESS_LIMITS.maxRules}
                  </span>
                  {version && (
                    <span className="text-xs text-gray-600">
                      {version.savedOn} 저장{edited && " · 저장한 뒤에 고친 내용이 있어요"}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <button
        type="button"
        onClick={addHarness}
        disabled={full}
        className="nb-btn nb-btn-primary w-full px-4 py-3.5 text-[15px]"
      >
        + 새 하네스
      </button>
      {full && (
        <p className="text-xs leading-relaxed text-gray-600">
          하네스는 {HARNESS_LIMITS.maxHarnesses}개까지 만들 수 있어요. 자주 쓰는 문서부터 다듬어 보세요.
        </p>
      )}

      <Link
        href="/app/lab/corrections"
        className="nb-btn nb-btn-white block px-4 py-3 text-center text-[15px]"
      >
        수정 기록 열기
      </Link>
    </div>
  );
}
