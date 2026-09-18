# 0047 — A default is right when the default is a sane answer

Date: 2026-09-11
Lesson: [43 — Deleting the audit log on purpose](../lessons/0043-deleting-the-audit-log-on-purpose.html)

## Context

He asked to move to 43 and, for the first time in five lessons, asked me to
**check the previous lesson first**. Worth noting: that is him adopting the
pre-flight habit rather than me imposing it.

Pre-flight found 4 of 5 done. `APP_DATABASE_URL` wired, `src/db.ts` ternary in
place, `npm test` 166 green, web 9 green (lesson 40's two tests landed). The
password is **still** `tasks_app` — second ask now.

Lesson 42 shipped code, so an experiment lesson was allowed. He picked the
retention job from three candidates. It was the right pick: fully specified by
records 0045 and 0046, and it is the only one that closes a thread rather than
opening one.

## Decision

Retention is a **job**, not a route. Two files:

- `src/audit/retention.ts` — `pruneAuditLog(days)`, opens its **own**
  `pg.Client` on `DATABASE_URL` (the owner) and runs one DELETE.
- `src/audit/prune.ts` — four lines, the thing cron calls. Separate from the
  function so a test can call the function directly.

Rejected `import.meta.main` as the entry guard. It exists in Node 22.23, but
its behaviour under tsx is one more thing to verify for zero gain. A four-line
file is not worth a magic property.

The scheduler is **cron**, already on his machine. No scheduler package, no
worker process. Streak intact: **no new dependency, 43 lessons.**

## The real lesson: defaults

`AUDIT_RETENTION_DAYS` has a default of 90. That **breaks** the lesson-27 rule
he has followed for sixteen lessons, and breaking it deliberately is the
teaching moment:

- `DATABASE_URL` with a default silently points at the wrong database → no
  default, refuse to boot.
- `AUDIT_RETENTION_DAYS` with no default is `undefined` inside a subtraction →
  a default is the *safer* choice.

Generalised in the lesson as: **a default is right when the default is a sane
answer, and wrong when it hides a decision.** "No defaults" was never the rule;
it was the shape the rule took for connection strings. This reframes record
0027 rather than contradicting it.

`min(1)` is the load-bearing part. **0 days means "older than now", which is
every row.** Guarded twice — zod at boot, and a throw at the top of the
exported function, because the schema only guards the boot path.

## Measured

- `npm test` **166 → 169**. New `src/audit/retention.test.ts`, three tests.
- His live log: **7,292 rows / 2,960 kB / 4 days**, up from 6,664 four days
  ago. ~1,800 rows a day, so ~650k a year unbounded.
- `older than 3 days` = **1,162 rows**. That is what his step 2 will really
  delete. Flagged as irreversible in the lesson, in red.
- As `tasks_app`, the exact DELETE the job runs: **`42501`**. The lesson-41
  wall is still up; the job goes around it with a different key.
- `npm run audit:prune` on the default 90 days: **`deleted 0 rows`**, correct —
  his whole log is four days old.
- **Test safety, deliberate:** the fixture is dated **400 days** back and the
  cutoff is **365**. His real log starts four days ago, so no real row is ever
  in range. A retention test that could eat real evidence is not a test.
- Second test asserts a re-run returns **0**. A scheduled job runs whether or
  not you are watching; "twice changes nothing more" is part of the contract.
  Same word as lesson 26's idempotency, off the request path.

## Consequences for future lessons

- Added `.warn` to `assets/lesson.css` — an inline red mark for "this cannot be
  undone". First lesson whose homework destroys real data, so it earned one.
  Second component extracted since lesson 42; the asset library is now the
  default path, not an afterthought.
- The `AuditLog.id` `Int` TODO in `schema.prisma` said "move to BigInt when
  retention lands". Retention has landed and the ceiling is now **removed by
  bounding the table**, not by widening the column. Left the TODO alone on
  purpose — it is no longer urgent, and BigInt still needs a serialiser.
- Cron on a sleeping Mac skips missed runs. Asked him to bring back the
  crontab line; `launchd` is the answer if he cares, and that conversation
  belongs next to week 15-16 deploy.
- The homework question "where would a regulator find your retention period?"
  is aimed at the week-13 README. If the answer is "in Jay's head", the README
  task has its first real content.

## Open

- **Password rotation, second ask.** If he skips it a third time I teach it
  instead of asking, per the pattern set in record 0046.
- The naming exercise from lesson 40 (a second believed type), the `CHECK`
  constraint on the JSON columns, Vitest for a first component test, and the
  **projects screen** — still the one route group with no UI at all, and now
  the oldest open item by a wide margin.
