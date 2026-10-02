import type { Metadata } from "next";

// Per-page title (review A27); the page itself is a client component.
export const metadata: Metadata = { title: "사업자 과정 알림 신청" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
