import Image from "next/image";

// Decorative clay objects above a screen's heading (stills rendered from the
// site's 3D clay scene, public/clay/*.webp). Purely visual: hidden from
// assistive tech, and the float stops under reduced motion (globals.css).
type Kind = "asterisk" | "bubble" | "cap" | "books" | "pencil" | "ring";

// Sizes and spots follow the clay-3d test board's app screen: a large
// asterisk and a bubble above the heading.
const SPOTS: { kind: Kind; className: string }[] = [
  { kind: "bubble", className: "-left-1 top-10 w-28" },
  { kind: "asterisk", className: "-right-4 -top-10 w-52 [animation-delay:-2s]" },
];

export function ClayRow({ items = SPOTS }: { items?: { kind: Kind; className: string }[] }) {
  return (
    <div aria-hidden className="pointer-events-none relative mb-2 h-36 select-none">
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

// Clay peeking out from behind the last cards on a screen (the board's ring
// and books): place inside a `relative` wrapper whose cards sit above it.
export function ClayCorners() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 -bottom-14 -z-10 h-32 select-none">
      <Image
        src="/clay/ring.webp"
        alt=""
        width={480}
        height={480}
        className="clay-float absolute -left-14 bottom-0 h-auto w-32 [animation-delay:-4s]"
      />
      <Image
        src="/clay/books.webp"
        alt=""
        width={480}
        height={480}
        className="clay-float absolute -right-12 bottom-2 h-auto w-32 [animation-delay:-1s]"
      />
    </div>
  );
}
