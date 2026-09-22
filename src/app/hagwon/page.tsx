import { HagwonFlow } from "@/components/hagwon/survey/HagwonFlow";

// 학원 path entry: the 12-question survey (schema v0.2). No query params:
// this path has no A/B variant and no org code.
export default function HagwonPage() {
  return <HagwonFlow />;
}
