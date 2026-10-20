// A screen's media slot. Until the asset exists (no `src`), nothing is shown:
// the production brief is a note for the media team and never reaches the
// browser (content.ts forBrowser; review P0-2). Once `src` is set it plays
// the asset with its Korean `alt` (none = decorative).

import type { Media } from "@/lib/course/types";

export function MediaCard({ media }: { media: Media }) {
  if (!media.src) return null;
  const alt = media.alt ?? "";
  if (media.kind === "screenshot") {
    // eslint-disable-next-line @next/next/no-img-element -- content assets come from the CDN as-is
    return <img src={media.src} alt={alt} className="c-media-real" />;
  }
  return (
    <video
      src={media.src}
      className="c-media-real"
      controls={media.kind === "video"}
      autoPlay={media.kind === "motion"}
      loop={media.kind === "motion"}
      muted={media.kind === "motion"}
      playsInline
      {...(alt ? { "aria-label": alt } : { "aria-hidden": true })}
    />
  );
}
