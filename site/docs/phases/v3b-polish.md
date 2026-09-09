# v3b: Visual, design, and UX review, with the polish phase it implies

Review date 2026-09-10, on the local build after Eric's Korean corrections (f8a82fd).
Method: every page in Korean at 375 px (phone) and 1280 px (PC), English home both sizes,
DOM audits for heading order, dead links, horizontal overflow, tap targets, form labels.

Verdict in one line: the PC site holds together and looks like one hand drew it; the phone
site, which is the primary device, is far too long, its headlines are set too large for the
new longer Korean copy, and three things a visitor will hit are broken or unfinished
(privacy link, KakaoTalk link, the formats table).

## Severity 1: fix before the next publish

Status 2026-09-10: item 1 built (`/privacy`, both locales, footer and form links). Item 2:
Eric says the dead KakaoTalk link is fine for now; leave it.

1. **Privacy policy link goes nowhere.** Footer 개인정보 처리방침 is `href="#"` on every
   page while the Companies form collects name, company, and email. 개인정보보호법 requires a
   reachable policy naming purpose, retention, and the deletion right. Fix: a `/privacy` page
   in both locales (the funnel app's consent screen text is the starting point), footer links
   to it, the form's consent line links to it too.
2. **KakaoTalk channel link is dead** (`href="#"` in the footer; "채널 링크 준비 중" chip on
   /contact). A live site with a placeholder in the footer of every page reads as unfinished.
   Fix: Eric supplies the channel URL, or the footer item is removed until it exists. Same for
   the email placeholder on /contact.
3. **Companies formats table hides its fourth column on phones.** The table is 640 px wide
   in a 343 px wrapper with `overflow-x: auto` and no visual cue, so 내용 (the column that
   says what each format is) is invisible unless the reader guesses to swipe. Fix: below
   900 px render the four rows as stacked cards (형식 as the card title, three label/value
   lines); keep the table on PC.

## Severity 2: the phone experience

4. **Home is 11,089 px tall at 375 px, about fourteen screens.** Section heights: hero 881,
   router 1,554, what-we're-not 1,374, tracks 1,081, programs 1,318, platform 1,895, story
   913, proof 808, final 473, footer ~800. Courses is 10,037. The design spec's paddings
   (dense 64 px, sparse 112 px on mobile) plus stacked cards plus display-size headlines add
   up to a page most office workers will not finish. Fixes, in order of effect:
   - Vertical flowcharts (home platform, /platform, /business 진행 순서) use 48 px
     connectors and left-aligned nodes: five nodes cost ~600 px of mostly air. Render them
     as a compact numbered rail on phones (node, short connector 20 px, node), or two
     columns.
   - Section padding on phones: dense 48 px, medium 64 px, sparse 80 px. Currently 64 / 88
     / 112.
   - Footer on phones: four stacked columns with 64 px gaps and a 64 px note margin. Collapse
     to two columns (links | contact) with 32 px gaps; ~800 px becomes ~450 px.
   - Router and programs cards: reduce card padding one step on phones.
5. **h2 minimum of 48 px is too large for the new Korean headlines.** `--text-h2` is
   `clamp(3rem, 6vw, 4.5rem)`; at 375 px that is 48 px, and Eric's corrected copy is longer
   than the old lines. "구독까지는 다들 했습니다. 하지만 결제한 AI로 뭘 해야 하는지는 아무도
   알려주지 않습니다." sets in six lines, "준비는 필요 없습니다. 지금부터 시작하세요." in four,
   "AI는 매일 바뀝니다. 따라가는 것만도 일입니다." in four. Fix: `clamp(2.25rem, 6vw, 4.5rem)`
   (36 px minimum on phones), keep Korean line-height 1.15. Alternatively shorten the two
   longest headlines; the yellow one could be "구독은 샀습니다. 쓰는 법은 못 배웠습니다." if
   Eric agrees, but the size change is the structural fix.
6. **The headline number is buried on phones.** In the proof section the "주 10시간+" tile
   has `order: 3` below 900 px so it can overhang into the final CTA, which puts the one
   number the section exists for after the two biography numbers. Fix: keep the overhang on
   the last tile but make that tile 10년+, and let 주 10시간+ lead; or drop the overhang on
   phones.
7. **The hero stat card competes with the headline.** On both sizes the boxed
   "한국은 ChatGPT 유료 결제는 세계 2위…" sits above the h1 as a three-line bordered block, so
   the eye reads it as the headline and the real headline as the sub. On PC the box is small
   and works; on phones it is the first thing on screen. Fix: on phones set it as a label-size
   line (13 px, bold, no box) above the headline, or move it under the sub as the footnote
   anchor it is.
8. **About page opens with an empty screen on phones.** The hero is only the headline in a
   sparse section, then a border, then a 100 px gap before the photo: the first viewport is
   the headline and paper. Fix: dense density on the about hero, photo directly under the
   headline.
9. **Rhythm bar and strike cards are invisible until their draw animation fires.** Both start
   at `scaleX(0)` and depend on an IntersectionObserver setting `data-drawn`. Reduced-motion
   is handled, but any script error (or a browser with IO disabled) leaves the 5/25/55/10/25
   bar empty and the struck titles un-struck. Fix: an `html.no-js` fallback that renders the
   final state, added by a one-line script in `Base.astro` that swaps the class.

## Severity 3: consistency and polish

10. **Terminology drift after the Korean corrections.** Home now says 공통 과정; the courses
    page still says 공통 뼈대 and 뼈대 모듈 (strip label, block title, formats card). Home says
    정규 기수; courses says 12주 코호트 and 코호트. Home router says 대기자 등록하기; the track
    chip says 대기 등록. Home's founder card is 대표 및 임원급 과정; the SMB track on both pages
    is still 스타트업·1인 사업자. Fix: one glossary pass over ko.json once Eric answers the
    C-level question (see below).
11. **Section headlines are inconsistent about full stops.** "세 가지 참여 방식." and "지금 내
    위치부터 확인하세요." end with periods; "하나의 공통 과정과 7개의 트랙", "안에 있는 것",
    "누가 가르치나" do not. Pick one rule (recommend: no period on fragments, period on full
    sentences) and apply it.
12. **English hero sticker's lime square overlaps the next line.** The superscript square at
    the end of "showed you" sits on the "w" of "what" on phones. Korean is fine because the
    phrase ends the headline. Fix: hide the square when the sticker phrase is not the last
    line, or give the square `pointer-events: none` and a 2 px white outline so the overlap
    reads as intended.
13. **Company card on the router has two tiny links (교육, 개발) stacked under a one-line
    promise.** Every other card has a single bold link. Fix: one link "자세히 보기 →" to
    /business, with the two anchors as a secondary line on PC only.
14. **Story section on phones shows a yellow "E" initial the size of the screen** because the
    photo frame is full-width with the display-size fallback glyph. Until the photo exists
    (v4), cap the frame at 60 % width on phones, or use the wordmark tile instead of the
    initial.
15. **Contact page is a stub on PC.** Headline, one line, a 2×2 box, then the CTA; two thirds
    of the viewport is paper. Either fold /contact into the footer entirely (the spec already
    says footer-only) or give it the three ways as the same cards the router uses.
16. **The footer's privacy link is 18 px tall**, the smallest tap target on the site; the
    other footer links are 29 px with 8 px gaps, tight for thumbs. Fix: 44 px row height in
    the footer on phones.
17. **Mobile menu: verify on a real phone.** Code reads correctly (fixed overlay under a
    sticky header, focus trap, Escape, body scroll lock), but my capture showed the overlay
    covering the header, which would hide the close button. The pane I test in has known
    viewport quirks, so this may be an artifact. Two minutes on a phone settles it.
18. **Sticker board's third sticker ends 18 px from the viewport edge** on 375 px. Not
    clipped, but the shadow touches the edge; pull `.s3` margin-left from 48 % to 40 %.

## What is right and should not be touched

- PC layouts across all six pages: asymmetric splits, one loud section per page, overhangs,
  horizontal flowcharts, the timeline, the node graph, the changelog wall, the form.
- Type system and the Korean typography rules (keep-all, line-height per language).
- FAQ as native `<details>`, form labels on every field with autocomplete, skip link, one
  h1 per page, alt text present, no horizontal scroll on any page at 375 px.
- Motion inventory matches the spec; nothing fades or floats.

## Needs from Eric

- The C-level decision (English card name, and whether the SMB track name follows).
- KakaoTalk channel URL and the contact email, or permission to remove both until ready.
- Approval of the phone paddings and the 36 px h2 minimum (a visible change to the look).
- Whether to shorten the yellow section headline or keep it at six lines.

## Build order for v3b

1. Privacy page + footer and form links (items 1, 2).
2. Formats table to cards on phones (3).
3. Phone density: flowchart rail, section paddings, footer, card padding (4).
4. h2 clamp and hero stat treatment on phones (5, 7).
5. Proof tile order, about hero, no-js fallback (6, 8, 9).
6. Terminology and punctuation pass on ko.json after Eric's answers (10, 11).
7. Small fixes (12 to 18).
8. Re-run the phone captures and Lighthouse; publish; stop for review.
