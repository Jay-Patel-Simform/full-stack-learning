# 0041 — A `Json` column has two nothings, and `null` picks the wrong one

Date: 2026-09-11
Lesson: [37 — Two kinds of nothing](../lessons/0037-two-kinds-of-nothing.html)

## Context

Pre-flight clean for the fifth session running, and the count moved because he
changed it: `server` 156 (was 155), `web` 5, `tsc` clean. Every piece of lesson
36 shipped — the `20260911054040_audit_snapshot` migration with four nullable
columns and no foreign key, `decorateRequest("auditTarget", null)`, the capture
in the task delete route, the widened `AuditRow`, and the delete-your-own-account
`// TODO:`. Verified by reading the files, not by asking.

Then the first query the audit page needs found a bug. `targetSnapshot IS NOT
NULL` returns **218** on his database, but only **2** rows hold a real snapshot.
Measured: `params` is **0** SQL NULL and **3,960** JSON null across 7,421 rows —
the column has never once been empty since lesson 18.

## Decision

`src/audit/audit.ts` writes `?? undefined` for the two `Json` fields and drops
both `as never` casts. A `--create-only` data migration
(`audit_json_null_to_sql_null`) rewrites the 4,176 existing rows to SQL NULL.

## Why it matters

Two ideas, and the second one is the transferable one.

1. **`jsonb` has two nothings.** An empty cell and a stored JSON `null` are
   different values. `IS NULL` sees only the first. Prisma reads both back as
   JavaScript `null`, so the client is blind to the difference — only SQL can
   ask. Prisma invented `DbNull`/`JsonNull` *because* plain `null` is ambiguous
   here, and plain `null` is the shorthand for the wrong one.
2. **A cast is a promise, and nobody checks it.** `as never` on both lines is
   what silenced the compiler, which had the right answer. This is
   [0034](./0034-a-declared-type-is-believed-not-checked.md) inverted: there a
   declared type was believed without a check; here a real check was switched
   off by hand.

Seventh "bug with no error message" in a row, and the first that lives in
*stored data* rather than in code. That is the new bit: the code is fixed in one
line, the 4,176 bad rows are not.

Also note which rows were correct: the 7,203 filled by `ADD COLUMN` itself. The
database's own default was right; only rows his code wrote were wrong.

## Consequences for future lessons

- The audit log page is still next, now that its first filter can be trusted.
- Homework 7 (`params.id` vs `targetId`) is **still owed** and was deliberately
  not answered. Carried a second time. Drop it if unanswered after lesson 38.
- New homework 8 asks whether any column genuinely wants a stored JSON `null`.
  If the answer is no, that is the argument for a `CHECK` constraint.
- The `REVOKE UPDATE, DELETE` from lesson 36 must go at the **end** of week 13,
  not the start. This correction is an `UPDATE` on an append-only table and is
  only possible because the revoke has not run. That is now the stated reason.
- Streak intact: **no new dependency, 37 lessons.** The fix is two words.

## Open

Homework 7 (carried from lesson 36) and homework 8. Two, which is the ceiling.
