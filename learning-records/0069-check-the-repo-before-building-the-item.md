# 0069 — An open item on the plan is not an unbuilt feature

Date: 2026-09-18
Status: accepted
Lesson: [66 — The answers you already had](../lessons/0066-the-answers-you-already-had.html)
Closes: "body size limit (asked 4x)", lesson 65's CSRF honesty box, and
lesson 64's asset-survival homework (the third one is *blocked*, not answered)

## Context
Jay asked for five things in one go. Three of them were questions rather than
features, and each had an answer available for the cost of one probe. This is
the third time in six lessons that reading the repository first changed the
lesson — 61 (the audit page already existed), 63 (two of his three reported
facts were wrong), now this.

## Decision
- **The body size limit was already there.** `bodyLimit: 64 * 1024`,
  `server/src/app.ts:65`, present in commit `5f73323` — the squashed first
  commit. Fastify's own default is 1 MiB, so this is a deliberate line sixteen
  times tighter. It was asked for four times because **it never appeared in a
  lesson**, so it never got ticked off.
- The real question hiding under it *was* worth asking: lesson 65's custom
  `application/csp-report` parser does not pass its own `bodyLimit`, and a
  custom parser is allowed one. **Measured** with his installed Fastify and the
  parser copied exactly: json 1 KB → 204, json 80 KB → **413**, csp-report
  1 KB → 204, csp-report 80 KB → **413**. It inherits. Nothing to add.
- **Lesson 65's unmeasured question, answered with a real headless Chrome.** A
  throwaway page, a policy that blocks an image, a report endpoint that dumps
  headers. Chrome sends `Sec-Fetch-Site: same-origin`, `Sec-Fetch-Mode: no-cors`,
  **`Sec-Fetch-Dest: report`**, `Content-Type: application/csp-report`, the page's
  `Origin`, and **no cookie**. So `allowWrite()` returns on line 2 and the
  answer is **204, not 403**.
- **Second probe, the interesting one:** cross-site `report-uri` (page on
  `localhost`, endpoint on `127.0.0.1`) gives `Sec-Fetch-Site: cross-site` and
  an `Origin` that is **the page's**, which is in `ALLOWED_ORIGINS`. So it
  passes too — for a reason that is not the reason you wanted.
- **Decided not to add a `Sec-Fetch-Dest: report` branch to `csrf.ts`.**
  Argued in the lesson with a table. Reports pass, measured both ways; the
  exception only earns its keep if somebody later trims `ALLOWED_ORIGINS`.
  Fifth time naming a weak argument as weak instead of quietly winning it.
- **Lesson 64's asset check cannot run.** The live bundle is still
  `index-D1HMFRqX.js`, the hash lesson 64 wrote down. The site *has*
  redeployed — `last-modified` is today, lesson 63's headers are live — but
  headers are not bundle bytes, so Vite produced the identical filename. The
  experiment needs a real source edit; lesson 68 names which one.
- Two new tests (`body-limit.test.ts`), including the deliberate red step:
  widen `bodyLimit` to 1 MiB, watch it fail, put it back. **174.**

## Rules to remember
- **An item can be open on a list and closed in the code.** A plan is a claim
  about a repository, and claims go stale. Check before building.
- **A limit with no test is a limit you will delete by accident.** The line was
  right and nothing in 172 tests would have noticed its removal.
- **Passing and passing for the right reason are two different results.** The
  cross-site report is allowed because the page is on the CORS allow-list — a
  list that exists to answer a different question entirely.
- **Reading your own code cannot answer a question about a browser.** That
  needs a probe. `allowWrite()` is fully readable; which headers Chrome
  attaches to a report is not in it.
- **A content hash that did not move is telling the truth: nothing changed.**

## Found while looking
- The live CSP is still `Content-Security-Policy-Report-Only`. Lesson 62's
  loop — walk every screen, then drop the suffix — has not been cashed in, so
  the policy currently blocks nothing.
- The live header has **no `report-uri`**. It is in his working-tree
  `render.yaml`, not on the internet. Those two ship in one push.

## Consequences
- Lesson 65's honesty box is closed with a measurement.
- The `Sec-Fetch-Dest` finding is written down rather than coded: revisit the
  day `ALLOWED_ORIGINS` has more than one entry that matters.
- The asset question stays open, and is now *scheduled* rather than vague.

## Measured afterwards (the code was written, not just taught)
`body-limit.test.ts` written and run: **three tests**, covering the JSON path,
the `application/csp-report` parser path, and the not-refused control. The
deliberate red step was actually performed — widening `bodyLimit` to 1 MiB
turns the suite to `# fail 2` (both size tests), and restoring it returns 182.

Suite is **182**, not the 174 this record's lesson first predicted: the
baseline was already 174 because his own `csp-report.test.ts` (2 tests) had
landed after lesson 65. **Run the suite before writing a number into a lesson.**

**The asset question is no longer blocked.** Lesson 67's one-word edit to the
front end's `Action` union moved the bundle: `index-D1HMFRqX.js` →
`index-zI3W9Tc3.js`, while `index-ChPRm71S.css` stayed identical. Only the
JavaScript changed, so only the JavaScript was renamed — the hash mechanism
demonstrating itself. The old URL is saved in the lesson; one curl after his
next deploy closes an item open since lesson 64.
