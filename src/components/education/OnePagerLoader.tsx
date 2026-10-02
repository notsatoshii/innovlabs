"use client";

// Used by the 나의 AI 교육 tab when the profile has no cached one_pager yet:
// POSTs /api/one-pager (which generates and caches it), showing the same
// loading and error copy as /report, then renders the report inline with
// the waitlist CTA. The tab is already auth-gated by the /app layout, so no
// sign-in check is needed here.

import { useEffect, useState } from "react";
import type { OnePager } from "@/lib/onepager/generate";
import { parseOnePagerResponse } from "@/lib/onepager/types";
import OnePagerView from "@/components/report/OnePagerView";
import WaitlistCta from "@/components/report/WaitlistCta";
import GeneratingScreen from "@/components/report/GeneratingScreen";
import ReportError from "@/components/report/ReportError";

type State =
  | { status: "loading" }
  | { status: "error"; code: string; message?: string }
  | { status: "ready"; trackName: string; onePager: OnePager };

export default function OnePagerLoader() {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let res: Response;
      try {
        res = await fetch("/api/one-pager", { method: "POST" });
      } catch {
        if (!cancelled) setState({ status: "error", code: "network" });
        return;
      }
      if (cancelled) return;
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setState({
          status: "error",
          code: body.error ?? String(res.status),
          message: typeof body.message === "string" ? body.message : undefined,
        });
        return;
      }
      // Same shape check as /report (review A30).
      const ready = parseOnePagerResponse(await res.json().catch(() => null));
      if (cancelled) return;
      setState(ready ? { status: "ready", ...ready } : { status: "error", code: "bad_response" });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === "loading") return <GeneratingScreen />;
  if (state.status === "error") return <ReportError code={state.code} message={state.message} />;

  return (
    <div className="animate-fade-slide-in">
      <OnePagerView
        trackName={state.trackName}
        onePager={state.onePager}
        headingLevel="h2"
      />
      <WaitlistCta trackName={state.trackName} />
    </div>
  );
}
