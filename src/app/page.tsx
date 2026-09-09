import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { TRACKS } from "@/lib/survey/tracks";
import type { TrackId } from "@/lib/survey/types";

// B2C landing page (Phase 4). Server component: zero client JS so it paints
// fast on a Korean office worker's phone. All CTAs go to /start (the fork);
// the registration gate stays behind the survey + teaser (CLAUDE.md rule 3).
//
// Smart root (phase-1 D6): a signed-in account that already has a profile is
// sent straight to the app; everyone else sees the landing.
//
// Copy discipline: no 보장/반드시, no absolute outcome claims. Outcomes are
// framed as ranges + measurement, mirroring the Slot 3 rule for the report.
// The site-wide header (logo + login link) lives in layout.tsx.

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
  "bg-[var(--nb-cyan)]",
  "bg-[var(--nb-yellow)]",
  "bg-[var(--nb-pink)]",
  "bg-[var(--nb-cyan)]",
];

const PAIN_POINTS = [
  {
    icon: "📄",
    title: "보고서·기획안 초안",
    body: "양식 맞추고 문장 다듬다 보면 반나절이 훌쩍 갑니다.",
  },
  {
    icon: "📊",
    title: "엑셀 취합·정리",
    body: "매주 파일 몇 개를 오가며 숫자를 복사해 붙입니다.",
  },
  {
    icon: "🗓️",
    title: "회의록·일정 조율",
    body: "회의 끝나면 회의록 쓰고, 공유하고, 다음 일정 잡느라 메신저를 또 붙잡습니다.",
  },
];

const STEPS = [
  {
    n: "1",
    title: "10분 진단",
    body: "업무 시간, 반복 업무, 회사 PC 환경을 묻는 질문 19개에 답합니다. 한 화면에 한 질문씩 나오고, 남은 분량은 진행률로 보입니다.",
  },
  {
    n: "2",
    title: "트랙 추천",
    body: "답변을 바탕으로 6개 트랙 중 맞는 트랙을 골라 드리고, 그 영역에 매주 몇 시간을 쓰고 있는지 바로 보여드립니다.",
  },
  {
    n: "3",
    title: "맞춤 리포트",
    body: "무료로 등록하시면 답변하신 업무를 기준으로 쓴 맞춤 리포트를 받아보실 수 있습니다.",
  },
];

const REPORT_SLOTS = [
  {
    title: "내 업무를 있는 그대로",
    body: "답변하신 반복 업무와 답답한 지점을 직무와 업종에 맞춰 정리합니다.",
  },
  {
    title: "주차별 학습 계획",
    body: "추천 트랙에서 매주 배우는 내용이 내 업무의 어느 부분에 쓰이는지 주 단위로 짚어 드립니다.",
  },
  {
    title: "기대할 수 있는 변화",
    body: "지금 쓰는 시간을 기준으로 기대할 수 있는 변화를 범위로 보여드리고, 직접 재 보는 방법도 함께 안내합니다.",
  },
  {
    title: "첫 번째 할 일",
    body: "답변하신 목표에 맞춰 무엇부터 시작하면 좋을지 제안합니다.",
  },
];

const FAQ = [
  {
    q: "비용이 드나요?",
    a: "진단과 맞춤 리포트는 무료이고, 카드 등록도 없습니다. 트랙 수강 비용은 등록 후 따로 안내드립니다.",
  },
  {
    q: "얼마나 걸리나요?",
    a: "10분 정도 걸립니다. 질문이 한 화면에 하나씩 나오고, 위쪽 진행률로 얼마나 남았는지 볼 수 있습니다.",
  },
  {
    q: "개인정보는 어떻게 처리되나요?",
    a: "등록할 때 수집 목적, 보관 기간, 삭제 요청 방법을 안내하고 동의를 받습니다. 열람, 정정, 삭제는 언제든 요청하실 수 있습니다.",
  },
  {
    q: "회사 초대 링크로 참여했는데, 제 답변을 회사가 볼 수 있나요?",
    a: "볼 수 없습니다. 개별 응답은 회사에 공개되지 않으며, 통계 형태로만 제공됩니다. 인원이 적은 팀은 통계에서도 따로 나오지 않습니다.",
  },
  {
    q: "1인 사업자나 학생도 참여할 수 있나요?",
    a: "지금은 직장인 진단만 열려 있습니다. 1인 사업자용과 학생·취업 준비생용은 준비 중이라, 이메일을 남겨 두시면 열리는 대로 먼저 알려드립니다.",
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
  const session = await getSession();
  if (session?.profile) redirect("/app/profile");

  const params = await searchParams;
  const startHref = buildStartHref(params);
  const isPartner = startHref.includes("org=");

  return (
    <>
      <main className="mx-auto w-full max-w-lg px-6 pb-4 md:pb-16">
        {/* Hero */}
        <section className="pt-14 pb-16">
          <span className="nb-badge mb-5 inline-block bg-[var(--nb-pink)] px-3 py-1 text-xs">
            무료 업무 진단 · 10분
          </span>
          <h1 className="mb-5 text-4xl font-extrabold leading-tight tracking-tight">
            매주 똑같이 반복하는 일,
            <br />
            AI로 얼마나 줄일 수 있을까요?
          </h1>
          <p className="mb-8 text-[15px] leading-relaxed text-gray-700">
            지금 하시는 일을 10분만 알려주세요. 어떤 AI 워크플로우 트랙이 맞는지,
            그 영역에 매주 몇 시간을 쓰고 있는지 바로 보여드립니다.
          </p>
          {isPartner && (
            <div className="nb-flat mb-5 bg-[var(--nb-cyan)] px-4 py-3 text-sm leading-relaxed">
              회사 초대 링크로 들어오셨네요. 개별 응답은 회사에 공개되지 않으며,
              통계 형태로만 제공됩니다.
            </div>
          )}
          <Link
            href={startHref}
            className="nb-btn nb-btn-primary block w-full py-4 text-center text-[15px]"
          >
            무료 진단 시작하기
          </Link>
          <p className="mt-4 text-center text-xs text-gray-500">
            카드 등록 없음 · 약 10분 · 결과 바로 확인
          </p>
        </section>

        {/* Pain points */}
        <section className="pb-16">
          <h2 className="mb-6 text-2xl font-extrabold leading-snug tracking-tight">
            혹시 매주
            <br />
            이런 일에 시간을 쓰고 계신가요?
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
            진단을 마치면 이런 일에{" "}
            <strong className="text-[var(--nb-ink)]">매주 몇 시간</strong>을 쓰고
            있는지 숫자로 확인하실 수 있습니다.
          </p>
        </section>

        {/* How it works */}
        <section className="pb-16">
          <p className="nb-accent mb-2 text-sm font-extrabold">진행 방식</p>
          <h2 className="mb-6 text-2xl font-extrabold leading-snug tracking-tight">
            세 단계면 끝납니다
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
            등록은 진단 결과를 확인한 다음입니다. 결과를 먼저 보시고 결정하셔도
            됩니다.
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
            내 업무 기준으로 쓴
            <br />
            한 장짜리 리포트
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
            리포트는 답변하신 내용과 트랙 커리큘럼만 바탕으로 작성합니다. 변화는
            범위로 안내하며, 정해진 수치를 약속하지 않습니다.
          </p>
        </section>

        {/* Who it's for */}
        <section className="pb-16">
          <h2 className="mb-6 text-2xl font-extrabold leading-snug tracking-tight">
            누가 받을 수 있나요?
          </h2>
          <ul className="flex flex-col gap-3">
            <li className="nb-card px-5 py-4">
              <p className="flex flex-wrap items-center gap-2 text-[15px] font-bold">
                직장인 · 공무원 · 공공기관
                <span className="nb-badge bg-[var(--nb-lime)] px-2 py-0.5 text-[11px]">
                  지금 바로 가능
                </span>
              </p>
              <p className="mt-1 text-sm leading-relaxed text-gray-600">
                직무, 직급, 회사 PC 환경에 맞춰 트랙을 추천합니다.
              </p>
            </li>
            <li className="nb-flat px-5 py-4">
              <p className="flex flex-wrap items-center gap-2 text-[15px] font-bold">
                1인 사업자 · 프리랜서
                <span className="nb-sticker">준비 중</span>
              </p>
              <p className="mt-1 text-sm leading-relaxed text-gray-600">
                질문 두 개에 답하고 이메일을 남겨 두시면 열리는 대로 먼저
                알려드립니다.
              </p>
            </li>
            <li className="nb-flat px-5 py-4">
              <p className="flex flex-wrap items-center gap-2 text-[15px] font-bold">
                학생 · 취업 준비생
                <span className="nb-sticker">준비 중</span>
              </p>
              <p className="mt-1 text-sm leading-relaxed text-gray-600">
                전공과 희망 진로에 맞춘 진단을 준비하고 있습니다.
              </p>
            </li>
          </ul>
        </section>

        {/* B2B */}
        <section className="pb-16">
          <div className="nb-card bg-[var(--nb-cyan)] px-5 py-6">
            <p className="mb-2 text-sm font-extrabold">기업·팀 도입</p>
            <h2 className="mb-3 text-xl font-extrabold leading-snug tracking-tight">
              팀이 함께 참여하면
              <br />
              조직 리포트를 드립니다
            </h2>
            <p className="text-sm leading-relaxed text-gray-800">
              초대 링크로 구성원이 진단에 참여하면, 조직 전체가 어떤 업무에 시간을
              쓰는지와 추천 트랙 분포를 통계로 정리해 드립니다. 개별 응답은 회사에
              공개되지 않습니다.
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
              10분 뒤, 내 업무가
              <br />
              숫자로 보입니다
            </h2>
            <p className="mb-6 text-sm leading-relaxed text-gray-600">
              시간이 어디로 새는지 알면 무엇부터 손볼지 보입니다.
            </p>
            <Link
              href={startHref}
              className="nb-btn nb-btn-primary block w-full py-4 text-center text-[15px]"
            >
              무료 진단 시작하기
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t-2 border-[var(--nb-ink)]">
        <div className="mx-auto flex w-full max-w-lg flex-col gap-2 px-6 pt-8 pb-28 text-xs text-gray-500 md:flex-row md:pb-8 md:items-center md:justify-between">
          <p className="font-extrabold text-[var(--nb-ink)]">InnovLabs</p>
          <p>© 2026 InnovLabs · AI 워크플로우 교육</p>
        </div>
      </footer>

      {/* Mobile sticky CTA */}
      <div className="nb-sticky-cta fixed inset-x-0 bottom-0 z-20 border-t-2 border-[var(--nb-ink)] bg-[var(--background)] px-6 pt-3 md:hidden">
        <Link
          href={startHref}
          className="nb-btn nb-btn-primary mx-auto block w-full max-w-lg py-3.5 text-center text-[15px]"
        >
          무료 진단 시작하기
        </Link>
      </div>
    </>
  );
}
