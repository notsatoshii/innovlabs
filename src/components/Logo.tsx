import Link from "next/link";

// InnovLabs lockup: sun clay tile with the asterisk + wordmark with the superscript dot.
// Brand colors are literal (they belong to the mark, not to this app's theme).
const SUN = "#FFC23D";
const PINK = "#FF86A2";
const INK = "#221F38";

export function AsteriskMark({ size = 32 }: { size?: number }) {
  return (
    <span
      aria-hidden
      className="inline-grid shrink-0 place-items-center rounded-full"
      style={{
        width: size,
        height: size,
        background: SUN,
        boxShadow:
          "inset 2px 3px 4px rgba(255,255,255,0.5), inset -3px -4px 6px rgba(0,0,0,0.16), 0 6px 14px -8px rgba(40,30,70,0.5)",
      }}
    >
      <svg viewBox="0 0 160 160" width={size * 0.7} height={size * 0.7} focusable="false">
        <g transform="translate(80 80)" fill={INK}>
          <rect x="-13" y="-56" width="26" height="112" />
          <rect x="-13" y="-56" width="26" height="112" transform="rotate(60)" />
          <rect x="-13" y="-56" width="26" height="112" transform="rotate(-60)" />
          <circle r="13" fill={PINK} />
        </g>
      </svg>
    </span>
  );
}

/** Header lockup. Links to the marketing site when NEXT_PUBLIC_SITE_URL is set, else to /. */
export function Logo() {
  const href = process.env.NEXT_PUBLIC_SITE_URL || "/";
  return (
    <Link href={href} aria-label="InnovLabs" className="inline-flex min-h-11 items-center gap-3">
      <AsteriskMark />
      <span className="relative pr-3 text-lg font-extrabold uppercase leading-none tracking-wide">
        INNOVLABS
        <span
          aria-hidden
          className="absolute -top-0.5 right-0 h-2 w-2 rounded-full"
          style={{ background: SUN }}
        />
      </span>
    </Link>
  );
}
