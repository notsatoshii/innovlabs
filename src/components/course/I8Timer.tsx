"use client";

// I8 타이머: the week's timer quest. In O1 the timer itself is the lab's time
// log (server timestamps, evidence upload): 퀘스트 받기 records the quest,
// then 시간 기록 열기 saves the mission's progress and opens the time log in
// the same tab. Minutes never pay XP; a saved entry with evidence may (P11).

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { I8Timer as I8 } from "@/lib/course/types";
import { Rich } from "./Blocks";
import { NetLine, amountText, useAward, usePlayer, type InteractionProps } from "./context";

const METHOD_LABEL: Record<I8["method"], string> = {
  before: "평소 방식",
  harness: "하네스",
  pipeline: "파이프라인",
};

export function I8Timer({ i, onDone }: InteractionProps<I8>) {
  const router = useRouter();
  const { saveProgress } = usePlayer();
  const { step, failed, retry } = useAward();
  const [taken, setTaken] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [paid, setPaid] = useState<number | null>(null);

  const take = async () => {
    setTaken(true);
    onDone();
    // A paying timer is verified against a saved time log entry with
    // evidence, which does not exist yet here; only a free one is recorded now.
    if (i.xp) return;
    const res = await step(i.id);
    if (res) setPaid(res.amount);
  };

  const open = async () => {
    setLeaving(true);
    await saveProgress();
    router.push(`/app/lab/time-log?method=${i.method}`);
  };

  return (
    <div className="c-quest">
      <div className="flex items-baseline justify-between gap-2">
        <b className="c-display text-[18px]">퀘스트 · {METHOD_LABEL[i.method]}</b>
        <span className="c-small">이번 주</span>
      </div>
      <div className="text-[15px] font-bold">
        <Rich text={i.label} />
      </div>
      {!taken ? (
        <button type="button" className="nb-btn nb-btn-white c-btn" onClick={() => void take()}>
          퀘스트 받기
        </button>
      ) : (
        <>
          <p className="c-okline" role="status">{`퀘스트를 받았어요.${amountText(paid)}`}</p>
          <p className="c-small">
            시작, 끝, 끊긴 횟수를 시간 기록에 남겨요. 결과물 스크린샷은 회사 밖으로 나가면 안 되는
            부분을 가리고 올리세요.
          </p>
          <button
            type="button"
            className="c-sbtn is-pri"
            disabled={leaving}
            onClick={() => void open()}
          >
            {leaving ? "여는 중…" : "시간 기록 열기"}
          </button>
        </>
      )}
      <NetLine failed={failed} onRetry={retry} />
    </div>
  );
}
