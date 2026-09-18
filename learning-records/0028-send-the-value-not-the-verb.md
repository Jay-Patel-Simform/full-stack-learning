# 0028 — Send the value, not the verb

Date: 2026-09-10
Lesson: [25 — Send the value, not the verb](../lessons/0025-send-the-value-not-the-verb.html)

## Context

Record 0027 named writes as the next lesson: "`setQueryData` on `tasksKey(teamId)`,
not an invalidate". The list from lesson 24 is read-only, and the four buttons on
the team row still do nothing. Jay's standing rule from lesson 24 holds — the code
lives in the lesson, not in `web/`.

## Decision

**1. The lesson's idea is the SHAPE OF THE SENTENCE, not the cache API.**
`PATCH { done: true }`, never `POST /tasks/:id/toggle`. A verb is a bet about
what the server currently holds; a value is a statement about where you want to
end up. Measured: the same PATCH sent twice answers `200` with the same row both
times. A toggle sent twice returns you to where you started, and both replies
say success. `setQueryData` is then the easy half of the lesson.

**2. The reply is authoritative, so `setQueryData` and stop.** `updateTask`
returns the whole row and the route serialises it through `TaskPublic`, so the
mutation's `onSuccess` maps one row over the cached list. Invalidating would be
a second round trip to learn what the first reply already carried. Named the
exception on the reference card: invalidate when the write changed something you
were *not* told about (ordering, paging, other keys).

**3. No `onError`, and that is the teaching point.** The checkbox is
`checked={task.done}` — drawn from the cache — so a 403 leaves the cache
untouched and the box un-ticks itself on the next render. **The cheapest
rollback is having nothing to roll back.** The break-it exercise is to add
`useState(task.done)` and watch the screen keep a tick the server refused.

**4. Native `<input type="checkbox">`, not `npx shadcn add checkbox`.** One
line, keyboard-accessible, nothing to update. Tenth lesson with no new
dependency.

**5. `setDone.variables.id === task.id` disables only the row in flight.** It
also quietly introduces `variables` — the payload currently being sent — which
is the piece people usually reach for `useState` to reproduce.

**6. Optimistic updates are explicitly deferred**, in the "what this does NOT
do" table. `onMutate` + rollback is real work and is only worth it once the
delay is felt. Naming it as deliberate stops it reading as an omission.

## Measured, on the real API

Throwaway user, Owner of team 443 (task 359), Viewer of team 444:

```
PATCH /teams/443/tasks/359   {"done":true}              200  {"id":359,"title":"Tick me","done":true}
PATCH /teams/443/tasks/359   {"done":true}    again --> 200  {"id":359,"title":"Tick me","done":true}
PATCH /teams/443/tasks/359   {}                         400  "send at least one field to change"
PATCH /teams/443/tasks/359   {"done":"yes"}             400  "done: expected boolean, received string"
PATCH /teams/443/tasks/359   {"done":false,"ownerId":1} 400  "Unrecognized key: \"ownerId\""
PATCH /teams/444/tasks/359   {"done":true}              403  {"error":"forbidden"}
PATCH /teams/443/tasks/999999 {"done":true}             404  {"error":"not found"}
```

Then deleted the user, its memberships, sessions, audit rows, tasks and both
teams, and asserted the rows were gone. His dev database is as I found it.

## Consequence

- New: `lessons/0025-send-the-value-not-the-verb.html`,
  `lessons/show-me-0025-value-not-verb.html`,
  **`reference/react-query-rules.html`** — the first front-end reference card,
  collecting lessons 22–25 (the one-line rules, query/mutation shapes, the
  setQueryData-vs-invalidate table, the status codes the page must recognise,
  and a glossary).
- `lessons/index.html` gained the lesson row and the new card.
- **Zero code changes in `server/` or `web/`.** Test count unchanged at 141:
  nothing new was written, and `tasks.test.ts` already covers the PATCH.

## Found while writing it

- **The idempotence argument is stronger than the "avoid a refetch" argument**,
  and it was not in the plan. The plan's line was about `setQueryData`; the
  measurement (the same request twice, the same reply twice) handed me a better
  spine, and it is a rule that outlives React.
- **The 400s are free lesson material.** `{}`, `{"done":"yes"}` and an extra
  `ownerId` are three refusals from lessons 17 and 21 that the write path
  re-encounters for the first time. Showing the old wall standing is cheaper
  than teaching a new one.
- **CSRF needed no new work.** The browser sends `Sec-Fetch-Site: same-site` and
  `allowWrite` checks the origin (lesson 16), so the first write from the page
  costs a one-sentence aside rather than a lesson. Nine lessons of interest
  paid out at once.
- Second lesson running with no headless Chrome. The React here is reviewed,
  not executed — the risk is a `tsc` error I cannot see. The one line I am
  least sure of is `setDone.variables.id`, which is `undefined` before the
  first mutation; it is guarded by `setDone.isPending &&` on its left, so it
  narrows, but if `tsc` complains, `setDone.variables?.id` is the fix.
- Lesson length: **14.1 KB**, up from 13.1 — prose about 5 KB, the rest code
  and the measured table. Prose is under the 6 KB target set last time.

## Open

- **Creating a task from the page.** The list can now be edited but not grown;
  `POST /teams/:id/tasks` is still called by hand. That is the next lesson, and
  it is the first write whose reply must be *appended* rather than mapped over
  — the one case where `invalidateQueries` may actually be right.
- Still no way to create a team in the UI; `POST /teams` remains uncalled.
- Still no front-end test. A form with validation is the first thing worth a
  Vitest, and it is his exercise now, not mine.
- Optimistic updates, deferred deliberately (see above).
- Week 11-12 (Docker + deploy) is next in the plan once the tasks screen can
  create rows. Expect the usual pushback on image size — have the lighter
  fallback ready, per NOTES.
