# 0035 — Testability is a property of the import graph

Date: 2026-09-10
Lesson: [32 — The function you cannot import](../lessons/0032-the-function-you-cannot-import.html)

## Context

He asked for lesson 32 in one line, plus "check all things are implemented
from the previous lesson". Two gaps found, both closed before teaching:

```
server npm test        143 -> 146      (3 page tests from lesson 30, written for him on request)
web    useCreateTask   appended to the last page HELD, not invalidateQueries
web    npx tsc -b      clean
web    test files      0
```

The `useCreateTask` drift is worth recording. He *did* apply lesson 31, but
invented a third option: `editPages(client, teamId, (items, isLast) => isLast
? [...items, task] : items)`. It reads as careful — it even has a comment
warning about N duplicates — and it is wrong for the reason lesson 31 named:
"last page held" is not "last page". Plausible-looking near-misses are what
he produces when a lesson gives a reason and he re-derives the fix. **Check
the specific line, not just "did he apply the lesson".**

He also said "just write the tests for me" after I gave him the three test
specs. Read that as a load signal, not laziness: he had already typed four
edits for lesson 31. Response was to write the server tests, keep the lesson-32
plumbing applied, and reserve his typing for the one part that is the skill.

## Decision

**1. Third session running where the probe wrote the headline.** I planned
"first front-end test, and Vitest is the decision". The probe killed the
framing in one command:

```
node --test probe.test.ts
Error [ERR_MODULE_NOT_FOUND]: Cannot find package '@/lib'
  imported from .../features/tasks/tasks.ts
```

Not a tool-choice lesson. A **you-cannot-import-your-own-function** lesson.
Node stripped the TypeScript without complaint (22.23.1, stripping is default);
the only thing missing was the `@/` alias, which lives in `vite.config.ts` and
`tsconfig.app.json` and in no place Node reads.

**2. Rejected Vitest, measured.** 34 MB standalone install. The workspace has
rejected a dependency in all 32 lessons; this is the first time the rejection
also *taught* something. Vitest reads `vite.config.ts`, so `@/` would have just
worked — and he would never have learned that his helper was welded to a file
full of network code. Named the flip condition explicitly in the lesson: **the
day he tests a component, install Vitest.** Hand-rolling a fake browser is not
lazy, it is silly.

**3. New rule: testability is a property of the import graph, not of the
function.** `tasksKey` is three lines and builds an array — untestable, because
it shares a file with `@/lib/api`. `editPages` became testable by moving, not by
changing. The mechanism is `import type`: erased before Node sees it, so the new
file imports **nothing at all** at runtime. `verbatimModuleSyntax: true` — which
until today looked like tidiness — is the flag that makes this legible.

**4. Measured, and it is the lesson's best moment: a real `QueryClient` runs
under plain `node --test`.** No jsdom, no browser. That kills the belief that
front-end code needs a browser to test. The parts that need a browser are the
parts that touch the screen, and that is a smaller share than it feels like.

**5. The first test found something lesson 31 got incomplete.** Four candidate
tests, three passed, the fourth failed — and the code was right:

```
edit that changes nothing  -> same box back?   true
edit that removes a row    -> same box back?   false
                           -> page 0 replaced? true
                           -> page 1 reused?   true   (identical object)
```

**Structural sharing.** Lesson 31 said "return a new box at three levels
because React compares references". True, and not the whole story: React Query
deep-compares what you return and hands the *old* objects back wherever nothing
changed. The spreads are a proposal, not the final answer. Page 1 keeping its
identity is why deleting a row from page 0 re-renders almost nothing.

This is the strongest argument for tests I have been able to hand him, and it
cost under a minute. Used it as the lesson's emotional beat rather than any
"tests are good practice" line.

**6. Warned about the trap it sets.** A test asserting "new object" after an
identity edit fails against correct code. Told him to assert contents, not
identity, unless identity is the point. First test suites lie in exactly this way.

## What is applied vs. what he types

Applied by me, `tsc -b` and `npm run build` both clean:
- new `web/src/features/tasks/edit-pages.ts`, all imports `import type`
- `tasks.ts` imports it; the three call sites pass `tasksKey(teamId)`, not `teamId`
- `web/package.json` gains `"test": "node --test \"src/**/*.test.ts\""`

He types: `web/src/features/tasks/edit-pages.test.ts`, four tests, spec'd in the
lesson. Expect **4 passing**. All four verified green here before spec'ing them.

## Consequences

- Session state to check from now on is a **pair**: server 146, web 4.
- Vitest is deferred, not rejected forever. Trigger is the first component test.
- Structural sharing belongs on the React Query reference card — it changes what
  a cache assertion is allowed to say.
- The trim fix (`.trim().min(1)`) is now at **five** asks. I told him in writing
  I will just do it next session unless he says no. Do it.
- `@/` alias now has three consumers and two config copies. If a third tool
  needs it, that is the moment to consider `imports` in `package.json` — but
  Node subpath imports must start with `#`, so `@/` cannot be expressed. Worth
  knowing before someone proposes it.
