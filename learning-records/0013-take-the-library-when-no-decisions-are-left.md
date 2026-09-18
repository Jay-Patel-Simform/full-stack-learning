# Take the library when the problem has no decisions left in it

Lesson 12 (2026-09-03), second of week 7-8. `npm test` = 70 (was 66),
`npm run typecheck` clean, `npm run lint` clean (only pre-existing warnings).
No migration. **First new dependency in twelve lessons**, on purpose.

New file: `server/src/routes/rate-limit.test.ts`.
Changed: `server/src/app.ts`, plus `await buildApp()` at six call sites.
Added: `@fastify/rate-limit@11.2.0` (292 KB, 4 small deps).

## Lesson 11 verified first

Jay asked to check lesson 11 was fully implemented before moving on. It was:
`src/auth/throttle.ts` complete with the `ponytail:` ceiling note, the three
calls wired into `src/routes/auth.route.ts` in the right order (check before
the query and the hash), the lowercased key, and `npm test` at 66. Nothing
missing. Say this out loud in the lesson — he asked, so the answer belongs in
the file, not only in chat.

## The decision

The plan said a global per-IP limit was "the job for @fastify/rate-limit".
Confirmed, and the reason is worth keeping as a pair with lesson 11:

> Reject a library when its **defaults** are wrong for your problem. Take it
> when the problem has **no decisions left in it**.

Reuse of `throttle.ts` keyed on `request.ip` was considered and rejected. The
storage shape is the only shared part; everything that decides is different:

| | login counter | global limit |
|---|---|---|
| counts | failures only | every request |
| forgets | on a correct password | on a clock, 60s |
| answer to more | a doubling wait | flat no until the window ends |
| tells the client | nothing until blocked | budget on every reply |

Reuse would have meant config flags on both sides for values that never
change — the exact thing ponytail forbids. 100 req / IP / minute.

## The non-obvious line, and how it was found

```js
await app.register(rateLimit, { global: false, max: 100, timeWindow: "1 minute", cache: 5_000 });
app.addHook("onRequest", app.rateLimit());
```

The plugin's own `global: true` mode attaches its check **per route, after
that route's own hooks** (`index.js`: `routeOptions[hook] = [routeOptions[hook],
hookHandler]`). So `GET /auth/me` would run `requireAuth` — a Postgres session
lookup — and answer 401 *before* counting. A blocked request would still cost
a query.

An app-level `addHook("onRequest", ...)` runs before every route-level hook,
so the counter goes first. **Third use of "the cheap check goes in front of
the expensive work"** (before scrypt in lesson 11, before the session query
here). This is a strong recurring frame; keep it.

Found by a failing test asserting 429 and getting 401. That test is now the
regression guard, and homework 3 makes him reproduce the bug on demand by
switching back to global mode. **Turning my own debugging into homework
worked well — reuse it.** Cheaper than explaining why the test exists.

Cost: `buildApp()` is now `async` (the `rateLimit` decorator does not exist
until the plugin has loaded). Six `await buildApp()` edits, top-level await in
the test files. Accepted; the alternative was the wrong hook order.

## Tests: enforcement only, and why

First test file with **no decision half**. The counting logic is the
plugin's, so the tests cover the wiring only: 101st request is 429 with
`retry-after`; one address running out does not block another (a wrong key
here is a global outage button); the count is shared across routes (the
hook-order guard); a normal reply carries `x-ratelimit-remaining`.
`app.inject({ remoteAddress })` is what makes the per-key test possible with
no network. Say the split out loud: **test what you decided, not what you
installed.**

## Two gotchas worth keeping

1. `npm test` runs `tsx --test src/**/*.test.ts`, and npm uses `sh`. In `sh`,
   `**` is `*` — so the pattern is exactly one directory deep and
   `src/foo.test.ts` is **silently skipped**. Cost 10 minutes; the only
   warning is the test count not moving. Moved the file to `src/routes/`
   rather than change the script.
2. `trustProxy` was named but NOT enabled. Believing `x-forwarded-for` while
   the API is directly reachable hands anyone a fresh budget per fake
   address. New rule: **believe a header only when something you control
   writes it.** Turn it on at deploy, week 11-12, and not before.

## Ceilings written down

Same honest-limits table shape as lesson 11 (this is now the settled ending
for a security lesson): counters die on restart and are per-process (Redis at
week 11-12 — the plugin ships the option); proxy collapses every caller into
one IP; one huge body still gets through (homework); one expensive
unpaginated request counts as 1 (week 13-14); a real botnet is not answerable
at this layer.

## Homework planted

- **Body size limit** is left for him to find and wire himself, with a curl
  proof. First time a defence is homework rather than lesson content — he has
  enough pattern now.
- **Cliffhanger, paying off lesson 11's unanswered one:** two in-memory
  counters now have the same restart problem. If both move to Redis, should
  the login counter *become* the plugin keyed on email? What would he lose?
  (The answer is the doubling wait and the reset-on-success — the plugin
  cannot express either.)
- **Community question:** how does anyone choose the number 100? Per-route or
  per-app in production? Sent to r/node / Security StackExchange.

Ratio held: one cliffhanger + one community question, same as lessons 9-11.
