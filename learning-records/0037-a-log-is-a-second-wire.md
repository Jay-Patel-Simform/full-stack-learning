# 0037 — A log is a second wire, and only one of them had a schema

Date: 2026-09-11
Lesson: [34 — The log that keeps the secret](../lessons/0034-the-log-that-keeps-the-secret.html)

## Context

"Move to lesson 34", one line, no topic. Pre-flight check first, and for the
second session running nothing had drifted:

```
server npm test        154 pass
web    npm test          5 pass    <- he typed the fifth
web    npx tsc -b      clean
```

I checked the line and not the number, as record 0035 requires: `edit-pages.ts`
uses `setQueriesData` with the prefix, and his fifth test seeds two entries and
asserts the row leaves both. Correct, and it is the test that actually pins
lesson 33 down. Two clean hand-overs in a row now, both produced by the same
split — I apply the plumbing, he types the breakage and the test.

The lesson index said the next things were "create a team from the page" and
"read the audit log". I went to look at logging first because week 11 lists it,
and the probe found a live leak in code he shipped in lesson 21. A real bug
beats a planned feature, so I swapped.

## Decision

**1. Fifth session running where the probe replaced my plan — and this time it
was not a reframing, it was a bug.** I expected to teach structured logging as
hygiene: levels, `reqId`, why JSON beats a sentence. Then I ran his own error
handler shape with a decorated error:

```
request.log.error({ err }, "unhandled error")   <- his line, since lesson 21

{"level":50,"reqId":"req-1","err":{
  "type":"Error","message":"db down","stack":"...",
  "user":{"id":7,"email":"jay@example.com","passwordHash":"scrypt$AAAA$BBBB"},
  "query":"SELECT * FROM User WHERE email = 'jay@example.com'"}}
```

`{ err }` is not one field. It is an object, and errors collect properties —
Prisma hangs `meta` on them, drivers hang the statement, handlers hang whatever
was in scope. The reply side is still perfect: lesson 21's handler sends a
`500` carrying nothing but a request id. So **the same `catch` block writes to
two wires and only one of them has a schema.** That framing is the lesson, and
it is his own code, which is why it lands.

**2. The rule is one he already owns in two other costumes.** `TaskPublic`
names the reply fields (lesson 30). `strict()` names the body fields (lesson
3). Today: name the log fields. `{ userId: user.id }`, not `{ user }`. I put
"name what may go out" in the whole-arc's recurring-rules table with L3 as
first sighting and 30, 34 as repeats — third instance is where a rule stops
being a tip.

**3. Redaction is the net, and I was careful to say so twice.** A denylist of
paths you predicted, in a syntax that fails quietly, is not a plan. Measured
against one object `{ err: { user: { passwordHash: "SEKRET" } } }`:

```
"user.passwordHash"        misses    wrong root
"*.passwordHash"           misses    * is ONE level; this is two
"err.*.passwordHash"       catches
"err.user.passwordHash"    catches
"**.passwordHash"          misses, no throw, no warning, prints in full
```

The `**` result is the best thing in the lesson. It is accepted, it matches
nothing, and the config *reads* as stricter than the version that works. That
is the third member of a family he now has enough instances of to name:
lesson 29 dead code, lesson 33 the missing filter, lesson 34 the silent path.
**A bug with no error message is four for four as the shape that lands.**

**4. Testability forced a real design decision, and it taught the lesson
again.** A log line has no failing state, so the only way to test it is to read
it. `buildApp(logStream?: NodeJS.WritableStream)`. Nineteen files call
`buildApp()` with no arguments and none of them changed; 154 stayed 154.

Two things fell out of that, both worth more than the parameter:

- `npm test` runs `LOG_LEVEL=silent`. A redaction test under that level reads
  an empty stream, asserts "the password is not here", and passes **forever**,
  including on the day redaction breaks. So a stream raises the level, and the
  first assertion in his test is `all.length > 0`. Exercise 3(b) makes him
  watch that failure. A green test that cannot fail is worse than no test, and
  this is the cleanest example of it he has met.
- `stream: undefined` does not compile. `TS2769`, `exactOptionalPropertyTypes`,
  **the same flag and the same spread shape as lesson 33's `where` clause, one
  lesson later, and this time it caught me.** Second session running where a
  config flag he never chose corrected my code while I was writing the lesson
  about it. Put it in the lesson verbatim.

**5. Streak intact: no new dependency, 34 lessons.** This one was close to
free and I checked the cheap route first. pino is already installed as a
Fastify dependency, and Fastify passes `redact` and `stream` straight through
its `logger` option — so the fix is **zero imports**, not even a phantom one.
Had I reached for `import pino from "pino"` it would have worked and been a
package he never declared. Worth noting that the lazy path and the correct
path were the same path again.

**6. Word pairs: exactly one.** Notes said six pairs in two lessons is the
ceiling and to stop until he uses one unprompted. So today adds only
**allowlist vs denylist** — and it is vocabulary he needs for security work
regardless, not a teaching device. New terms total: structured log, log level,
redaction, allowlist/denylist, log stream. Five, at the cap.

**7. Split of work, third time.** I applied `REDACT_PATHS`, the `logStream`
parameter and the level flip (mechanical, safe, 154 still green). His typing is
one test file and two deliberate breakages, each of which fails *differently* —
one leaks, one reads an empty log. Reserving his keystrokes for the part that
proves the rule keeps working.

**8. Ended with a question, not a fact.** Exercise 6 asks him which of the two
things called "a log" — `AuditLog` the table, pino the stream — should still
answer "who deleted this task" a year later, and why not the other. He built
`AuditLog` in lesson 18 and has never been asked to compare them. It also sets
up "nobody reads the audit log", which is the next front-end hole.

## Measured

```
{ err } with err.user attached, before:  passwordHash + full SQL to stdout
                                after:   "[Redacted]", 2 keys kept
buildApp(sink) under LOG_LEVEL=silent:   2 lines, 0 leaks, 2 [Redacted]
server npm test                          154 -> 154   (no test added by me)
npx tsc --noEmit                         clean (after the spread fix)
buildApp() callers unchanged             19 files
log calls in server/src                  4   (3 fine, 1 deliberate console.error)
Fastify default req serializer           logs method/url/host/remoteAddress
                                         does NOT log headers -> cookie safe by luck
```

## Found while writing it

- **Fastify does not log request headers by default.** So his session cookie
  was never in the log — luck, not design. The redact list names
  `req.headers.cookie` and `req.headers.authorization` anyway, because the day
  someone adds a custom serializer is the day that luck ends.
- **`remove: true` deletes the key as well as the value.** Did not use it. "A
  `passwordHash` field was present here" is useful while reading a log, and the
  value is already gone.
- Four log calls in the whole server. That number is why the allowlist rule is
  currently easy to keep, and it is worth showing him the number rather than
  the rule.
- The `AuditLog` / pino distinction is a genuinely good pair and I nearly
  missed it. Different storage, different reader, different lifetime, different
  question. It is now a table on the new reference card.

## Consequences

- New: `lessons/0034-the-log-that-keeps-the-secret.html`,
  `lessons/show-me-0034-two-wires.html`,
  `reference/logging.html` (new card — no existing card covered this).
- `server/src/app.ts`: `REDACT_PATHS` exported; `buildApp(logStream?)`;
  `logger` gains `redact`, a conditional `stream`, and the level flip.
- `server/CLAUDE.md`: three rules — choose the fields, the denylist is the net,
  and how to test a log line.
- `reference/api-security-basics.html`: "Secrets in logs" in named mistakes.
- `reference/the-whole-arc.html`: lesson 34 sentence, `allowlist vs denylist`,
  five new traps, and two new recurring rules ("name what may go out",
  "the dangerous bug has no failing state").
- `lessons/index.html`: lesson 34 row, the new card, rewritten "next up".
- `PLAN.md`: lesson 34 closed.

## Open

- **Lesson 34 is finished when he does exercise 2 and exercise 3.** One test
  file (`server/src/log-redact.test.ts`, expect **155**) and two breakages that
  fail differently. Check the specific assertions, not just the count — in
  particular that `assert.ok(all.length > 0)` is there, because without it the
  test is the exact green-forever test the lesson warns about.
- Session state is a pair: **server 154, web 5** (155 after his test).
- He owes me two answers now: `pg_trgm` (asked in lesson 33, unanswered) and
  the `AuditLog`-vs-log-stream question. Ask once more for the first; if it
  stays unanswered after this, drop it for good.
- Nothing stores the pino output. It goes to stdout and dies. That becomes real
  in week 13–14 with the error tracker, and in week 15–16 with the deploy.
- Vitest still deferred, trigger unchanged: the first component test.
- Still open: no `POST /teams` from the page, nobody reads the audit log, soft
  delete + undo, idempotency keys, invite mailer, Redis for both counters,
  nginx + CSP, Docker and deploy last.
