// Run with: npm test
// Lesson 19, the decision half. Which requests earn a row?
//
// Pure function, no database, no HTTP. The enforcement half -- does a real
// request actually land a row -- is src/routes/audit.test.ts.
import { test } from "node:test";
import assert from "node:assert/strict";
import { shouldAudit } from "./audit.ts";

// * Every write, whatever the answer was. A failed delete is the interesting one.
test("every write earns a row, success or not", () => {
  assert.equal(shouldAudit("POST", 201), true);
  assert.equal(shouldAudit("PATCH", 200), true);
  assert.equal(shouldAudit("DELETE", 204), true);
  assert.equal(shouldAudit("DELETE", 404), true);
  assert.equal(shouldAudit("POST", 400), true);
});

// ! The cap. One row per GET is how an audit table becomes 40 million rows of
// ! nothing, gets deleted in a month, and leaves you with no audit log at all.
test("a plain read earns nothing", () => {
  assert.equal(shouldAudit("GET", 200), false);
  assert.equal(shouldAudit("HEAD", 200), false);
  assert.equal(shouldAudit("OPTIONS", 204), false);
});

// * A refused read is not a read, it is an attempt. This is what a scan
// * through /teams/1..500 looks like, and it is only visible here.
test("a refused read earns a row", () => {
  assert.equal(shouldAudit("GET", 401), true);
  assert.equal(shouldAudit("GET", 403), true);
  assert.equal(shouldAudit("GET", 429), true);
});
