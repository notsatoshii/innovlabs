"use client";

// Personalized track one-pager (Phase 3), followed by the waitlist CTA —
// the final step of the v1 funnel. Auth-gated; content comes from
// POST /api/one-pager (cached on the profile after first generation).
// The rendering, loading, error, and CTA pieces live in
// src/components/report/* and are shared with the 나의 AI 교육 tab.

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
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

// A signed-out visitor already has an account (the report exists only after
// registration), so they go to login and come back here, never to /register,
// which would tell them to retake the survey (review P1-18).
const LOGIN_THEN_REPORT = `/login?next=${encodeURIComponent("/report")}`;
const APP_HOME = "/app/education";

/** Vertically centred full-height wrapper for the loading and error states. */
function CenteredMain({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 py-16">
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
        router.replace(LOGIN_THEN_REPORT);
        return;
      }
      let res: Response;
      try {
        res = await fetch("/api/one-pager", { method: "POST" });
      } catch {
        // Offline or the request never left: show the retry screen instead of
        // an endless loading state.
        setState({ status: "error", code: "network" });
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        // Session expired between the check above and the request.
        if (res.status === 401) {
          router.replace(LOGIN_THEN_REPORT);
          return;
        }
        // Signed in but never finished the survey: same door the app layout uses.
        if (res.status === 404 && body.error === "no_profile") {
          router.replace("/start?reason=no_profile");
          return;
        }
        // Non-employee paths (학원) have their result on 나의 AI 교육, not here.
        if (res.status === 409 && body.error === "no_one_pager_for_path") {
          router.replace("/app/education");
          return;
        }
        setState({
          status: "error",
          code: body.error ?? String(res.status),
          message: typeof body.message === "string" ? body.message : undefined,
        });
        return;
      }
      // An ok response without a well-formed report gets the error screen,
      // not a crash in OnePagerView (review A30).
      const ready = parseOnePagerResponse(await res.json().catch(() => null));
      if (!ready) {
        setState({ status: "error", code: "bad_response" });
        return;
      }
      setState({ status: "ready", ...ready });
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
        <ReportError code={state.code} message={state.message} />
        <Link
          href={APP_HOME}
          className="mt-3 block w-full py-2.5 text-center text-sm font-bold text-gray-600 underline underline-offset-4"
        >
          나의 AI 교육으로 가기
        </Link>
      </CenteredMain>
    );
  }

  const { trackName, onePager } = state;

  return (
    <main className="animate-fade-slide-in mx-auto flex w-full max-w-lg flex-1 flex-col px-6 pb-16 pt-10">
      <OnePagerView trackName={trackName} onePager={onePager} />
      <WaitlistCta trackName={trackName} />
      {/* /report sits outside the /app layout, so there is no tab bar here:
          this is the way on into the app (review P1-24). */}
      <Link
        href={APP_HOME}
        className="nb-btn nb-btn-white mt-4 block w-full py-4 text-center text-[15px]"
      >
        나의 AI 교육으로 가기
      </Link>
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
