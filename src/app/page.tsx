import Link from "next/link";

// Placeholder landing — the real B2C landing page is Phase 4.
export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center px-6 py-16">
      <p className="mb-3 text-sm font-medium text-blue-600">10분 업무 진단</p>
      <h1 className="mb-4 text-3xl font-bold leading-tight text-gray-900">
        반복 업무에 묶인 시간,
        <br />
        AI로 되찾아 드릴게요
      </h1>
      <p className="mb-10 text-[15px] leading-relaxed text-gray-600">
        지금 하고 있는 업무를 알려주시면, 나에게 맞는 AI 워크플로우 트랙을
        찾아드립니다. 약 10분이면 충분해요.
      </p>
      <Link
        href="/start"
        className="w-full rounded-xl bg-blue-600 py-4 text-center text-[15px] font-semibold text-white"
      >
        무료로 진단 시작하기
      </Link>
    </main>
  );
}
