# Rate limit the account, not the IP — count what the attacker has one of

Lesson 11 (2026-09-02), first of week 7-8. `npm test` = 66 (was 56),
`npm run typecheck` clean, `npm run lint` clean (only pre-existing
`no-inline-comments` warnings). No migration. **No new dependency** — eleven
lessons running.

New files: `server/src/auth/throttle.ts`, `server/src/auth/throttle.test.ts`.
Changed: `server/src/routes/auth.route.ts` (login only).

## The decision

`POST /auth/login` was the one unguarded route. The obvious fix is
`@fastify/rate-limit` in one line. **Rejected**, and not for the usual
dependency-weight reason — its default `keyGenerator` is `request.ip`, which
does not stop the attack that actually targets a login.

> A credential-stuffing kit ships with a proxy network. Its requests-per-IP
> stays at one or two, so a per-IP counter never trips. It only has **one
> email per victim**, so a per-account counter trips on the second guess.

OWASP says it outright: "The counter of failed logins should be associated
with the account itself, rather than the source IP address."
<https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html>

So: 25 hand-written lines, keyed on `email.toLowerCase()`.

The framing worth reusing, because it generalises past rate limiting:
**count the thing the attacker cannot get more of.** They can rent another IP
for pennies. They cannot rent a second email address for your user.

`@fastify/rate-limit` is *not* dead — it is the right tool for a **global
per-IP layer over the whole API**, which is still open in week 7-8. The point
was that one route needed a different key, and a one-line install is a
default you never read.

## Backoff, not lockout

A hard lockout was considered and rejected on OWASP's own warning: it is a
denial of service handed to the attacker. Know the email, fail five times,
the real user is out. So:

- 5 free tries, then 1s, 2s, 4s... capped at 15 min (from failure 15 on).
- Nobody is ever locked out — there is only a wait.
- A correct password wipes the counter completely.
- **A blocked request does not add a strike.** Refreshing while locked out
  must not dig you deeper. This was a deliberate consequence of returning
  before `throttleFail`, and it is what keeps the design humane.

Reached ~96 guesses/day at the cap. That number is the whole argument for
doubling over a fixed window.

## Three non-obvious placement rules

1. **The check runs first**, before the query and before scrypt. Two reasons,
   and the second is the one people miss: (a) 252 ms / 128 MiB per request is
   an unauthenticated CPU bill — 100 concurrent is 12.8 GB; (b) a locked key
   cannot be unlocked by finally guessing right, because the password is
   never read.
   New named idea: **an unauthenticated route that does expensive work is two
   holes, a guessing hole and a bill.**
2. **The key is lowercased.** Otherwise every capitalisation of an address is
   a fresh five tries. Covered by a test.
3. **Unknown emails throttle identically.** Otherwise 401-forever vs 429 is
   an account-exists oracle. This is the *fifth* use of "one reply for two
   different noes" (lessons 6, 8, 10, and twice here) — the new wrinkle is
   that the leak moved from the message body into the **status code**. Worth
   saying out loud again: every new reply shape is a new chance to answer two
   different questions differently.

## The memory-DoS rule

The `Map` only grows on failure, and failures come from strangers. So
`for email in wordlist: login(email, "x")` is a memory leak you built for the
attacker. Capped at 10,000 keys with `Map` insertion-order eviction
(`delete` then `set` to refresh a key; `keys().next().value` is the coldest).

> Any store keyed on something the caller types is a store the caller can
> fill. Cap it in the same breath as you create it.

That is a reusable rule, not a rate-limit detail. It will come back for
sessions, invites and audit logs.

## Ceilings written down, on purpose

Marked in the file with a `ponytail:` comment naming the ceiling and the
upgrade path:

- Dies on restart; per-process, so two processes double the real limit.
- 10k junk emails can evict a real victim's counter.
- Fix for all three is the same: move the counter to Postgres (or Redis) at
  week 11-12, when there is more than one process. Same three functions,
  different storage.
- Patient low-rate guessing is untouched. Only MFA answers that, and OWASP
  ranks MFA as stopping ~99.9% of account compromises. **Throttling is the
  floor, not the ceiling** — say this whenever he sounds satisfied.

## Housekeeping closed

`Project` was built between sessions (routes, store, schema, migration
`20260902115602_project`, tests). Week 5-6 is now finished: nothing in
`can()` is unwired. Jay confirmed he wrote it and did not need it re-taught,
so lesson 11 covered it in a 3-sentence recap box only. There is **no lesson
file for the Project work** — if anything about it turns out shaky, that gap
is why.

## Homework planted

- **Impossible with today's code:** restart the server, lose the counter —
  where must it live? He must name both candidates he already owns (Postgres
  table / a column on `User`) *and* the cost on every login, not just failed
  ones. The bother is that a Postgres counter turns every login into an extra
  write. That tees up week 11-12 storage and week 13-14 performance.
- **Opinion, sent to the community:** order of CAPTCHA vs login-alert email vs
  forced MFA. Posted to Security StackExchange / r/node. Deliberately not
  answered by me.

Ratio held at one cliffhanger + one community question, same as lessons 9
and 10. That is the shape that is working.
