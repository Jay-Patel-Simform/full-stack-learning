import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { buildApp } from "../app.ts";

// The ENFORCEMENT half. Same rule as headers.test.ts and cors.test.ts:
// every assertion is a line we chose in app.ts.
// No database needed - the hook answers before requireAuth ever runs.

let app: Awaited<ReturnType<typeof buildApp>>;

before(async () => {
  app = await buildApp();
  await app.ready();
});
after(async () => {
  await app.close();
});

test("a cross-site write is refused before we look at the cookie", async () => {
  const res = await app.inject({
    method: "POST",
    url: "/auth/logout",
    headers: {
      "sec-fetch-site": "cross-site",
      origin: "https://evil.example",
      cookie: "session=whatever",
    },
  });

  // ! 403, not 401. A 401 would mean "log in and try again", which is exactly
  // ! what the attacker's victim has already done.
  assert.equal(res.statusCode, 403);
});

test("a cross-site READ is not touched by this hook", async () => {
  const res = await app.inject({
    method: "GET",
    url: "/health",
    headers: { "sec-fetch-site": "cross-site", origin: "https://evil.example" },
  });

  // GET changes nothing. CORS already stops evil.example READING the body.
  assert.equal(res.statusCode, 200);
});

test("our own page may write", async () => {
  const res = await app.inject({
    method: "POST",
    url: "/auth/logout",
    headers: { "sec-fetch-site": "same-origin" },
  });

  // Not 403. It reached the handler, which deletes nothing and says 204 -
  // logging out twice is not an error. The point is the hook let it through.
  assert.equal(res.statusCode, 204);
});

test("a form post from another site cannot even reach a handler", async () => {
  // An HTML form is the classic CSRF: no preflight, no JavaScript needed.
  const res = await app.inject({
    method: "POST",
    url: "/auth/login",
    headers: {
      "sec-fetch-site": "cross-site",
      origin: "https://evil.example",
      "content-type": "application/x-www-form-urlencoded",
    },
    payload: "email=victim@example.com&password=x",
  });

  // 403 from our hook. Without it this would be 415 from Fastify - which is
  // also a refusal, but an accident, not a decision.
  assert.equal(res.statusCode, 403);
});
