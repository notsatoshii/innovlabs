"use client";

// Error body for a failed POST /api/one-pager. Content only; the caller
// supplies the wrapper. The route sends a Korean `message` beside each error
// code; it is shown as-is when present. Retry reloads the page, which re-runs
// the fetch on both /report and the 나의 AI 교육 tab. No retry button when the
// attempt limit is reached: reloading cannot help.

const NO_RETRY = new Set(["attempt_limit"]);

export default function ReportError({ code, message }: { code: string; message?: string }) {
  const fallback =
    code === "generation_unavailable"
      ? "리포트를 만드는 기능을 지금은 쓸 수 없어요. 조금 뒤에 다시 들어와 주세요."
      : "잠시 연결이 원활하지 않았어요. 조금 뒤에 다시 시도해 주세요.";
  return (
    <div>
      <h1 className="mb-3 text-xl font-extrabold">리포트를 불러오지 못했어요</h1>
      <p className="mb-8 text-sm leading-relaxed text-gray-500">{message?.trim() || fallback}</p>
      {!NO_RETRY.has(code) && (
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="nb-btn nb-btn-primary w-full py-3.5 text-[15px]"
        >
          다시 시도하기
        </button>
      )}
    </div>
  );
}
