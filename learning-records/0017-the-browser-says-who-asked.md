# 0017 — The browser says who asked, and a page cannot lie about it

Date: 2026-09-04
Lesson: [16 — Who asked for this write](../lessons/0016-who-asked-for-this-write.html)

## Context

Week 7–8's CSRF slot, and the payoff of the lesson-14 cliffhanger. Jay could
name the preflight for a cross-origin `fetch` DELETE but not what stopped it.
The missing answer is the load-bearing one: **the browser stopped it, not the
server** — and swapping the `fetch` for an auto-submitting HTML form removes
that protection entirely, with no preflight and no JavaScript.

Before this lesson the whole CSRF defence for writes was one string in
`session.ts`: `SameSite=Lax`.

## Decision

No CSRF token, no double-submit cookie, no `@fastify/csrf-protection`.
Nine lines in `src/auth/csrf.ts` reading **`Sec-Fetch-Site`**, with `Origin`
as the fallback, enforced by one app-level `onRequest` hook in `src/app.ts`
(step 4, after the rate limiter, before anything that touches Postgres).

Allow a write when: the method is safe; or `Sec-Fetch-Site: same-origin`; or
the `Origin` is in `ALLOWED_ORIGINS`. Otherwise 403.

## Why

- `Sec-Fetch-Site` is a **forbidden header name** (`Sec-` prefix). Page
  JavaScript cannot set, change or delete it. The browser writes the true
  value. That is what makes it a defence and not a hint.
- CSRF *requires* a browser carrying a victim's cookie. A report from the only
  party able to carry out the attack is the right witness. This is lesson 13's
  rule inverted: CORS is *advice* to a browser, `Sec-Fetch-Site` is a *report*
  from one.
- A token pattern exists because for twenty years the server had no
  trustworthy way to ask who sent a request. Since March 2023 it has one.
  OWASP now names `Sec-Fetch-Site` "the primary signal for CSRF protection".
- `same-site` is deliberately not trusted: `blog.app.example` is same-site
  with `app.example`. The existing `ALLOWED_ORIGINS` list already knows the
  difference, so the check reuses it rather than trusting the word "site".
- 403, not 401. The cookie was valid; the caller was not. A 401 tells the
  victim to log in again, which is exactly what the attacker wants.

## The fourth dependency rule

Three existed: reject on a wrong default (11), take it when no decisions are
left (12–13), take it and turn it down (15). New one, and the most durable:
**a library encodes the browser of the year it was written.** Before
installing, ask what year its problem was solved in.

## The one place this departs from OWASP

When **both** `Sec-Fetch-Site` and `Origin` are absent, we **allow** the write.
OWASP recommends blocking. Reasoning: a write with neither header is not a
browser, and only a browser can carry a victim's cookie — so blocking buys no
security and breaks every curl, Postman and cron write. Marked `ponytail:`
with the exact one-line switch to fail closed, and a named test asserts the
current choice.

## Consequence

- `npm test` = 93, was 82. Eleven new, split the usual way: decision tests in
  `src/auth/csrf.test.ts` (pure function, no DB), enforcement tests in
  `src/routes/csrf.test.ts` (`app.inject()`, no DB needed — the hook answers
  before `requireAuth`).
- **No new dependency.** Streak resumes after three lessons of installs.
- `SameSite=Lax` is now defence in depth rather than the defence. Changing it
  to `None` for a mobile app no longer removes CSRF protection.
- `SAFE_METHODS` is an explicit promise that no `GET` in this API writes.
  That promise is now a line of code with a comment, not a rule in his head.

## Evidence

Jay answered the lesson-15 CSP question completely and precisely — "CSP binds
to a response and is enforced against the execution context created from that
response, a document or a worker" — including that a JSON body fetched as a
subresource never becomes a context. That is a stronger grasp of *where a
policy attaches* than the lesson taught, and it is the same idea this lesson
needs: a defence attaches to a specific thing, and naming that thing is the
whole skill.

Second data point on a partial-answer pattern: he answers the part of a
question with a concrete knob and skips the part that requires a judgement.
Lesson 13 and now lesson 14's question, both.

## Open

- Hook order: a forged write from a rate-limited IP gets 429, not 403. What
  that leaks is his homework 1.
- Whether a token is still worth it in 2026. Sent to the community.
- `Secure` on the cookie, still open since lesson 6 (week 11–12, needs HTTPS).
- Client-side CSRF (his own page tricked into calling his own API) is an XSS
  problem and belongs with the front-end CSP in week 9–10.
