# 0022 — A value can be a parameter, a column cannot

Date: 2026-09-08
Lesson: [20 — The column that cannot be a parameter](../lessons/0020-the-column-that-cannot-be-a-parameter.html)

## Context

Last item in week 7–8, and PLAN.md had it filed as **pure knowledge**: there is
no `$queryRaw` anywhere in the codebase, so there was nothing to fix. Teaching
"you are already safe" is the weakest lesson shape there is — no skill, no
feedback loop, nothing to break.

So I looked for the one input in the codebase that a parameter *cannot* protect,
and gave the app a reason to have one: `GET /teams/:teamId/tasks?sort=`.

## Decision

**Ship `?sort=` and `?dir=` as a zod `enum`, and let the enum be the entire
allowlist.** No second check in the store, no validation helper.

```ts
sort: z.enum(["id", "title", "createdAt"]).default("id"),
dir: z.enum(["asc", "desc"]).default("asc"),
```

The store then does `orderBy: { [sort]: dir }` — `sort` is a **key**, not a
value, which is the whole point of the lesson in one line of code.

## Why

- **Values travel beside the query; identifiers must be inside it.** Postgres
  parses and plans before it binds, so a column name has to be in the SQL text.
  There is no escaping function that makes a caller-supplied column safe —
  `quote_ident` makes it *valid*, not *authorised*.
- **Prisma's safety is one mechanism, not two.** `$queryRaw` is a tagged
  template: it gets the fixed strings and the `${}` values as separate arrays.
  Measured against the real five rows: builder `0 rows`, `$queryRaw` `0 rows`,
  `$queryRawUnsafe` with the value glued in `5 rows`.
  ([OWASP SQLi Prevention](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html),
  [Prisma raw queries](https://www.prisma.io/docs/orm/prisma-client/using-raw-sql/raw-queries))

## What the probe changed about the lesson

I wrote the lesson claiming a widened `sort: z.string()` was an injection hole.
**Then I ran it, and it is not.** Prisma refuses the unknown key before it
builds any SQL:

```
Unknown argument `passwordHash`. Available options are marked with ?.
```

The query builder is a second wall I did not write. Rewriting around that made
the lesson better and true, and it turned up a **real hole in the app** — the
widened version answers:

```
HTTP 500  {"statusCode":500,...,"message":"\nInvalid `prisma.task.findMany()`
invocation in\n/Users/jay/.../src/store/task.store.ts:18:22\n  15 // ! only
because TaskQuery already narrowed it...
```

Absolute file paths, line numbers and **source comments**, to anyone who can
type a query string. So the honest framing:

**The allowlist turns a `500` that describes your code into a `400` that
describes nothing — and it is still the right wall the day the builder is
swapped for raw SQL.** That is A05 misconfiguration, not injection.

## Second thing the probe caught

My first version declared `400: ErrorReply` in the route's `response` map.
A `400` is **Fastify's own** reply, shaped `{ statusCode, error, message }`, so
the lesson-2 response serializer dropped `message` and every validation error
became a bare `{"error":"Bad Request"}`. Removed it. Now:

```
{"message":"sort: Invalid option: expected one of \"id\"|\"title\"|\"createdAt\""}
```

**Declare response schemas for the replies you write, not the ones the
framework writes.** No other route in the codebase declares a `400` — I was
the only one, so this restores the existing convention rather than inventing
one. And the message is safe to send: it describes the caller's own input, and
naming the allowed values is the API contract.

## Consequence

- `npm test` = **125**, was 117. Eight new, all in `src/routes/task-sort.test.ts`.
- **No new dependency**, five lessons running. No migration — pure code.
- **New open item, promoted to next lesson: the app has no error handler.**
  Every unhandled throw replies with its message.

## Found while writing it

- **Two silent failures, and they are the teaching content.**
  1. A parameter in `ORDER BY` is accepted and *ignored*: `${"title"}` and
     `${"nonsense!!"}` returned byte-identical unsorted rows.
  2. Fastify **skips querystring validation entirely** unless the route names
     `querystring:` in `schema`. `?sort=nope` answered `200`. One `FSTWRN001`
     line in the log, no throw. Cost me twenty minutes.
- **A sort test whose two orders agree is a test that cannot fail.** Fixture
  titles are `cherry, apple, banana` so id order and title order disagree.
  Assert the reordering, never the status code.
- Rule for me, re-confirmed the hard way: `cd server && python3 - <<PY` —
  the `cd` failed (already there), `&&` short-circuited, the patch never ran,
  and `npm run typecheck` on the *next line* still passed. A green check on an
  unapplied patch. **Never chain `cd` in front of a patch script.**

## Open

- **No error handler** — next lesson. `500`s leak source; a `400` for a
  malformed JSON body probably leaks too.
- **No `LIMIT`/pagination** on the task list. Sortable + unbounded = a free
  full-table read. Week 9–10.
- Week 7–8 is now **closed**.
