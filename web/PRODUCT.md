# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Members of a small work team tracking their own tasks. They are real teammates,
not demo users: they sign in, open their team, and work through tasks during a
normal working day. Four roles exist, and the role decides what a person can do:
Owner, Admin, Member, Viewer. A Viewer reads. A Member works on tasks. An Admin
manages membership and projects. An Owner can delete the team.

## Product Purpose

A Team Task Tracker: teams hold projects, projects hold tasks. Success is a
teammate opening the app and finishing task work without being shown an action
they are not allowed to take, and without being blocked from one they are.

## Positioning

Permissions are the product's centre, not an afterthought. Every reply from the
API carries the `can` list the server computed for the person asking, so the UI
draws exactly the actions that person holds. There is no second copy of the
rules in the front end to drift out of date.

## Operating Context

- Desktop and mobile browsers, signed in over HTTPS against a deployed API.
- Session is an HttpOnly cookie. The page can never read it; "am I signed in"
  is a question asked of the server, answered `undefined` (still asking),
  `null` (signed out) or a user.
- Surfaces today: login, home (signed-in identity + teams), projects, tasks,
  and an audit panel for roles that hold `audit:read`.

## Capabilities and Constraints

- Teams with per-team role; projects; tasks; membership changes; audit log.
- Actions the server recognises: task read/create/update/delete, project
  read/create/delete, member invite/remove, team delete, audit read.
- Adding a member is Admin-only and takes a user id. Email invites are parked,
  not dropped — they arrive when there is a real mailer (MISSION.md, record 0056).
- React 19 + Vite, Tailwind 4, shadcn (radix-nova), TanStack Query for all
  server state, axios with `withCredentials`. Rules in `web/CLAUDE.md` are
  binding: server state lives in Query, one QueryClient, one axios instance,
  components at module level, query keys mirror URLs.
- Dev server must run on port 5173 — the API's `ALLOWED_ORIGINS` contains that
  exact origin, and another port is another origin.

## Brand Commitments

Name: Team Task Tracker. No logo, no palette, no brand assets exist yet.
Geist is the shipped typeface. Copy is plain and short — MISSION.md's B1/B2
writing rule applies to user-facing text as well as to lessons.

## Evidence on Hand

Working API and front end in this repo; no customers, testimonials, metrics,
pricing, or press. Future work must not invent any.

## Product Principles

1. The server decides; the UI renders the decision. Never re-derive a
   permission client-side.
2. Three session states, never two — booting into "signed out" lies to someone
   already signed in.
3. Show a person only the actions they hold, and say plainly when something is
   refused.
4. A refusal is an answer, not a crash: a 401 or 403 gets a readable message.
5. Data is scoped per team, in the cache as well as on the wire.

## Accessibility & Inclusion

WCAG 2.2 AA is binding: it goes in front of people at work. Keyboard paths for
every action, visible focus, contrast at AA, form errors tied to their inputs,
and state changes announced rather than only shown by colour.
