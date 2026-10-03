# R4 loop: clay polish on courses/platform, then the rest of the site

Started 2026-10-04 after Eric handed R4 over ("do it yourself", "make a plan and with a loop and keep
building and improving"). Branch `rebrand-r4`, rebased on main ca93377.

Each pass: build → scroll-through screenshots at 390 and 1280 (Playwright, Chrome channel; a plain
headless capture misses lazy images and scroll reveals) → overflow check → list issues → fix → repeat.
Copy is frozen (see README). Nothing new gets written in Korean without Eric.

## Passes

1. [x] Rebase, `npm ci`, build (17 pages). Verify the seven R4 objects render: cap (courses hero),
   pencil (tracks), ring (measure), bubble (FAQ), asterisk (platform pillars), pencil (onboarding),
   books (second brain). All render, at both widths.
2. [x] Whole-site sweep: home, courses, platform, business, about, contact, students, 404, en/*.
   Horizontal overflow, clipped text, old neo-brutalist leftovers (hard black borders, flat pixel
   icons next to clay), clay colliding with headings or graphs.
3. [x] Fix pass for everything pass 2 finds; rebuild and reshoot only the pages touched.
4. [x] Parity spot-check (`parity.md`): nav, mobile menu, lang toggle, footer, FAQ, reduced motion.
5. [x] Weight check: clay WebP sizes, lazy loading below the fold, no layout shift from the stills.
6. [ ] Preview for Eric (phone-viewable artifact with the screenshots), then publish on his
   one-line OK (publish.sh serves review and production from the same directory).

## Log

- Pass 1: done. Screenshots in the session scratchpad (`r4/b-*`).
- Pass 2: no horizontal overflow on any of the 9 pages checked (ko + en). Found: business/about/contact
  hide their clay on phones; business table kept the old ink header and hard grid; second-brain graph
  puts 일정/Calendar on top of the center node at 390; flowchart and graph lines still hard ink.
- Pass 3: phone headers show the clay small above the h1; table is glass with a soft sun header;
  graph node moved (34,40 → 24,38) and nodes shrink under 600px; lines soft plum, flowchart heads
  are clay beads. Reshot business/about/contact/platform/en-platform: all clear.
- Pass 4: scripted (Playwright): mobile menu opens, focus moves in, scroll locks, Escape closes and
  returns focus; EN links keep the path; FAQ opens; reduced motion stops the clay float. All pass.
- Pass 5: clay stills 5-29 KB WebP, all load, CLS 0.001 on courses/platform/business. Home CLS 0.097,
  just under 0.1: worth a look (hero/carousel), not an R4 regression.
