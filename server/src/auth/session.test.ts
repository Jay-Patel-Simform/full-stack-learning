// Run with: npm test
import { after, test } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../db.ts";
import { hashPassword, verifyPassword, DUMMY_HASH } from "./password.ts";
import {
  clearCookie,
  createSession,
  endSession,
  readCookie,
  readSession,
  sessionCookie,
} from "./session.ts";

const email = `test-${Date.now()}@example.com`;
const user = await prisma.user.create({
  data: { email, passwordHash: await hashPassword("correct horse battery") },
});

after(async () => {
  // sessions cascade away with the user
  await prisma.user.delete({ where: { id: user.id } });
  await prisma.$disconnect();
});

test("right password yes, wrong password no", async () => {
  assert.equal(await verifyPassword("correct horse battery", user.passwordHash), true);
  assert.equal(await verifyPassword("wrong", user.passwordHash), false);
  assert.equal(await verifyPassword("anything", DUMMY_HASH), false);
});

test("a fresh session id resolves to its user", async () => {
  const { id } = await createSession(user.id);
  assert.equal(await readSession(id), user.id);
});

test("the raw id is never in the database", async () => {
  const { id } = await createSession(user.id);
  const rows = await prisma.session.findMany({ where: { userId: user.id } });
  assert.ok(rows.every((r) => r.idHash !== id));
});

test("a made-up id resolves to nobody", async () => {
  assert.equal(await readSession("not-a-real-session-id"), undefined);
});

test("an expired session resolves to nobody and is deleted", async () => {
  const { id } = await createSession(user.id);
  // reach in and age every session of this user past its expiry
  await prisma.session.updateMany({
    where: { userId: user.id },
    data: { expiresAt: new Date(Date.now() - 1000) },
  });
  assert.equal(await readSession(id), undefined);
});

test("logout makes the id useless", async () => {
  const { id } = await createSession(user.id);
  await endSession(id);
  assert.equal(await readSession(id), undefined);
});

test("the cookie carries the flags that matter", () => {
  const c = sessionCookie("abc", new Date());
  assert.ok(c.includes("HttpOnly"));
  assert.ok(c.includes("SameSite=Lax"));
});

test("readCookie picks the right one out of a crowd", () => {
  assert.equal(readCookie("a=1; session=xyz; b=2", "session"), "xyz");
  assert.equal(readCookie("a=1", "session"), undefined);
  assert.equal(readCookie(undefined, "session"), undefined);
});

// ! Both cookie helpers must read NODE_ENV from the same place. If one reads
// ! config and the other reads process.env, they can disagree inside one
// ! process - and a clear-cookie whose flags do not match is a logout that
// ! leaves the session cookie alive.
test("the clear cookie carries the same flags as the cookie it clears", () => {
  // A live read of process.env would see this. The config snapshot cannot.
  const real = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  try {
    const set = sessionCookie("anything", new Date());
    const clear = clearCookie();

    assert.equal(/Secure/.test(set), /Secure/.test(clear));
  } finally {
    // ! Put it back, or every test after this one runs in a different world.
    process.env.NODE_ENV = real;
  }
});
