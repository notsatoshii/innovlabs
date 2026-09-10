"use client";

// Personalized track one-pager (Phase 3), followed by the waitlist CTA —
// the final step of the v1 funnel. Auth-gated; content comes from
// POST /api/one-pager (cached on the profile after first generation).
// The rendering, loading, error, and CTA pieces live in
// src/components/report/* and are shared with the 나의 AI 교육 tab.

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { OnePager } from "@/lib/onepager/generate";
import OnePagerView from "@/components/report/OnePagerView";
import WaitlistCta from "@/components/report/WaitlistCta";
import GeneratingScreen from "@/components/report/GeneratingScreen";
import ReportError from "@/components/report/ReportError";

type State =
  | { status: "loading" }
  | { status: "error"; code: string }
  | { status: "ready"; trackName: string; onePager: OnePager };

/** Vertically centred full-height wrapper for the loading and error states. */
function CenteredMain({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center px-6 py-16">
      {children}
    </main>
  );
}

function ReportFlow() {
  const router = useRouter();
  const params = useSearchParams();
  const [state, setState] = useState<State>({ status: "loading" });

  // Design-QA escape hatch: /report?preview=loading holds the loading screen.
  const previewLoading = params.get("preview") === "loading";

  useEffect(() => {
    if (previewLoading) return;
    (async () => {
      const { data } = await supabaseBrowser().auth.getUser();
      if (!data.user) {
        router.replace("/register");
        return;
      }
      const res = await fetch("/api/one-pager", { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setState({ status: "error", code: body.error ?? String(res.status) });
        return;
      }
      const body = await res.json();
      setState({ status: "ready", trackName: body.trackName, onePager: body.onePager });
    })();
  }, [router, previewLoading]);

  if (state.status === "loading") {
    return (
      <CenteredMain>
        <GeneratingScreen />
      </CenteredMain>
    );
  }

  if (state.status === "error") {
    return (
      <CenteredMain>
        <ReportError code={state.code} />
      </CenteredMain>
    );
  }

  const { trackName, onePager } = state;

  return (
    <main className="animate-fade-slide-in mx-auto flex min-h-dvh w-full max-w-lg flex-col px-6 pb-16 pt-10">
      <OnePagerView trackName={trackName} onePager={onePager} />
      <WaitlistCta trackName={trackName} />
    </main>
  );
}

export default function ReportPage() {
  return (
    <Suspense
      fallback={
        <CenteredMain>
          <GeneratingScreen />
        </CenteredMain>
      }
    >
      <ReportFlow />
    </Suspense>
  );
}
