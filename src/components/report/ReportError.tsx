"use client";

// Error body for a failed POST /api/one-pager. Content only; the caller
// supplies the wrapper. Retry reloads the page, which re-runs the fetch on
// both /report and the 나의 AI 교육 tab.

export default function ReportError({ code }: { code: string }) {
  return (
    <div>
      <h1 className="mb-3 text-xl font-extrabold">리포트를 불러오지 못했어요</h1>
      <p className="mb-8 text-sm leading-relaxed text-gray-500">
        {code === "generation_unavailable"
          ? "리포트 생성 기능은 아직 준비 중이에요. 준비되는 대로 이메일로 알려드릴게요."
          : "잠시 연결이 원활하지 않았어요. 조금 뒤에 다시 시도해 주세요."}
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="nb-btn nb-btn-primary w-full py-3.5 text-[15px]"
      >
        다시 시도하기
      </button>
    </div>
  );
}
