# 0071 — The no-dependency streak ends, and the argument is the lesson

Date: 2026-09-18
Status: accepted
Lesson: [68 — The first test that needed a browser](../lessons/0068-the-first-test-that-needed-a-browser.html)
Closes: "Front-end tests: Vitest + Testing Library, deferred on purpose"
(week 13–14), and lesson 26's "no front-end tests" note

## Context
Sixty-seven lessons with no new dependency. It was never a rule — it was the
habit of asking what a package costs before installing it, and it has been
earned by *rejecting* things (argon2, `@fastify/cookie`, casbin, Jest, MSW-
shaped answers) and by *taking* three (`@fastify/rate-limit`, `cors`, `helmet`)
when the problem had no decisions left in it. Four packages land here at once,
so the reasoning had to be louder than usual.

## Decision
- **The thing that cannot be tested today, named first.**
  `disabled={createTeam.isPending || name.trim() === ""}` holds three real
  decisions (the trim rule, lesson 26's double-click guard measured as ids 360
  and 361, and re-enabling on settle) and nothing has ever rendered it.
- **Rolling it by hand was considered and rejected.** `node --test` would need
  a DOM, a JSX transform, `@/` resolution, CSS imports no-op'd and
  `import.meta.env` defined — five pieces, each a dependency or a hand-written
  hack. Fourth outing for lesson 12's rule: **take the library when the problem
  has no decisions left in it.**
- **Vitest over Jest, decided by one file.** `web/vite.config.ts` already holds
  the `@/` alias and the React plugin, and Vitest *is* Vite, so it reads them.
  Jest needs its own module mapper and transform, kept in agreement forever —
  the two-configs-that-must-not-drift shape that lesson 29 spent a whole lesson
  unpicking.
- **jsdom over happy-dom, with numbers.** 7.2 MB vs 8.6 MB unpacked, and jsdom
  is the more complete implementation; happy-dom's trade is speed for
  edge-case correctness, and at three tests there is no speed to win. Second
  time the bigger-but-faster option lost because the speed bought nothing at
  his scale. Told him to measure `du -sh node_modules` before and after rather
  than trust the four registry numbers, which are direct packages only.
- Four packages: `vitest`, `jsdom`, `@testing-library/react`,
  `@testing-library/user-event`. **`@testing-library/jest-dom` deliberately
  left out** — try `expect(button.disabled).toBe(true)` first and let the
  annoyance across three tests be the measurement.
- **One runner, not two.** `"test": "vitest run"` replaces the `node --test`
  script; the two existing `.test.ts` files run unchanged. The loop tells him
  to verify that *before* writing any new test, while the runner is the only
  change.
- Three tests on `NewTeamForm`: spaces cannot submit (lesson 26's trim rule,
  finally enforced); a real name sends the **trimmed value** (asserting the
  payload, not just that a call happened); a `403` leaves the typed sentence on
  screen (lesson 26's clear-in-`onSuccess` decision, now guarded).
- `vi.spyOn(api, "post")` rather than MSW — one line, no module mocking, and
  `errorMessage()` stays real. MSW when several requests interact.
- `retry: false` on queries and mutations, or the 403 test waits through
  backed-off retries and is reported as a **timeout**, naming the wrong
  problem.

## Rules to remember
- **Test what a user can do; never test what a component knows.** "`name` state
  equals Design" fails on a rename while the app is fine.
- **A component is a thing in a tree, not a thing with arguments.** That is the
  whole reason a component test feels heavier — the providers are the weight.
- **Query by role and label, not by test id**, so accessibility becomes
  load-bearing instead of decorative: the test fails exactly when a real person
  could not find the control.
- **A default that is right for an app is frequently wrong for a test.**
  Retries, a shared cache, live spies.
- **Assert the value, not the call.** Same family as lesson 20's "a sort test
  whose two orders agree cannot fail".

## Consequences
- New reference card: [Front-end testing](../reference/front-end-testing.html).
  `reference/testing.html`'s "no Vitest installed" paragraph was false as of
  this lesson and has been corrected to split server from front end.
- **Lesson 66's asset-survival check is now schedulable.** devDependencies and
  test files do not change the bundle — nothing imports them — so this lesson
  alone leaves the hash at `index-D1HMFRqX.js`. Lesson 67's edit to the
  type-only `Action` union in `web/src/features/teams/teams.ts` is the change
  that moves it. Step 7 saves the old filename before that deploy.
- Five screens still have no tests, on purpose. The next test arrives the next
  time a screen changes, not in a batch nobody reads.
- Playwright named and declined: a different question (browser to Postgres), a
  browser download and a CI story, for one user and a working app.

## Measured afterwards (the code was written, not just taught)
Jay asked for the implementation as well, so all of it was written and run.
Four things the lesson predicted wrong, all corrected in place:

1. **The two existing `web/` tests do NOT survive the runner swap.**
   `Cannot bundle Node.js built-in "node:test" imported from
   src/features/audit/audit-row.test.ts` — the jsdom environment is
   browser-shaped and Node built-ins cannot be bundled into it. Nine tests
   loading zero. Converted both with six one-line `expect` wrappers, which
   keeps the original assertion style readable.
2. **`npm test` green and `npm run build` red is a real state.** `tsc -b`
   failed on the new `.test.tsx` with `Cannot find name 'expect'` until
   `"vitest/globals"` joined `types` in `tsconfig.app.json`. Vitest resolves
   globals at runtime; TypeScript does not. **Render runs the second checker**,
   so this was one edit away from a red deploy on a green suite.
3. `toBeDisabled()` / `toHaveValue()` really do throw `Invalid Chai property`.
   Took the plain `.disabled` / `.value` reads, as argued — no fifth package.
4. `noUnusedLocals` rejects the wrapper helpers a file does not use, so the
   conversion is per-file, not a copied block.

**Measured install cost: 254M → 297M, +43 MB, 69 packages** — four times the
10.7 MB the four direct packages add up to. The lesson's table was right about
each package and wrong about the total, which is exactly why it told him to run
`du -sh node_modules` rather than add the numbers up.

**Final state:** `web` 12 tests pass, `tsc -b` clean, `npm run build` succeeds.
The deliberate red step was run for real: `name === ""` in place of
`name.trim() === ""` fails exactly one test.

**Side effect that closed another item:** the bundle hash moved from
`index-D1HMFRqX.js` to `index-zI3W9Tc3.js` while the CSS hash stayed
`index-ChPRm71S.css` — only the JavaScript changed, so only the JavaScript was
renamed. Lesson 66's asset-survival check is now armed with a real old URL.
