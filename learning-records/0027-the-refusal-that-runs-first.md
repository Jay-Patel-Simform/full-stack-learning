# 0027 — The refusal that runs first

Date: 2026-09-10
Lesson: [24 — Two ways to say no](../lessons/0024-two-ways-to-say-no.html)

## Context

Record 0026 left the four buttons doing nothing and named the next lesson:
tasks on screen, "the first place where the UI and the gate can disagree about
a *row*". Jay also changed how lessons are delivered — see below.

## Decision

**1. The lesson is the code. The app stays untouched.** Jay asked for it in so
many words: write the code in the lesson, not in `web/`, so he reads it, then
types it himself. So lesson 24 carries three complete pieces (`tasks.ts`,
`tasks-panel.tsx`, a four-line edit to `teams-card.tsx`) and `web/src` has no
new file. Consequence I have to hold on to: **I can no longer verify the front
end by running it.** What I *can* still verify is the server, and I did — the
whole lesson is built on a measured API table rather than a rendered page.

**2. The lesson's idea is the ORDER of the two refusals**, not a list of status
codes. 403 comes from `requirePermission`, a `preHandler`; 404 comes from the
handler after `where: { id, teamId }` finds nothing. Because the gate runs
first, **403 always wins, and a 404 is proof you passed the gate**. That is why
the 404 must stay vague: it is only ever seen by someone who is allowed in.

**3. Ambiguity is the feature.** Two pairs of URLs answer identically:

```
PATCH /teams/431/tasks/357     own team, own task            200
PATCH /teams/174/tasks/357     team I own, task is elsewhere 404
PATCH /teams/174/tasks/999999  team I own, no such task      404   <- same
PATCH /teams/432/tasks/357     team where I am a Viewer      403
PATCH /teams/11/tasks/1        team I am not in at all       403   <- same
GET   /teams/432/tasks         viewer, empty team            200 []
GET   /teams/11/tasks          not a member                  403
```

The first pair stops task-id enumeration, the second stops team-id
enumeration. Lesson 18's rule, now with a second shape.

**4. The front-end half is one line: the query key.** `["teams", teamId,
"tasks"]`, not `["tasks"]`. Drop the scope and the second team you open reads
the first team's rows out of the cache — fresh for 30 s, **no request made and
therefore no refusal possible**. The server did not leak; the cache did. Framed
as: *a query key is not a name for a request, it is a claim about which answers
are interchangeable.*

**5. The error line must not out-explain the server.** `errorMessage(error,
"Could not load tasks.")` and nothing cleverer. A friendly "that task belongs
to another team" hands back exactly what the 404 blurred. New failure mode for
him: the leak arrives in the *UI copy*, not the API.

**6. Disclosure by unmounting, not `enabled`.** `{open ? <TasksPanel/> : null}`
— a component that is not mounted asks nothing. No `enabled` flag, no effect,
and `open` is honest `useState` because it is a fact about this tab.

## Measured, on the real API

Booted the server, registered a throwaway user, gave it OWNER of two teams and
VIEWER of a third, and ran the seven requests above with curl and a cookie jar.
Then deleted the user, its memberships, sessions, audit rows and two tasks —
his dev database is as I found it.

## Consequence

- New: `lessons/0024-two-ways-to-say-no.html`,
  `lessons/show-me-0024-403-vs-404.html`.
- `reference/rbac-permissions.html` gained a **403 vs 404** section (table, the
  measured five, four rules) and a glossary row.
- **Zero code changes in `server/` or `web/`.** Nine lessons with no new
  dependency; first lesson with no new file in the app at all.
- Test count unchanged at 141 — nothing new to test, because nothing new was
  written. The behaviour the lesson teaches was already covered by
  `tasks.test.ts`.

## Found while writing it

- **The 404 story only exists because of `updateMany`.** `task.store.ts` uses
  `updateMany`/`deleteMany` precisely so a missing id reports `count: 0` instead
  of throwing — a choice made in lesson 10 for ergonomics that turns out to be
  what makes the ambiguous 404 cheap to write.
- **A Viewer's `GET /teams/:id/tasks` on an empty team is `200 []`, not a
  refusal** — worth stating, because it is the one place where "empty" and
  "forbidden" are *allowed* to be distinguishable: the 403 already refused to
  confirm the team.
- Lesson length: **13.1 KB**, up from 12.5 and the highest yet. It is now three
  files of source code by request. The old ~9 KB target does not survive the
  new format; the honest target is "prose short, code complete", and the prose
  here is about 6 KB.
- I did not run headless Chrome for the first front-end lesson in three. Right
  call — there is no page to drive — but it means the React in this lesson is
  reviewed, not executed. If he reports a `tsc` error, that is on me.

## Open

- **Writes.** Ticking `done` is the next lesson and the first mutation with a
  cache to update — `setQueryData` on `tasksKey(teamId)`, not an invalidate.
- Still no way to create a team in the UI; `POST /teams` remains uncalled.
- No front-end test, and now no front-end code from me either. Vitest becomes
  *his* exercise rather than mine.
- If he types the code and it does not compile, fold the fix into lesson 25's
  opening rather than silently editing 24.
