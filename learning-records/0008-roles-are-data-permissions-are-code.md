# Roles are data, permissions are code

Lesson 7 (2026-09-02) added `server/src/auth/can.ts` and `can.test.ts`.
10 new tests, `npm test` = 18. No migration, no route change, nothing wired in.

## The decision
Week 5-6 of PLAN.md is RBAC: a permission table, one `can()`, every route calls
it. That is three moves. Lesson 7 shipped **only the pure function**, and
deliberately left the API not calling it.

Reason: `can(role, action)` is the one piece of RBAC that needs no database, no
server and no cookie. So it is fully testable in isolation, which makes it the
cheapest possible first win and the natural home for the *decision vs
enforcement* split. Wiring it in first would have meant a `Membership` migration
before he had anything to check, and the honest sequencing is the other way
round.

Order set for weeks 5-6:
1. **L7** — `can(role, action)` + table + tests. (Done.)
2. **L8** — `Team` + `Membership(role)` migration, `Role` as a Postgres enum,
   read the role for the current user/team, `requireRole`-style enforcement in
   the routes, 403.
3. **L9** — the third argument. `can(user, action, resource)`: "Admin cannot
   remove Owner", "you may edit a task you own". Pulls the `where: { id,
   ownerId }` IDOR fix out of `task.store.ts` into a visible, testable rule.

## Resource gap closed
RESOURCES.md had "no trusted end-to-end RBAC-in-Node reference found yet.
Candidates: Casbin, Oso Authorization Academy. Check before week 5." Checked.

Picked **[Oso Authorization Academy — RBAC](https://www.osohq.com/academy/what-is-rbac)**
as primary. Free, no signup, language-agnostic, and its four-stage model
(organizational → cross-organization → resource-specific → custom roles) gives
weeks 5-6 a spine: Jay is building stage 2, and can now *name* stages 3-4 as
not-yet instead of meeting them as scope creep. Its `is_allowed(actor, action,
resource)` matches the mission's own wording.

Rejected **Casbin** — a policy DSL plus a dependency to learn, for four fixed
roles. Same argument as argon2 and `@fastify/cookie`: the mapping *is* the
content, and a policy engine hides it. Revisit only if custom roles land.

Secondary: [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)
— source of the deny-by-default quote, and the grading sheet for week 7-8.

Note OWASP now says "ABAC and ReBAC should typically be preferred for
application development" over RBAC. Not surfaced in lesson 7 — RBAC is what the
mission asks for and what the roles list describes. Surface it in week 7-8, once
lesson 9 has shown him a relationship rule (`ownerId`) that RBAC could not
express. He will have felt the reason by then.

## Teaching points to re-use
- **"Roles are data, permissions are code."** The line to test him on. Payoff
  stated concretely: nobody grants themselves a power by editing a row, because
  the powers are not in rows.
- **"Ask about the job, not the badge."** `can(role, "member:invite")` over
  `isAdmin(user)`. Reframes the same "make the safe thing the default" move as
  [[0003-declare-the-wall-not-remember-it]] and
  [[0007-sessions-not-jwt-because-revocation]], now at the API-design level
  rather than the schema level. Fourth use of that framing; still landing.
- **The bad version was shown first.** `if (user.role !== "ADMIN")` in a route,
  then killed with three named reasons. He writes front ends, so he has almost
  certainly written this shape — starting from it beats starting from the clean
  answer.
- **`Record<Role, readonly Action[]>` as the type-level wall.** Explicitly tied
  back to `NOT NULL` in lesson 3. Homework step 4 makes him add a fifth role and
  read the `tsc` error, so the wall is felt, not described.
- **Property tests introduced.** "every action is granted to somebody" and "more
  senior roles never lose a power" check a shape over 36 combinations rather than
  one fact each. First time he has seen this; named the technique out loud. Good
  ground for week 5-6's RBAC test matrix and for the week 7-8 self-attack.
- **`as const` + `typeof X[number]`** to derive a type from a list. Framed as the
  same one-source rule as `z.infer` (lesson 2). Do not let him hand-write a
  parallel union.

## The cliffhanger, on purpose
Homework 6 asks him to write "an Admin cannot remove an Owner" as a test of
`can` — a mission rule that is **impossible** in a two-argument function — and
to write down what the function is missing. This is the whole motivation for
lesson 9's third argument, and it is much better felt than told. Expect an
answer near "it does not know the other person's role". If he gets it, lesson 9
opens with his own sentence.

Homework 7 asks what is missing before a route can call `can()`. Answer: a
team id and a role for this user — i.e. `Membership`. That is lesson 8, and he
should arrive having named it himself.

## Loose ends deliberately left
- **`can()` is called nowhere.** Said out loud in the lesson, twice, so it is
  not mistaken for done. Lesson 8 closes it. Do not let this sit more than one
  session — an untouched authorization function is a false sense of progress,
  and fluency without wiring is exactly the illusory-mastery trap.
- **No `Team`, no `Membership`, no `Project`.** PLAN.md week 1-2 listed Project
  and Team models that were never built (tasks went straight to `ownerId`).
  Lesson 8 has to build them. Flag: `Task` will need a `projectId`, which is a
  **required column on a table with rows** — third time that has bitten. Either
  make it nullable or reset the dev database, and say which and why.
- **Role is not a Postgres enum yet.** It is a TS union only. Lesson 8 should
  make it `enum Role` in `schema.prisma`, so the "wall in the database" and the
  "wall in the type system" appear side by side.
- **Actions list is speculative.** `project:*`, `member:*` and `team:delete`
  have no routes behind them. Justified as the design of the table, but the
  "every action is granted to somebody" test is the only thing keeping them
  honest. If any is still unused by week 8's end, delete it.
- **`?? false` is unreachable today.** Kept with a comment as the trust-boundary
  belt for a role string read from Postgres. Lesson 8 must either validate that
  string with zod on the way out of the database, or keep the guard. Do not let
  him delete it without picking one.

Evidence: lessons/0007-one-place-that-says-no.html,
reference/rbac-permissions.html, server/src/auth/can.ts,
server/src/auth/can.test.ts.