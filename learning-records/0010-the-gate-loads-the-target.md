# The gate loads the target, not the handler

Lesson 9 (2026-09-02) added the third argument to `can()`. No migration.
`npm test` = 40 (was 28), `npm run typecheck` clean, `npm run lint` clean
(only pre-existing warnings).

## The decision
`can(role, action, resource?)`, where `Resource = { targetRole?: Role }`.
Two questions, in order: does the table grant the action, then does the actor
outrank the target. The rank rule can only *subtract* permission.

The rule is one comparison, not a special case: **you may only act on somebody
strictly below you**. `rank` is `ROLES.indexOf(role)` — derived, not a second
hand-typed map, same move as importing `Role` from the Prisma enum in lesson 8.
Consequence worth remembering: **the order of `ROLES` is now load-bearing**, not
documentation. Homework 3 asks him to write the test that pins it.

Equal rank is a no. That was chosen deliberately over "strictly above blocks":
it also stops an admin removing a fellow admin, and stops anyone granting a peer
a role level with their own.

## Where the resource is fetched — the actual lesson
He predicted (record 0009, homework 2) that the route was the tempting place.
It is, and it is wrong for exactly lesson 7's reason, one level up: *a handler
only runs after the gate said yes, so a check in a handler is a gate you can
forget*. This is the third use of "make the safe thing the default, the unsafe
thing deliberate" applied to *placement* rather than to a default value.

So `requirePermission(action, load?)` takes an optional `Load`:
`(request) => Promise<Resource>`. Two shipped:
- `targetMember` — reads `:userId` from params, calls `getRole`. For remove.
- `grantedRole` — reads `role` from the body. For invite.

`can()` stays pure. Named out loud: the reason it does not fetch its own target
is that `can.test.ts` runs with no Postgres. Decision pure, enforcement dirty.

## The free second fix
The invite route had the same hole and neither of us had named it: an ADMIN
could invite a stranger as OWNER, i.e. promote past themselves in one request.
`grantedRole` closed it with **zero change to `can()`**. This is the payoff of
writing a rule instead of a special case, and the lesson says so at that exact
moment. Strong evidence for the "name the action, not the role" habit — reuse.

## Loose end closed
The `ponytail:` comment in `teams.route.ts` admitting an ADMIN could remove the
OWNER is **gone**. Shipped hole, knowingly carried for one lesson, closed on
schedule. Told him to go and look at the diff: a closed hole should leave a
visible scar.

## Behaviour changes worth knowing
- Removing a non-member is now **404, not 403** for a permitted actor. No
  membership → `targetRole` undefined → rank rule sits out → handler answers.
  Has a test. Note this reveals membership to an ADMIN+, which is fine — they
  are already inside the team.
- A junk `targetRole` (unreadable value) yields `rank` `-1`, so the actor wins.
  Deliberate and stated: deny-by-default protects against an unreadable
  **actor**; an unreadable **target** must not lock a real owner out.

## Test that matters most
`"a missing target leaves the old answer alone"` — loops every role × every
action and asserts `can(r, a, {}) === can(r, a)`. 36 comparisons, four lines.
The framing given to him: *when you change the shape of the most
security-critical function in the codebase, prove the old answers survived.*
Reusable whenever a signature grows an optional argument.

Test-ordering gotcha hit while writing: the new route tests had to be spliced
**before** `"the owner can delete the team, and only last"`, because node:test
runs a file top to bottom and that test destroys the fixture. Worth mentioning
if he adds tests and sees three sudden 403/404s.

## Deliberately not in this lesson
- **`Task` is still not team-scoped.** Third lesson running. It is now the only
  thing left in week 5–6, and homework question 2 asks him to name three ways to
  add a `NOT NULL` column to a table with rows and pick one. Lesson 10 is that.
- **Ownership rules still hide in the store.** `where: { id, ownerId }` in
  `task.store.ts` is a permission rule outside `can()`, with no test. Homework 5
  makes him say *why that is the same mistake* as a check in a handler. Do not
  let lesson 10 ship without pulling it out.
- **`Project` still does not exist.** `project:create` / `project:delete` still
  unwired. End-of-week-6 decision, now overdue: build it or delete the actions.
- **Self-removal is impossible** — equal rank means an owner cannot leave their
  own team. Left as homework question 1, framed as genuinely arguable and
  pointed at the community, not answered. If he says "bug", the fix is a
  `member:leave` action, not a hole in the rank rule.

## Sources added
NIST's subject/operation/object framing opened the lesson — it makes the missing
argument feel structural rather than like a forgotten `if`. Oso stage three
(*Resource-Specific Roles*) is the primary read, framed as "you took half a step
into this; see where it goes and notice you need not go there yet".

Evidence: lessons/0009-the-third-argument.html, reference/rbac-permissions.html,
server/src/auth/can.ts, server/src/auth/can.test.ts,
server/src/auth/require-permission.ts, server/src/routes/teams.route.ts,
server/src/routes/teams.test.ts.
