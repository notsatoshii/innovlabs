// A screen's media slot. In O1 no asset exists yet, so it is a placeholder
// card carrying the production brief; once `src` is set it plays the asset.

import type { Media } from "@/lib/course/types";

const KIND_LABEL: Record<Media["kind"], string> = {
  motion: "모션",
  video: "영상",
  screenshot: "스크린샷",
};

function Icon({ kind }: { kind: Media["kind"] }) {
  const common = { width: 22, height: 22, viewBox: "0 0 24 24", "aria-hidden": true };
  if (kind === "video") {
    return (
      <svg {...common} fill="currentColor">
        <path d="M8 5.5v13l11-6.5z" />
      </svg>
    );
  }
  if (kind === "screenshot") {
    return (
      <svg {...common} fill="none" stroke="currentColor" strokeWidth={2}>
        <rect x="5" y="2.5" width="14" height="19" rx="2.5" />
        <path d="M9 6.5h6M9 10h6M9 13.5h4" />
      </svg>
    );
  }
  return (
    <svg {...common} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M4 12a8 8 0 0 1 14-5.3" />
      <path d="M18 3v4h-4" />
      <path d="M20 12a8 8 0 0 1-14 5.3" />
      <path d="M6 21v-4h4" />
    </svg>
  );
}

export function MediaCard({ media }: { media: Media }) {
  if (media.src) {
    if (media.kind === "screenshot") {
      // eslint-disable-next-line @next/next/no-img-element -- content assets come from the CDN as-is
      return <img src={media.src} alt={media.brief} className="c-media-real" />;
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
        aria-label={media.brief}
      />
    );
  }
  const duration = media.seconds ? ` ${media.seconds}초` : "";
  return (
    <div className="c-media" role="img" aria-label={`${KIND_LABEL[media.kind]} 자리${duration}, 아직 만들기 전이에요`}>
      <div className="c-mi">
        <Icon kind={media.kind} />
      </div>
      <div className="flex min-w-0 flex-col gap-0.5">
        <b>
          {KIND_LABEL[media.kind]}
          {duration}
          <em>제작 전</em>
        </b>
        <span>{media.brief}</span>
      </div>
    </div>
  );
}
