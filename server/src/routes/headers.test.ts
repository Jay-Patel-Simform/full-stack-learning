import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { buildApp } from "../app.ts";

// * Same rule as cors.test.ts: test what we DECIDED, not what the plugin
// * ships. Every assertion here is a line we chose in app.ts.

let app: Awaited<ReturnType<typeof buildApp>>;

before(async () => {
  app = await buildApp();
  await app.ready();
});
after(async () => {
  await app.close();
});

test("our JSON API is allowed to load nothing", async () => {
  const res = await app.inject({ method: "GET", url: "/health" });

  // ? default-src 'none' is the whole point: if a browser ever renders this
  // ? reply as a page, no script, image or frame in it can load.
  assert.equal(res.headers["content-security-policy"], "default-src 'none';frame-ancestors 'none'");
});

test("the browser must not guess our content type", async () => {
  const res = await app.inject({ method: "GET", url: "/health" });
  assert.equal(res.headers["x-content-type-options"], "nosniff");
});

test("nobody may put our replies in a frame", async () => {
  const res = await app.inject({ method: "GET", url: "/health" });
  // ! deny, not sameorigin. Helmet's default is sameorigin; we changed it.
  assert.equal(res.headers["x-frame-options"], "DENY");
});

test("no cache may store a per-user reply", async () => {
  const res = await app.inject({ method: "GET", url: "/health" });
  assert.equal(res.headers["cache-control"], "no-store");
});

test("HSTS is off outside production", async () => {
  // ! If this ever fails on your laptop, your browser has been told to force
  // ! HTTPS on localhost for a year. That is painful to undo.
  assert.notEqual(process.env.NODE_ENV, "production");
  const res = await app.inject({ method: "GET", url: "/health" });
  assert.equal(res.headers["strict-transport-security"], undefined);
});

test("the page-only headers we switched off are absent", async () => {
  const res = await app.inject({ method: "GET", url: "/health" });

  for (const h of [
    "cross-origin-opener-policy",
    "origin-agent-cluster",
    "x-dns-prefetch-control",
    "x-download-options",
    "x-permitted-cross-domain-policies",
  ]) {
    assert.equal(res.headers[h], undefined, `${h} should be off`);
  }
});

test("headers still land on an error reply, not just a 200", async () => {
  // ? A 404 is where header middleware most often gets skipped.
  const res = await app.inject({ method: "GET", url: "/nope" });

  assert.equal(res.statusCode, 404);
  assert.equal(res.headers["x-content-type-options"], "nosniff");
  assert.equal(res.headers["cache-control"], "no-store");
});
