# v4: Visuals

Goal: the photo frames and diagram slots that the site already reserves get real material,
without touching the structure or the copy. Everything in this phase follows the visual spec
(`innovlabs-visual-motion-spec.md`, 4.1 to 4.9) so the result still looks drawn by one hand.

## What the site already holds (2026-09-09)

- `PhotoFrame` renders a yellow square with an initial wherever a photo is missing. Slots:
  home story (one frame), about lead and team (Eric, Ted), companies team, courses "who
  teaches". Passing `src` swaps the fallback for the image; the frame, shadow, rotation, and
  tape strip are already there.
- The three spec diagrams exist: onboarding flowchart (home, platform, courses), the second
  brain node graph (platform), the timeline (about). The 12-week strip and the session rhythm
  bar exist on the courses page. Motion is built per spec 5.2, including reduced motion.
- No worksheet imagery anywhere. The curriculum docs describe Week 1 to 3 artifacts (Work Map,
  harness text, the countersigned drill) that a buyer would recognise as evidence.

## Needs from Eric before the build

1. **Four photos.** Eric, Ted, one of the two of you working (story frame on home), and one
   of the space or a session in Seoul. Any camera; square or portrait crop works. Full color;
   the spec rejects duotone and black and white (DECIDE 3 in the spec, my pick stands unless
   overruled).
2. **Permission to show real worksheets**, or a decision to show synthesized ones. A real
   Week 1 Work Map with names blurred beats a mock; a mock beats nothing. Which one.
3. **Ted's photo consent** and the name rendering (the English pages say "Ted Kim").

## Changes

1. Photos: drop into `public/photos/` as WebP at 800×800 (portrait 800×1000), under 120 KB
   each, with a JPEG fallback only if a source can't be converted. Wire `src` in the four
   slots. Alt text in Korean on the Korean pages, English on English, describing the person
   or the scene, not "photo".
2. Worksheet imagery: one frame on the courses page, in "How a session runs" or "Measured,
   not felt", showing a Week 1 artifact. Same frame treatment as photos. If synthesized, the
   tape strip says 예시 / Sample so it never reads as a client's work.
3. Track router diagram: a small flowchart on the courses tracks section, survey → seven
   track nodes → "between two, you choose". Same node and connector rules as the other three.
4. Open Graph images: regenerate `og-ko.png` and `og-en.png` with the story photo if it
   reads well at 1200×630; otherwise keep the type-only versions.
5. Loading: `loading="lazy"` on every frame below the fold; the about lead photo is above
   the fold and loads eagerly with explicit width and height so nothing shifts.

## Not in this phase

Screenshots of the web app (spec 4.8, none until the app's own UI is worth showing), video,
any change to copy or section order, new icons.

## Self-review checklist

- Every frame keeps its bounding box before and after the image loads (no layout shift).
- 360 px: no horizontal scroll, tape strips stay inside the viewport.
- Lighthouse performance on the Korean home does not drop below the v6 baseline.
- Image weight per page under 400 KB total.

## Open for Eric after review

- Whether the space photo belongs on the companies page (training section) or only on
  about.
- If the worksheet is synthesized, whether to keep it at all once a real cohort produces one.
