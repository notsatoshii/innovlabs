import type { Metadata } from "next";
import { PlaceholderCard } from "@/components/app/PlaceholderCard";

export const metadata: Metadata = { title: "코스" };

export default function CoursesPage() {
  return (
    <PlaceholderCard
      title="코스"
      body="수강 중인 과정과 주차별 자료가 이 자리에 모여요."
    />
  );
}
