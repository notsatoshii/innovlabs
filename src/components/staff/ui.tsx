// Small presentational pieces shared by the staff pages. Server-safe.
// Lime and cyan are used as fills only, with ink text on top (globals.css).

export function Card({
  title,
  aside,
  children,
}: {
  title?: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="nb-card px-5 py-5">
      {(title || aside) && (
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          {title && <h2 className="text-base font-extrabold tracking-tight">{title}</h2>}
          {aside && <div className="text-xs text-gray-500">{aside}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

/**
 * Label and value pairs. Two columns from `lg` up (where the staff section
 * widens past the phone column) unless `single` keeps it to one.
 */
export function Facts({
  items,
  single = false,
}: {
  items: { label: string; value: React.ReactNode }[];
  single?: boolean;
}) {
  return (
    <dl className={`grid grid-cols-1 gap-x-8 gap-y-2 text-sm ${single ? "" : "lg:grid-cols-2"}`}>
      {items.map((item) => (
        <div key={item.label} className="flex gap-3">
          <dt className="w-24 shrink-0 text-gray-500">{item.label}</dt>
          <dd className="min-w-0 flex-1 break-words">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

type Tone = "done" | "info" | "warn" | "muted";

const TONE: Record<Tone, string> = {
  done: "bg-[var(--nb-lime)] text-[var(--nb-ink)]",
  info: "bg-[var(--nb-cyan)] text-[var(--nb-ink)]",
  warn: "bg-[var(--nb-yellow)] text-[var(--nb-ink)]",
  muted: "bg-[var(--nb-paper)] text-gray-500",
};

export function Chip({ tone = "muted", children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span className={`nb-badge inline-block whitespace-nowrap px-2 py-0.5 text-[11px] leading-4 ${TONE[tone]}`}>
      {children}
    </span>
  );
}

/**
 * A table that scrolls sideways inside its own box, so a wide roster never
 * makes the page itself scroll. `minWidth` is a Tailwind min-w class.
 */
export function ScrollTable({
  head,
  children,
  minWidth = "min-w-[44rem]",
}: {
  head: string[];
  children: React.ReactNode;
  minWidth?: string;
}) {
  return (
    <div className="nb-flat max-w-full overflow-x-auto">
      <table className={`w-full border-collapse text-left text-sm ${minWidth}`}>
        <thead>
          <tr className="border-b-2 border-[var(--nb-ink)] bg-[var(--background)]">
            {head.map((label) => (
              <th key={label} scope="col" className="whitespace-nowrap px-3 py-2 text-xs font-extrabold">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&>tr:last-child]:border-b-0 [&>tr]:border-b [&>tr]:border-gray-200 [&_td]:px-3 [&_td]:py-2.5 [&_td]:align-top">
          {children}
        </tbody>
      </table>
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm leading-relaxed text-gray-500">{children}</p>;
}
