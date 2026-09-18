# 0040 — An audit row stores copies, and the copy has a deadline

Date: 2026-09-11
Lesson: [36 — The row that outlives the row](../lessons/0036-the-row-that-outlives-the-row.html)

## Context

Pre-flight was clean for the fourth session running, and for the first time the
count moved because he changed it: `server` 155 (was 154), `web` 5, `tsc` clean.
Both owed answers came in and both were right, so the homework queue emptied.

Record [0039](./0039-the-audit-row-must-outlive-its-target.md) decided the
migration comes before the audit log page. Two queries on his own database set
the size of the problem: **3,428 of 7,201 audit rows** name a `userId` that no
longer exists, and **72 rows** are a successful task delete whose task is gone.
The first number is his no-foreign-key rule already working. The second is the
hole it leaves.

## Decision

`AuditLog` gains four nullable snapshot columns: `actorEmail`, `targetType`,
`targetId` (plain Int, no relation), `targetSnapshot` (Json/jsonb). The
snapshot is captured **in the handler**, stashed on `request.auditTarget`, and
written by the same single `onResponse` hook as before.

## Why it matters

Two separate ideas, and the second is the one he could not have guessed.

1. **Pointer vs copy.** Lesson 4 taught "store the pointer, not the copy". An
   audit table inverts that rule, for exactly the same reason: you do not want
   one edit to change the fact everywhere. Naming the inversion out loud is
   what makes it stick.
2. **The copy has a deadline.** `onResponse` is the right place to *write* the
   row and the wrong place to *read* the target: by then the handler has
   deleted it. A `findUnique` there returns `null`, no error, green tests, and
   a column of `NULL` on precisely the rows it was added for. Sixth "bug with
   no error message" in a row, and the first that is about ordering rather than
   about a wrong string.

## Consequences for future lessons

- The audit log page (next) reads `AuditLog` only, and renders from snapshot
  columns. The deleted-target case is the main case, not an edge case.
- Only the task delete route captures after this lesson. The remaining routes
  are a listed TODO in `PLAN.md` under week 13, deliberately visible.
- Homework 7 asks whether `params.id` and `targetId` holding the same number is
  duplication. The answer decides what the page filters on, and only one of the
  two can carry an index. Do not answer it for him.
- Append-only enforcement (`REVOKE UPDATE, DELETE`) is deferred to week 13 with
  retention, because the test fixtures delete audit rows.
- `AuditLog.id` is still `Int`; the BigInt TODO in the schema also belongs to
  the week-13 retention lesson.

## Open

Homework 7 (params vs targetId). One question only, by design — the queue was
empty and should not be refilled past one.
