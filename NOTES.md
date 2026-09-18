# Notes

## How Jay wants to be taught
- Very plain language. Short sentences. One idea per sentence. (ELI5 / Simplified English.)
- Tell him: what was done, did it work, what to do next.
- When a decision is needed: 2 options max, plus a recommendation.
- Exact paths and commands, always.

## Known starting point (2026-09-01)
- Strong: JavaScript, TypeScript, React, Vue.
- Basic: SQL.
- New: Node backends, auth, RBAC, Docker, deploying.

## Cadence
- 5-8 hours/week. Keep each lesson under ~20 minutes of reading + a small task.

## Tooling preferences (2026-09-01)
- Laptop is resource-tight. Prefer whatever is already installed over anything new.
- Before proposing a tool, check its memory cost (`ps -Ao rss,command`). Say the number in the lesson.
- Rejected `npx prisma dev` (~210 MB Node process) for the native Postgres service (~15 MB).
- Rejected the `argon2` package for built-in `node:crypto` scrypt (lesson 5). OWASP's #2, zero install. Measured 252 ms / 128 MiB per hash on this Mac. Revisit at week 13.
- Rejected `@fastify/cookie` for ~20 hand-written lines (lesson 6). The cookie flags are the security content; a plugin hides them.
- Rejected Jest/Vitest for built-in `node:test` + `tsx --test` (lesson 6). `npm test` now runs 8 real tests. Keep it this way.
- Rejected `casbin` for a 60-line table in `src/auth/can.ts` (lesson 7). A policy DSL plus a dependency, for four fixed roles. Revisit only if users must build their own roles.
- Docker is still planned for week 11-12, but expect the same pushback. Have a lighter fallback ready.

## Teaching moves that are landing (2026-09-02)
- "Make the safe thing the default, the unsafe thing deliberate." Used four times now (lessons 3, 5, 6, 7). Keep using it.
- Show the bad version first, then kill it with named reasons. Good fit in lesson 7 — he writes front ends, so he has written the bad shape.
- Leave one homework question that is *impossible* to answer with today's code. It motivates the next lesson better than a promise does. Two of them in lesson 8; that is the ceiling, do not add a third.
- "One reply for two different noes" (lesson 6 login error, lesson 8's 403 for wrong-role and stranger alike). Second use, landing. Reuse in week 7-8.
- No new dependency in lesson 8. Everything came from Prisma, Fastify hooks and zod, all already installed. Streak intact.
- New in lesson 8: first higher-order function (`requirePermission(action)` returns a hook), and the split between *decision* tests (pure) and *enforcement* tests (`app.inject()` + real Postgres). Both named out loud.
- He asked "what to do in lesson 7" when lesson 7 was already written. Read-back check: he may not be opening the lesson files. Give the exact `open <path>` command every time, and start each session by saying which lesson number is new.

## Lesson 9 notes (2026-09-02)
- Streak intact: no new dependency in lesson 9. No migration either — it was a
  pure code lesson, and that made it short. Good pacing after lesson 8.
- New framing that worked: **the bug is a missing argument, not a missing
  `if`.** Opened with NIST's subject/operation/object. Use this shape again —
  "count the nouns in the rule you want, count the parameters you have".
- Reused (third time) "make the safe thing the default": this time about *where
  code lives*, not about a default value. It generalises well.
- The invite hole was found by the rule, not by me looking for it. Point at
  that whenever he wants to write a special case.
- Homework 3 asks him to write a test for the ordering of `ROLES`. If he skips
  it, do it with him in lesson 10 — `rank` silently depends on it now.
- Only ONE impossible-to-answer homework question this time (the `Task` NOT NULL
  migration), plus one arguable-opinion question sent to the community. Two
  cliffhangers was the ceiling; one plus one felt right.
- Say the lesson number and the `open` command first, every session. Doing it.

## Lesson 10 notes (2026-09-02)
- Streak intact: **no new dependency**, ten lessons running. Everything came
  from Prisma, Postgres and code already written.
- First hand-written migration. `--create-only` then edit the SQL. He now has
  the expand/backfill/contract pattern; it is the answer to the "column on a
  live table" question for the rest of the plan.
- Framing that worked a third time: **count the nouns in the rule, then count
  the places your code can hold one.** Lesson 9 found a missing argument, this
  one found a missing URL segment. Keep using it.
- New pair of words he now owns: **permission vs scoping**. `where: { ownerId }`
  vs `where: { teamId }` look identical; the table comparing them is the bit to
  re-teach if anything from this lesson is shaky.
- Chose the non-destructive migration over deleting 5 junk rows *and said why*:
  the habit is the lesson, not the rows. Same move as "make the safe thing the
  default" — fourth family use.
- Homework 5 from lesson 9 (the `ownerId` in the store) was cashed in as the
  middle of this lesson. Planting a question one lesson ahead and paying it off
  is working; do it again.
- Two questions again, one of them a deliberate trap (private tasks — the
  pre-lesson answer is "the where clause"). Watch whether he falls in it.
- **Overdue:** `Project` has been "still open" for three lessons. It is now the
  only unwired thing. Force the decision next session, first thing.
- Gotcha to warn him about before his third test file: node:test runs test
  files **in parallel processes**. Two files that both key fixtures on
  `Date.now()` will delete each other's rows. Cost me 15 phantom 401s.

## Lesson 20 notes (2026-09-08)
- Streak intact: **no new dependency**, five lessons. No migration either.
- Length 10.8 KB, up from 19's 9.2 KB and well over the 5 KB target from record
  0020. **Ask him about length this session.** If he says long, the first cut is
  "The honest part" - but that section is the best thing in the lesson, so the
  real answer is probably to move "Measured, on your five rows" to the
  reference card instead.
- **The probe rewrote the lesson, for the third time in three lessons.** I had
  written "widen `sort` to z.string() and Postgres gets whatever was typed".
  Ran it: Prisma refuses the unknown `orderBy` key, no SQL is built. The true
  cost is a **500 that prints file paths and source comments**. Keep running
  the probe first - it has now caught me every single time.
- Teaching move that came out of that: **say the wall is not the one you
  thought.** The builder is a second wall he did not write; the enum's real job
  is the error reply and the day someone swaps in raw SQL. He is eight security
  lessons in and can take "this defence is not load-bearing here, and here is
  what is".
- Tenth "count what applies" table, and a new pairing: the two columns are
  **value vs identifier**. That word pair is the whole lesson; everything else
  hangs off it. Eighth word pair overall.
- **Silent failure is the through-line, three of them on one page** (parameter
  in ORDER BY, missing `querystring:` in the route schema, and a sort test whose
  orders agree). Named out loud each time. Same family as lesson 17's "strip is
  safe, reject is honest" - he now has three examples of *quiet* being the bug.
- Held "what this does NOT fix", ninth security lesson running. Lead row is the
  500 leak, which is also next lesson's opener - the "impossible to answer with
  today's code" homework, except this time it is a real hole rather than a
  question.
- Two quizzes, both two-option, both on the why. Quiz 2 had to be rewritten
  after the probe; the wrong version had the answer I originally believed.
- Break-it exercise verified before shipping (lesson 17's rule, still holding):
  `z.string().default("id")` fails **exactly four** tests, all `500 !== 400`,
  and the three sorting tests stay green. Told him to notice the green ones.
- Gotcha for me, cost the most time of anything today: I ran
  `cd server && python3 - <<PY`. The `cd` failed because I was already in
  `server`, `&&` short-circuited, the patch never applied - and `npm run
  typecheck` on the next line passed anyway, on unpatched files. **Never put
  `cd` in front of a patch script**, and assert every anchor matched.

## Lesson 11 notes (2026-09-02)
- Streak intact: **no new dependency**, eleven lessons. First time the reason
  was not weight — `@fastify/rate-limit`'s *default key* (`request.ip`) is the
  wrong key for a login. Better argument than "it is 40 KB", and he can check
  it himself in the docs. Use this shape again: reject a library on its
  default, not its size.
- Framing that carried it: **count the thing the attacker has only one of.**
  Fourth in the "count the nouns" family (lessons 9, 10, 11). It keeps working
  — keep reaching for a counting question when a rule feels vague.
- "Show the bad version first, then kill it with named reasons" used again,
  and it was the strongest slot yet, because the bad version is what the whole
  internet actually ships. Named attacks: credential stuffing, password
  spraying, lockout DoS.
- Fifth use of "one reply for two different noes" — this time the leak was in
  the **status code** (401 forever vs 429), not the message. Say the variation
  out loud rather than repeating the phrase flat.
- New reusable rule he now owns: **any store keyed on caller input is a store
  the caller can fill.** Introduced via the 10k-key cap on the Map. Reuse for
  sessions, invites, audit logs.
- First `ponytail:` comment pointed out to him as a *habit*, not a detail: a
  written-down shortcut is a decision, an unwritten one is a future bug.
- Ended the lesson with an honest "what this does NOT fix" table, plus OWASP's
  MFA ranking. He should not walk away thinking login is solved. Reuse this
  table shape for every security lesson in week 7-8.
- Question ratio held: one impossible-to-answer (where does the counter live
  after a restart) + one opinion sent to the community (CAPTCHA vs alert vs
  MFA ordering). Same as lessons 9 and 10. This is the settled shape.
- Homework 2 and 3 are "break it on purpose" tasks. New move, worth watching:
  make him delete `.toLowerCase()` and watch one test catch it. Cheaper than
  arguing that the test is valuable.
- He confirmed he wrote the `Project` code himself between sessions, so it got
  a 3-sentence recap box and no lesson. Watch for gaps there.

## Lesson 12 notes (2026-09-03)
- He asked me to **verify lesson 11 was fully implemented** before moving on.
  It was (66 tests, throttle.ts complete, wiring in the right order). I put
  that answer in a box at the top of lesson 12. Do that whenever he asks a
  check-up question — answer it in the lesson file, not only in chat.
- **Streak broken on purpose**, twelve lessons in: `@fastify/rate-limit`.
  Paired with lesson 11 as one idea: *reject a library on its defaults, take
  it when the problem has no decisions left.* He now has both halves. Expect
  him to quote this back; that is the goal.
- Third use of "the cheap check goes in front of the expensive work". Fastest
  frame in the workspace so far. Keep reaching for it.
- New teaching move that worked: **my own debugging became homework 3.** The
  hook-order bug (401 instead of 429) is reproducible by one line, so he
  reproduces it himself instead of taking my word that the test matters.
  Cheaper and stickier than prose. Reuse whenever a bug had a one-line cause.
- First test file with **no decision half** — "test what you decided, not
  what you installed". Say that again at any future plugin install.
- Warn him before his next test file: `npm test`'s `src/**/*.test.ts` runs in
  `sh`, where `**` is `*`. A test at `src/foo.test.ts` is silently skipped.
  Top-level test files do not run. Cost me 10 minutes.
- `buildApp()` is async now. If a future lesson's code sample forgets the
  `await`, the failure is a confusing one.
- Honest "what this does NOT fix" table used a second time. It is now the
  settled ending for every security lesson. Keep it.
- Question ratio held (one cliffhanger + one community question). The
  cliffhanger deliberately pays off lesson 11's unanswered one instead of
  opening a new thread — he owes me two answers now, that is the ceiling.

## Lesson 13 notes (2026-09-03)
- He asked to "move to lesson 13" with no topic, so I picked from PLAN week 7-8
  and took **CORS** over Helmet, because it is the one that bites him first in
  week 9-10 and he is a front-end dev — he has *seen* the error message.
- Second dependency ever (`@fastify/cors`), and it reused lesson 12's rule
  rather than re-arguing it. Two data points now make it a pattern he owns.
- "Show the bad version first" used again, strongest slot yet: `origin: true`
  is what he would have pasted, and it *works* when you test it. Named the
  attack step by step rather than calling it insecure.
- New pair of words he now owns: **same-origin vs same-site**. Same shape as
  lesson 10's permission-vs-scoping pair, which landed. Keep making pairs.
- The test that asserts a **200** for a denied origin is the lesson in one
  assertion. Point at it if he thinks CORS is a gate.
- Body-size limit now asked three times and still not done. Do not ask a fourth
  time in prose — open lesson 14 by doing it *with* him in 60 seconds.
- The Redis question is three lessons old. Told him to bring it even if short.
  Do not plant another long-lived one until it is paid.
- Question ratio held (one cliffhanger + one community question). The
  cliffhanger — subdomain vs same-origin path at deploy — is a real fork in
  weeks 9-12, so his answer changes the plan, not just his understanding.

## Lesson 14 notes (2026-09-04)
- He answered the lesson-13 cliffhanger with one third of it. Pattern worth
  watching: **he answers the part with a knob, skips the part with no knob.**
  "Which one does NOT change?" needs to be its own numbered question.
- So the lesson opened by *marking his answer in a table* (right / not said /
  not found) instead of just teaching the missing bit. New move, worth reusing
  whenever a homework answer comes back partial — it is retrieval feedback,
  and it costs three rows.
- Body-size limit is finally in `src/app.ts`. Asked three times. The fix per
  lesson 13's note — stop asking in prose, check the file and say so in a box —
  worked. Verify before asking, always.
- **No new dependency, no code change at all.** First pure-decision lesson.
  Fine after two heavy ones; do not do two in a row.
- New framing: **the best answer to a config question is to delete the config.**
  Same family as "make the safe thing the default" but aimed at architecture.
- Held the "what this does NOT fix" table (third security lesson running), and
  used it to say the *honest* thing: same-origin removes the preflight, which
  was helping. Do not sell a simplification as free.
- Question ratio held, but both are debts now: Redis (four lessons old, called
  due) + the CSRF walk-through. Do not plant a third thread until Redis lands.
- Next: lesson 15 = security headers / CSP. Lesson 13's table already promised
  it, and the CSRF cliffhanger lands right next to it.

## Lesson 15 notes (2026-09-04)
- He said "move to lesson 15" with no topic. Lesson 13's table and lesson 14's
  note both already promised headers/CSP, so no decision needed. Taking the
  promise from the previous lesson's own table is a clean way to pick.
- **Third dependency** (`@fastify/helmet@13.1.1`), and it completes a set: the
  three dependency rules now live in one table in the lesson AND in the
  reference doc. Reject on a bad default (11) / take when no decisions left
  (12, 13) / **take it and turn it down** (15). Expect him to quote the third
  one; it is the one that sounds like seniority.
- Framing that carried it: **a library can be right about the facts and wrong
  about your situation.** New, and it generalises past dependencies.
- The 13-row marking table is the fifth "count what applies" move (lessons 9,
  10, 11, 14, 15). Still working. Four yeses, two wrong values, seven no-ops —
  the numbers do the arguing.
- "Show the bad version first" used again: `app.register(helmet)` with no
  options. Strongest slot yet in one specific way — the bad version is not
  insecure, it is *irrelevant*, and that is a harder thing to see than a hole.
- **First genuinely hard-to-undo thing in the codebase: HSTS on localhost.**
  Said it plainly and up front, per his NOTES preference. Gave it its own
  section, a `NODE_ENV` gate, and a test that asserts the header is ABSENT.
  A test as a guard against a footgun is a new shape here; reuse it.
- Two hand-written things, not from a plugin: the `no-store` `onSend` hook and
  the 404 test. Both are the "no exceptions" argument — a rule with no
  exceptions belongs in the last hook, not in each route. Third relative of
  "make the safe thing the default".
- Held the "what this does NOT fix" table (fourth security lesson running) and
  used it for the honest thing again: the API CSP is the *easy* CSP. The front
  end needs its own, from nginx, in week 9-10. Now in PLAN.md.
- **Redis debt closed by answering it myself** — five lessons old, it was
  blocking, and answering cost four lines in a box. New rule for me: a question
  he has not answered in three lessons is not retrieval practice any more, it
  is a stall. Answer it and move it into PLAN.md as a task.
- Question ratio held: one carried cliffhanger (the CSRF walk-through, now the
  spine of lesson 16 — so his answer is load-bearing) plus one new one designed
  per lesson 14's note: **the new question has no knob in it.** "Does the API's
  CSP apply to your React page? Yes or no, and what decides it." He skips
  knobless parts, so it is now its own numbered question with a yes/no answer
  I can grade.
- Next: lesson 16 = CSRF. His homework 1 IS the lesson opening. If he skips it,
  open by marking a blank row — same table move as lesson 14.

## Lesson 16 notes (2026-09-04)
- He answered the lesson-14 cliffhanger with **one third of it again** — the
  concrete part (the preflight request lines, correct and in order) and not
  the two judgement parts. Second data point, so it is now a pattern, not a
  slip: **he answers the part with a knob and skips the part without one.**
  Told him so plainly in an aside, framed as "where your attention goes", not
  as a scolding. Keep splitting knobless parts into their own numbered
  question — and now also keep *naming the pattern to him*.
- The lesson-15 knobless question (CSP and the React page) came back **fully
  right, with the mechanism** — "CSP binds to a response and is enforced
  against the execution context created from it". So the fix from lesson 14's
  note works: make the knobless part its own numbered question with a yes/no
  I can grade. Do that every time.
- **Marking table used a second time** (right / not said / not said / right).
  Four rows, three columns. It is now the settled opening for any lesson that
  follows homework. Cheap and it is retrieval feedback.
- **Streak resumes: no new dependency**, after three lessons of installs.
  Rejected `@fastify/csrf-protection` on a NEW rule — **a library encodes the
  browser of the year it was written.** Fourth dependency rule, and the one
  that generalises furthest past this topic. The four now live in one table in
  the lesson and in the reference doc.
- Framing that carried it: **reading is CORS, writing is CSRF.** A word pair,
  same shape as permission/scoping (10) and same-origin/same-site (13). Both
  landed; keep making pairs.
- Best single beat in the lesson: change `fetch` to an auto-submitting HTML
  form and *every defence he named evaporates*. "Show the bad version first"
  inverted — show his own correct answer first, then move one variable.
- Sixth "count what applies" table (9, 10, 11, 14, 15, 16). Four attack shapes
  × what stops each. Three are held by something not chosen for the purpose,
  one is held by nothing. The rows do the arguing.
- Fourth use of "the cheap check goes in front of the expensive work" and
  sixth of "one reply for two different noes" — this time **inverted**: here
  the two noes must be different, 403 not 401. Saying the inversion out loud
  is what keeps a reused frame from going flat. Keep doing that.
- New move: **I disagreed with OWASP in writing and showed my reasoning**, in
  its own section, with the one-line switch to their position and a named test
  asserting our choice. Worth reusing whenever a cheat sheet's default is
  wrong for his clients — it teaches that a source is evidence, not orders.
- "What this does NOT fix" table, fifth security lesson running. Settled.
  Honest line this time: `SAFE_METHODS` trusts him forever about GET.
- Question ratio held: one cliffhanger (hook order — a forged write from a
  rate-limited IP gets 429, and what that leaks) + one community question.
  The cliffhanger is deliberately knobless AND labelled as such in the text,
  per the pattern above. Watch whether the label alone gets him to answer it.
- Gotcha that cost me a test: `POST /auth/logout` with no session answers
  **204**, not 401 — it is idempotent by design (`deleteMany`). Do not assume
  401 in any future test that pokes logout.

## Lesson 17 notes (2026-09-07)
- He said "Lession 17" with no topic and no homework answer. Picked **mass
  assignment** from PLAN week 7-8, because his `createTask` literally does
  `data: { ...input, teamId, ownerId }` — the vulnerability is a spread in his
  own file, so the lesson opens on his code, not on a definition.
- **Streak resumes: no new dependency**, two lessons running.
- The lesson-16 cliffhanger came back **blank**. Third data point on the
  pattern, and the labelling experiment failed: I marked the question as
  knobless in the text and he still skipped it. So I **answered it myself**
  (four lines) and cut this lesson to **ONE question**. New experiment: the
  problem may be list length, not knoblessness. Watch whether one question
  gets answered. If yes, one question is the new default.
- Seventh "count what applies" table (9, 10, 11, 14, 15, 16, 17) — and this
  time **inverted**, which is what kept it fresh: in lesson 16 the accidents
  were free *defences*, here the accidents are what make the hole *invisible*.
  Say the inversion out loud; that is what stops a reused frame going flat.
  One of four rows was a real decision.
- **Fifth word pair: strip vs reject.** Same shape as permission/scoping (10),
  same-origin/same-site (13), reading-CORS/writing-CSRF (16). All four landed.
  Keep making pairs — it is the single most reliable move in this workspace.
- Best sell in the lesson was **not** the security: it was that a silent strip
  makes the server lie to the front end about success. He is a front-end dev
  and hits this in week 9-10. Lead with the bug he will feel, not the CVE.
- Fifth use of "make the safe thing the default, the unsafe thing deliberate",
  this time about opt-in vs opt-out of a *validation mode*. Still generalising.
- **I got something wrong and fixed it in writing.** I wrote that strict params
  "would 400 every route", then measured it: 5 failures, all in the new test
  file. Rewrote the section to give the measured number and to say the
  `httpPart === "body"` check is a *scope choice*, not a rescue. Kept the
  break-it-on-purpose exercise but with the true expected output. **New rule
  for me: run the break-it exercise before writing its expected output.**
  Also worth reusing as a teaching move — showing a measured number that
  contradicts my own first guess is the strongest possible argument that a
  source is evidence, not orders (same family as lesson 16's OWASP disagreement).
- Second use of "an `as` cast is not a check". First time it got its own
  comment in the file naming the rule that keeps the promise. Reuse at every
  future cast — he has several (`as CreateTaskInput` and friends).
- "What this does NOT fix" table, sixth security lesson running. Settled.
  Honest row this time: strict checks whether you NAMED a key, never whether
  naming it was wise. That row is also the lesson's one homework question.
- The one question is deliberately the `can()` question asked backwards
  (`AddMember` names `role`, so what refuses `{"role":"OWNER"}`?). It is
  retrieval practice on lesson 9, spaced five lessons out.
- Week 7-8 remaining after this: SQL injection (why Prisma helps), timing
  attacks, the audit log table. Then week 9-10 front end.

## Lesson 18 notes (2026-09-07)
- He said "move to lession 18" with no topic and no homework answer, again.
  Picked **user enumeration** from PLAN week 7-8 over SQL injection, because
  the leak is in a route he wrote and never revisited, and because the audit
  framing turns it into retrieval practice over lessons 6, 11, 12, 16 and 17.
- **The one-question experiment failed too.** Lesson 17 cut the list to exactly
  one question and it still came back blank. So length was never the problem,
  and neither was knoblessness. **Dropping end-of-lesson questions entirely.**
  New shape: homework is a *command with an expected output* — the terminal
  marks it and I only get involved when his number disagrees with mine. This is
  what actually got done in lessons 11 and 12. Told him so plainly in the aside.
  Community question stays (it is not homework, and it costs him nothing to skip).
- Best structural idea in the workspace so far, and it should recur: **audit an
  old route against the rules he has already written.** The table wrote itself,
  and the finding was better than anything I planned — the two rules `register`
  obeyed are exactly the two that live in an app-level hook, and the two it
  skipped are the two that live in a handler. That is "a rule with no exceptions
  does not belong in each caller" *proved* rather than asserted, on a route
  nobody was thinking about. **Re-run this audit move every 6-8 lessons.**
- Eighth "count what applies" table (9, 10, 11, 14, 15, 16, 17, 18), and the
  freshening this time is that the table grades *his code against his own
  rules* rather than a library or an attack surface. Still the most reliable
  move here.
- **Sixth word pair: hide it or charge for it.** Same shape as
  permission/scoping (10), same-origin/same-site (13), CORS-reading/CSRF-writing
  (16), strip/reject (17). All landed. Keep making pairs.
- Second use of "I found a bug while measuring for the lesson" (first was
  lesson 17's strict-params correction). This one is bigger: `Mixed@e.com` and
  `mixed@e.com` were two rows. Both times the measurement beat my plan. **Run
  the probe script before deciding what the lesson is about, not after.**
- The sharpest beat: lesson 11's test `case does not open a side door` was
  **green while the bug was live**, because the throttle key was normalised and
  the lookup was not. "Half a normalisation is worse than none — with none you
  find it the first time you type a capital letter; with half, a passing test
  tells you not to look." Reuse whenever a test gives false comfort.
- **A frame inverted for the first time, deliberately:** lesson 12's "cheap
  check goes in front of the expensive work" is *wrong* on register — checking
  the email before hashing opens a timing oracle, so the wasted hash is
  load-bearing. Made it the first quiz. Showing a rule of mine failing is the
  same family as disagreeing with OWASP (16) and contradicting my own guess with
  a measurement (17). It teaches that a rule has a domain.
- Two quizzes, no free-text questions. First lesson with quiz widgets doing the
  retrieval work end to end. Watch whether he clicks them (I cannot tell) — if
  the commands come back done and the quizzes are invisible to me either way,
  that is fine, the commands are the graded part.
- Zod gotcha worth its own line, and I walked into it: chains run left to right,
  so `z.email().trim()` validates the untrimmed string and 400s a pasted
  address. `.pipe()` is how you normalise *then* validate. Now in the reference.
- **New rule for me on testing:** assert both timing paths are SLOW, never that
  they are close. A flaky security test gets deleted, and then there is no test.
  Said it in the lesson, put it in the reference.
- Migration that is *designed to fail* on duplicates (data-only, lets the
  `@unique` roll it back) — the third relative of "make the safe thing the
  default". Deleted my own four probe rows by hand first and said so in the
  lesson; his DB was otherwise clean.
- "What this does NOT fix" table, seventh security lesson running. Settled.
  Honest rows: enumeration is *not* closed, and Unicode look-alikes are out of
  scope on purpose.
- Week 7-8 remaining after this: SQL injection (why Prisma helps), the audit
  log table. Then week 9-10 front end. IDOR is effectively covered (lesson 10
  scopes by team; lesson 9's gate loads the target).

## Full rewrite of lessons 1-18 (2026-09-07)
- He said: "I am finding difficult to understand the concepts", for **all of
  it, from lesson 1**. Wanted **shorter + more pictures**. Both the ideas and
  the code were slipping. See record 0020.
- **The old lessons were too long.** 17 KB average, ~20 minutes of reading.
  Not wrong, just more than working memory holds. New ones are ~5 KB.
- **New lesson shape, use it from now on:** tldr (3-4 bullets) -> ONE diagram
  high up -> short prose with `.word` glosses -> minimum code, often as a
  `.vs` bad/good pair -> one `.takeaway` -> one 2-option quiz -> three "do
  this" commands. Nothing else.
- The diagram goes **before** the prose. It is the explanation, not decoration.
- Originals are in `lessons/long/`, linked from every short lesson as "the long
  version". He can still get the detail; he just is not made to read it.
- Two new navigation pieces: `lessons/index.html` (course map, one rule per
  lesson) and `reference/the-whole-arc.html` (every rule, word, trap and open
  thread on one printable page). **The arc page gets a new row every lesson
  from now on.**
- New shared CSS components: `.vs`, `.word`, `.ask`. Reuse, do not re-inline.
- Kept on purpose while cutting: the citations and the "what this does NOT fix"
  sections. Short and untrustworthy would be worse than long.
- **Read-back check to run in a week:** can he say lesson 9, 10 and 13's
  takeaway sentences unprompted? Those three were the densest before.
- Did not run the `show-me` skill for these. These rewrites *are* the visual
  pass, and 14-18 already have show-me sketches, now linked from the short
  lessons.

## Lesson 19 notes (2026-09-08)
- He said "move to lession 19, I have completed lesson 18" — no topic, no
  homework answer. Fourth session in a row with no answer, which is now
  expected and fine: lesson 18 already dropped end-of-lesson questions in
  favour of **commands with an expected output**. Held to that here. Three
  numbered commands, one of them break-it-on-purpose.
- Picked **the audit log** over SQL injection, the only two things left in
  week 7-8, because (a) lesson 18's own record promised the `429`s would
  "land in the logs" and nothing wrote them, so the lesson pays a debt rather
  than opening a topic, and (b) there is **no `$queryRaw` anywhere in the
  codebase**, so SQLi is pure knowledge with nothing to build. Save it for
  last; it will be a short, honest, code-free lesson.
- **No new dependency, four lessons running.** Prisma + Postgres JSON + one
  hook. Worth saying to him: the last four lessons of *security* work needed
  nothing installed.
- **The strongest beat, and it should recur:** lesson 18's finding ("the rules
  register obeyed were the ones living in an app-level hook") was used as a
  *design input* instead of being rediscovered. And here it is stronger than
  "you will forget" — a handler **cannot** write the 403 row, because the gate
  replied and the handler never ran. A rule I asserted in lesson 18 became
  physically true in lesson 19. Look for more of these: an old rule that turns
  out to have a hard version.
- **Seventh word pair: request log vs audit log.** Pairs remain the single most
  reliable move in this workspace (10 permission/scoping, 13 same-origin/
  same-site, 16 CORS/CSRF, 17 strip/reject, 18 hide/charge). Keep making them.
- Ninth "count what applies" table (9, 10, 11, 14, 15, 16, 17, 18, 19), and the
  freshening this time is that the two columns are two *things he already has*
  — `logger: true` vs a table — rather than an attack surface. The row that
  does the arguing is "knows who: no, the line is written before auth resolves".
- Third use of lesson 11's **"a store keyed on caller input is a store the
  caller can fill."** Two applications in one lesson: writes-and-refusals only
  (not every GET), and the route pattern instead of `request.url`. When a rule
  applies twice inside one lesson, say so out loud — that is what makes it feel
  like a rule rather than a fact about one file.
- **The schema beat to reuse: the exception that proves the pattern.** Every
  model cascades from `User`; `AuditLog` must not, or deleting an account
  deletes the evidence against it. He has written `onDelete: Cascade` five
  times now, so the one place it is wrong lands hard. Same family as "make the
  safe thing the default" — here the safe default is the wrong default.
- Two quizzes again, both two-option, both on the "why", never the syntax.
- Held "what this does NOT fix", eighth security lesson running. Honest lead
  row: **nobody reads it.** A log with no alert is archaeology. Do not let him
  leave thinking auditing is done.
- Gotcha that cost me a flaky test: `app.inject()` resolves **before**
  `onResponse` finishes. Poll for the row (`waitForRow`), never `sleep`. Told
  him the polling is itself the proof the caller does not wait — a test detail
  that teaches the mechanism.
- Second gotcha, and it showed up in the measured output rather than in my
  plan: `request.params` holds **raw strings** until zod coerces them, so the
  401 row records `{"teamId":"249"}` and the 403 row `{"teamId":999999}`.
  Third time now that running the probe beat planning the lesson. **Keep
  running the probe first.**
- Ran the break-it exercise before writing its expected output (lesson 17's
  rule for me). Exactly one test fails. Verified.
- **Length: 9.2 KB, against the 5 KB target from record 0020.** Deliberate and
  worth watching. It carries two tables, three code blocks, the measured output
  and two quizzes, and nothing in it is prose padding — but if he says it is
  long again, the first cut is the "two details that are the whole craft"
  section (move it to a reference card).
- New source directory: `src/audit/`, and `server/CLAUDE.md` now documents it,
  the `AuditLog` no-relation rule and `npm run log`.
- **`npm run log`** is new: last 20 audit rows, reading the URL out of `.env`.
  Added because the raw `psql tasks -c '...'` I first wrote prompts for a
  password. Rule for me: run the homework command myself before shipping it,
  the same way I now run the break-it exercise.


## Lesson 22 notes (2026-09-09)
- He said "move to the lession 22" — no topic, no homework answer. Fifth
  session running. Expected now; commands-with-expected-output stays the
  format instead of end-of-lesson questions.
- **Split the plan's week 9-10 bullet into three lessons.** It said "login
  page, token refresh on 401, role-based UI hiding" — that is three lessons,
  and one of the three turned out not to exist (see below). Rule for me: a
  plan bullet with three commas is three lessons.
- **Killed a plan item on the evidence.** "Token refresh on 401" cannot be
  built: sessions slide server-side (record 0007). Saying so out loud is a
  better beat than teaching it — "a good server decision shows up later as
  front-end code you never write." Look for more of these; the plan was
  written in week 1 by someone who assumed JWTs.
- **No framework, deliberately, and told him why:** he is strong in React, so
  React would be the part he already knows and the auth would hide behind it.
  One static HTML file. He did not push back on plain JS in lesson 20 either.
- **Zero server changes.** First lesson since 11 that added no wall. The page
  worked because eight lessons of walls were already configured for a dev
  front end on :5173. Worth saying to him: the setup he wrote blind, months
  before any page existed, was right.
- **Drove real headless Chrome over raw CDP (~30 lines, no dependency —
  Chrome is installed and node has a global WebSocket).** This is the fourth
  time running the probe beat planning the lesson, and this time curl was NOT
  enough: curl does not enforce SameSite and has no `document.cookie`. The
  three best lines in the lesson only exist because of the browser.
  **Keep this technique for every front-end lesson.**
- The single strongest line: `fetch` without `credentials:include` -> 401,
  with -> 200. Same URL, same tab, same user. One option is the difference
  between logged in and logged out.
- **Eighth word pair: a fact you hold vs a question you ask.** Pairs are still
  the most reliable move here (10, 13, 16, 17, 18, 19, 22).
- Lesson 13's same-site/same-origin pair became *visible* rather than tabular
  — two ports, one site, and both rules true at once about the same URLs. Same
  family as lesson 19's beat: an old rule getting a hard, physical version.
- **`/auth/me` had no test after sixteen lessons of the design depending on
  it.** Invisible because nothing called it. Rule worth reusing: the route a
  client depends on most is the one no server test thinks to cover.
- **Length: 10.7 KB, up from 9.2.** Second lesson over target and it is now a
  trend, not a blip. Trimmed once already (cut a `.vs` rehash of lesson 13 and
  two wordy paragraphs). If he says a word about length, the next cut is the
  measured-output section into the show-me page, which is where it belongs.
- Ran the show-me skill per workspace CLAUDE.md: `show-me-0022-three-states.html`.
  Three panes, the two-lens port picture, and one cookie in two devtools views.
- Verified the break-it-on-purpose exercise in the browser before shipping it
  (removing `credentials` logs you out while the cookie stays in the jar), and
  ran `npm run web` myself before writing it down.

### Lesson 22, part two — the React conversion (2026-09-09, same session)
- Straight after 22 shipped he said: make `web/` React + shadcn + Tailwind +
  React Query + axios, and follow Vercel's react-best-practices skill.
  **Built it, did not re-argue.** Record 0024's "no framework" reasoning was
  about teaching order, and he overrode it — that is his call to make.
- **Rule for me: when he overrides a pedagogical choice, the lesson file has
  to be rewritten the same session.** A lesson describing a file that no
  longer exists is worse than a long lesson. Rewrote the code section, the
  "Do this" commands and the break-it exercise.
- **The find worth more than the whole conversion: `staleTime`.** With React
  Query's 30s default, a session deleted in Postgres left the tab rendering a
  signed-in UI for half a minute. Measured it, fixed it with `staleTime: 0`,
  and it became a third quiz. **Adding a library added a security-relevant
  knob that did not exist in the vanilla version.** That is a genuinely new
  idea for him and it generalises: every cache in front of an auth check is a
  window where the check is stale.
- **New break-it exercise, and it is the best one yet:** delete every Session
  row with psql, then click away and back. The login form appears by itself.
  Server-side revocation, visible, with no reload. Only possible because of
  React Query. Verified in headless Chrome.
- **The Vercel skill is now installed project-level**, at his request:
  `.claude/skills/vercel-react-best-practices/` (412 KB, 72 rules, `--copy`
  not symlinked) plus `skills-lock.json` pinning the source hash. Installed
  with `npx skills@latest add vercel-labs/agent-skills -s
  vercel-react-best-practices -a claude-code -y --copy`. Two gotchas: the
  agent name is `claude-code` (`claude` is rejected), and the skill's own
  name is `vercel-react-best-practices`, not the repo's directory name
  `react-best-practices`. **Use it for every front-end lesson from here.**
- Vercel skill: 72 rules, mostly Next/RSC. Six applied. The one with teeth was
  `bundle-barrel-imports` — **uninstalled lucide-react, 44 MB with zero
  imports**, node_modules 233 MB -> 189 MB. He has a resource-tight laptop
  (see tooling preferences), so tell him that number.
- Also worth telling him: **the app has no `useEffect` in it at all.** For
  someone coming from React-with-useEffect-everywhere that is the headline.
- **My own probe lied once.** Focus revalidation looked broken; the cause was
  `new Event("visibilitychange")` not bubbling to the `window` listener React
  Query uses. I nearly "fixed" working code. Rule: when a headless probe
  disagrees with the design, suspect the probe's synthetic events first.
- Verified the interceptor by temporarily wiring a real protected endpoint,
  then reverting — rather than shipping a comment claiming it works. Same
  instinct as running the break-it exercise before writing its output.
- **Length: 13.5 KB now, up from 10.7.** Third lesson over target and the
  trend is real. It grew for an honest reason (it carries a real
  implementation), but the next lesson starts by cutting. First candidate is
  moving both "measured" blocks into the show-me page.
- Did NOT re-run the show-me skill; the sketch is about the three states and
  the two ports, and both survived the rewrite untouched.

### Lesson 23 — role-aware UI (2026-09-09)
- He asked in three words ("Move lession 23"), which meant "move on to the next
  lesson". No mission talk needed — the plan and record 0024/0025's "Open"
  sections named the next lesson already. **When the plan says what is next,
  build it; do not re-ask.**
- The lesson's own idea, and it is the one to reuse: **send the answer, never
  the policy.** `GET /teams` carries `can: Action[]` straight from the server's
  `PERMISSIONS` table, so React holds labels and no rules. He writes front ends
  for a living, so he has almost certainly shipped the duplicated-table version.
- **The `staleTime` contrast landed better than the "users can edit your JS"
  cliché.** `["teams"]` may cache 30 s *because* `can` only draws buttons;
  `["session"]` may not. It reframes the whole lesson as "what is this value
  allowed to decide", which is a question, not a scolding.
- Shipped a safe-by-construction probe button ("Ask the server anyway") into the
  actual product: it invites you to a team you are already in, so the only
  answers are 403 and 409. **A demo that cannot do damage does not need a
  warning label.** Worth reusing whenever a lesson wants to show a refusal.
- **The probe lied again, same class as last time.** A stale headless Chrome
  still owned port 9333, so I got the old browser and its signed-in cookie on
  a profile I had just deleted. New habit: `pkill -f remote-debugging-port` in
  the probe script before spawning.
- Verified the break-it exercise for real (deleted the filter line, re-ran the
  probe, reverted) rather than reasoning about it. Fourth lesson running.
- **Length: 12.5 KB, down from 13.5.** First fall in four lessons, achieved the
  way NOTES said it would be — the measured output moved to the show-me page.
  Still over the ~9 KB target. The honest fix is a narrower lesson, not tighter
  sentences; the next one (tasks on screen) is a good candidate to split.
- Ran the show-me skill per workspace CLAUDE.md: `show-me-0023-hint-vs-gate.html`
  — the two team rows with the un-hidden variant, and one table forking into
  "ends in pixels" / "ends in a status code".

### Lesson 24 — tasks on screen, 403 vs 404 (2026-09-10)
- **NEW STANDING RULE, his words: "write the code in the lesson, do not write
  code in the app."** He reads the lesson, understands it, then types or pastes
  it himself. Applies from lesson 24 onwards. So: no more edits under `web/`
  (or `server/`, presumably) unless he asks for them by name. Lessons now carry
  complete files, not excerpts.
- Consequence I have to live with: **I cannot verify the front end by running
  it any more.** Compensate by measuring the *server* harder — lesson 24 is
  built entirely on a curl table from the live API, which is verifiable without
  touching his app. First front-end lesson in three with no headless Chrome,
  and that was the right call because there was no page to drive.
- Cleaned up after measuring: registered a throwaway user, seeded memberships,
  ran the requests, then deleted the user, memberships, sessions, audit rows
  and tasks. **Leave his dev DB as I found it** — his data is the app.
- The lesson's idea is the **order** of the two refusals, not a status-code
  table. `preHandler` first, handler second, therefore 403 always wins and a
  404 is proof you passed the gate. That reframing is what makes "the 404 must
  stay vague" obvious instead of a rule to memorise.
- **Ambiguity as a feature**: two pairs of URLs answer identically, one pair
  blocking task-id enumeration, the other team-id enumeration. Lesson 18's
  idea in a second shape — the third time an old rule has landed harder as a
  physical demo than it did as a rule (see 13, 19).
- The front-end half is one line: `["teams", teamId, "tasks"]`. The break-it
  exercise (`["tasks"]`) is the best in a while because **nothing is refused,
  since nothing is asked** — the Network tab shows no request. He writes front
  ends for a living and has certainly shipped an unscoped key.
- New failure mode for him and worth reusing: **the leak in the UI copy.** A
  helpful error line ("that task belongs to another team") undoes the 404 the
  server was careful about. Security in a `<p>` tag.
- **Length: 13.1 KB, the largest yet, and the target is retired.** With whole
  files in the lesson the old ~9 KB number is meaningless. New target: prose
  under ~6 KB, code complete and copy-pasteable. Measure the prose, not the file.
- Ran the show-me skill per workspace CLAUDE.md: `show-me-0024-403-vs-404.html`
  — the two-check pipeline, the five URLs with the two shaded identical pairs,
  and the two cache buckets side by side.
- Reference card `rbac-permissions.html` gained a 403-vs-404 section. That card
  is becoming the spine of the whole RBAC arc (lessons 7-10, 23, 24).

### Lesson 25 — the first write from the page (2026-09-10)
- **The spine came from the measurement, not the plan.** The plan said
  "`setQueryData`, not invalidate". Sending the same PATCH twice and getting the
  same 200 twice gave a better idea: **send the value, not the verb**. Cache
  mechanics are React trivia; idempotence outlives the framework. Keep looking
  for the rule inside the measurement.
- Second lesson running with **no code written into `web/`** (his rule from 24)
  and no headless Chrome. The React is reviewed, not executed. Named the one
  line I am least sure of in the record (`setDone.variables.id`) with its fix,
  so if `tsc` complains the answer is already written down.
- **Old walls make cheap new content.** Three 400s (`{}`, wrong type, extra key)
  and the 403/404 pair all re-appear on the write path for free. Showing an old
  defence still standing costs one table and teaches spacing — this is retrieval
  practice disguised as a measurement.
- **The break-it exercise is the whole lesson this time**: put `useState` back
  under the checkbox and the screen keeps a tick the server refused. The bug is
  not fixed, it is *never written*. Best framing since "hint vs gate".
- First **front-end reference card**: `reference/react-query-rules.html`,
  covering 22–25. The RBAC card is the server spine; this is the client one.
  Four lessons of front end was the right moment — sooner would have been guessing.
- Length 14.1 KB, prose ~5 KB (target was under 6). The format is stable now:
  short prose, complete files, one measured table.
- Ran the show-me skill per workspace CLAUDE.md: `show-me-0025-value-not-verb.html`
  — value vs verb sent twice, the write with 0 follow-up requests, and the two
  places `checked` can live when the server says no.

### Lesson 26 — the request you cannot repeat (2026-09-10)
- **He implemented lesson 25 himself, but not verbatim**: he used the shadcn
  `Checkbox` where the lesson showed a plain `<input>`, and kept the reasoning
  comments. So the "type it yourself" format is working — he reads the argument
  and then makes his own call. Write lessons to be *argued with*, not copied.
- The lesson is a **deliberate pair** with 25: value/idempotent, then
  create/not-idempotent. Teaching the counter-example one lesson later is much
  stronger than covering both at once, and it is spacing for free.
- **Probing found a real bug** (`min(1)` accepts `"   "`). Handed to him as an
  exercise with the exact fix and the reason it also repairs the PATCH. Better
  than fixing it myself — he owns the code now, and this is the first exercise
  in a while that changes `server/` and moves the test count.
- Third lesson with no headless Chrome and no code written into `web/`. The
  compensation is still the same: measure the server hard. Two `GET`s with
  different `sort` values carried the whole cache argument.
- **Break-it exercises are now the best part of these lessons.** This one has
  two: remove the `disabled` and double-click on Slow 3G, and switch to
  `sort=title` and watch the append lie. Keep writing them.
- Prose ~5.5 KB, file 17.2 KB. Format stable.
- Ran the show-me skill per workspace CLAUDE.md:
  `show-me-0026-the-request-you-cannot-repeat.html`.
- Week 11-12 (Docker) is next. **Have the memory numbers ready before proposing
  anything** — `ps -Ao rss,command` on Docker Desktop is the first thing he will
  ask about, and the honest answer may be Colima or a plain Fly deploy with no
  local daemon at all.

## Lesson 27 notes (2026-09-10)
- He said "move to lesson 27" with no topic. Picked from PLAN week 11-12, same
  as lesson 13.
- **Rejected Docker for lesson 27 and said why in the record**: `docker` is not
  installed, Docker Desktop is a Linux VM on a Mac, and — the deciding reason —
  I cannot *measure* a Dockerfile I cannot build. Every strong lesson here was
  rewritten by its probe. Took the deploy step I could run instead.
- **Ask him the Docker question at the start of lesson 28.** Two options plus a
  recommendation, per NOTES: (a) OrbStack — much lighter than Docker Desktop on
  a Mac, (b) no local Docker at all, let Fly build the image remotely. Recommend
  (b) first: zero MB on this laptop, and the Dockerfile is still his to write.
- Streak intact: **no new dependency, twelve lessons.** zod and
  `process.loadEnvFile()` were both already there.
- Fifth "count the places" (9, 10, 11, 20, 27) — and the first time he is asked
  to run the grep himself before trusting my table. Keep that variation.
- New word pair he now owns: **fail fast vs fail quiet**. Ninth pair. The test
  it gives is the reusable bit: *how long does being wrong stay invisible?*
- The probe caught me a fourth lesson running. I expected `ALLOWED_ORIGINS` to
  be the headline; it is `NODE_ENV=Production`, which drops two walls at once.
  **Keep running the probe before writing a single claim.**
- I temporarily wired `config.ts` into his `server/` to prove 141 tests still
  pass, then restored every file from backup and re-ran the suite. Do this
  whenever a lesson asks him to touch four files — "expect 141 passing" is a
  much better instruction than "this should still work".
- Watch for: he must add three lines to `server/.env` or `npm test` will not
  start. If he reports a broken test run next session, that is the first thing
  to check.
- `server/CLAUDE.md` now contradicts the lesson ("everything has a working
  default"). Made it exercise 7 rather than fixing it — the docs are his too.

## Lesson 28 notes (2026-09-10)
- **He answered a question for the first time.** Offered four options for the
  Docker fork (record 0030 left it to him) and he picked "postpone deploy,
  finish the UI". So the 2-options-plus-recommendation format *does* work when
  the question is about **what to do next**, not about the content of a lesson.
  End-of-lesson comprehension questions still come back blank; a fork in the
  road does not. **Keep asking about direction, keep not asking about content.**
- Streak intact: **no new dependency, thirteen lessons running.** `Trash2` came
  from `lucide-react`, already installed.
- **The TypeScript type system was the trap, and that is new.** Every previous
  gotcha was a runtime one. `api.delete<Task>(url)` compiles clean and `.data`
  is `""`. Framing that landed: *a type parameter is a claim you made, not a
  fact the compiler checked.* He is strong in TS, so this is the right level of
  surprise for him specifically — reuse this shape.
- **A word he thought he owned turned out to be wrong.** He has had
  "idempotent" since lesson 25. Measuring `DELETE` twice (204 then 404) shows
  the definition is about *state*, not the answer. **Re-measure a word he
  already has, every 6-8 lessons.** Same family as inverting my own rule in
  lesson 18 and contradicting my guess in 17.
- Best two-line diff in the course: lesson 23's decorative `disabled` "Delete
  task" button gets deleted, and the same `can` check reappears on the row it
  actually guards. **Plant dead placeholders on purpose** — one of them paid off
  five lessons later and taught "the check moves closer to what it guards"
  better than any prose.
- The three-writes table (PATCH/POST/DELETE × first send / second send / world
  after / cache move) is the keeper. Ninth "count what applies" table, and the
  first where every row is **his own code**.
- **Sixth lesson running where the probe wrote the headline.** I expected the
  lesson to be about `filter`. It is about `data: ""` — falsy, indexable, not
  `undefined`, so it fails late and quietly. Probe first, decide second. Settled
  practice now; stop noting it.
- Two deliberate omissions, both argued in the lesson rather than skipped
  silently: no confirm dialog, no optimistic delete. Saying *why not* is doing
  the same work as saying why.
- Accessibility got a line of real content, not a nod: an icon-only destructive
  button needs the row in its `aria-label`.
- Tidied `lessons/index.html` while in it — 11 through 27 were all filed under
  "Week 7-8 · API security". Now three headings. The course map is the one page
  he actually revisits, so it earns the maintenance.
- **Lesson 27 is half-finished and I told him once, plainly, at the top.**
  `??` fallbacks back in `app.ts`/`server.ts`, `process.env` still in `db.ts`
  and `session.ts`, no `.env.example`. Third mention would be nagging — at
  lesson 29, do it with him instead.
- **No front-end test, third lesson running.** Named in the lesson's own gaps
  table now, which is the strongest way I have to keep it visible.

## Lesson 29 notes (2026-09-10)
- **He answered a direction question again, and gave a fifth answer.** I offered
  four Docker options plus "finish lesson 27 first"; he said *"skip Docker I
  want to implement this at the end"*. That is a better answer than any I
  listed. Two sessions running now. **Record 0031's rule is confirmed: ask
  about direction, never about content.** And leave room for an answer that is
  not on the list — he uses it.
- Docker/deploy is now week 15-16. Do not re-ask. It was a decision, not a
  postponement. The container-tool choice stays open for when we get there.
- **The probe found a security bug in code I had already read twice.**
  `session.ts:79` reads `process.env.NODE_ENV` while `sessionCookie()` thirteen
  lines above reads `config.NODE_ENV`. I went in expecting the lesson to be
  about the dead `??` fallbacks. Seventh lesson running.
- **I told him the bug is not live, and that was the right call.** Nothing
  mutates `process.env`, so the flags agree today. Overstating it would have
  been easier and worse. The honest framing turned out to be the *better*
  lesson: the code is correct because of a fact nobody wrote down. One quiz
  answer is literally "No, but only because nothing mutates it".
- New word pair, tenth: **snapshot vs live read**. The reusable test: *can
  these two readers ever disagree inside one process?*
- **New keeper idea: "dead code has no failing state."** Six leftovers, `tsc`
  clean, 141 tests pass with and without them. This is why an unfinished
  refactor is different from a bug — no green light will ever turn red. Workflow
  that follows: find by grep, lock down with a test. Reuse this shape.
- **He watches a test fail before fixing.** Exercise 3 is ordered that way on
  purpose (`# fail 1`, then the one-word swap, then 142). First time in the
  course he sees both states of a regression test. Do this every time from now
  on — a test he has never seen fail teaches nothing.
- **His own `CLAUDE.md` already forbade all six leftovers.** Turned that into a
  section rather than quietly fixing it: a written rule is not enforcement.
  Same move as lesson 27's exercise 7. He owns his docs.
- Distinguished "every `??`" from "a second default" explicitly, because
  `app.ts:174`/`:189` are legitimate and I did not want him deleting them.
  Naming what NOT to change is doing the same work as naming what to change.
- **Three of my own commands were wrong until I ran them.** "Six hits" was
  nine, `grep -o "^[A-Z_]*"` fills the diff with blanks, `config.ts` is 49
  lines not 48. **Run every command in the "Do this" list before shipping,
  not just the ones that produce lesson content.** New standing practice.
- Streak intact: **no new dependency, fourteen lessons.** Pointed him at
  `envalid`/`t3-env` in the community link and asked him to decide whether the
  streak is still a judgement or has become a habit.
- Lesson is 23.6 KB, up from ~17.8. Six edits + a test + a new file is more
  surface than lesson 28. Acceptable, but this is the ceiling — split next time.
- Trim fix asked a **third** time (exercise 7), now with "if you would rather I
  did this one with you, say so". A fourth plain ask would be nagging.
- Three lessons in a row now carry unfinished work into the next session. Check
  `npm test` = 142 and `.env.example` first thing next time.

## Lesson 30 notes (2026-09-10)
- He asked for lesson 30 **and** a full check of everything so far. Do the
  check first and report it as a table before teaching. Everything was green:
  142 tests, clean `tsc`, clean lint, `/health` 200, web builds.
- **Lesson 29's homework came back finished.** First time in three
  carry-over sessions. Say so out loud - he acted on the exercise list.
- Streak: **no new dependency, thirty lessons.** Pagination is `take`,
  `cursor` and `skip`, all already in Prisma. No `prisma-paginate`, no nothing.
- The probe wrote the headline again (eighth time): I expected "add a limit",
  the query log found `include: { owner: true }` selecting `passwordHash` for
  a relation the response schema throws away. **Always run the query log
  before writing a lesson about a query.**
- Framing that landed: **the response schema is the last wall, not the first.**
  Generalises to logging, to error messages, to anything downstream of a query.
- Was honest that this is 1+1, not N+1, and gave the real N+1 shape separately.
  Same call as lesson 29's "the bug is not live". He is well served by exact
  claims; do not inflate a finding to make it sound scarier.
- Ended the index section with **"do not add the index"**. Measured 32x for a
  sort nothing in his app uses, and *slower* for the sort it does use. This is
  the ponytail lesson in database form and it fits his laptop-is-tight instinct.
- Two exercises now ask him to break something on purpose and watch a test
  fail (delete `skip: 1`; run EXPLAIN on five rows and see a Seq Scan). Second
  lesson running with this shape. It is landing - keep it.
- Found the whole-arc reference eight lessons stale. **Check it every lesson.**
- The trim fix is at four asks. Next session, just do it with him.

## Lesson 32 notes (2026-09-10)
- **Check the specific line, not "did he apply the lesson".** He applied lesson
  31 but invented a third option in `useCreateTask` — `isLast ? [...items,
  task] : items` — which looks careful (it even has a comment about N
  duplicates) and is wrong for the reason the lesson gave. Plausible near-misses
  are what he produces when a lesson explains *why* and he re-derives the fix.
- "just write the tests for me" after I spec'd three server tests. Load signal,
  not laziness — he had typed four edits the session before. Right response:
  write them, and reserve his typing for the one part that is the actual skill.
  Do this again when he has just done a big typing session.
- **Third session running where the probe rewrote the lesson.** Planned "first
  front-end test, Vitest is the decision"; one `node --test` command turned it
  into "you cannot import your own function". Keep probing before writing. It
  has now beaten my plan three times in a row.
- Streak intact: **no new dependency, 32 lessons.** First time the rejection
  also taught something — Vitest would have made `@/` work and hidden the fact
  that the helper was welded to a file full of network code. Said the flip
  condition out loud (first component test) so it does not become dogma.
- Best moment in the lesson was not planned: the fourth candidate test failed
  and the code was right. Structural sharing. Used it as the argument for
  testing rather than any "tests are good practice" line. **Look for this shape
  again — a test that corrects the previous lesson is worth more than a test
  that confirms it.**
- Warned him about the trap: asserting object identity after an identity edit
  fails against correct code. First test suites lie in exactly this way.
- Trim fix (`.trim().min(1)`) is at **five** asks. I told him in writing I will
  just do it next session unless he says no. Do it, do not ask again.

## Lesson 33 notes (2026-09-10)
- Streak intact: **no new dependency**, 33 lessons. `z.stringbool()` and
  `setQueriesData` were both already installed.
- **Fourth session running where a probe replaced my planned framing.** The
  pattern is now reliable enough to plan around: write the probe *before*
  the lesson outline, not after. It has never once confirmed what I expected.
- What lands hardest with him: **a bug with no error message.** Lesson 29 was
  dead code, lesson 32 was a clean `tsc` with a runtime throw, this one is a
  click that sends nothing. Three for three. Keep hunting for this shape.
- The split from lesson 32 worked and I repeated it: I apply the mechanical
  parts, he types the deliberate breakage and the one test that pins the rule
  down. His pre-flight check was clean for the first time in three sessions.
- Naming a distinction is what makes it stick: **contents vs membership**,
  **coercion vs parsing**, **key prefix vs whole key**. Six word pairs in two
  lessons is probably the ceiling; do not add more until he uses one unprompted.
- He is one measurement away from wanting Vitest (the filter bar is three
  buttons and a form, pure behaviour). Let him ask rather than proposing it.
- Do not ask about `pg_trgm`. I asked for his opinion once, in writing. If he
  does not answer, drop it — it is a genuine "no" for this app's size.

## Lesson 34 notes (2026-09-11)
- Streak intact: **no new dependency, 34 lessons.** pino is inside Fastify and
  Fastify forwards `redact` and `stream` through its `logger` option, so the
  fix needed zero imports. Reaching for `import pino` would have worked and
  quietly created a package he never declared. Check the forwarding before
  importing a transitive dep — that is the general move.
- **Fifth session running where the probe beat my plan, and the first time it
  found a live bug rather than a better framing.** I planned logging-as-hygiene
  and the measurement turned it into a leak in code he shipped in lesson 21.
  Planning the probe before the outline is now simply how this works.
- **Four for four on "a bug with no error message."** 29 dead code, 32 clean
  tsc and a runtime throw, 33 a click that sends nothing, 34 a redact path that
  matches nothing. This is his shape. Keep hunting for it.
- **The best exercise this session teaches a test failure mode, not a feature.**
  3(b): delete the level flip and watch the test read an empty log and pass
  the "secret absent" checks. A green test that cannot fail is the thing to
  fear, and he has now seen one on purpose.
- Only **one** new word pair (allowlist vs denylist), per the note in lesson 33
  about the ceiling. Still waiting for him to use an earlier pair unprompted.
- `exactOptionalPropertyTypes` corrected my code for the **second lesson in a
  row**. Left it in the lesson again. A strict flag earning its keep in front
  of him beats any argument for strict flags.
- The split held for a third session: I apply plumbing, he types the test and
  the breakages. His pre-flight has been clean twice running under it. Keep it.
- He now owes me **two** answers (pg_trgm from 33, AuditLog-vs-stream from 34).
  Ask for the first once more. If it is still unanswered next session, drop it
  for good — the rule from the trim fix works in both directions.
- I skipped the two front-end holes the index promised, and **said so in the
  lesson in a box**. Do that whenever the plan changes; he should always be
  able to see why the order moved.

## Lesson 35 notes (2026-09-11)
- Streak intact: **no new dependency, 35 lessons.** The fix was two quote
  marks. Nothing to install and nothing to import.
- **Sixth session running where the probe replaced my plan, and the second in
  a row where it found a live bug.** This time it was in the *tooling*, found
  by checking his homework rather than by measuring the topic. Lesson: read the
  homework file AND run the suite — I nearly accepted "154, clean" as clean.
- **Five for five on "a bug with no error message."** 29 dead code, 32 clean
  tsc + runtime throw, 33 a click that sends nothing, 34 a redact path that
  matches nothing, 35 a test file the runner never received. This is his shape
  and it keeps producing lessons. Keep hunting for it.
- Lesson 34 half-built the family; this one **named it**: three greens that
  prove nothing (never ran / nothing to read / nothing asserted), each with a
  lesson number next to it. Put it in the new reference card as a table. When
  a family reaches three named instances, stop calling it a tip.
- **New recurring rule, first sighting L20:** a test you have never seen fail
  is not a test. Lesson 34 made him break the code as an exercise; lesson 35
  makes it the routine. Use "break it, watch it go red, put it back" from now
  on every time he adds a test.
- Best question on the page is exercise 5 (**why `web` escaped**): a pattern
  matching *nothing* is passed through untouched, so the bug needs a *partial*
  match to appear. He has to work that out before I tell him. More interesting
  than the fix and it is the general mechanism.
- First time I have shown a **shorter fix and argued against it** (`tsx --test`
  with no pattern, also 155). Reason given: scope, because
  `src/generated/prisma/` is regenerated. Worth repeating — he should see that
  "shortest" and "right" sometimes part company, and see the reason named.
- **Two word pairs only** (glob/shell expansion, globstar). Four new terms,
  under the cap. Still waiting for him to use an earlier pair unprompted; if
  it has not happened by 37, ask him directly instead of waiting.
- I touched **no file under `server/` or `web/`** — lesson-24 rule held with no
  effort this time, because the entire change is one line he types.
- He now owes **two** answers still (pg_trgm from 33, AuditLog-vs-stream from
  34). I attached a consequence to the second one: it decides what the audit
  log page reads. Try that whenever an owed answer goes stale.
- The audit log page has been promised three times now. If the pre-flight
  finds a third fire next session, say so in the lesson box again — but teach
  the page anyway and fold the fire into an exercise.

## Lesson 36 notes (2026-09-11)
- Streak intact: **no new dependency, 36 lessons.** Four columns and a
  decorator, all from Prisma and Fastify.
- **He fixed the glob and the count moved to 155.** First pre-flight where the
  number went up because of his own change. Say that back to him; it is the
  first time the suite proved his own work.
- **The homework queue emptied for the first time since 33**, and both owed
  answers were right. I refilled it with exactly ONE question (params.id vs
  targetId). Keep it at one — a queue of two went stale last time.
- Measurement beat assertion again: 3,428/7,201 dead actors and 72 dead
  targets, both from his own database. The first number *praises* a rule he
  already wrote; the second opens the hole. That order works — show the rule
  paying before showing what it does not cover.
- **Sixth "bug with no error message."** New sub-type: not a wrong string but a
  wrong *moment*. `findUnique` in `onResponse` is correct code, too late. Say
  "correct and too late" again when ordering bites.
- **First deliberate inversion of an earlier rule.** Lesson 4 said store the
  pointer not the copy; lesson 36 says the opposite for audit tables, and gives
  the same reason for both. He is far enough in that contradicting an old
  lesson is safer than hiding from it. Watch whether he pushes back — if he
  does, that is a good sign.
- Exercise 2 makes him prove the cascade claim on `Session` rather than trust
  me. Reuse this shape: when a claim is about a destructive behaviour, point at
  a *different* table that already has it.
- Exercise 6 asks him to leave something broken on purpose (project delete has
  no capture) and write the list down. First time I have graded "left it
  broken, wrote it down" as the correct answer.
- Two new terms only (snapshot, append-only). Under the cap.
- Lesson-24 rule held: I wrote nothing under `server/` or `web/`. The migration
  and all three code pieces are his to type.
- **Still waiting for him to reuse an earlier word pair unprompted.** I said at
  35 I would ask directly by 37. Next session, ask.
- The audit log page is now genuinely next, with the schema under it.

- Lesson titles must be plain and descriptive (topic, not poetry). Renamed all
  37 on 2026-09-11. Filenames kept as-is so links do not break; new lessons get
  a plain title from the start.

## Lesson 38 notes (2026-09-11)
- Streak intact: **no new dependency**, 38 lessons. Everything came from
  Prisma, zod and `can.ts`.
- I built the whole route, ran it, then reverted it before writing the lesson.
  Every number in lesson 38 is measured. Keep doing this -- the "expect 162
  passing" line is only worth printing if I have seen 162.
- The best teaching moment was an accident: my first test asserted 25 rows and
  got 26, because the MEMBER's 403 audited itself. Put that in the lesson as a
  thing for him to rediscover, not as a fact -- step 5 tells him two counts
  will be off by one and to work out which row before fixing the seed.
- Framing used a fourth time: **count the nouns in the rule.** "A MEMBER may
  delete a task / may not see who deleted a task" = two powers = two entries.
- New pair of words: **doing vs seeing.** First action in the table that is a
  view. Watch whether it sticks; it is the basis of every reporting route.
- Homework 7 asked for the third time. Hard stop -- do not carry it again.

## Lesson 39 notes (2026-09-11)
- Streak intact: **no new dependency**, 39 lessons. React Query, `Intl` and
  `node --test` only.
- He said "move to the lesson 38" and 38 was already built and recorded. Took
  it as "move on" and taught 39. Worth a one-line check next time he gives a
  number: he counts from where he stopped reading, not from the file list.
- Built the whole page under `web/`, typechecked, ran `npm test` (7) and
  `npm run build`, then reverted to his state. Second lesson in a row where
  every number is measured. Keep doing this.
- I did NOT see it in a browser and said so in the lesson by omission. If a
  future lesson claims pixels, drive vite first.
- **The lesson found itself in the pre-flight, again (seventh time).** The plan
  said "cursor list, third use". The real topic was the two stale copies:
  `can.includes("audit:read")` = TS2345, `at: Date` = silent. One tsc run, one
  error. That pairing is the whole lesson and I did not plan it.
- New pair of words: **checked vs believed**. Two terms, under the cap. It is
  record 0034 generalised, and the boundary has a name now: the wire.
- **Seventh "bug with no error message."** First one that lives in a *type*.
  New sub-type: the wrong type does not crash because the method exists on both
  (`String.prototype.toLocaleString` returns the string). Say "the method
  exists on both" again when a silent type bug turns up.
- Teaching move that worked on paper: step 1 makes him *cause* TS2345 on
  purpose before fixing it. Same shape as "break it, watch it go red" from 35,
  applied to the compiler instead of a test. Reuse.
- Second half of the lesson is subtraction: no `auditScope`, no `sort`, no
  mutation. Naming what you deleted from a working hook, and why, was the
  cheapest good content on the page. Reuse when he copies an existing shape.
- **Asked directly** for "hint vs gate" in his own words. Promised at 35,
  overdue by four lessons. Do not let a waiting-game run this long again.
- Homework 7 closed after three asks, answered inside the lesson. Queue is
  exactly one (homework 9). Hold it at one.
- Lesson-24 rule held: everything I wrote under `web/` was reverted; only
  `lessons/`, `reference/`, `learning-records/`, `PLAN.md` and this file
  changed. Test data I made in his dev database was deleted afterwards.
- The zod-in-`queryFn` question is now named and deferred in the lesson footer.
  That is the first thing likely to break the web-side dependency streak, so it
  deserves its own lesson when he asks for it.

## Lesson 40 notes (2026-09-11)
- He said "move to lesson 40" with no topic and no homework answer. Lesson
  39's own footer named the topic already: validate the reply with zod, or
  keep believing it? Answered it rather than opening something new.
- **Measured both sides before choosing.** esbuild, one nine-field zod schema
  alone, minified+gzip: 91.5 KB. A hand-written type predicate for the same
  object: 15 lines, 0 KB, catches the identical bug (`status` sent as a
  string). Chose the hand check.
- **Streak: 40 lessons, no new dependency — and this is the one that could
  have broken it on purpose.** Said so plainly. New rule for the dependency
  table: take a dependency only when the problem has no decisions left in it
  (this schema still has all nine fields as decisions).
- No file touched under `server/` or `web/` — lesson-24 rule held, nothing to
  hold this time since the whole lesson is a decision, not new product code.
- Ran the probe in a throwaway scratch npm project (zod + esbuild), deleted
  after. Third or fourth time a probe answered a dependency question with a
  number instead of an opinion (11, 15, 16, now 40).
- Homework is a naming exercise, not a fix: name one other believed type still
  in the app (`useSession`'s `User`, or `useTeams`'s `can`). Queue stays at
  one — homework 9 from lesson 38, still open.
- `reference/react-query-rules.html` gained two glossary rows and a small
  table (where to check a believed reply). `lessons/index.html` updated.

## Lesson 41 notes (2026-09-11)
- He said "move to lesson 41" with no topic, third time running. Lesson 40's
  record had two candidates queued; took the audit-log lockdown because the
  reader is finished and the log is now something he uses.
- **The probe corrected me before the lesson existed.** I was going to teach
  "you cannot revoke from the owner". It is false. Ran it, got `42501`, rebuilt
  the lesson around the two *real* holes instead: TRUNCATE, and grant-back.
  Fourth or fifth time a probe beat a prior. Keep probing first.
- The strongest number was an accident: applying the REVOKE breaks **3 tests
  and 0 routes**, and all three are cleanup `deleteMany`s. "A privilege nothing
  uses is free to take away" is a better argument than any security phrasing.
- Ran his 14 migrations into a throwaway `tasks_probe`, ran the suite twice
  there, dropped the database. His `tasks` DB was read-only throughout —
  verified `relacl` still NULL and 6,664 rows after. Lesson-24 rule held.
- **Could not run `CREATE ROLE`** — no postgres superuser password on this
  machine. Said so plainly in the lesson, in the step itself, instead of
  writing unmeasured commands as if I had tested them. Do this every time.
- Homework 9 closed with his own numbers (6,664 rows / 2,864 kB / 4 days /
  13 users). Closing a homework with the state of *his* database, not a
  hypothetical, worked well. Reuse.
- Two experiment lessons in a row (40, 41), no product code. That is the
  ceiling. Lesson 42 ships code.
- Asked "hint vs gate" for the **third** time. If he skips it again, stop
  asking and teach it.
- Streak intact: **no new dependency, 41 lessons.**

## Lesson 41 code (2026-09-11)
- He asked me to write the code, so lesson 41 is no longer pure experiment.
  Two files: the two owed tests in `web/src/features/audit/audit-row.test.ts`
  (web is **9** now), and `server/prisma/sql/tasks_app.sql`.
- Verified the test is load-bearing: replaced the `status` check with `true`,
  got 8/1, restored, 9/0. Wrote that check into step 0 as *his* job too.
- Syntax-checked the SQL by running every statement except `CREATE ROLE`
  against a scratch database (`tasks_syntax`, migrations deployed, dropped
  after) with `tasks_app` -> `tasks`. Seven statements, all clean, final ACL
  `{tasks=arxtm/tasks}`. Said in the lesson exactly which part is unverified.
- Added `ALTER DEFAULT PRIVILEGES FOR ROLE tasks` to the file, which was NOT
  in the lesson's first block. A table from a future migration with no grants
  is a 500 in production and nothing in dev. Explained it in step 5.
- His `tasks` database: still `relacl` NULL, still 6,664 rows. Untouched.

## Lesson 42 notes (2026-09-11)
- "move to lesson 42", no topic, fourth time. No decision needed: record 0045
  specified this lesson exactly. Two experiment lessons was the ceiling, so 42
  shipped code.
- He **did** the hand-over this time — ran `tasks_app.sql` as the superuser.
  `tasks_app=ar/tasks` on `AuditLog`, both `\ddp` rows present. Pre-flight
  checking his actual database before writing the lesson keeps paying.
- The probe found the good line again: as `tasks_app`, `GRANT DELETE` on itself
  is a **WARNING, not an error**. "The wall is silent" closes the grant-back
  hole lesson 41 opened. Fifth or sixth time a probe supplied the best sentence.
- **Did not know, so I checked:** `.env` vs shell. `loadEnvFile()` does not
  overwrite an existing variable. Shell wins. Wrote the measurement into the
  lesson and used it to explain `LOG_LEVEL=silent`, which he has had since
  lesson 6 without a reason.
- `npm test` 162 → 166. New `src/db.test.ts` opens its own `pg.Client` — first
  test file that does not import the shared `prisma`, and the reason IS the
  lesson. No new dependency: **streak intact, 42 lessons.**
- Mutation-checked it: swap `APP_DATABASE_URL` for `DATABASE_URL` in the test
  → 164/2, exactly the two refusal tests. Ran it before asking him to.
- Booted the real server on 3001 and read `pg_stat_activity` to prove the role.
  First try on 3000 hit **his running dev server** — check for one before
  trusting a curl on this machine.
- **Stopped asking "hint vs gate" and taught it.** Fourth ask would have been
  the fourth skip; record 0045 said to switch. Used today's own code as the
  example table. Replacement homework is one sentence: name a gate that is
  still only a hint.
- Extracted `assets/show-me.css` — the same box/grid CSS had been pasted into
  every show-me file since lesson 21. Only lesson 42's sketch links it. Convert
  an older one only when it needs editing anyway.
- Left him the password rotation as step 5. `tasks_app` / `tasks_app` in plain
  text is fine on a laptop and wrong anywhere else, and it opens the secrets
  question that belongs in week 15-16.

## Lesson 45 (2026-09-16)
- He asked a follow-up question out of lesson 44 rather than waiting for the
  next lesson. Treat those as the lesson - the ZPD was already picked for me.
- **Pre-flight paid again:** ran all four size functions on `tasks` before
  writing. The 38% number (13.7 MB total, 5.2 MB of it his) only exists
  because I also measured `template0`. Always measure the empty baseline when
  teaching "how big is X".
- Found `zzz_should_not_exist` in his public schema while ranking tables.
  Made it step 4 instead of dropping it - he drops his own things.
- `Task`: 48 kB of rows, 1,640 kB of indexes. Best single number in the lesson.
  Save `pg_stat_user_indexes` / unused indexes for the next one; it now has a
  hook he has seen with his own eyes.
- Still no new dependency. Streak intact, 45 lessons.

## Lesson 46 (2026-09-16)
- **The pre-flight killed the planned lesson and gave a better one.** I went
  looking for unused indexes. He has none. If I had written "find and drop the
  dead index" from parametric knowledge, the whole lesson would have been
  homework that returns an empty table. Sixth or seventh time measuring first
  changed the content, not just the numbers.
- The salvage: `idx_scan` answers *should this exist*, size answers *is this
  the right size*. Two questions, two commands. The bloated `Task_pkey`
  (1,224 kB / 524 rows) became the tangible win instead.
- **Probed `REINDEX` on a throwaway table** (`zz_probe`, created and dropped in
  one session) rather than on his `Task` - the shrink is his win to run, not
  mine to spend. 4,408 kB -> 32 kB after a plain VACUUM did nothing. Keep doing
  this: probe the mechanism on scratch, leave the real table for him.
- `stats_reset` being NULL is the sentence that makes the view safe to teach.
  New general move: **a counter needs its denominator**. Reuse it.
- Second new move: **a ratio means nothing without the row count next to it.**
  His `User` table (13 rows, 97,871 seq scans) is the counterexample, on his
  own machine. Good because every tuning blog would call that a bug.
- Could not run `REINDEX` as `tasks_app` to prove the refusal - the sandbox
  blocked materialising the app password on the command line. Checked
  `pg_tables.tableowner` instead (all `tasks`) and stated the ownership rule.
  **For future privilege probes, prefer a catalog query over a live attempt.**
- Lesson 45's own "ask me anything" list supplied this lesson's topic again.
  Those prompts are working as a ZPD queue - keep seeding them deliberately.
- Still no new dependency. Streak intact, **46 lessons.**

## Lesson 47 (2026-09-16)
- **He did the homework.** `Task` 1,640 kB -> 48 kB, `AuditLog` 1,768 -> 96.
  Checked before writing and opened the lesson with his own numbers. Keep
  opening with the previous homework's result when he has run it - it is the
  cheapest possible proof that the lessons connect.
- Third lesson running whose topic came from the previous lesson's "ask me
  anything" list. That list is now the ZPD queue. Seed it deliberately, and
  mark the one I think is next (did it again: the planner statistics one).
- **Pre-flight changed the lesson a third time in a row.** I went to teach
  "add `@@index([at])` for the retention job". The probe said the 90-day
  delete matches 75% of rows and Postgres *ignores the index*. So the lesson
  became the decision (selectivity) with the mechanics riding along - much
  better, and it is the thing he would have got wrong alone.
- New general move, same family as lesson 46's ratio/row-count: **a plan from
  a small table is not evidence.** His real `AuditLog` picked an index whose
  leading column was not in the query, purely because it has 414 rows. Named
  that out loud as a trap rather than a finding.
- Honest ending: step 4 has him add an index whose `idx_scan` will read 0, and
  tells him that is expected, with a date to drop it by. First time I have
  asked him to add something speculative - it only works because the reason is
  a job he is going to write in week 13.
- Tried to measure the `CONCURRENTLY` lock level and **lost the race** - 800k
  rows indexed faster than a 0.4 s sample. Did not fudge it: cited the manual
  and labelled the sketch caption "per the manual". Next time sample in a loop
  or use a much bigger table.
- Still no new dependency, and no edit to `server/` or `web/`. Streak intact,
  **47 lessons.**

## Lesson 48 (2026-09-16)
- **Homework done again**, two in a row. `AuditLog_at_idx` is on the database,
  migration `20260916063848_audit_log_at_index`, `idx_scan = 1`. He applied it
  **without** `CONCURRENTLY` - correct on 414 rows, so I did not nag.
- Fourth lesson running whose topic came from the previous lesson's "ask me
  anything" list. The list is the ZPD queue now; it is working, keep seeding it
  and keep marking which one I think is next.
- Pre-flight paid off a fourth time: his real `Project` table has 20
  modifications and has **never been analysed** (threshold is 50), and
  Postgres believes it holds 0 rows. Free, honest example of "a small table
  can have no statistics", from his own machine.
- Best new move this month: **check the free fix before the permanent one.**
  `ANALYZE` is milliseconds and no write lock; an index is forever. Reuse it
  anywhere there is a cheap reversible fix and an expensive permanent one.
- The staleness probe is the strongest demo so far - same query, same table,
  estimate 5,811 vs 201,208, and the plan flips. Made it concrete that the
  planner is *correct on a wrong number*, not stupid.
- Exactly 5 new terms: `pg_stats`, `ANALYZE`, `null_frac`, `n_distinct`,
  `histogram_bounds`. Autovacuum named but deliberately not taught - it needs
  `VACUUM` beside it, and that is a lesson.
- Still no new dependency, no edit to `server/` or `web/`. Streak intact,
  **48 lessons.**

## Lesson 49 (2026-09-17)
- **Fifth lesson running whose topic came from the previous lesson's "ask me
  anything" list.** The queue is reliable now. Seeded again, and marked
  `VACUUM` vs `ANALYZE` as the one I think is next.
- Pre-flight paid off a fifth time. I expected to build a skewed probe table;
  his real `Task.teamId` is already **96.4% one team**, with 4 distinct values
  and estimates of 505/12/6/1 that are exact. No synthetic data needed at all
  - the best demo this month came straight off his machine.
- Best demo shape so far: **same query, same index, only the value changes,
  and the plan flips.** Four rows in one table. Reuse this shape whenever a
  decision depends on an argument rather than on the schema.
- Killed a planned section: I tried to show "the same column without an MCV
  list" on a scratch copy. `SET STATISTICS 0` does not clear existing stats,
  and with a 1-entry list the leftover formula still landed on the right
  number. Dropped it rather than fake a contrast. The real table was stronger.
- First time a homework step says **write this line down and do NOT run it**
  (`SET STATISTICS 500`). New general move: **teach the symptom before the
  knob.** He reads tuning blogs; a named knob with no symptom is a trap.
- The database-wide skew sweep is a keeper - it reads out as sentences about
  his own app (one team does all the work, every request from 127.0.0.1,
  three quarters of tasks not done) with no analytics code.
- Small honesty note carried into the lesson: `status = 201` estimated 100 vs
  a truth of 108, because 57 rows arrived since the last `ANALYZE`. Used it to
  reinforce lesson 48 instead of hiding it.
- Still no new dependency, no edit to `server/` or `web/`. Streak intact,
  **49 lessons.**


## Lesson 50 (2026-09-17)
- **Sixth lesson running from the previous lesson's "ask me anything" list**,
  and the one I had marked as next. The queue keeps working. Seeded again and
  marked transaction id wraparound as next.
- Pre-flight paid off a sixth time, and differently this time: the interesting
  finding was that his four small tables are **70-100% dead rows** and
  autovacuum is *right* to ignore them. The lesson became "this looks alarming
  and is correct", which is a better lesson than "go clean this up".
- **A demo failed and I fixed it before writing.** The first scratch demo used
  `UPDATE` and showed 0 dead rows - HOT pruning. Switched to `DELETE`. Worth
  remembering: on small tables, `UPDATE` is a bad way to make dead rows.
- Best line in the measurement is the middle row: after `ANALYZE` the live
  count is corrected and all 2,500 dead rows are still there. One table shows
  both commands' jobs and shows they do not overlap. **Reuse this shape: put
  both candidate fixes in one before/after table.**
- Reused "read the row count before the ratio" (lesson 46). Second time in five
  lessons. It is now a named move in this course, not a one-off.
- Exactly 5 new terms. Visibility map, HOT and wraparound all deliberately left
  out - wraparound is the next lesson, the other two are a pair with
  index-only scans.
- Homework step 4 is a note, not code: the retention job must end with
  `VACUUM (ANALYZE) "AuditLog"`. Second time I have asked him to write a line
  down for a job that does not exist yet. It works because week 13 is close.
- Still no new dependency, no edit to `server/` or `web/`. Streak intact,
  **50 lessons.**

## 2026-09-17 — show-me pages folded into the lessons

- Deleted all 36 `lessons/show-me-*.html`. Their markup, inline `<style>` and scripts
  now live in the matching lesson under `<h2 id="see-it-drawn">See it drawn</h2>`,
  just above the ask footer. Lesson 20 took both of its sketches.
- Fixed the cross-links that pointed at the deleted files (lessons 23, 26, and
  `reference/pagination-and-indexes.html`).
- CLAUDE.md now says visuals go inline; no separate show-me file.

## 2026-09-17 — no more internals arcs
Jay called lessons 44-50 (VACUUM, bloat, index size, ANALYZE, statistics)
boring and unintuitive and asked to skip. He is right: seven lessons of
Postgres storage internals, none on the mission path, none picked from the
candidate list lesson 43 left.

Rule for me: **when a lesson ends with named candidates, take one.** Do not
follow a thread out of the last lesson's side effect. If a topic is
interesting but off-mission, it is a paragraph in a reference doc, not a
lesson.

Test before writing a lesson: *which line of MISSION.md success does this
move?* No answer -> do not write it.

## 2026-09-17 — lesson 52, invites

- Jay asked to move on; server suite measured at **172 passing**, so 51 is
  fully typed in. Confirmed before writing.
- Applied the new rule from record 0055: this lesson moves the MISSION line
  "teams, **invites**, projects, tasks" — the one word with no code.
- Reused rather than taught: the whole token scheme is `session.ts` copied.
  Lesson says so out loud. **No new dependency, 52 lessons.**
- Deliberate contrast with 51: that lesson widened a role and broke two tests;
  this one adds a route to a verb that already existed and breaks none. Worth
  pointing at again when he adds the next action.
- Exactly 4 new terms: invite, pending row, expiry window, token hash.
- Split on purpose — creating the invite today, accepting it in 53. Accepting
  is the harder half and would have blown working memory.

## 2026-09-17 — invites parked, Docker is next

- Jay skipped lesson 52 (invites) before reading it. Deleted same day. Record 0056.
- **I got the follow-up wrong and he corrected me.** He said "skip for now"; I
  offered "drop it from the mission" as the recommended option and he took it,
  then came back with: *"I have told you that drop this for now. We will learn
  later when i actually need to send email's."* MISSION.md now says **parked**,
  with the condition that unparks it: a real mailer.
- **Rule: when he defers something, park it with its trigger. Never offer
  delete-the-goal as the tidy option.** A deferral is not a scope cut.
- **The pattern in all three prunes: he cuts anything that is not the running
  app.** Postgres internals, container work he was not ready for, and now a
  feature whose payoff is an email nobody sends. Test a lesson against this
  before writing: does he see it work in his app, today?
- I proposed the mission edit rather than leaving a goal in MISSION.md we had
  agreed not to build. He took the recommended option. Keep doing that.
- Next: Docker, his pick. It is the biggest open mission line and the one he
  explicitly moved to the end on 2026-09-10. Nothing container-related is
  installed on the Mac, so lesson 52 starts with the install.

## 2026-09-17 — lesson 53, compose

- He came back the same day having done the 52 install, and asked to move on.
  Verified before writing: `Dockerfile`, `.dockerignore`, `.env.docker` exist;
  `/Applications/Docker.app` is installed. So **Docker Desktop**, not OrbStack
  — the choice lesson 52 left to him, now made. The ~2 GB VM is his call.
- Passed the test from the last note: does he see it work in his app, today?
  Yes — `docker compose up` and a seeded login. That is the whole lesson.
- Built it around a failure in **his own file** (the lesson-41 role SQL aborts
  the database init) rather than a generic compose tutorial. Same move as 52's
  two deliberate failures, and it is clearly what works for him.
- Could not run docker from my shell (not on PATH here). Said so in PLAN.md
  and did not pretend otherwise — the command sequence is reasoned, not
  measured. If the init error text differs from what the lesson quotes, that
  is the thing to correct first.
- Fourth ask on the `tasks_app` password rotation. Kept it to one dim
  sentence rather than a box; nagging louder has not worked three times.

## 2026-09-17 — lesson 54, and three broken commands

- He came back the same day with three errors pasted from his terminal. None
  were Prisma's: a stale image, a file the lesson told him to create that he
  never created, and a stray container holding :3000. Diagnosed all three by
  reading the image's own copy of `seed.ts` — worth doing before theorising.
- **I ran his stack this time.** Docker IS on PATH in this session, unlike
  when 53 was written. Fixed all three, left the app up, seeded, healthy.
- Asked him to pick lesson 54 from the three candidates 53 left open, with
  migrations-on-start recommended because he had just felt its absence. He
  took the recommendation. Keep offering a recommendation with the options.
- **Built the lesson on his own error text again.** Second time in a row that
  the lesson opens with a failure he personally watched. It is the format.
- Measured everything the lesson claims, including the two-container race.
  Then **reverted `server/` to its pre-lesson state** — he writes the code.
  Only `prisma/sql/audit-lockdown.sql` stayed, because he asked for it by name.
- Fifth ask on the `tasks_app` password rotation is now overdue. `.env.docker`
  still says `tasks_app:tasks_app`. I did not raise it in lesson 54 at all —
  four dim sentences did nothing, so the next move is to ask him directly in
  chat, once, rather than write it a fifth time.

## 2026-09-17 — lesson 55, and a plan that cost money

- He said "yes, do lesson 55" to a Fly.io deploy I had proposed one message
  earlier. **I checked the price before writing anything and the proposal was
  wrong**: Fly's free tier is gone and their Postgres is $38/mo. Went back with
  two options plus a recommendation. He picked the $0 one (Render + Neon), not
  my recommendation (Fly ~$2/mo + Neon). **Note for next time: he optimises for
  zero cost, not for zero friction.** Do not recommend a paid tier again
  without saying the number in the option itself.
- **He chose to include the `tasks_app` password rotation.** Sixth ask, and the
  first one he said yes to — because this time it was attached to a thing he
  wanted (the deploy) rather than standing alone as advice. Neon's 60-bit rule
  did the rest. Lesson: attach the chore to the reward, do not repeat the chore.
- **Split the deploy into 55 (database) and 56 (app), which he did not ask for.**
  Justified in the lesson's own second section, with the two broken lines shown.
  It passes his test — he sees his app working against a cloud database today.
- Measured the `:"DBNAME"` / `:"USER"` trick against his live container before
  claiming it. Third lesson in a row built on something I actually ran.

## 2026-09-18 — lesson 56, the deploy itself

- He asked for lesson 56 by number, so no candidate menu this time. 55 had
  already specified it in detail; I built what 55 promised rather than
  re-litigating the scope.
- **Read his files before claiming anything about them.** The lesson asserts
  `HOST` defaults to `127.0.0.1`, `EXPOSE 3000` becomes a lie, `Secure` has
  never been emitted, `PORT` is coerced, `web/src/lib/api.ts` reads
  `VITE_API_URL` — all verified in the source, not remembered. Also caught
  myself citing "lesson 47", which does not exist (44–50 were cut); the rule
  is in `config.ts` and is now cited that way.
- **Checked Render's docs for every number** (750 h, 15 min, ~1 min, `PORT`
  default 10000, the `0.0.0.0` requirement, Root Directory semantics) after
  lesson 55's Fly.io pricing mistake. Same reflex, now habitual.
- Could not measure this one — the deploy needs his GitHub and Render accounts.
  Said so in PLAN.md. This breaks the three-lesson run of measured lessons and
  it is worth telling him rather than implying otherwise.
- **The lesson's best section is a failure he has not hit yet** (local page,
  deployed API, `SameSite=Lax`). Two lessons in a row opened with his own error
  text; this one predicts one instead, which is the next best thing and sets up
  57 with a reason he will have felt.
- Zero nags this time. The password rotation is done, and there is nothing left
  standing open that he has said no to.
