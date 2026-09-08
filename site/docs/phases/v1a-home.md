# v1a: Home truth pass

Goal: the home page says only what is true on 2026-09-08 and shows the product's real shape.

## Decisions (Eric, 2026-09-08)

- All six office-worker tracks (DOC, RES, DAT, SAL, CON, MGT) are bookable. SMB is waitlist.
- Online VOD is coming; say so. The custom curriculum is in development; describe it.
- Students: course in development over the next 30 days; waitlist now, with a description.
- Prices later. Cohort size (10 to 30) not published yet; Eric undecided.
- Venue: Seoul, either our space or the client's, depending on the cohort.
- Show all seven tracks publicly at name-and-who level only; no weekly detail on home.
- Friends' numbers (10+ hours) are real and stay as is, with a note on how cohorts are measured.
- Korean track names: the app's six plus 스타트업·1인 사업자.

## Changes

1. New section after "What we're not": **Seven tracks. One spine.** Three-cell strip (spine
   weeks 1 to 3, your track weeks 4 to 10, capstone weeks 11 to 12), seven track cards with
   code, name, who it's for, and a status label (Booking now / Waitlist). One line: the survey
   places you; between two tracks, you choose.
2. Router: worker card links to the tracks section; student card carries "course in
   development, join the waitlist" and links to the app's fork (student waitlist); founder
   card carries "waitlist open" and links to the app's fork (solo waitlist); company card
   unchanged.
3. Programs: status labels on the three cards (Booking now / Coming / In development);
   custom-curriculum body rewritten from Eric's description.
4. Proof: a note under the headline saying the hours are what friends reported before the
   course existed, and that cohorts are measured with a week-one baseline and week-twelve
   artifacts.
5. 저희 / 우리 pass on every Korean line touched.
6. Draft subpages gated behind `PUBLIC_SHOW_DRAFTS`; they render as stubs in a normal build.

## Not in this phase

Courses page detail (v1b), the session-rhythm diagram (v1b, v4), any pricing, photos.

## Open for Eric after review

- Publish the cohort range (10 to 30)? Recommendation: yes, on the courses page, because a
  buyer planning a team booking needs it and "small" is not a number.
- The router's student and founder cards now send people to the app's waitlists. Confirm
  that is the intended path rather than a site-side email capture.
