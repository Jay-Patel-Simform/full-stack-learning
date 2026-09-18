# 0038 — A pass reports on the files it was given, not on the code

Date: 2026-09-11
Lesson: [35 — The test that never ran](../lessons/0035-the-test-that-never-ran.html)

## Context

"Move to the lesson 35", one line, no topic. Pre-flight first, as always:

```
server npm test        154 pass    <- lesson 34 asked for 155
web    npm test          5 pass
web    npx tsc -b      clean
```

`server/src/log-redact.test.ts` was on disk. I read it line by line per record
0035 — the sink, the two log calls, `assert.ok(all.length > 0)` **first**, the
two leak checks, `[Redacted]` equal to 2. It is exactly the test I asked for,
including the guard most people leave out. Run alone: 1 pass. Run through
`npm test`: not present, no warning, no skip, no row.

So the hand-over was clean and the *suite* was not. I dropped the audit log
page for the third time and taught the suite instead.

## Decision

**1. Sixth session running where the probe replaced my plan — and the second
in a row where it found a live bug rather than a better framing.** I was going
to teach the audit log page. Checking his homework found a test runner that had
been silently dropping files since lesson 6.

```
find src -name '*.test.ts' | wc -l          22   on disk
sh  -c 'set -- src/**/*.test.ts; echo $#'   21   handed to tsx
zsh -c 'set -- src/**/*.test.ts; echo $#'   22
comm                                        src/log-redact.test.ts   dropped
```

**`npm run` uses sh. His terminal is zsh.** In sh and bash, `globstar` is off,
so `**` is an ordinary `*` — one level. `src/**/*.test.ts` meant
`src/*/*.test.ts`. Every test file he had ever written lived in `src/routes/`,
`src/auth/` or `src/audit/`, exactly one directory deep, so a wrong pattern
had nothing to lose for 29 lessons. His new file sits at the top of `src/`.

The measurement that makes the lesson is this one, and it needs no theory:

```
npm test                                    # pass 154
LOG_LEVEL=silent npx tsx --test src/**/*.test.ts   # pass 155
```

Same string. Different shell. Different suite.

**2. The fix is two quote marks, and Node's docs ask for them in one
sentence.** Quoted, the shell passes the pattern through and the runner globs
it with its own matcher, which does support `**` at depth. I checked the lazier
route first: `tsx --test` with no pattern also gives 155, using Node's default
patterns. I recommended *against* it in the lesson and said why — it searches
the whole project, and `src/generated/prisma/` is regenerated code he does not
control. First time in the course I have shown a shorter fix and argued for the
longer one; the reason is scope, not taste.

**3. `web` was never affected, and the reason is better than the fix.** Its
script is already quoted. But it would have survived unquoted too, because in
`web/src` the sh pattern matches **nothing** — and a pattern that matches
nothing is passed through untouched. So node received the pattern and globbed
it correctly. The bug needs a *partial* match to appear. That is exercise 5,
and it is the best question on the page: it works by luck, and the luck ends
the day he adds a test one folder deep.

**4. Fifth for five on "a bug with no error message", and the strongest one
yet.** 29 dead code, 32 a runtime throw under clean `tsc`, 33 a click that
sends nothing, 34 a redact path that matches nothing, 35 **a test that does not
exist as far as the runner is concerned**. A missing file is not a failure and
not a skip. It has no row. The only thing that catches it is the expected
number — which these lessons have been writing down every session, and which
is why it was caught at all.

**5. It let me name the family out loud, which lesson 34 had half-built.**
Three greens that prove nothing, all his own, all measured:

| Failure | Met it |
|---|---|
| never ran | 35 |
| ran with nothing to read | 34, the silent log level |
| ran and asserted the obvious | 20, the sort test whose two orders agreed |

One habit covers all three: break the code, watch it go red, put it back. He
did that as an *exercise* in lesson 34. Exercise 4 today makes it the routine —
he changes `2` to `3` in his own assertion and watches `npm test` fail, which
is the only available proof that the file is now in the suite.

**6. Streak intact: no new dependency, 35 lessons.** The whole fix is two
characters he types himself. No new terms beyond four: glob, shell expansion,
globstar, and (implicitly) test discovery. Under the cap, and two of them are
word pairs he needs for any project, not just this one.

**7. Split of work, fourth session.** There was almost nothing to apply, so
this time he types all of it: one `package.json` edit, two counting commands,
one deliberate breakage. I touched no file under `server/` or `web/`, per the
lesson-24 rule.

**8. Asked for the two owed answers once more, and said why.** `pg_trgm` is the
last ask — if it is unanswered next session it is dropped for good. The
`AuditLog`-vs-stream question is now *blocking*: I told him plainly that his
answer decides what the audit log page reads. A question with a consequence
attached is more likely to come back than a question without one.

## Measured

```
test files on disk                       22
sh hands to the runner                   21     (globstar off -> ** == *)
zsh hands to the runner                  22     (globstar on)
npm test (sh)                            154 pass
same command pasted in zsh               155 pass
quoted pattern                           155 pass
no pattern at all (node defaults)        155 pass   (rejected: scope)
web unquoted                             5 pass     (pattern matched nothing)
files the server suite was missing       src/log-redact.test.ts
his test run alone                       1 pass, correct
warnings from any tool about any of this 0
```

## Found while writing it

- **`--test-reporter=spec` does not print the file names it ran.** I looked for
  a way to list what the runner picked up and there isn't one. So the practical
  check is on the shell side: count the disk, count what sh expands to, compare.
  That check is runner-agnostic and project-agnostic, which makes it better
  reference material than the quoting rule it replaces.
- Only one glob in the whole project's scripts. `lint`, `format`, `dev` and
  `log` pass none, so there is exactly one place to fix and no sweep needed.
- Node's default patterns (no argument) include `**/test/**/*` and four
  `test-*` shapes. Worth knowing, and worth not relying on.

## Consequences

- New: `lessons/0035-the-test-that-never-ran.html`,
  `lessons/show-me-0035-who-expands-the-star.html`,
  `reference/testing.html` (new card — collects lessons 6, 10, 20, 34, 35).
- `lessons/index.html`: lesson 35 row, the new card, rewritten "next up".
- `reference/the-whole-arc.html`: lesson 35 sentence, two new words, four new
  traps, one new recurring rule ("a test you have never seen fail is not a
  test", first sighting L20).
- `PLAN.md`: lesson 35 closed; the two owed answers written down.
- **No edit under `server/` or `web/`.** The one-line fix is his to type.

## Open

- **Lesson 35 is finished when `npm test` prints 155** and he has seen his own
  test fail on purpose (exercise 4). Check both, not just the count.
- Session state stays a pair: **server 154 -> 155 after his edit, web 5**.
- Two answers owed. `pg_trgm` is on its last ask. The `AuditLog`-vs-pino answer
  gates the next lesson, and I said so.
- The audit log page has now been promised three times. Teach it next unless
  the pre-flight finds something on fire again — and the odds of that are no
  longer low, because the probe has replaced the plan six sessions running.
- Vitest still deferred, trigger unchanged: the first component test.
- Still open: no `POST /teams` from the page, soft delete + undo, idempotency
  keys, invite mailer, Redis for both counters, nginx + CSP, Docker and deploy
  last.
