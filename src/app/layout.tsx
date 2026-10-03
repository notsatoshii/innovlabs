import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "@/styles/fonts/jua.css";
import "./globals.css";
import { HeaderAction } from "@/components/HeaderAction";
import { Logo } from "@/components/Logo";
import { getSession } from "@/lib/auth/session";

// Pretendard Variable, self-hosted through next/font/local (review P1-22):
// the two woff2 files the marketing site already ships, split by script.
// Next emits the @font-face rules inside the app's own CSS, preloads both
// files, and serves them from /_next/static under a hashed, immutable URL, so
// first paint no longer waits on a stylesheet from a third-party CDN.
// adjustFontFallback is off on purpose: the fallback stack in globals.css is
// the same system stack as before, with no metric-adjusted Arial inserted.
const pretendardLatin = localFont({
  src: "./fonts/PretendardVariable-latin.woff2",
  weight: "45 920",
  style: "normal",
  display: "swap",
  variable: "--font-pretendard-latin",
  adjustFontFallback: false,
});
const pretendardHangul = localFont({
  src: "./fonts/PretendardVariable-hangul.woff2",
  weight: "45 920",
  style: "normal",
  display: "swap",
  variable: "--font-pretendard-hangul",
  adjustFontFallback: false,
});

const APP_ORIGIN = "https://app.innovlab.me";
// The marketing site's Korean share image (1200x630), reused so a KakaoTalk
// share of an app link shows more than a bare title (review P2-36).
const OG_IMAGE = { url: "https://innovlab.me/og-ko.png", width: 1200, height: 630 };

const SITE_TITLE = "InnovLabs — 10분 AI 업무 진단";
const SITE_DESCRIPTION =
  "지금 하시는 일을 10분만 알려주세요. 맞는 AI 워크플로우 트랙과 그 영역에 매주 쓰는 시간을 바로 보여드립니다. 무료, 카드 등록 없음.";

export const metadata: Metadata = {
  metadataBase: new URL(APP_ORIGIN),
  title: {
    default: SITE_TITLE,
    template: "%s | InnovLabs",
  },
  description: SITE_DESCRIPTION,
  applicationName: "InnovLabs",
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: "InnovLabs",
    url: "/",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [OG_IMAGE.url],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#F6F3FB",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Signed-in state only decides the header link; route guards live in
  // src/app/app/layout.tsx.
  const session = await getSession();

  return (
    <html
      lang="ko"
      className={`${pretendardLatin.variable} ${pretendardHangul.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {/* Skip link (review A29): hidden until focused, then a sun block. */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:border focus:border-[var(--nb-line)] focus:bg-[var(--nb-yellow)] focus:px-4 focus:py-3 focus:text-sm focus:font-bold"
        >
          본문으로 건너뛰기
        </a>
        {/* Height is --site-header-h (globals.css); page sticky bars sit below it. */}
        <header className="sticky top-0 z-40 border-b border-white/80 bg-[rgba(246,243,251,0.72)] backdrop-blur-xl backdrop-saturate-150">
          <div className="mx-auto flex w-full max-w-lg items-center justify-between px-6 py-3">
            <Logo />
            <HeaderAction
              signedIn={Boolean(session)}
              href={session ? (session.profile ? "/app/profile" : "/start?reason=no_profile") : "/login"}
            />
          </div>
        </header>
        {/* Skip-link target. Flex column so each page's main keeps flex-1. */}
        <div id="main" tabIndex={-1} className="flex flex-1 flex-col outline-none">
          {children}
        </div>
      </body>
    </html>
  );
}
