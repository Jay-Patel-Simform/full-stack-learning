# 0070 — Leaving is not removing, so it is its own action

Date: 2026-09-18
Status: accepted
Lesson: [67 — The door marked exit](../lessons/0067-the-door-marked-exit.html)
Closes: "an owner cannot leave their own team (equal rank)", open in PLAN.md
since week 5–6

## Context
The plan carried one line for forty lessons: *"Still open: an owner cannot
leave their own team (equal rank). Decide if that needs a `member:leave`
action."* Checked against the code before writing, and the note undersold the
bug.

## Decision
- **Nobody can leave a team, and for two unrelated reasons.** `VIEWER` and
  `MEMBER` never had `member:remove` at all, so the permissions table refuses
  them. `ADMIN` and `OWNER` pass the table and die on lesson 9's rank rule,
  because `rank(role) <= rank(target)` is a tie against yourself at every role.
  One symptom, two causes — hidden by lesson 8's deliberate "one reply for two
  different noes". A fix aimed only at the rank rule would free two roles.
- **A new action, not an exception in the gate.** `member:leave` added to
  `ACTIONS` and granted on `VIEWER`, so all four roles inherit it. The
  rejected patch (`if (params.userId === request.userId) return`) was argued
  down with three named costs: `can()` stops being the answer, `allowedActions`
  can never tell the UI the button exists, and there is nowhere to put the one
  refusal that must survive.
- **The action passes no target**, so the rank rule stays out entirely. That is
  correct rather than convenient: the rule exists to stop you acting on a peer
  or a superior, and it has nothing to say about an act with one person in it.
  Second action with no target, after `team:delete`.
- **The last owner is refused with `409`, not `403`.** The permission is fine —
  every role has `member:leave` — and what refuses them is the state of the
  team. Promote somebody and the identical request succeeds, which is exactly
  what `409 Conflict` means and what `403` would hide.
- **`SELECT id FROM "Team" WHERE id = ${teamId} FOR UPDATE` inside the
  transaction.** Named in the lesson as the line that is easy to omit and
  impossible to notice: at Postgres's default READ COMMITTED, two owners
  leaving together both count two owners, both delete a different row, and
  both commit. The team ends with zero owners and no error anywhere.
- `leaveTeam` returns `"gone" | "missing" | "last-owner"`, not a boolean — the
  route has three things to say, and a boolean would force a second read
  racing the first.
- `owners < 2`, not `owners === 1`: same answer today, survives the day a bug
  leaves a team with zero owners.
- **The front end gets it free.** `GET /teams` already sends
  `can: allowedActions(role)` and `TeamMembership` types `can` as
  `z.enum(ACTIONS)`, so the new action flows out with no route change. The
  type-only `Action` union in `web/src/features/teams/teams.ts` must gain
  `"member:leave"` by hand — that copy is deliberate and typed-only, but it is
  still a copy.
- Five tests, expect **179**. Case 3 (sole owner) asserts the `409` **and**
  that the membership row survived — a store that refused and deleted anyway
  would pass a one-assertion test.

## Rules to remember
- **When one symptom has two causes, you have two bugs.** The identical 403 is
  good for attackers and quietly misleading for you.
- **Leaving and removing are different acts that happen to delete the same
  row.** Count the nouns: remove has an actor and a target, leave has only an
  actor.
- **Nobody outranks themselves, ever.** An action about yourself carries no
  target, or it is permanently impossible.
- **403 is about the actor, 409 is about the world.** A 403 tells the user to
  find an admin; a 409 tells them what to change.
- **A transaction is atomicity, not isolation.** Twelfth word pair. The test it
  gives: *could two of these run at once and both read the same "before"?*

## Consequences
- The deliberate red step is step 5: delete the `FOR UPDATE` line and watch the
  suite stay green. Third time in three lessons a green suite has failed to see
  a real hole (29's dead code, 66's untested limit, now a race). The line is
  kept because it was reasoned about, not because something went red.
- **Transferring ownership is now the obvious next hole** and is deliberately
  not built: promoting somebody to `OWNER` is an owner handing out their own
  rank, which the rank rule forbids. A second deliberate exception, its own
  lesson.
- Deleting the team when the last owner leaves was rejected as a data-loss
  trap. Owners already have `team:delete` if that is what they want.

## Measured afterwards (the code was written, not just taught)
Implemented and run. **182 pass, `tsc --noEmit` clean** — the lesson predicted
179 because it was counting from 172 rather than the 174 his own
`csp-report.test.ts` had already made it. Corrected in the lesson.

**Two existing tests went red, and both were right to.** `can.test.ts` ("a
viewer can read and nothing else") and `team-list.test.ts` ("a shorter can
list") each hard-code the exact set of actions a `VIEWER` holds — which is
precisely what this change alters. Fixed the expectations, never the table.
That is the permissions table doing its job: **you cannot widen a role in this
codebase without a test telling you that you did.** Worth naming to him as the
payoff for `PERMISSIONS` being code rather than data.

The `FOR UPDATE` line's red step cannot be run by a single-threaded suite, as
the lesson says. It stays because it was reasoned about, not because anything
went red — the fourth time a green suite has failed to see a real hole.
