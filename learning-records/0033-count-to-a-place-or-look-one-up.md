# 0033 — Count to a place, or look one up

Date: 2026-09-10
Lesson: [30 — The list with no end](../lessons/0030-the-list-with-no-end.html)

## Context

He asked to move to lesson 30 **and** to check that everything from the earlier
lessons still works first. So the session opened with a full check, not with
teaching. Everything was green:

```
npm run typecheck   clean
npm test            142 pass, 0 fail
npm run lint        0 errors (6 style warnings, all in test files)
npm start + /health 200
web: npm run build  built in 297ms
lessons 0001-0029   all present
```

**Lesson 29's homework is done.** `grep -rn "process.env" src/` outside
`config.ts` now hits only comments and generated Prisma files. `.env.example`
exists, and `session.test.ts` has the clear-cookie flag test — which is what
took the suite from 141 to 142. Third session in a row that carried work over;
first one where it came back finished. Say that to him.

One small gap found and left alone: `web/` has no `typecheck` script, so the
only front-end check is `npm run build`. Not worth a lesson.

He picked the topic from two options: pagination + N+1 (PLAN's next item)
versus front-end tests (the loudest gap). He took the recommendation.

## Decision

**1. The spine is offset vs cursor, and the probe again wrote the headline.**
I went in expecting "add pagination". The measurement found
`include: { owner: true }` in `listTasks` firing a second query that
`SELECT`s `"User"."passwordHash"` — for a relation `TaskPublic` throws away
before it reaches the wire. That is the memorable half of the lesson, and it
is a security-shaped finding in code we have read many times.

**2. New rule: the response schema guards the wire, not the query.** It is the
lesson-17 rule with a limit named. The serializer is the *last* wall. A field
it drops is a field that should never have been selected, because the hashes
still travelled Postgres → Node.

**3. Honest about N+1.** Prisma batches the owners into one extra query, so
this is 1+1, not N+1. I said so plainly and gave the real N+1 shape (`await`
inside a `for`) as the sibling. Overstating it would have been easier and
wrong — same call as record 0032's "the bug is not live".

**4. New word pair: offset vs cursor.** Eleventh pair. The test it gives:
*is the database counting to a place, or looking one up?* Counting gets slower
every page; a look-up does not.

**5. The tiebreak is the part people get wrong, so it got its own argument.**
`orderBy: [{ [sort]: dir }, { id: dir }]`. A non-unique sort key leaves ties in
an order Postgres never promised, and a cursor into an unstable order skips
rows with no error. I showed the SQL Prisma actually generates for the
two-key case — `(title = X AND id >= Y) OR title > X` — because that is the
keyset predicate from Use The Index, Luke, written for him by the ORM.

**6. The index section deliberately ends in "do not add the index".** The
compound index is a real 32× win for `ORDER BY createdAt`, and *nothing in his
app sorts by createdAt*. Measuring and then not acting is the lesson. An index
is not free; every INSERT writes to it.

**7. Told him what the change breaks, with numbers, before he starts.** Four
tests and one front-end line. And I said out loud that the UI now silently
shows the first 20 and drops `nextCursor` — a real invisible bug at 21 tasks,
whose fix (`useInfiniteQuery`) is the next lesson.

## Measured, on his real database

A throwaway team with 5,000 tasks, deleted afterwards. His table is back to 5
rows and `npm test` is back to 142.

```
all rows + include owner:  20ms  5000 rows   <- current code
all rows, no include:      15ms  5000 rows
take 20, no include:        3ms    20 rows
page 2 by cursor:           2ms    20 rows
page 250 by cursor/skip:    2ms    20 rows
```

Two queries, and the second one selects the hash:

```
SELECT "Task"."id", "title", "done", "createdAt", "ownerId", "teamId" ...
SELECT "User"."id", "User"."email", "User"."passwordHash", "User"."createdAt" ...
```

`EXPLAIN ANALYZE ... ORDER BY "createdAt" DESC LIMIT 20`, same 5,000 rows:

```
with (teamId):            Sort <- Index Scan rows=5000     0.814 ms
with (teamId,createdAt):  Index Scan Backward rows=20      0.025 ms   32x
```

And the counter-example that says do not add it — default `ORDER BY id`:

```
with (teamId) only:  Index Scan using "Task_pkey", no sort  0.017 ms
with (teamId,id):    Index Scan, no sort                    0.025 ms  <- slower
```

**Then applied the whole change** to `task.schema.ts`, `task.store.ts`,
`tasks.route.ts` and `web/.../tasks.ts`: `tsc` clean, `npm test` = **138 pass /
4 fail**, exactly the four in the lesson. Fixed those four
(`res.json()` → `res.json().items`), wrote `src/routes/task-page.test.ts`:
**146 passing**. `web` built clean and `tsc -p tsconfig.app.json` clean. Then
restored every file from backups and re-ran: **142 passing, md5 identical**.
Record 0025's standing rule holds — `server/` and `web/` are byte-identical to
how I found them.

## Found while writing it

- **The `include` was pure waste and had been since lesson 17.** `TaskPublic`
  has three fields and never had an owner. Two years of this code would have
  shipped password hashes into process memory on every list request. Nothing
  leaked, nothing failed a test — same shape as record 0032's dead code: *no
  green light will ever turn red*.
- **`EXPLAIN` is about your data, not about databases.** The `Task_pkey` plan
  is fast partly because that one team owned 5,000 of 5,005 rows. I measured a
  30-row team inside a 50,000-row table and Postgres picked a different plan.
  Put that caveat in the lesson rather than shipping a number without its
  conditions.
- **The infinite-loop guard in the cursor test earns its line.** `pages < 10`
  inside the walk loop. A broken cursor otherwise hangs the suite, and a test
  that hangs tells you nothing and blocks everything.
- **`new Set(seen).size` is the assertion that catches a missing `skip: 1`.**
  Without `skip`, every page repeats its first row and the count assertion
  alone still passes. Exercise 5 has him delete `skip: 1` and watch that one
  fail — second lesson running where he sees a test fail before he trusts it.
- **The whole-arc reference was eight lessons stale** (stopped at 22). Caught
  it while updating the index. Filled in 23–30 and four new words. Check it
  every lesson from now on, or it rots again.
- Lesson length 21 KB, show-me 11 KB, new reference card 9 KB.
- Ran the show-me skill per workspace CLAUDE.md:
  `show-me-0030-offset-vs-cursor.html` — 5,000 red ticks vs 20 green ones, the
  two `rows=` numbers in a plan side by side, and the two-query pipeline with
  the hash marked.

## Consequence

- New: `lessons/0030-the-list-with-no-end.html`,
  `lessons/show-me-0030-offset-vs-cursor.html`,
  `reference/pagination-and-indexes.html`.
- `reference/the-whole-arc.html`: lessons 23–30 added, four new words, three
  new open items.
- `lessons/index.html`: lesson 30 row, the new reference card, rewritten
  "next up".
- **Zero net code changes in `server/` or `web/`.** Test count still 142; it
  becomes 146 when he types it.

## Open

- **Lesson 30 is only finished when he types it.** Five edits, four test fixes,
  one new test file. Expect 138/4 → 142 → 146. Check first next session.
- **`useInfiniteQuery` + "Load more"** is now a *named* bug, not a nice-to-have:
  the page drops every task past the twentieth. This is the obvious next lesson
  and it is the right place to finally add Vitest + Testing Library.
- **No front-end test, fifth lesson running.** Loudest gap in the workspace by
  a wide margin now.
- The lesson-26 trim fix, **fourth time asked**, with the offer to pair on it
  repeated. Do not ask a fifth time — just do it with him.
- `@@index([teamId, createdAt])` measured, deliberately not added. Add it when
  a "newest first" sort exists.
- `web/` has no `typecheck` script. One line in `package.json` if it ever
  matters.
- Still open from earlier: soft delete + real undo, idempotency keys, no
  `POST /teams` from the page, invite mailer, Docker and deploy at the end.
