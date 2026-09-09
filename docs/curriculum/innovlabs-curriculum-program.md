# InnovLabs Curriculum Program: Goals, Template, and Build Loops

Purpose: build the first seven curriculums to a standard where someone other than Eric can teach them, a student can be placed into them from the survey, and the platform can host them. Eric reviews at every gate. Claude drafts, self-critiques, revises, then submits.

---

## 1. What "done" means (the goals checklist)

A curriculum is finished only when every line passes. This is the gate for locking any curriculum.

**Outcomes**
- [ ] 5 to 8 outcome statements, each starting "By the end, the learner can…", each observable in a deliverable, none using "understand," "appreciate," or "be familiar with"
- [ ] One capstone artifact the learner builds on their own real work and keeps using after the course
- [ ] A measurable claim about time saved or output gained, and the method by which the course measures it (baseline in session 1, remeasure at the end)

**Structure**
- [ ] Every session has one objective, one artifact produced in-session, and homework that feeds the next session
- [ ] Session plan is timed to the minute for the full block, with no segment longer than 20 minutes without the learner doing something
- [ ] At least 50% of every session is the learner working on their own material, not watching
- [ ] Pre-work for session 1 gets the learner's tools and accounts working before they arrive, so session 1 isn't setup

**Placement**
- [ ] Entry criteria map to specific survey answers (which answers place someone here, which place them elsewhere)
- [ ] Exit criteria say what someone can do that qualifies them for the next level
- [ ] A learner who arrives one level too low or too high has a documented path (catch-up pack, or skip-ahead)

**Durability**
- [ ] Every session separates the durable layer (concepts, judgment, workflow patterns) from the volatile layer (specific tools, models, UI). Volatile content is dated and lives in a swappable appendix
- [ ] The course still makes sense if the primary tool is replaced; the exercises reference "your assistant" and "your automation tool," with the current picks named only in the appendix

**Teachability**
- [ ] Instructor guide per session: what to say, what to demo, what goes wrong and how to recover, what to cut if running long
- [ ] Materials inventory complete: slides, worksheets, templates, prompt library, checklists, homework sheets, each listed with status
- [ ] A second instructor could run it from the documents alone. Test: Eric reads the session 3 guide cold and can teach it tomorrow

**Honesty (brand rule)**
- [ ] No promised outcome we can't demonstrate in the room
- [ ] Nothing that teaches learners to pass off AI output as their own without judgment
- [ ] Students curriculum specifically: every exercise makes the learner do more thinking, not less

**Localization**
- [ ] Korean and English versions of all learner-facing materials, written natively, not translated
- [ ] Examples use Korean workplace and school realities (카톡 workflows, 한글 documents, 학원 schedules, 결재 flows) not US defaults

**Platform**
- [ ] Course metadata ready for the web app: code, name, level, audience, format, duration, prerequisites, outcomes, session list
- [ ] Post-course path into the platform named (which community track, which knowledge base sections, which next course)

---

## 2. The first seven (decided Aug 2026, in the AI curriculum project)

Architecture: one shared spine plus seven track cartridges. Tracks are routed by dominant task cluster (what the bulk of a learner's week actually is), with department, seniority, and industry as secondary personalization signals.

**Spine (shared by all seven)**
- Weeks 1 to 3: pipelines, agents, memory, harnesses, the compound loop; tool fundamentals; the Work Map exercise (the survey pre-populates it)
- Weeks 11 to 12: capstone. One fully running system on the learner's real job, before/after with artifact evidence, handoff into the platform

**Cartridges (Weeks 4 to 10, one per track)**

| # | Code | Track | Who | Cartridge status (v1) |
|---|---|---|---|---|
| 1 | DOC | Documents & Admin | 보고서, 회의록, 기안서/품의서, repetitive comms, consolidation. Admin, HR, ops, juniors | Drafted at week-outline level |
| 2 | RES | Research & Planning | Research, synthesis, 기획안/제안서. Planning, strategy, consultants, researchers | Drafted at week-outline level |
| 3 | DAT | Data & Numbers | Spreadsheet-centric work, cleaning, recurring analysis, dashboards | Drafted at week-outline level |
| 4 | SAL | Sales & Customer | Prospect research, outreach, CRM, follow-ups, CS responses. Inbound/outbound fork inside the track | Not drafted |
| 5 | CON | Content & Marketing | SNS, 카피, blog, 상세페이지, multi-format repurposing, brand-voice harnesses | Not drafted |
| 6 | MGT | Management & Coordination | 팀장/PM/파트장: status synthesis, meeting load, cross-stream visibility, upward reporting. Oversight systems, not production systems | Not drafted |
| 7 | SMB | SMB / Startup / Solopreneur | Whole-business, not single-function. No IT restrictions, so the natural home for full agent/server content. Buyer is the learner | Not drafted |

**Fixed structure inherited from master v1**
- 12 weeks × 1 session × 2 hours, offline, blended with async
- 3 blocks × 4 weeks (Foundations / Build / Deepen & Capstone), each block sellable alone
- Session rhythm every week (revised Sept 2026): 0:00 to 0:05 open; 0:05 to 0:30 concept and live demo; 0:30 to 1:25 build lab on own work from a template; 1:25 to 1:35 share-out and assignment brief; 1:35 to 2:00 free talk and Q&A, fixed length, never cut
- Weeks 4 to 5: two-week deep dive on the track's highest-value workflow. Week 9: verification week. Week 10: integration into a personal system map plus capstone plan
- Two technical paths: browser-only tools and full agent/server, as separate paths within a track
- Measurement: baseline from the survey, capstone before/after on the same task with artifact evidence, never self-reported time
- Derived formats: 2-day intensive workshop plus 3 to 4 weeks async follow-up; VOD = spine modules plus cartridge demos
- Two Korean-native asset classes built from the start: the harness template library and synthetic Korean corporate datasets

**Where "ultra detailed" applies**
Master v1 is at the level of "week: concept, lab, deliverable." The goals checklist in §1 requires session plans timed to the minute, exercises with failure modes, instructor scripts, and a materials inventory. That depth exists for zero sessions today. The gap is 5 spine sessions plus 7 × 7 cartridge sessions = 54 sessions to bring to full depth, plus four cartridges to draft at arc level first.

Launch caveat carried over from the project chat: don't launch all seven at once. DOC and RES are the safest B2B pools, SMB the safest B2C. The survey can diagnose all seven while only some have live cohorts.

## 3. The curriculum spec template

Every curriculum is one document with these twelve sections, in this order. This is the artifact the loops produce.

**§1 Identity.** Code, working name, audience, level, format, duration, session length, cohort size, prerequisites, price tier (placeholder), version and date.

**§2 The promise.** Outcome statements (5 to 8). Capstone artifact, described concretely. The time or output claim and how it's measured.

**§3 Learner profile.** Job or role, daily work, what they already pay for and don't use, what they've tried and why it didn't stick, fears (looking incompetent, being replaced, cheating), what a win looks like to them in week 2 and in month 3. Written as a paragraph, not a persona card.

**§4 Design principles for this curriculum.** 4 to 6 rules specific to this audience that shape every session. (Example for students: "the AI never gives the answer; it asks the next question.")

**§5 Session arc.** Table: session number, title, objective, in-session artifact, homework, which outcome statements it serves. The arc must show a build: each artifact is used by a later session.

**§6 Session plans.** One per session:
- Objective (one sentence)
- Pre-work (what they bring)
- Timed plan, minute by minute, in blocks: opening (recap, baseline), demo, guided build, solo build on own material, review, homework brief
- Exercises, each with: the learner's input (their own material), the steps, what "done" looks like, common failure and fix
- Artifact produced
- Homework
- Instructor notes: talking points, demo script, what goes wrong, what to cut when behind, what to add when ahead
- Materials used (by ID)

**§7 Tool stack.** Durable layer: the concepts and workflow patterns, tool-agnostic. Volatile layer: current tool picks, dated, with the reason for each pick and the fallback. Cost per learner per month at current pricing.

**§8 Assessment and placement.** Entry: survey answers that place a learner here. Baseline exercise in session 1. Checkpoint mid-course. Exit: what they demonstrate. Next course.

**§9 Materials inventory.** Every slide deck, worksheet, template, prompt, checklist, and homework sheet, with an ID, the session it serves, format, and status (spec'd / drafted / reviewed / final).

**§10 Instructor guide.** Running the cohort: pacing across 12 weeks, what to watch for by week 4, handling the fast learner and the stuck learner, the guest session (if any), closing and handoff to the platform.

**§11 Localization notes.** Korean-specific examples, terms to keep in English vs translate, cultural adjustments (hierarchy in the room, reluctance to show unfinished work, parent communication for students).

**§12 Change log.** Version history and what changed. The volatile appendix is expected to change every quarter; the log shows it.

---

## 4. The loops

Three nested loops. Loop A runs once on the spine. Loop B runs once per cartridge. Loop C runs once per session inside either.

### Loop A: Spine and shared assets (once)

The spine already exists at outline level in master v1. Loop A brings it to full depth, because every cartridge inherits it.

A1. Confirm this document and the seven.
A2. Shared design principles: the teaching rules that apply to all seven. Seeds: master v1's course-wide principles, the AOP "we don't" list (no ethics theater, no transformer theory, no prompt tricks, no future-of-AI speculation), the brand beliefs. Eric reviews.
A3. Baseline tool stack, dated, on both technical paths (browser-only and agent/server), with cost per learner per month. Eric supplies what the team actually runs.
A4. Spine session plans: Weeks 1, 2, 3, 11, 12 through Loop C. These five sessions set the depth standard every cartridge copies.
A5. Shared materials: the Work Map exercise, the baseline measurement sheet, the workflow card template, the homework sheet, the capstone evidence template.
A6. Survey mapping: which answers in the v1.1 survey schema (from the web app project) route to which track, and the hybrid fallback (about 20% of takers have no dominant cluster; default to DOC or offer top two). Note: the survey carries category-level task data, not task rows; the Work Map is seeded from categories and task rows are built in Week 1.

Gate: Eric signs off A2 through A6. Cartridge work starts after A4 is locked, so the depth standard is real before it's copied seven times.

### Loop B: One cartridge (seven times)

B1. For undrafted tracks (SAL, CON, MGT, SMB): draft §1 to §4 (identity, promise, learner profile, track principles). For drafted tracks (DOC, RES, DAT): review v1 against the goals checklist, revise §1 to §4. Submit.
    Gate: Eric reviews. The outcome statements and the capstone artifact are the things to fight over.
B2. Draft or revise §5, the Weeks 4 to 10 arc: seven rows, each with objective, artifact, homework, outcomes served. Check the Week 4 to 5 deep dive is the track's highest-value workflow, Week 9 is verification, Week 10 is integration. Submit.
    Gate: Eric reviews the arc as a table.
B3. Loop C for the seven cartridge sessions.
B4. §7 to §12 (tool stack appendix for this track, placement, materials inventory, instructor guide, localization, change log). Submit.
    Gate: the "read Week 6 cold" test and the goals checklist. Lock.

Build order: DOC first (universal foundation and the hybrid fallback), then RES, then DAT (the three with v1 drafts, so the process is tested on existing material), then SMB (B2C launch pool and the agent/server path's home), then SAL, CON, MGT.

### Loop C: One session

C1. Draft the full session plan (§6 format) for one session, on the fixed 2-hour rhythm (5 / 25 / 55 / 10 / 25).
C2. Self-review: timed to the minute; the 60-minute build lab is on the learner's own material with a template start; artifact produced; homework feeds next session; volatile tool content in the dated appendix; failure modes listed; both technical paths covered where they diverge.
C3. Submit in batches of three sessions with a three-item "unsure about" list on top. Eric reviews a batch, marks up, returns.
C4. Revise, resubmit, lock.

A cartridge is seven sessions, so two and a half batches. The spine is five sessions, two batches.

### Review conventions

- Eric marks up in the document or in chat by track code and section (DOC §6 W6, for example). Claude never rewrites a locked section without an explicit unlock.
- Every submission opens with "what I'm unsure about," three items max.
- Disagreements resolve by the goals checklist first, the brand beliefs second, Eric's call third.
- Master v1 stays the single source of truth; this program produces v2 of that document, section by section, not a parallel file.

---

## 5. Immediate next steps

1. Eric confirms this document reflects the project chat correctly.
2. Claude drafts A2 (shared principles) and A3 (tool stack, needs Eric's input) for review.
3. Claude drafts spine Week 1 as the first full-depth session, alone, as the depth calibration. Eric reviews it before any batch work starts.
4. Loop A continues with Weeks 2, 3, 11, 12.
5. Loop B on DOC.

Volume: 54 sessions to full depth plus four arcs. At one review per day, roughly ten to twelve weeks to have all seven locked. DOC, RES, and the spine can be locked in three to four weeks, which is enough to run cohort 1 on the two safest B2B tracks.
