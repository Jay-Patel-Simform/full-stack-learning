# 0043 — Which stale copy the compiler catches is decided by the direction the value travels

Date: 2026-09-11
Lesson: [39 — The audit page in the front end](../lessons/0039-the-audit-page-in-the-front-end.html)

## Context

Seventh clean hand-over: `server` **162** passing, `web` 5, both typechecks
clean. Lesson 38 shipped whole — `audit:read` in `ACTIONS` and the ADMIN list,
`audit.schema.ts` / `audit.store.ts` / `audit.route.ts`, five tests. I read his
files before planning: `AuditPublic` has no `ip` and `at` is `z.date()`, so he
hit neither trap I planted.

He asked for the next lesson in one line, as usual. Lesson 38's record already
named this one: the audit page in the front end. The front end is where the
lesson turned out to be, but not for the reason I expected — the paging and the
filter are both third uses of rules he already has.

## Decision

Lesson 39 builds `GET /teams/:teamId/audit` into the UI as three files
(`audit-row.ts`, `audit.ts`, `audit-panel.tsx`) plus one union edit and one
mount point. Topic is not paging. Topic is **the two stale copies of the
server's reply that the browser keeps, and why the compiler catches exactly one
of them.**

Built the whole thing under `web/`, typechecked it, ran it, built the bundle,
then reverted to his pre-lesson state. Every number in the lesson is measured.

## Why it matters

Adding `audit:read` to the server left the web `Action` union behind, and the
`at` field is a `Date` on the server and text on the wire. Both are the same
mistake — a local copy that no longer matches the server. Measured, in one file,
one `tsc --strict` run:

```
can.includes("audit:read")   -> error TS2345: Argument of type '"audit:read"'
                                is not assignable to parameter of type 'Action'.
row.at.toLocaleString()      -> no error
```

The rule that explains both: **a value you pass *into* typed code is checked
against the type; a value that *arrives* from outside is believed.** Arguments,
assignments and returns are checked. JSON, `localStorage`, `URLSearchParams`
and every `as` are believed. This generalises [0034](./0034-a-declared-type-is-believed-not-checked.md)
from one bad cast to a whole class, and it gives the class a boundary you can
point at: the wire.

The date case is the worst kind of believed type, because a wrong type usually
crashes on the first method call and this one does not:

```
at.toLocaleString()             -> "2026-09-11T06:58:31.158Z"   wrong, silent
new Date(at).toLocaleString()   -> "9/11/2026, 12:28:31 PM"     right
```

`String.prototype.toLocaleString` exists and returns the string. So the call
succeeds and the only symptom is an unreadable timestamp on screen. His
**seventh** bug with no error message, and the first that lives in a type
rather than in a value or an order of operations.

## Measured

- The reply: `"at": "2026-09-11T06:58:31.158Z"` — quoted. `z.date()` on the
  server is still right; `JSON.stringify` calls `Date.prototype.toJSON`.
- `formatAt` in the hook file is untestable: `ERR_MODULE_NOT_FOUND` for
  `@/lib/api`, because `web` runs `node --test` and `@/` is a Vite alias.
  Lesson 32's rule decides the file layout *before* any code is written — three
  files, and the testable one is the one with no runtime imports.
- An allowed read adds **0** rows to the log (4 before two page loads, 4
  after). An invite plus two refused reads took it to **7**. `shouldAudit()`
  means writes and refusals, so the log records attempts to read it and ignores
  permitted reads.
- A MEMBER's `can` list has no `audit:read`, so the toggle is never drawn, and
  the route still answers 403 to a direct call. Lesson 23's hint/gate split,
  unchanged and now with a view in it.

## Consequences for future lessons

- **Two things this list does not need**, and saying so is half the lesson: no
  `auditScope` prefix (nothing invalidates an append-only list) and no
  `sort`/`dir` (the server offers none, because the index does not). Reuse the
  shape: when copying a working hook, name what you deleted and why.
- Homework 7 is **closed**, answered inside the lesson by reading one reply.
  Homework 9 (144k refusal rows/day) is the only open one — queue of one.
- I asked directly, for the first time, for him to explain an earlier word pair
  ("hint vs gate") in his own words. Promised at lesson 35, overdue.
- The zod-in-`queryFn` question is now named and deferred: validating the reply
  is the real cure for a believed type, and it costs a copy of zod in the
  bundle. First candidate to break the no-new-dependency streak on the web
  side — worth a lesson of its own when it happens.
- Streak intact: **no new dependency, 39 lessons.**

## Open

Homework 9 only, plus the direct ask about "hint vs gate". Still unpaid and
deliberate: runtime validation of replies, Vitest for the first component test,
the `CHECK` constraint on the JSON columns, and `REVOKE UPDATE, DELETE ON
"AuditLog"` at the end of week 13.
