# 0044 — A believed type is fixed by a check, not by a library

Date: 2026-09-11
Lesson: [40 — A believed type can check itself](../lessons/0040-a-believed-type-can-check-itself.html)

## Context

He said "move to lesson 40" with no topic. Lesson 39's footer had already named
the open question: validate the reply with zod, or keep believing it? Nothing
in `web/` needed a hand-over — he built lesson 39 exactly as written, 7 tests,
clean `tsc`, clean `build`.

## Decision

Answered the question by measuring both sides instead of arguing on priors.
Bundled one nine-field zod schema alone through esbuild, minified: 440 KB /
**91.5 KB gzip**. Wrote a 15-line hand-checked type predicate for the same
object and measured it against the exact bug lesson 39 found (`status` sent as
a string): both catch it. Chose the hand check. Streak: **40 lessons, no new
dependency** — deliberately, on evidence, not by default.

## Why it matters

The real fix for "believed" was never zod specifically — it was *any* code
that inspects the value before something downstream trusts it. Zod is one way
to write that code; it is not the only way, and it is the expensive way for a
schema this small. The lesson generalizes lesson 22's lucide-react finding
(44 MB installed, 0 imports) into a rule: **a general tool's cost is
proportional to its generality, not to what one call-site uses of it.**

The guard goes inside `queryFn`, before the return — the exact boundary where
an `unknown` value first becomes a typed one. React Query's existing `error`
state (from lesson 22's three states) already has a place for what it throws.
No new UI branch.

## Measured

- `AuditPage.safeParse({ ..., status: "200" })` → rejects, `expected number,
  received string`, confirming zod would work.
- Hand-written `isAuditRow`/`assertAuditPage` rejects the identical bad input
  with the same shape of failure, for 0 KB and no install.
- esbuild, one schema, minified+gzip: 91.5 KB. Ran it in a scratch npm project,
  deleted after.

## Consequences for future lessons

- The ninth dependency decision in this workspace, and the first one on the
  web side that reached "no" on cost evidence rather than on a bad default
  (11) or a stale browser assumption (16). New rule for the table: **take a
  dependency only when the problem has no decisions left in it** — this one
  still has all nine fields as decisions.
- `reference/react-query-rules.html` gained two glossary rows (`runtime
  guard`, `type predicate`) and a table: where to check a believed reply.
- Homework closes by naming, not fixing, a second believed type still in the
  app (`useSession`'s `User` or `useTeams`'s `can`). Open for a future lesson.
- The community pointer (TanStack discussions, "validate response queryFn")
  is aimed at the honest limit of today's answer: at a bigger API, the
  91.5 KB might buy back its cost. Worth revisiting if this app's schema count
  grows past a handful.

## Open

Which believed type he names for homework. Otherwise unchanged from lesson 39:
homework 9 (144k refusal rows/day), Vitest for a first component test, the
`CHECK` constraint on JSON columns, `REVOKE UPDATE, DELETE ON "AuditLog"` at
the end of week 13.
