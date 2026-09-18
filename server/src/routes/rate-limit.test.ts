// Run with: npm test
//
// The global per-IP floor from lesson 12. All enforcement, no decisions --
// the counting logic is the plugin's, so what is worth testing is the wiring:
// does it cover every route, is the key really the IP, and does it answer
// with the header a polite client needs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildApp } from "../app.ts";

const LIMIT = 100; // must match the `max` in app.ts

// One IP, LIMIT+1 requests. The last one is the wall.
test("the 101st request from one address is 429", async () => {
  const app = await buildApp();
  const hit = () => app.inject({ method: "GET", url: "/health", remoteAddress: "10.0.0.1" });

  for (let i = 1; i <= LIMIT; i++) {
    const res = await hit();
    assert.equal(res.statusCode, 200, `request ${i} should still pass`);
  }

  const blocked = await hit();
  assert.equal(blocked.statusCode, 429);
  assert.ok(blocked.headers["retry-after"], "a 429 must say when to come back");
  await app.close();
});

// The budget is spent per address, not for the whole server. Otherwise one
// rude client is a denial of service against every other user.
test("one address running out does not block another", async () => {
  const app = await buildApp();
  for (let i = 0; i <= LIMIT; i++) {
    await app.inject({ method: "GET", url: "/health", remoteAddress: "10.0.0.2" });
  }

  const other = await app.inject({ method: "GET", url: "/health", remoteAddress: "10.0.0.3" });
  assert.equal(other.statusCode, 200);
  await app.close();
});

// The limit is global: a route that was written before the plugin existed,
// and knows nothing about it, is still counted.
test("the count is shared across different routes", async () => {
  const app = await buildApp();
  for (let i = 0; i < LIMIT; i++) {
    await app.inject({ method: "GET", url: "/health", remoteAddress: "10.0.0.4" });
  }

  // A different URL, and an unauthenticated one, so 429 must beat the 401.
  const res = await app.inject({ method: "GET", url: "/auth/me", remoteAddress: "10.0.0.4" });
  assert.equal(res.statusCode, 429);
  await app.close();
});

// Every answer carries the budget, so a client can slow down before it is
// pushed. This is the part a hand-written limiter usually skips.
test("a normal reply says how much budget is left", async () => {
  const app = await buildApp();
  const res = await app.inject({ method: "GET", url: "/health", remoteAddress: "10.0.0.5" });
  assert.equal(res.headers["x-ratelimit-limit"], String(LIMIT));
  assert.equal(res.headers["x-ratelimit-remaining"], String(LIMIT - 1));
  await app.close();
});
