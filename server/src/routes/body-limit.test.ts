// Run with: npm test
// The app sets `bodyLimit: 64 * 1024` in buildApp(). Fastify's own default is
// 1 MiB, so that line is a decision, not a default -- and nothing else in the
// suite would notice if somebody deleted it. This file is the lock on it.
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { buildApp } from "../app.ts";

const app = await buildApp();

before(async () => {
  await app.ready();
});

after(async () => {
  await app.close();
});

test("a body over 64 KB is refused before the handler", async () => {
  const res = await app.inject({
    method: "POST",
    url: "/auth/login",
    headers: { "content-type": "application/json" },
    payload: JSON.stringify({
      email: "a@b.com",
      password: "x".repeat(80 * 1024),
    }),
  });

  // ? 413, not 400: refused on size, before zod ever saw the shape.
  assert.equal(res.statusCode, 413);
});

test("the csp-report parser inherits the same limit", async () => {
  // ! A custom content-type parser MAY carry its own bodyLimit, and this one
  // ! does not pass one. Measured: it inherits the app's. If somebody adds a
  // ! per-parser limit later, this is the test that tells them they widened it.
  const res = await app.inject({
    method: "POST",
    url: "/csp-report",
    headers: { "content-type": "application/csp-report" },
    payload: JSON.stringify({
      "csp-report": { "blocked-uri": "x".repeat(80 * 1024) },
    }),
  });

  assert.equal(res.statusCode, 413);
});

test("a normal body still gets through to validation", async () => {
  const res = await app.inject({
    method: "POST",
    url: "/auth/login",
    headers: { "content-type": "application/json" },
    payload: JSON.stringify({
      email: "nobody@example.com",
      password: "wrong-password",
    }),
  });

  // ! NOT 413. Which code it is does not matter here -- only that size was not
  // ! the reason. Asserting 401 would couple this file to login's own logic.
  assert.notEqual(res.statusCode, 413);
});