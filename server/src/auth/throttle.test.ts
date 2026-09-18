// Run with: npm test
//
// Two halves, the split from lesson 8: the *decision* tests are pure and fast
// (no server, no database), the *enforcement* tests drive the real route.
import { after, test } from "node:test";
import assert from "node:assert/strict";
import { buildApp } from "../app.ts";
import { prisma } from "../db.ts";
import { hashPassword } from "./password.ts";
import { throttleCheck, throttleFail, throttleReset } from "./throttle.ts";

// ---------- decisions ----------

test("four failures are free", () => {
  const key = "free@decide.test";
  for (let i = 0; i < 4; i++) throttleFail(key);
  assert.equal(throttleCheck(key), 0);
});

test("the fifth failure starts the wait, and it doubles", () => {
  const key = "grow@decide.test";
  for (let i = 0; i < 5; i++) throttleFail(key);
  const first = throttleCheck(key);
  assert.ok(first > 0 && first <= 1000, `expected ~1s, got ${first}ms`);

  throttleFail(key);
  const second = throttleCheck(key);
  assert.ok(second > 1000 && second <= 2000, `expected ~2s, got ${second}ms`);
});

test("the wait is capped", () => {
  const key = "cap@decide.test";
  for (let i = 0; i < 60; i++) throttleFail(key);
  assert.ok(throttleCheck(key) <= 15 * 60 * 1000);
});

test("a right answer wipes the slate", () => {
  const key = "reset@decide.test";
  for (let i = 0; i < 10; i++) throttleFail(key);
  assert.ok(throttleCheck(key) > 0);
  throttleReset(key);
  assert.equal(throttleCheck(key), 0);
});

test("counters are per key, so one account cannot block another", () => {
  const victim = "victim@decide.test";
  for (let i = 0; i < 10; i++) throttleFail("attacker@decide.test");
  assert.equal(throttleCheck(victim), 0);
});

// ---------- enforcement ----------

const app = await buildApp();
const stamp = Date.now();
const email = `throttle-${stamp}@example.com`;
const password = "correct horse battery";

await prisma.user.create({ data: { email, passwordHash: await hashPassword(password) } });

after(async () => {
  await prisma.user.deleteMany({ where: { email: { contains: `-${stamp}@` } } });
  await app.close();
  await prisma.$disconnect();
});

const login = (body: { email: string; password: string }) =>
  app.inject({ method: "POST", url: "/auth/login", payload: body });

test("six wrong passwords: five 401s, then 429 with retry-after", async () => {
  for (let i = 0; i < 5; i++) {
    const r = await login({ email, password: "wrong" });
    assert.equal(r.statusCode, 401, `attempt ${i + 1} should still be 401`);
  }
  const blocked = await login({ email, password: "wrong" });
  assert.equal(blocked.statusCode, 429);
  assert.ok(Number(blocked.headers["retry-after"]) >= 1);
});

test("the wall does not care that the password is now correct", async () => {
  // Important: the throttle runs *before* the password check, so a locked-out
  // key cannot be unlocked by finally guessing right.
  const r = await login({ email, password });
  assert.equal(r.statusCode, 429);
});

test("an email nobody registered throttles exactly the same way", async () => {
  // If a made-up email stayed on 401 forever while a real one flipped to 429,
  // the status code would tell an attacker which emails have accounts.
  const ghost = `ghost-${stamp}@example.com`;
  for (let i = 0; i < 5; i++) {
    assert.equal((await login({ email: ghost, password: "wrong" })).statusCode, 401);
  }
  assert.equal((await login({ email: ghost, password: "wrong" })).statusCode, 429);
});

test("case does not open a side door", async () => {
  // Without .toLowerCase() the key, an attacker gets a fresh five tries per
  // capitalisation -- and there are a lot of capitalisations.
  const upper = `UPPER-${stamp}@example.com`;
  for (let i = 0; i < 6; i++) await login({ email: upper.toLowerCase(), password: "wrong" });
  assert.equal((await login({ email: upper, password: "wrong" })).statusCode, 429);
});

test("a good password on an untouched account still works", async () => {
  const clean = `clean-${stamp}@example.com`;
  await prisma.user.create({ data: { email: clean, passwordHash: await hashPassword(password) } });
  const r = await login({ email: clean, password });
  assert.equal(r.statusCode, 200);
  assert.ok(r.headers["set-cookie"]);
});
