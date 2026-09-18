# 0031 — Idempotent is about the state, not the answer

Date: 2026-09-10
Lesson: [28 — The reply that says nothing](../lessons/0028-the-reply-that-says-nothing.html)

## Context

Record 0030 left the Docker fork as **Jay's** decision, so this session opened
with it: OrbStack, Docker Desktop, skip local Docker, or postpone deploy and
finish the UI. **He chose postpone** — lesson 28 is deleting a task from the
page, and Docker becomes lesson 29 with the same four options still on the
table. First time in the course he has answered a question I asked, and the
answer moved the plan.

Checked his lesson 27 work first: `src/config.ts` exists, `npm test` = 141,
`tsc --noEmit` clean. Two things unfinished and worth saying out loud rather
than fixing for him — `app.ts`/`server.ts` still write `config.X ?? "default"`,
which puts back the default the lesson removed, and `db.ts`/`auth/session.ts`
still read `process.env` directly. He also skipped `.env.example`.

## Decision

**1. The spine is the definition of *idempotent*, and it is narrower than he
thinks.** Every prior lesson used the word loosely. Measured: `DELETE` twice
answers **204 then 404**. Same world after both. So idempotent is a promise
about *state*, and a retry can be perfectly safe while *looking* like a
failure. That inversion is the lesson.

**2. The three writes now form a closed table, so teach them as one.** PATCH
(200 + row, map), POST (201 + a *second* row, append), DELETE (204 + nothing,
filter). This is the first lesson that could only be written after 25 and 26
existed — retrieval practice for free, and the table is the thing he keeps.

**3. The cache move is the concrete skill: filter by `variables`, not by the
reply.** `onSuccess` has four arguments and he has only ever used the first.
When the reply is empty the *second* one is the whole payload.

**4. Best beat in the lesson, and it is a TypeScript beat, not an HTTP one.**
`api.delete<Task>(url)` **compiles clean** and `.data` is `""` at runtime. A
type parameter is a claim you made, not a fact the compiler checked. Made it
exercise 3: write the broken version, watch the build pass, watch the row
refuse to disappear. First time in the course that *the type system itself* is
the trap.

**5. Two deliberate omissions, both argued in the lesson.** No confirm dialog
(a speed bump people learn to click through — real undo needs a `deletedAt`
column and is a server lesson), and no optimistic removal (same reasoning as
lesson 25: the cheapest rollback is having nothing to roll back).

**6. Accessibility is not a lazy corner.** `aria-label={`Delete ${task.title}`}`
— an icon-only destructive button whose label does not say *which* row.

**7. No new dependency, thirteenth lesson running.** `Trash2` from
`lucide-react`, already installed.

## Measured, on his real code

Fresh team, real Postgres, an OWNER and a VIEWER, via `app.inject()`:

```
POST   /teams/480/tasks     -> 201  {"id":399,...}
DELETE /teams/480/tasks/399 -> 204  body "" · 0 bytes · no content-type · no content-length
DELETE /teams/480/tasks/399 -> 404  {"error":"not found"}
PATCH  /teams/480/tasks/399 -> 404  {"error":"not found"}
GET    /teams   as VIEWER   -> can: ["task:read"]
DELETE as VIEWER            -> 403  {"error":"forbidden"}
DELETE from evil.com        -> 403  {"error":"cross-site write refused"}
```

Every one of those — 204, 404, 403 — landed in `AuditLog`. The audit hook from
lesson 19 needed no change to cover a route it had never seen used.

And the client half, real axios against a real 204:

```
axios 204 -> status 204 | data: "" | typeof string | content-type: (none)
axios 404 -> throws, e.response.status 404
```

Then **wrote the real `useDeleteTask`, the button, and the `can` prop**, ran
`npm run build` (which is `tsc -b` + vite): clean, 336.82 kB. Then restored
`tasks.ts`, `tasks-panel.tsx` and `teams-card.tsx` from backups and rebuilt:
clean. **`web/` is byte-identical to how I found it** — record 0025's standing
rule.

## Found while writing it

- **The measurement produced the lesson's title, fifth lesson running.** I
  expected the headline to be the `filter` move. It is `data: ""` — an empty
  *string*, which is falsy, indexable and not `undefined`, so it fails later
  and quietly rather than at the assignment.
- **Lesson 23's dead placeholder finally pays off.** `BUTTONS` in
  `teams-card.tsx` has held a permanently-`disabled` "Delete task" button since
  lesson 23. Lesson 28 deletes that line and puts a real `can` check on the
  real row. The rule did not change; it moved *closer to the thing it guards*.
  I did not plan this and it is the most satisfying two-line diff in the course.
- **`mutationFn` must have a block body, not an arrow expression.** An
  expression body returns the axios response, and then `_nothing` is a lie.
  One brace, and it is the difference between honest and accidental.
- The three-writes table is the seventh "count what applies" table and the
  first where all three rows are **his own code**, not a library or an attack.
- Fixed `lessons/index.html` while I was in it: everything from 11 to 27 was
  filed under "Week 7–8 · API security". Now split into 7–8, 9–10 front end,
  and 11–12 deploy. Course map, so it earns the tidy.
- Lesson length 17.8 KB, in line with 26 and 27. Prose ~5.5 KB.
- Ran the show-me skill per workspace CLAUDE.md:
  `show-me-0028-nothing-came-back.html` — send-it-twice across all three
  writes, the two-ids comparison, and the 204 on the wire.

## Consequence

- New: `lessons/0028-the-reply-that-says-nothing.html`,
  `lessons/show-me-0028-nothing-came-back.html`.
- `reference/react-query-rules.html`: four new rules, a `useDeleteTask` block,
  a `204` row in the status-code table, three new glossary terms.
- `lessons/index.html`: lesson row, three week headings, new "next up".
- **Zero net code changes in `server/` or `web/`.** Test count unchanged at 141.

## Open

- **Docker, still Jay's call, now the whole of lesson 29.** The four options
  stand: OrbStack (recommended, ~50–80 MB idle), Docker Desktop (~2 GB VM),
  no local Docker at all (Fly builds remotely), or keep postponing.
- **Lesson 27 is not finished.** The `??` fallbacks in `app.ts`/`server.ts`
  undo the lesson; `db.ts` and `auth/session.ts` still read `process.env`; no
  `.env.example`. Said so at the top of this session. If it is still true at
  lesson 29, do it *with* him rather than mentioning it a third time.
- The lesson-26 trim fix is now exercise 6 here. Second time asked.
- **No front-end test, third lesson running.** This is now the loudest gap in
  the workspace and it is named as such in the lesson's gaps table.
- Still no `POST /teams` from the page. Still no optimistic updates (deliberate).
- Soft delete / real undo is a genuine future lesson, and lesson 28 plants it.
