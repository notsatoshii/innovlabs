// Placeholder until Phase 1b builds the real resources tab.

import type { Metadata } from "next";
import { PlaceholderCard } from "@/components/app/PlaceholderCard";

export const metadata: Metadata = { title: "리소스" };

export default function ResourcesPage() {
  return (
    <PlaceholderCard
      title="리소스"
      body="도구 라이브러리와 용어집, 이번 분기 도구 스택을 담아 준비하고 있어요."
    />
  );
}
