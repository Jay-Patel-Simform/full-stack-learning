# 0066 — A clean console is not evidence that a header arrived

Date: 2026-09-18
Status: accepted
Lesson: [63 — The headers you already have](../lessons/0063-the-headers-you-already-have.html)
Supersedes part of: [0065](./0065-a-policy-is-written-from-your-own-build.md) ("still open" items)

## Context
Jay reported lesson 62 complete: Blueprint live, console clean, policy
enforcing. Before writing lesson 63 I ran `curl -sI` against the live site,
because a claim gets checked like any other (the rule from lesson 61, where
three notes claimed a page did not exist while it sat on disk).

## Decision
- **Two of the three reported facts did not survive the check, and the lesson
  opens by saying so.**
  - `https://tracker-web-mxol.onrender.com/` sends **no** CSP header of any
    kind. The `headers:` block exists only in the working tree. The console was
    clean because nothing was evaluated.
  - Live service names are `tracker-web-mxol` and `full-stack-learning-mmty`;
    `render.yaml` names them `tasks-web` and `tasks-api`. A Render URL derives
    from the name, so **the deployed services were not deployed from that
    file**. Lesson 61's Blueprint-adoption question is answered by evidence:
    applying it as written creates a second pair. Fix is a rename in the file.
- **General rule, and the lesson's spine: a page with no policy and a page with
  a perfect policy produce the same console.** The console can only report
  violations of a policy the browser received, so silence is ambiguous.
  `curl -sI` disambiguates. *Confirm the mechanism is running before reading
  its output as a result.*
- **Three uncoordinated header senders** named: `@fastify/helmet` (your code,
  API only), Render + Cloudflare (platform, free, uncontrollable), the
  `headers:` block (static site only). Nothing reconciles them, and duplicate-
  header resolution is not predictable — so measure, then add only the gap.
- **Measured gap is two lines.** `Referrer-Policy:
  strict-origin-when-cross-origin` and `Permissions-Policy: camera=(),
  microphone=(), geolocation=()`. Deliberately **not** added: HSTS (Render
  sends a stronger one, `preload`, 10y), `X-Content-Type-Options` (already
  `nosniff`), `X-Frame-Options` (`frame-ancestors 'none'` supersedes it).
- **`Referrer-Policy` named as near-worthless today** — it is already the
  browser default in Chrome, Firefox and Safari. Kept for one honest reason:
  *a default is a decision someone else can change*. Told him which of the two
  lines actually buys something.
- Feedback loop is `curl > before.txt` → deploy → `curl > after.txt` → `diff`.
  A test he did not have to write.

## Consequences
- **Lesson 62's open box is closed by measurement**: `/api/health` through the
  rewrite returns helmet's `default-src 'none';frame-ancestors 'none'`, i.e.
  the origin's own headers pass through and the static site's `path: /*` block
  is *not* layered on top. The behaviour he wanted, now a fact.
- **Redis is declined, and the lesson says why.** Jay pushed back ("we needed
  Redis in such a small app?") and the pushback is correct. The in-memory
  counter is wrong only with a second process; he has one instance on a free
  plan. **The trigger is the second instance, not app size** — and when it
  comes, check Postgres first. Streak stands: no new dependency, 63 lessons.
- Zero application code, zero tests changed. Suite stays 172.

## Still open
- The real deploy: rename services, add two headers, push, `diff` the curl
  output, *then* do lesson 62's console walk and `appendChild` test for the
  first time with a policy actually present.
- `report-uri` (needs a public unauthenticated route — own lesson).
- `cache-control` on the static HTML (`s-maxage=300`): how stale a deploy can
  look. A correctness lesson, not a security one.
- COOP/COEP/CORP: deliberately skipped as cargo cult; no `SharedArrayBuffer`,
  no cross-origin embeds.
- The invite mailer, week 13–14.
