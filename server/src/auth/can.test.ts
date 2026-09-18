import assert from "node:assert/strict";
import test from "node:test";
import { ACTIONS, ROLES, can, type Action, type Role } from "./can.ts";

// A pure function needs no database, no server, no cookie jar. That is the
// point of keeping the decision separate from the route that enforces it.

// * The reads a VIEWER gets. Name them here; the loop below still refuses
// * every other action, so widening a role has to come through this line.
// Everything the lowest rung may do. Lesson 67 added member:leave here: it is
// not a read, but it is granted at VIEWER so nobody is held in a team by their
// role. The name stays READS because the other two are, and renaming it would
// touch more lines than it is worth.
const READS = ["task:read", "project:read", "member:leave"] as const;

test("no role is no permission", () => {
  for (const action of ACTIONS) {
    assert.equal(can(undefined, action), false, `undefined allowed ${action}`);
  }
});

test("an unknown role is denied", () => {
  // The cast is the whole test: pretend a junk string got out of the database.
  assert.equal(can("SUPERUSER" as Role, "task:read"), false);
});

test("a viewer can read and nothing else", () => {
  for (const action of READS) assert.equal(can("VIEWER", action), true);
  for (const action of ACTIONS) {
    if ((READS as readonly string[]).includes(action)) continue;
    assert.equal(can("VIEWER", action), false, `viewer allowed ${action}`);
  }
});

test("a viewer cannot edit", () => {
  assert.equal(can("VIEWER", "task:update"), false);
});

test("a member cannot delete the team", () => {
  assert.equal(can("MEMBER", "team:delete"), false);
});

test("a member cannot invite", () => {
  assert.equal(can("MEMBER", "member:invite"), false);
  assert.equal(can("ADMIN", "member:invite"), true);
});

test("only the owner can delete the team", () => {
  const allowed = ROLES.filter((r) => can(r, "team:delete"));
  assert.deepEqual(allowed, ["OWNER"]);
});

test("every role can read tasks", () => {
  for (const role of ROLES) {
    assert.equal(can(role, "task:read"), true, `${role} cannot read`);
  }
});

test("every action is granted to somebody", () => {
  // Catches a typo in the table: an action nobody can do is dead code, and a
  // route that checks it would be locked shut forever.
  for (const action of ACTIONS) {
    assert.ok(
      ROLES.some((role) => can(role, action)),
      `no role can ${action}`,
    );
  }
});

test("more senior roles never lose a power", () => {
  // ROLES is ordered least to most powerful. Each role must allow everything
  // the one before it allowed.
  ROLES.forEach((role, i) => {
    if (i === 0) return;
    const previous = ROLES[i - 1] as Role;
    for (const action of ACTIONS) {
      if (can(previous, action)) {
        assert.ok(can(role, action), `${role} lost ${action as Action}`);
      }
    }
  });
});

// --- lesson 9: the third argument ---------------------------------------
// The resource is the *thing being acted on*. These are still pure tests:
// no database, no request. Only the rule.

test("an admin cannot remove the owner", async () => {
  // The whole point of lesson 9. The table says ADMIN may remove members.
  // The rank rule says: not that one.

  assert.equal(can("ADMIN", "member:remove"), true); // no target given
  assert.equal(can("ADMIN", "member:remove", { targetRole: "OWNER" }), false);
});

test("equal rank is a no", () => {
  assert.equal(can("ADMIN", "member:remove", { targetRole: "ADMIN" }), false);
  assert.equal(can("OWNER", "member:remove", { targetRole: "OWNER" }), false);
});

test("you may act on anyone below you", () => {
  assert.equal(can("ADMIN", "member:remove", { targetRole: "MEMBER" }), true);
  assert.equal(can("OWNER", "member:remove", { targetRole: "ADMIN" }), true);
});

test("the table is checked before the rank", () => {
  // A VIEWER outranks nobody, but it would not matter: VIEWER is not granted
  // member:remove at all, so question one already said no.
  assert.equal(can("VIEWER", "member:remove", { targetRole: "VIEWER" }), false);
});

test("an admin cannot invite somebody as owner", () => {
  // Same rule, different route. Here the "target" is the role being handed
  // out, so this stops an admin promoting a stranger above themselves.
  assert.equal(can("ADMIN", "member:invite", { targetRole: "MEMBER" }), true);
  assert.equal(can("ADMIN", "member:invite", { targetRole: "ADMIN" }), false);
  assert.equal(can("ADMIN", "member:invite", { targetRole: "OWNER" }), false);
});

test("a missing target leaves the old answer alone", () => {
  // Every lesson-8 call passed two arguments. None of them may change.
  for (const role of ROLES) {
    for (const action of ACTIONS) {
      assert.equal(
        can(role, action, {}),
        can(role, action),
        `${role}/${action} changed when given an empty resource`,
      );
    }
  }
});

test("a junk target role loses to everyone", () => {
  // rank() returns -1, so the caller always outranks it. Deny-by-default is
  // about the *actor*; a target we cannot read must not block a real owner.
  assert.equal(
    can("OWNER", "member:remove", { targetRole: "SUPERUSER" as Role }),
    true,
  );
});
