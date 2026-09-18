# 0046 — The login is chosen by the job, not by the file

Date: 2026-09-11
Lesson: [42 — Two database logins](../lessons/0042-two-database-logins.html)

## Context

He said "move to lesson 42" with no topic, fourth time running. No decision to
make: record 0045 specified lesson 42 exactly — wire `tasks_app` in as its own
config value, `ALTER DEFAULT PRIVILEGES`, and the test that proves a delete is
refused. Also on record: two experiment lessons in a row is the ceiling, so 42
had to ship code.

Pre-flight found he **did** the hand-over this time. `tasks_app` is in
`pg_roles`, `\dp "AuditLog"` reads `tasks_app=ar/tasks`, and `\ddp` shows both
default-privilege rows. He ran `prisma/sql/tasks_app.sql` as the superuser —
the one block I could not run in lesson 41.

## Decision

The split is by **job**, not by file, and it lives in one ternary in
`src/db.ts`:

```ts
const connectionString =
  config.NODE_ENV === "test" ? config.DATABASE_URL : config.APP_DATABASE_URL;
```

- `DATABASE_URL` (owner `tasks`) — migrations, seeds, `npm test`.
- `APP_DATABASE_URL` (`tasks_app`) — `npm start`, `npm run dev`.

Tests keep the owner on purpose. Lesson 41 measured five `auditLog.deleteMany`
calls, all cleanup. Rewriting them buys nothing: a test runs from his terminal,
not from the internet. **Least privilege applies to the exposed path.**

`APP_DATABASE_URL` has no default, like the other four safety variables — a
fallback would silently be the owner again, which is the exact bug the lesson
prevents.

## Why it matters

Lesson 41 ended on an unclosed hole: the owner can `GRANT` the privilege back
in one line, so revoking from your own role guards mistakes, not attackers.
Measured today, as `tasks_app`:

```
GRANT DELETE ON "AuditLog" TO tasks_app;
WARNING:  no privileges were granted for "AuditLog"
```

Not an error — a warning, and nothing changes. A role that owns nothing cannot
hand itself anything. That is the hole closed, and it is the argument for a
second role rather than a second REVOKE.

## Measured

- `npm test` **162 → 166**. New file `src/db.test.ts`, four tests, opens its own
  `pg.Client` as `tasks_app` — the first test file in the project that does not
  import the shared `prisma`. No new dependency: `pg` is already there for the
  Prisma adapter. **Streak intact: no new dependency, 42 lessons.**
- Load-bearing check: swapping the test's `APP_DATABASE_URL` for
  `DATABASE_URL` gives **164 pass / 2 fail**, and the two failures are exactly
  the two refusal tests. Ran it before writing the step that asks him to.
- As `tasks_app`: SELECT ok, INSERT ok (id 9974, rolled back), and DELETE /
  UPDATE / TRUNCATE / CREATE TABLE all `42501`. The test asserts the **code**,
  never the message — a message is text, a SQLSTATE is a contract.
- **Did not know, so I checked:** does `.env` overwrite a shell variable?
  `FOO=fromshell node -e 'process.loadEnvFile(); ...'` prints `fromshell`.
  `loadEnvFile()` only fills in what is missing. That is what makes
  `NODE_ENV=test npm test` work, and it retroactively explains `LOG_LEVEL=silent`
  from lesson 6.
- Ran the real server on port 3001 and read `pg_stat_activity`: `tasks_app` is
  the connecting role, and a 401 still lands in the log. It appears only after
  a request that touches the database — the Prisma pool is lazy and `/health`
  does not query. First attempt on port 3000 hit his running dev server instead;
  worth remembering before trusting a curl on this machine.
- `APP_DATABASE_URL= npm start` → `Bad environment: Invalid URL → at
  APP_DATABASE_URL`, exit. The no-default rule holds.

## Consequences for future lessons

- **"Hint vs gate" is taught, not asked.** Fourth ask would have been the
  fourth skip, so record 0045's instruction applied: I wrote the table into the
  lesson (hint = the `CLAUDE.md` line and the greyed-out button; gate = `REVOKE`
  and `requirePermission`). The replacement homework is one sentence: name a
  gate in this app that is still only a hint.
- Extracted `assets/show-me.css`. The same ~15 lines of box/grid CSS had been
  pasted into every show-me file since lesson 21. Only lesson 42's sketch links
  it; older files stay as they are until one needs editing anyway.
- Open and now his: the `tasks_app` password is the literal word `tasks_app`,
  in plain text in `.env`. Step 5 asks him to rotate it. This is also the first
  real secrets question, which lands properly in week 15–16.
- Retention job (week 13–14) now has its shape fixed by this record: it connects
  as `tasks`, on a schedule, off the request path.

## Open

The rotated password, the naming exercise from lesson 40 (a second believed
type), the `CHECK` constraint on the JSON columns, Vitest for a first component
test, and the projects screen — still the one route group with no UI at all.
