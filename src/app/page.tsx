import Link from "next/link";

// Placeholder landing — the real B2C landing page is Phase 4.
export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center px-6 py-16">
      <span className="nb-badge mb-5 w-fit bg-[var(--nb-pink)] px-3 py-1 text-xs">
        10분 무료 업무 진단
      </span>
      <h1 className="mb-5 text-4xl font-extrabold leading-tight tracking-tight">
        반복 업무에 묶인 시간,
        <br />
        AI로 되찾아 드릴게요
      </h1>
      <p className="mb-10 text-[15px] leading-relaxed text-gray-700">
        지금 하고 있는 업무를 알려주시면, 나에게 맞는 AI 워크플로우 트랙을
        찾아드립니다. 약 10분이면 충분해요.
      </p>
      <Link
        href="/start"
        className="nb-btn nb-btn-primary w-full py-4 text-center text-[15px]"
      >
        무료로 진단 시작하기
      </Link>
    </main>
  );
}
