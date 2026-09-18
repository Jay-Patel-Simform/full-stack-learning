import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../db.ts";
import { buildApp } from "../app.ts";
import { COOKIE_NAME, createSession } from "../auth/session.ts";
import { hashPassword } from "../auth/password.ts";

const app = await buildApp();
const stamp = Date.now();

// * Mixed case on purpose: a case-sensitive LIKE finds 2 of these 4 "buy" rows.
const TITLES = [
  "Buy MILK",
  "buy bread",
  "Write report",
  "review PR",
  "Deploy the API",
  "buy coffee",
  "Fix the login BUG",
  "read docs",
  "Buy tickets",
  "ship it",
  "write tests",
  "Review the plan",
];

let cookie = "";
let userId = 0;
let teamId = 0;

before(async () => {
  await app.ready();
  const user = await prisma.user.create({
    data: {
      email: `filter-${stamp}@example.com`,
      passwordHash: await hashPassword("correct horse battery"),
    },
  });
  userId = user.id;
  cookie = `${COOKIE_NAME}=${(await createSession(user.id)).id}`;

  const team = await prisma.team.create({
    data: { name: `filter-${stamp}`, members: { create: { userId, role: "OWNER" } } },
  });
  teamId = team.id;
  // ? every third row done, so 4 of 12 are done
  await prisma.task.createMany({
    data: TITLES.map((title, i) => ({ title, done: i % 3 === 0, teamId, ownerId: userId })),
  });
});

after(async () => {
  await prisma.team.delete({ where: { id: teamId } });
  await prisma.user.delete({ where: { id: userId } });
  await app.close();
});

function list(query: string) {
  return app.inject({ method: "GET", url: `/teams/${teamId}/tasks${query}`, headers: { cookie } });
}
const titlesOf = (res: { json: () => { items: { title: string }[] } }) =>
  res.json().items.map((t) => t.title);

test("no filter still answers with the whole list", async () => {
  const res = await list("");
  assert.equal(res.statusCode, 200);
  assert.equal(res.json().items.length, TITLES.length);
});

test("?done=true and ?done=false are two different answers, and both are real", async () => {
  const done = await list("?done=true");
  const notDone = await list("?done=false");
  assert.deepEqual(
    done.json().items.map((t: { done: boolean }) => t.done),
    [true, true, true, true],
  );
  assert.equal(notDone.json().items.length, 8);
  // ! The point of the test: `done=false` must not be read as "no filter".
  // ! `...(done && { done })` in the store passes this list-length check only
  // ! by accident of 8 !== 12, so assert the flag on every row too.
  assert.ok(notDone.json().items.every((t: { done: boolean }) => t.done === false));
});

test("?done=maybe is a 400, not a guess", async () => {
  assert.equal((await list("?done=maybe")).statusCode, 400);
});

test("?q= matches whatever the person typed the case of", async () => {
  const hits = titlesOf(await list("?q=buy"));
  // ! Case-sensitive LIKE would answer with the two lower-case rows only.
  assert.deepEqual(hits.sort(), ["Buy MILK", "Buy tickets", "buy bread", "buy coffee"].sort());
  assert.deepEqual(titlesOf(await list("?q=BUY")).sort(), hits.sort());
});

test("q and done narrow together, not one or the other", async () => {
  const both = await list("?q=buy&done=true");
  assert.deepEqual(titlesOf(both), ["Buy MILK"]);
});

test("a filtered list pages with its own cursor and drops nobody", async () => {
  const seen: string[] = [];
  let cursor: number | null = null;
  do {
    const res = await list(`?done=false&limit=3${cursor === null ? "" : `&cursor=${cursor}`}`);
    const body = res.json();
    seen.push(...body.items.map((t: { title: string }) => t.title));
    cursor = body.nextCursor;
  } while (cursor !== null);
  assert.equal(seen.length, 8);
  assert.equal(new Set(seen).size, 8);
});

test("a title of only spaces is a 400, and a padded title is stored trimmed", async () => {
  const blank = await app.inject({
    method: "POST",
    url: `/teams/${teamId}/tasks`,
    headers: { cookie, origin: "http://localhost:5173" },
    payload: { title: "   " },
  });
  assert.equal(blank.statusCode, 400);

  const padded = await app.inject({
    method: "POST",
    url: `/teams/${teamId}/tasks`,
    headers: { cookie, origin: "http://localhost:5173" },
    payload: { title: "  padded  " },
  });
  assert.equal(padded.statusCode, 201);
  assert.equal(padded.json().title, "padded");
});

test("PATCH gets the same title rule for free, because it reuses the shape", async () => {
  const created = await app.inject({
    method: "POST",
    url: `/teams/${teamId}/tasks`,
    headers: { cookie, origin: "http://localhost:5173" },
    payload: { title: "to be patched" },
  });
  const id = created.json().id;
  const res = await app.inject({
    method: "PATCH",
    url: `/teams/${teamId}/tasks/${id}`,
    headers: { cookie, origin: "http://localhost:5173" },
    payload: { title: "  " },
  });
  assert.equal(res.statusCode, 400);
});
