# 0063 — A 201 body is not a list row

Date: 2026-09-18
Status: accepted
Lesson: [60 — The team that makes you its owner](../lessons/0060-the-team-that-makes-you-its-owner.html)

## Context
Since lesson 59 anyone can register, and a fresh account lands on `TeamIndex`'s
"No teams yet" empty state with nowhere to go. `POST /teams` has existed since
week 5-6 and has only ever been called by tests.

## Decision
- **Invalidate, do not `setQueryData`.** The `201` reply is `TeamPublic`
  (`{id, name}`); a row of `GET /teams` is `TeamMembership`
  (`+ role, can`). `can` comes from `allowedActions(role)` on the server, which
  is the whole reason it is sent — so the client has no way to construct the
  row it would push. Pushing the `201` body gives a row whose `can` is
  `undefined` and a `TypeError` inside a component.
- **Return the invalidation promise from `onSuccess`.** React Query keeps the
  mutation pending until it settles, so the component's `navigate` runs against
  a list that already contains the new team. `useTeam` reads the list rather
  than fetching one team, so without the wait the target page reports a missing
  team for as long as the refetch takes.
- **Cache work in the hook, navigation in the call site.** The hook's
  `onSuccess` is true wherever the hook is used; the redirect is true only for
  this click, so it goes in `mutate`'s second argument.
- **`POST /teams` keeps no `requirePermission`.** `getRole` needs a `teamId`
  that does not exist until the handler runs; `requireAuth` is the gate, and
  the membership row the store writes is what creates the authorisation.

## Consequences
- General rule: **ask what schema a response promised before you treat it as a
  row you already hold.** Next to record 0062 ("a 201 is not a session") — same
  question one level up: there the difference was a header, here a schema.
- Lesson 26's "write it in by hand when you can do the arithmetic" now has a
  named limit: you can only do arithmetic the server did not do for you.
- Deliberately not built: a sidebar "new team" button, optimistic insert,
  unique names. Invites still parked on the mailer (record 0056).
- Zero server change. No new dependency, 60 lessons. Suite stays 172.

## Still open
- Nothing reads the audit log from the page — now the oldest hole.
- `render.yaml`, a real page CSP on the static site, Redis for the two
  in-process counters.
- The client-IP question from record 0060, still unmeasured and not re-asked.
