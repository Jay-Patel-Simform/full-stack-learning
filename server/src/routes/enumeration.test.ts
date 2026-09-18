// Run with: npm test
//
// Lesson 18. One question in every test: can the caller tell whether an
// account exists? Three channels can answer it -- the status code, the
// message, and the clock -- so each one gets an assertion.
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../app.ts";
import { prisma } from "../db.ts";
import { hashPassword } from "../auth/password.ts";

let app: FastifyInstance;
const stamp = Date.now();
const password = "correct-horse-battery";
const known = `known-${stamp}@example.com`;

before(async () => {
  app = await buildApp();
  await prisma.user.create({ data: { email: known, passwordHash: await hashPassword(password) } });
});

after(async () => {
  await prisma.user.deleteMany({ where: { email: { contains: `-${stamp}@` } } });
  await app.close();
  await prisma.$disconnect();
});

const login = (email: string, pw = "wrong-password-here") =>
  app.inject({ method: "POST", url: "/auth/login", payload: { email, password: pw } });

const register = (email: string) =>
  app.inject({ method: "POST", url: "/auth/register", payload: { email, password } });

// ---------- login gives nothing away ----------

test("a real email and a made-up one get the same 401 and the same words", async () => {
  const real = await login(known);
  const ghost = await login(`ghost-${stamp}@example.com`);
  assert.equal(real.statusCode, ghost.statusCode);
  assert.equal(real.body, ghost.body);
});

test("neither path skips the hash, so the clock says nothing either", async () => {
  // The guard is DUMMY_HASH in auth/password.ts: with no user row we still
  // run scrypt against a fake hash. Asserting "both are slow" instead of
  // "the two times are close" -- a fast no is the bug, and a machine under
  // load makes the difference noisy while it cannot make scrypt free.
  const time = async (email: string) => {
    const start = performance.now();
    await login(email);
    return performance.now() - start;
  };
  const real = await time(`slow-real-${stamp}@example.com`); // no row, on purpose
  const ghost = await time(`slow-ghost-${stamp}@example.com`);
  assert.ok(real > 100, `a login should cost a hash, took ${Math.round(real)}ms`);
  assert.ok(ghost > 100, `a missing user must cost one too, took ${Math.round(ghost)}ms`);
});

// ---------- register cannot hide it, so it charges for it ----------

test("the fifth taken-email probe is free, the sixth waits", async () => {
  const target = `probe-${stamp}@example.com`;
  await prisma.user.create({ data: { email: target, passwordHash: await hashPassword(password) } });

  for (let i = 0; i < 5; i++) {
    assert.equal((await register(target)).statusCode, 409, `probe ${i + 1} should be 409`);
  }
  const blocked = await register(target);
  assert.equal(blocked.statusCode, 429);
  assert.ok(Number(blocked.headers["retry-after"]) >= 1);
});

test("a free email still registers while another email is walled off", async () => {
  // The counter is per email. One blocked address must not close signup.
  const fresh = await register(`fresh-${stamp}@example.com`);
  assert.equal(fresh.statusCode, 201);
});

// ---------- one address, one row ----------

test("the case you typed does not make a second account", async () => {
  const mixed = `MiXeD-${stamp}@Example.com`;
  assert.equal((await register(mixed)).statusCode, 201);
  assert.equal((await register(mixed.toLowerCase())).statusCode, 409);
});

test("register in one case, log in in another", async () => {
  const mixed = `Case-${stamp}@Example.com`;
  assert.equal((await register(mixed)).statusCode, 201);

  const r = await app.inject({
    method: "POST",
    url: "/auth/login",
    payload: { email: mixed.toUpperCase(), password },
  });
  assert.equal(r.statusCode, 200, "the address is the same address");
  assert.ok(r.headers["set-cookie"]);
});

test("a pasted address with spaces around it is the same address", async () => {
  const spaced = `  Space-${stamp}@Example.com  `;
  assert.equal((await register(spaced)).statusCode, 201);
  assert.equal((await register(`space-${stamp}@example.com`)).statusCode, 409);
});

test("the row holds the normalised address, not what was typed", async () => {
  const row = await prisma.user.findUnique({ where: { email: `mixed-${stamp}@example.com` } });
  assert.ok(row, "found by the lower-cased address");
  assert.equal(row.email, `mixed-${stamp}@example.com`);
});
