# 0067 — A filename that is a hash is a caching policy

Date: 2026-09-18
Status: accepted
Lesson: [64 — The deploy you can still see the old of](../lessons/0064-the-deploy-you-can-still-see-the-old-of.html)
Closes: [0066](./0066-a-clean-console-is-not-evidence.md) ("the real deploy")

## Context
Lesson 63's homework was a real deploy. Verified by `curl -sI` before writing:
the CSP (report-only), `Referrer-Policy` and `Permissions-Policy` all arrive,
nothing duplicated, and the live URLs now match the `render.yaml` names. So
lesson 61's Blueprint question is closed by evidence, and the queued
`cache-control` item became the next lesson.

## Decision
- **Measured gap:** `/index.html` and `/assets/index-D1HMFRqX.js` are sent an
  identical `cache-control: public, max-age=0, s-maxage=300`. Correct for the
  first, wasteful for the second.
- **Spine of the lesson: a static site has a pointer and contents.** The
  pointer (`index.html`) has a fixed name and changing bytes, so it must never
  be reused without asking. The contents are named by a hash of themselves, so
  a cached copy cannot be stale. *The guarantee lives in the filename, not in a
  timer* — which is why `max-age=31536000, immutable` is safe there and would
  be a disaster on the HTML.
- **`max-age` is the browser, `s-maxage` is the shared cache.** Two machines,
  two numbers, one header. Named as the root of most caching bugs.
- `s-maxage=300` reframed as a chosen number: **the post-deploy staleness
  window**, currently five minutes and chosen by not choosing.
- Fix is one entry, `path: /assets/*`. **`index.html` deliberately untouched**,
  and lowering its `s-maxage` argued against out loud: it removes the CDN, and
  on a free plan that makes every homepage hit wake the instance.
- **Measured, and it changed the framing**: `If-None-Match` returns `304`, so
  revalidation costs a round trip, not the bundle. The waste is *latency on
  first paint*, not bandwidth.
- Two failure shapes taught by symptom: "looks old" (stale HTML) vs "blank page
  with a `/assets/` 404" (stale HTML naming deleted bundles).

## Consequences
- Fourth lesson running where the lesson opens from `curl` output rather than
  from a claim. This is now the house move and should stay one.
- Zero application code, zero tests. Suite stays 172. **No new dependency, 64
  lessons.**

## Still open
- **Unmeasured and named in the lesson:** does Render keep the previous
  deploy's `/assets/` files reachable? Jay saves a bundle URL, deploys, curls
  it. `200` → the white-page failure cannot happen; `404` → shorten `s-maxage`.
  - Attempted on the 2026-09-18 deploy and **the check was void**: nothing in
    `web/` changed, so Vite emitted identical hashes and the "old" URLs were
    the current ones. Two `200`s that mean nothing. *A test whose inputs did
    not change has not passed* — the same shape as the clean console in
    lesson 63. Retry on the next deploy that actually rebuilds the bundle.
  - Confirmed live and real: `/assets/*` now returns
    `max-age=31536000, immutable`; `/` still returns `max-age=0, s-maxage=300`.
- `report-uri` (needs a public unauthenticated route — own lesson).
- Service worker: declined, named as a third cache. COOP/COEP: still cargo cult.
- The invite mailer, week 13–14.
