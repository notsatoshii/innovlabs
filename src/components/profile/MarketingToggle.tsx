"use client";

// 동의 현황: the one consent a learner can change in the app. Optimistic
// checkbox; reverts if the update fails. Logs profile_updated via
// updateProfileFields.

import { useState } from "react";
import { updateProfileFields } from "@/lib/survey/remote";

export default function MarketingToggle({ initial }: { initial: boolean }) {
  const [checked, setChecked] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const toggle = async (next: boolean) => {
    setChecked(next);
    setBusy(true);
    setFailed(false);
    const result = await updateProfileFields({ marketing_consent: next });
    setBusy(false);
    if (!result.ok) {
      setChecked(!next);
      setFailed(true);
    }
  };

  return (
    <div>
      <label className="flex items-start gap-2.5 text-sm text-gray-800">
        <input
          type="checkbox"
          checked={checked}
          disabled={busy}
          onChange={(e) => void toggle(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0"
        />
        <span>
          과정 소식·혜택 안내 수신에 동의합니다.
          <span className="ml-1 text-xs text-gray-400">선택</span>
        </span>
      </label>
      {failed && (
        <p className="mt-2 text-xs text-red-500">
          변경하지 못했어요. 잠시 후 다시 시도해 주세요.
        </p>
      )}
    </div>
  );
}
