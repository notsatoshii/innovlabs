import Link from "next/link";
import { TRACKS } from "@/lib/survey/tracks";
import type { TrackId } from "@/lib/survey/types";

// B2C landing page (Phase 4). Server component: zero client JS so it paints
// fast on a Korean office worker's phone. All CTAs go to /start (the fork);
// the registration gate stays behind the survey + teaser (CLAUDE.md rule 3).
//
// Copy discipline: no 보장/반드시, no absolute outcome claims. Outcomes are
// framed as ranges + measurement, mirroring the Slot 3 rule for the report.

const TRACK_ORDER: TrackId[] = [
  "docs_admin",
  "research_planning",
  "data_numbers",
  "sales_customer",
  "content_marketing",
  "management_coordination",
];

const TRACK_COLORS = [
  "bg-[var(--nb-yellow)]",
  "bg-[var(--nb-pink)]",
  "bg-[var(--nb-purple)]",
  "bg-[var(--nb-yellow)]",
  "bg-[var(--nb-pink)]",
  "bg-[var(--nb-purple)]",
];

const PAIN_POINTS = [
  {
    icon: "📄",
    title: "보고서·기획안 초안",
    body: "양식 맞추고 문장 다듬는 데 반나절이 지나갑니다.",
  },
  {
    icon: "📊",
    title: "엑셀 취합·정리",
    body: "여러 파일에서 숫자를 모아 붙이는 일이 매주 반복됩니다.",
  },
  {
    icon: "🗓️",
    title: "회의록·일정 조율",
    body: "회의가 끝나면 정리하고, 공유하고, 다시 일정을 맞춥니다.",
  },
];

const STEPS = [
  {
    n: "1",
    title: "10분 진단",
    body: "업무 시간, 반복 업무, 사용 환경에 대한 19개 질문에 답해 주세요. 한 화면에 한 질문씩, 진행률이 표시됩니다.",
  },
  {
    n: "2",
    title: "트랙 추천",
    body: "답변을 바탕으로 6개 트랙 중 나에게 맞는 트랙과, 내가 그 영역에 쓰는 주당 시간을 바로 보여드립니다.",
  },
  {
    n: "3",
    title: "맞춤 리포트",
    body: "무료로 등록하시면 내 업무 기준으로 작성된 맞춤 리포트를 받아보실 수 있습니다.",
  },
];

const REPORT_SLOTS = [
  {
    title: "내 업무 그대로 비추기",
    body: "답변하신 반복 업무와 불편한 지점을 내 직무와 업종 기준으로 정리합니다.",
  },
  {
    title: "주차별 학습 지도",
    body: "추천 트랙의 커리큘럼이 내 업무의 어느 부분에 닿는지 주 단위로 연결해 드립니다.",
  },
  {
    title: "예상 변화 범위",
    body: "현재 쓰고 있는 시간을 기준으로 기대할 수 있는 변화를 범위로 안내하고, 직접 측정하는 방법을 제안합니다.",
  },
  {
    title: "다음 한 걸음",
    body: "답변하신 목표를 기준으로 가장 먼저 시작할 지점을 제안합니다.",
  },
];

const FAQ = [
  {
    q: "비용이 드나요?",
    a: "진단과 맞춤 리포트는 무료입니다. 카드 등록도 필요 없습니다. 이후 트랙 수강은 별도로 안내드립니다.",
  },
  {
    q: "얼마나 걸리나요?",
    a: "약 10분입니다. 질문은 한 화면에 하나씩 나오고, 진행률이 표시되어 남은 분량을 확인할 수 있습니다.",
  },
  {
    q: "개인정보는 어떻게 처리되나요?",
    a: "등록 단계에서 수집 목적, 보관 기간, 삭제 요청 권리를 안내하고 동의를 받습니다. 언제든 열람·정정·삭제를 요청하실 수 있습니다.",
  },
  {
    q: "회사 초대 링크로 참여했는데, 제 답변을 회사가 볼 수 있나요?",
    a: "개별 응답은 회사에 공개되지 않으며, 통계 형태로만 제공됩니다. 인원이 적은 팀은 통계에서도 따로 표시되지 않습니다.",
  },
  {
    q: "1인 사업자나 학생도 참여할 수 있나요?",
    a: "지금은 직장인 진단이 먼저 열려 있습니다. 1인 사업자와 학생·취업 준비생용 진단은 준비 중이며, 대기 등록을 하시면 오픈 시 가장 먼저 알려드립니다.",
  },
];

/** Carry the partner org code and the Q5 pilot toggle through to the fork. */
function buildStartHref(params: Record<string, string | string[] | undefined>) {
  const qs = new URLSearchParams();
  if (typeof params.org === "string" && params.org !== "") qs.set("org", params.org);
  if (params.q5 === "grid" || params.q5 === "seq") qs.set("q5", params.q5);
  return qs.size > 0 ? `/start?${qs.toString()}` : "/start";
}

export default async function Home({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  const startHref = buildStartHref(params);
  const isPartner = startHref.includes("org=");

  return (
    <>
      {/* Header */}
      <header className="sticky top-0 z-20 border-b-2 border-[var(--nb-ink)] bg-[var(--background)]">
        <div className="mx-auto flex w-full max-w-lg items-center justify-between px-6 py-3">
          <Link href="/" className="text-lg font-extrabold tracking-tight">
            Innovlabs
          </Link>
          <Link
            href={startHref}
            className="nb-btn nb-btn-primary hidden px-4 py-1.5 text-sm md:inline-block"
          >
            무료 진단
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg px-6 pb-4 md:pb-16">
        {/* Hero */}
        <section className="pt-14 pb-16">
          <span className="nb-badge mb-5 inline-block bg-[var(--nb-pink)] px-3 py-1 text-xs">
            10분 무료 업무 진단
          </span>
          <h1 className="mb-5 text-4xl font-extrabold leading-tight tracking-tight">
            반복 업무에 묶인 시간,
            <br />
            AI로 되찾아 드릴게요
          </h1>
          <p className="mb-8 text-[15px] leading-relaxed text-gray-700">
            지금 하고 있는 업무를 알려주시면, 나에게 맞는 AI 워크플로우 트랙을
            찾아드립니다. 약 10분이면 충분해요.
          </p>
          {isPartner && (
            <div className="nb-flat mb-5 bg-[var(--nb-purple)] px-4 py-3 text-sm leading-relaxed">
              회사 초대 링크로 들어오셨어요. 개별 응답은 회사에 공개되지 않으며,
              통계 형태로만 제공됩니다.
            </div>
          )}
          <Link
            href={startHref}
            className="nb-btn nb-btn-primary block w-full py-4 text-center text-[15px]"
          >
            무료로 진단 시작하기
          </Link>
          <p className="mt-4 text-center text-xs text-gray-500">
            카드 등록 없음 · 약 10분 · 결과 즉시 확인
          </p>
        </section>

        {/* Pain points */}
        <section className="pb-16">
          <h2 className="mb-6 text-2xl font-extrabold leading-snug tracking-tight">
            이런 일, 매주
            <br />
            반복하고 있지 않으세요?
          </h2>
          <ul className="flex flex-col gap-3">
            {PAIN_POINTS.map((p) => (
              <li key={p.title} className="nb-card flex items-start gap-4 px-5 py-4">
                <span className="text-2xl leading-none" aria-hidden>
                  {p.icon}
                </span>
                <div>
                  <p className="text-[15px] font-bold">{p.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-gray-600">{p.body}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm leading-relaxed text-gray-600">
            진단이 끝나면, 내가 이런 일에{" "}
            <strong className="text-[var(--nb-ink)]">주당 몇 시간</strong>을 쓰고
            있는지 숫자로 확인할 수 있어요.
          </p>
        </section>

        {/* How it works */}
        <section className="pb-16">
          <p className="nb-accent mb-2 text-sm font-extrabold">진행 방식</p>
          <h2 className="mb-6 text-2xl font-extrabold leading-snug tracking-tight">
            세 단계로 끝나요
          </h2>
          <ol className="flex flex-col gap-4">
            {STEPS.map((s) => (
              <li key={s.n} className="flex items-start gap-4">
                <span className="nb-badge flex h-9 w-9 shrink-0 items-center justify-center bg-[var(--nb-yellow)] text-sm">
                  {s.n}
                </span>
                <div>
                  <p className="text-[15px] font-bold">{s.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-gray-600">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-6 text-xs leading-relaxed text-gray-500">
            등록은 진단 결과를 확인한 뒤에 진행됩니다. 결과를 먼저 보고 결정하세요.
          </p>
        </section>

        {/* Tracks */}
        <section className="pb-16">
          <p className="nb-accent mb-2 text-sm font-extrabold">6개 트랙</p>
          <h2 className="mb-6 text-2xl font-extrabold leading-snug tracking-tight">
            내 업무에 맞는
            <br />
            트랙을 찾아드립니다
          </h2>
          <ul className="flex flex-col gap-3">
            {TRACK_ORDER.map((id, i) => (
              <li key={id} className={`nb-flat px-5 py-4 ${TRACK_COLORS[i]}`}>
                <p className="text-[15px] font-bold">{TRACKS[id].name}</p>
                <p className="mt-1 text-sm leading-relaxed text-gray-800">
                  {TRACKS[id].oneLiner}
                </p>
              </li>
            ))}
          </ul>
        </section>

        {/* Report contents */}
        <section className="pb-16">
          <p className="nb-accent mb-2 text-sm font-extrabold">맞춤 리포트</p>
          <h2 className="mb-6 text-2xl font-extrabold leading-snug tracking-tight">
            내 업무 기준으로 쓰인
            <br />
            한 장의 리포트
          </h2>
          <div className="nb-card divide-y-2 divide-[var(--nb-ink)]">
            {REPORT_SLOTS.map((s) => (
              <div key={s.title} className="px-5 py-4">
                <p className="text-[15px] font-bold">{s.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-gray-600">{s.body}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs leading-relaxed text-gray-500">
            리포트는 답변하신 내용과 트랙 커리큘럼만을 바탕으로 작성됩니다. 결과는
            범위로 안내하며, 확정적인 수치를 약속하지 않습니다.
          </p>
        </section>

        {/* Who it's for */}
        <section className="pb-16">
          <h2 className="mb-6 text-2xl font-extrabold leading-snug tracking-tight">
            누구를 위한 진단인가요?
          </h2>
          <ul className="flex flex-col gap-3">
            <li className="nb-card px-5 py-4">
              <p className="flex flex-wrap items-center gap-2 text-[15px] font-bold">
                직장인 · 공무원 · 공공기관
                <span className="nb-badge bg-[var(--nb-teal)] px-2 py-0.5 text-[11px] text-white">
                  지금 진단 가능
                </span>
              </p>
              <p className="mt-1 text-sm leading-relaxed text-gray-600">
                직무·직급·사용 환경에 맞춰 트랙을 추천합니다.
              </p>
            </li>
            <li className="nb-flat px-5 py-4">
              <p className="flex flex-wrap items-center gap-2 text-[15px] font-bold">
                1인 사업자 · 프리랜서
                <span className="nb-badge bg-[var(--nb-yellow)] px-2 py-0.5 text-[11px]">
                  오픈 준비 중
                </span>
              </p>
              <p className="mt-1 text-sm leading-relaxed text-gray-600">
                두 가지 질문에 답하고 대기 등록하시면 오픈 시 먼저 알려드려요.
              </p>
            </li>
            <li className="nb-flat px-5 py-4">
              <p className="flex flex-wrap items-center gap-2 text-[15px] font-bold">
                학생 · 취업 준비생
                <span className="nb-badge bg-[var(--nb-yellow)] px-2 py-0.5 text-[11px]">
                  오픈 준비 중
                </span>
              </p>
              <p className="mt-1 text-sm leading-relaxed text-gray-600">
                전공과 목표 진로 기준의 진단을 준비하고 있어요.
              </p>
            </li>
          </ul>
        </section>

        {/* B2B */}
        <section className="pb-16">
          <div className="nb-card bg-[var(--nb-purple)] px-5 py-6">
            <p className="mb-2 text-sm font-extrabold">기업·팀 단위 도입</p>
            <h2 className="mb-3 text-xl font-extrabold leading-snug tracking-tight">
              팀 전체가 참여하면
              <br />
              조직 리포트를 드립니다
            </h2>
            <p className="text-sm leading-relaxed text-gray-800">
              파트너 초대 링크로 구성원이 진단에 참여하면, 조직 단위의 업무 시간
              분포와 추천 트랙을 통계 형태로 제공합니다. 개별 응답은 회사에 공개되지
              않습니다.
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section className="pb-16">
          <h2 className="mb-6 text-2xl font-extrabold leading-snug tracking-tight">
            자주 묻는 질문
          </h2>
          <div className="flex flex-col gap-3">
            {FAQ.map((f) => (
              <details key={f.q} className="nb-flat nb-faq group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-[15px] font-bold">
                  {f.q}
                  <span
                    className="shrink-0 text-xl leading-none transition-transform group-open:rotate-45"
                    aria-hidden
                  >
                    +
                  </span>
                </summary>
                <p className="px-5 pb-4 text-sm leading-relaxed text-gray-600">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="pb-16">
          <div className="nb-card px-6 py-8 text-center">
            <h2 className="mb-3 text-2xl font-extrabold leading-snug tracking-tight">
              10분 뒤, 내 업무를
              <br />
              숫자로 만나보세요
            </h2>
            <p className="mb-6 text-sm leading-relaxed text-gray-600">
              어디에 시간이 새는지 알면, 무엇부터 바꿀지 보입니다.
            </p>
            <Link
              href={startHref}
              className="nb-btn nb-btn-primary block w-full py-4 text-center text-[15px]"
            >
              무료로 진단 시작하기
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t-2 border-[var(--nb-ink)]">
        <div className="mx-auto flex w-full max-w-lg flex-col gap-2 px-6 pt-8 pb-28 text-xs text-gray-500 md:flex-row md:pb-8 md:items-center md:justify-between">
          <p className="font-extrabold text-[var(--nb-ink)]">Innovlabs</p>
          <p>© 2026 Innovlabs. AI 워크플로우 교육.</p>
        </div>
      </footer>

      {/* Mobile sticky CTA */}
      <div className="nb-sticky-cta fixed inset-x-0 bottom-0 z-20 border-t-2 border-[var(--nb-ink)] bg-[var(--background)] px-6 pt-3 md:hidden">
        <Link
          href={startHref}
          className="nb-btn nb-btn-primary mx-auto block w-full max-w-lg py-3.5 text-center text-[15px]"
        >
          무료로 진단 시작하기
        </Link>
      </div>
    </>
  );
}
