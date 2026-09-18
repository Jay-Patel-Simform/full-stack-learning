// Run with: npm test
// These are the first tests that go through a real route. can.test.ts proves
// the decision; these prove the *enforcing* -- that a route actually answers
// 403 and stops. A correct rule nobody calls protects nothing.
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../db.ts";
import { buildApp } from "../app.ts";
import { COOKIE_NAME, createSession } from "../auth/session.ts";
import { hashPassword } from "../auth/password.ts";
import type { Role } from "../auth/can.ts";

const app = await buildApp();
const stamp = Date.now();

// One user per role, plus an outsider who is in no team at all.
const cookies: Record<string, string> = {};
const ids: Record<string, number> = {};
let teamId = 0;

async function makeUser(who: string): Promise<number> {
  const user = await prisma.user.create({
    data: {
      email: `${who}-${stamp}@example.com`,
      passwordHash: await hashPassword("correct horse battery"),
    },
  });
  const { id } = await createSession(user.id);
  cookies[who] = `${COOKIE_NAME}=${id}`;
  ids[who] = user.id;
  return user.id;
}

before(async () => {
  await app.ready();
  for (const who of ["owner", "admin", "member", "viewer", "outsider"]) {
    await makeUser(who);
  }
  // The owner makes the team through the API, so the route is under test too.
  const created = await app.inject({
    method: "POST",
    url: "/teams",
    headers: { cookie: cookies.owner! },
    payload: { name: `team-${stamp}` },
  });
  assert.equal(created.statusCode, 201);
  teamId = created.json().id;

  // Seed the other three roles straight into the table. Going through the
  // invite route would test the gate with the gate, which proves nothing.
  for (const who of ["admin", "member", "viewer"]) {
    await prisma.membership.create({
      data: { teamId, userId: ids[who]!, role: who.toUpperCase() as Role },
    });
  }
});

after(async () => {
  await prisma.team.deleteMany({ where: { id: teamId } });
  await prisma.user.deleteMany({ where: { email: { contains: `-${stamp}@` } } });
  await app.close();
  await prisma.$disconnect();
});

function invite(who: string, userId: number) {
  return app.inject({
    method: "POST",
    url: `/teams/${teamId}/members`,
    headers: { cookie: cookies[who]! },
    payload: { userId, role: "MEMBER" },
  });
}

function removeTeam(who: string) {
  return app.inject({
    method: "DELETE",
    url: `/teams/${teamId}`,
    headers: { cookie: cookies[who]! },
  });
}

test("no cookie is 401, not 403", async () => {
  // The two gates answer differently on purpose: 401 means "I do not know
  // you", 403 means "I know you, and no".
  const r = await app.inject({ method: "DELETE", url: `/teams/${teamId}` });
  assert.equal(r.statusCode, 401);
});

test("a viewer cannot invite", async () => {
  const r = await invite("viewer", ids.outsider!);
  assert.equal(r.statusCode, 403);
  assert.equal(r.json().error, "forbidden");
});

test("a member cannot invite either", async () => {
  assert.equal((await invite("member", ids.outsider!)).statusCode, 403);
});

test("a viewer cannot remove a member", async () => {
  const url = `/teams/${teamId}/members/${ids.member}`;
  const r = await app.inject({ method: "DELETE", url, headers: { cookie: cookies.viewer! } });
  assert.equal(r.statusCode, 403);
});

test("a member cannot delete the team", async () => {
  assert.equal((await removeTeam("member")).statusCode, 403);
  // and the team is still there
  assert.ok(await prisma.team.findUnique({ where: { id: teamId } }));
});

test("an admin cannot delete the team", async () => {
  assert.equal((await removeTeam("admin")).statusCode, 403);
});

test("a stranger gets 403, not 404", async () => {
  // Same reply as a wrong role. An outsider must not learn that this team
  // exists, so the gate never says "no such team".
  assert.equal((await removeTeam("outsider")).statusCode, 403);
});

test("an admin can invite", async () => {
  const r = await invite("admin", ids.outsider!);
  assert.equal(r.statusCode, 201);
  assert.equal(r.json().role, "MEMBER");
});

test("inviting the same person twice is 409", async () => {
  assert.equal((await invite("admin", ids.outsider!)).statusCode, 409);
});

test("a bad role name never reaches the database", async () => {
  const r = await app.inject({
    method: "POST",
    url: `/teams/${teamId}/members`,
    headers: { cookie: cookies.owner! },
    payload: { userId: ids.outsider, role: "GOD" },
  });
  assert.equal(r.statusCode, 400); // the zod wall, not a 500 from Postgres
});

// --- lesson 9: the gate now loads the target ------------------------------

function removeMemberAs(who: string, targetId: number) {
  return app.inject({
    method: "DELETE",
    url: `/teams/${teamId}/members/${targetId}`,
    headers: { cookie: cookies[who]! },
  });
}

test("an admin cannot remove the owner", async () => {
  const r = await removeMemberAs("admin", ids.owner!);
  assert.equal(r.statusCode, 403);
  // Status and state. A route that deleted the row and then complained would
  // pass a status-only test.
  assert.ok(
    await prisma.membership.findUnique({
      where: { teamId_userId: { teamId, userId: ids.owner! } },
    }),
  );
});

test("an admin cannot invite somebody as an owner", async () => {
  const r = await app.inject({
    method: "POST",
    url: `/teams/${teamId}/members`,
    headers: { cookie: cookies.admin! },
    payload: { userId: ids.outsider, role: "OWNER" },
  });
  assert.equal(r.statusCode, 403);
});

test("an admin can still remove a member", async () => {
  const r = await removeMemberAs("admin", ids.viewer!);
  assert.equal(r.statusCode, 204);
  assert.equal(
    await prisma.membership.count({
      where: { teamId, userId: ids.viewer! },
    }),
    0,
  );
});

test("removing somebody who is not in the team is 404", async () => {
  // No membership means no target role, so the rank rule stays quiet and the
  // handler answers for itself. 404 here, not 403 -- the owner is allowed to
  // ask; there is simply nobody to remove.
  const r = await removeMemberAs("owner", ids.viewer!);
  assert.equal(r.statusCode, 404);
});

test("the owner can delete the team, and only last", async () => {
  const r = await removeTeam("owner");
  assert.equal(r.statusCode, 204);
  assert.equal(await prisma.team.findUnique({ where: { id: teamId } }), null);
  // memberships cascaded away with it
  assert.equal(await prisma.membership.count({ where: { teamId } }), 0);
});
