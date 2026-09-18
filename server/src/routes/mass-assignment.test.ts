// Run with: npm test
// Lesson 17. Mass assignment: a key the caller sends that we never named.
//
// There is no decision half to this file. The decision is four lines in
// app.ts, and what matters is whether a real request over HTTP is refused.
// Same shape as the rate-limit tests in lesson 12: test what you decided,
// not what you installed.
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../db.ts";
import { buildApp } from "../app.ts";
import { COOKIE_NAME, createSession } from "../auth/session.ts";
import { hashPassword } from "../auth/password.ts";

const app = await buildApp();
const stamp = Date.now();

let cookie = "";
let ownerId = 0;
let teamId = 0;
let taskId = 0;

before(async () => {
  await app.ready();
  const user = await prisma.user.create({
    data: {
      email: `t17-owner-${stamp}@example.com`,
      passwordHash: await hashPassword("correct horse battery"),
    },
  });
  ownerId = user.id;
  const { id } = await createSession(user.id);
  cookie = `${COOKIE_NAME}=${id}`;

  const team = await prisma.team.create({
    data: { name: `t17-${stamp}`, members: { create: { userId: ownerId, role: "OWNER" } } },
  });
  teamId = team.id;
  const task = await prisma.task.create({ data: { title: "mine", teamId, ownerId } });
  taskId = task.id;
});

after(async () => {
  await prisma.team.deleteMany({ where: { id: teamId } });
  await prisma.user.deleteMany({
    where: { AND: [{ email: { startsWith: "t17-" } }, { email: { contains: `-${stamp}@` } }] },
  });
  await app.close();
  await prisma.$disconnect();
});

function send(method: "POST" | "PATCH", url: string, payload: unknown) {
  return app.inject({ method, url, headers: { cookie }, payload: payload as object });
}

// * The attack itself. ownerId is a real column, and the handler spreads the
// * body straight into prisma.task.create. Before today zod dropped the key
// * quietly; now the caller is told no.
test("a create body cannot smuggle ownerId", async () => {
  const res = await send("POST", `/teams/${teamId}/tasks`, { title: "x", ownerId: 999_999 });
  assert.equal(res.statusCode, 400);
  assert.match(res.body, /ownerId/);
});

// ! teamId is the scope from lesson 10. A body must never get a vote on it.
test("a create body cannot smuggle teamId", async () => {
  const res = await send("POST", `/teams/${teamId}/tasks`, { title: "x", teamId: teamId + 1 });
  assert.equal(res.statusCode, 400);
});

// * Not an attack -- a typo. This is the one that will happen to you in
// * week 9-10, and a silent strip would have answered 200 and changed nothing.
test("a misspelled field is a 400, not a silent no-op", async () => {
  const res = await send("PATCH", `/teams/${teamId}/tasks/${taskId}`, { isDone: true });
  assert.equal(res.statusCode, 400);
  assert.match(res.body, /isDone/);

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  assert.equal(task?.done, false); // ? and nothing changed, which is now visible
});

test("an empty patch is a 400", async () => {
  const res = await send("PATCH", `/teams/${teamId}/tasks/${taskId}`, {});
  assert.equal(res.statusCode, 400);
  assert.match(res.body, /at least one field/);
});

// * Every body, not just the task ones. This is the test that proves the rule
// * lives in the compiler and not in a schema somebody remembered to mark.
test("the rule covers a schema that never opted in", async () => {
  const res = await send("POST", "/teams", { name: `t17-sneaky-${stamp}`, id: 1 });
  assert.equal(res.statusCode, 400);
  assert.match(res.body, /id/);
});

test("register cannot post its own passwordHash", async () => {
  const res = await send("POST", "/auth/register", {
    email: `t17-hacker-${stamp}@example.com`,
    password: "correct horse battery",
    passwordHash: "deadbeef",
  });
  assert.equal(res.statusCode, 400);
  const user = await prisma.user.findUnique({
    where: { email: `t17-hacker-${stamp}@example.com` },
  });
  assert.equal(user, null); // ? refused at the door, so no row exists
});

// ! The guard against overdoing it. Strict must not break a correct request.
test("a body with exactly the named keys still works", async () => {
  const res = await send("POST", `/teams/${teamId}/tasks`, { title: "fine", done: true });
  assert.equal(res.statusCode, 201);
});

// ! Bodies only, on purpose. Measured: strict params break nothing here today,
// ! because every params object holds exactly the declared URL segments. The
// ! input that collects keys nobody asked for is the QUERY STRING -- utm_source,
// ! fbclid, a proxy cache-buster. This test is the record of that scope choice.
test("params and query are untouched by the rule", async () => {
  const res = await app.inject({
    method: "GET",
    url: `/teams/${teamId}/tasks?limit=5&nonsense=1`,
    headers: { cookie },
  });
  assert.equal(res.statusCode, 200);
});
