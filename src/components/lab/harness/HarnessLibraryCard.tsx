// 하네스 라이브러리 line for the 학습 데이터 section of the 나의 AI 교육 tab:
// how many harnesses the learner has saved and how many corrections they have
// logged, and the way to the library. Async server component (like
// TimeLogCard) so the reads stay out of the page body; it reads through the
// learner's own client (own events only, by RLS). Markup mirrors the page's
// DataCard.

import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { countSavedHarnesses, loadCorrectionLines } from "./queries";

export default async function HarnessLibraryCard({ userId }: { userId: string }) {
  const supabase = await supabaseServer();
  const [harnesses, lines] = await Promise.all([
    countSavedHarnesses(supabase, userId),
    loadCorrectionLines(supabase, userId),
  ]);
  const corrections = lines.length;
  const any = harnesses > 0 || corrections > 0;

  return (
    <div className="nb-flat px-4 py-3">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <h3 className="text-sm font-extrabold">하네스 라이브러리</h3>
        <span
          className={`nb-badge px-2 text-[11px] font-bold ${
            any ? "bg-[var(--nb-lime)]" : "bg-[var(--nb-paper)]"
          }`}
        >
          {any ? "기록됨" : "아직 없음"}
        </span>
      </div>
      <p className={`text-sm ${any ? "text-gray-700" : "text-gray-500"}`}>
        {any ? `저장한 하네스 ${harnesses}개 · 수정 기록 ${corrections}건` : "2주차부터 쌓여요."}
      </p>
      <Link
        href="/app/lab/harness"
        className="mt-2 inline-block py-1 text-sm font-bold underline underline-offset-4"
      >
        {any ? "하네스 라이브러리 열기" : "하네스 만들러 가기"}
      </Link>
    </div>
  );
}
