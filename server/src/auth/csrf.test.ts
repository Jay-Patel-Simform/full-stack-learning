import assert from "node:assert/strict";
import test from "node:test";
import { allowWrite } from "./csrf.ts";

// The DECISION half. A pure function, so no server and no database - same
// split as can.test.ts. The ENFORCEMENT half is src/routes/csrf.test.ts.

const ALLOWED = ["http://localhost:5173"];

test("a safe method needs no defence", () => {
  for (const method of ["GET", "HEAD", "OPTIONS"]) {
    // Even from the worst possible caller. GET changes nothing in this API.
    assert.equal(
      allowWrite(method, "cross-site", "https://evil.example", ALLOWED),
      true,
      `${method} was blocked`,
    );
  }
});

test("our own page may write", () => {
  assert.equal(allowWrite("DELETE", "same-origin", undefined, ALLOWED), true);
});

test("a stranger's page may not write", () => {
  // This is the whole attack: evil.example runs fetch() with our cookie.
  assert.equal(allowWrite("POST", "cross-site", "https://evil.example", ALLOWED), false);
});

test("the dev front end on another port may write", () => {
  // Different port = different origin, same site. Only the list can tell.
  assert.equal(allowWrite("POST", "same-site", "http://localhost:5173", ALLOWED), true);
});

test("a sibling subdomain is not our front end", () => {
  // same-site is NOT good enough: blog.app.example is same-site with
  // app.example, and whoever runs the blog is not us.
  assert.equal(allowWrite("POST", "same-site", "https://blog.app.example", ALLOWED), false);
});

test("a browser that says nothing useful is denied", () => {
  // Sec-Fetch-Site present, not same-origin, and no Origin header at all.
  assert.equal(allowWrite("POST", "none", undefined, ALLOWED), false);
});

test("a non-browser client still works", () => {
  // curl sends neither header. It also has no victim's cookie, so it was
  // never the threat. Flip the last line of csrf.ts to make this false.
  assert.equal(allowWrite("POST", undefined, undefined, ALLOWED), true);
});
