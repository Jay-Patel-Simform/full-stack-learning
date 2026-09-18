# 0034 — A declared type is believed, not checked

Date: 2026-09-10
Lesson: [31 — The pages you threw away](../lessons/0031-the-pages-you-threw-away.html)

## Context

He asked to move to lesson 31 in one line, no topic question. The topic was
already decided: record 0033 left `useInfiniteQuery` as a **named bug**, not a
nice-to-have — the panel shows the first 20 tasks and drops `nextCursor`, so
task 21 exists and no request returns it.

State check before writing, and it corrected the plan:

```
npm test                143 pass, 0 fail     <- not the 146 record 0033 predicted
src/routes/task-page.test.ts   exists, 1 test
web: npx tsc -b         clean
```

So lesson 30 **is** applied — schema, store, route and `web/.../tasks.ts` all
carry the cursor — and he wrote the hard test (the cursor walk with the
duplicate `Set` guard) and skipped the three easy ones. That is the right
order of effort and worth saying so. `web` has no `typecheck` script but
`npx tsc -b` works, so the front-end check exists; record 0033's note stands
but is smaller than it looked.

## Decision

**1. Second session running where the probe wrote the headline.** I expected
this lesson to be "add the hook, flatten the pages". The measurement found
something better: changing only `useTasks` to `useInfiniteQuery` gives **3 type
errors, all in `tasks-panel.tsx`, and 0 in `tasks.ts`** — where three
`setQueryData<Task[]>` calls are now guaranteed to throw. That asymmetry is the
spine of the lesson, and it is a rule he has now met three times.

**2. New rule, third costume: a type parameter is a claim you made, not a fact
TypeScript checked.** Lesson 17 was `as CreateTaskInput`. Lesson 28 was
`api.delete<Task>()` on a 204. This is `setQueryData<Task[]>` on a paged
cache. Naming it as *the same move in a third costume* is what turns three
anecdotes into one rule. Short version for the wall: **inferred types are
checked, declared ones are believed.**

**3. New word pair: query vs infinite query.** Twelfth pair. One key, one
answer / one key, a growing ordered list of answers. The test it gives: *does
this key hold one reply, or a pile of replies?* — because everything that
reads or writes the key has to know, and the compiler only tells you about the
reads.

**4. One `editPages` helper, not three corrected call sites.** Three sites each
writing `setQueryData<InfiniteData<TaskPage>>` is three chances to write a
different wrong shape. The helper takes a plain `Task[] => Task[]`, so the
mutations get *simpler* than they were before paging. Same instinct as lesson
17's one validator compiler instead of seven `.strict()` calls: one place beats
N places, and mutation number four gets it free.

**5. Create loses its append, and I said plainly that lesson 26 was right and
is now not enough.** Lesson 26's comment argued the append was safe *because*
`sort=id&dir=asc` makes the newest row last. That reasoning still holds; what
broke is that "last" now means the last row of the **last page**, which you may
not be holding. So `invalidateQueries` — and I gave the measured price (one
request per page held) rather than pretending it was free. Correcting an
earlier lesson's line by showing the condition it depended on is better
teaching than quietly replacing it.

**6. Deliberately not built, and argued in the lesson:** refetch-only-the-last
page, and append-when-`hasNextPage`-is-false. Both real, both extra state to
get wrong, for a list of five tasks. Same shape as lesson 30 ending in "do not
add the index" — measure, then decide, and "not yet" is a decision.

**7. Vitest moved out of this lesson, on purpose.** PLAN and record 0033 both
said lesson 31 was the place to add Vitest + Testing Library. Two topics in one
lesson breaks the working-memory rule in NOTES, and paging alone is already
26 KB. Better: this lesson *creates* the right first test target — `editPages`
is a pure function with no DOM, so lesson 32 can be Vitest with something worth
testing already sitting there. Told him this in the lesson and the index.

**8. A button, not infinite scroll.** One line, keyboard reachable, announced,
and it tells the user the list has an end. `IntersectionObserver` is a trigger
that can be added later without touching the hook.

**9. Exercise 4 has him re-break it on purpose.** Put the old
`setQueryData<Task[]>` back, confirm `tsc` is *still clean*, then click delete
and watch the `TypeError` — with the row still on screen and the task actually
gone from Postgres. Third lesson running where he sees the failure before he
trusts the fix.

**10. The trim fix: stopped asking.** Record 0033 said do not ask a fifth time.
The lesson says I will do it with him next session unless he says no.

## Measured

Real `QueryClient`, `@tanstack/react-query 5.102.8`, walked to three pages:

```
pages held: 3   queryFn calls: 4          <- a new page never refetches the old ones
cache shape keys: [ 'pages', 'pageParams' ]
typeof data.map: undefined
OLD setQueryData<Task[]> line throws: TypeError: tasks?.map is not a function
refetch (what an active invalidate does): 3 queryFn calls   <- one per page held
```

Hook changed, nothing else, `npx tsc -b` in `web`:

```
tasks-panel.tsx(32,13) TS2339  Property 'length' does not exist on
                               'InfiniteData<TaskPage, unknown>'
tasks-panel.tsx(38,16) TS2339  Property 'map' does not exist ...
tasks-panel.tsx(38,21) TS7006  Parameter 'task' implicitly has an 'any' type
tasks.ts                       0 errors   <- the three broken cache writes
```

Then applied the whole change (hook, `editPages`, three mutations, `flatMap` +
`hasNextPage` button): **`npx tsc -b` clean**. Restored both files from
backups, re-ran `tsc -b`: clean, and `diff` reports identical. Record 0025's
standing rule holds — `server/` and `web/` are byte-identical to how I found
them, and `npm test` is still 143.

## Found while writing it

- **The invalidate probe lied the first time.** `invalidateQueries` with no
  mounted observer refetched **0** pages, because invalidate only refetches
  *active* queries. Had to re-probe with `refetchQueries` to get the honest
  number (3). Nearly shipped "invalidate is free" — a measurement can be right
  and answer a different question than the one you asked.
- **`?? undefined` is a boundary worth a paragraph.** His server says
  `nextCursor: null`; React Query's terminator is `undefined`. They agree
  today, so the conversion looks like noise — it is where a decoder goes the
  day the server says `"end": true`.
- **`initialPageParam: undefined` and a returned `undefined` mean opposite
  things.** Same value, one read at the start, one returned at the end. Went
  into a quiz explanation because it is the kind of thing that reads as a
  contradiction.
- **`flatMap` must sit after the two early returns**, not before — that is
  where `data` stops being possibly-undefined. Placement as a type fact, not a
  style choice.
- **The panel's JSX did not change at all.** `tasks` is the same flat array of
  the same objects. Worth pointing out: the blast radius of paging is the hook
  and one line, *if* the cache writes go through one helper.
- Lesson 26 KB, show-me 9 KB. Reference card updated rather than a new one —
  React Query already had a card and paging belongs on it.

## Consequence

- New: `lessons/0031-the-pages-you-threw-away.html`,
  `lessons/show-me-0031-pages-in-the-cache.html`.
- `reference/react-query-rules.html`: four new one-line rules, a new
  "Paging: `useInfiniteQuery`" section with the recipe, the `useQuery` vs
  `useInfiniteQuery` shape table, the `editPages` recipe, a corrected
  "after a write" table (append is now conditional on the list being unpaged),
  five new glossary rows.
- `reference/the-whole-arc.html`: lesson 31 sentence, three new words, two new
  traps, three new open items. Checked it this lesson, per record 0033.
- `lessons/index.html`: lesson 31 row, rewritten "next up" (front-end test).
- `PLAN.md`: lesson 31 closed with six rules and the measurements.
- **Zero net code changes in `server/` or `web/`.** Suite still 143.

## Open

- **Lesson 31 is only finished when he types it.** Four edits, two files.
  Expect 3 type errors after edit 1, clean after edit 4, and a "Load more"
  button that disappears on the last page. Check first next session.
- **Lesson 30's three unwritten tests.** 143 → 146. In lesson 31's Do this.
- **Vitest + Testing Library is lesson 32**, with `editPages` as the first
  test. Sixth lesson with no front-end test — but now there is a pure function
  to point it at, which is a better start than a DOM test.
- The lesson-26 **trim fix**: I said I will do it with him next session unless
  he says no. Do not ask again.
- Create-in-a-paged-list costs one refetch per page. Optimisation named and
  skipped.
- Still open from earlier: soft delete + real undo, idempotency keys, no
  `POST /teams` from the page, filtering (`?done=`, `?q=`), invite mailer,
  Redis for both counters, nginx + CSP for the page, Docker and deploy last.
