import test from "node:test";
import assert from "node:assert/strict";
import { assertAuditPage, auditKey, formatAt } from "./audit-row.ts";

test("the filter is part of the key", () => {
  assert.notDeepEqual(auditKey(1, {}), auditKey(1, { status: 403 }));
});
test("an ISO string is formatted, not echoed", () => {
  const at = "2026-09-11T06:58:31.158Z";
  assert.notEqual(formatAt(at), at);
});

// One good row, spread into each bad case below. Written out once so a test
// that fails names the ONE field it changed.
const row = {
  id: 1,
  at: "2026-09-11T06:58:31.158Z",
  userId: null,
  actorEmail: null,
  method: "GET",
  route: "/teams/:teamId/audit",
  status: 200,
  targetType: null,
  targetId: null,
};

test("a well-formed page passes", () => {
  assert.deepEqual(assertAuditPage({ items: [row], nextCursor: null }), {
    items: [row],
    nextCursor: null,
  });
});

test("status as a string is rejected", () => {
  // ! The exact bug lesson 39 found: the wire says "200", the type says number,
  // ! and nothing between them compared the two.
  assert.throws(() =>
    assertAuditPage({ items: [{ ...row, status: "200" }], nextCursor: null })
  );
});
