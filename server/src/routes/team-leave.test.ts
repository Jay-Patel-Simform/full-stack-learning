// Run with: npm test
// Lesson 67. Before member:leave existed, *nobody* could leave a team, for two
// unrelated reasons: VIEWER and MEMBER never had member:remove at all, and
// ADMIN and OWNER passed the table only to die on the rank rule, because you
// are always exactly equal to yourself. These tests lock both halves down.
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../db.ts";
import { buildApp } from "../app.ts";
import { COOKIE_NAME, createSession } from "../auth/session.ts";
import { hashPassword } from "../auth/password.ts";
import type { Role } from "../auth/can.ts";

const app = await buildApp();
const stamp = Date.now();

const cookies: Record<string, string> = {};
const ids: Record<string, number> = {};
// Two teams: one with a single owner (who must be trapped), one with two.
let soloTeamId = 0;
let sharedTeamId = 0;

async function makeUser(who: string): Promise<number> {
  const user = await prisma.user.create({
    data: {
      email: `leave-${who}-${stamp}@example.com`,
      passwordHash: await hashPassword("correct horse battery"),
    },
  });
  const { id } = await createSession(user.id);
  cookies[who] = `${COOKIE_NAME}=${id}`;
  ids[who] = user.id;
  return user.id;
}

function leave(who: string, teamId: number) {
  return app.inject({
    method: "DELETE",
    url: `/teams/${teamId}/members/me`,
    headers: { cookie: cookies[who]! },
  });
}

async function isMember(teamId: number, userId: number): Promise<boolean> {
  const row = await prisma.membership.findUnique({
    where: { teamId_userId: { teamId, userId } },
    select: { userId: true },
  });
  return row !== null;
}

before(async () => {
  await app.ready();
  for (const who of ["owner", "coowner", "viewer", "outsider"]) {
    await makeUser(who);
  }

  // The owner makes both teams through the API, so POST /teams stays exercised.
  for (const name of ["solo", "shared"]) {
    const created = await app.inject({
      method: "POST",
      url: "/teams",
      headers: { cookie: cookies.owner! },
      payload: { name: `leave-${name}-${stamp}` },
    });
    assert.equal(created.statusCode, 201);
    if (name === "solo") soloTeamId = created.json().id;
    else sharedTeamId = created.json().id;
  }

  // Seed straight into the table. Going through the invite route would test
  // the gate with the gate, which proves nothing.
  await prisma.membership.create({
    data: { teamId: soloTeamId, userId: ids.viewer!, role: "VIEWER" as Role },
  });
  await prisma.membership.create({
    data: { teamId: sharedTeamId, userId: ids.coowner!, role: "OWNER" as Role },
  });
});

after(async () => {
  await prisma.team.deleteMany({ where: { id: { in: [soloTeamId, sharedTeamId] } } });
  await prisma.user.deleteMany({ where: { email: { contains: `-${stamp}@` } } });
  await app.close();
  await prisma.$disconnect();
});

test("a VIEWER can leave, and the team stops being listed", async () => {
  const res = await leave("viewer", soloTeamId);
  assert.equal(res.statusCode, 204);

  const teams = await app.inject({
    method: "GET",
    url: "/teams",
    headers: { cookie: cookies.viewer! },
  });
  assert.ok(!teams.json().some((t: { id: number }) => t.id === soloTeamId));
});

test("leaving twice is 403, because the second time you are a stranger", async () => {
  // ! NOT 404. After the first leave there is no membership row, so getRole
  // ! returns undefined and can() refuses in the GATE -- the store is never
  // ! reached. Asserting 404 here would be asserting a bug.
  const res = await leave("viewer", soloTeamId);
  assert.equal(res.statusCode, 403);
});

test("the sole OWNER is refused with 409 and stays a member", async () => {
  const res = await leave("owner", soloTeamId);
  assert.equal(res.statusCode, 409);
  assert.match(res.json().error, /last owner/i);

  // ! The assertion that actually matters. A store that answered 409 and
  // ! deleted the row anyway would pass the status check above.
  assert.ok(await isMember(soloTeamId, ids.owner!));
});

test("one of two OWNERs may leave", async () => {
  const res = await leave("owner", sharedTeamId);
  assert.equal(res.statusCode, 204);
  assert.ok(!(await isMember(sharedTeamId, ids.owner!)));

  // ...and the one left behind is now the last owner, so they are trapped.
  const second = await leave("coowner", sharedTeamId);
  assert.equal(second.statusCode, 409);
});

test("a stranger leaving a team they are not in is 403", async () => {
  const res = await leave("outsider", sharedTeamId);
  assert.equal(res.statusCode, 403);
});