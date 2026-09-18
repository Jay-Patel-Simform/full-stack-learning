// The gate is already proven in teams.test.ts. These test the two things
// only projects can get wrong: who may create vs delete, and whether a
// delete can reach across teams.
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../db.ts";
import { buildApp } from "../app.ts";
import { COOKIE_NAME, createSession } from "../auth/session.ts";
import { hashPassword } from "../auth/password.ts";
import type { Role } from "../auth/can.ts";

const app = await buildApp();
// The "p" keeps this file's rows apart from teams.test.ts, which tags its
// own with the same millisecond. Without it the cleanup below deletes theirs.
const stamp = `p${Date.now()}`;

const cookies: Record<string, string> = {};
const ids: Record<string, number> = {};
let teamId = 0;
let otherTeamId = 0;

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

const create = (who: string, team = teamId, name = `proj-${stamp}`) =>
  app.inject({
    method: "POST",
    url: `/teams/${team}/projects`,
    headers: { cookie: cookies[who]! },
    payload: { name },
  });

const remove = (who: string, projectId: number, team = teamId) =>
  app.inject({
    method: "DELETE",
    url: `/teams/${team}/projects/${projectId}`,
    headers: { cookie: cookies[who]! },
  });

const list = (who: string, team = teamId) =>
  app.inject({
    method: "GET",
    url: `/teams/${team}/projects`,
    headers: { cookie: cookies[who]! },
  });

before(async () => {
  await app.ready();
  for (const who of ["owner", "admin", "member", "viewer", "outsider"]) await makeUser(who);

  const made = await app.inject({
    method: "POST",
    url: "/teams",
    headers: { cookie: cookies.owner! },
    payload: { name: `pteam-${stamp}` },
  });
  teamId = made.json().id;

  // A second team the outsider owns, to prove deletes cannot cross over.
  const other = await app.inject({
    method: "POST",
    url: "/teams",
    headers: { cookie: cookies.outsider! },
    payload: { name: `pother-${stamp}` },
  });
  otherTeamId = other.json().id;

  for (const who of ["admin", "member", "viewer"]) {
    await prisma.membership.create({
      data: { teamId, userId: ids[who]!, role: who.toUpperCase() as Role },
    });
  }
});

after(async () => {
  await prisma.team.deleteMany({ where: { id: { in: [teamId, otherTeamId] } } });
  await prisma.user.deleteMany({ where: { email: { contains: `-${stamp}@` } } });
  await app.close();
});

test("a member may create a project", async () => {
  const r = await create("member");
  assert.equal(r.statusCode, 201);
  assert.equal(r.json().teamId, teamId);
});

test("a viewer may not create, an outsider may not either", async () => {
  assert.equal((await create("viewer")).statusCode, 403);
  assert.equal((await create("outsider")).statusCode, 403);
});

test("a member may not delete, an admin may", async () => {
  const id = (await create("member")).json().id;
  assert.equal((await remove("member", id)).statusCode, 403);
  assert.equal((await remove("admin", id)).statusCode, 204);
  assert.equal(await prisma.project.findUnique({ where: { id } }), null);
});

test("deleting a project that is gone is 404", async () => {
  const id = (await create("owner")).json().id;
  assert.equal((await remove("owner", id)).statusCode, 204);
  assert.equal((await remove("owner", id)).statusCode, 404);
});

test("an admin cannot delete another team's project", async () => {
  // The project lives in otherTeamId. Asking through otherTeamId is a 403,
  // because our admin is not in that team...
  const id = (await create("outsider", otherTeamId)).json().id;
  assert.equal((await remove("admin", id, otherTeamId)).statusCode, 403);
  // ...and asking through their own team is a 404, because the store scopes
  // the delete by teamId. Without that scope this would be a 204.
  assert.equal((await remove("admin", id, teamId)).statusCode, 404);
  assert.notEqual(await prisma.project.findUnique({ where: { id } }), null);
});

test("a viewer may list, and sees only this team's projects", async () => {
  const mine = (await create("member", teamId, `listed-${stamp}`)).json().id;
  await create("outsider", otherTeamId, `hidden-${stamp}`);

  const r = await list("viewer");
  assert.equal(r.statusCode, 200);
  const names = r.json().map((p: { name: string }) => p.name);
  assert.ok(names.includes(`listed-${stamp}`));
  assert.ok(!names.includes(`hidden-${stamp}`));
  assert.ok(r.json().every((p: { teamId: number }) => p.teamId === teamId));
  await prisma.project.delete({ where: { id: mine } });
});

test("an outsider gets 403, not an empty list", async () => {
  assert.equal((await list("outsider")).statusCode, 403);
});

test("projects cascade away with the team", async () => {
  const id = (await create("owner")).json().id;
  await prisma.team.delete({ where: { id: teamId } });
  assert.equal(await prisma.project.findUnique({ where: { id } }), null);
});
