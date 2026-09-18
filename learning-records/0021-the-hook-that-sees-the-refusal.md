# 0021 — The hook that sees the refusal

Date: 2026-09-08
Lesson: [19 — The row that outlives the user](../lessons/0019-the-row-that-outlives-the-user.html)

## Context

Last item in week 7–8 with code in it: the audit log table ("who did what,
when"). Lesson 18's record claimed the throttle's `429`s would "land in the
logs, so the attempt becomes visible". Nothing wrote them down. The app has
`logger: true` and that is all.

Two questions had to be answered before writing a line: **why a table when
there is already a log**, and **where the write goes**.

## Decision

**One `onResponse` hook in `src/app.ts` (step 9), never a line in a handler.**

`onResponse` is the only place that knows both halves of the row:

| Needed | Set by | Available in a handler? |
|---|---|---|
| who asked (`request.userId`) | `requireAuth`, an `onRequest` hook | yes |
| what the answer was (`reply.statusCode`) | the gate, or the handler | **no** — a 401 or 403 never reaches one |

That is lesson 18's finding used as a design input rather than rediscovered:
a rule with no exceptions does not belong in each caller. Here it is stronger
than "you will forget" — a handler *cannot* write the 403 row, because the
gate already replied and the handler never ran. **The row you most want is the
row only this hook can write.**

`shouldAudit(method, status)` — three lines, pure, its own test file:

```ts
return !SAFE_METHODS.has(method) || REFUSALS.has(status);   // 401, 403, 429
```

Every write whatever the outcome, plus every refusal *including on a read*.
Not every read: one row per GET is how the table reaches 40 million rows of
nothing, gets truncated, and leaves no audit log at all. Third use of lesson
11's **any store keyed on caller input is a store the caller can fill.**

## Why

- **Request log vs audit log** (seventh word pair). The Fastify log line is
  written about *the server* and, critically, it has no `userId` — auth
  resolves later. It is text, it is grepped, it rotates away. An audit log is a
  table about *a person*, queryable, kept as long as you decide. Neither
  replaces the other. ([OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html),
  [A09:2021](https://owasp.org/Top10/A09_2021-Security_Logging_and_Monitoring_Failures/))
- **`AuditLog` has no `@relation` to `User`, deliberately.** Every other model
  in the schema cascades from `User` or `Team`. Here a cascade deletes the
  evidence the moment the account it accuses is deleted. `userId Int?` — a
  plain nullable Int that keeps pointing at an id that may no longer exist.
  Nullable also *because* a 401 is a row worth having: nobody was logged in,
  but the ip, route and clock still are.
- **Store the route pattern, not `request.url`.** `/teams/:teamId/tasks` is one
  of a short fixed list; a URL is caller input — it can be 8 KB, and it can
  carry a token somebody pasted into a query string. Writing attacker text into
  the evidence table is the failure mode. `params` goes in its own JSON column.
- **The write costs the caller nothing** — `onResponse` fires after the reply is
  flushed. Measured: the 401 answered in **1.3 ms** and still left a row.

## Consequence

- `npm test` = **117**, was 109. Eight new: three decision (`src/audit/audit.test.ts`),
  five enforcement (`src/routes/audit.test.ts`).
- **No new dependency**, four lessons running. Prisma, Postgres JSON, one hook.
- Migration `20260908051741_audit_log` — a *new* table, so no
  expand/backfill/contract. That pattern (lesson 10) is for adding a required
  column to a live populated table; it does not apply here, and saying so out
  loud is the point.
- New measured shape, quoted in the lesson:

```
GET  tasks (read)        200   20.0 ms      → no row
POST task (write)        201   14.3 ms      → 911 / 249    / 201
POST task, no cookie     401    1.3 ms      → null / 249    / 401
POST task, wrong team    403   15.2 ms      → 911 / 999999 / 403
```

## Found while writing the tests

- **`app.inject()` resolves before `onResponse` finishes.** The first test
  asserted the row and failed intermittently. Fixed with a `waitForRow` poll,
  not a `sleep` — and the polling is itself the proof the caller does not wait.
  Rule: any assertion about `onResponse` work must poll.
- **`request.params` values are raw strings until zod coerces them.** The 401
  row records `{"teamId":"249"}` and the 403 row `{"teamId":999999}` — same
  column, two JSON types, because validation runs after `requireAuth` replies.
  Worth knowing before anyone writes `where: { params: ... }`.
- Ran the break-it-on-purpose exercise before writing its expected output
  (lesson 17's rule for me). `request.routeOptions.url` → `request.url` fails
  **exactly one** test, and its message names the rule.

## Open

- **Nobody reads it.** A log with no alert is archaeology. Repeated 403s from
  one ip is the first alert worth having; week 13–14 with the logging stack.
- **No retention job.** The table only grows. Week 13–14.
- No *before* value — you know a task was patched, not what the title was.
  Add it when somebody asks.
- `Int` id, 2.1 billion row ceiling. Marked `ponytail:` in the schema; BigInt
  needs a JSON serialiser, so not today.
- An admin with the database credentials can edit the table. Real
  tamper-resistance means shipping rows off the box.
- Week 7–8 remaining: **SQL injection (why Prisma helps)** — the last item, and
  a pure-knowledge one: there is no `$queryRaw` anywhere in the codebase.
