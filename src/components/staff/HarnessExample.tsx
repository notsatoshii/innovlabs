"use client";

// The learner's example document inside a harness, for staff (phase-2c,
// plan review 2: the room rule). Closed by default, and the text is not
// even fetched until the instructor opens it. Read with the staff member's
// own browser client: the staff select policy on profile_event allows it,
// and only the one JSON path is selected.

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { EVENT_TYPES } from "@/lib/profile/events";

export default function HarnessExample({ eventId }: { eventId: number }) {
  const [state, setState] = useState<"idle" | "loading" | "loaded" | "failed">("idle");
  const [example, setExample] = useState("");

  const load = async () => {
    if (state === "loading" || state === "loaded") return;
    setState("loading");
    const { data, error } = await supabaseBrowser()
      .from("profile_event")
      .select("example:data->parts->>example")
      .eq("id", eventId)
      .eq("type", EVENT_TYPES.harness_saved)
      .maybeSingle();
    if (error) return setState("failed");
    const value = (data as { example: string | null } | null)?.example;
    setExample(typeof value === "string" ? value : "");
    setState("loaded");
  };

  return (
    <details
      className="mt-2"
      onToggle={(e) => {
        if ((e.currentTarget as HTMLDetailsElement).open) void load();
      }}
    >
      <summary className="cursor-pointer text-xs font-semibold underline underline-offset-4">예시 문서 보기</summary>
      <div className="mt-2">
        {state === "loading" && <p className="text-xs text-gray-500">불러오는 중…</p>}
        {state === "failed" && (
          <p role="alert" className="text-xs text-red-600">
            예시를 불러오지 못했어요. 닫았다가 다시 열어 주세요.
          </p>
        )}
        {state === "loaded" &&
          (example.trim() ? (
            <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-md bg-[var(--background)] p-3 text-xs leading-relaxed">
              {example}
            </pre>
          ) : (
            <p className="text-xs text-gray-500">예시가 비어 있어요.</p>
          ))}
      </div>
    </details>
  );
}
