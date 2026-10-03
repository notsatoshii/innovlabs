import Link from "next/link";

// InnovLabs lockup: asterisk tile (navy bars on white, marker-yellow centre)
// + wordmark in the display face with the superscript square.
// Brand colors are literal (they belong to the mark, not to this app's theme).
const MARKER = "#FFE14D";
const TILE = "#FFFFFF";
const INK = "#14213D";

export function AsteriskMark({ size = 32 }: { size?: number }) {
  return (
    <span
      aria-hidden
      className="inline-grid shrink-0 place-items-center rounded-[4px] border-2 border-[#14213D]"
      style={{
        width: size,
        height: size,
        background: TILE,
        boxShadow: "0 6px 14px -6px rgba(20, 33, 61, 0.4)",
      }}
    >
      <svg viewBox="0 0 160 160" width={size * 0.7} height={size * 0.7} focusable="false">
        <g transform="translate(80 80)" fill={INK}>
          <rect x="-13" y="-56" width="26" height="112" />
          <rect x="-13" y="-56" width="26" height="112" transform="rotate(60)" />
          <rect x="-13" y="-56" width="26" height="112" transform="rotate(-60)" />
          <rect x="-12" y="-12" width="24" height="24" fill={MARKER} stroke={INK} strokeWidth="5" />
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
      <span className="nb-display relative pr-3 text-lg uppercase leading-none tracking-wider">
        INNOVLABS
        <span
          aria-hidden
          className="absolute -top-0.5 right-0 h-2 w-2 rounded-[1px] border-[1.5px] border-[#14213D]"
          style={{ background: MARKER }}
        />
      </span>
    </Link>
  );
}
