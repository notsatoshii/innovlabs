// Learner page for one course week (docs/app/phases/phase-2.md: P3, P4).
// Server component.
//
// Weeks with a content file (spine Weeks 1–3) render it in full: objective,
// what to bring, the idea, the lab parts, the assignment, and what is still
// left for a human. On a phone that was ten screens (review A17), so each lab
// part opens folded to its title, minutes and 완료 기준 (a native <details>,
// no client code), and a sticky mini-nav jumps to 핵심 · 실습 · 과제. The content is readable by anyone in the app; the lab
// buttons work only for an enrolled learner whose cohort has opened the week.
// Every other week shows the fixed structure only (cartridge content arrives
// with each track).

import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import type { WeekContent } from "@/lib/courses/types";
import {
  formatMonthDay,
  getBlockForWeek,
  getMyCohort,
  getStructureWeek,
  getWeekContent,
  isWeekOpenFor,
  weekOpensOn,
  type MyCohort,
  type StructureWeek,
} from "@/lib/courses/queries";

type Params = Promise<{ n: string }>;

/** "1" … "12" → the week number; anything else → null. */
function parseWeek(raw: string): number | null {
  return /^(?:[1-9]|1[0-2])$/.test(raw) ? Number(raw) : null;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const week = parseWeek((await params).n);
  const entry = week ? getStructureWeek(week) : null;
  return { title: entry ? `${entry.week}주차 · ${entry.title}` : "코스" };
}

const KIND_LABEL: Record<StructureWeek["kind"], string> = {
  spine: "공통",
  cartridge: "트랙별",
  capstone: "캡스톤",
};

type LabGate = { open: true } | { open: false; reason: string };

/** Whether this learner can start the week's labs, and the one-line reason when not. */
function labGate(mine: MyCohort | null, week: number): LabGate {
  if (!mine) return { open: false, reason: "수강 코드를 등록하면 시작할 수 있어요." };
  if (isWeekOpenFor(mine, week)) return { open: true };
  const opensOn = weekOpensOn(mine.cohort, week);
  return {
    open: false,
    reason: opensOn
      ? `${formatMonthDay(opensOn)}에 열려요.`
      : "강사님이 이 주차를 열면 시작할 수 있어요.",
  };
}

export default async function CourseWeekPage({ params }: { params: Params }) {
  const week = parseWeek((await params).n);
  const entry = week ? getStructureWeek(week) : null;
  if (!week || !entry) notFound();

  const session = await getSession();
  // The /app layout already guarantees a profile; this keeps the types honest.
  if (!session?.profile) redirect("/start");
  // 학원 path has no 12-week course (P8): back to its 준비 중 card.
  if (session.profile.path === "hagwon") redirect("/app/courses");

  const content = entry.hasPage ? getWeekContent(week) : null;
  const gate = labGate(await getMyCohort(), week);

  return (
    <main className="flex w-full flex-col gap-5">
      <Link
        href="/app/courses"
        className="-mb-1 inline-flex items-center gap-1 self-start py-1 text-sm font-bold text-gray-700"
      >
        <svg
          width={16}
          height={16}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M15 6l-6 6 6 6" />
        </svg>
        코스로 돌아가기
      </Link>

      <header>
        <div className="mb-1 flex items-center gap-2">
          <p className="text-xs font-extrabold text-[var(--nb-pink-deep)]">{entry.week}주차</p>
          <span className="nb-badge bg-[var(--nb-paper)] px-2 text-[11px] leading-5">
            {KIND_LABEL[entry.kind]}
          </span>
          <span
            className={`nb-badge px-2 text-[11px] leading-5 ${
              gate.open ? "bg-[var(--nb-lime)]" : "bg-[var(--nb-paper)] text-gray-600"
            }`}
          >
            {gate.open ? "열림" : "잠김"}
          </span>
        </div>
        <h1 className="text-2xl font-extrabold leading-snug tracking-tight">
          {content?.title ?? entry.title}
        </h1>
      </header>

      {content ? (
        <WeekBody content={content} gate={gate} />
      ) : (
        <StructureOnly entry={entry} />
      )}
    </main>
  );
}

// --- Weeks 1–3: the full learner page ---

/** Section anchors for the mini-nav; scroll-mt keeps headings clear of it. */
const SECTION_ID = { idea: "week-idea", lab: "week-lab", assignment: "week-assignment" } as const;
const SECTION_SCROLL = "scroll-mt-16";

function WeekNav({ content }: { content: WeekContent }) {
  const links = [
    content.idea.length > 0 && { href: `#${SECTION_ID.idea}`, label: "핵심" },
    content.lab.length > 0 && { href: `#${SECTION_ID.lab}`, label: "실습" },
    { href: `#${SECTION_ID.assignment}`, label: "과제" },
  ].filter((link): link is { href: string; label: string } => Boolean(link));
  return (
    <nav
      aria-label="이 주차 바로 가기"
      className="sticky top-0 z-20 -mx-6 -mt-2 border-b border-white/80 bg-[rgba(246,243,251,0.72)] px-4 backdrop-blur-xl backdrop-saturate-150"
    >
      <ul className="flex items-center">
        {links.map((link, index) => (
          <li key={link.href} className="flex items-center">
            {index > 0 && (
              <span aria-hidden className="text-gray-400">
                ·
              </span>
            )}
            <a
              href={link.href}
              className="inline-flex min-h-11 items-center px-3 text-sm font-extrabold underline-offset-4 hover:underline"
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function WeekBody({ content, gate }: { content: WeekContent; gate: LabGate }) {
  return (
    <>
      <WeekNav content={content} />

      <section className="nb-card bg-[var(--nb-yellow)] px-5 py-4">
        <h2 className="mb-1 text-xs font-extrabold">이 수업에서 가져가는 것</h2>
        <p className="text-[17px] font-bold leading-snug">{content.objective}</p>
      </section>

      {content.bring.length > 0 && (
        <section>
          <SectionTitle>준비물</SectionTitle>
          <ul className="flex flex-col gap-1.5 text-[15px] leading-relaxed">
            {content.bring.map((item, index) => (
              <li key={index} className="flex gap-2">
                <span aria-hidden className="mt-[0.6em] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--nb-ink)]" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {content.idea.length > 0 && (
        <section id={SECTION_ID.idea} className={SECTION_SCROLL}>
          <SectionTitle>이번 수업의 핵심</SectionTitle>
          <div className="flex flex-col gap-3 text-[15px] leading-relaxed text-gray-800">
            {content.idea.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        </section>
      )}

      {content.lab.length > 0 && (
        <section id={SECTION_ID.lab} className={SECTION_SCROLL}>
          <SectionTitle>실습</SectionTitle>
          <p className="-mt-1 mb-3 text-sm text-gray-600">제목을 누르면 할 일이 펼쳐져요.</p>
          <ol className="flex flex-col gap-4">
            {content.lab.map((part, index) => (
              <li key={index} className="nb-card px-5 py-4">
                {/* Folded by default: title, minutes and 완료 기준 stay visible;
                    the numbered steps open on tap. */}
                <details className="group">
                  {/* summary holds phrasing and heading content only, so the
                      layout is a grid of direct children, not nested divs. */}
                  <summary className="grid min-h-11 cursor-pointer list-none grid-cols-[auto_1fr_auto] items-start gap-x-3 [&::-webkit-details-marker]:hidden">
                    <span className="nb-badge row-span-2 grid h-7 w-7 place-items-center bg-[var(--nb-yellow)] text-sm font-extrabold">
                      {index + 1}
                    </span>
                    <h3 className="min-w-0 text-base font-extrabold leading-snug">{part.title}</h3>
                    <span className="row-span-2 mt-0.5 flex items-center gap-1 text-xs font-bold text-gray-700">
                      <span className="group-open:hidden">펼치기</span>
                      <span className="hidden group-open:inline">접기</span>
                      <svg
                        width={16}
                        height={16}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2.4}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden
                        className="transition-transform group-open:rotate-180"
                      >
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </span>
                    <span className="col-start-2 mt-0.5 text-xs font-bold text-gray-600">
                      {part.minutes}분 · 할 일 {part.steps.length}가지
                    </span>
                  </summary>
                  <div className="mt-3">
                    <Steps steps={part.steps} />
                  </div>
                </details>
                <div className="nb-flat mt-3 bg-[var(--background)] px-4 py-3">
                  <p className="mb-0.5 text-xs font-extrabold">완료 기준</p>
                  <p className="text-sm leading-relaxed">{part.done}</p>
                </div>
                {/* One button per lab: later parts that use the same lab get a quiet link. */}
                {part.labHref &&
                  (content.lab.findIndex((p) => p.labHref === part.labHref) === index ? (
                    <LabButton
                      href={part.labHref}
                      label="실습 시작하기"
                      ariaLabel={`${part.title} 실습 시작하기`}
                      gate={gate}
                      reasonId={`lab-reason-${index}`}
                    />
                  ) : (
                    <p className="mt-3 text-sm text-gray-600">같은 실습 화면에서 이어서 해요.</p>
                  ))}
              </li>
            ))}
          </ol>
        </section>
      )}

      <section id={SECTION_ID.assignment} className={`nb-card px-5 py-5 ${SECTION_SCROLL}`}>
        <SectionTitle>이번 주 과제</SectionTitle>
        <p className="text-[15px] font-semibold leading-relaxed">{content.assignment.summary}</p>
        {content.assignment.steps.length > 0 && (
          <div className="mt-3">
            <Steps steps={content.assignment.steps} />
          </div>
        )}
        {content.assignment.labHref && (
          <LabButton
            href={content.assignment.labHref}
            label="과제 기록하러 가기"
            ariaLabel="이번 주 과제 기록하러 가기"
            gate={gate}
            reasonId="assignment-reason"
          />
        )}
      </section>

      <section className="nb-flat px-5 py-4">
        <h2 className="mb-1 text-xs font-extrabold text-[var(--nb-pink-deep)]">
          아직 사람이 할 일
        </h2>
        <p className="text-[15px] leading-relaxed">{content.leftForHuman}</p>
      </section>
    </>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-2 text-base font-extrabold tracking-tight">{children}</h2>;
}

function Steps({ steps }: { steps: string[] }) {
  return (
    <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-[15px] leading-relaxed marker:font-bold">
      {steps.map((step, index) => (
        <li key={index} className="pl-0.5">
          {step}
        </li>
      ))}
    </ol>
  );
}

/** Primary button into an app lab; disabled with a one-line reason when the week is not open for this learner. */
function LabButton({
  href,
  label,
  ariaLabel,
  gate,
  reasonId,
}: {
  href: string;
  label: string;
  ariaLabel: string;
  gate: LabGate;
  reasonId: string;
}) {
  const className = "nb-btn nb-btn-primary mt-4 block w-full px-5 py-3 text-center text-[15px]";
  if (gate.open) {
    return (
      <Link href={href} aria-label={ariaLabel} className={className}>
        {label}
      </Link>
    );
  }
  return (
    <>
      <button
        type="button"
        disabled
        aria-label={ariaLabel}
        aria-describedby={reasonId}
        className={className}
      >
        {label}
      </button>
      <p id={reasonId} className="mt-2 text-center text-xs font-semibold text-gray-600">
        {gate.reason}
      </p>
    </>
  );
}

// --- Weeks 4–12: the fixed structure only ---

function StructureOnly({ entry }: { entry: StructureWeek }) {
  const block = getBlockForWeek(entry.week);
  return (
    <>
      <section className="nb-card px-5 py-5">
        <h2 className="mb-1 text-xs font-extrabold">이 주차에 하는 일</h2>
        <p className="text-[15px] leading-relaxed">{entry.summary}</p>
      </section>

      {block && (
        <section className="nb-flat px-5 py-4">
          <div className="mb-1 flex items-baseline justify-between gap-2">
            <h2 className="min-w-0 text-sm font-extrabold">{block.title}</h2>
            <span className="shrink-0 text-xs font-bold tabular-nums text-gray-600">
              {block.weeks[0]}–{block.weeks[1]}주
            </span>
          </div>
          <p className="text-sm leading-relaxed text-gray-700">{block.summary}</p>
        </section>
      )}

      <p className="text-sm leading-relaxed text-gray-700">
        내 트랙에 맞춘 자세한 내용은 기수가 시작되면 이 자리에 올라와요.
      </p>
    </>
  );
}
