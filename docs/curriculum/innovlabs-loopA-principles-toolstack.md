# Loop A2 and A3: Shared Design Principles and Tool Stack

Applies to all seven tracks and the spine. Every session plan is checked against A2 before submission. A3 is the dated appendix every session points at instead of naming tools inline.

---

## A2. Shared design principles

Sources: the guide's five concepts (pipelines, agents, memory, harnesses, compound loop), master v1's course-wide principles, the AOP "we don't" list, the brand beliefs, and the choices already made in the Week 1 draft. Fourteen principles in four groups. Each one has a test so a session plan can be checked against it, not just inspired by it.

### Group 1: What we teach

**P1. Systems, not prompts.** Every session moves the learner one step from asking questions toward owning a system: context that persists, a workflow that repeats, a check that catches errors. A prompt trick that doesn't become part of a system is out of scope.
Test: name the system component this session adds. If there isn't one, the session is a lecture.

**P2. The durable layer is the course; the tools are the appendix.** Concepts, judgment, and workflow patterns are taught in the plan. Tool names, models, UI, and prices live in the dated A3 appendix and are referred to as "your assistant," "your automation tool," "your knowledge tool" in every exercise.
Test: grep the session plan for product names. Any hit outside the appendix is a defect.

**P3. Processing gets automated; thinking gets protected.** The course's job is to hand processing to the system and give the freed hours back to judgment. We never teach a learner to outsource a decision, a relationship, or a quality check.
Test: every exercise ends with a stated "what's left for a human." If it's empty, the exercise is wrong.

**P4. We don't.** No ethics theater (ethics is handled in the minutes where it meets implementation: data, consent, disclosure). No transformer theory. No prompt engineering tricks as content. No future-of-AI speculation. No "make money with AI."
Test: any segment over five minutes on any of those five is cut.

### Group 2: How a session runs

**P5. Own work, from a template.** The lab is always on the learner's real recurring task, started from a provided template or example, never from a blank page and never from a made-up case. Synthetic Korean packs exist for learners who can't use company material; they're a substitute for the data, not for the "own task" rule.
Test: the lab's input line names the learner's own task. Synthetic packs appear only as the fallback.

**P6. Every session leaves an artifact that a later session uses.** A Work Map feeds harness selection. A harness feeds a pipeline. A pipeline feeds the capstone. Nothing is built once and abandoned.
Test: for each artifact, name the later session that consumes it.

**P7. The assignment is real work, logged.** Homework is doing a task from the job with the new method and recording time and output evidence. It's never reading, never a worksheet. The logs are the before/after data.
Test: the assignment has a time log field and an evidence field.

**P8. Learners do for at least half the session.** The 55-minute lab is the floor, not the ceiling. Concept and demo are capped at 25 minutes. If the instructor is talking at 0:31, something's wrong.
Test: the timed plan; sum the learner-active minutes.

**P9. The rhythm is fixed.** 5 open, 25 concept and demo, 55 lab, 10 share-out and assignment, 25 free talk and Q&A. The free talk block is never cut. Same shape every week so nobody has to learn the class, only the content.
Test: the five timestamps in every plan.

**P10. Demo the failure first.** The live demo shows the way most people do it and lets it fail in front of the room, then shows the method. Never a polished demo alone; the contrast is the lesson.
Test: the demo script has a Round 1 that produces something nobody would send.

### Group 3: Evidence and honesty

**P11. Artifact evidence, never self-report.** Time saved is shown by the original output and its logged duration next to the new output and its logged duration, with a quality checklist. "I feel faster" is not data. This is the graduation requirement and the B2B sales argument.
Test: the capstone evidence package has both outputs, both durations, one checklist.

**P12. Nothing promised that can't be shown in the room.** The guide's numbers, the brand's numbers, and the course's numbers all trace to a source or a log. A session plan never states an outcome number it can't demonstrate live.
Test: every number in a plan has a source or a log behind it.

**P13. Verification is content, not a caveat.** Catching what the assistant got wrong (invented numbers, wrong register, missing sections) is taught as a skill with drills, planted errors, and a habit checklist. Week 9 is a verification week in every track, and every session has at least one "check it" moment.
Test: the plan names the check the learner performs on their own output.

### Group 4: The room

**P14. Neutral to seniority, private by default.** Tests and exercises are about tasks, not people (the temp test, not "is your job easy"). Learners show work to a partner they choose; the room hears only lines, not documents. Confidential material never enters a tool in class. Juniors aren't called on first. A 팀장 who won't classify their own week maps their team's.
Test: the share-out segment has a pairs step before any room step, and the room step exposes no artifact.

### Checking Week 1 against A2

P1: adds the Work Map and the context-first method. P2: passes after the tool names were moved to the appendix. P3: "what's left for a human" line, present. P4: the parking lot segment is five minutes, at the limit; fine. P5: lab input is the learner's candidate #1; synthetic pack is fallback only. P6: Work Map feeds Weeks 2 and 3; drill sheet feeds Week 2. P7: time log with evidence field. P8: 55 lab plus 10 share-out plus 25 free talk = 90 learner-active minutes of 120. P9: matches. P10: Round 1 fails on purpose. P11: baseline log starts here. P12: two Korea numbers, both sourced. P13: the drill's difference checklist is a first "check it"; a named verification step should be added in Part 4 ("find one thing Round 2 invented"). P14: pairs before room, room hears lines only.

One fix for Week 1 from this check: Part 4 step 3 gets an explicit "find what Round 2 invented or got wrong" item, so P13 is met by the exercise and not only by the sheet.

---

## A3. Tool stack, dated Sept 2026

Eric's working stack: ChatGPT Pro, Codex (included in the ChatGPT plan), Claude Max, Gemini, Google Workspace, GitHub, Supabase, DigitalOcean, and open-source repos. The course teaches with the same tools, at the tiers a learner actually needs, which are lower than the founder tiers. Two paths: browser-only (every track) and agent/server (diverges at Week 3, lives fully in SMB). Prices are US list, monthly, Sept 2026; Korean billing is in won at each vendor's rate. Any of these swaps for an equivalent without changing a session plan; plans say "your assistant," never a product name.

### Browser-only path (all seven tracks)

| Role | Pick | Alternate | Why | Learner cost |
|---|---|---|---|---|
| Assistant | ChatGPT Plus or Claude Pro (learner chooses one; instructor demos on the one the cohort's company permits) | Gemini via Google AI Pro, or whichever the company already licenses | The three are interchangeable for every exercise in the course; the method is the content. Plus and Pro both include projects, file upload, deep research, and the analysis mode | $20 |
| Workspace (Week 3: the Memento Man fix) | The assistant's project or workspace feature with custom instructions and knowledge files | Same on each vendor | Persistent context is the point; every major assistant has it | included |
| Knowledge tool | NotebookLM | The assistant's project with files uploaded | Upload, query, cite to source; free with a Google account | $0 |
| Analysis tool | The assistant's analysis / code-interpreter mode | Gemini in Google Sheets | Natural-language spreadsheet work without leaving the browser | included |
| Research tool | The assistant's deep research mode | Gemini Deep Research | Multi-source, cited briefings; monthly run limits on $20 tiers are enough for course work | included |
| Documents and data | Google Workspace (Docs, Sheets, Drive) | The company's own suite (한컴, MS 365) | Where the outputs land; Gemini is built into Workspace for companies that have it | $0 to $14 |
| Automation | [OPEN, question 4 below] | | | |
| Monitor | Google Alerts plus saved searches, run on a schedule by the learner | The assistant's scheduled tasks feature where available | Honest browser-path substitute for a scraper | $0 |
| Orchestration | Taught conceptually only on this path | | | |

Minimum: $0 (free tiers, NotebookLM, Workspace free). Recommended: $20 (one paid assistant). That number goes on the courses page.

### Agent/server path (SMB track in full; optional variants elsewhere)

| Role | Pick | Alternate | Why | Learner cost |
|---|---|---|---|---|
| Assistant and setup | Claude Pro with Claude Code, or ChatGPT Plus with Codex | Either; the learner already has one from the browser path | Claude Code or Codex does the installation and maintenance so nobody memorizes terminal commands. Founders who run agents all day move to Max ($100) or Pro $100 later; the course doesn't require it | $20 |
| Server | DigitalOcean basic droplet | Any VPS | Rented, one-click images exist for the agent tools, the guide's 65,000 won figure came from here | roughly $6 to $12 |
| Always-on agent | OpenClaw or Hermes (open source) | | The guide's core recommendation; OpenClaw for breadth, Hermes for the learning loop | $0 plus model API usage |
| Model API for the agent | Anthropic or OpenAI API key, pay per token | Gemini API | Separate from the chat subscription; the agent runs on it. Typical course usage is well under the founder's spend | $10 to $50 typical during the course |
| Orchestration | Paperclip (open source) | | MGT Weeks 8 to 10 on this path, SMB | $0 |
| Monitor | Scrapling (open source) | | Adaptive scraping that survives site redesigns | $0 |
| Research tool | Open Deep Research (open source) | The assistant's deep research | Runs on the agent path without subscription limits | $0 plus API |
| Code and config | GitHub, free tier | | Every agent config is a repo; version history is the learner's audit trail | $0 |
| Database and auth for anything the learner builds | Supabase, free tier | | Only in SMB when a learner builds a small internal tool | $0 |
| Knowledge tool | NotebookLM | The agent's own retrieval | Same as the browser path | $0 |

Minimum: about $30 a month (one assistant, a droplet, light API use). Recommended: $50 to $80. Full setup as the guide describes it, with a bigger droplet and heavier model use: $100 to $150. This matches the guide's 60,000 to 200,000 won range and gets restated in won on the courses page.

### Tool catalog (the full list, by vendor; rows above pick from this)

Each entry: what it is, where the course uses it, which path. "Mentioned" means it's shown or named but not built in a lab.

**Anthropic**
- Claude app (web, desktop, mobile): the assistant. Projects with custom instructions and knowledge files are the Week 3 workspace. Memory across chats. Both paths.
- Connectors and MCP: Claude connected to Google Drive, Calendar, Gmail, Notion, Slack and other tools through built-in connectors, plus any MCP server. This is how a browser-path learner gets the assistant reading their real files without a server. Taught from Week 3 on the browser path; the agent path uses MCP directly.
- Skills: reusable instruction folders the assistant loads for a task type. Harness library as Skills is the Week 2 to 7 bridge for Claude users.
- Claude Code: terminal and desktop coding agent. On the agent path it's the installer and maintainer for everything else; the learner describes, it sets up. SMB throughout; DAT for pipeline scripts.
- Cowork: desktop knowledge-work agent that works with local files and connected apps, no terminal. The browser-path learner's nearest thing to an always-on agent without a server. DOC and MGT Weeks 8 to 10.
- Dispatch: assign tasks from the phone to a Cowork session on your desktop and come back to finished work. Research preview, Pro and Max. Mentioned as the "message your system from your phone" pattern for people who can't run a server; Cowork must be open on the desktop for it to run.
- Computer Use: Claude controls the browser, mouse, and keyboard on the Mac when no connector exists. Research preview. Mentioned; taught only in SMB.
- Claude in Chrome, Claude in Excel, Claude in PowerPoint, Claude Tag in Slack: surface-specific agents. Excel for DAT, PowerPoint for DOC and CON, Chrome for RES monitoring on the browser path, Tag for MGT.
- Desktop app: where Cowork, Dispatch, and Code live for non-terminal users. Prerequisite for the browser path's Weeks 8 to 10.
- Claude API and Agent SDK: the model behind the agent path's OpenClaw or Hermes. SMB only.

**OpenAI**
- ChatGPT: the assistant. Projects and custom instructions are the Week 3 workspace. Both paths.
- Codex: coding agent, included in ChatGPT plans, cloud and CLI. Same role as Claude Code for ChatGPT users.
- Agent mode: browses, fills forms, completes multi-step tasks in a sandboxed browser. Browser-path automation candidate for Weeks 8 to 10 where corporate IT allows it.
- Deep Research: cited multi-source briefings. RES Week 4, SAL prospecting.
- Tasks (scheduled): recurring prompts on a schedule. The browser path's honest "automation" for a weekly briefing. Weeks 8 to 10.
- Custom GPTs: a harness packaged as a shareable assistant. Week 2 to 7 bridge for ChatGPT users; also how a team shares a harness library.
- Data analysis (code interpreter): DAT Weeks 4 to 7.
- API: model for the agent path if the learner prefers it.

**Google**
- Gemini app: third assistant option; the pick for companies already on Workspace. Both paths.
- NotebookLM: knowledge tool. Upload, query with citations, audio overviews. RES Week 5, MGT briefings, executive session. Free.
- Gemini in Workspace (Docs, Sheets, Gmail, Drive): the assistant inside the documents. DOC and DAT on the browser path for Workspace companies.
- Gemini Deep Research: alternate research tool.
- Gemini CLI: open-source terminal agent, alternate installer on the agent path.
- Google Alerts: browser-path monitor. RES Week 6, SAL Week 5.

**Infrastructure (agent path and SMB)**
- DigitalOcean: the rented server. One-click images for the agent tools.
- Supabase: database and auth for anything an SMB learner builds.
- GitHub: every config is a repo; history is the audit trail.
- Vercel or Netlify: static hosting for anything the learner ships (SMB).

**Open source (the guide's set plus what we run)**
- OpenClaw (MIT): always-on personal agent on your own server, 20+ messaging platforms, Korean UI. The agent path's center. SMB; agent-path variants from Week 3.
- Hermes Agent (Nous Research, MIT): self-improving agent with a learning loop and skill documents; runs on a $5 server; provider-agnostic. Alternate center; the compound-loop demonstration.
- Paperclip (MIT): multi-agent orchestrator, org-chart model, budgets. MGT Weeks 8 to 10 on the agent path, SMB.
- Scrapling: adaptive web scraper that survives site redesigns. RES Week 6, SAL Week 5, agent path.
- Open Deep Research (MIT): open-source research pipeline. RES Week 4 on the agent path.
- MiroFish (AGPL): swarm simulation of public reaction. Mentioned, not taught, pending Eric's confirmation.
- BettaFish: sentiment analysis on discourse. Mentioned, not taught, pending confirmation.
- AutoAgent: harness self-optimization. Mentioned in Week 2 as "where harnesses go"; not taught.
- gstack: the skill set used in the LEVER Command build (office-hours, review, sprint lifecycle). Candidate for the SMB track's "how we run our own agents" week. Confirm.
- Gemini CLI, Codex CLI, Claude Code: the installer agents (listed under their vendors).
- [ERIC: "worldvision" — not found in our chats or as a repo I can identify. Name and link needed.]
- [ERIC: the rest of the "many more." Paste the list; each gets a line with its course role, or "reference library only" for the platform's open-source library.]

Rule for the catalog: a tool is "taught" only if it's in a session plan's volatile appendix with a demo variant. Everything else is "mentioned" or "reference library." The platform's open-source tool library can carry the long tail; the courses carry the short one.

### Still open

- Question 3: what 대기업 IT actually permits and blocks (assistants, uploads, browser extensions). Fill from cohort 1 survey answers; until then the alternate column carries it.
- Question 4: browser-path automation. Is there any automation a corporate learner can run without server access, or do Weeks 8 to 10 on that path teach "design the pipeline, run it manually on a schedule, escalate to IT with a written spec"? I'd write it the second way; it's honest and it produces a deliverable (the spec) a learner can hand to IT.
- Question 5: anything from the guide's April list you've stopped recommending (MiroFish, BettaFish, AutoAgent are in the guide but not in your stack today). Those three move to "mentioned, not taught" unless you say otherwise.
- Question 6: the full open-source list. "worldvision" and the "many more" need names; see the catalog placeholders.

### Rules for the appendix

- Every row has a date, a pick, an alternate, a one-line reason, and a monthly cost.
- Reviewed quarterly and on any major model release. The change log is visible to learners; it's evidence that "teach what we use" is true.
- Session plans never name a tool. Instructor guides name the current pick with the date, and demo scripts are written per tool as variants.
- Cost per learner is stated for each path at three levels: minimum, recommended, full.

### Change log

- Sept 2026: first fill from Eric's stack. Guide-era tools not in the current stack (MiroFish, BettaFish, AutoAgent) moved to "mentioned, not taught" pending confirmation.
