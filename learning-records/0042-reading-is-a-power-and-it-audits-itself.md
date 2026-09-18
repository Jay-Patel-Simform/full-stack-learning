# 0042 — Reading a log is its own power, and the read audits itself

Date: 2026-09-11
Lesson: [38 — Reading the audit log](../lessons/0038-reading-the-audit-log.html)

## Context

Sixth clean hand-over: `server` **157** passing (lesson 37 promised 156 — he
added one himself), `web` 5, `tsc` clean. Lesson 37 shipped whole: both
`?? undefined`s in `src/audit/audit.ts`, both `as never` casts gone, and the
`audit_json_null_to_sql_null` backfill applied. Verified by reading the files
and the table, not by asking.

The audit log has been write-only since lesson 18. Lesson 38 gives it a reader:
`GET /teams/:teamId/audit`.

## Decision

`"audit:read"` is a new entry in `ACTIONS`, granted to `ADMIN` (so OWNER too).
New `src/schemas/audit.schema.ts`, `src/store/audit.store.ts`,
`src/routes/audit.route.ts`, five tests in `src/routes/audit-list.test.ts`.
Query keys: `limit`, `cursor`, `status`. Nothing else.

I built and ran the whole thing before writing the lesson, then reverted it to
his pre-lesson state. Every number the lesson promises is measured, not guessed.

## Why it matters

Three ideas.

1. **Seeing is a power, distinct from doing.** A MEMBER holds `task:delete` and
   must not hold `audit:read`. Every action in the table until now was a verb
   somebody performs; this is the first one that is only a view. A role check in
   the handler would have hidden it from `can.ts`, the one table that can itself
   be audited.
2. **The index the writer chose decides the filters the reader may offer.**
   `@@index([teamId, at])` is literally "one team, newest first", so that is the
   cheap query. `route`, `actorEmail` and `status`-ordering are full scans of the
   biggest table in the schema. `?status=` is allowed only because it filters
   inside a range the index already narrowed. The generalisation:
   *a list route's query surface is a consequence of its indexes, not a design
   choice made in the schema file.*
3. **The refused read writes itself into the log it was refused.** The first
   test asserted 25 rows and got 26. `shouldAudit()` has returned true for 403
   on a GET since lesson 18, so the MEMBER's refusal became the newest row in
   that team's log — `route: "/teams/:teamId/audit", status: 403`. A rule
   written twenty lessons ago covered a route that did not exist yet. No
   per-handler audit call could have produced that row, because no handler ran.

## Measured gotcha

`at: z.iso.datetime()` in the response schema is a **500 on every request**.
The serializer in `src/app.ts` *parses* before it stringifies, and Prisma hands
back a real `Date`. `z.date()` is the fix; `JSON.stringify` emits the same ISO
text. Shape worth keeping: **a response schema describes the value the handler
returns, not the JSON the caller receives.**

## Consequences for future lessons

- Homework 7 (`params.id` vs `targetId`) is asked for the **third and last**
  time. Today's route puts both numbers on screen in one reply. Drop it after
  this, answered or not.
- New homework 9: a MEMBER can pump 144k rows a day into `AuditLog` by hitting
  the refused endpoint at the rate limit. Bug, feature, or retention problem?
  His answer shapes the week-13 retention job.
- The audit log now has a reader, so `REVOKE UPDATE, DELETE ON "AuditLog"` at
  the end of week 13 is unblocked — a `SELECT` grant is all the page needs.
- A front-end audit page is now possible, and it is the natural week-12 lesson:
  it reuses the cursor hook from lesson 30 and the filter-in-the-key rule
  from [0036](./0036-the-filter-belongs-in-the-key.md).
- Streak intact: **no new dependency, 38 lessons.**

## Open

Homework 7 (third carry) and homework 9. Two, which is the ceiling.
Homework 8 from lesson 37 was answered by today's design: no column in this
schema wants a stored JSON `null`, so the `CHECK` constraint is still open as a
cheap belt-and-braces.
