# 0018 — Strip is safe, reject is safe and honest

Date: 2026-09-07
Lesson: [17 — The key you did not name](../lessons/0017-the-key-you-did-not-name.html)

## Context

Week 7–8's mass assignment slot. `createTask` does
`data: { ...input, teamId, ownerId }` — the caller's JSON spread straight into
a Prisma write. That is textbook mass assignment
([CWE-915](https://cwe.mitre.org/data/definitions/915.html), merged into
**API3:2023 Broken Object Property Level Authorization**).

The API was already safe from it, for four reasons. Counted them, and **only
one was a decision Jay made**:

| What stopped it | Chosen? |
|---|---|
| `z.object` strips unknown keys | No — a zod default |
| `ownerId` written after the spread | No — the order he happened to type |
| The serializer drops undeclared output fields | **Yes**, lesson 2 |
| `patch as { title?: string }` | Not a check at all — `as` is a no-op at runtime |

## Decision

**Every request body is parsed strictly.** Four lines in `src/app.ts`, inside
the validator compiler from lesson 2:

```ts
app.setValidatorCompiler(({ schema, httpPart }) => {
  const s = httpPart === "body" && schema instanceof ZodObject
    ? schema.strict()
    : (schema as ZodType);
  return (data) => { /* safeParse, unchanged */ };
});
```

Plus one `.refine((p) => Object.keys(p).length > 0)` on `UpdateTask`, because
`.partial()` also permits *no* field, and an empty `PATCH` answered 200.

Rejected: writing `.strict()` on all seven body schemas.

## Why

- **Strip vs reject.** Both refuse the unnamed key. Zod's default *strips
  silently*, which stops the attacker and lies to Jay: a front-end typo
  (`isDone` for `done`) gets a 200 and changes nothing. Reject names the key
  in a 400. The day-to-day value is the honesty, not the security.
- One place beats seven. Same argument as `can()` (lesson 7) and the
  `no-store` hook (lesson 15): **a rule with no exceptions does not belong in
  each caller.** Fifth use of "make the safe thing the default, the unsafe
  thing deliberate" — under `.strict()`-per-schema, strict is opt-in; here
  loose is opt-out, in writing.
- `httpPart === "body"` scopes it to the one input a client fully composes.
  The **query string** is the reason: it collects `utm_source`, `fbclid` and
  proxy cache-busters, so strict there turns a shared link into a 400.
- Free protection you cannot see is protection you delete by accident. Three
  of the four things guarding this were accidents.

## Correction I had to make mid-lesson

I first wrote that strict params "would 400 every route in the app". **I
measured it and that was false** — 5 failures, all in the new test file, none
elsewhere, because every params object holds exactly the declared URL
segments. Rewrote the lesson to give the measured number and say the check is
a *scope choice*, not a rescue.
Lesson for me: run the break-it exercise before writing its expected output.

## Consequence

- `npm test` = **101**, was 93. Eight new, all enforcement, in
  `src/routes/mass-assignment.test.ts`. No decision half — the decision is
  four lines in `app.ts`, so the test that matters is a real HTTP request.
  Same shape as lesson 12.
- **No new dependency.** Two lessons running.
- The `as` cast in `task.store.ts` now carries a comment naming the rule that
  makes it true. An `as` is a promise; something four files away keeps it.
- A misspelled field from the React front end will now be a 400 with the key
  in the message. This is the payoff Jay will actually feel, in week 9–10.

## Open

- **Strict is a check on the schema, not on the judgement.** `AddMember`
  names `role` on purpose; what refuses `{"role":"OWNER"}` from an ADMIN is
  the rank rule in `can()` (lesson 9), not anything here. That is this
  lesson's one homework question, asked backwards.
- Nested-object strictness is inherited but untested — no nested body exists.
- `request.query` gets its own zod schema the day a route reads it
  (week 13–14, pagination).
- Still open in week 7–8: SQL injection (why Prisma helps), timing attacks,
  the audit log table.
