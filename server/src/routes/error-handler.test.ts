// Run with: npm test
// Lesson 21. What a crash is allowed to say. The rule under test is the split
// on STATUS: a 4xx describes the caller's input and passes through, a 5xx
// describes our code and is replaced by a fixed string.
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildApp } from "../app.ts";
import { prisma } from "../db.ts";

// * Routes that crash on purpose. Registered on a real app, so the reply goes
// * through the same error handler every route uses.
const app = await buildApp();
app.log.level = "silent"; // ? the handler logs the stack; do not print it in test output

app.get("/test-boom", async () => {
  const nothing = undefined as unknown as { name: string };
  return nothing.name;
});

// ! The important one. A Prisma error message carries file paths, source lines
// ! and the full column list of the model.
app.get("/test-boom-prisma", async () =>
  prisma.task.findMany({ orderBy: { nope: "asc" } as never }),
);

await app.ready();

test("a plain crash does not send its message", async () => {
  const res = await app.inject({ method: "GET", url: "/test-boom" });

  assert.equal(res.statusCode, 500);
  const body = res.json();
  assert.equal(body.message, "Internal Server Error");
  assert.ok(!body.message.includes("undefined"), "leaked the JS error text");
});

test("a prisma crash leaks no path, no source, no column names", async () => {
  const res = await app.inject({ method: "GET", url: "/test-boom-prisma" });

  assert.equal(res.statusCode, 500);
  // ? One assertion per thing the old reply gave away.
  assert.ok(!res.body.includes("/Users/"), "leaked an absolute file path");
  assert.ok(!res.body.includes("prisma."), "leaked the query that failed");
  assert.ok(!res.body.includes("passwordHash"), "leaked a column name");
  assert.ok(!res.body.includes("ownerId"), "leaked a column name");
});

test("the reply carries a request id, so the log can be found", async () => {
  const res = await app.inject({ method: "GET", url: "/test-boom" });

  assert.ok(res.json().requestId, "no requestId to join on");
});

test("a 4xx still explains itself -- it is about the caller's own input", async () => {
  const res = await app.inject({
    method: "POST",
    url: "/auth/register",
    headers: { "sec-fetch-site": "same-origin" },
    payload: { email: "not-an-email", password: "x" },
  });

  assert.equal(res.statusCode, 400);
  assert.match(res.json().message, /email/);
});

test("a 404 is still a 404", async () => {
  const res = await app.inject({ method: "GET", url: "/no-such-route" });

  assert.equal(res.statusCode, 404);
});

test.after(async () => {
  await app.close();
  await prisma.$disconnect();
});
