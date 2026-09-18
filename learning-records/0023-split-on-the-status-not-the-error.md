# 0023 — Split on the status, not on the error

Date: 2026-09-08
Lesson: [21 — What a crash is allowed to say](../lessons/0021-what-a-crash-is-allowed-to-say.html)

## Context

Lesson 20 turned up an unplanned hole and promoted it to next: **the app had no
error handler.** Fastify's default sends `err.message` to the caller, so any
unhandled throw replied with its own internals.

I re-ran the probe before writing anything. It is worse than record 0022 said.
A Prisma validation error replies with the file path, the source lines around
the call, **and every column of the model**, including relation fields:

```
? id?: SortOrder, title?: SortOrder, done?: SortOrder,
? createdAt?: SortOrder, ownerId?: SortOrder, teamId?: SortOrder,
? owner?: UserOrderByWithRelationInput, team?: TeamOrderByWithRelationInput
```

That is the database schema, handed to anyone who can make a request fail.

## Decision

**One `setErrorHandler` in `src/app.ts` (step 9), forking on `err.statusCode`,
not on the error's class.**

```ts
app.setErrorHandler((err: FastifyError, request, reply) => {
  if ((err.statusCode ?? 500) < 500) return reply.send(err);
  request.log.error({ err }, "unhandled error");
  return reply.code(500).send({
    statusCode: 500, error: "Internal Server Error",
    message: "Internal Server Error", requestId: request.id,
  });
});
```

## Why

- **The status already says whose fault it is.** A `4xx` describes the caller's
  own input — refusing to name the bad field makes the API unusable and hides
  nothing. A `5xx` describes our code, and the caller can do nothing with it.
- **Matching on error classes has a gap; a status has none.** A new library
  ships a new error type and a class-based handler silently misses it. Every
  error either carries a status or does not.
- **Missing `statusCode` must default to 500.** An error with no status came
  from our own code — exactly the case whose message must not be sent. The
  careful branch is the default, not the exception.
- **The detail moves, it does not vanish.** `log.error({ err })` serialises
  type, message and stack. `requestId: request.id` is the join: Fastify already
  stamps `reqId` on every log line, so it costs nothing. Verified both sides
  read `req-1` on the same incident.
  ([OWASP Error Handling](https://cheatsheetseries.owasp.org/cheatsheets/Error_Handling_Cheat_Sheet.html),
  [Fastify Errors](https://fastify.dev/docs/latest/Reference/Errors/))

## Consequence

- `npm test` = **130**, was 125. Five new in `src/routes/error-handler.test.ts`.
- **No new dependency**, six lessons running. No migration — pure code.
- Nothing earlier broke. The handler runs before `onResponse`, so the audit log
  from lesson 19 still records the `500` with route, user and ip.

## Found while writing it

- **The crashing routes belong in the test file, not the app.** You cannot test
  an error handler without something that throws, and a deliberate crash route
  must never ship. `buildApp()` then `app.get("/test-boom", ...)` in the test.
- **One assertion per leak, not one on the whole body.** The Prisma test asserts
  separately on the path, the query text, and two column names. When it fails it
  *names what escaped*; a single `assert.ok(!body.includes(...))` would not.
- **`app.log.level = "silent"` in the test.** The handler now logs every stack
  on purpose, which would flood the test output with the exact thing under test.
- Typecheck gotcha: `setErrorHandler`'s first argument infers as `unknown`.
  Annotate it — `(err: FastifyError, ...)`, imported as a type from `fastify`.

## Open

- **Nothing reads the logs.** The stack is in the terminal and dies with the
  process. Error tracker (Sentry) — week 13–14, already planned.
- **A 4xx we throw ourselves can still leak**, by design: the handler passes it
  through. That is on whoever writes the `throw`.
- No `LIMIT`/pagination on the task list — still open from lesson 20. Week 9–10.
- Next up: **week 9–10, front-end wiring.** Login page, 401 handling,
  role-based UI hiding, and the rule that hiding a button is not security.
