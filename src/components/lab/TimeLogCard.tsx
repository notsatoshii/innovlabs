// 시간 기록 line for the 학습 데이터 section of the 나의 AI 교육 tab: how many
// entries the learner has logged, and the way to the time log. Async server
// component so the count query stays out of the page body; it reads through
// the learner's own client (own events only, by RLS). Markup mirrors the
// page's DataCard.

import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { EVENT_TYPES } from "@/lib/profile/events";

export default async function TimeLogCard({ userId }: { userId: string }) {
  const supabase = await supabaseServer();
  const { count, error } = await supabase
    .from("profile_event")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("type", EVENT_TYPES.time_log_entry);
  if (error) console.error("time log count failed:", error.message);
  const entries = count ?? 0;

  return (
    <div className="nb-flat px-4 py-3">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <h3 className="text-sm font-extrabold">시간 기록</h3>
        <span
          className={`nb-badge px-2 text-[11px] font-bold ${
            entries > 0 ? "bg-[var(--nb-lime)]" : "bg-[var(--nb-paper)]"
          }`}
        >
          {entries > 0 ? "기록됨" : "아직 없음"}
        </span>
      </div>
      <p className={`text-sm ${entries > 0 ? "text-gray-700" : "text-gray-500"}`}>
        {entries > 0 ? `지금까지 ${entries}건 기록했어요.` : "1주차 과제로 후보 1의 시간을 기록해요."}
      </p>
      <Link
        href="/app/lab/time-log"
        className="mt-2 inline-block py-1 text-sm font-bold underline underline-offset-4"
      >
        {entries > 0 ? "시간 기록 열기" : "시간 기록하러 가기"}
      </Link>
    </div>
  );
}
