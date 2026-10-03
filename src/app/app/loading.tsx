// Loading state for the five /app tabs. Next wraps each tab's page in a
// Suspense boundary with this as the fallback, so a tap on the tab bar shows
// this at once instead of a frozen screen while the server answers. The
// layout (and the tab bar) stays in place around it.
//
// A light skeleton in the shape most tabs share: a heading, then cards. No
// visible text; the one line of Korean is for screen readers.

function Bar({ className }: { className: string }) {
  return <div className={`rounded-md bg-[#e6e1f0] ${className}`} />;
}

function CardSkeleton({ lines }: { lines: string[] }) {
  return (
    <div className="nb-flat flex flex-col gap-3 px-5 py-5">
      {lines.map((width, i) => (
        <Bar key={i} className={`h-3.5 ${width}`} />
      ))}
    </div>
  );
}

export default function AppLoading() {
  return (
    <div role="status" aria-live="polite" className="flex w-full flex-col gap-5">
      <span className="sr-only">화면을 불러오고 있어요</span>
      <div aria-hidden className="flex animate-pulse flex-col gap-5 motion-reduce:animate-none">
        <div className="flex flex-col gap-2.5">
          <Bar className="h-3 w-20" />
          <Bar className="h-7 w-48" />
        </div>
        <CardSkeleton lines={["w-2/5", "w-full", "w-4/5"]} />
        <CardSkeleton lines={["w-1/3", "w-full", "w-full", "w-3/5"]} />
        <CardSkeleton lines={["w-1/2", "w-5/6"]} />
      </div>
    </div>
  );
}
