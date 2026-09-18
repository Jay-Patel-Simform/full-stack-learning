# 0039 — The audit row must outlive the row it describes

Date: 2026-09-11
Lesson: homework 7 from [35 — The test that never ran](../lessons/0035-the-test-that-never-ran.html)
(the two questions carried over from lessons 33 and 34)

## Context

Both answers came back unprompted and both were right, in his own words, with
the reasoning and not just the verdict.

(a) `pg_trgm`: he named the B-tree/leading-wildcard problem, the GIN inverted
index over trigrams, the recheck step, GIN over GiST for a read-heavy search
box, and the 3-character minimum. The check-yourself answer (`%ta%` does not
use the index — two characters, no complete trigram) was correct.

(b) `AuditLog` over the pino stream. He named retention and the missing
transactional guarantee as the two failures, which is exactly the pair.

## Decision

The audit log page reads `AuditLog` only. It never reads log files. The page
renders from snapshot columns, with no join to `Task`.

## Why it matters

He went further than the question asked and landed on the schema consequence
himself: `target_id` is a plain column, not a foreign key with
`ON DELETE CASCADE`, because cascade erases the trail at the moment it becomes
evidence. That is the non-obvious part, and it is a schema decision, not a page
decision — it has to be right in the migration before the page exists.

The deleted-target case is the *main* case on that page, not an edge case.
People open an audit log because something is gone.

## Consequences for future lessons

- The audit log migration comes before the audit log page. Columns: actor id,
  actor name snapshot, action, target type, target id (plain), target snapshot
  (title, team, status), timestamp.
- Append-only, enforced in app code, and mentioned as a database-permission
  option.
- Team filtering happens on the server. Reuse "never filter in the browser" —
  same shape as [0019](./0019-hide-it-or-charge-for-it.md).
- Both wires stay. Pino for the on-call engineer, AuditLog for the question
  asked twelve months later. Extends [0037](./0037-a-log-is-a-second-wire.md).
- Search lesson: `pg_trgm` is answered, so the search box lesson can spend its
  budget on the migration and the 3-character gate, not on explaining trigrams.

## Open

Nothing outstanding. The homework queue is empty for the first time since
lesson 33.
