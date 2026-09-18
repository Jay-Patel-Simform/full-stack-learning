# 0029 — The request you cannot repeat

Date: 2026-09-10
Lesson: [26 — The request you cannot repeat](../lessons/0026-the-request-you-cannot-repeat.html)

## Context

Record 0028 named creating a task as the next lesson: "the first write whose
reply must be *appended* rather than mapped over — the one case where
`invalidateQueries` may actually be right". Jay had already implemented lesson
25 himself in `web/` (with the shadcn `Checkbox`, not the plain `<input>` the
lesson showed), so his standing rule from lesson 24 is holding: code lives in
the lesson, he types it.

## Decision

**1. The spine is the counterpart to lesson 25, not a repeat of it.**
Lesson 25: send the value, because a value survives being sent twice.
Lesson 26: **a create cannot survive being sent twice, so the guard moves to
the button.** Measured: the same `POST` body twice gave ids 360 and 361, both
`201`. Nothing failed — that is the point. The duplicate is the answer to a
question asked twice, not an error to catch.

**2. `disabled={create.isPending}` is taught as the duplicate guard, not a
spinner.** Naming what a line defends against is what made lessons 16 and 23
land. Its ceiling is named honestly in "what this does NOT do": it stops the
second *click*, not a retry. Idempotency keys are pointed at week 13 with the
Stripe doc as the read.

**3. The append-vs-invalidate rule got a MEASUREMENT instead of an assertion.**
Same four rows, two `sort` values: under `sort=id&dir=asc` the new task is last,
under `sort=title` it is first. So `setQueryData(..., [...tasks, task])` is
correct *because* `useTasks` asks for `sort=id`, and the lesson says so in a
comment inside the code. First honest `invalidateQueries` in the course, and it
is the break-it exercise rather than the recommendation.

**4. `useState` for the title, and the contradiction with lesson 25 is faced
head-on.** A table: `done` is a server fact, so state was a lie; a draft is
yours until the server accepts it. The consequence that earns the rule is
**clear the input in `onSuccess`, never in `onSubmit`** — a 403 must leave the
sentence on screen to be fixed.

**5. The empty-list early return is refactored in the lesson**, because
`tasks.length === 0` returning early would hide the form at exactly the moment
it is needed. Small, but it is the kind of bug that ships.

**6. No new dependency, eleventh lesson running.** `Input` and `Button` are
already in `web/src/components/ui/`.

## Measured, on the real API

Throwaway user 1663, Owner of team 445, Viewer of team 446:

```
POST /teams/445/tasks {"title":"Write the form"}   201  {"id":360,...}
POST /teams/445/tasks {"title":"Write the form"}   201  {"id":361,...}   <-- two rows
POST /teams/445/tasks {"title":""}                 400  title: Too small
POST /teams/445/tasks {}                           400  title: expected string, received undefined
POST /teams/445/tasks {"title":"x","done":true}    201  {"id":362,"done":true}
POST /teams/445/tasks {"title":"x","ownerId":1}    400  (root): Unrecognized key: "ownerId"
POST /teams/445/tasks {"title":"aaa…201"}          400  title: Too big
POST /teams/446/tasks (Viewer)                     403  {"error":"forbidden"}
POST /teams/999999/tasks (not a member)            403  {"error":"forbidden"}
POST /teams/445/tasks {"title":"   "}              201  ACCEPTED — see below

GET /teams/445/tasks?sort=id&dir=asc     [360, 361, 362, 363 "Aardvark"]   <-- new row last
GET /teams/445/tasks?sort=title&dir=asc  [363 "Aardvark", 360, 361, 362]   <-- new row first
```

Then deleted the tasks, audit rows, sessions, memberships, both teams and the
user, and asserted all six counts were zero. His dev database is as I found it.

## Found while writing it

- **A real server bug, found by probing, not by reading.** `title: z.string().min(1)`
  accepts `"   "` — spaces are characters. `z.string().trim().min(1).max(200)`
  refuses it and stores `"  hi  "` as `"hi"`; verified with `tsx -e` against the
  project's own zod 4. Because `UpdateTask` reuses `CreateTask.shape.title`, one
  word fixes both routes — the "fix it once where all callers route through"
  shape. Handed to him as exercise 6, with a test, rather than fixed for him.
- **There is no 404 on this route and that is worth one sentence**: you are not
  naming a row, you are asking for one. Lesson 24's pair does not apply
  everywhere, which is a better way to remember it than the rule alone.
- The two 403s (Viewer, and a team he is not in) are **one answer for two
  different reasons** — lesson 18's non-disclosure, third appearance, free.
- Lesson length 17.2 KB, prose ~5.5 KB (target under 6). Code is now most of
  the file, as intended since 24.
- Ran the show-me skill per workspace CLAUDE.md:
  `show-me-0026-the-request-you-cannot-repeat.html` — POST vs PATCH sent twice,
  the in-flight window closing, and the same four rows in two sort orders.

## Consequence

- New: `lessons/0026-the-request-you-cannot-repeat.html`,
  `lessons/show-me-0026-the-request-you-cannot-repeat.html`.
- `reference/react-query-rules.html`: three new rules (the create guard, the
  put-it-or-ask-for-it rule, where a draft lives), the "never invalidate" rule
  softened to "invalidate only when you must", a new row in the after-a-write
  table, and `in flight` + `idempotency key` in the glossary.
- `lessons/index.html`: lesson row, and the stale "next up" footer replaced.
- **Zero code changes in `server/` or `web/`.** Test count unchanged at 141 —
  exercise 6 is the one that should move it.

## Open

- **The trim fix and its test.** The only outstanding server work in week 10.
- Creating a team from the page. `POST /teams` is still uncalled, and it is the
  same form shape as today with one fewer scope — a good candidate for the
  first Vitest instead of a lesson.
- Deleting a task: `DELETE` answers `204`, so it is the one write with **no**
  authoritative reply, and `setQueryData` must filter rather than map. That is a
  genuinely new cache move and is worth a short lesson if he wants it.
- Optimistic updates, deferred a second time, deliberately.
- Still no front-end test.
- **Week 11-12 (Docker + deploy) is next in the plan.** Expect pushback on
  image size and memory — have the lighter fallback ready, per NOTES.
