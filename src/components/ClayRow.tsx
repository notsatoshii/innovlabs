import Image from "next/image";

// Decorative clay objects above a screen's heading (stills rendered from the
// site's 3D clay scene, public/clay/*.webp). Purely visual: hidden from
// assistive tech, and the float stops under reduced motion (globals.css).
type Kind = "asterisk" | "bubble" | "cap" | "books" | "pencil" | "ring";

const SPOTS: { kind: Kind; className: string }[] = [
  { kind: "bubble", className: "left-0 top-3 w-20" },
  { kind: "asterisk", className: "right-0 -top-2 w-28 [animation-delay:-2s]" },
];

export function ClayRow({ items = SPOTS }: { items?: { kind: Kind; className: string }[] }) {
  return (
    <div aria-hidden className="pointer-events-none relative mb-3 h-24 select-none">
      {items.map(({ kind, className }) => (
        <Image
          key={kind}
          src={`/clay/${kind}.webp`}
          alt=""
          width={480}
          height={480}
          priority
          className={`clay-float absolute h-auto ${className}`}
        />
      ))}
    </div>
  );
}
