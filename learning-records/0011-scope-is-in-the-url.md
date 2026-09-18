# Scope lives in the URL, and a required column lands in three steps

Lesson 10 (2026-09-02), last of week 5-6. `npm test` = 50 (was 40),
`npm run typecheck` clean, `npm run lint` clean (only pre-existing warnings).
One migration: `20260902103929_task_team`.

## The framing that carried the lesson
Same counting move as lesson 9, one step out. Lesson 9: the rule needed a
*target* and the function had no room for it. Lesson 10: the rule needs a
*scope* and the **URL** had no room for it.

> A permission is never "may Jay delete tasks". It is "may Jay delete tasks
> *here*". Drop the *here* and the question has no answer.

That is why `/tasks/5` could never be gated: `requirePermission` reads
`:teamId` out of the params, and there was none. The route move to
`/teams/:teamId/tasks` is not tidiness, it is the missing argument again.
Noted for reuse: **count the nouns in the rule, then count the places your
code can hold one** — this is the third lesson where that found the bug.

## The migration — the real content
`Task.teamId` is `NOT NULL` on a table with 5 rows and 0 teams. Prisma refused,
and the refusal was shown verbatim in the lesson because it is not an error, it
is Postgres being correct.

Three ways out were tabled with costs. He was asked to pick in lesson 9
homework. We took **expand / backfill / contract**, written by hand via
`prisma migrate dev --create-only`, and the reason given was explicitly *not*
"your five rows matter" — it was **this is the one that still works with users
on the other end**. Muscle memory now, not at 3am.

Since there were zero teams, the backfill had to *invent* one (`Legacy`) plus
memberships for the three users who had written tasks. That turned into the
line worth keeping:

> A backfill is never a technical step. It is you writing down an assumption
> about the past, in SQL, permanently.

Nothing was deleted. All 5 rows survived, which was chosen over the easier
"drop the rows" specifically so the non-destructive habit is the default one.

## Ownership came out of the store — homework 5, paid off
`where: { id, ownerId }` is gone from `task.store.ts`. It was a permission rule
in a query: unfindable, outside `can()`, untested. Lesson 7's mistake in a new
hat.

The subtle part, and the thing most likely to need re-teaching: the replacement
`where: { id, teamId }` **looks identical and is not**. A four-row table drove
it home — *may you?* vs *which rows?*, decided-here vs decided-upstream. Named
the distinction out loud: **permission** vs **scoping**. He now has a word for
each, and both are in the glossary.

`ownerId` stays as a column. It is a fact about who typed it; it just stopped
deciding anything.

## Behaviour changes worth knowing
- **Any MEMBER can now edit a task somebody else wrote.** Deliberate, stated in
  the lesson, and has a test. It is what "roles are scoped to a team" means. If
  author-only editing is ever wanted, it is a new field on `Resource`, not a
  `where` clause — said in the lesson at that exact spot.
- **A task id from another team is 404, not 403.** The gate already said yes to
  the team that *was* named; the row simply is not in it. 403 would confirm the
  id exists elsewhere. That is the IDOR leak.
- Four task routes now carry `requirePermission("task:*")` with **no loader**.
  A task holds no role, so the third argument sits out — exactly like
  `team:delete`. Lesson 9's optional-argument design cost nothing here, which
  is the payoff of that 36-comparison "old answers survived" test.
- `onDelete: Cascade` on `Task.team`, plus `@@index([teamId])` because every
  list query filters on it.

## Test-suite gotcha, cost real time
`tasks.test.ts` is a **new file**, on purpose — node:test would otherwise let
`teams.test.ts`'s team-deleting last test wreck the fixture. But node:test runs
files **in parallel processes**, and both files stamp their fixture users with
`Date.now()`. My `deleteMany({ email: { contains: '-<stamp>@' } })` cleanup
deleted the *other* file's users mid-run. Symptom: 15 sudden 401s in a file I
had not touched. Fix: match on a per-file prefix as well as the stamp. Comment
left in the file. Worth telling him before he writes his third test file.

## Deliberately left open
- **`Project` still does not exist.** `project:create` / `project:delete` are
  now the *only* two unwired actions, and the lesson makes him count them.
  Homework question 1 forces the week-6 decision: build it or delete the rows.
  Do not let this slide a fourth time.
- **Self-removal** — still impossible (equal rank), still unanswered from
  lesson 9, still pointed at the community.
- **Private tasks** — homework question 2, and it is a trap on purpose: the
  answer he would have given before this lesson is "the `where` clause".

## Sources added
Prisma's *Customizing migrations* doc is the primary read — it is literally the
`--create-only` move. PlanetScale's backwards-compatible-changes post gives the
pattern its name for people with real users. OWASP IDOR Prevention names the
attack the new 404 test defends.

Evidence: lessons/0010-a-task-belongs-to-a-team.html,
reference/prisma-postgres.html, reference/rbac-permissions.html,
server/prisma/schema.prisma,
server/prisma/migrations/20260902103929_task_team/migration.sql,
server/src/routes/tasks.route.ts, server/src/routes/tasks.test.ts,
server/src/store/task.store.ts, server/src/schemas/task.schema.ts,
server/prisma/seed.ts.
