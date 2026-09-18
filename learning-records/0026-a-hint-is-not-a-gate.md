# 0026 — A hint is not a gate

Date: 2026-09-09
Lesson: [23 — The button you can still press](../lessons/0023-the-button-you-can-still-press.html)

## Context

Lesson 22 left the front end knowing an email and nothing else. The plan's
remaining week 9–10 item was "role-based UI hiding, and hiding a button is not
security", blocked on two pieces of server work: `UserPublic` carries no role,
and there was no way for the page to discover a `teamId`.

## Decision

**One new route, `GET /teams`, answering `{ id, name, role, can }` per team.**

**1. No `requirePermission` on it, deliberately.** Every guarded route since
lesson 8 names a team in the URL, which is what lets the gate ask "your role
*there*". This route asks the opposite question and has no scope to pass. The
authorisation is `where: { userId }` in `listMemberships` — a team you are not
in never comes back, so there is nothing to refuse. Somebody in no team gets
`[]` and a `200`, never a `403`, so an outsider cannot learn a team exists
(lesson 18's rule, applied to a list).

**2. The server sends `can`, the client keeps no permission table.** Three
words on top of the table that already exists:

```ts
export const allowedActions = (role: Role): readonly Action[] => PERMISSIONS[role] ?? [];
```

The alternative was writing role→actions again in React. Rejected: two copies
of a policy drift, and the copy that drifts is the one with no tests. The front
end now holds labels only — `BUTTONS.filter(([action]) => team.can.includes(action))`.

**3. Hide, do not disable.** A greyed-out *Delete team* still tells a Viewer
that deleting the team happens on this screen.

**4. The teams query keeps `staleTime: 30_000`** while the session query has
`staleTime: 0` (record 0025). This looks like an inconsistency and is the
lesson: a stale session leaves a signed-out person looking at an app; a stale
`can` leaves a button on screen that the server refuses. **The safety of a
cache depends on what the cached value is allowed to decide.**

**5. An "Ask the server anyway" button, shipped in the UI.** It invites *you*
to a team you are already in, so the gate refuses (403) or the gate agrees and
the store finds your row already there (409). No third answer exists, so the
button cannot change anything — a probe that is safe by construction rather
than by care. It is the lesson's feedback loop, and it is in the product.

## Why the hint can never be the gate

`can()` has taken a target since lesson 9, and the rank rule ("act only on
somebody strictly below you") needs it. A flat list has no target in it. So an
Admin's `can` contains `member:remove` and removing the Owner is still a 403.
**The UI can be told what a role may generally do; it can never be told what it
may do to *this* person.** That gap is permanent, and it is a better argument
for server-side decisions than "the user can edit your JavaScript".

## Measured, in real headless Chrome

Fresh profile, signed in through the form, one account in two teams:

```
Platform   OWNER   can: 9 actions   4 buttons   probe -> 409
Marketing  VIEWER  can: 1 action    0 buttons   probe -> 403

after replacing BUTTONS.filter(...) with BUTTONS:
Marketing  VIEWER  can: 1 action    4 buttons   probe -> 403   <- unchanged

console errors / warnings: none
```

The last line is the lesson. I verified the break-it exercise by actually
making the edit, running the probe, and reverting — same instinct as record
0025's temporary `/teams/1/tasks` query.

## Consequence

- `npm test` = **141**, was 135. Six new in `src/routes/team-list.test.ts`,
  including one test that asserts both halves at once: the viewer's `can` lacks
  `member:invite`, *and* the invite route answers 403 to a viewer who calls it.
- New files: `web/src/features/teams/teams.ts`, `teams-card.tsx`.
- Touched: `can.ts` (+1 export), `team.store.ts` (+`listMemberships`),
  `team.schema.ts` (+`TeamMembership`, `TeamList`), `teams.route.ts` (+route),
  `App.tsx`. No migration, no new dependency — **eight lessons running**.
- Reference card `rbac-permissions.html` gained a hint-vs-gate table.
- Still no `useEffect` in the front end.

## Found while writing it

- **My probe lied again, the same way as last time.** A stale headless Chrome
  from a failed run still held port 9333, so `/json/list` handed me the *old*
  browser with a signed-in cookie: "form present at boot: false" on a profile
  I had just deleted. Record 0025's rule holds — suspect the probe first — and
  now with a second symptom to recognise: **kill the old browser before
  trusting a fresh profile.**
- The audit hook (lesson 19) records the 403 from the probe with the user id on
  it, for free. Three lessons later, that table is answering questions nobody
  wrote code for today.
- Response serialisation earned its keep again: the reply is `parse`d through
  `TeamMembership`, so a `userId` or `createdAt` added to `listMemberships`
  later cannot leak. There is a test asserting the exact key set.
- Lesson length: **12.5 KB**, down from 13.5. Cut by moving the measured output
  into the show-me page, as NOTES planned. Still over the ~9 KB target, and the
  content is dense rather than padded — the honest fix next time is a smaller
  lesson, not tighter prose.

## Open

- The four buttons do nothing. Tasks on screen is the next lesson, and the
  first place where the UI and the gate can disagree about a *row* (404 vs
  403, record 0011's split).
- No way to create a team in the UI; `POST /teams` is still uncalled. Rows were
  seeded with a script.
- No front-end test. `tsc` + `oxlint` + a browser probe is not a suite. Vitest
  when there is a second screen to break.
- `GET /teams` has no pagination. Fine at two rows; a `take`/`cursor` argument
  is a five-line change when it is not.
