import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { buildApp } from "../app.ts";

// * Lesson 65. Three decisions worth a test: the content type parses, a bad
// * body is dropped rather than 400'd, and no session is needed.

let app: Awaited<ReturnType<typeof buildApp>>;

before(async () => {
  app = await buildApp();
  await app.ready();
});
after(async () => {
  await app.close();
});

const post = (payload: string) =>
  app.inject({
    method: "POST",
    url: "/csp-report",
    headers: { "content-type": "application/csp-report" },
    payload,
  });

test("a report from nobody is accepted with 204", async () => {
  const res = await post(
    JSON.stringify({
      "csp-report": {
        "blocked-uri": "https://evil.example/x.js",
        "violated-directive": "script-src",
        "document-uri": "https://app.example/",
      },
    }),
  );

  // ? without addContentTypeParser this is 415, before the handler exists
  assert.equal(res.statusCode, 204);
});

test("a malformed report is dropped, not complained about", async () => {
  const res = await post("not json");

  assert.equal(res.statusCode, 204);
});