// Registration gate stub — real auth + consent screen (개인정보보호법) is Phase 2.
// Spec rule 3: this gate always sits AFTER the survey and teaser.

import Link from "next/link";

export default function RegisterPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center px-6 py-16">
      <p className="mb-2 text-sm font-medium text-blue-600">등록</p>
      <h1 className="mb-3 text-2xl font-bold leading-snug text-gray-900">
        곧 만나요!
      </h1>
      <p className="mb-8 text-[15px] leading-relaxed text-gray-600">
        회원 등록과 맞춤 리포트 기능을 준비 중입니다. 카카오 로그인과 이메일
        등록이 곧 열릴 예정이에요.
      </p>
      <Link href="/" className="text-sm text-blue-600">
        처음으로 돌아가기
      </Link>
    </main>
  );
}
