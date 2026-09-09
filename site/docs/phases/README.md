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
| v3b | `v3b-polish.md` | Critical visual/UX review of 2026-09-10 and the polish it implies: privacy page, dead links, formats table on phones, phone density and h2 size, proof order, terminology pass | KakaoTalk and email, C-level decision, approval of phone paddings and 36 px h2 |
| v4 | `v4-visuals.md` | Photos in the reserved frames, one worksheet frame, track router diagram, OG images | Four photos, worksheet permission, Ted's consent |
| v5 | `v5-students-founders.md` | Students and founders pages with the waitlist story | Student course outline, founder offer, waitlist location |
| v6 | `v6-launch.md` | Domain and HTTPS (done), sitemap, robots, 404, Lighthouse baseline (done); analytics, search consoles, links, English path, Supabase checks (waiting) | Analytics pick, console meta tags, email and KakaoTalk, English-path pick |

All copy pages are live at https://innovlab.me: home (v1a), courses (v1b), platform and
contact (v2), companies and about (v3). Students and founders remain stubs until v5. v4 to
v6 are briefed (2026-09-09); v6's no-input half is built, the rest waits on Eric's answers
listed in each file.

## Organization, agreed 2026-09-08

| Nav | Page | Purpose | CTA |
|---|---|---|---|
| Courses / 과정 | /courses | The program, tracks, paths, formats, cost, FAQ | Survey |
| Platform / 플랫폼 | /platform | The app: profile, curriculum, knowledge base, community, toolkit | Survey |
| Companies / 기업 | /business | Training for teams, consulting and development, the inquiry form | Form |
| About / 소개 | /about | Story, timeline, beliefs, team, the asterisk | Survey |
| footer only | /contact | Where to reach us, three ways; no second form | Survey, form |
| not in nav | /students, /founders | Waitlist pages until the courses exist | App waitlist |

Home order: hero, router, what we're not, tracks (strip plus seven chips linking to courses),
formats, platform, story, proof, final CTA. Tracks detail lives only on the courses page.
"Business" became "Companies" because the page covers two businesses (training, and consulting
and development); it splits into two pages once a case study exists. The English site's CTAs
land on the Korean-only app; an English survey path or English waitlist is a v6 decision.
