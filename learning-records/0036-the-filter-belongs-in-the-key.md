# 0036 — A filter is an input to the answer, so it belongs in the key

Date: 2026-09-10
Lesson: [33 — The list is a question](../lessons/0033-the-list-is-a-question.html)

## Context

He asked for lesson 33 in one line, no topic. Record 0035 had already named
filtering as the obvious next target, and it was right for a reason worth
keeping: **it is the first thing where a query key gains a second dimension**.

State check first, and this time nothing had drifted:

```
server npm test        146 pass
web    npm test          4 pass    <- he typed lesson 32's tests
web    npx tsc -b      clean
web    npm run build   clean
```

First session in three where the pre-flight check found no gap. Lesson 32's
split — I apply the plumbing, he types the test — produced a clean handover.
Worth repeating.

## Decision

**1. Fourth session running where the probe wrote the headline.** I planned
"add two filters, put them in the key". The measurement made the *absence* of
the filter the lesson. Real `QueryClient`, real `InfiniteQueryObserver`, 12
fake rows:

```
filter NOT in the key:
  clicks "Done"   -> requests sent: [ done=undefined ]     <- ZERO new requests
                     on screen: 100,101,102,103            <- unchanged
  "Load more"     -> done=true cursor=103
                     on screen: 100,101,102,103,106,109    <- two lists, one array

filter IS in the key:
  clicks "Done"   -> done=true cursor=undefined            <- paging reset, free
  back to "All"   -> 0 new requests
  cache: ["teams",7,"tasks",{}] , ["teams",7,"tasks",{"done":true}]
```

The zero is the teaching. A missing filter in a key is not a wrong answer, it
is **no reaction at all** — no error, no network row, nothing to search for.
That is a strictly harder bug than a wrong result, and it is the one shape of
front-end bug he has not met yet.

**2. Then the server confirmed the second half.** The cursor crossing filters
is not an error either:

```
?done=true  no cursor       -> 4 rows   correct
?done=true&cursor=103       -> 1 row    (100 and 103 sit before the cursor)
```

A cursor is a *bookmark in one list*. Postgres cannot know the bookmark came
from a different question. Pairs with lesson 30's "count to a place or look one
up" — a look-up is only cheap while the list it looks into stays the same list.

**3. Second-order finding, and the best part of the lesson: contents vs
membership.** Filters turn one cache entry per team into many, and that breaks
lesson 25's surgical `setQueryData`. Measured:

```
before             {}            -> 100:true,101:false,102:false,103:true
before             {done:false}  -> 101:false,102:false
  tick 101 while looking at "Open", lesson-25 style write
after setQueryData {}            -> 101:false     <- stale
after setQueryData {done:false}  -> 101:true      <- a done row in a not-done list
```

The naming is what makes it teachable: you still know the row's **contents**
(the PATCH reply is the whole row, exactly as in lesson 25). What you lost is
its **membership** — whether it still answers the question this list asks. So
two mutations go back to `invalidateQueries` and one keeps its patch.

**4. Delete is the exception, and the reason generalises.** A deleted row
leaves *every* question at once, so there is no membership left to doubt.
`editPages` changed by one word — `setQueryData` -> `setQueriesData`, taking
the prefix — and now drops the row from every filter cached. His four lesson-32
tests passed unchanged, because an exact key is a prefix of itself. That is a
nice property to point at: the test he wrote last week still constrains the
code after a real design change.

**5. Two traps I would have shipped, both caught by measuring instead of
recalling.**

```
z.coerce.boolean().parse("false")   -> true     <- ?done=false means "done"
z.stringbool().parse("false")       -> false
prisma contains: "buy"              -> 2 of 4 real matches
prisma contains + mode:insensitive  -> 4 of 4
```

`coerce.boolean` is the sharper one, and it generalises into a rule worth more
than the fact: **coercion converts, parsing decides.** `coerce.number()` is
fine because `Number("abc")` is `NaN` and zod still refuses it. `Boolean()`
*can never fail*. Lesson 29 already gave him "dead code has no failing state";
this is the same idea one level down.

**6. tsc corrected my comment, and I put that in the lesson.** I wrote
`where: { teamId, done }` with a comment saying the spread was cosmetic.
`TS2375` under `exactOptionalPropertyTypes` refused it. Left the story in
because it is a rare case of a config flag he never chose earning its keep —
and because "the compiler disagreed with my comment" is a better argument for
strict flags than any list of benefits.

**7. Three buttons, not a checkbox.** `done` is true / false / absent, and
absent is the answer a checkbox cannot express. Third use of the three-states
shape (session in 22, `nextCursor` null vs undefined in 31). He now has enough
instances that I can name the family: **when "no answer" is a real answer, a
boolean is the wrong control.**

**8. A form is the debounce.** A search box wants debouncing; debouncing wants
a timer; a timer wants `useEffect`, and this app has had zero since lesson 22.
So the words live in `useState` and join the key on submit. One request per
Enter. Fifth use of "work hangs off the event that caused it", and the first
time that rule *replaced* a technique rather than just forbidding one.

**9. `placeholderData: keepPreviousData` — one line, put in.** Measured:
without it a filter switch is `isPending: true` with `data: undefined`, so the
panel — filter bar included — is replaced by "Asking…" and there is no way
back. One line, a visible bug, no argument needed.

**10. The trim fix is done, without a sixth ask.** Five asks, and I had said in
writing I would just do it. Done, plus two tests, plus the order trap measured
(`.min(1).trim()` on `"   "` returns `""` and a 200). Saying "it is done"
rather than asking again is the whole point of having written it down.

**11. Split of work, matching lesson 32.** I applied the server (six lines,
mechanical, and safe to land first because nothing called the filters yet) and
the front end (verified `tsc -b`, `npm run build`, 4 tests, all clean). His
typing goes to the two deliberate breakages and one new test — the fifth
`edit-pages` test, which is the only place `setQueriesData` vs `setQueryData`
can be pinned down. Reserving his keystrokes for the part that *proves* the
rule is working better than having him retype plumbing.

## Measured

```
server npm test                       146 -> 154   (6 filter + 2 trim)
web    npm test                       4 -> 4       (unchanged, on purpose)
web    npx tsc -b / npm run build     clean
prefix invalidate, 2 keys, 1 mounted, 2 pages held:
  entries marked stale                2 of 2
  requests actually sent              2        <- mounted key only, one per page
keepPreviousData on a key change      isPending false, isPlaceholderData true
axios params {cursor:undefined,done:false}  -> ?sort=id&dir=asc&done=false
react-query key hash {done: undefined}      -> {}    (undefined dropped)
EXPLAIN title ILIKE '%buy%'  -> Index Scan on Task_teamId_idx, then
                                Filter: title ~~* '%buy%', Rows Removed: 8
```

## Found while writing it

- **`{ done: undefined }` and `{}` are the same cache entry.** React Query
  drops undefined when it hashes a key. That is what makes
  `onChange({ ...filter, q: undefined })` safe instead of creating a duplicate
  entry holding an identical answer.
- **"No tasks yet" becomes a lie the moment a filter exists.** There may be
  plenty of tasks and none of them done. Empty states have to distinguish
  *nothing here* from *nothing matches*, and the filter bar must survive the
  empty state or the user is stuck. Small, and the kind of thing that only
  shows up when you actually click it.
- **`~~*` is Postgres' internal name for `ILIKE`**, so the query plan proves
  `mode: "insensitive"` did something rather than being believed.
- The `?q=` / `?sort=` contrast is the cleanest callback available to lesson
  20: same file, two inputs, one a value that travels as a parameter and one an
  identifier that has to be part of the SQL text. Used it as an aside.
- Lesson 27 KB, show-me 8 KB. Two reference cards updated, no new card — the
  content splits cleanly between React Query rules and pagination.

## Consequences

- New: `lessons/0033-the-list-is-a-question.html`,
  `lessons/show-me-0033-the-key-is-the-question.html`.
- `server/src/schemas/task.schema.ts`: `title` trimmed; `done` and `q` added.
- `server/src/store/task.store.ts`: two spreads in the `where`.
- `server/src/routes/task-filter.test.ts`: new, 8 tests. Suite **154**.
- `web/src/features/tasks/tasks.ts`: `TaskFilter`, `tasksScope`, `tasksKey`
  takes a filter, `useTasks(teamId, filter)`, `keepPreviousData`, and the three
  mutations rewired.
- `web/src/features/tasks/edit-pages.ts`: `setQueriesData` on a prefix.
- `web/src/features/tasks/tasks-panel.tsx`: `TaskFilterBar` at module level,
  filter state, honest empty state.
- `reference/react-query-rules.html`: 8 new one-line rules, a new "Filters: the
  key is the question" section, two new rows in the write table, five glossary
  rows.
- `reference/pagination-and-indexes.html`: filters in the schema and the
  `where`, a four-row trap table, the cursor-across-filters measurement, and
  the `pg_trgm` note.
- `reference/the-whole-arc.html`: lessons 32 **and** 33 (32 was missing — it
  had drifted a lesson behind), six new words, seven new traps, and the "still
  open" list pruned of five items that are now done.
- `lessons/index.html`: lesson 33 row, rewritten "next up".
- `PLAN.md`: lesson 33 closed with nine rules; the trim fix struck out.

## Open

- **Lesson 33 is finished when he does step 3, step 4 and step 5.** Two
  deliberate breakages (drop the filter from the key; put lesson 25's write
  back) and one new test. Expect web 4 -> **5**. Check first next session, and
  check the specific line, not just "did he apply it" — record 0035's lesson.
- Session state is a pair: **server 154, web 4** (5 after his test).
- `pg_trgm` for `?q=` — named, measured unnecessary, not built. I asked him for
  an opinion on whether this app should ever need it. He owes me an answer.
- Every filtered list refetches on any write. Refetching less is the
  optimisation, named and skipped for the third time.
- Vitest is still deferred. Trigger unchanged: the first component test. The
  filter bar is now the most tempting thing to write one for — three buttons
  and a form, all behaviour, no network. That is the likeliest next flip.
- Still open: no `POST /teams` from the page, nobody reads the audit log, soft
  delete + undo, idempotency keys, invite mailer, Redis for both counters,
  nginx + CSP for the page, Docker and deploy last.
