import { assertAuditPage, auditKey, formatAt } from "./audit-row.ts";

// Vitest, not node:test, since lesson 68. These are still pure-function
// tests with no DOM in them -- what changed is the runner, because one
// runner beats two. `test` and `expect` are globals (vite.config.ts).
// Thin wrappers keep the original assertion style readable.
const expectNotSame = (a: unknown, b: unknown) => expect(a).not.toBe(b);
const expectEqual = (a: unknown, b: unknown) => expect(a).toEqual(b);
const expectNotEqual = (a: unknown, b: unknown) => expect(a).not.toEqual(b);
const expectThrows = (fn: () => unknown) => expect(fn).toThrow();

test("the filter is part of the key", () => {
  expectNotEqual(auditKey(1, {}), auditKey(1, { status: 403 }));
});
test("an ISO string is formatted, not echoed", () => {
  const at = "2026-09-11T06:58:31.158Z";
  expectNotSame(formatAt(at), at);
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
  expectEqual(assertAuditPage({ items: [row], nextCursor: null }), {
    items: [row],
    nextCursor: null,
  });
});

test("status as a string is rejected", () => {
  // ! The exact bug lesson 39 found: the wire says "200", the type says number,
  // ! and nothing between them compared the two.
  expectThrows(() =>
    assertAuditPage({ items: [{ ...row, status: "200" }], nextCursor: null })
  );
});
