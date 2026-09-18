---
name: daily-recap
description: Summarise a day's Claude Code sessions as daily-update bullets. Use for "what did I do today", a standup update, or a recap of a given date.
argument-hint: "[18 Sep 2026 | today | yesterday]"
---

Run `python3 .claude/skills/daily-recap/prompts.py "<date>"` — `18 Sep 2026`, `2026-09-18`, `today` (the default) or `yesterday`. It prints the date, then the day's human prompts grouped by project directory, in time order, with a repeated prompt collapsed to one line and an `(xN)` count.

Open the update with `Date: <the date the script printed>`, then turn the prompts into an update **a manager reads in thirty seconds**: they track progress and risk, not implementation.

- One `##` heading per project the script printed, named the way the manager says it (the product or repo name), including the one-prompt ones.
- Under each, bullets of **outcome**: what now works that did not work this morning. One line each, plain language — the feature, the fix, the thing unblocked.
- Write the user-visible effect rather than the mechanism: "logging out now returns you to the login page", not the routing change that did it. Keep a technology name only when the manager already tracks it (the hosting provider, the database, the deploy).
- Course lessons, file paths, function names and tool invocations stay out; report what they produced.
- Close a project with `**Blocked / open**` when something is genuinely unfinished — that line is the one a manager acts on, so name what is stuck and what it waits on.

Then one `## Planned for tomorrow` across all projects: the blocked items, the next step of anything mid-flight, and anything the user said they would do next. Draw only from what the day shows; when it shows no next step, say so in one line and let the user fill it in.
