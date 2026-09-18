// Run with: npm test
// Lesson 20. ?sort= is the only place a caller picks a COLUMN NAME. A column
// cannot be a bound parameter, so the enum in TaskQuery is the whole defence.
// Its own file: node:test runs each file in its own process, so this fixture
// cannot be broken by tasks.test.ts deleting its team.
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../db.ts";
import { buildApp } from "../app.ts";
import { COOKIE_NAME, createSession } from "../auth/session.ts";
import { hashPassword } from "../auth/password.ts";

const app = await buildApp();
const stamp = Date.now();

let cookie = "";
let userId = 0;
let teamId = 0;

// * Titles chosen so title-order and id-order DISAGREE. A sort test whose two
// * orders happen to match passes even when sorting is silently ignored --
// * which is exactly the Postgres behaviour this lesson is about.
const TITLES = ["cherry", "apple", "banana"];

before(async () => {
  await app.ready();
  const user = await prisma.user.create({
    data: {
      email: `t20-${stamp}@example.com`,
      passwordHash: await hashPassword("correct horse battery"),
    },
  });
  userId = user.id;
  cookie = `${COOKIE_NAME}=${(await createSession(user.id)).id}`;

  const team = await prisma.team.create({
    data: { name: `t20-${stamp}`, members: { create: { userId, role: "OWNER" } } },
  });
  teamId = team.id;
  for (const title of TITLES) {
    await prisma.task.create({ data: { title, teamId, ownerId: userId } });
  }
});

after(async () => {
  await prisma.team.delete({ where: { id: teamId } });
  await prisma.user.delete({ where: { id: userId } });
  await app.close();
});

function list(query: string) {
  return app.inject({
    method: "GET",
    url: `/teams/${teamId}/tasks${query}`,
    headers: { cookie },
  });
}

test("no sort given: the default is id ascending", async () => {
  const res = await list("");
  assert.equal(res.statusCode, 200);
  assert.deepEqual(
    res.json().items.map((t: { title: string }) => t.title),
    TITLES, // ? created in this order, so id order == insertion order
  );
});

test("sort=title reorders, so the column really reached the query", async () => {
  const res = await list("?sort=title");
  assert.equal(res.statusCode, 200);
  assert.deepEqual(
    res.json().items.map((t: { title: string }) => t.title),
    ["apple", "banana", "cherry"],
  );
});

test("dir=desc reverses it", async () => {
  const res = await list("?sort=title&dir=desc");
  assert.deepEqual(
    res.json().items.map((t: { title: string }) => t.title),
    ["cherry", "banana", "apple"],
  );
});

// ! The lesson. Each of these is a column name that is not on the list.
// ! The wall answers 400; Postgres never sees the string.
for (const bad of [
  "passwordHash", // a real column, on another table -- still not on the list
  "ownerId", // a real column, on THIS table -- still not on the list
  'title; DROP TABLE "Task"', // the classic
  '(SELECT email FROM "User" LIMIT 1)', // the one parameters cannot fix
]) {
  test(`sort=${bad.slice(0, 28)} is refused at the door`, async () => {
    const res = await list(`?sort=${encodeURIComponent(bad)}`);
    assert.equal(res.statusCode, 400);
  });
}

test("a hostile VALUE is just a value: no rows, no error", async () => {
  // * The other half of the story. Values go through the query builder as
  // * parameters, so quotes and comments are text, not syntax.
  const rows = await prisma.task.findMany({
    where: { teamId, title: "' OR 1=1 --" },
  });
  assert.equal(rows.length, 0);
});
