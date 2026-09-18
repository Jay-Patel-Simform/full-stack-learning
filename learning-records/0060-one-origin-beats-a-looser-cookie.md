# 0060 — One origin beats a looser cookie

Date: 2026-09-18
Status: accepted
Lesson: [57 — One origin, and the cookie comes back](../lessons/0057-one-origin-and-the-cookie-comes-back.html)

## Context
Lesson 56 left a working deployed API and a 401: the local Vite page could log
in against it but every request afterwards was unauthenticated, because
`localhost:5173` and `onrender.com` are different *sites* and the session cookie
is `SameSite=Lax`.

## Decision
- **Fix the topology, not the flag.** The front end becomes a Render **static
  site** serving `web/dist`, with a rewrite rule `/api/*` →
  `https://<api>.onrender.com/*`. The browser then only ever talks to one
  origin, so there is no cross-site request left to defend against.
  `SameSite=None; Secure` was written up side by side and rejected: it fixes
  the symptom and gives back the CSRF defence from lesson 29.
- **Rewrite, not redirect.** A redirect returns the API's own URL and the
  browser goes there itself — cross-site again, plus a round trip.
- **A second rule `/*` → `/index.html`, after the first**, for client-side
  routing. Rules match top down, so order is the whole correctness argument.
- `VITE_API_URL=/api` — a path, resolved by axios against the page's origin.
- `ALLOWED_ORIGINS` shrinks to the static site's URL.

## Consequences
- **Zero server changes, because the session cookie has no `Domain=`.** A
  host-only cookie is filed under the host the browser actually asked, which is
  now the static site. The usual proxy chore of rewriting the cookie domain does
  not arise. The general rule: the narrowest default is the one that survives
  being moved.
- `Sec-Fetch-Site: same-origin` is true for the first time, so `allowWrite()`'s
  first branch — written in lesson 29 and commented "the good case in
  production" — finally does the work, and the `allowedOrigins.includes(origin)`
  fallback goes back to being a dev-only path.
- New word pair: **build time vs boot time.** A `VITE_` variable is a
  compile-time substitution baked into the shipped bundle (and therefore
  public); every server variable is read at boot. Same term, two moments.
- `tsc -b` in the build command means a type error is now a failed deploy
  rather than a terminal message. Named in the lesson.
- **One thing left open on purpose and said out loud:** whether the CDN rewrite
  hop preserves the client IP in `X-Forwarded-For`. Lesson 12's 100-per-IP
  floor is meaningless if it does not. Could not be measured from here — it is
  the homework and the community question. If it turns out the backend sees the
  CDN, the answer is a different key, not a bigger number.
- `deploy/nginx.conf` (unused since lesson 53) stays unused. The static site is
  $0, has no container and never sleeps.
- Zero TypeScript. Suite stays 172. No new dependency, 57 lessons.

## Still open
- The two front-end holes, oldest open item in the workspace and now unblocked:
  nothing reads the audit log, and no page can create a team.
- `render.yaml` — two services and eleven dashboard fields in, no longer premature.
- A real page CSP via the static site's custom headers. Helmet's `default-src
  'none'` is correct for the API and would break the page.
