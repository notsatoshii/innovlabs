"use client";

// Korean error screen for anything thrown while rendering a page or a nested
// layout (CLAUDE.md rule 1; the default is Next's English "Application
// error"). Renders inside the root layout, so the header stays; under /app
// it replaces the tab bar too, which is why it carries its own ways back.
// Errors thrown by the root layout itself are not caught here: that needs
// global-error.tsx.

import { useEffect } from "react";
import Link from "next/link";

export default function ErrorScreen({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 py-16">
      <p className="nb-accent mb-2 text-sm font-extrabold">잠시 문제가 생겼어요</p>
      <h1 className="mb-3 text-3xl font-extrabold leading-snug tracking-tight">
        화면을 불러오지
        <br />
        못했어요
      </h1>
      <p className="mb-8 text-[15px] leading-relaxed text-gray-600">
        연결이 잠깐 끊겼을 수 있어요. 다시 시도해 보시고, 계속 안 되면 조금
        뒤에 다시 들어와 주세요.
      </p>
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => retry()}
          className="nb-btn nb-btn-primary w-full py-3.5 text-[15px]"
        >
          다시 시도하기
        </button>
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/"
            className="nb-btn nb-btn-white block w-full py-3.5 text-center text-[15px]"
          >
            홈으로
          </Link>
          <Link
            href="/app/profile"
            className="nb-btn nb-btn-white block w-full py-3.5 text-center text-[15px]"
          >
            내 프로필
          </Link>
        </div>
      </div>
      {error.digest && (
        <p className="mt-6 text-xs text-gray-500">
          문의하실 때 이 번호를 함께 알려 주세요: {error.digest}
        </p>
      )}
    </main>
  );
}
