# Spine Week 1: Anatomy of Your Job
## Full-depth session plan (§6 format), depth calibration for the program

**Track:** Shared spine, all seven tracks
**Session:** 1 of 12
**Length:** 2 hours, offline, browser-only path (the agent/server path doesn't diverge until Week 3)
**Version:** v2 draft 1, Sept 2026, produced from master v1 Week 1 outline

---

### What I'm unsure about (three items)

1. **Lab time.** The new rhythm gives the lab 55 minutes instead of 60. I took the five from Part 1 (category-to-task breakdown, now 12 minutes). If learners in cohort 1 need longer there, the next candidate to shorten is Part 3 scoring, not Part 4, the drill.
2. **Mixed-seniority rooms.** With up to 10 per company, a 팀장 and their 사원 can be in the same room. The share-out is written so nobody has to show their own task to the room, only to a partner they choose. If that's too cautious, the room share-out gets stronger; if not cautious enough, cut it to pairs only.
3. **Tool blocking.** If a company blocks the assistant we demo with, the basics drill needs a permitted tool. I've written the drill tool-agnostic and given three variants in the appendix, but the demo itself is on one tool. If cohort 1 is a single-company B2B cohort, we should demo on whatever they permit.

---

## Objective

By the end of the session, every learner has a one-page Work Map of their actual week, classified into processing and thinking, with three scored candidate tasks for automation and a first-hand experience of the difference between how they currently use AI and how they'll use it from now on.

**Outcomes served:** O1 (can decompose own work into automatable and non-automatable tasks), O2 (can select an automation candidate by explicit criteria), O6 (can give an AI assistant context, format, and an example, and judge the output). Outcome codes are placeholders until the spine §2 is locked.

## Pre-work (sent one week before, with the intake survey)

- Complete the intake survey (10 minutes). It seeds the Work Map with the learner's task categories and rough weekly hours per category. It does not produce task rows; those are built in the room.
- Bring a laptop with a working login to the assistant your company permits. A checklist with screenshots is sent for the three most common assistants.
- Bring one recurring document or output you produce at least weekly. Not to show anyone; to use in the lab. If everything is confidential, bring nothing; a synthetic pack is provided.
- Read: nothing. Week 1 assumes no reading was done. It never is.

Instructor pre-work: export survey responses, produce each learner's seeded Work Map (categories and hours filled, task rows empty). The app does this later; for cohort 1 the instructor runs the SP-W1-WM seed prompt on each export, about a minute per learner. Print one copy each plus five blank copies. Test the demo on the room's wifi and the permitted tool the day before.

## Timed plan

### 0:00 to 0:05, Opening (5 min)

- 0:00 Instructor introduces themselves in one sentence and names the tools they ran their own work on this morning. This is the credibility device from the brand; it happens every session, 20 seconds, no slide.
- 0:01 The course promise, one slide: "By Week 12 you own one working system on your real job and can show hours saved with evidence." No agenda slide, no icebreaker.
- 0:02 Room rules, three, on one slide: your own work is yours, nobody sees it unless you choose; no confidential documents go into any tool in this room, synthetic packs exist for that; the assignment each week is real work, not homework.
- 0:04 Quick poll by show of hands: "Who used an AI tool for work this week?" then "Who used it for something other than rewriting or summarizing text?" The gap between the two hand counts is the session's argument. Say the numbers out loud.

### 0:05 to 0:30, Concept and demo (25 min)

**0:05 to 0:12, Processing versus thinking (7 min).**
Talking points, not a script:
- The Monday report walkthrough from the guide: nine steps, three hours, and the honest question of which steps needed a brain. Steps 1 to 3 are retrieval, 5 is formatting, 6, 8, 9 are routing. Only 4 (the summary) and 7 (the review) require judgment. Twenty minutes of thinking inside three hours of processing.
- Define the two words the course will use for twelve weeks. Processing: moving, converting, finding, organizing, repeating. Thinking: deciding what matters, judging quality, handling what's new, talking to people. If a task could be explained to a temp in an afternoon, it's processing. Say that test out loud; learners will use it in the lab.
- The Korean specifics, briefly: 주간보고, 회의록, 기안서 flow. The document culture is the reason this room has more to automate than an American office would. Not a complaint, an asset.

**0:12 to 0:17, The parking lot problem (5 min).**
- Two numbers on one slide, with the sources in the footnote: Korea second in the world in paid AI subscribers (OpenAI, 2025); not in the top 10 for usage by web traffic (SimilarWeb, 2025).
- What Korean workers actually do with the subscription: polish, summarize, rephrase. A sports car in the parking lot.
- The one sentence: the gap between using a tool and redesigning work around it is the whole course. Today is finding out what to redesign.

**0:17 to 0:30, Demo: the same task, twice (13 min).**
Script SP-W1-DEMO, run live, not on slides. The task: turn a set of raw weekly updates into a 주간업무보고 draft. Inputs come from synthetic pack SP-SYN-01 (a fictional 중견기업 marketing team: five people's raw updates in a 카톡-style thread, last week's report as an example, the company's report template).

Round 1, the way most people do it (4 min):
- Paste the raw updates. Type: "이걸 주간보고서로 정리해줘." Send.
- Read the output aloud. It's fine and useless: wrong structure, wrong register, wrong length, no data table, invents a "next week" section. Ask the room: "Who would send this?" Nobody.
- Say the diagnosis: no context, no format, no example. The assistant did the best it could with nothing.

Round 2, with context, format, and an example (7 min):
- Open a fresh chat. Paste three things, in this order, naming each as you paste: last week's report ("this is the format and the register"), the template ("these are the sections and the order"), the raw updates ("this is this week's input"). Then the instruction: "Draft this week's report in exactly the structure and tone of last week's. Put key metrics in a table. If any update is missing a number, write [확인 필요] instead of guessing. Three sections: 주요 성과, 이슈 사항, 차주 계획."
- Read the output. It's 80% done. Point at the two things that still need a human: the emphasis (which achievement leads), and the [확인 필요] flags.
- Time check on the slide: Round 1 took 30 seconds and produced nothing usable. Round 2 took 2 minutes and produced a draft that needs 10 minutes of review instead of 3 hours of writing.

Close (2 min):
- Name what just happened without the jargon: the assistant was given the context a new employee would need. Week 2 makes that reusable (a harness). Week 3 makes it automatic (a pipeline). Today, you find the tasks worth doing it to.
- Transition: "Open your Work Map."

### 0:30 to 1:25, Build lab (55 min)

Learners work alone on their own Work Map (SP-W1-WM) with a partner of their choice for the two checkpoints. Instructor and any assistant instructor circulate. Every 15 minutes, a one-line time call, nothing more.

**0:30 to 0:42, Part 1: Break categories into tasks (12 min).**
- Input: the seeded Work Map (the survey's task categories with rough hours per category, task rows empty) plus the learner's own memory of last week.
- Steps: (1) Read the seeded categories and hours. Cross out what's wrong, add a category if one is missing. (2) Under each category, write the actual recurring tasks, one per row, as verb phrases: "compile the Monday numbers," "reformat the deck for 부장," not "reporting." (3) Walk through last week day by day to catch what the categories missed. (4) Split the category hours across its rows. Guess. Precision comes from the time log later.
- Done looks like: 12 to 25 rows across all categories, each a verb phrase with an hours guess, total between 25 and 50 hours. Under 10 rows means the tasks are too coarse; over 30 means they're too fine.
- Common failure: "my week is different every week." Fix: "Then walk through yesterday only, hour by hour." Everyone can do yesterday. The recurring pattern is visible in one day.
- Second failure: a category stays as one row ("meetings," "email"). Fix: split by purpose. "Status meetings," "decision meetings," "client emails," "internal requests." The split is where processing hides.

**0:42 to 0:57, Part 2: Classify (15 min).**
- Input: the completed map.
- Steps: (1) For each row, mark P (processing), T (thinking), or M (mixed). Use the temp test: could you explain it to a competent temp in an afternoon? P. (2) Every M must be split into two rows before moving on. "Write the weekly report" becomes "gather and format the numbers" (P) and "decide what to emphasize and write the commentary" (T). No row stays M. (3) Total the P hours and the T hours. Write both at the bottom.
- Done looks like: no M rows remain; the P total is written; most learners land at 55 to 75% processing and are surprised.
- Checkpoint (2 min at 0:55): partners swap maps and challenge one classification each. "Is that really thinking?" is the most useful question in the session.
- Common failure: everything marked T. This is status-protective, especially with a 팀장 in the room. Fix, privately, not to the room: "Pick your most annoying task. Is it annoying because it's hard or because it's repetitive?" Repetitive is P.
- Instructor note: the P total is the first number in each learner's before/after story. Say once, to the room: "That number at the bottom is the hours this course is going after."

**0:57 to 1:11, Part 3: Score and pick three (14 min).**
- Input: the classified map and the scoring card SP-W1-SC.
- Steps: (1) For each P row with 1 hour per week or more, score five criteria, 1 to 3 each: recurs weekly or more (3) / monthly (2) / less (1); inputs already exist digitally (3) / partly (2) / on paper or in heads (1); the rules are stable and you could write them down (3) / mostly (2) / it depends every time (1); you own the task end to end (3) / share it (2) / only a piece (1); low cost if the first version is wrong, because you review it before it goes anywhere (3) / medium (2) / it goes straight to a client or 부장 (1). (2) Sum. 13 to 15 is a strong candidate. Under 10 is not a Week 4 task. (3) Pick three, highest scores first, but the top pick must be something you do at least weekly; the time log needs to catch it this week. (4) Write the three on the Work Map's bottom panel with their scores.
- Done looks like: three candidates, each scored 11+, the first one recurring weekly.
- Common failure: the top scorer is a task the learner doesn't own (a shared tracker someone else controls). Fix: it can still be a candidate, but move it to third; the first two must be owned.
- Second failure: a learner in a MGT-shaped role has few P tasks over an hour because their processing is spread across dozens of small coordination acts. Fix: allow one row that aggregates a category ("status collection across 6 people, all channels") if the rules are the same across instances. This is the person who'll be routed to the Management & Coordination track; note it for the instructor cohort profile.

**1:11 to 1:25, Part 4: Correct the basics on your own candidate (14 min).**
- Input: candidate #1, the learner's own recurring document from pre-work (or synthetic pack SP-SYN-01 if they brought nothing or can't use company material), the permitted assistant, drill sheet SP-W1-BAS.
- Steps: (1) Round 1: describe candidate #1 to the assistant in one sentence, the way they'd normally ask. Save the output (copy into the drill sheet). (2) Round 2: fresh chat. Give it the three things from the demo, in order: an example of a finished output, the format or template, this week's raw input. Then an instruction with the format, the register, and the rule for missing information. (3) Put the two outputs side by side on the drill sheet and mark the differences: structure, register, length, what it got right. (4) Verification step: find at least one thing Round 2 invented, assumed, or got wrong. There is always one. Circle it on the sheet. (5) Write one line: what would a human still have to do to Round 2's output?
- Done looks like: two outputs on the sheet, at least four marked differences, one circled invention or error in Round 2, the one-line "what's left for a human."
- Common failure: no digital example exists for candidate #1 (it lives in an old email or a shared drive they can't reach). Fix: run the drill on candidate #2 or the synthetic pack. The point is the comparison, not the task.
- Second failure: the assistant is blocked or the login fails. Fix: pair with a neighbor whose tool works; both run the drill on the neighbor's synthetic pack. Instructor notes the blocked tool for the IT-constraint record.
- Third failure: Round 2 is worse than Round 1 because the learner pasted the raw input first and the example last. Order matters to these tools. Fix on the spot: example first, then format, then input, then instruction. This failure is worth catching in the room; it's the single most common mistake the course corrects.

### 1:25 to 1:35, Share-out and assignment brief (10 min)

- 1:25 to 1:31, Pairs (6 min): each learner shows their partner the Round 1 / Round 2 comparison and reads their "what's left for a human" line aloud. Partner asks one question. Nobody shows anything to the room in this segment.
- 1:31 to 1:35, Assignment brief (4 min): this week, do candidate #1 the normal way and log it on the time log SP-W1-TL: start time, end time, interruptions, and a photo or screenshot of the finished output. Two entries if the task happens twice. This is the baseline; it goes into the capstone comparison. Say plainly: "If you don't log it, Week 12 has no before number." Bring to Week 2: the logged sheet and the two or three documents you produce most often, digital, non-confidential or from the synthetic pack. Hand out the one-page summary SP-W1-SUM.

### 1:35 to 2:00, Free talk and Q&A (25 min)

This block is unstructured on purpose and it's the same length every week. The instructor opens it, doesn't run it.

- Open (2 min): ask for three volunteers to read only their "what's left for a human" line. Write the three on the board. The pattern is always the same: emphasis, judgment, checking numbers, knowing what the boss cares about. Say once: "That's the twenty minutes of thinking. Everything else is what we build around it." Then: "The floor's open. Anything, not just today."
- Let it run. Learners talk to each other as much as to the instructor; don't redirect that. Sit down. Coffee if the venue allows it.
- The two questions that come every Week 1, with the answers ready: "Is it safe to put company data in these tools?" Not the company's confidential data, not in class; Week 3 covers the workspace setup that makes it safer at work; today, synthetic packs. "Which tool is best?" The one your company lets you use; the method is the same, and the tool appendix names our current picks with the date on them.
- Questions that go beyond Week 1 (agents, automation, "can it do X for me"): answer briefly and honestly, point at the week it's covered, don't demo ahead. Write anything genuinely new on the board; it feeds the knowledge base.
- If the room goes quiet early, don't fill it with content. Ask one person what their candidate #1 is and why it annoys them. That restarts it.
- Close (1 min, at 1:59): "Log the task. See you next week." No recap.

## Artifact produced

Personal Work Map, one page: 12 to 25 classified task rows with hours, P and T totals, three scored candidates. Plus the drill sheet with the Round 1 / Round 2 comparison. Both are the learner's; the instructor keeps only the P total and the three candidate names for the cohort profile, with the learner's consent line ticked.

## Homework (real-work assignment)

Time log on candidate #1, minimum one full instance with output evidence. Feeds Week 2 (the harness is built for candidate #1's document type) and Week 3 (baseline lock).

## Instructor notes

**What to demo and how.** The demo lives or dies on Round 1 being bad. Don't rescue it. If the assistant happens to produce something decent in Round 1, point at what it still got wrong (register, missing table, invented section) rather than pretending. Run the demo the day before on the room's tool; assistants change monthly and the exact Round 1 output varies.

**Pacing.** The lab is the session. If concept runs over 0:30, cut the parking lot segment to the two numbers and one sentence; never cut demo Round 2. If the lab runs behind at 0:57, Part 3 scoring becomes "pick your three by gut, score them as homework," and Part 4 keeps its full 14 minutes; the drill is what learners remember. The free talk block is never cut to recover time; if the session is running late, it's the lab that lost the time and the block still runs 25 minutes.

**When ahead.** A learner who finishes Part 3 early maps one task from a colleague's week (they always know one). A learner who finishes Part 4 early runs Round 3: add one rule to the instruction ("keep it under one page," "use 합니다체") and watches what changes.

**Room dynamics.** Seniority is in the room. The temp test is deliberately neutral (it's about the task, not the person). If a 팀장 is visibly uncomfortable classifying their own work, suggest they map their team's week instead of their own; it's still processing versus thinking and it sets them up for the MGT track. Never call on the most junior person first in the room share-out.

**Data privacy, said once and enforced.** Confidential company material does not go into any tool in the room. Synthetic packs exist so nobody is stuck. If someone pastes real data anyway, don't make it a scene; note it for the company's IT contact if the engagement has one.

**Signals to record for the cohort profile.** Per learner: P total, three candidates, the tool that worked, any tool that was blocked, and whether their processing was concentrated (a DOC/RES/DAT shape) or spread across coordination (an MGT shape). These feed track confirmation for the Week 4 fork.

## Materials used

| ID | Item | Format | Status |
|---|---|---|---|
| SP-W1-SL | Slides: promise, rules, two numbers, demo timing, assignment | Slides, 8 max | Spec'd |
| SP-W1-DEMO | Demo script with exact prompts for both rounds, on SP-SYN-01 | Doc | Spec'd (prompts above) |
| SP-SYN-01 | Synthetic pack: 중견기업 marketing team, five raw updates in 카톡 style, last week's report, report template | Files, Korean-native | To build (asset library) |
| SP-W1-WM | Work Map worksheet: rows, P/T column, hours, totals, candidate panel. Plus the generator prompt for pre-population from survey export | Sheet, A4 | Spec'd |
| SP-W1-SC | Scoring card, five criteria | Card, half A4 | Spec'd (criteria above) |
| SP-W1-BAS | Basics drill sheet: two output boxes, difference checklist, "what's left" line | Sheet | Spec'd |
| SP-W1-TL | Time log sheet with evidence field | Sheet, also a template in the platform later | Spec'd |
| SP-W1-SUM | One-page takeaway | Sheet | Spec'd |
| SP-W1-IG | Instructor guide (this document's notes plus the day-before checklist) | Doc | This draft |
| SP-PRE-01 | Pre-work email and tool login checklist with screenshots for three assistants | Doc | To build, volatile |

## Volatile appendix (dated Sept 2026, swap without touching the plan above)

- Demo assistant: [Eric to confirm the team's current pick]. Variants of the demo tested on: [three permitted-in-Korea assistants, to confirm]. The drill sheet refers only to "your assistant."
- Known blocking patterns at Korean 대기업: [to fill from cohort 1 IT-constraint survey answers].
- Cost for this session: zero beyond a free or existing assistant login.

## Change log

- v2 draft 1, Sept 2026: first full-depth session plan from master v1 outline. Added scoring criteria, the mixed-row split rule, the three-things order rule, seniority handling, and the signals-to-record list.
- v2 draft 2, Sept 2026: session rhythm changed program-wide to 5 / 25 / 55 / 10 / 25 with a fixed 25-minute free talk and Q&A close. Work Map now seeded from survey categories, task rows built in the room (survey has category-level detail only). Blank-start variant removed.
