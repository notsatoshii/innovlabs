import type { Metadata } from "next";

// Per-page title (review A27); the page itself is a client component.
export const metadata: Metadata = { title: "학원 진단 결과" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
