import type { Metadata } from "next";
import { PlaceholderCard } from "@/components/app/PlaceholderCard";

export const metadata: Metadata = { title: "커뮤니티" };

export default function CommunityPage() {
  return (
    <PlaceholderCard
      title="커뮤니티"
      body="함께 배우는 수강생들과 이야기를 나누는 공간이 이 자리에 생겨요."
    />
  );
}
