# Mission: Secure Full-Stack APIs (Node + TypeScript)

## Why

Jay can already build front ends (JS/TS, React/Vue) but cannot yet build the server behind them. He wants to own the whole stack: design and ship an API that handles login, permissions, and data safely enough to put in front of real users at work.

## Success looks like

- A deployed Team Task Tracker: teams, projects, tasks, with Owner / Admin / Member / Viewer roles.
- Invites — **parked 2026-09-17, not dropped.** Jay's call: build it when he actually
  needs to send email, because an invite with no mailer is half a feature. Until then
  adding a member stays an Admin-only action taking a user id. See record 0056.
- Auth written by hand: password hashing, sessions/refresh tokens, revocation — and he can explain each choice.
- One `can(user, action, resource)` permission check that every route uses, with tests proving Viewer cannot edit and Member cannot delete a team.
- He can attack his own API (IDOR, mass assignment, missing rate limit) and fix what he finds.
- The app runs in Docker and is deployed to a real URL over HTTPS.

## Constraints

- 5-8 hours per week. Roughly 16 weeks (see [PLAN.md](./PLAN.md)).
- Stay in TypeScript. Node + Fastify, Postgres + Prisma.
- Mix of building and topic practice — not just shipping, not just theory.
- Prefers writing auth himself first rather than using Auth0/Clerk, because learning is the point.

## Out of scope

- New backend languages (Go, Python, Java).
- Managed auth services, for now.
- Mobile apps, microservices, Kubernetes.

## Learning constraints (apply to every lesson)

- English is my second language. Write at a B1/B2 level.
- Sentences under 20 words. One idea per sentence.
- No idioms, no metaphors, no academic phrasing.
- Every technical term: give the plain-English meaning in
  brackets the first time it appears in a lesson, even if an
  earlier lesson already defined it. Then add it to the glossary.
- Show the code or concrete example FIRST, then explain it.
  Never explain abstractly before showing.
- If a source uses dense language, paraphrase it. Do not quote
  it into the lesson.
- Max 5 new terms per lesson. If a topic needs more, split it.
