---
name: handoff
description: Machine handoff for Eric's alternating desktop and laptop. Writes or reads the handoff log at ~/claude-workspace/handoff.md and syncs both repos. Triggers on "/handoff", "handoff", "switching machines", "moving to my laptop/desktop", "pick up where I left off", "what was I doing", "/handoff read".
---

# Handoff

Two modes. No argument or `write` means write. `read` means read.

## write (leaving this machine)

1. Inspect the funnel repo: `git branch --show-current`, `git status --porcelain`,
   `git log --oneline origin/<branch>..HEAD`.
2. If the tree is dirty, commit everything on the current branch with a message that
   starts `WIP:` and says in one line what is half done. Never leave uncommitted work.
   Then `git push`. If push fails, say so and still write the entry.
3. Prepend an entry to `~/claude-workspace/handoff.md` directly under the `---` line that
   follows the intro, so the newest entry is on top. Use this shape:

       ## <YYYY-MM-DD HH:MM> · <hostname> · <one-line topic>

       **Lane**: <funnel app | marketing site | rubric | recon | other> · <repo> <branch> @ <short sha>
       **Done this session**: 2-6 bullets, concrete, past tense.
       **In progress**: what is half built, which files, what state it is in.
       **Next**: the first thing to do on the other machine, then the rest.
       **Waiting on Eric**: decisions or actions only Eric can take.
       **Session**: `claude --teleport <id>` if the session was sent to the cloud,
       otherwise "local only on <hostname>".
       **Desktop-only paths touched**: anything under ~/innovlabs or ~/Downloads that the
       other machine does not have.

   Get the hostname with `hostname`. Keep it under 30 lines. No secrets, ever.
4. Refresh this session's living handoff file in `~/claude-workspace/sessions/` (session-handoff
   skill, mode "living"), then run `node ~/claude-workspace/os/sync/backup.mjs run`. It snapshots
   every repo (uncommitted work too, to private refs) and commits + pushes `~/claude-workspace`
   with the entry and any memory changes.
5. Reply with the entry text and the two push results. If the session should continue
   on the other machine as a conversation, remind Eric to use Continue In from the desktop
   app and add the session id to the entry.

## read (arriving on a machine)

1. `git pull` in `~/claude-workspace` and in the funnel repo (`git pull --ff-only`).
   Report if either has local changes or a failed pull. To continue one specific session, use
   the session-handoff skill, mode "continue" ("continue <id8>"): it restores every repo the
   session touched from its backup, uncommitted work included.
2. Print the newest entry from `~/claude-workspace/handoff.md` verbatim.
3. Verify its state claims cheaply: `git log -1` matches the sha, `git status` clean.
   Note any drift.
4. Ask Eric which lane to continue, or start on the entry's first Next item if Eric
   already said so.

## Rules

- The workspace repo is private but still on GitHub: no passwords, tokens, cookies,
  or keys in entries or memory.
- Do not copy or sync transcripts. The entry plus memory is the handoff.
- All Korean-copy and product rules in CLAUDE.md still apply to any WIP commit.
