import { SurveyFlow } from "@/components/survey/SurveyFlow";
import type { Q5Variant } from "@/lib/survey/types";

// Q5 variant (A/B pilot): ?q5=grid|seq overrides; env default; fallback grid.
export default async function SurveyPage({
  searchParams,
}: PageProps<"/survey">) {
  const params = await searchParams;
  const q5Param = typeof params.q5 === "string" ? params.q5 : null;
  const envDefault = process.env.NEXT_PUBLIC_Q5_VARIANT;
  const q5Variant: Q5Variant =
    q5Param === "grid" || q5Param === "seq"
      ? q5Param
      : envDefault === "seq"
        ? "seq"
        : "grid";
  const orgCode = typeof params.org === "string" && params.org !== "" ? params.org : null;

  return <SurveyFlow q5Variant={q5Variant} orgCode={orgCode} />;
}
