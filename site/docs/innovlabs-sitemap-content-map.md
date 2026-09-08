# InnovLabs Website: Sitemap and Content Map

This is the "what goes where" document. Every page, every section, every copy slot, every visual slot. Step 3 (copy) fills the slots. Step 4 (visual system) designs the visual slots. Step 6 turns pages into Claude Code phase files.

## Ground rules

- Stack: Astro, vanilla CSS, Pretendard. Korean at `/`, English at `/en/`. All copy lives in `src/i18n/ko.json` and `src/i18n/en.json`.
- Two conversion paths. Individuals: survey in the web app. Organizations: inquiry form on /business.
- Copy slot naming = JSON key naming. `home.hero.headline` in this doc is `home.hero.headline` in the JSON. Claude Code never invents keys.
- Slot types: H = headline, S = subhead or supporting line, B = body paragraph, L = list of short items, CTA = button or link label, V = visual slot (not copy; described so the visual system knows what to design).
- Voice: blunt, plain, anti-hype. We name what we're not. No exclamation marks. No "unlock," "empower," "supercharge," "journey," "revolutionize." Numbers only if real.
- Build phases: P1 home skeleton and design system, P2 home content complete, P3 motion and polish, P4 subpages, P5 audience pages.

---

## Global elements (P1)

**Nav**
- Logo lockup (asterisk tile + INNOVLABS + superscript square), links to home
- `nav.courses`, `nav.platform`, `nav.business`, `nav.about` (L)
- `nav.cta` (CTA, small bordered button): survey
- Language toggle: KO / EN as a two-cell bordered switch, active cell filled lime
- Mobile: full-screen overlay menu, giant type

**Footer**
- Logo lockup
- Column 1: page links
- Column 2: `footer.contact_label`, email, location line (Seoul)
- Column 3: socials (only the ones that exist)
- `footer.footnote` (S): the one-liner, "* everything here is an experiment." Once, only here.
- `footer.legal`: company name, year, privacy link

---

## HOME `/` (P1 skeleton, P2 content)

**Purpose:** sort visitors into the two paths in under 10 seconds, then convince the individual path to take the survey.
**Primary CTA:** survey. **Secondary CTA:** "For companies," routes to /business.
**Decisions locked (Sept 2026):** nine sections; story block added; instructors cut from home; no "coming" tags on platform pillars; Korea stat lives in section 3, not the hero.

### 1. Hero
- `home.hero.headline` (H), locked: "You already have AI. Nobody showed you what to do with it." Pink sticker on "showed you." Superscript pixel square on the last word.
- `home.hero.sub` (S), locked: "This is what happens when someone shows you how to make it work."
- `home.hero.cta_primary` (CTA): survey
- `home.hero.cta_secondary` (CTA, text link): for companies
- V: sticker board, four overlapping bordered stickers at slight rotations, locked: the logo tile, "12-week program," "Taught in Seoul," "Ages 12 to CEO."

### 2. Audience router
- `home.router.headline` (H): "Which one are you" energy, not that phrasing.
- Four cards. Promises locked:
  - `home.router.worker`: "Same job, half the grind. Practical AI for people who don't code." Routes to /courses.
  - `home.router.student`: "Learn how to learn anything. Build your own way of studying, and keep it for life." Routes to /students (P5), /courses until then. The "AI isn't cheating" answer lives on the students page, not here.
  - `home.router.founder`: "Marketing, outreach, investors, contracts, design. Do the work of a team you can't afford yet." Routes to /founders (P5), /courses until then.
  - `home.router.company`: value prop "Train your team to use AI for real work, or build your own in-house AI tools with us." plus two stacked links, Training and Development, both to /business anchors. Yellow fill to mark the organization path.
- V: simple hand-drawn-style inline SVG icon per card.

### 3. What we're not
- `home.not.headline` (H), locked: "Korea is second in the world at paying for AI. But not even top 10 at using it.*"
- `home.not.sub` (S), locked: "The subscriptions got bought. The second half never got taught. Here's what filled the gap."
- Three struck-through cards, each two sentences on why it fails a normal person. Tone is diagnosis, not contempt; the word "scam" never appears in copy:
  - `home.not.money`: sells outcomes instead of skills
  - `home.not.fluff`: describes AI instead of using it
  - `home.not.bootcamp`: builds products when you just wanted your week back
- Lime card `home.not.us`, locked: title "Not prompts. Workflows." Body: "AI that runs inside the work you already do. We teach the setup, the habits, and the judgment, using the same tools we run our own companies on."
- `home.not.footnote` (S): the asterisk source line. Paid rank: OpenAI, June 2025. Usage: not in top 10 for ChatGPT web traffic, SimilarWeb via Asia Economy, Aug 2025. Supporting: 21st in downloads, Sensor Tower, 2026.
- V: the three "not" cards get a thick diagonal strike and a slightly desaturated fill. The lime card gets the hard shadow. Loudest section on the page.

### 4. Programs
- `home.programs.headline` (H)
- Three cards: `home.programs.irl`, `.online`, `.custom`, each with `.title` (H), `.body` (B, two sentences), `.meta` (S, format and length)
- `home.programs.link` (CTA): all courses, to /courses
- V: type-led cards, no icons. Custom card carries a tiny flowchart glyph.

### 5. Why we started this
- `home.story.headline` (H)
- `home.story.body` (B): three or four sentences in Eric's first-person voice, built around: friends asked for help setting up their systems, they got 10+ hours a week back, they told him to teach it.
- `home.story.link` (CTA): to /about
- V: one photo of Eric as a bordered sticker with hard shadow. Co-founder photo added later.

### 6. Platform
- `home.platform.headline` (H): the "AI changes daily" problem
- `home.platform.body` (B): two or three sentences. Hard to keep up even for us. So we built the place to keep up.
- `home.platform.pillars` (L): four items, no "coming" tags: Custom profile and curriculum, Knowledge base, Community, Toolkit
- `home.platform.cta` (CTA): survey
- V: the onboarding flowchart, bordered boxes and thick arrows: Survey, Google login, Your report, Your curriculum, Your second brain. The page's one diagram; make it big.

### 7. Proof
- `home.proof.headline` (H)
- `home.proof.numbers` (L), locked, three: "10+ hours a week" (back, per person, from setting up their systems; never say "average"), "20+ years" (co-founder in emerging tech), "10+ years" (Eric in emerging tech)
- `home.proof.logos` (V): empty slot, hidden until real logos are supplied
- `home.proof.testimonials` (L): empty slot, hidden until real names are supplied
- Instructors: cut from home. The "uses daily" line moves to /about team bios.
- V: numbers as three huge bordered tiles.

### 8. Final CTA
- `home.final.headline` (H): giant
- `home.final.body` (S): two sentences max
- `home.final.cta` (CTA): survey
- V: ink background, oversized asterisk cropped at one edge.

### 9. Footer (global)
- Socials: KakaoTalk channel only, placeholder link until live.

---

## COURSES `/courses` (P4)

**Purpose:** let an individual pick a format and understand what they'd get, then take the survey (which recommends the right one).
**Primary CTA:** survey. **Secondary:** inquiry for group or corporate bookings, to /business.

### 1. Hero
- `courses.hero.headline` (H), `courses.hero.sub` (S)
- V: three format stickers stacked, IRL / Online / Custom.

### 2. How levels work
- `courses.levels.headline` (H)
- `courses.levels.body` (B): classes run at multiple levels; the survey places you.
- `courses.levels.items` (L): level names and one line each (define the level names in step 3).

### 3. IRL courses
- `courses.irl.headline` (H), `.body` (B)
- Breakdown table: `courses.irl.table` with rows: Length (12 weeks standard, adjustable), Format (in person, Seoul), Group size, Who it's for, What you leave with, Taught by
- `courses.irl.outline` (L): sample 12-week arc, one line per phase (not per week). Also list workshop and long-term variants.
- V: bordered table with alternating paper/white rows. A 12-cell progress strip as a visual of the 12 weeks.

### 4. Online courses
- `courses.online.headline` (H), `.body` (B), same table shape
- V: screenshot placeholder of the course player, bordered sticker frame. Real screenshot once it exists.

### 5. Custom curriculum
- `courses.custom.headline` (H), `.body` (B): built from your data, your learning style, your level, in the web app; you learn to build your own second brain
- `courses.custom.steps` (L): survey, profile, curated curriculum, ongoing adaptation
- `courses.custom.cta` (CTA): survey
- V: the onboarding flowchart again, smaller.

### 6. Who teaches
- Reuse `home.proof.instructors`, fuller bios: `courses.instructors.{n}.bio` (B)

### 7. FAQ
- `courses.faq` (L): 6 to 8 question and answer pairs (language of instruction, prerequisites, laptop needed, which AI tools, refunds, corporate bookings, student age range, online vs IRL difference)

### 8. Final CTA (survey) + corporate line linking to /business

---

## PLATFORM `/platform` (P4)

**Purpose:** explain the web app and community well enough that someone signs up before it's fully live.
**Primary CTA:** survey / join.

### 1. Hero
- `platform.hero.headline` (H): the daily-change problem
- `platform.hero.sub` (S)
- V: a "changelog wall": bordered tiles with fake-but-honest labels like "new model," "paper," "repo," "tool update," dense and slightly overwhelming on purpose, then the InnovLabs asterisk tile cutting through it.

### 2. What's inside
- Four blocks, each `platform.inside.{profile|knowledge|community|toolkit}.title` (H) + `.body` (B, three sentences) + `.bullets` (L, 3 items)
- V: one simple SVG per block.

### 3. How onboarding works
- `platform.onboarding.headline` (H)
- `platform.onboarding.steps` (L): survey, Google login, your report, your profile, your curriculum
- V: the big flowchart, hero-sized.

### 4. The second brain
- `platform.brain.headline` (H), `.body` (B): what it is in plain words, why it's the goal, how the platform teaches you to build yours
- V: a node-graph doodle, bordered nodes, thick lines, no gradients.

### 5. Who it's for
- `platform.who.body` (B): all levels, ages, professions. One paragraph.

### 6. Final CTA

---

## BUSINESS `/business` (P4)

**Purpose:** the organization path. Two offers on one page with one form.
**Primary CTA:** inquiry form.

### 1. Hero
- `business.hero.headline` (H), `.sub` (S)
- Two big bordered buttons that jump-scroll: `business.hero.jump_training` (Corporate training), `business.hero.jump_services` (Consulting and development)

### 2. Corporate training
- `business.training.headline` (H), `.body` (B): who buys this (HR, L&D, team leads), what changes for the team
- `business.training.formats` (L): workshop, multi-week program, department-specific tracks, executive session
- `business.training.outcomes` (L): concrete deliverables (workflows built during the course, tool setup, measured hours)
- `business.training.process` (L): scoping call, needs assessment, curriculum, delivery, follow-up
- V: bordered table comparing formats.

### 3. Consulting and development
- `business.services.headline` (H), `.body` (B): product architects and engineers, 10+ years each in emerging tech, hardest use cases daily, DX and AX
- `business.services.offer` (L): AI transformation consulting, product architecture, custom development, workflow automation, AI cost optimization
- `business.services.method` (B): complex things made easy to use; efficiency and revenue
- `business.services.work` (L): 2 to 4 things built, real, one line each. Reuse Lumberworks case material where it fits.
- V: bordered "case cards" with a single metric each.

### 4. Team
- Reuse instructor photos; `business.team.{n}.credentials` (S)

### 5. Inquiry form
- `business.form.headline` (H)
- Fields: name, company, role, email, interest (training / services / both), team size, message
- `business.form.submit` (CTA)
- Astro static: form posts to Formspree or Netlify Forms; decide in P4.

---

## ABOUT `/about` (P4)

**Purpose:** trust. This is where the origin story lives, first person, long-form allowed.

### 1. Hero
- `about.hero.headline` (H)

### 2. The story
- `about.story.body` (B, multi-paragraph, first person, Eric's voice): 2019 friend at OpenAI, early GPT-3 API access, building with AI daily, friends asking for help, the tens of hours, "why don't you teach this," co-founding with someone you first taught. Keep it honest and specific; this is the best material on the site.
- V: a hand-drawn timeline, 4 or 5 bordered milestones.

### 3. What we believe
- `about.beliefs` (L): 4 to 5 short statements (AI should make you smarter not dumber; teach what you use; results are measured in hours and output; keep up or fall behind, so keep up together; everything is an experiment)

### 4. Team
- Full bios, photos, `about.team.{n}.name`, `.role`, `.bio` (B), `.uses_daily` (S)

### 5. Footnote block
- `about.footnote` (B): what the asterisk means. The one place the brand concept is explained.

### 6. CTA: survey + business link

---

## CONTACT `/contact` (P4, light)

- `contact.headline` (H), email, location, link to /business form for companies, socials. No form here; the business form is the form.

---

## STUDENTS `/students` and FOUNDERS `/founders` (P5)

Audience landing pages. Same skeleton: hero in that audience's language, their specific problem, the program that fits, proof from that audience, survey CTA. Not specced until P4 is live and we've seen what converts.

---

## Copy inventory (for step 3)

Total slots to write for P1 + P2 (home and globals): roughly 60. For P4: roughly 180 more. English first, section by section, in this order: home hero, router, what we're not, programs, platform, proof, final CTA, nav and footer. Then Korean, together, same order.
