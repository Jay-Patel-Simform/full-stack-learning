# 0032 — One fact, one reader

Date: 2026-09-10
Lesson: [29 — The logout that keeps the session](../lessons/0029-the-logout-that-keeps-the-session.html)

## Context

Record 0031 left the Docker fork open for the third time. I asked again, with
the four options and a recommendation, plus a fifth I had not offered before:
finish lesson 27 first. **He answered "skip Docker, I want to implement this at
the end"** — which is not one of the four options and is a better answer than
any of them. Second session running that he has answered a direction question.
Record 0031's rule holds: ask about direction, do not ask about content.

So Docker moves to the end of the course, and lesson 29 became the thing record
0031 said to do if lesson 27 was still unfinished: **do it with him**, not
mention it a third time.

Checked first: `npm test` = 141 passing, `tsc --noEmit` clean, no container
tool installed on this Mac (no `docker`, `orb`, `podman`, `colima`, `flyctl`).

## Decision

**1. The spine is "one fact, one reader", and the headline is a security bug I
did not expect to find.** I went in expecting the lesson to be about the four
dead `??` fallbacks. It is about `session.ts:79`. `sessionCookie()` reads
`config.NODE_ENV`; `clearCookie()`, thirteen lines below, reads
`process.env.NODE_ENV`. Measured: mutate `process.env` after import and the
flags disagree — set-cookie without `Secure`, clear-cookie with it. An `http:`
site cannot set a `Secure` cookie at all, so the browser drops the whole
header and **logout leaves the session cookie in place**.

**2. I said plainly that the bug is not live.** Nothing in his app writes to
`process.env`, so both lines agree today. Overstating it would have been
easier and worse. The honest framing is the better lesson anyway: *the code is
correct because of a fact nobody wrote down and nothing checks*. One of the
three quizzes tests exactly this, with "No, but only because nothing mutates
it" as the right answer.

**3. New word pair: snapshot vs live read.** Tenth pair. The reusable test it
gives: *can these two readers ever disagree inside one process?* `config` is a
snapshot taken at import; `process.env` is a mutable global. Validation cannot
make them agree — you delete one reader.

**4. "Dead code has no failing state" is the transferable idea.** All six
leftovers pass `tsc` and all 141 tests, with and without them. There is no
green light that will ever turn red. So the workflow is: find by grep, then
lock down with a test. The reference card got a four-command grep checklist.

**5. He writes a test that he watches fail first.** Exercise 3 is deliberately
ordered: add the test while `session.ts` still says `process.env`, see
`not ok 36` and `# fail 1`, *then* make the one-word swap and see 142. A test
he has never seen fail proves nothing. First regression test in the course
where he sees both states.

**6. His own `server/CLAUDE.md` already forbade all six.** "Read env through
`config`... Never `process.env`." Written before any of this, correct, and
broken in six places with a clean build. Made that a section: **a written rule
is not enforcement**; refusing to boot is, and a failing test is.

**7. Every `??` is not the problem — a second default is.** `app.ts:174` and
`:189` have legitimate `??` on values Fastify may leave absent. Called those
out explicitly so he does not delete them. Distinguishing the two is the
actual skill.

## Measured, on his real code

The drift, real `config.ts` and real `session.ts`:

```
boot   process.env.NODE_ENV = "development"
boot   config.NODE_ENV      = "development"
after  process.env.NODE_ENV = 'production':
       config.NODE_ENV      = "development"   <- snapshot, blind to it
set-cookie   : session=FAKEID; HttpOnly; SameSite=Lax; Path=/; Expires=...
clear-cookie : session=;       HttpOnly; SameSite=Lax; Path=/; Max-Age=0; Secure
FLAGS MATCH? false
```

The four `??` are unreachable. Booted from a directory with no `.env` and the
variable genuinely absent:

```
Bad environment:
✖ Invalid input: expected string, received undefined
  → at ALLOWED_ORIGINS
exit 1
```

And when it does boot, none of the four can be nullish:

```
ALLOWED_ORIGINS: ["http://localhost:5173"]  (array, not string)
PORT: 3000 number · HOST: "127.0.0.1" · LOG_LEVEL: "silent"
all four -> the ?? can never fire
```

Then **applied all six edits to his files**: `tsc --noEmit` clean,
`npm test` = **141 passing**. Added the new session test: **142 passing**.
Reverted only `session.ts:79` to the buggy line and re-ran:
`not ok 36 - the clear cookie carries the same flags as the cookie it clears`,
**# fail 1**. Then restored `app.ts`, `server.ts`, `db.ts`, `session.ts` and
`session.test.ts` from backups and re-ran: 141 passing, `grep` confirms every
leftover is back. **`server/` is byte-identical to how I found it** — record
0025's standing rule.

## Found while writing it

- **Seventh lesson running where the probe wrote the headline.** I expected the
  `??` fallbacks. The measurement produced the cookie-flag mismatch. Record
  0031 said to stop noting this; I am noting it once more only because this
  time the probe found a *security* bug in code I had already read twice
  without seeing it.
- **`db.ts` had ten dead lines, not one.** A second `loadEnvFile()` and a
  second `DATABASE_URL` check, both already done by `config.ts` — and the zod
  version is *stronger*, since `z.url()` rejects `DATABASE_URL="hello"` and the
  `if (!...)` accepts it. Deleting it is a load-order claim, so I measured it
  rather than asserting it: a module's imports all complete before its own body
  runs, and 141 tests that hit the real database still pass.
- **The `try/finally` in the new test is the lesson one level down.** The test
  writes to a global that every later test in the file shares. Without the
  restore it changes the world for test 37. Same shape as the bug it catches.
- **Three of my own numbers were wrong and the probe caught them.** I wrote
  "six hits" for the `process.env` grep (nine, four of which are comments),
  gave him `grep -o "^[A-Z_]*"` for the `.env.example` diff (the `*` matches
  empty on every comment line and fills the diff with blanks — `-oE "^[A-Z_]+"`
  is right), and said `config.ts` is 48 lines (49). **Run every command in the
  "Do this" list before shipping it**, not just the ones that produce lesson
  content.
- Lesson length 23.6 KB, up from 17.8. Six edits plus a test plus a new file is
  genuinely more surface than lesson 28 had. Prose ~7 KB.
- Exercise 7 is the lesson-26 trim fix, **third time asked**. Added "if you
  would rather I did this one with you, say so — that is a fine answer." Asking
  a fourth time without offering that would be nagging.
- Ran the show-me skill per workspace CLAUDE.md:
  `show-me-0029-two-readers.html` — the drift as a two-column timeline, the two
  cookie strings with the browser dropping the header, and the four fallbacks
  drawn *below* the `process.exit(1)`.

## Consequence

- New: `lessons/0029-the-logout-that-keeps-the-session.html`,
  `lessons/show-me-0029-two-readers.html`.
- `reference/environment.html`: the one-fact-one-reader rule, snapshot vs live
  read, a four-command leftovers checklist, the `.env.example` shape, and a
  cookie-flag-trap section. 6.4 KB → 10.5 KB.
- `lessons/index.html`: lesson 29 row under Week 11–12, and a rewritten
  "next up" — Docker is no longer next.
- **Zero net code changes in `server/` or `web/`.** Test count unchanged at 141.

## Open

- **Docker and deploy now sit at the end of the course**, after week 13–14.
  His decision, taken with the trade-off stated. Week 11–12 becomes the
  real-world work instead: pagination, N+1, indexes, the invite mailer. PLAN.md
  reordered.
- **Lesson 29 is only finished when he types it.** Six edits, one test, one new
  file, plus fixing the `server/CLAUDE.md` Environment paragraph, which lesson
  27 made false. Expect 142 passing. Check this first next session — this is
  the third lesson in a row whose work carries over.
- **No front-end test, fourth lesson running.** Lesson 29 is a server lesson so
  it does not move; still the loudest gap in the workspace.
- The lesson-26 trim fix, third time asked, now with an offer to pair on it.
- Still no `POST /teams` from the page. Soft delete / real undo still planted.
