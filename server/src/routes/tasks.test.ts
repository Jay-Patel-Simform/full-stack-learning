// Run with: npm test
// Lesson 10. The task routes now live under a team, so every one of them is
// an enforcement test: does the gate actually stop the request?
//
// A separate file from teams.test.ts on purpose. node:test runs each file in
// its own process, so this fixture cannot be broken by that file's last test
// deleting its team.
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
let teamId = 0;
let otherTeamId = 0;
let taskId = 0;
let otherTeamTaskId = 0;

async function makeUser(who: string): Promise<number> {
  const user = await prisma.user.create({
    data: {
      email: `t10-${who}-${stamp}@example.com`,
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
  for (const who of ["owner", "member", "viewer", "outsider"]) await makeUser(who);

  const team = await prisma.team.create({
    data: { name: `t10-${stamp}`, members: { create: { userId: ids.owner!, role: "OWNER" } } },
  });
  teamId = team.id;
  for (const who of ["member", "viewer"]) {
    await prisma.membership.create({
      data: { teamId, userId: ids[who]!, role: who.toUpperCase() as Role },
    });
  }

  // A second team the outsider owns. This is the IDOR fixture: a real task,
  // a real team, and our people are in neither.
  const other = await prisma.team.create({
    data: {
      name: `t10-other-${stamp}`,
      members: { create: { userId: ids.outsider!, role: "OWNER" } },
    },
  });
  otherTeamId = other.id;
  const stray = await prisma.task.create({
    data: { title: "not yours", teamId: otherTeamId, ownerId: ids.outsider! },
  });
  otherTeamTaskId = stray.id;
});

after(async () => {
  await prisma.team.deleteMany({ where: { id: { in: [teamId, otherTeamId] } } });
  // startsWith too, not just the stamp: node:test runs the test files in
  // parallel, and teams.test.ts stamps its users with Date.now() as well.
  // Two files starting in the same millisecond would delete each other's
  // users mid-run, which shows up as a baffling 401.
  await prisma.user.deleteMany({
    where: { AND: [{ email: { startsWith: "t10-" } }, { email: { contains: `-${stamp}@` } }] },
  });
  await app.close();
  await prisma.$disconnect();
});

function post(who: string, team = teamId, title = "a task") {
  return app.inject({
    method: "POST",
    url: `/teams/${team}/tasks`,
    headers: { cookie: cookies[who]! },
    payload: { title },
  });
}

function patch(who: string, id: number, team = teamId) {
  return app.inject({
    method: "PATCH",
    url: `/teams/${team}/tasks/${id}`,
    headers: { cookie: cookies[who]! },
    payload: { done: true },
  });
}

function remove(who: string, id: number, team = teamId) {
  return app.inject({
    method: "DELETE",
    url: `/teams/${team}/tasks/${id}`,
    headers: { cookie: cookies[who]! },
  });
}

test("no cookie is 401", async () => {
  const r = await app.inject({ method: "GET", url: `/teams/${teamId}/tasks` });
  assert.equal(r.statusCode, 401);
});

test("a member can create a task", async () => {
  const r = await post("member");
  assert.equal(r.statusCode, 201);
  taskId = r.json().id;
});

test("a viewer can read but cannot create", async () => {
  assert.equal(
    (
      await app.inject({
        method: "GET",
        url: `/teams/${teamId}/tasks`,
        headers: { cookie: cookies.viewer! },
      })
    ).statusCode,
    200,
  );
  assert.equal((await post("viewer")).statusCode, 403);
});

test("a viewer cannot edit or delete a task", async () => {
  assert.equal((await patch("viewer", taskId)).statusCode, 403);
  assert.equal((await remove("viewer", taskId)).statusCode, 403);
});

test("an outsider gets 403 on a team they are not in", async () => {
  // Not 404. The same reply as a wrong role, so an outsider cannot use the
  // status code to find out which teams exist.
  assert.equal((await post("outsider")).statusCode, 403);
  assert.equal(
    (
      await app.inject({
        method: "GET",
        url: `/teams/${teamId}/tasks`,
        headers: { cookie: cookies.outsider! },
      })
    ).statusCode,
    403,
  );
});

test("a task id from another team is 404, not 200", async () => {
  // The IDOR test. The gate said yes -- the member really is a MEMBER of this
  // team -- and the store still refuses, because the row is not in this team.
  // This is the rule that used to live as `where: { ownerId }`.
  assert.equal((await patch("member", otherTeamTaskId)).statusCode, 404);
  assert.equal((await remove("member", otherTeamTaskId)).statusCode, 404);
  // and the stray task is untouched
  const still = await prisma.task.findUnique({ where: { id: otherTeamTaskId } });
  assert.equal(still?.title, "not yours");
});

test("a member may edit a task somebody else wrote", async () => {
  // The rule changed on purpose. Before lesson 10 only the author could touch
  // it. Now the team can, because the role holds the power, not the authorship.
  const mine = await post("owner");
  const id = mine.json().id;
  assert.equal((await patch("member", id)).statusCode, 200);
  assert.equal((await remove("member", id)).statusCode, 204);
});

test("the list only shows this team's tasks", async () => {
  const r = await app.inject({
    method: "GET",
    url: `/teams/${teamId}/tasks`,
    headers: { cookie: cookies.member! },
  });
  assert.equal(r.statusCode, 200);
  assert.ok(!r.json().items.some((t: { title: string }) => t.title === "not yours"));
});

test("a task cannot exist without a team", async () => {
  // The NOT NULL wall, checked from the code side. Prisma will not even build
  // this query, so the check is a type error too -- hence the cast.
  await assert.rejects(() =>
    prisma.task.create({ data: { title: "orphan", ownerId: ids.owner! } as never }),
  );
});

test("deleting the team takes its tasks with it", async () => {
  // onDelete: Cascade. Run this last -- it destroys the fixture.
  const r = await app.inject({
    method: "DELETE",
    url: `/teams/${teamId}`,
    headers: { cookie: cookies.owner! },
  });
  assert.equal(r.statusCode, 204);
  assert.equal(await prisma.task.count({ where: { teamId } }), 0);
});
