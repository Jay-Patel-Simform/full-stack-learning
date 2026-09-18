# A role belongs to the pair, not the person

Lesson 8 (2026-09-02) wired `can()` into the API. Migration
`20260902085121_team_membership`, four new routes, 10 new route tests.
`npm test` = 28, `npm run typecheck` clean.

## The decision
`role` is **not** a column on `User`. It is a `Membership(teamId, userId, role)`
join row with a composite primary key, and `Role` is a Postgres enum.

Reason: a person holds a different role in each team, and one column holds one
answer. This is Oso's stage two, *cross-organization roles* — named out loud in
the lesson so stages three and four stay labelled as not-yet rather than
arriving as scope creep. The wrong shape (`User.role String`) was shown first
and killed, same move as lesson 7's inline `if (user.role !== "ADMIN")`.

`Role` as a Postgres enum, not `String`, closes the loose end flagged in
[[0008-roles-are-data-permissions-are-code]]. The payoff was framed
concretely rather than as tidiness: a stored typo makes `can()` deny by default,
which locks out a real admin **silently**. Three walls now guard the same four
names — zod at the door, TypeScript at compile time, the enum in the table — and
the lesson says what each one catches that the others cannot see.

## Single source of truth for the role names
`can.ts` no longer types the four names. It imports `Role` from
`src/generated/prisma/enums.ts` and keeps `ROLES` as
`[...] as const satisfies readonly Role[]`. `Record<Role, readonly Action[]>`
then forces an entry per role, so **the database schema drives the build**: add
`BILLING` to the enum, `PERMISSIONS` stops compiling.

This upgrades lesson 7's homework (where he added a fifth role to a hand-written
list) into the real thing. Same lesson, one level deeper — worth pointing at
explicitly if he asks why the file changed.

## Scope: teams, not tasks
Deliberately built the four routes where `can()` actually bites and no more:
`POST /teams`, `POST /teams/:teamId/members`,
`DELETE /teams/:teamId/members/:userId`, `DELETE /teams/:teamId`.

`Task` was **left alone**. Making `Task` team-scoped means a required column on
a table with rows — the third-time-bitten problem flagged in record 0008 — plus
re-pathing every task route. Doing both in one lesson would have blown working
memory and buried the RBAC idea under a data migration. So the mission's
"Member cannot delete a team" now passes over HTTP, and task-level checks wait.

`Project` still does not exist. PLAN.md week 1-2 listed it; nothing has needed
it yet. Left out on purpose — `project:create` / `project:delete` remain
unused actions, kept honest only by the "every action is granted to somebody"
test. Decide by the end of week 6: build `Project`, or delete those two actions.

## Teaching points to re-use
- **"The role belongs to the pair."** The line to test him on. It generalises:
  any fact about two things is a row about two things.
- **Hook choice as a lesson, not a detail.** `requireAuth` is `onRequest`;
  `requirePermission` must be `preHandler`, because it needs a validated numeric
  `teamId`. Given as a three-row lifecycle table. Rule stated as "pick the hook
  by what it needs, not by habit" — reusable in week 7-8 for rate limiting
  (which wants `onRequest`, before body parsing).
- **A factory that returns a hook.** First higher-order function in the project.
  Introduced only because it makes the route read as the job name, which is the
  lesson 7 promise being cashed.
- **Same 403 for a wrong role and for a stranger.** Tied straight back to
  lesson 6's single login error message. Second use of "one reply for two
  different noes" — this framing is landing, keep it.
- **Assert the status *and* the state.** The member-cannot-delete test also
  checks the team row survives, with the reason in a comment: a route that
  deletes then complains would pass a status-only test. Good ground for the
  week 7-8 self-attack, where he will grade his own curl output.
- **Decision tests vs enforcement tests.** Named the two kinds out loud.
  `can.test.ts` = pure, no database. `teams.test.ts` = real request through
  `app.inject()`, real Postgres. "A perfect rule that no route calls protects
  nothing" — that sentence is the bridge between lesson 7 and 8.
- **The bad-shape-first move worked again** (fifth use). Keep it.

## Small fix rolled in
`DELETE` handlers returned `undefined`, which Fastify sends as `200`, not `204`
— caught by the new route test asserting `204`. Fixed in `teams.route.ts` **and**
`tasks.route.ts`, since it was the same bug in both. Worth mentioning if he asks
why tasks changed: a status you never set is a status you never checked.

## The cliffhangers, on purpose
Two homework questions, both impossible with today's code:

1. **What must change about `Task` before a team role can guard it — and what
   happens to the rows already there?** Answer wanted: a `teamId` (or
   `projectId`) required column, and either a nullable column, a backfill, or a
   dev-database reset. This is the data-migration lesson he has now dodged three
   times, and he should meet it having asked the question himself.
2. **Where must the *target's* role be fetched, and by whom — route, gate, or
   store?** He already knows (record 0008, homework 6) that `can()` cannot see
   the target. This asks the follow-up that lesson 9 is actually about: the
   resource has to be **loaded before the decision**, which means the gate can
   no longer be a pure `(action) => hook` factory. Expect him to reach for the
   route. Lesson 9's real content is why that is the wrong place.

## Loose ends deliberately left
- **An ADMIN can remove the OWNER through the live API.** Marked with a
  `ponytail:` comment in `teams.route.ts` naming lesson 9 as the fix. This is a
  real hole shipped knowingly, and the lesson says so twice. Do not let it live
  past lesson 9.
- **`can(role, "task:*")` is still called nowhere.** Only the `member:*` and
  `team:delete` actions have routes. Half the table is still unwired.
- **No `GET /teams` and no `GET /teams/:teamId/members`.** He cannot list what
  he has made without `psql` or a test. Cheap to add; add it when a front end
  needs it (week 9-10), not before.
- **`?? false` in `can()` survives.** Record 0008 said lesson 8 must either zod-
  validate the role coming out of Postgres or keep the guard. Kept the guard,
  and the enum now makes a junk value nearly impossible — but "nearly" is why
  the belt stays. Still do not let him delete it without saying which.
- **No `GET` route is permission-checked**, because there are none. When
  `task:read` gets a route, `requirePermission` needs the `:teamId` in the path,
  which is another reason task routes must move under `/teams/:teamId/`.

Evidence: lessons/0008-a-role-is-a-row.html, reference/rbac-permissions.html,
server/prisma/schema.prisma,
server/prisma/migrations/20260902085121_team_membership/migration.sql,
server/src/auth/can.ts, server/src/auth/require-permission.ts,
server/src/store/team.store.ts, server/src/schemas/team.schema.ts,
server/src/routes/teams.route.ts, server/src/routes/teams.test.ts.
