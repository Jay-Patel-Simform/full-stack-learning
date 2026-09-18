# 0068 — A route with no session loses three defences, not one

Date: 2026-09-18
Status: accepted
Lesson: [65 — The route nobody is logged into](../lessons/0065-the-route-nobody-is-logged-into.html)
Closes: the `report-uri` item carried open since [0065](./0065-a-policy-is-written-from-your-own-build.md)

## Context
`report-uri` was deferred three times with the note "needs a public
unauthenticated route, so its own lesson". The NOTES rule says an honesty box
does not get carried to a fourth lesson. Every route in the app to date runs
behind `requireAuth`; this is the first that cannot.

## Decision
- **The lesson opens with the case against building it.** With one user and a
  console open, a reports endpoint tells him nothing `F12` does not. Stated
  plainly, then built anyway for one honest reason: **the invite-accept route
  (week 13–14) is the same shape**, and this is the cheap place to meet the
  problems. Fourth time naming a weak argument as weak.
- **Spine: losing the session loses three defences at once** — authentication,
  the per-user rate-limit bucket, and the audit row's actor. Each replaced
  deliberately rather than by default.
- **Strictness is for input you control.** Every other body is `zod.strict()`
  (lesson 30) so a front-end typo is a loud 400. A CSP report is composed by
  the browser, differs between engines, and may gain fields — so read named
  fields, ignore the rest. This is the first place the house rule inverts, and
  the lesson says why rather than making an exception quietly.
- **Two traps read out of his own `app.ts`, not guessed:**
  - `addContentTypeParser("application/csp-report")`, because Fastify parses
    only `application/json` and answers **415** otherwise. The loop makes him
    reproduce the 415 *before* the fix.
  - The `onResponse` audit hook must skip this route: `shouldAudit` returns
    true for every POST, so a broken page writes a row per violation with
    `userId: undefined`. Checked by `request.routeOptions.url`, never
    `request.url` — caller input, the hook's own existing rule.
- Per-route `rateLimit: { max: 20 }` so reports cannot spend the user's 100.
- Handler answers **204** and logs three `slice()`d fields. Malformed JSON is
  **dropped, not 400'd**: on a telemetry route nobody reads the complaint.
- `report-uri` over `report-to`: deprecated but universally implemented, and a
  one-line swap later.

## Consequences
- General rule worth keeping: **a public route is defined by what it cannot
  assume**, and every hook written for a logged-in user is a thing it must get
  past. The hook list is the checklist.
- Zero application code written by me (lesson-code rule). Suite stays 172.
  **No new dependency, 65 lessons.**

## Still open
- **Unmeasured and named in the lesson:** does `allowWrite()` refuse a browser-
  sent report POST? Depends on the `Sec-Fetch-Site`/`Origin` a report carries,
  which I will not guess. He reports `204` or `403`; a `403` means one early
  return for this route pattern.
- Lesson 64's void asset check: retry on the next deploy that rebuilds `web/`.
- The invite mailer, week 13–14. Alerting: none exists, named as its own thing.
