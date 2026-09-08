# InnovLabs site: phase plan

One file per phase. Hand a phase file to Claude Code on its own, review the result, then
the next. Each phase ends with a self-review, a publish to the review server, and a stop.

Truth sources for every phase: Eric's brain dump and the three curriculum docs (program,
principles and tool stack, spine week 1), the copy deck, the content map, the visual and
motion spec, all in `site/docs/`. Rule for all phases: nothing on the site promises what can't
be shown (curriculum principle P12); 저희 when InnovLabs speaks to the customer about itself.

| Phase | File | Scope | Needs from Eric |
|---|---|---|---|
| v1a | `v1a-home.md` | Home truth pass: seven tracks and the spine, honest program status, router that matches the app, proof note, custom-curriculum description | Done with Step 1 and 2 answers |
| v1b | `v1b-courses.md` | Courses page from the curriculum docs: tracks in detail, how a week runs, two paths, cost per learner, FAQ | Cohort-size decision, prices later |
| v2 | `v2-platform-contact.md` | Platform page (four pillars in depth, custom curriculum, open-source library), contact page | Email, KakaoTalk link |
| v3 | `v3-business-about.md` | Services page in the "max out our token limits" voice, inquiry form wired, about story from the brain dump | Form endpoint, co-founder name and photo, any clients |
| v4 | `v4-visuals.md` | Photos, worksheet imagery, session-rhythm diagram, track router diagram | Photos, permission to show real worksheets |
| v5 | `v5-students-founders.md` | Students page (once the course exists), founders page | Student course outline |
| v6 | `v6-launch.md` | Domain, HTTPS via Caddy on the droplet, analytics, SEO, Korean Lighthouse, app subdomain, English path in the app | Domain |

Draft subpages already exist in the repo (courses, platform, business, about, contact). They
are gated behind `PUBLIC_SHOW_DRAFTS=1` at build time and render as stubs otherwise, so a
publish never shows copy that hasn't had its phase.
