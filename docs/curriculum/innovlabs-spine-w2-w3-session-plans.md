# Spine Weeks 2 and 3: Harnesses, then Pipelines
## Full-depth session plans, batch 1 of the spine

**Track:** Shared spine, all seven tracks
**Sessions:** 2 and 3 of 12
**Length:** 2 hours each, offline, rhythm 5 / 25 / 55 / 10 / 25
**Version:** v2 draft 1, Sept 2026, from master v1 Week 2 and 3 outlines, checked against A2

---

### What I'm unsure about (three items, both sessions)

1. **The harness library is on the critical path.** Week 2's lab starts from three Korean-native harness templates (weekly report, formal email, summary). They're specified here but not built. Cohort 1 can't run Week 2 without them, and they have to be written in Korean first, not translated. This is the priority-1 asset from master v1 and it now has a hard date: before Week 2 of cohort 1.
2. **Week 3 does three things.** Workspace setup, pipeline blueprint, and baseline lock. It's the densest spine session and the lab is tight. If cohort 1 shows it's too much, the baseline lock moves to a 10-minute segment at the start of Week 4, which every track can absorb.
3. **The agent path forks here.** Week 3 has an agent-path variant (project folder with harness files instead of a chat workspace). I've written it as a boxed variant, not a separate session, because in cohort 1 the agent-path learners will be a minority sitting in the same room. If SMB runs as its own cohort, Week 3 gets a full agent-path version.

---

# WEEK 2: Harnesses, turning a generic assistant into your company's employee

## Objective

By the end, every learner has two working harnesses for their own document types, has seen the same input produce a usable draft from a weaker model with a good harness and an unusable one from a stronger model with a lazy line, and has folded their first corrections back into a harness.

**Outcomes served:** O3 (can write a harness that encodes their company's format, register, and rules), O6 (context, format, example, judgment), O7 (can improve a system from its own corrections). Placeholder codes until spine §2 locks.

## Pre-work (sent after Week 1)

- Bring the time log from Week 1 with at least one logged instance and its output.
- Bring two or three documents you produce most often, digital, non-confidential or from the synthetic pack. The finished versions, not blank templates. A finished 주간보고 is worth more than the template it was written on.
- Bring one sentence about how your 팀장 or 부장 likes things: tables or prose, short or complete, alternatives or one recommendation. You won't show it to anyone.

Instructor pre-work: confirm the three harness templates (SP-HL-01 to 03) are in the folder in Korean. Test the two-model demo on the room's assistant the day before; the "lighter model" name changes monthly and lives in the appendix.

## Timed plan

### 0:00 to 0:05, Opening (5 min)

- 0:00 Instructor names the tools they used this morning. 20 seconds.
- 0:01 Time log check by show of hands: "Who logged at least one instance?" Then: "Who found the task took longer than they'd guessed in Week 1?" Most hands. That gap between guessed and logged is why the course measures instead of asking.
- 0:03 Today in one sentence: "Last week you gave the assistant context once. Today you write it down so you never have to again."

### 0:05 to 0:30, Concept and demo (25 min)

**0:05 to 0:12, Prompt versus harness (7 min).**
- A prompt is what you type. A harness is everything you'd tell a new employee before they touched the task: who they're working for, what the output looks like, what the rules are, what good looks like, what to do when something's missing. Same as onboarding. Nobody onboards by shouting one sentence.
- The six-part harness card (SP-W2-HC), on one slide, and it stays up for the lab:
  1. Role: what job this assistant has, for whom.
  2. Context: company, team, reader, what the reader already knows.
  3. Format: sections, order, length, tables or prose.
  4. Rules: register and 존댓말 level, what's always included, what's never included, the boss's preferences written as rules.
  5. Example: one finished output that's right. Structure is copied; content is not.
  6. Fallbacks: what to do with missing information (flag it, never invent), what to do when the input doesn't fit the format.
- The Korean specifics, said plainly: register is a rule, not a vibe. 합니다체 for anything going upward or outward; 해요체 for internal chat if the team uses it; the harness says which. Document conventions (주요 성과 before 이슈, evidence before recommendation, alternatives presented for a 부장 who wants them) are rules too. Your boss's preferences are the most valuable rules you own and nobody else has them.

**0:12 to 0:26, Demo: the weaker model wins (14 min).**
Script SP-W2-DEMO, live. Input from SP-SYN-01 (same fictional marketing team as Week 1, this week's raw updates).
- Round 1 (3 min): the assistant's strongest model, one line: "이걸 주간보고서로 정리해줘." Read it. Same failure as Week 1, on the best model available. Say: "This is the most expensive model on the market with nothing to work from."
- Round 2 (6 min): the assistant's lighter, faster model, with harness SP-HL-01 pasted in full, then the raw updates. Read it. Correct structure, correct register, table present, [확인 필요] flags where numbers were missing. Say the line from the guide: "A mid-range model with a good harness beats the best model with a lazy one-liner." Then the point that matters for their wallet: this is also why the course costs $20 a month and not $200. The harness is the expensive part, and you own it.
- Round 3 (5 min): dissect SP-HL-01 on screen against the six parts. Point at each: here's the role, here's the register rule, here's the example, here's the fallback. It's one page. Say: "A harness is one page. If yours is three, you've written a manual nobody will maintain."

**0:26 to 0:30, Transition (4 min).**
- Where harnesses live: this week, as a saved document you paste in. Next week, inside a workspace that loads them automatically. The week after, inside a pipeline that runs them for you. Today you write them.
- "Open the harness card and the template closest to your candidate #1."

### 0:30 to 1:25, Build lab (55 min)

**0:30 to 0:42, Part 1: Dissect and choose (12 min).**
- Input: the three templates (SP-HL-01 weekly report, SP-HL-02 formal email to a superior or external party, SP-HL-03 summary of a document or meeting), the harness card, the learner's finished documents from pre-work.
- Steps: (1) Read all three templates. On each, find the six parts and mark them. (2) Pick the template closest to candidate #1's document type. If nothing fits (a 품의서, a client proposal), pick the nearest and note what's different; the track cartridges add more types from Week 4. (3) On the harness card, fill Role and Context for your own situation in two lines each.
- Done looks like: three templates marked, one chosen, Role and Context written.
- Common failure: candidate #1 isn't a document at all (data cleanup, a spreadsheet). Fix: the harness still applies; use SP-HL-03 as the base and describe the output as a table. DAT track fixes this properly in Week 4.

**0:42 to 1:00, Part 2: Build harness #1 (18 min).**
- Input: the chosen template, the learner's own finished document (the example), the boss sentence from pre-work, this week's logged input from the time log.
- Steps: (1) Replace the template's example with your own finished document. Strip anything confidential; the synthetic pack's example if you have nothing safe. (2) Rewrite Format from your document's actual structure: sections in order, typical length, tables or not. (3) Write Rules: register, the two things always included, the one thing never included, the boss sentence turned into a rule ("부장님 always wants the comparison to last month; include it even when nobody asks"). Cap: ten rules. (4) Write Fallbacks: what to do with missing numbers, missing names, input that doesn't fit. (5) Run it: paste the harness, then this week's raw input, into a fresh chat. Read the output.
- Done looks like: a one-page harness with all six parts, run once, output saved to the correction log SP-W2-CL.
- Common failure: the assistant copies the example's content, not just its structure (last week's numbers appear in this week's draft). Fix: add the rule "The example shows structure and tone only. Never reuse its facts or figures." This rule goes in every harness in the library; check the templates carry it.
- Second failure: the harness is three pages of rules. Fix: ten-rule cap, enforced by the partner in Part 4. Rules that describe the example are redundant; the example already shows them.
- Third failure: a learner is reluctant to write down the boss's preferences. Fix, privately: the harness is theirs, nobody sees it, and the preference is already in their head; writing it down is the whole advantage.

**1:00 to 1:15, Part 3: Build harness #2 (15 min).**
- Input: a second document type from pre-work, usually an email type or a summary type, and the template for it.
- Steps: same as Part 2, faster, because the six parts are now familiar. Run it once on a real or synthetic input.
- Done looks like: a second one-page harness, run once.
- Instructor note: the second harness exists to prove the pattern transfers. Learners who only build one leave thinking harnesses are a report trick.

**1:15 to 1:25, Part 4: The correction loop (10 min).**
- Input: harness #1's output from Part 2 and the correction log.
- Steps: (1) Correct the output the way you would before sending it. Every change is a line on the correction log: what it was, what you changed it to. (2) Verification step: find at least one thing the output invented or assumed. Circle it. (3) Look at the corrections. Pick two that would recur. Turn each into a rule or a change to the example and add it to the harness. (4) Partner check (3 min): swap harnesses, partner counts the rules (over ten, cut) and checks all six parts are present.
- Done looks like: a correction log with entries, one circled invention, harness #1 updated with two new rules, partner check done.
- Say once, to the room, at 1:23: "You just did the compound loop by hand. Every correction you make from now on is a rule you haven't written yet. Week 12 you'll have a harness that reads like you."

### 1:25 to 1:35, Share-out and assignment brief (10 min)

- 1:25 to 1:31, Pairs: each learner reads their partner one rule from harness #1 that captures something about their boss or company nobody outside would know. Partner says whether it's specific enough to act on. Nobody shows the room a harness.
- 1:31 to 1:35, Assignment: this week, do candidate #1 for real using harness #1. Log time on the time log. Log every correction on the correction log. Bring both. Also bring: two or three reference documents you'd want the assistant to always have on hand (a glossary, a template, last quarter's report), non-confidential or synthetic, for the workspace in Week 3. Hand out SP-W2-SUM.

### 1:35 to 2:00, Free talk and Q&A (25 min)

- Open (2 min): three volunteers read one rule each. Board them. The pattern: the best rules are the ones that sound too specific to matter. "Always show the Busan region separately" is a better rule than "be accurate." Say that.
- Let it run.
- The questions that come every Week 2, with answers ready: "Can I share my harness with my team?" Yes, and Week 3 shows where to store it so they can; the boss-preference rules are the part you might keep private. "Does the harness work on a different assistant?" Yes. It's text. The six parts are the same everywhere; only the place you paste it changes. "What if the boss changes?" Change the rule. That's the point of writing them down.
- Questions about automation ("can it just run every Monday?"): "Week 3 and Weeks 8 to 10. Today it's a document; next week it's loaded; after that it runs."
- Close at 1:59: "Use the harness on the real thing. Log the corrections."

## Artifact produced

Two one-page harnesses for the learner's own document types, harness #1 already through one correction cycle. A started correction log. Consumed by Week 3 (loaded into the workspace), Weeks 4 to 10 (every track builds more harnesses on this pattern), Week 12 (the harness library is part of the capstone).

## Homework

Candidate #1 done for real with harness #1, time logged, corrections logged. Reference documents for the workspace.

## Instructor notes

**Demo.** The two-model demo needs the lighter model to actually produce something good with SP-HL-01. Test it the day before; if the lighter model of the month is too weak, run Round 2 on the standard model and make the point with cost instead of model tier. The point survives either way: the harness is the value.

**Pacing.** If Part 2 runs long (it will, the first time), Part 3 shrinks to "build the Role, Format, and Example only; finish the rules as part of the assignment." Part 4 is never cut; the correction loop is the compound-loop lesson made physical.

**When ahead.** Build harness #3 for the boss's most-requested ad hoc thing. Or write the rule that would have prevented the circled invention.

**Room dynamics.** The boss-preference rule is the sensitive part. Some learners will write "부장님 prefers..." and feel exposed. The harness is private; say so twice. A 팀장 in the room writing rules about their own preferences for their team is fine and useful; a 사원 writing rules about that same 팀장 is also fine and should never be read aloud.

**Signals to record.** Per learner: document types of harness #1 and #2 (this is a track signal: reports and approvals point to DOC, research briefs to RES, tables to DAT), and whether they finished both.

## Materials used

| ID | Item | Format | Status |
|---|---|---|---|
| SP-W2-SL | Slides: harness card, six parts, demo timing | Slides, 6 max | Spec'd |
| SP-W2-DEMO | Two-model demo script with exact prompts | Doc | Spec'd (above) |
| SP-HL-01 | Harness template: 주간업무보고 | One page, Korean-native | To build, priority 1 |
| SP-HL-02 | Harness template: formal email (upward and external), 합니다체 | One page, Korean-native | To build, priority 1 |
| SP-HL-03 | Harness template: summary of a document or meeting | One page, Korean-native | To build, priority 1 |
| SP-W2-HC | Harness card: the six parts with prompts, fill-in | Sheet | Spec'd |
| SP-W2-CL | Correction log: original / changed to / recurring? / rule written? | Sheet, reused all course | Spec'd |
| SP-W2-SUM | One-page takeaway | Sheet | Spec'd |
| SP-SYN-01 | Synthetic pack, reused | Files | To build |

## Volatile appendix (Sept 2026)

- "Strongest model" and "lighter model" in the demo: each assistant's current top reasoning model versus its fast default. Names change monthly; instructor guide carries the current pair per assistant.
- Where a harness lives after this week: as custom instructions plus a knowledge file in the assistant's project feature (all three assistants), or as a Skill on Claude, or as a Custom GPT on ChatGPT. Week 3 does the loading.
- Cost: none beyond the learner's assistant.

---

# WEEK 3: Pipelines and the workspace, from one-off questions to a system that remembers

## Objective

By the end, every learner has a persistent workspace loaded with their harnesses and reference documents that remembers across sessions, a pipeline blueprint for candidate #1 with the assistant placed at specific stages and human checkpoints marked, one dry run of that blueprint timed, and their capstone baseline locked.

**Outcomes served:** O4 (can decompose a recurring task into stages and place AI at the right ones), O5 (can set up persistent context so the assistant stops starting from zero), O8 (can produce a baseline measurement fit for before/after evidence).

## Pre-work (sent after Week 2)

- Time log with the harness-assisted instance. Correction log.
- Two or three reference documents for the workspace (from Week 2's brief).
- Both harnesses as text files.

Instructor pre-work: confirm which workspace feature each assistant in the room offers and the exact clicks (appendix). Prepare the "Memento Man" demo in two tabs. Print blueprint sheets and baseline forms. Have the track assignments drafted from Weeks 1 and 2 signals; they're confirmed at the end of this session.

## Timed plan

### 0:00 to 0:05, Opening (5 min)

- 0:00 Tools this morning. 20 seconds.
- 0:01 Hands: "Who used the harness on the real task?" "Whose logged time dropped?" "Whose corrections were fewer than Week 1's?" Say the numbers.
- 0:03 Today in one sentence: "The assistant forgets you every time you open it. Today you fix that, and you draw the map of the task it's going to run."

### 0:05 to 0:30, Concept and demo (25 min)

**0:05 to 0:14, Demo first: the Memento Man (9 min).**
- Tab 1: a fresh chat. Ask it to draft this week's report. It doesn't know the harness, the company, the format. Nothing. Say the guide's line: it's a brilliant employee who wakes up every morning with no memory.
- Tab 2: the workspace, already set up on SP-SYN-01: harness SP-HL-01 as its standing instructions, last week's report and the template as its files. Same ask, one line. It produces the right draft, because it already knows. Say: "Same model. The only difference is that this one was allowed to remember."
- What a workspace is, in the durable terms: a place where your instructions and your reference documents persist, so every conversation starts from your context instead of from zero. Every major assistant has one; the appendix names them. It's the first system component you own that doesn't live in your head.

**0:14 to 0:26, Pipelines (12 min).**
- The Monday report from Week 1, now as stages on a slide: input (three sources), processing (combine, summarize), output (format in template), delivery (send for review), and a loop (corrections feed the harness). Five boxes, arrows between them.
- The blueprint questions, one per box, on the blueprint sheet SP-W3-BP: What comes in and from where? What happens to it? What's the output and in what format? Who gets it and how? What do I check before it goes? Which of these does the assistant do, which do I do, and which does the assistant do and I check?
- Human checkpoints, said plainly: a pipeline without a check before delivery is how someone's assistant started a fight with their insurance company. The check is a stage, not an afterthought. Week 9 in every track is entirely about this.
- Where the harness goes: it's the processing stage's instructions. Where the workspace goes: it's where the pipeline lives so it doesn't have to be rebuilt each week.

**0:26 to 0:30, Transition (4 min).**
- Today's lab has four parts and they're tight. Say the times. "Set up the workspace, draw the blueprint, run the first three stages once, lock the baseline. Go."

### 0:30 to 1:25, Build lab (55 min)

**0:30 to 0:42, Part 1: Stand up the workspace (12 min).**
- Input: both harnesses as text, the reference documents, the click-path sheet for the learner's assistant (appendix, per assistant).
- Steps: (1) Create a workspace named for candidate #1. (2) Paste harness #1 as the standing instructions. If the assistant allows more than one file, add harness #2 as a file too. (3) Upload the reference documents. (4) Test: one line, "draft this week's," with this week's raw input. Confirm it used the harness without being told. (5) Save the workspace's location on the blueprint sheet.
- Done looks like: a named workspace, harness loaded, documents uploaded, one successful test.
- Common failure: uploads are blocked by company IT. Fix: paste the reference documents into the instructions as text (there's usually room for a few pages), and note the block for the IT-constraint record.
- Second failure: the assistant "forgot" the harness on the test. Fix: nearly always the harness was uploaded as a file rather than set as instructions; instructions are read every time, files are read when relevant. Move it.
- Agent-path variant (boxed): learners on the agent path instead initialize a project folder with the installer agent, place both harnesses as instruction files in it, add the reference documents, and run the same test from the terminal. The folder is their workspace. From Week 4, SMB builds the server around it.

**0:42 to 1:00, Part 2: The blueprint (18 min).**
- Input: candidate #1, the time log (which shows where the time actually went), the blueprint sheet.
- Steps: (1) List every stage of candidate #1 as it's done today, in order, using last week's logged instance as the record. Typical: 6 to 10 stages. (2) For each stage, mark from Week 1's map: P or T. (3) For each P stage, write what the assistant does at that stage and what it needs (input, harness, reference). For each T stage, write what the learner does. (4) Insert checkpoints: at minimum one before delivery. Write what's checked (numbers against source, names, register, anything the fallback rule flagged). (5) Write the trigger (when does this run: Monday 8am, on receipt of X) and the delivery (to whom, how). (6) Draw it: boxes and arrows on the back of the sheet. Ugly is fine.
- Done looks like: a stage table with P/T, assistant placement, at least one checkpoint, a trigger, a delivery, and a drawing.
- Common failure: the learner writes the ideal pipeline instead of today's task plus the assistant. Fix: "Blueprint what you did last Monday. Then mark which boxes the assistant takes. Don't add boxes." The improvement comes from removal, not addition.
- Second failure: no checkpoint, because "I'll just read it." Fix: "Write what you read for. If you can't name it, you won't catch it." The named check becomes a Week 9 verification item.

**1:00 to 1:15, Part 3: Dry run (15 min).**
- Input: the blueprint, the workspace, this week's real raw input (or synthetic).
- Steps: (1) Start a timer. (2) Run stages 1 through the first checkpoint, manually, in the workspace: gather the input as the blueprint says, give it to the assistant in the workspace, get the output, do the checkpoint. (3) Stop the timer. Write the time on the blueprint. (4) Verification step: at the checkpoint, find one thing to fix. There's always one. Log it on the correction log.
- Done looks like: stages 1 to checkpoint executed once, timed, one correction logged.
- Common failure: the input for stage 1 isn't available in the room (it's in a system they can't reach). Fix: run with the synthetic pack's input for timing purposes; note that the real run happens in the assignment.
- Instructor note: the dry-run time next to the Week 1 logged time is the first before/after most learners see. Some will have it in front of them at 1:12. Let them notice it themselves.

**1:15 to 1:25, Part 4: Lock the baseline (10 min).**
- Input: baseline form SP-W3-BL, both weeks' time logs, the Week 1 output evidence.
- Steps: (1) Name the capstone task. Usually candidate #1; occasionally a learner switches to #2 after the blueprint showed #1 was mostly thinking. Either is fine, but it's fixed from here. (2) Record the current method: stages as done today, time per instance from the Week 1 log (the pre-harness one), frequency per week or month. (3) Attach the Week 1 output evidence (screenshot or file reference). (4) Write the quality checklist v0: four to six lines that define a good output for this task (right sections, numbers match source, register correct, under N pages, boss's must-haves present). This checklist is what Week 11 scores both outputs against. (5) Sign and date. The instructor countersigns during free talk.
- Done looks like: a completed baseline form, countersigned by the end of the session.
- Common failure: no Week 1 log exists (they didn't do it). Fix: they log this week's instance done the old way, once, and the form is countersigned in Week 4. The baseline must be a pre-harness instance or the before/after is meaningless; say that plainly.

### 1:25 to 1:35, Share-out and assignment brief (10 min)

- 1:25 to 1:31, Pairs: show the partner the blueprint drawing. Partner asks one question: "Where's the checkpoint, and what does it check?" If the answer isn't specific, fix it now.
- 1:31 to 1:35, Assignment: run the full pipeline once on the real task this week, in the workspace, including delivery to whoever normally receives it. Log time and corrections. Bring the output to Week 4. Tracks are confirmed today; Week 4 is the first track session, and the room may change. Hand out SP-W3-SUM.

### 1:35 to 2:00, Free talk and Q&A (25 min)

- Open (2 min): instructor countersigns baselines while learners talk; call people up one at a time, 20 seconds each. Board three dry-run times next to their Week 1 logged times, with consent. The numbers do the talking.
- Track confirmation (5 min, inside the block): announce or hand out each learner's track for Week 4. For most it's what the survey said; for the hybrids, the Weeks 1 to 3 signals decided it. Anyone who disagrees talks to the instructor now, not in Week 4.
- The questions that come every Week 3: "Can the workspace be shared with my team?" Yes on most assistants; a shared workspace is a team harness library, and DOC Week 7 builds one. "What about data privacy in the workspace?" The same rule: nothing confidential that company policy doesn't allow; the workspace is safer than pasting into random chats because it's one controlled place, not fifty. "When does it run by itself?" Weeks 8 to 10, on your path.
- Close at 1:59: "Run the whole thing once. See you in your track."

## Artifact produced

A live workspace (or project folder) with harnesses and references. A pipeline blueprint for candidate #1. A dry-run time. A countersigned baseline form with quality checklist v0. Consumed by Week 4 (every track starts from the blueprint), Week 9 (the checkpoint becomes the verification design), Week 11 (the baseline is half the evidence package).

## Homework

One full real run of the pipeline, delivered, logged. Output brought to Week 4.

## Instructor notes

**The three-things problem.** This session is dense. The order is deliberate: workspace first because the blueprint's dry run needs it; blueprint before dry run; baseline last because it needs the dry-run time on the sheet next to the Week 1 time for the point to land. If time is short, Part 4's checklist v0 becomes homework and only the task name and Week 1 time get countersigned in the room.

**Demo.** Set up Tab 2 the day before, on the synthetic pack, so the Memento Man contrast is instant. If the assistant of the day has weak workspace persistence, use the assistant that has it for the demo and note the difference honestly; the appendix carries the per-assistant limits.

**When ahead.** Blueprint candidate #2. Or add a second checkpoint and write what it checks.

**Room dynamics.** Track announcements can sting: a learner who wanted the "advanced" track and got DOC. Frame it once, to the room: DOC is the universal foundation and the hybrid fallback; it's where the biggest hour counts are. Nobody is being sorted by ability; everyone is being sorted by where their hours are.

**Signals to record.** Per learner: workspace stood up (yes/no), assistant used, any IT block, dry-run time, baseline countersigned (yes/no), track confirmed.

## Materials used

| ID | Item | Format | Status |
|---|---|---|---|
| SP-W3-SL | Slides: Memento Man, five boxes, blueprint questions, lab times | Slides, 6 max | Spec'd |
| SP-W3-DEMO | Two-tab demo, pre-built workspace on SP-SYN-01 | Doc plus a prepared workspace | Spec'd |
| SP-W3-CP | Click-path sheets: how to create a workspace, set instructions, upload files, per assistant | Sheet per assistant, volatile | To build, quarterly refresh |
| SP-W3-BP | Blueprint sheet: stage table, P/T, assistant placement, checkpoint, trigger, delivery, drawing space | Sheet, A4 both sides | Spec'd |
| SP-W3-BL | Baseline form: task, current method, time, frequency, evidence reference, quality checklist v0, signatures | Sheet, also the platform's baseline object later | Spec'd |
| SP-W3-SUM | One-page takeaway | Sheet | Spec'd |
| SP-W2-CL | Correction log, continued | Sheet | Spec'd |
| SP-SYN-01 | Synthetic pack | Files | To build |

## Volatile appendix (Sept 2026)

- Workspace feature per assistant: Claude Projects (instructions plus knowledge files; also Skills for reusable harnesses), ChatGPT Projects (instructions plus files) or a Custom GPT, Gemini Gems. Click paths on SP-W3-CP; refreshed quarterly.
- Agent path: Claude Code or Codex initializes the project folder; the harness files are CLAUDE.md or AGENTS.md respectively. Server setup begins in SMB Week 4.
- Known limits per assistant on file count, file size, and instruction length: on SP-W3-CP with dates.
- Cost: none beyond the assistant.

## Change log

- v2 draft 1, Sept 2026: Weeks 2 and 3 to full depth. Added the six-part harness card, the two-model demo, the ten-rule cap, the "structure not content" rule, the correction loop as a lab part, the blueprint sheet's six questions, the checkpoint requirement, the baseline form with checklist v0 and countersignature, and the agent-path variant box.
