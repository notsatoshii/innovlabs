import Link from "next/link";

// InnovLabs lockup: lime asterisk tile + wordmark with the superscript square.
// Brand colors are literal (they belong to the mark, not to this app's theme).
const LIME = "#B8FF29";
const PINK = "#FF4D8D";
const INK = "#000000";

export function AsteriskMark({ size = 32 }: { size?: number }) {
  return (
    <span
      aria-hidden
      className="inline-grid shrink-0 place-items-center border-2 border-[#000]"
      style={{
        width: size,
        height: size,
        background: LIME,
        boxShadow: `3px 3px 0 0 ${INK}`,
      }}
    >
      <svg viewBox="0 0 160 160" width={size * 0.7} height={size * 0.7} focusable="false">
        <g transform="translate(80 80)" fill={INK}>
          <rect x="-13" y="-56" width="26" height="112" />
          <rect x="-13" y="-56" width="26" height="112" transform="rotate(60)" />
          <rect x="-13" y="-56" width="26" height="112" transform="rotate(-60)" />
          <rect x="-11" y="-11" width="22" height="22" fill={PINK} />
        </g>
      </svg>
    </span>
  );
}

/** Header lockup. Links to the marketing site when NEXT_PUBLIC_SITE_URL is set, else to /. */
export function Logo() {
  const href = process.env.NEXT_PUBLIC_SITE_URL || "/";
  return (
    <Link href={href} aria-label="InnovLabs" className="inline-flex items-center gap-3">
      <AsteriskMark />
      <span className="relative pr-3 text-lg font-extrabold uppercase leading-none tracking-wide">
        INNOVLABS
        <span
          aria-hidden
          className="absolute -top-0.5 right-0 h-2 w-2 border-2 border-[#000]"
          style={{ background: LIME }}
        />
      </span>
    </Link>
  );
}
