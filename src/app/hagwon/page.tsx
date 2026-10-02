import type { Metadata } from "next";
import { HagwonFlow } from "@/components/hagwon/survey/HagwonFlow";

export const metadata: Metadata = { title: "학원 AI 진단" };

// 학원 path entry: the 12-question survey (schema v0.2). No query params:
// this path has no A/B variant and no org code.
export default function HagwonPage() {
  return <HagwonFlow />;
}
