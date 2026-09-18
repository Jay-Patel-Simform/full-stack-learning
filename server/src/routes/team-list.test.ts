// Run with: npm test
// GET /teams is the route the front end needs before it can be role-aware,
// and it is the first route with NO permission gate on purpose: the where
// clause is the scope. These tests hold that claim down, and the last one is
// the whole of lesson 23 -- what `can` leaves out is still refused.
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../db.ts";
import { buildApp } from "../app.ts";
import { COOKIE_NAME, createSession } from "../auth/session.ts";
import { hashPassword } from "../auth/password.ts";

const app = await buildApp();
const stamp = Date.now();

const cookies: Record<string, string> = {};
const ids: Record<string, number> = {};
let teamId = 0;

before(async () => {
  await app.ready();
  for (const who of ["owner", "viewer", "outsider"]) {
    const user = await prisma.user.create({
      data: {
        email: `list-${who}-${stamp}@example.com`,
        passwordHash: await hashPassword("correct horse battery"),
      },
    });
    ids[who] = user.id;
    cookies[who] = `${COOKIE_NAME}=${(await createSession(user.id)).id}`;
  }
  const team = await prisma.team.create({
    data: {
      name: `list-team-${stamp}`,
      members: {
        create: [
          { userId: ids.owner!, role: "OWNER" },
          { userId: ids.viewer!, role: "VIEWER" },
        ],
      },
    },
  });
  teamId = team.id;
});

after(async () => {
  await prisma.team.deleteMany({ where: { id: teamId } });
  await prisma.user.deleteMany({
    where: { email: { contains: `-${stamp}@` } },
  });
  await app.close();
  await prisma.$disconnect();
});

const list = (who?: string) =>
  app.inject({
    method: "GET",
    url: "/teams",
    ...(who ? { headers: { cookie: cookies[who]! } } : {}),
  });

test("no cookie is 401", async () => {
  assert.equal((await list()).statusCode, 401);
});

test("the owner gets the team and the role they hold there", async () => {
  const r = await list("owner");
  assert.equal(r.statusCode, 200);
  const mine = r.json().find((t: { id: number }) => t.id === teamId);
  assert.equal(mine.name, `list-team-${stamp}`);
  assert.equal(mine.role, "OWNER");
  assert.ok(mine.can.includes("team:delete"));
});

test("the viewer gets the same team with a shorter can list", async () => {
  const mine = (await list("viewer"))
    .json()
    .find((t: { id: number }) => t.id === teamId);
  assert.equal(mine.role, "VIEWER");
  // member:leave is in here from lesson 67 -- a VIEWER may always show itself
  // the door. Note the list is still a HINT: it says what the UI may offer,
  // never what the API will allow.
  assert.deepEqual(mine.can, ["task:read", "project:read", "member:leave"]);
});

test("somebody in no team gets an empty list, not a 403", async () => {
  // Nothing was refused. There was nothing to refuse: the join returned no
  // rows, so the team the outsider cannot see is a team they never hear of.
  const r = await list("outsider");
  assert.equal(r.statusCode, 200);
  assert.deepEqual(r.json(), []);
});

test("the reply carries no column the UI was not promised", async () => {
  // The serializer parses through TeamMembership, so a userId or a createdAt
  // added to the query later cannot leak by accident.
  const mine = (await list("owner"))
    .json()
    .find((t: { id: number }) => t.id === teamId);
  assert.deepEqual(Object.keys(mine).sort(), ["can", "id", "name", "role"]);
});

test("what `can` leaves out, the gate still refuses", async () => {
  // Lesson 23, in one test. The viewer's `can` has no member:invite, so the
  // UI hides the button -- and the route says 403 to somebody who calls it
  // anyway. Two independent facts. Only the second one is security.
  const mine = (await list("viewer"))
    .json()
    .find((t: { id: number }) => t.id === teamId);
  assert.ok(!mine.can.includes("member:invite"));

  const r = await app.inject({
    method: "POST",
    url: `/teams/${teamId}/members`,
    headers: { cookie: cookies.viewer!, origin: "http://localhost:5173" },
    payload: { userId: ids.outsider, role: "VIEWER" },
  });
  assert.equal(r.statusCode, 403);
  assert.equal(await prisma.membership.count({ where: { teamId } }), 2);
});
