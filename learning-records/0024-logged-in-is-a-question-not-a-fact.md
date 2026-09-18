# 0024 — "Logged in" is a question, not a fact

Date: 2026-09-09
Lesson: [22 — The browser does not know you](../lessons/0022-the-browser-does-not-know-you.html)

## Context

First lesson of week 9–10, and the first front-end code in the workspace.
Twenty-one lessons of server, and `GET /auth/me` had existed since lesson 6
with **nothing ever calling it and no test on it**.

The plan said "login page, token refresh on 401, role-based UI hiding". Three
things. Split them: this lesson is the login page and the 401 loop only.

## Decision

**One static page, `web/index.html`, served on `:5173`. No framework, no build
step, and no new server code at all.**

`npm run web` = `python3 -m http.server 5173 -d ../web`. Python is already on
the Mac; a bundler would have been the first new tool in six lessons and would
teach nothing about auth. Jay is strong in React — React is not the lesson.

**Cross-origin in dev, on purpose.** `ALLOWED_ORIGINS` already defaulted to
`http://localhost:5173`, CORS already had `credentials: true`, and the CSRF
hook already allowed an allow-listed `Origin`. So the page exercised eight
lessons of walls with **zero server changes**. Record 0015's same-origin nginx
cutover stays where it was: week 11–12.

**Three UI states, not two:** `unknown` → `in` | `out`.

**One `api()` wrapper handles the 401**, not each call site.

## Why

- **`HttpOnly` (lesson 6) means there is no client-side answer.**
  `document.cookie` is `""` while signed in. There is no `isLoggedIn` to read,
  so the app cannot boot into `out` (flashes a form at a signed-in user) or
  into `in` (renders an app for a stranger). `unknown` is a real state.
- **A session can die while the tab is idle** — logout elsewhere, expiry, an
  admin ending sessions. All delete the *row*; the cookie string is unchanged
  and nothing in the browser can detect it. So the 401 is not a boot-time
  event, and a rule with no exceptions does not belong in each caller.
  **Third use of that rule** (lesson 7 `can()`, lesson 19 audit hook).
- **One deliberate exception to the wrapper: the login form.** A 401 from
  `/auth/login` means "wrong password" (lesson 18 made it deliberately
  indistinguishable from "no such account"); a 401 from anything else means
  "your session is gone". Same status, two meanings, two different UIs.
  Routing login through `api()` gives the user an empty form and no reason.
- **Serving the page from Fastify would have hit our own CSP.** Lesson 15 set
  `default-src 'none'` globally, which blocks the page's own script — inline or
  external. Staying off Fastify avoids inventing a per-route CSP exception
  today, and leaves the real answer where the plan put it: nginx, week 11–12.

## Plan correction

**"Token refresh on 401" is deleted from week 9–10. There is nothing to
refresh.** Record 0007 chose server-side sessions over JWTs, and
`readSession()` slides the expiry out to 30 days whenever half the life is
gone. The refresh happens in Postgres on every request and the front end never
hears about it. A whole front-end subsystem does not exist because of a week-3
decision. `PLAN.md` updated.

## Measured, in real headless Chrome (not curl)

Drove the page over CDP — Chrome is installed, and `node:` has a global
`WebSocket`, so no dependency:

```
state after boot, no cookie:      out
document.cookie after LOGIN:      ""        <- signed in, and empty
state after a full page RELOAD:   in
fetch WITHOUT credentials:include -> 401
fetch WITH    credentials:include -> 200
stored cookie: { httpOnly: true, sameSite: "Lax", secure: false }
```

The two status lines are the same URL, same tab, same user. **One option is
the difference between "logged in" and "logged out".**

The reload surviving two ports is lesson 13 made visible rather than tabular:
`SameSite` counts the site (port ignored) so the cookie is sent; CORS counts
the origin (port counts) so `credentials` is required. Both true at once,
about the same two URLs.

## Consequence

- `npm test` = **135**, was 130. Five new in `src/routes/me.test.ts`.
- **No new dependency, seven lessons running.** No migration. No change to
  `src/app.ts` — the first lesson since 11 that added no wall.
- New directory `web/`, new script `npm run web`.

## Found while writing it

- **Verifying in a browser beat verifying with curl.** curl proved the CORS
  headers and the cookie jar, but curl does not enforce `SameSite` and cannot
  show `document.cookie`. The three most valuable lines of the lesson only
  exist because I drove real Chrome. Fourth time the probe beat the plan.
- Headless Chrome over raw CDP is ~30 lines with no packages. Worth keeping as
  a technique for every front-end lesson from here.
- `/auth/me` had no test after sixteen lessons of depending on it. The gap was
  invisible because nothing called it. **Rule: the route a client depends on
  most is the one no server test thinks to cover.**

## Open

- **Role-based UI hiding, and "hiding a button is not security"** — next
  lesson. Needs the role in the reply: `UserPublic` is `{ id, email }` only,
  and there is **no `GET /teams`**, so the page cannot even discover a
  `teamId`. Both are server work.
- No CSP on the page itself. `python3 -m http.server` sends no headers. nginx,
  week 11–12, and it is a *different* policy from the API's.
- Still two origins in dev. Same-origin cutover, week 11–12.
- The `unknown` flash on every load. Cosmetic, not security.
