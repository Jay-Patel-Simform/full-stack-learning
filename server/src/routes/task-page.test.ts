import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../db.ts";
import { buildApp } from "../app.ts";
import { COOKIE_NAME, createSession } from "../auth/session.ts";
import { hashPassword } from "../auth/password.ts";

const app = await buildApp();
const stamp = Date.now();

// * 25 rows so ?limit=10 needs exactly three pages, the last one short.
const TOTAL = 25;

let cookie = "";
let userId = 0;
let teamId = 0;

before(async () => {
  await app.ready();
  const user = await prisma.user.create({
    data: {
      email: `page-${stamp}@example.com`,
      passwordHash: await hashPassword("correct horse battery"),
    },
  });
  userId = user.id;
  cookie = `${COOKIE_NAME}=${(await createSession(user.id)).id}`;

  const team = await prisma.team.create({
    data: { name: `page-${stamp}`, members: { create: { userId, role: "OWNER" } } },
  });
  teamId = team.id;
  await prisma.task.createMany({
    data: Array.from({ length: TOTAL }, (_, i) => ({
      title: `task ${i}`,
      teamId,
      ownerId: userId,
    })),
  });
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

test("the cursor walks the whole list once, with no row seen twice", async () => {
  const seen: number[] = [];
  let cursor: number | null = null;
  let pages = 0;
  do {
    const res = await list(`?limit=10${cursor === null ? "" : `&cursor=${cursor}`}`);
    assert.equal(res.statusCode, 200);
    seen.push(...res.json().items.map((t: { id: number }) => t.id));
    cursor = res.json().nextCursor;
    pages += 1;
    assert.ok(pages < 10, "the cursor is not advancing");
  } while (cursor !== null);

  assert.equal(pages, 3); // ? 10 + 10 + 5
  assert.equal(seen.length, TOTAL); // ? nothing missed
  assert.equal(new Set(seen).size, TOTAL); // ? nothing seen twice
});

test("no ?limit means 20, because the schema says so", async () => {
  const res = await list("");
  assert.equal(res.statusCode, 200);
  // ? A default nobody asserts is a number that can change by accident.
  assert.equal(res.json().items.length, 20);
  // ? 25 rows, 20 shown, so there is more. null here would strand 5 tasks.
  assert.notEqual(res.json().nextCursor, null);
});

test("the last page ends the walk with nextCursor: null", async () => {
  const first = await list("?limit=20");
  // ? Page one's nextCursor IS the id of its last row - that is the cursor.
  const cursor = first.json().nextCursor;

  const last = await list(`?limit=20&cursor=${cursor}`);
  assert.equal(last.statusCode, 200);
  assert.equal(last.json().items.length, 5); // ? 25 - 20
  // ! null is the stop signal. A number here and the client loops forever.
  assert.equal(last.json().nextCursor, null);
});

test("?limit=101 is refused, because a limit with no ceiling is not a limit", async () => {
  const res = await list("?limit=101");
  assert.equal(res.statusCode, 400);
});
