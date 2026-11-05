---
name: handoff
description: Update the persistent handoff (HANDOFF.md + auto-memory) so the next session resumes exactly here. Use at the end of any session that changed code, decisions or plans, before a long break, or when the user says "handoff", "save state", "remember where we are".
---

# Handoff

`HANDOFF.md` (repo root) is loaded into every new session by the
SessionStart hook in `.claude/settings.json`. It is the single place a fresh
session learns what is going on. Auto-memory holds the durable facts about
the founder and project; the handoff holds the moving state.

## Steps

1. **Gather facts, don't recall them.**
   - `G=/Applications/Xcode.app/Contents/Developer/usr/bin/git` (the
     /usr/bin/git shim may be blocked by the Xcode license).
   - `$G log --oneline -15`, `$G status --short`, and whether `main` is
     ahead of `origin/main` (`$G rev-list --count origin/main..main`).
   - Test count from the last `npm test` run you did this session, if any.
2. **Rewrite `HANDOFF.md`** (rewrite, don't append; keep it under ~80 lines):
   - `Last updated:` today's date and the model.
   - **Where things stand**: what is live vs only local, phase status, links.
   - **In progress**: what was being done when the session ended, with the
     exact next command or file if mid-task.
   - **Next**: the founder's open decisions, then the engineering queue.
   - **Environment gotchas**: keep the list; add any new one found.
   Brand rules apply to anything quoted from the site, but the handoff
   itself is an engineering note (English, plain).
3. **Sync the details elsewhere**: plan or phase changes go in
   `POS-PLAN.md`; new rules or conventions go in `CLAUDE.md`; never
   duplicate them in the handoff beyond one line.
4. **Update auto-memory** when a durable fact changed (a founder decision,
   a preference, a new constraint): edit the existing
   `maisha-matcha-project.md` memory in BOTH memory folders
   (`~/.claude/projects/-Users-authority-MaishaMatcha/memory/` and
   `~/.claude/projects/-Users-authority/memory/`, because sessions start
   from either directory). One fact per memory file; update, don't
   duplicate.
5. **Commit** `HANDOFF.md` (and any doc changes) as Joel alone, no
   co-author trailer. Do not push unless the user asked.
6. Tell the user in one or two sentences what the next session will pick up.
