// Run with: npm test
// Lesson 19, the enforcement half. The decision is three lines in
// src/audit/audit.ts; what matters is whether a real request over HTTP
// leaves a row, and whether a REFUSED one does.
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../db.ts";
import { buildApp } from "../app.ts";
import { COOKIE_NAME, createSession } from "../auth/session.ts";
import { hashPassword } from "../auth/password.ts";

const app = await buildApp();
const stamp = Date.now();

let cookie = "";
let viewerCookie = "";
let ownerId = 0;
let viewerId = 0;
let teamId = 0;

before(async () => {
  await app.ready();
  const owner = await prisma.user.create({
    data: {
      email: `t19-owner-${stamp}@example.com`,
      passwordHash: await hashPassword("correct horse battery"),
    },
  });
  ownerId = owner.id;
  cookie = `${COOKIE_NAME}=${(await createSession(ownerId)).id}`;

  const viewer = await prisma.user.create({
    data: {
      email: `t19-viewer-${stamp}@example.com`,
      passwordHash: await hashPassword("correct horse battery"),
    },
  });
  viewerId = viewer.id;
  viewerCookie = `${COOKIE_NAME}=${(await createSession(viewerId)).id}`;

  const team = await prisma.team.create({
    data: {
      name: `t19-${stamp}`,
      members: {
        create: [
          { userId: ownerId, role: "OWNER" },
          { userId: viewerId, role: "VIEWER" },
        ],
      },
    },
  });
  teamId = team.id;
});

after(async () => {
  await prisma.auditLog.deleteMany({ where: { userId: { in: [ownerId, viewerId] } } });
  await prisma.auditLog.deleteMany({ where: { teamId } });
  await prisma.auditLog.deleteMany({ where: { route: "/auth/login" } });
  await prisma.team.deleteMany({ where: { id: teamId } });
  await prisma.user.deleteMany({
    where: { AND: [{ email: { startsWith: "t19-" } }, { email: { contains: `-${stamp}@` } }] },
  });
  await app.close();
  await prisma.$disconnect();
});

// ! The row is written in onResponse, which runs AFTER the reply is flushed.
// ! So the test has to wait for it -- and that waiting is the proof that the
// ! caller does not. Poll, never sleep a fixed amount.
async function waitForRow(where: object, ms = 2000) {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    const row = await prisma.auditLog.findFirst({ where, orderBy: { at: "desc" } });
    if (row) return row;
    await new Promise((r) => setTimeout(r, 25));
  }
  return undefined;
}

// * A successful write. userId comes from requireAuth, teamId from the URL.
test("a write lands a row naming the person and the team", async () => {
  const res = await app.inject({
    method: "POST",
    url: `/teams/${teamId}/tasks`,
    headers: { cookie },
    payload: { title: "audited" },
  });
  assert.equal(res.statusCode, 201);

  const row = await waitForRow({ userId: ownerId, method: "POST", status: 201 });
  assert.ok(row, "no audit row for a 201 write");
  assert.equal(row.teamId, teamId);
  // ! The PATTERN, not the URL. If this ever reads "/teams/42/tasks" then
  // ! caller input is going into the table.
  assert.equal(row.route, "/teams/:teamId/tasks");
  assert.equal(row.userId, ownerId);
});

// * The row you most want, and the one no handler could ever write: the
// * handler never ran. Only onResponse sees a 403.
test("a refusal lands a row, and the handler never ran", async () => {
  const res = await app.inject({
    method: "POST",
    url: `/teams/${teamId}/tasks`,
    headers: { cookie: viewerCookie },
    payload: { title: "nope" },
  });
  assert.equal(res.statusCode, 403);

  const row = await waitForRow({ userId: viewerId, status: 403 });
  assert.ok(row, "no audit row for a 403");
  assert.equal(row.teamId, teamId);
  assert.equal(await prisma.task.count({ where: { title: "nope" } }), 0);
});

// * Nobody was logged in, so userId is null. A null row is still evidence:
// * it carries the ip, the route and the clock.
test("an anonymous 401 lands a row with no userId", async () => {
  const res = await app.inject({
    method: "POST",
    url: `/teams/${teamId}/tasks`,
    payload: { title: "stranger" },
  });
  assert.equal(res.statusCode, 401);

  const row = await waitForRow({ teamId, status: 401, userId: null });
  assert.ok(row, "no audit row for a 401");
  assert.equal(row.userId, null);
  assert.ok(row.ip.length > 0);
});

// ! The cap, over HTTP this time. A GET that worked writes nothing.
test("a successful read writes nothing", async () => {
  const before = await prisma.auditLog.count({ where: { teamId } });
  const res = await app.inject({
    method: "GET",
    url: `/teams/${teamId}/tasks`,
    headers: { cookie },
  });
  assert.equal(res.statusCode, 200);

  await new Promise((r) => setTimeout(r, 200));
  assert.equal(await prisma.auditLog.count({ where: { teamId } }), before);
});

// * The audit row survives the person. Every other model cascades; this one
// * must not, or deleting an account deletes the evidence against it.
test("deleting the user leaves the audit row standing", async () => {
  const gone = await prisma.user.create({
    data: {
      email: `t19-gone-${stamp}@example.com`,
      passwordHash: await hashPassword("correct horse battery"),
    },
  });
  const goneCookie = `${COOKIE_NAME}=${(await createSession(gone.id)).id}`;

  const res = await app.inject({
    method: "POST",
    url: "/teams",
    headers: { cookie: goneCookie },
    payload: { name: `t19-gone-${stamp}` },
  });
  assert.equal(res.statusCode, 201);
  assert.ok(await waitForRow({ userId: gone.id }), "no audit row to test against");

  await prisma.user.delete({ where: { id: gone.id } });

  const row = await prisma.auditLog.findFirst({ where: { userId: gone.id } });
  assert.ok(row, "the audit row cascaded away with the user");
  assert.equal(row.userId, gone.id);

  await prisma.auditLog.deleteMany({ where: { userId: gone.id } });
  await prisma.team.deleteMany({ where: { name: `t19-gone-${stamp}` } });
});

// ! Lesson 20's rule on a new shape. A route with no path params still gets a
// ! params cell -- and the rule (schema.prisma) is: one empty, not two. It must
// ! be the JSON object {}, never SQL NULL. Prisma cannot prove that: it hands
// ! back a JS object either way it is stored, and JS `null` for both kinds of
// ! nothing. Only raw SQL can see which of the two is really in the cell.
test("a login writes an empty params object, not a NULL cell", async () => {
  const res = await app.inject({
    method: "POST",
    url: "/auth/login",
    payload: {
      email: `t19-owner-${stamp}@example.com`,
      password: "correct horse battery",
    },
  });
  assert.equal(res.statusCode, 200);

  // ! No requireAuth on login, so the row carries no userId. Match the route.
  const row = await waitForRow({ route: "/auth/login", status: 200 });
  assert.ok(row, "no audit row for the login");
  // * Passes whether the cell holds {} or NULL. It tells you nothing.
  assert.deepEqual(row.params, {});

  // * The one that can fail. `is null` is the only test that separates the two.
  const [cell] = await prisma.$queryRaw<{ isNull: boolean; text: string | null }[]>`
    select (params is null) as "isNull", params::text as text
    from "AuditLog" where id = ${row.id}`;
  assert.ok(cell, "no row came back");
  assert.equal(cell.isNull, false, "params is SQL NULL -- two kinds of empty");
  assert.equal(cell.text, "{}");
});

// * Lesson 35: the row has to outlive the thing it describes. The task is
// * gone, so the only place its title still exists is targetSnapshot.
test("deleting a task leaves its title in targetSnapshot", async () => {
  const created = await app.inject({
    method: "POST",
    url: `/teams/${teamId}/tasks`,
    headers: { cookie },
    payload: { title: `t19-snapshot-${stamp}` },
  });
  assert.equal(created.statusCode, 201);
  const task = created.json() as { id: number };

  const res = await app.inject({
    method: "DELETE",
    url: `/teams/${teamId}/tasks/${task.id}`,
    headers: { cookie },
  });
  assert.equal(res.statusCode, 204);

  const row = await waitForRow({ teamId, method: "DELETE", targetId: task.id });
  assert.ok(row, "no audit row for the delete");
  assert.equal((row.targetSnapshot as { title: string } | null)?.title, `t19-snapshot-${stamp}`);
});
