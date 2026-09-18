# Sessions, not JWT, because revocation was the actual requirement

Lesson 6 (2026-09-02) added `Session`, `POST /auth/login`, `POST /auth/logout`,
`GET /auth/me`, and a `requireAuth` hook. `DEV_OWNER_ID` is gone.

## The decision
PLAN.md week 3-4 said "access token (short) + refresh token (long, stored in DB,
revocable)". Lesson 6 shipped **plain server-side sessions** instead.

The reason is that the plan already contained its own answer: it wanted the
refresh token *stored in the DB and revocable*. That is a session. The
access-token half exists to avoid a DB read per request — a cost Jay does not
have (one Fastify process, one Postgres, one indexed lookup). So the JWT layer
would have bought nothing and cost the "I cannot log anyone out" problem, plus
two token lifetimes to explain before he has one working.

Source: [The Copenhagen Book — Sessions](https://thecopenhagenbook.com/sessions),
[Server-side tokens](https://thecopenhagenbook.com/server-side-tokens).
Params used: 15 random bytes (120 bits, Copenhagen asks 112+), base64url,
SHA-256 before storage, 30-day sliding window renewed past the halfway mark.

**Revisit when:** a second service needs to verify a caller without reaching
Jay's database. That is the only condition that makes JWT the right answer, and
it is not on the 16-week plan. If week 13-14 adds BullMQ workers, check whether
they need caller identity — they probably do not.

## Teaching points to re-use
- **"Slow hashing protects guessable secrets"** replaced "always use scrypt".
  Lesson 5 taught `sha256` is wrong; lesson 6 uses `sha256` for the session id.
  The apparent contradiction was made the centrepiece rather than papered over —
  entropy is the variable, not the algorithm. Check he can state the rule, not
  just the two cases.
- **Adding a table is cheap, adding a required column is expensive.** Third
  migration in a row, and the first with no `migrate reset`. Named explicitly so
  the contrast with [[0005-ownership-is-a-foreign-key-not-a-string]] and
  [[0006-scrypt-because-it-is-already-in-node]] does the teaching.
- **`app.addHook` on the plugin, not `onRequest` per route.** Framed as the same
  move as naming the column `passwordHash`: make the safe thing the default and
  the unsafe thing deliberate. Third time this framing has been used
  ([[0003-declare-the-wall-not-remember-it]] was the first). It is landing —
  keep using it.
- **401 vs 403** introduced now, with 403 explicitly deferred to weeks 5-6. Gives
  RBAC a hook to hang on.
- Cookie flags written by hand instead of `@fastify/cookie`. Same argument as
  scrypt over argon2: the flags *are* the security content, and a plugin hides
  them in an options object that gets copied unread.

## The bug lesson 6 created, and closed
Multiple real users made `where: { id }` in `updateTask`/`deleteTask` a live
IDOR. Fixed in the same lesson (`where: { id, ownerId }`), 404 not 403.

This was not planned — IDOR is a week 7-8 topic. It was pulled forward because
*today's change caused it*, which is far better teaching than meeting it as an
abstract acronym in six weeks. Week 7-8 now has a concrete callback instead of a
cold start. The homework asks him to comment the `ownerId` out and watch the
attack work, then put it back.

## Loose ends deliberately left
- **No rate limit on login.** The single biggest hole in the API right now:
  scrypt at 252 ms per attempt is slow for an attacker but also makes login a
  cheap DoS. Weeks 7-8, and it should be near the front.
- **No CSRF check.** `SameSite=Lax` only. Said out loud in the lesson so it is
  not mistaken for done.
- **No `Secure` flag.** Marked with a `ponytail:` comment in
  `src/auth/session.ts`. Week 11-12 (HTTPS) must remove that comment.
- **Expired sessions are only deleted when touched.** Question 7 of the homework
  asks Jay to spot this himself. Answer: a periodic sweep. Good week 13-14 job.
- **No "log out everywhere".** `deleteMany({ where: { userId } })` is one line;
  left out because there is no UI to trigger it yet.
- `prisma/seed.ts` had been broken since lesson 5 (no `passwordHash`). Fixed
  here. Seeded users now share the password `correct horse battery`.

## First tests in the project
`server/src/auth/session.test.ts`, 8 tests, `npm test` = `tsx --test`. No
framework — `node:test` is built in, same reasoning as scrypt and native
Postgres. This is the pattern for every test in weeks 5-8; do not let a Jest or
Vitest install creep in without a real reason.

Evidence: lessons/0006-a-door-that-stays-open.html,
reference/sessions-and-cookies.html, server/src/auth/session.ts,
server/src/auth/require-auth.ts, migration 20260902053318_session.
