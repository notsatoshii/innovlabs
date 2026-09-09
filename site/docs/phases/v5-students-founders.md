# v5: Students and founders pages

Goal: `/students` and `/founders` become real pages that say what each course is, who it
is for, and what joining the waitlist means, in the same voice as the rest of the site.

## What the site already holds (2026-09-09)

- `/students` is a `StubPage` (page name at h2, nothing else). `/founders` does not exist as a
  page; the home router's student and founder cards send people straight to the app's fork
  screen, which routes into the app's 3-screen waitlist stubs (survey spec, v1).
- Home already says: student course in development, waitlist now; founder and solopreneur
  track (스타트업·1인 사업자) on waitlist.

## Needs from Eric before the build

1. **The student course outline.** Home said "in development over the next 30 days" on
   2026-09-08. The page needs: who it is for (which students, which level), what it teaches
   at the level of the seven tracks' "name and who" cards, format (online, Seoul, both),
   length, and whether it follows the spine or is its own thing.
2. **The founder and solopreneur offer.** Is it the SMB track from the curriculum program
   (weeks 4 to 10 on the spine) or a separate shorter course? What a solopreneur leaves
   with, in one line.
3. **Where the waitlist lives.** Two options: keep sending people into the app's waitlist
   (one list, one login, matches the spec), or capture email on the site with no login
   (lower friction, a second list to reconcile). Recommendation: the app, because the
   survey already collects the profile the course will be personalised from.
4. **Pricing and dates**, if any exist by then; otherwise the pages say "waitlist first,
   details to the list".

## Changes

1. `/students`: hero (headline, one paragraph, waitlist CTA), who it is for, what you build
   (from the outline, same card style as the tracks), how it runs, what the waitlist gets
   you (first invite, the pilot price if there is one), FAQ (three to five items), final CTA.
2. `/founders`: same skeleton with the founder content; a line that connects it to the
   companies page for anyone hiring for a team.
3. Router cards on home link to the site pages first; the pages carry the app CTA.
4. Both pages in both locales; sitemap picks them up automatically.

## Not in this phase

Enrolment, payment, any change to the app's waitlist screens.

## Self-review checklist

- Nothing on either page promises what can't be shown (curriculum principle P12).
- Korean written from the intent, checked against the native-copy rule; no translationese.
- 360 px pass, both pages, both locales.

## Open for Eric after review

- Whether the student page should mention universities or programs by name once a partner
  exists.
