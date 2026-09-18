# 0045 — A privilege is held by a role, not written in a rule

Date: 2026-09-11
Lesson: [41 — The role that can erase the evidence](../lessons/0041-the-role-that-can-erase-the-evidence.html)

## Context

He said "move to lesson 41" with no topic, as usual. Lesson 40's record named two
candidates: the projects screen, or opening week 13 with `REVOKE UPDATE, DELETE
ON "AuditLog"`. Took the second — the audit reader is finished, so the log is
now a thing he *uses*, which is the moment its integrity is worth a lesson.

Pre-flight found the hand-over: he shipped lesson 40's guard exactly as written
(`isAuditRow`, `assertAuditPage`, `api.get<unknown>`) but not the two tests.
`web npm test` = 7, not 9. Carried as step 0.

## Decision

Lesson 41 is an experiment lesson, like 40. Nothing ships to `server/` today.
He runs the probe himself, on a throwaway copy of his database, and the lesson's
conclusion is a design decision: **the app needs a second database role**, not a
second REVOKE.

I ran the whole thing first on `tasks_probe` (his 14 migrations deployed into a
fresh database), then dropped it. His `tasks` database was read, never written —
`relacl` still `NULL`, still 6,664 rows, afterwards.

## Why it matters

My prior was wrong and the measurement corrected it before the lesson existed.
I expected "a table owner cannot be revoked from its own table". False:

```
REVOKE UPDATE, DELETE, TRUNCATE ON "AuditLog" FROM tasks;   -> REVOKE
DELETE FROM "AuditLog" WHERE id = 1;   -> ERROR: permission denied (42501)
relacl:  NULL  ->  {tasks=arxtm/tasks}
```

Owner privileges are granted by default, and anything granted can be revoked.
Two follow-up probes are the real content, because both undercut the win:

- **TRUNCATE is a separate privilege.** After revoking DELETE, `TRUNCATE`
  emptied the table. A guard that stops the row-at-a-time path and leaves the
  all-rows path open is worse than none, because it reads as done.
- **The owner grants it back in one line.** `GRANT DELETE ON probe TO tasks;`
  as `tasks` itself, then the delete works. So revoking from your own role is a
  guard against mistakes, never against someone holding the database password.

The number that decides the design: with the REVOKE in place his suite went
**162 pass / 0 fail → 161 pass / 3 fail**, and every failure is
`prisma.auditLog.deleteMany` in *test cleanup*. Grep found five such calls, all
in `audit.test.ts` and `audit-list.test.ts`, and **zero in any route or hook**.
The app never deletes an audit row. The privilege it holds over its own log is
used by nothing in production, which is what makes taking it away free.

That reframes the fix: one login is doing three jobs (serve requests, run
migrations, clean up), and only the first faces the internet. Least privilege
applied to the app, the same idea `can()` applies to people since lesson 7.

## Measured

- `tasks` is the owner of every table; `relacl` on `AuditLog` is `NULL`.
  No superuser password on this machine, so `CREATE ROLE tasks_app` is the one
  block in the lesson I could not run — said so in the lesson, in those words.
- His live audit log: **6,664 rows, 2,864 kB, 4 days, 13 users, 1,639 × 403**.
  ~700 kB/day with no real traffic. Homework 9 is answered as a **retention**
  problem, and retention needs DELETE — in a different role, on a schedule,
  off the request path.
- Third costume of lesson 29's **a written rule is not enforcement**: a line in
  `server/CLAUDE.md` saying "never delete audit rows" versus the database
  refusing with 42501.

## Consequences for future lessons

- Lesson 42 is now specified by this one: wire `tasks_app` in as its own config
  value (migrations and tests stay on the owner), `ALTER DEFAULT PRIVILEGES`
  for tables a future migration adds, and the test that proves a delete is
  refused. A privilege with no test is a rule nobody enforces.
- Two experiment lessons in a row (40, 41) with no product code shipped. That
  is the ceiling — lesson 42 must land real code.
- Streak intact: **no new dependency, 41 lessons.** Nothing to install; this
  was all Postgres.
- Asked for "hint vs gate" in his own words for the **third** time, alongside a
  new naming exercise (another unused privilege in the schema). If he skips it
  again, drop it and teach it instead of asking.

## Open

Lesson 40's naming exercise (a second believed type), "hint vs gate", the
`CHECK` constraint on the JSON columns, Vitest for a first component test, and
the projects screen — still the one route group with no UI at all.
