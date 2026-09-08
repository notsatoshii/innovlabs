# InnovLabs Visual System and Motion Spec (Steps 4 and 5)

Proposal for review. Decisions marked DECIDE are the ones Eric needs to weigh in on. Everything else is my recommendation and stands unless overruled.

---

# Step 4: Visual system

## 4.1 One drawing language for everything

Every non-photo visual on the site (icons, diagrams, stickers, decorations) follows one rule set, so the whole site looks drawn by one hand:

- 3px black stroke, square line caps and joins. No rounded strokes.
- Flat fills from the palette only. No gradients, no transparency, no texture.
- Hard offset shadow where the element is a "physical" thing (card, sticker, tile): 6px 6px 0 black for large, 4px 4px 0 for small.
- Imperfection is allowed in placement (rotation, overlap), never in the drawing. Lines are clean; the arrangement is loose. This is the difference between neobrutalism and "hand-drawn cute."
- Nothing 3D, isometric, or blob-shaped. Nothing that looks like a stock illustration pack.

## 4.2 Icons (audience router, platform pillars)

- Drawn on a 48px grid, displayed at 48px on desktop, 40px mobile.
- 3px stroke, one fill color per icon, the rest white.
- Each icon is one object, not a scene. Recognizable at 24px.
- Inventory (8 total):
  - Worker: a desk monitor with a bordered window. Fill lime.
  - Student: an open notebook with one bordered tab. Fill pink.
  - Founder: a stacked set of three cards, top one offset. Fill lime.
  - Company: a building outline, three windows. Fill yellow (matches the card).
  - Profile and curriculum: a bordered document with a pixel-square corner. Fill lime.
  - Knowledge base: three stacked bordered rectangles. Fill yellow.
  - Community: three overlapping squares. Fill pink.
  - Toolkit: a wrench drawn in straight segments. Fill lime.
- Not used anywhere else. Programs cards, proof tiles, and CTA blocks are type-led.

## 4.3 Diagrams

Three diagrams on the site, one shared style:

- Nodes: bordered rectangles, white fill, 3px stroke, hard shadow, label in Pretendard 700.
- Connectors: 3px black lines with square arrowheads (a filled black square rotated 45°, not a chevron).
- Highlight node: lime fill. One per diagram, the end state.

Inventory:
1. Onboarding flowchart (home section 6, platform page, courses custom block): Survey, Google login, Your report, Your curriculum, Your second brain. Horizontal on desktop, vertical on mobile. Last node lime.
2. Second brain node graph (platform page): 7 to 9 nodes with short labels (Notes, Docs, Tasks, Contacts, Sources, AI), connected loosely, center node "You" in lime. Deliberately not a neat tree.
3. Timeline (about page): 5 milestones on a horizontal rule, each a bordered box with year and one line. 2019, early API, building daily, friends asking, InnovLabs. Last box lime.

The courses page 12-week strip: 12 bordered cells in a row, grouped by phase with fills paper / lime / yellow / pink for Setup / Workflows / Systems / Your own.

## 4.4 Photo treatment

- Photos are cut square or 4:5 portrait, full color, no filter. No duotone (it's the most common "make a photo fit the brand" move and it reads as template).
- Frame: 3px black border, 6px hard shadow, rotated between -2° and 2°.
- One accent: a lime "tape strip" (a bordered rectangle at -8°) across one corner. That's the only decoration. On the about page team photos, the tape carries the person's first name.
- Fallback when a photo is missing: a bordered square with a single initial in Archivo-weight Pretendard, fill yellow.

## 4.5 Stickers

The hero sticker board and the courses hero format stickers:

- Bordered rectangles (not rounded pills), white or palette fill, 4px shadow, rotation -6° to 6°, overlapping by 10 to 20%.
- Text in Pretendard 800, sentence case, one line.
- The logo tile is always the front-most sticker with the least rotation (0 to 1°).
- Max 4 per board. Five reads as clutter.

## 4.6 Section backgrounds (home)

Adjacent sections never share a loud fill, and the loudest section is the one making the argument.

1. Hero: paper
2. Router: paper, cards white (company card yellow)
3. What we're not: yellow full-bleed. Struck cards in a fixed grey (#E4E0D8) with grey text (#5A5751), no overlay or transparency; strike line 6px black at -12°. Lime card with shadow, and it's larger than the three struck cards.
4. Programs: paper, cards white
5. Story: white full-bleed, 3px borders top and bottom. An oversized lime bordered block sits behind the photo and breaks upward through the top border into section 4 (see 4.9).
6. Platform: paper, flowchart on it
7. Proof: pink full-bleed, number tiles white
8. Final CTA: ink, paper text, lime button with yellow shadow, cropped asterisk in lime
9. Footer: ink, continues from final CTA with a 3px paper border between

Subpages follow the same alternation: paper default, one loud section per page max, ink for the final CTA.

## 4.7 The asterisk as decoration

- Favicon and nav lockup (always).
- Final CTA on every page: oversized, cropped at the right edge, lime, 15° rotation.
- The footnote source line in section 3: a small asterisk tile, not a typed `*`.
- Nowhere else. It's a mark, not a pattern. DECIDE: I'm cutting the marquee strip from the one-shot spec entirely. The hero sticker board already supplies the energy, and a scrolling band between hero and router adds noise before the reader has been sorted. If you want it back, it goes below the router, never above.

## 4.9 Depth (added after review)

Depth on a flat site comes from composition, not effects. Four tools, each with a limit so they stay deliberate:

**Overhang.** Elements may break section borders. The hero sticker board hangs 48px down into the router. The story section's lime block breaks up into programs. The proof section's first number tile breaks down into the final CTA. The final CTA's asterisk crops off the edge. Rule: one overhanging element per section boundary, never two.

**Scale.** A fixed type scale with extreme contrast, using clamp():
- display: 96px to 160px (hero headline, proof numbers, final CTA)
- h2: 48px to 72px (section headlines)
- h3: 24px to 28px (card titles)
- body: 17px to 19px
- label: 13px, Pretendard 700, sentence case (metas, footnote, tape strips)
Nothing lives between these steps. The proof numbers are set at display size, the labels under them at label size; that gap is the section.

**Density rhythm.** Sections alternate dense and sparse. Dense: router (four cards), what we're not (four cards plus footnote), platform (flowchart plus four pillars). Sparse: story (one photo, one paragraph, lots of air), final CTA (one line, one button). Programs and proof sit in between. A sparse section after a dense one reads as a breath, and that contrast is what people call "depth."

**Asymmetry.** 12-column grid, sections split unevenly: hero 7/5, story 4/8 (photo small, text wide), platform 5/7 (pillars narrow, flowchart wide). Cards in a row stay equal; sections never do.

## 4.10 Korean typography rules (mandatory)

- Display and h2 line-height: 1.15 for Korean, 0.98 for English. Set per language via a `lang` attribute selector, not a global.
- Body line-height: 1.7 Korean, 1.55 English.
- `word-break: keep-all` and `overflow-wrap: break-word` on all Korean text so words don't split mid-word at line ends.
- Letter-spacing on Korean display: -0.01em max. Latin can go to -0.02em.
- Pretendard Variable, self-hosted, subset to Korean plus Latin, woff2, `font-display: swap`. One file. No CDN.
- Korean headlines run longer than English for the same meaning; every headline container must tolerate one extra line without breaking layout.

## 4.11 Production rules (mandatory)

- `overflow-x: clip` on html and body. Rotated stickers and hard shadows will otherwise create horizontal scroll on mobile.
- Text on pink is always black. White on pink is 3.1:1 and fails AA. (Black on lime 17:1, on yellow 16:1, on pink 6.7:1, paper on ink 18:1, all pass.)
- Hard shadows are drawn with box-shadow, never with a duplicated element.
- Every rotated element is wrapped in an unrotated container that reserves its bounding box, so rotation never causes layout shift.

## 4.12 Home section blueprints (the build follows these, not the principles)

Grid is 12 columns, 1280px max, 24px gutters desktop, 16px mobile. Section vertical padding: dense 96px, sparse 160px, desktop; 64px and 112px mobile. Every section has a 3px black bottom border unless noted.

| # | Section | Split (desktop) | Background | Density | Overhang | Type | Motion |
|---|---|---|---|---|---|---|---|
| 1 | Hero | 7 / 5. Headline, sub, buttons left; sticker board right. Mobile: stacked, board below buttons. | paper | medium | Sticker board hangs 48px into section 2 | headline display, sub body 19px, buttons 17px | Entrance stagger, peel on stickers, press on buttons |
| 2 | Router | Headline full width, then 4 equal cards (2×2 on tablet, 1 column mobile). Company card yellow. | paper | dense | none (receives the hero overhang; top padding +48px) | h2, card titles h3, promise body | Press on cards |
| 3 | What we're not | Headline full width at h2 (it's long; allow 2 lines). Sub below. Then 4 cards: three grey struck cards at 3 cols each, lime card at 3 cols but 1.15× taller and shifted down 24px so it breaks the row. Footnote full width, label size, with asterisk tile. | yellow | dense | Lime card bottom edge crosses into section 4 by 24px | h2, card titles h3, bodies body | Strike draw on first view, press on lime card only |
| 4 | Programs | Headline 5 cols left with the "All courses" link under it; 3 cards stacked vertically in the right 7 cols, each full width of that column, staggered 16px right per card. Mobile: single column. | paper | medium | none | h2, titles h3, meta label | Press on cards |
| 5 | Story | 4 / 8. Photo left in a 4-col frame; a lime bordered block behind it, 120% of the photo size, rotated -3°, breaking through the section's top border by 40px. Text right, body at 19px, "Read the full story" link. Headline at h3 size, not h2: this section is quiet on purpose. | white | sparse | Lime block breaks up into section 4 | h3 headline, 19px body | Peel on photo |
| 6 | Platform | Headline and body full width at top. Then 5 / 7: four pillars stacked left as bordered rows (title h3, line body), flowchart right at full column width. Mobile: flowchart vertical, pillars below. | paper | dense | none | h2, pillar titles h3 | Flowchart draw on first view |
| 7 | Proof | 3 number tiles in a row, each tile: figure at display size, label under it at label size. First tile shifted down 32px and its bottom crosses into section 8. Logo and testimonial slots below, hidden while empty. Headline at h2 above. | pink, black text | medium | First tile breaks into section 8 | display figures, label labels | none |
| 8 | Final CTA | Headline display, paper text, left 8 cols. Body and lime button below it. Asterisk lime, 480px, rotated 15°, positioned right, cropped 40% off the right edge. | ink | sparse | Asterisk crops the viewport edge | display, 19px body | Press on button |
| 9 | Footer | 4 columns: lockup, links, contact, legal. Footnote line spans full width at the bottom in label size. 3px paper border on top. | ink | dense | none | label, body | none |

Rules that fall out of the table: two loud sections (3, 7), two sparse sections (5, 8), four overhangs at four different boundaries, and no two adjacent sections share a background. If a build produces two matching card rows in a row, it has diverged from this table.

## 4.8 What is deliberately absent

- No emoji anywhere, including the footer.
- No stock illustrations, no 3D, no isometric, no blobs, no "people with tiny heads."
- No gradients, no glass, no glow, no noise texture.
- No decorative pixel squares scattered around (the cyan pixel motif is reserved for the logo's superscript square and the pixel corner on the profile icon).
- No screenshots of the web app until it exists. The platform page uses the diagrams.

---

# Step 5: Motion spec

## 5.1 Principle

Motion on this site is physical, never atmospheric. Things press, lift, slide, and draw. Nothing fades, floats, drifts, or blurs. If an animation could be described as "smooth," it's wrong for this design.

DECIDE: No parallax. Three reasons. Parallax implies depth, and this design's whole identity is flatness. It's the most common way for a site to feel "designed" without saying anything. And it costs scroll performance on the mid-range Android phones a big chunk of Korean visitors will be on.

## 5.2 Inventory (everything that moves)

1. **Press.** Buttons and clickable cards on hover: translate 4px right and down, shadow shrinks to 2px. 120ms, ease-out. On active: translate 6px, shadow 0. This is the signature interaction and the only hover effect on buttons.
2. **Peel.** Stickers and photos on hover: rotation returns to 0°, lifts 2px up, shadow grows by 2px. 160ms. Applies to the hero sticker board, courses format stickers, team photos.
3. **Hero entrance.** On load, headline, sub, buttons, and sticker board slide up 16px from opacity 0 with an 80ms stagger, 220ms each. The stickers arrive last, each 60ms apart, landing at their rotation. Only on load, only on the hero, only once.
4. **Strike.** In section 3, the diagonal strike lines on the three cards draw from left to right (scaleX from 0) when the section first scrolls into view, 300ms each, 100ms stagger. Once. This is the one scroll-triggered animation on home, because this section makes the argument.
5. **Flowchart draw.** The onboarding flowchart's connectors draw in sequence when first in view, 200ms per segment. Once. Same treatment on the platform page.
6. **Toggle.** The KO/EN switch: the lime fill slides between cells, 150ms. The page itself doesn't animate; it's a navigation.
7. **Mobile menu.** Slides down as a solid block from under the nav bar, 200ms. Links inside don't stagger. Close is instant.
8. **Number tiles.** No count-up. The numbers are static. Count-up is the single most overused proof-section effect on the web.

Nothing else moves. Specifically not: section fade-ins, cards animating on scroll, floating shapes, cursor effects, text reveals, background shifts.

## 5.3 Reduced motion

Under `prefers-reduced-motion: reduce`: hero entrance, strike, and flowchart draw are removed (elements render in their final state). Press and peel keep their transform but drop the transition (instant). Toggle and menu become instant.

## 5.4 Implementation constraints for Claude Code

- All motion is CSS transitions and keyframes. Two IntersectionObservers total on home (strike, flowchart), each disconnecting after firing once.
- No animation libraries. No GSAP, no Framer Motion, no Lottie.
- Transforms and opacity only; never animate box-shadow directly (animate a pseudo-element or swap classes).
- Every transition has an explicit duration and easing; no `transition: all`.

---

# Open decisions summary

1. Marquee: cut (recommended) or kept below the router.
2. Parallax: none (recommended).
3. Photo treatment: full color with lime tape, or would you rather black and white. Color is my pick; it's more honest and the palette does the loud work.
4. Section backgrounds: section 3 yellow and section 7 pink are the two loud sections on home. Fine, or swap.
5. Icon set: 8 icons as listed. Anything you'd rather represent differently.
