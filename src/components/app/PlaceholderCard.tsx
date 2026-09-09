// Greyed "준비 중" card for tabs that are not built yet. Server component.
// The sticker sits outside the nb-disabled region so it stays at full ink.

export function PlaceholderCard({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <section className="relative mt-3">
      <span className="nb-sticker absolute -top-3 right-4 z-10">준비 중</span>
      <div className="nb-card px-5 py-6">
        <div className="nb-disabled" aria-disabled>
          <h1 className="mb-2 text-xl font-extrabold tracking-tight">{title}</h1>
          <p className="text-[15px] leading-relaxed">{body}</p>
        </div>
      </div>
    </section>
  );
}
