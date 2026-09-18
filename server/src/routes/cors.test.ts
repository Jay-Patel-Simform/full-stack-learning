import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { buildApp } from "../app.ts";

// * These test what we DECIDED (the allowlist, the credentials flag), not what
// * the plugin ships. The plugin's own spec compliance is its job, not ours.

let app: Awaited<ReturnType<typeof buildApp>>;

before(async () => {
  app = await buildApp();
  await app.ready();
});
after(async () => {
  await app.close();
});

test("an allowed origin is echoed back, with credentials", async () => {
  const res = await app.inject({
    method: "GET",
    url: "/health",
    headers: { origin: "http://localhost:5173" },
  });

  assert.equal(res.statusCode, 200);
  assert.equal(res.headers["access-control-allow-origin"], "http://localhost:5173");
  assert.equal(res.headers["access-control-allow-credentials"], "true");
});

test("a stranger's origin gets no allow header at all", async () => {
  const res = await app.inject({
    method: "GET",
    url: "/health",
    headers: { origin: "https://evil.example" },
  });

  // ! The request still succeeds. CORS is not a server-side gate: the BROWSER
  // ! withholds the reply from the page because this header is missing.
  assert.equal(res.statusCode, 200);
  assert.equal(res.headers["access-control-allow-origin"], undefined);
});

test("the origin is never reflected blindly", async () => {
  const res = await app.inject({
    method: "GET",
    url: "/health",
    headers: { origin: "http://localhost:5173.evil.example" },
  });

  // ? A prefix match would pass this. An exact list does not.
  assert.equal(res.headers["access-control-allow-origin"], undefined);
});

test("the preflight for a real write is answered", async () => {
  const res = await app.inject({
    method: "OPTIONS",
    url: "/auth/login",
    headers: {
      origin: "http://localhost:5173",
      "access-control-request-method": "POST",
      "access-control-request-headers": "content-type",
    },
  });

  assert.ok(res.statusCode < 300);
  assert.equal(res.headers["access-control-allow-origin"], "http://localhost:5173");
  assert.match(String(res.headers["access-control-allow-methods"]), /POST/u);
});

test("a method we never allowed is not offered", async () => {
  const res = await app.inject({
    method: "OPTIONS",
    url: "/auth/login",
    headers: {
      origin: "http://localhost:5173",
      "access-control-request-method": "PUT",
    },
  });

  assert.doesNotMatch(String(res.headers["access-control-allow-methods"] ?? ""), /PUT/u);
});
