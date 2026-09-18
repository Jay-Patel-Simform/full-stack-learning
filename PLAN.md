# Full Stack Plan — Team Task Tracker

Stack: Node + TypeScript (Fastify), Postgres + Prisma, React/Vue front end, Docker, deploy to Fly.io or Render.
Time: 5-8 h/week. About 16 weeks.
Roles: Owner, Admin, Member, Viewer. Scoped per team.

## Week 1-2 — API basics
- Fastify + TS project. Health route. Zod for input checks.
- Prisma: User, Team, Membership(role), Project, Task.
- CRUD for Project + Task. No auth yet.
- Practice: write 5 raw SQL queries by hand against the same data.

## Week 3-4 — Auth you write yourself
- Register + login. Hash passwords with scrypt (`node:crypto`), not argon2. Revisit week 13.
- Server-side sessions, NOT access + refresh JWTs. See learning record 0007 —
  the plan already wanted a revocable token in the DB, which is a session.
- httpOnly cookies. Logout deletes the session row.
- Tests: wrong password, expired session, logged-out session. (Done, `npm test`.)
- Still open: rate limit on login. Moved to week 7-8, put it first.

## Week 5-6 — RBAC
- Permission table in code: role -> allowed actions. (Done, lesson 7,
  `src/auth/can.ts`.)
- `Team` + `Membership(role)`, `Role` as a Postgres enum, routes call `can()`
  and answer 403. (Done, lesson 8. `npm test` = 28. See record 0009.)
- The third argument — `can(role, action, resource)`. (Done, lesson 9.
  `npm test` = 40. Rank rule: act only on somebody strictly below you. The
  gate loads the target via a `Load` function; the handler never checks.)
- Rule: check the team membership, not the user id alone. (Done — the gate
  calls `getRole(teamId, userId)`, never the user id alone.)
- Tests: Viewer cannot edit (done). Member cannot delete team (done, over HTTP).
  Admin cannot remove Owner (done, lesson 9 — and Admin cannot invite as
  Owner either, same rule, no extra code).
- Lesson 10 (last of week 5-6): `Task` is team-scoped. (Done. `npm test` = 50.
  See record 0011.) `Task.teamId` landed by expand/backfill/contract in a
  hand-written migration (`--create-only`); no rows lost. Task routes are now
  `/teams/:teamId/tasks[/:id]`, each behind `requirePermission("task:*")` with
  no loader. `where: { id, ownerId }` is out of `task.store.ts` — the gate
  decides, and `teamId` in the query is *scoping*, not permission.
- Rule to remember: a permission needs a scope, so the scope goes in the URL.
- `Project` is built (routes, store, schema, migration `20260902115602_project`).
  Nothing in `can()` is unwired now. Week 5-6 is CLOSED. No lesson file for
  it — Jay wrote it himself and did not want it re-taught (see record 0012).
- Still open: an owner cannot leave their own team (equal rank). Decide if
  that needs a `member:leave` action.

## Week 7-8 — API security
- Rate limit login. (Done, lesson 11. `npm test` = 66. See record 0012.)
  Hand-written `src/auth/throttle.ts`: keyed on the **account**, not the IP,
  because a stuffing kit rotates proxies but has one email per victim. Five
  free tries, then 1s doubling to a 15 min cap. Exponential backoff, never a
  lockout — a lockout is a DoS aimed at your own users. Check runs *before*
  the scrypt hash, so a blocked request costs a Map lookup, not 252 ms.
  Rejected `@fastify/rate-limit` for this route: its default key is
  `request.ip`, the wrong key.
- Rule to remember: rate-limit the thing the attacker has only ONE of.
- Rule to remember: any store keyed on caller input is a store the caller can
  fill. Cap it as you create it.
- Still open from lesson 11: the counter dies on restart and is per-process.
  Move it to Postgres or Redis in week 11-12. Marked `ponytail:` in the file.
- Global per-IP limit over the whole API. (Done, lesson 12. `npm test` = 70.
  See record 0013.) `@fastify/rate-limit@11.2.0`, 100 req / IP / minute —
  **the first new dependency in twelve lessons**, because this problem has no
  decisions left in it. Registered with `global: false` plus one app-level
  `onRequest` hook: the plugin's global mode attaches per route *after* that
  route's own hooks, so a blocked request would still pay `requireAuth`'s
  session query. `buildApp()` is now async.
- Rule to remember: reject a library when its DEFAULTS are wrong; take it
  when the problem has no decisions left in it.
- Rule to remember: believe `x-forwarded-for` only when something you control
  writes it. `trustProxy` stays OFF until deploy.
- Still open from lesson 12: body size limit (his homework, asked 3x now), `trustProxy` at
  deploy, and both counters are still in-process.
- CORS. (Done, lesson 13. `npm test` = 75. See record 0014.)
  `@fastify/cors@11.3.0`, second dependency, same rule as lesson 12 — the spec
  has one decision left in it (which origins). `origin` is an array of exact
  strings from `ALLOWED_ORIGINS` in the env. **Never `origin: true`**: it
  reflects the caller's Origin, and with `credentials: true` that leaks
  logged-in data to any tab.
- Rule to remember: CORS is advice to a browser. It stops nobody with curl.
  Access control is `requireAuth` + `can()`, and always was.
- Rule to remember: same-origin counts the port, same-site does not.
- Helmet headers. (Done, lesson 15. `npm test` = 82. See record 0016.)
  `@fastify/helmet@13.1.1`, third dependency, and a NEW rule: take the library,
  then turn it down. Four of Helmet's thirteen defaults mean anything to a JSON
  API, and two of those four are set for somebody else's app. Kept `nosniff`,
  `Referrer-Policy`, `Cross-Origin-Resource-Policy`. Overrode CSP to
  `default-src 'none'; frame-ancestors 'none'` with `useDefaults: false`, and
  `X-Frame-Options` to `DENY`. Switched off five page-only headers. Added
  `Cache-Control: no-store` by hand in an `onSend` hook — no plugin sets it,
  and `onSend` is the only place that also covers 400/403/404/429.
- Rule to remember: a library can be right about the facts and wrong about your
  situation. Those are two separate judgements.
- **HSTS is gated on `NODE_ENV === "production"` and must stay that way.**
  Sending it from localhost pins that host to HTTPS in your browser for a year;
  the fix is manual, per browser.
- Still open from lesson 15: the React page needs its OWN CSP from nginx
  (week 9-10). The API CSP does not cover it.
- **Redis, decided (was a question for five lessons):** two instances behind one
  nginx = two in-memory counters, so login backoff gives 10 free tries and the
  IP floor becomes 200/min. Week 11-12 fixes both — pass `@fastify/rate-limit`
  its `redis` option, and move `throttle.ts`'s Map to the same shared store.
- CSRF. (Done, lesson 16. `npm test` = 93. See record 0017.)
  **No new dependency** — nine lines in `src/auth/csrf.ts` reading
  `Sec-Fetch-Site`, with `Origin` as the fallback, enforced by one app-level
  `onRequest` hook (step 4, before anything that touches Postgres). Allow a
  write when the method is safe, or `Sec-Fetch-Site: same-origin`, or the
  `Origin` is in `ALLOWED_ORIGINS`. Otherwise 403 — not 401, the cookie was
  fine and the caller was not. Rejected `@fastify/csrf-protection`: the token
  pattern is a workaround for a header that has existed since March 2023.
- Rule to remember: **reading is CORS, writing is CSRF.** Different attacks,
  never the same defence. An HTML form has POSTed cross-site since 1995 and
  needs no preflight, so CORS never sees the classic attack.
- Rule to remember: a library encodes the **browser of the year it was
  written**. Ask what year its problem was solved in before installing.
- Rule to remember: `SameSite=Lax` is defence in depth, not the defence. It
  blocks unsafe methods only — a state-changing `GET` reached by a clicked
  cross-site link walks straight through. **Never write in a `GET`.**
- Deliberate departure from OWASP, marked `ponytail:` in `csrf.ts`: a write
  with **neither** header is allowed, because it is not a browser and only a
  browser can carry a victim's cookie. One-line switch to fail closed.
- Mass assignment. (Done, lesson 17. `npm test` = 101. See record 0018.)
  **No new dependency.** Four lines in `src/app.ts`'s validator compiler:
  `httpPart === "body" && schema instanceof ZodObject ? schema.strict() : schema`.
  Every request body now rejects an unnamed key with a 400. Rejected
  `.strict()` on all seven schemas: one place beats seven, and body number
  eight next month gets it for free. Plus a `.refine()` on `UpdateTask`, since
  `.partial()` also permitted an EMPTY patch (200, changed nothing).
- Rule to remember: **strip is safe, reject is safe and honest.** zod's
  default strips unknown keys silently, so an attacker is stopped *and* a
  front-end typo gets a 200. The honesty is worth more day to day.
- Rule to remember: **an `as` cast is not a check.** It is a promise kept by
  something in another file. Say which file, in a comment.
- Rule to remember: strict checks whether you NAMED a key, never whether
  naming it was wise. `AddMember` names `role`; `can()`'s rank rule is what
  refuses escalation.
- Bodies only, not query. A query string collects `utm_source`, `fbclid` and
  proxy cache-busters. Measured: strict *params* break nothing today, so that
  line is a scope choice, not a rescue.
- User enumeration. (Done, lesson 18. `npm test` = 109. See record 0019.)
  **No new dependency**, three lessons running. Audited `POST /auth/register`
  against the six rules already in the codebase: it obeyed the two that live in
  an **app-level hook** (CSRF, strict bodies) and none of the two that live in a
  **handler** (one message, throttle). That is the lesson.
- Rule to remember: **hide it, or charge for it.** Those are the only two moves
  against an oracle. Register keeps its `409` and pays lesson 11's per-email
  backoff (five free probes, then seconds). Design A — `202 "check your email"`
  always — lands in week 13-14 with the invite mailer, where unverified accounts
  have to exist anyway.
- Rule to remember: three channels leak existence — **message, status code,
  clock.** Login closes all three; measured 237 ms vs 236 ms thanks to
  `DUMMY_HASH`.
- Rule to remember: **"cheap check first" holds only when the cheap check leaks
  less.** Checking register's email before hashing would be faster and would
  open a timing oracle. A wasted hash can be load-bearing.
- Rule to remember: **half a normalisation is worse than none.** The throttle key
  was lower-cased since lesson 11, the lookup was not — so `Mixed@e.com` and
  `mixed@e.com` were two accounts, with a green test on top saying case was
  handled. Fixed at the door: `z.string().trim().toLowerCase()` in
  `auth.schema.ts`, plus data-only migration `20260907062418_lowercase_emails`.
- Rule to remember: **zod chains run left to right.** `z.email().trim()` checks
  the untrimmed string. Normalise, then `.pipe()` into the validation.
- Rule to remember: test a timing defence by asserting **both paths are slow**,
  never that the two times are close. A flaky security test gets deleted.
- Still open from lesson 18: registration spam (fresh addresses, needs
  verification), Unicode look-alike addresses (out of scope), forgot-password
  (does not exist; build it design-A from line one).
- Audit log table: who did what, when. (Done, lesson 19. `npm test` = 117.
  See record 0021.) **No new dependency**, four lessons running. One
  `onResponse` hook in `src/app.ts` (step 9) plus `src/audit/audit.ts`, and
  migration `20260908051741_audit_log`.
- Rule to remember: **the row you most want is the row only `onResponse` can
  write.** A 401 or 403 never reaches a handler, so a log line in a handler
  records only the requests that were allowed - the opposite of an audit log.
  `onResponse` is the one hook that knows both `request.userId` (set by
  `requireAuth`) and `reply.statusCode`.
- Rule to remember: **an audit row that vanishes with the person it accuses is
  not evidence.** `AuditLog.userId` is a plain nullable `Int` with NO
  `@relation` - the only model in the schema that does not cascade from `User`.
  Nullable on purpose too: a 401 has no user and is still worth a row.
- Rule to remember: store the route **pattern**, never `request.url`. A URL is
  caller input; the pattern is one of a short fixed list. Third use of "any
  store keyed on caller input is a store the caller can fill" - hence writes
  and refusals only, never every GET.
- Gotcha: `app.inject()` resolves BEFORE `onResponse` finishes. Poll for the
  row, never sleep. And `request.params` holds raw strings until zod coerces
  them, so the 401 row records `"249"` and the 403 row records `999999`.
- SQL injection (why Prisma helps). (Done, lesson 20. `npm test` = 125.
  See record 0022.) **No new dependency**, five lessons running. Not the
  pure-knowledge lesson planned: shipped `?sort=`/`?dir=` on the task list as
  a zod `enum`, because that is the one input a parameter cannot protect.
  **Week 7-8 is closed.**
- Rule to remember: **a value can travel beside the query; an identifier has to
  be part of it.** Postgres plans before it binds, so a column name must be in
  the SQL text. There is no escaping move - only an allowlist. `quote_ident`
  makes a column name *valid*, not *authorised*.
- Rule to remember: Prisma's safety is **one mechanism, not two**. `$queryRaw`
  is a tagged template - fixed text and `${}` values arrive as separate arrays.
  Measured: builder 0 rows, `$queryRaw` 0 rows, `$queryRawUnsafe` with the value
  glued in **5 rows of 5**.
- Rule to remember: **a parameter in the wrong slot fails silently.**
  `ORDER BY ${"title"}` and `ORDER BY ${"nonsense!!"}` returned byte-identical
  *unsorted* rows. No error. Second silent failure in the same lesson: Fastify
  **skips querystring validation** unless the route names `querystring:` in
  `schema` - `?sort=nope` answered 200, with one `FSTWRN001` log line.
- Rule to remember: **a sort test whose two orders agree cannot fail.** Fixture
  titles are `cherry, apple, banana` so id order and title order disagree.
  Assert the reordering, never the status code.
- Honest correction the probe forced: widening `sort` to `z.string()` is **not**
  an injection hole here - Prisma refuses the unknown `orderBy` key before
  building SQL. What it is instead: a **500 that replies with absolute file
  paths, line numbers and source comments**. The allowlist turns a 500 that
  describes your code into a 400 that describes nothing.
- Error handler. (Done, lesson 21. `npm test` = 130. See record 0023.)
  **No new dependency**, six lessons running. One `setErrorHandler` in
  `src/app.ts` (step 9) plus `src/routes/error-handler.test.ts`. No migration.
- Rule to remember: **fork on the status, not on the error's class.** A `4xx`
  describes the caller's own input - name the field, that is the API contract.
  A `5xx` describes OUR code - log it, reply with a fixed string. A class-based
  handler has a gap the day a library ships a new error type; a status has none.
- Rule to remember: **a missing `statusCode` means 500.** An error with no
  status came from our own code, which is exactly the message we must not send.
  `err.statusCode ?? 500` - the careful branch is the default.
- Rule to remember: **hiding detail is useless if you cannot get it back.**
  `request.log.error({ err })` plus `requestId: request.id` in the reply.
  Fastify already stamps `reqId` on every log line, so the join is free.
  Measured: reply and stack trace both read `req-1`.
- Measured, worse than lesson 20 recorded: a Prisma error reply carries the file
  path, the source lines, AND every column of the model including relations
  (`ownerId`, `teamId`, `UserOrderByWithRelationInput`). The schema, for free.
- Gotcha: the crashing routes go in the TEST file on a real `buildApp()`, never
  in the app. And `app.log.level = "silent"` there, or the handler floods the
  test output with the stacks it now logs on purpose. Typecheck needs
  `(err: FastifyError, ...)` - the first argument infers as `unknown`.
- IDOR is effectively covered (lesson 10 scopes every task query by team;
  lesson 9's gate loads the target). Timing attacks are covered (lesson 18,
  `DUMMY_HASH`, measured 237 vs 236 ms).
- Practice: try to break your own API with curl. Write down each hole.
- Still open from lesson 19: nobody READS the audit log (an alert on repeated
  403s), no retention job, `Int` id ceiling. All week 13-14.

## Week 9-10 — Front end wiring
- Login page + the 401 loop. (Done, lesson 22. `npm test` = 135. See records
  0024 and 0025.) **No server change at all** — CORS, CSRF and the cookie
  flags were already right for a front end on `:5173`.
- Front end is **Vite + React + TS, Tailwind v4, shadcn/ui, React Query,
  axios** (record 0025; he asked for it after 22 shipped, replacing the one
  static file). `cd web && npm run dev`. Cross-origin on purpose, no Vite
  proxy — a proxy would delete the `withCredentials` lesson. Followed Vercel's
  `react-best-practices` skill: **no `useEffect` in the app at all**.
- **"Token refresh on 401" is DELETED. There is nothing to refresh.** Record
  0007 chose server-side sessions, and `readSession()` already slides the
  expiry to 30 days when half the life is gone. The refresh is a Postgres
  update the front end never hears about.
- Rule to remember: **"logged in" is not a fact the page holds, it is a
  question the page asks.** `HttpOnly` (lesson 6) means `document.cookie` is
  `""` while signed in, so the app boots into `unknown`, not into `out`.
- Rule to remember: a cross-origin `fetch` sends **no cookie** without
  `credentials: "include"`. Verified in real Chrome: same URL, same tab,
  401 vs 200.
- One `api()` wrapper owns the 401, because a session dies while the tab is
  idle. Fourth use of "a check you must remember is a check that goes missing".
  One exception: the login form, where a 401 means "wrong password".
- Role-based UI hiding, and **hiding a button is not security**. (Done, lesson
  23. `npm test` = 141. See record 0026.) New route `GET /teams` answers
  `{ id, name, role, can }`; the page draws a button only if the action is in
  `can`, and un-hiding it still gets a 403.
- Rule to remember: **the server sends the answer, never the policy.** `can`
  comes from the same `PERMISSIONS` table the gate uses (`allowedActions`), so
  the front end holds no permission table of its own to let drift.
- Rule to remember: **a list-shaped route needs no gate when the `where`
  clause is the scope.** `where: { userId }` cannot return a row you may not
  see, so an outsider gets `[]` and a `200`, never a 403.
- Rule to remember: **the safety of a cache depends on what the cached value is
  allowed to decide.** `["teams"]` may cache 30 s *because* `can` only draws
  buttons; `["session"]` may not, because it decides what screen you get.
- Rule to remember: **the hint is approximate even when fresh.** `can()` takes
  a target since lesson 9; a flat list has none, so an Admin's `can` holds
  `member:remove` while removing the Owner is still refused.
- Rule to remember: **`staleTime: 0` on the session query.** Anything higher
  is how long a destroyed session still renders a signed-in UI. Measured at
  30s. Auth is the one query with no grace period.
- CSP for the front end, served by nginx. Separate from the API's — and note
  the API's `default-src 'none'` is exactly why the page is NOT served by
  Fastify. Moved to week 11-12 with the nginx cutover.
- Tasks on screen. (Done, lesson 24. No code change at all — the lesson carries
  the files and he types them. See record 0027.) 403 is the gate and runs first;
  404 is the row and is deliberately vague.
- The first write from the page. (Done, lesson 25. See record 0028.) Ticking
  `done` with `PATCH { done: true }`, and `setQueryData` from the reply.
- Rule to remember: **send the value, not the verb.** `{ done: true }`, never
  `/toggle`. A double-click, a retry and a flaky tunnel all send the request
  twice; a value survives that, a verb does not.
- Rule to remember: **if the reply is the new row, `setQueryData` and stop.**
  Invalidating is a second round trip to learn what you are already holding.
  Invalidate only when the write changed something you were not told about.
- Rule to remember: **the cheapest rollback is having nothing to roll back.**
  `checked={task.done}` renders from the cache, only `onSuccess` writes to it,
  so a refused write un-ticks the box with no `onError` at all.
- Creating a task from the page. (Done, lesson 26. See record 0029.) A form,
  `POST /teams/:id/tasks`, and the reply appended to the cache.
- Rule to remember: **a create cannot be made safe to repeat, so the button
  carries the guard.** Measured: the same POST twice = ids 360 and 361, both
  201. `disabled={isPending}` closes the in-flight window. A retry still gets
  through — idempotency keys are week 13.
- Rule to remember: **put the reply in the cache when you know where it goes,
  ask again when you do not.** Appending is right only because `useTasks` asks
  for `sort=id&dir=asc`; under `sort=title` the server puts the new row first.
  First honest use of `invalidateQueries` in the course.
- Rule to remember: **the text being typed lives in `useState`, a server fact
  never does.** And clear it in `onSuccess`, never `onSubmit`, so a 403 leaves
  the sentence on screen.
- Still open from lesson 26: `title: z.string().min(1)` accepts `"   "`.
  `.trim().min(1)` fixes it, and fixes PATCH too since `UpdateTask` reuses
  `CreateTask.shape.title`. Jay's exercise, needs a test.
- Still open: no front-end tests. Vitest + Testing Library once there is a
  second screen. `tsc` and a browser probe are not a suite. The new-task form
  is the first thing worth one.
- Still open: `POST /teams` is uncalled — no way to create a team in the UI.
- Deleting a task from the page. (Done, lesson 28. See record 0031.) A `can`
  gated bin button per row, and `setQueryData` filtering rather than mapping.
- Rule to remember: **idempotent is a promise about the state, not about the
  answer.** Measured: `DELETE` twice is `204` then `404`. The world is the same
  after both, so the retry was safe — and it looked like a failure. Judge a
  retry by the row count, never by the status code.
- Rule to remember: **when the reply is empty, filter by the id you sent.**
  `onSuccess(_nothing, id)` — the second argument. `.data` on a `204` is `""`,
  measured, so `task.id` is `undefined` and the filter keeps every row.
- Rule to remember: **never type a reply that has no body.**
  `api.delete<Task>(url)` compiles clean and is `""` at runtime. A type
  parameter is a claim you made, not a fact TypeScript checked.
- Rule to remember: **an icon-only destructive button names its row.**
  `aria-label={`Delete ${task.title}`}` — "Delete" alone says nothing about
  which task disappears.
- Deliberately not built, both argued in the lesson: no confirm dialog (a speed
  bump; real undo needs a `deletedAt` column and is a server lesson) and no
  optimistic removal (nothing written means nothing to roll back).
- Still open: soft delete + real undo. A genuine future lesson, planted in 28.

## Week 11-12 — Real world (was Docker; Jay moved Docker to the end, 2026-09-10)
- The environment declares itself. (Done, lesson 27 — taken out of order,
  before the container. See record 0030.) `src/config.ts`, one zod schema,
  four variables with no default.
- Finishing it. (Done, lesson 29. See record 0032.) Six leftovers that undid
  lesson 27, found by grep because no test or type could see them.
- Rule to remember: **one fact, one reader.** `config.ts` is the only file that
  may touch `process.env`. Measured: `sessionCookie()` read `config.NODE_ENV`
  and `clearCookie()` read `process.env.NODE_ENV`, and the `Secure` flags
  disagree — a logout that leaves the session cookie alive. Not live on his
  machine, because nothing mutates `process.env`; correct by luck, not design.
- Rule to remember: **snapshot vs live read.** Tenth word pair. The test it
  gives: *can these two readers ever disagree inside one process?*
- Rule to remember: **a second default is the bug, not `??`.** `config.X ?? d`
  where zod already defaulted is dead code that reads as a safety net. Proven
  unreachable: `config.ts` calls `process.exit(1)` before `app.ts` is imported.
  `app.ts:174`/`:189` keep their `??` — those values really can be absent.
- Rule to remember: **dead code has no failing state.** All six leftovers pass
  `tsc` and all 141 tests, with and without them. No green light will ever turn
  red, so: find by grep, then lock down with a test.
- Rule to remember: **a written rule is not enforcement.** `server/CLAUDE.md`
  already said "never `process.env`". Six places broke it, build clean.
  Enforcement is refusing to boot, or a test that fails.
- Rule to remember: **watch the test fail first.** Exercise 3 is ordered so he
  sees `# fail 1` before the one-word fix and 142 after.
- **Jay's decision, 2026-09-10: Docker and deploy move to the END of the
  course.** Asked with four options plus a recommendation; he answered "skip
  Docker, I want to implement this at the end". Nothing container-related is
  installed on this Mac. Do not re-ask — this was a clear answer, not a
  postponement.
- Still open from lesson 29, and he has to type it: the six edits, the new
  `session.test.ts` case (expect 142), `server/.env.example`, and the
  `server/CLAUDE.md` Environment paragraph that lesson 27 made false.
- Pagination, N+1 queries, indexes. (Done, lesson 30. See record 0033.)
  Cursor pagination on `GET /teams/:teamId/tasks`, the `include: { owner: true }`
  that fired a second query selecting `passwordHash`, and `EXPLAIN ANALYZE`.
- Rule to remember: **count to a place, or look one up.** Eleventh word pair.
  Offset walks past 4,980 rows to reach page 250; a cursor jumps to the id.
  Measured: page 2 and page 250 both 2 ms.
- Rule to remember: **the response schema guards the wire, not the query.**
  `TaskPublic` drops the owner, but the hashes already reached Node's memory.
  A field the serializer drops is a field you should not have selected.
- Rule to remember: **a cursor needs a unique order.** `orderBy: [{sort}, {id}]`.
  A non-unique sort key leaves ties in an order Postgres never promised, and a
  cursor into a shifting order skips rows with no error.
- Rule to remember: **`take: limit + 1` answers "is there more?"** without a
  second `COUNT(*)`. Slice it off before sending.
- Rule to remember: **add the index for the `Sort` you measured.** Measured
  32x for `ORDER BY createdAt` — and *slower* for the default `ORDER BY id`,
  where the primary key already walks in order. So the compound index is NOT
  added. Every index also slows every INSERT.
- Still open from lesson 30, and he has to type it: five edits, four test
  fixes (`res.json()` -> `res.json().items`), and `src/routes/task-page.test.ts`.
  Expect 138/4, then 142, then 146.
- Paging the front end. (Done, lesson 31. See record 0034.) `useInfiniteQuery`
  + a "Load more" button, and the named bug from lesson 30 is closed.
- Rule to remember: **a type parameter is a claim you made, not a fact
  TypeScript checked.** Third costume for the same rule (`as CreateTaskInput`
  in 17, `api.delete<Task>()` on a 204 in 28). Measured: making `useTasks`
  infinite and changing nothing else gave **3 type errors, all in the
  component** — the three `setQueryData<Task[]>` calls that are now guaranteed
  to throw passed clean. Inferred types are checked; declared ones are believed.
- Rule to remember: **the cache entry stops being an array.** Measured on
  5.102.8: two keys, `pages` and `pageParams`, and `typeof data.map` is
  `undefined`. The old line throws `TypeError: tasks?.map is not a function`
  inside `onSuccess`, so the write is lost while Postgres already changed.
- Rule to remember: **write the paged shape once.** One `editPages` helper, and
  the three mutations pass a plain `Task[] => Task[]`. Same instinct as lesson
  17's one validator compiler instead of seven `.strict()` calls.
- Rule to remember: **return a new box from a cache updater.** Three spreads —
  the box, the pages array, the page. Mutating `data.pages[0].items` updates the
  cache and re-renders nothing, because React compares references.
- Rule to remember: **create loses its append.** Lesson 26's "last is
  arithmetic" reasoning still holds and is no longer enough: "last" now means
  the last row of the *last* page, which you may not be holding. It becomes
  `invalidateQueries` — measured cost **one request per page held** (3 pages, 3
  calls). Refetching only the last page is the optimisation, deliberately not
  built for a list of five tasks.
- Rule to remember: **`undefined` is the terminator, and the same value at the
  other end means the opposite.** `initialPageParam: undefined` = "first
  request, no cursor"; `getNextPageParam` returning `undefined` = "no next
  page". `nextCursor ?? undefined` is the one line that translates the server's
  word into React Query's.
- Still open from lesson 31, and he has to type it: four edits across
  `web/src/features/tasks/tasks.ts` and `tasks-panel.tsx`. Verified `tsc -b`
  clean, then restored. Plus the three unwritten page tests from lesson 30
  (suite is **143**, should be 146).
- **Lesson 32 shipped: the first front-end test.** Both lesson-31 gaps closed
  first — server suite 143 -> **146** (I wrote the 3 page tests on request), and
  `useCreateTask` had drifted to appending onto the last page *held*; it is
  `invalidateQueries` now.
- Rule to remember: **testability is a property of the import graph.**
  Measured: `node --test` on `tasks.ts` gives
  `ERR_MODULE_NOT_FOUND: Cannot find package '@/lib'`. Node strips TypeScript
  fine (22.23.1); the `@/` alias is a Vite rule, copied into `tsconfig`, and
  Node reads neither. Fix was to move `editPages` into `edit-pages.ts` where
  every import is `import type` — erased, so the file imports nothing at
  runtime. **0 new dependencies, 32 lessons running.**
- Rejected Vitest, measured **34 MB**. Deferred, not refused. **Trigger to
  install it: the first component test** (a click, a rendered row). That needs
  a fake browser and hand-rolling one is silly.
- Rule to remember: **a real `QueryClient` runs under plain `node --test`.**
  No jsdom, no browser. Front-end code needing a browser is a smaller share
  than it feels like.
- Rule to remember: **structural sharing.** The first test corrected lesson 31.
  Measured: an edit that changes nothing returns **the same box**; removing a
  row returns a new box, a new page 0, and **page 1 as the identical object**.
  The three spreads are a proposal — React Query deep-compares and keeps the
  old objects where nothing changed. Assert on contents, not identity.
- Still open, and he types it: `web/src/features/tasks/edit-pages.test.ts`,
  four tests spec'd in lesson 32. All four verified green here first.
  **Session state is now a pair: server 146, web 4.** Plumbing (new file,
  `tasks.ts` edit, `test` script) is already applied and `tsc -b` clean.
- Next lesson: filtering (`?done=`, `?q=`) is the obvious build target, and it
  is the first thing where a query key gains a second dimension.
- Filtering (`?done=`, `?q=`). (Done, lesson 33. `npm test` = **154**, web = 4.
  See record 0036.) **No new dependency, 33 lessons running.** Server side
  applied by me (six lines); the front end is his to type and break.
- Rule to remember: **everything the answer depends on goes in the query key.**
  Measured: with the filter left out, clicking a filter sends **0 requests** --
  same key, same entry, still fresh. No error, no wrong data, the screen just
  does not react. Then "Load more" sends the new filter with the OLD cursor.
- Rule to remember: **a cursor is a bookmark in one list.** Measured against
  real Postgres: `?done=true&cursor=103`, where 103 came from the unfiltered
  list, returned **1 row where 4 belong**. Not an error -- an ordinary request.
- Rule to remember: **a new key resets the paging for free.** Empty entry ->
  no pages -> `initialPageParam` -> no cursor. Nothing to reset, no code.
- Rule to remember: **you know a reply's contents; filters take away its
  membership.** Ticking `done` can move a row out of a `?done=false` list, and
  only the server knows the new list. So `useSetTaskDone` goes back to
  `invalidateQueries` -- lesson 26's rule, second use. Only `useDeleteTask`
  keeps its surgical write, because nothing can want a row that is gone.
- Rule to remember: **coercion converts, parsing decides.** Measured:
  `z.coerce.boolean().parse("false")` is `true`. It is `Boolean()`, and a
  conversion with no failing state is not a check. `z.stringbool()` instead.
- Rule to remember: **Prisma `contains` is case sensitive.** Measured: 2 of 4
  real matches. `mode: "insensitive"` -> `ILIKE`, seen as `~~*` in the plan.
- Rule to remember: **`...(done && { done })` silently drops `done: false`.**
  Test `=== undefined`. And `exactOptionalPropertyTypes` in tsconfig refuses
  `done: undefined` outright, so the spread is load-bearing, not tidiness --
  tsc corrected my own comment on that line while I wrote the lesson.
- Rule to remember: **a `<form>` is the debounce.** The words live in
  `useState` and join the key on submit. One request per Enter, not per letter,
  and still zero `useEffect` in the app.
- `editPages` now takes the **prefix** and uses `setQueriesData`, so a delete
  drops the row from every filter cached. His four lesson-32 tests pass
  unchanged, because an exact key is a prefix of itself.
- One line added for a real bug: `placeholderData: keepPreviousData`. Measured:
  without it a filter switch is `isPending: true` and the panel -- filter bar
  included -- is replaced by "Asking...", leaving no way back.
- **The lesson-26 trim fix is DONE**, asked five times, done without asking a
  sixth. `title: z.string().trim().min(1).max(200)` plus two tests. `PATCH` got
  it free via `CreateTask.shape.title`. Measured the order trap:
  `.min(1).trim()` on `"   "` returns `""` and a 200.
- Still open from lesson 33: `pg_trgm` for `?q=` (named, measured unnecessary
  at this size, not built); every filtered list refetches on any write.
- Structured logs and what may never be in them. (Done, lesson 34. See record
  0037.) pino was already there via Fastify, so: `redact`, a testable log
  stream, and the rule that outranks both.
- Rule to remember: **a log is a second wire out of the app, and it has no
  schema.** Measured on his own lesson-21 line: `request.log.error({ err })`
  printed `err.user.passwordHash` and a full SQL string, while the reply stayed
  clean. Same `catch`, two audiences, one serializer.
- Rule to remember: **log the fields you chose, never a whole object.**
  `{ userId: user.id }`, not `{ user }`. Twelfth word pair: **allowlist vs
  denylist.** Third costume of "name what may go out" — `strict()` in 3,
  `TaskPublic` in 30.
- Rule to remember: **redaction is the net, not the plan.** Measured: a pino
  redact wildcard is ONE level, so `*.passwordHash` misses
  `err.user.passwordHash`; and `**.passwordHash` is not pino syntax — no
  throw, no warning, matches nothing, prints in full. Third member of the
  "no failing state" family (29 dead code, 33 the missing filter).
- Rule to remember: **assert the log is not empty before asserting a secret is
  absent.** `npm test` runs `LOG_LEVEL=silent`, so a log test reads an empty
  stream and passes forever. `buildApp(logStream?)` raises the level, because
  passing a stream means "I intend to read this".
- `exactOptionalPropertyTypes` again, one lesson after 33: `stream: undefined`
  is `TS2769`. Same spread, and this time it caught me, not him.
- Streak intact: **no new dependency, 34 lessons.** pino ships inside Fastify
  and `redact`/`stream` pass straight through the `logger` option, so not even
  an undeclared import.
- Lesson 34's test **is written and is correct** — and `npm test` never ran it.
  (Done, lesson 35. See record 0038.) The suite said 154 where 155 was due.
- Rule to remember: **the shell expands the glob, not the runner.** Measured:
  22 test files on disk, 21 handed to `tsx`. In sh `**` is one level, so
  `src/**/*.test.ts` meant `src/*/*.test.ts` and his top-level file fell out.
  Wrong since lesson 6; every test file until now happened to be one dir deep.
- Rule to remember: **quote every glob you hand to a tool.** Node's own docs
  ask for it. `web/package.json` was already quoted and was never affected —
  and would have escaped anyway, because a pattern matching *nothing* is
  passed through untouched. Luck, not design.
- Rule to remember: **a test you have never seen fail is not a test.** Fourth
  member of the "no failing state" family, and the first where the test itself
  was the thing that did not exist. Three silent passes now named on one page:
  never ran (35), nothing to read (34), nothing asserted (20).
- Streak intact: **no new dependency, 35 lessons.** The fix was two quote
  marks, typed by him.
- Still open from lesson 34/35, and he has to type it: the quotes in
  `server/package.json` (expect **155**), then break `log-redact.test.ts` on
  purpose to prove it is really in the suite.
- Nothing stores the pino output yet. That is the error tracker below.
- He still owes two answers: `pg_trgm` (lesson 33, asked twice — dropped if
  unanswered after 35) and `AuditLog` vs the pino stream (lesson 34). The
  second one gates the audit log page, so ask it first next session.
- Rule to remember: **a `Json` column has two nothings.** SQL NULL is an empty
  cell; JSON `null` is a stored value. `IS NULL` sees only the first. Measured
  on his data: `params` was 0 SQL NULL / 3,960 JSON null across 7,421 rows.
  Prisma: `undefined` or `Prisma.DbNull` -> empty cell, `null` or
  `Prisma.JsonNull` -> the word. Fixed in lesson 37, plus a backfill migration.
- Rule to remember: **a cast is a promise the compiler stops checking.** Both
  bad lines carried `as never`. Seventh "no failing state" bug, and the first
  that lives in stored data rather than in code.
- Moved by lesson 37: the `REVOKE UPDATE, DELETE ON "AuditLog"` goes at the
  **end** of week 13. The lesson-37 backfill is an UPDATE on that table and is
  only possible while it is still writable.
- Streak intact: **no new dependency, 37 lessons.**
- Still owed by him: homework 7 from lesson 36 (`params.id` vs `targetId` —
  carried twice, drop after 38) and homework 8 from lesson 37 (does any column
  genuinely want a stored JSON `null`?).
- The audit log reader. (Done, lesson 38. `GET /teams/:teamId/audit`, new
  `audit:read` action for ADMIN+, cursor on `at DESC, id DESC`, five tests.
  `npm test` = 162. See record 0042.)
- Rule to remember: **seeing is a power, separate from doing.** A MEMBER holds
  `task:delete` and must not hold `audit:read`. First entry in `ACTIONS` that
  is a view, not a verb.
- Rule to remember: **the index the writer chose decides the filters the reader
  may offer.** `@@index([teamId, at])` IS "one team, newest first". `?status=`
  rides inside that range; `route` and `actorEmail` would be full scans.
- Measured: the MEMBER's 403 on the audit route **lands in that team's log** --
  `shouldAudit()` has covered it since lesson 18, twenty lessons before the
  route existed. Seeded 25, read 26.
- Measured gotcha: `at: z.iso.datetime()` is a 500 on every request. The
  serializer parses before it stringifies and Prisma returns a `Date`. Use
  `z.date()`.
- Streak intact: **no new dependency, 38 lessons.**
- Owed by him: homework 7 (`params.id` vs `targetId`, third and last carry --
  drop after 38 whatever happens) and homework 9 (a MEMBER can pump 144k
  refusal rows a day; bug, feature or retention problem?).
- The audit page in the front end. (Done, lesson 39. Three files under
  `web/src/features/audit/`, one union edit, one mount behind
  `can.includes("audit:read")`. `web npm test` = 7. See record 0043.)
- Rule to remember: **a value you pass in is checked, a value that arrives is
  believed.** `can.includes("audit:read")` is TS2345; `at: Date` on a field
  that carries ISO text is silent. Same staleness, one error.
- Rule to remember: **type a wire date as `string`** and convert in one visible
  line. `String.prototype.toLocaleString` exists, so the wrong type prints the
  raw ISO text instead of crashing. Seventh "bug with no error message".
- Measured: an allowed read adds 0 rows to the log; an invite plus two refused
  reads took 4 to 7. `shouldAudit()` = writes and refusals.
- Deferred on purpose, now named: parsing the reply with zod in `queryFn`. It
  is the real cure for a believed type and costs zod in the browser bundle.
  First likely break in the web-side dependency streak.
- Streak intact: **no new dependency, 39 lessons.**
- Runtime validation of replies. (Done, lesson 40. Answered "zod or not" with
  a measurement — 91.5 KB gzip for a full validator vs 0 for a 15-line
  hand-written guard, same bug caught. Streak held at 40 by choice, not
  default. See record 0044.)
- Rule to remember: **a general tool's cost is proportional to its
  generality, not to what one call-site uses of it.** Same family as lesson
  22's lucide-react finding.
- Streak intact: **no new dependency, 40 lessons.**
- Owed by him: homework 9 (144k refusal rows a day), the direct ask to
  explain "hint vs gate" in his own words, and lesson 40's naming exercise
  (one other believed type still in the app).
- Append-only audit log: database roles and privileges. (Done, lesson 41 —
  an experiment lesson, nothing shipped to `server/` yet. See record 0045.)
- Rule to remember: **a revoke on the table's OWNER works.** Measured on a
  throwaway copy of his database: `relacl` goes `NULL` -> `{tasks=arxtm/tasks}`
  and `DELETE` answers `42501 permission denied`. My prior said owners were
  immune; the probe said otherwise.
- Rule to remember: **TRUNCATE is a separate privilege.** Revoke DELETE and one
  word still empties the table. Revoke `UPDATE, DELETE, TRUNCATE` together.
- Rule to remember: **the owner grants it back in one line.** So revoking from
  your own role guards mistakes, not attackers. The wall is a second role that
  owns nothing and cannot grant itself anything.
- Rule to remember: **a privilege nothing uses is free to take away.** Measured:
  with the REVOKE applied his suite is 161 pass / 3 fail, and all three are
  `prisma.auditLog.deleteMany` in *test cleanup*. Zero routes delete an audit
  row.
- Measured: his live log is **6,664 rows / 2,864 kB / 4 days / 13 users**,
  1,639 of them `403`. **Homework 9 is answered: retention**, and retention
  needs DELETE in a different role, on a schedule, off the request path.
- Owed by him: lesson 40's two `audit-row.test.ts` tests (web is 7, should be
  9), the probe run itself, "hint vs gate" in his own words (third ask).
- Next lesson (42), specified by 41: create `tasks_app`, wire it in as its own
  config value (migrations and tests stay on the owner `tasks`), `ALTER DEFAULT
  PRIVILEGES` for future tables, and the test that proves a delete is refused.
  Two experiment lessons in a row is the ceiling — 42 lands real code.
- Streak intact: **no new dependency, 41 lessons.**

### Lesson 42 — done (2026-09-11)
- `APP_DATABASE_URL` added to `src/config.ts`, required, no default. `src/db.ts`
  picks the login by job: `NODE_ENV === "test"` -> owner, else `tasks_app`.
  `npm test` script now sets `NODE_ENV=test`.
- New `src/db.test.ts`, four tests on its own `pg.Client` as `tasks_app`:
  SELECT ok, INSERT ok (rolled back), DELETE / UPDATE / TRUNCATE / CREATE TABLE
  all `42501`. **`npm test` 162 -> 166.**
- Measured: `process.loadEnvFile()` never overwrites a shell variable.
- Measured: as `tasks_app`, `GRANT DELETE` on itself is a `WARNING`, not an
  error. The grant-back hole from lesson 41 is closed by ownership, not by SQL.
- Verified on a real boot (port 3001): `pg_stat_activity` shows `tasks_app`,
  and a 401 still reaches the audit log.
- Owed by him: rotate the `tasks_app` password (it is the word `tasks_app`),
  and one sentence naming a gate that is still only a hint.
- Next lesson (43): open. Candidates, oldest first — the **projects screen**
  (still the one route group with no UI), the **retention job** (now fully
  specified: connects as `tasks`, on a schedule, off the request path), or
  Redis for the two in-process counters. Lesson 42 shipped code, so an
  experiment lesson is allowed again.
- Streak intact: **no new dependency, 42 lessons.**

### Lesson 43 — done (2026-09-11)
- `AUDIT_RETENTION_DAYS` added to `src/config.ts`, **default 90, min(1)** — the
  first config value that deliberately breaks the lesson-27 no-default rule.
  0 days would mean "older than now", i.e. every row.
- New `src/audit/retention.ts` (`pruneAuditLog`, own `pg.Client` on the OWNER
  login) and `src/audit/prune.ts` (4 lines, what cron calls). New script
  `npm run audit:prune`. **`npm test` 166 -> 169.**
- Scheduler is **cron**, already on the machine. No scheduler package.
- Measured: log is now **7,292 rows / 2,960 kB / 4 days** (~1,800/day).
  `older than 3 days` = 1,162. As `tasks_app` the same DELETE is `42501`.
- Extracted `.warn` into `assets/lesson.css` — first homework that destroys
  real data.
- Owed by him: **rotate the `tasks_app` password (second ask)**, the crontab
  line he installs, and one sentence on where a regulator would find the
  retention period.
- Next lesson (44): open. 43 shipped code, so an experiment is allowed.
  Candidates, oldest first — the **projects screen** (still the one route group
  with no UI, and now the oldest open item by a wide margin), the `CHECK`
  constraint on the JSON columns, or Vitest for a first component test.
- Streak intact: **no new dependency, 43 lessons.**

### Lessons 44-50 — CUT (2026-09-17)
- A Postgres storage-internals arc (VACUUM, bloat, index size, ANALYZE,
  statistics). Off-mission, and Jay asked to skip it. See record 0055.
- **Files deleted** (lessons and records 0048-0054), same day, on his
  instruction. 44-50 is a deliberate gap in the numbering.
- Kept line: **an index is a bet on selectivity, and the planner bets on a
  stored guess.**
- **Next lesson (51): the projects screen.** Oldest open item — `Project` has
  routes, store, schema and a migration, and no UI at all.

### Lesson 51 — the projects screen (2026-09-17)
- **Measured before writing:** `"Project"` has **0 rows**. Model, migration,
  store, two routes, six tests, a permission rule — and nobody has ever made
  one, because there is no `GET` route and no `project:read` action.
- Rule to remember: **a permission table is a list of the verbs you happened
  to write.** `ACTIONS` has create and delete for Project because those were
  the two routes. No tool can see the gap — every check compares the code to
  itself.
- Rule to remember: **a `where` clause is a scope only when you chose its
  value.** `GET /teams` needs no gate (`where: { userId }`, from the session);
  `GET /teams/:teamId/projects` needs one (`where: { teamId }`, from the URL).
  Same query shape, opposite answer. IDOR by another name.
- Rule to remember: **a permission test should fail when you widen a role.**
  Measured: adding `project:read` to VIEWER took 170 -> **168 pass, 2 fail** —
  `can.test.ts` (deny-everything-but loop over `ACTIONS`) and
  `team-list.test.ts` (`deepEqual(mine.can, ["task:read"])`). Fourth costume of
  the allowlist rule. Fix names the second read, never loosens the loop.
- Verified here by applying the whole server change and reverting it:
  typecheck clean, `npm test` **172**, then reverted to 170 and re-run green.
  React reviewed, not executed.
- **Found, his to fix (step 0):** `npm run typecheck` has been **red since
  lesson 43** — `src/audit/retention.test.ts:49`, TS18048 twice. Tests pass, so
  nothing surfaced it.
- Suite was **170**, not the 169 this plan recorded. He added one.
- Left out on purpose and named in the lesson: delete button, paging,
  `Task.projectId`, `project:update`.
- Owed by him, **third ask**: rotate the `tasks_app` password.
- Next lesson (52): open. Oldest candidates — **no way to create a team from
  the page** (`POST /teams` has only ever been called by a test), Redis for the
  two in-process counters, or Vitest for a first component test.
- Streak intact: **no new dependency, 51 lessons.**

- Background job: email invites (BullMQ + Redis).
- ~~Structured logs~~ **DONE in lesson 34.** Still to come: one error tracker
  (Sentry free) — and it is the first thing that will *keep* these lines.

## Week 13-14 — Polish and prove it
- OpenAPI docs. Postman collection.
- README with the threat model and the RBAC table.
- Idempotency keys for `POST`, planted in lesson 26.
- Soft delete + real undo (`deletedAt`), planted in lesson 28.
- Front-end tests: **started in lesson 32** with `node --test` and 0 new
  dependencies. Vitest + Testing Library is still open, deferred on purpose —
  install it for the first *component* test (a click, a rendered row).
- ~~The lesson-26 trim fix~~ **DONE in lesson 33**, with two tests.

## Week 15-16 — Docker + deploy (moved here by Jay, 2026-09-10)
- Dockerfile for the API. docker-compose with Postgres.
- Env vars and secrets. Migrations on deploy.
- Deploy to Fly.io. Point a domain. HTTPS.
- The container tool is still an open choice: OrbStack (~50-80 MB idle),
  Docker Desktop (~2 GB VM), or no local Docker at all (Fly builds remotely
  from a Dockerfile). Ask when we get there, do not pick for him.
- Note from lesson 29: HTTPS is the first environment where the cookie-flag
  mismatch would have been visible. Config being honest is a prerequisite here,
  not a nicety — a missing `-e` flag is the most common deploy mistake.

### Lesson 53 — compose, and Postgres in a box (2026-09-17)
- Jay confirmed the Docker install from 52 is done (Docker Desktop, not
  OrbStack). `Dockerfile`, `.dockerignore`, `.env.docker` all on disk.
- New: `server/compose.yaml` — `db` (postgres:17, named volume `pgdata`,
  healthcheck) + `api` (`build: .`, `env_file: .env.docker`, `depends_on`
  `service_healthy`). `.env.docker` rewritten to point at `db:5432`.
- Rule to remember: **an address that only resolves where you are standing is
  a note, not a configuration.** `host.docker.internal` is a Docker Desktop
  invention; a compose service name is real on a server and in CI.
- Rule to remember: **a grant is a statement about rows that exist; a default
  privilege is a statement about rows that do not yet.** Lesson 41's
  `tasks_app.sql` was written against a full database. On an empty one the
  `GRANT ... ON ALL TABLES` silently grants nothing and `ALTER DEFAULT
  PRIVILEGES` does the whole job. Record 0057.
- Rule to remember: **init runs once per volume, and a failed init leaves a
  non-empty volume.** Only undo is `down -v`.
- Rule to remember: start order is not readiness. `condition: service_healthy`.
- `migrate deploy`, never `migrate dev`, anywhere a deploy can reach.
- The lesson-41 SQL is split: `tasks_app.sql` (init-safe) and new
  `audit-lockdown.sql` (after migrate).
- **Zero TypeScript changed. Suite stays 172.** `npm test` keeps running
  against the Mac's Postgres on purpose.
- **Not executed by me:** no docker CLI on this shell's PATH, so the compose
  file and the command sequence are reviewed, not run. Jay runs them; the
  `REVOKE`-aborts-init failure is predicted, and the lesson tells him to watch
  for it in the log.
- Left out on purpose and named: migrations on start, the front end as a third
  service, a test database in compose, real secrets.
- Owed by him, **fourth ask**: rotate the Mac's `tasks_app` password.
- Next lesson (54): open. Strongest candidates — **migrations on container
  start** (the one deploy decision this lesson deferred and the natural
  sequel), the front end + `deploy/nginx.conf` as a third service, or the
  actual Fly.io deploy.
- Streak intact: **no new dependency, 53 lessons.** Compose ships with Docker.

### Lesson 54 — migrations on container start (2026-09-17)
- His pick from three candidates, same day as 53. Chosen because he had just
  lived the failure: the seed crashed on `findUniqueOrThrow` for
  `jay@example.com` — a **stale image**. `COPY . .` ran before that line
  existed, `up` never rebuilds. Lesson opens with his own error text.
- New file `server/docker-entrypoint.sh` (4 lines): `set -e`,
  `prisma migrate deploy`, `prisma db execute --file prisma/sql/audit-lockdown.sql`,
  `exec "$@"`. Dockerfile gains `RUN chmod +x` + `ENTRYPOINT`.
- The `db execute` line gives `audit-lockdown.sql` — homeless after 53's split —
  a home, and needs no `psql` in the API image.
- **Executed and measured this time** (docker is on PATH in this session):
  full `down -v` → `up --build` boot applies 15 migrations, runs the revoke,
  then serves; `restart` prints `No pending migrations to apply.`;
  `\dp "AuditLog"` shows `tasks_app=ar`.
- **Measured the race**: two `compose run` containers started together on an
  empty volume both exited 0, one migrated, the other found nothing pending.
  Prisma's Postgres **advisory lock**. The lesson says it was measured.
- Real failure kept in the lesson: Prisma 7 removed `--schema` from
  `db execute`. My first entrypoint had it; container `Exited (1)` and never
  served. That is `set -e` earning its line.
- Rule to remember: **an image is a photograph of your source, not a window
  onto it.** `up --build` while editing.
- Rule to remember: **automate the step that must happen everywhere; keep your
  hand on the step that must happen nowhere but here.** Migrations start
  themselves, the seed never does.
- Rule to remember: `ENTRYPOINT` is what the container always does, `CMD` is
  what it does by default. That split keeps `compose run --rm api <cmd>` working.
- **No app code written by me.** `server/` was restored to its pre-lesson state
  after measuring (entrypoint removed, Dockerfile reverted); Jay writes both.
  The one file left behind is `prisma/sql/audit-lockdown.sql`, which he asked
  for by name while fixing 53. His stack is left up, seeded and healthy.
- Left out on purpose and named: rollback, a wait-for-db loop, a separate
  migration job (Fly's `release_command`), the front end.
- Next lesson (55): the front end as a third service + `deploy/nginx.conf`, or
  the Fly.io deploy. Migrations-on-start was the blocker for the deploy, so
  either is now open.
- Streak intact: **no new dependency, 54 lessons.**

### Lesson 55 — the database leaves the laptop (2026-09-17)
- **Host decision made by Jay: Render (free) + Neon (free), not Fly.io.**
  Researched before asking: Fly's free tier ended 2024 (trial is 2 VM-hours or
  7 days), a shared-cpu-1x machine is ~$2/mo, and **Fly Managed Postgres starts
  at $38/mo**. Render free web services build a Dockerfile, give managed TLS,
  750 instance-hours/month, and **sleep after 15 min idle (~1 min cold start)**.
  Render's free Postgres **expires 30 days after creation**, so the database is
  Neon: permanent free plan, 0.5 GB, 100 compute-hours, no credit card.
  PLAN's old line "Fly.io or Render" is settled: **Render**.
- **Split the deploy in two.** 55 moves the database only; 56 moves the app.
  Reason is not pacing — `prisma/sql/tasks_app.sql` names the database `tasks`
  and the role `tasks`, and on Neon the second one would have succeeded while
  doing nothing. See record 0058.
- Portable SQL via psql automatic variables: `:"DBNAME"` and `:"USER"`.
  **Measured** against his running container (`CREATE ROLE`, `GRANT`,
  `ALTER DEFAULT PRIVILEGES` all succeeded) before it went in the lesson.
- Neon's two endpoints map onto his two existing URLs with nothing to invent:
  `DATABASE_URL` → direct (migrations need the advisory lock on one
  connection), `APP_DATABASE_URL` → `-pooler` (every request).
- **The `tasks_app` password rotation finally happened** — Jay asked for it in
  the lesson. Neon enforces ~60 bits, so it is a wall, not a sixth nag.
  `openssl rand -base64 18`.
- `NODE_ENV=development` and `TRUST_PROXY=false` stay wrong-on-purpose until
  there is a real proxy. Lesson 29's cookie pairing lands in 56.
- Zero TypeScript. Suite stays **172**. Streak intact: **no new dependency, 55
  lessons.**
- Lesson 56: Render. git repo (nothing is version-controlled yet — `gh` is
  installed), Root Directory `server`, Dockerfile build, dashboard env vars
  instead of `.env.docker`, `HOST=0.0.0.0` + Render's `PORT`, then
  `NODE_ENV=production` + `TRUST_PROXY=true` + HTTPS together.

### Lesson 56 — the app leaves the laptop (2026-09-18)
- **Render free web service, built from the existing `Dockerfile`.** Root
  Directory `server`, which makes the build context `server/` — the same
  context compose gives it, so `COPY package*.json ./` and
  `server/.dockerignore` are unchanged. No new file in the repo.
- **First git repository in this workspace**, private, whole workspace,
  `gh repo create --private --source=. --push`. `.gitignore` gains `.env` and
  `.DS_Store` **before** `git init`. Rehearsal step taught:
  `git add -A` then `git status --short | grep -i env`, read the index, then
  commit. `add` is reversible, `commit` is forever.
- Env retyped in the dashboard: eight values. `PORT` deliberately **unset**
  (Render sets it, default 10000), `APP_PASSWORD` **dropped** — it existed for
  psql at container init and Neon has no init. `config.ts`'s `try/catch` around
  `loadEnvFile()` already handles a world with no env file.
- **`HOST=0.0.0.0` or the deploy fails**: "Port scan timeout reached, no open
  ports detected". A *port* message for a *host* mistake — named in the lesson
  so the error text is recognisable on sight.
- **Render is never told this app has migrations.** `ENTRYPOINT` does it; the
  dashboard's Docker Command field overrides `CMD` only. Lesson 54's split
  paying off on a platform that has never heard of it.
- `NODE_ENV=production` + `TRUST_PROXY=true` + `ALLOWED_ORIGINS` flip together.
  `Secure` on the session cookie is **emitted for the first time**, seven
  lessons after it was written.
- **The failure that defines lesson 57**: local Vite page (`VITE_API_URL`)
  against the deployed API — login 200, next request 401. Not CORS, not
  `Secure`: `SameSite=Lax`, because `localhost:5173` and `onrender.com` are
  different *sites*. Fix is one origin, not `SameSite=None`.
- Rule to remember: **a deploy does not break your code, it stops your
  assumptions from being true.**
- Rule to remember: **on your laptop you pick the address; on a platform you
  are told the address.**
- Facts checked against Render's own docs, not memory: 750 instance-hours,
  15 min spin-down, ~1 min wake, `PORT` default 10000, the `0.0.0.0`
  requirement, Root Directory semantics. See record 0059.
- **No app code written by me and nothing executed** — the Render account,
  repo and deploy are his to do. Every claim about *his* files
  (`config.ts` default, `EXPOSE 3000`, `session.ts` `Secure`, helmet's HSTS,
  `web/src/lib/api.ts`'s `VITE_API_URL`) was read out of the files first.
- Left out on purpose and named: the front end, a real `tsc` build step,
  `render.yaml`, health-check path, and a keep-awake cron (720 h in a month vs
  750 free).
- Next lesson (57): page and API on **one origin** — `deploy/nginx.conf`,
  unused since 53, or a second Render service with a proxy rule.
- Suite stays **172**. Streak intact: **no new dependency, 56 lessons.**
