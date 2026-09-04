import type { Metadata, Viewport } from "next";
import "./globals.css";

const SITE_TITLE = "Innovlabs — 10분 AI 업무 진단";
const SITE_DESCRIPTION =
  "지금 하고 있는 업무를 알려주시면, 나에게 맞는 AI 워크플로우 트랙을 찾아드립니다. 10분 무료 진단, 카드 등록 없음.";

export const metadata: Metadata = {
  title: {
    default: SITE_TITLE,
    template: "%s | Innovlabs",
  },
  description: SITE_DESCRIPTION,
  applicationName: "Innovlabs",
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: "Innovlabs",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#fbf4ea",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
