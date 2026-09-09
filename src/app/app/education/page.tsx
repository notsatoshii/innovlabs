import type { Metadata } from "next";
import { PlaceholderCard } from "@/components/app/PlaceholderCard";

export const metadata: Metadata = { title: "나의 AI 교육" };

export default function EducationPage() {
  return (
    <PlaceholderCard
      title="나의 AI 교육"
      body="진단 결과와 맞춤 리포트, 워크맵, 기준선까지 내 학습 기록을 한눈에 보는 자리예요."
    />
  );
}
