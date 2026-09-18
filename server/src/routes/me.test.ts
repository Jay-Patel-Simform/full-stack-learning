// Run with: npm test
//
// Lesson 22. /auth/me is the front end's boot question: "who am I?". The page
// cannot answer it itself -- the cookie is HttpOnly, so document.cookie is
// empty -- so every render depends on this one route being honest.
//
// One question in every test: does the answer match the state of the SESSION
// ROW, not the state of the cookie string? A cookie is caller input. The row
// is the truth.
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../app.ts";
import { prisma } from "../db.ts";
import { hashPassword } from "../auth/password.ts";
import { COOKIE_NAME } from "../auth/session.ts";

let app: FastifyInstance;
const stamp = Date.now();
const password = "correct-horse-battery";
const email = `me-${stamp}@example.com`;

before(async () => {
  app = await buildApp();
  await prisma.user.create({ data: { email, passwordHash: await hashPassword(password) } });
});

after(async () => {
  await prisma.user.deleteMany({ where: { email: { contains: `-${stamp}@` } } });
  await app.close();
  await prisma.$disconnect();
});

// The cookie the browser would hold, pulled out of a real login.
async function signIn(): Promise<string> {
  const res = await app.inject({
    method: "POST",
    url: "/auth/login",
    payload: { email, password },
  });
  assert.equal(res.statusCode, 200);
  const raw = res.headers["set-cookie"];
  const header = Array.isArray(raw) ? raw[0]! : raw!;
  return header.split(";")[0]!; // "session=xyz"
}

const me = (cookie?: string) =>
  app.inject({ method: "GET", url: "/auth/me", headers: cookie ? { cookie } : {} });

// ---------- the three answers the page renders ----------

test("no cookie is a 401, so a fresh tab renders the login form", async () => {
  const res = await me();
  assert.equal(res.statusCode, 401);
});

test("a real session is a 200 with the email the page shows", async () => {
  const res = await me(await signIn());
  assert.equal(res.statusCode, 200);
  assert.equal(res.json().email, email);
});

test("a made-up cookie is a 401, not a 500", async () => {
  // An attacker types anything into the jar. This must be the ordinary
  // logged-out answer -- a crash here would be a 500 the page cannot read.
  const res = await me(`${COOKIE_NAME}=not-a-real-session-id`);
  assert.equal(res.statusCode, 401);
});

// ---------- and the one the page must survive mid-session ----------

test("after logout the same cookie is a 401, because the ROW is gone", async () => {
  const cookie = await signIn();
  assert.equal((await me(cookie)).statusCode, 200);

  await app.inject({ method: "POST", url: "/auth/logout", headers: { cookie } });

  // The browser may well still be holding this string. It is now junk.
  // This is why the front end's api() wrapper handles 401 on EVERY call and
  // not only on boot: nothing about the cookie changed, only the database.
  assert.equal((await me(cookie)).statusCode, 401);
});

test("me never sends the password hash, whatever the user row holds", async () => {
  // The serializer in app.ts parses through UserPublic, so this is a check on
  // that wiring rather than on this route. It is the reply the page renders.
  const res = await me(await signIn());
  assert.deepEqual(Object.keys(res.json()).sort(), ["email", "id"]);
});
