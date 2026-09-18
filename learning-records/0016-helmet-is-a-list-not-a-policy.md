# 0016 — Helmet is a list of strings, not a policy for my app

Date: 2026-09-04
Lesson: [15 — Headers for JSON, not pages](../lessons/0015-headers-for-json-not-pages.html)

## Context

Week 7–8 called for "Helmet headers". The obvious move is `app.register(helmet)`
and tick the box. Helmet sets thirteen headers by default. The Team Task Tracker
serves JSON only — no HTML page comes out of Fastify at all.

## Decision

Take `@fastify/helmet@13.1.1` (third dependency ever), then **switch off or
override most of what it sets**:

- Keep: `X-Content-Type-Options: nosniff`, `Referrer-Policy`,
  `Cross-Origin-Resource-Policy: same-origin`.
- Override: CSP down to `default-src 'none'; frame-ancestors 'none'` with
  `useDefaults: false` — Helmet's default `'self'` describes a page, not an API.
  `X-Frame-Options` from `SAMEORIGIN` to `DENY`.
- Gate: `hsts` only when `NODE_ENV === "production"`.
- Off, all page-only: `crossOriginOpenerPolicy`, `originAgentCluster`,
  `xDnsPrefetchControl`, `xDownloadOptions`, `xPermittedCrossDomainPolicies`.
- Add by hand: `Cache-Control: no-store` in an `onSend` hook. No plugin sets it.

## Why

Four of thirteen defaults do anything for a JSON response. Two of the four are
set for somebody else's app. The value in Helmet is the *list* — correct
spellings, current values, headers browsers have since dropped — not the
judgement. Judgement is mine because only I know what shape my responses are.

`useDefaults: false` is load-bearing. Without it the two directives are merged
into Helmet's page policy and `default-src` stays `'self'`.

`onSend` rather than per-route for `no-store`, because a 429 from the rate
limiter, a 400 from zod and a 404 never reach a handler. A rule with no
exceptions belongs in the last hook before the bytes leave.

## The third dependency rule

Two rules existed already: reject on a wrong default (lesson 11), take it when
no decisions are left (lessons 12–13). This is the third shape — **take it and
turn it down**: right about the facts, wrong about the situation.

## Consequence

- `npm test` = 82. Seven new in `src/routes/headers.test.ts`, all asserting a
  line we chose, none asserting plugin behaviour.
- HSTS is the first genuinely hard-to-undo thing in the codebase. Sending it
  from localhost pins the whole host to HTTPS in that browser for a year, and
  the fix is manual, per browser. The `NODE_ENV` gate exists only for this.
- The React front end still needs its **own** CSP, served by nginx (week 9–10).
  This CSP protects API replies and nothing else. Do not treat CSP as done.
- Redis debt closed as a *decision*, not a question: both counters move to a
  shared store in week 11–12, written into PLAN.md.

## Open

- CSRF walk-through, still owed from lesson 14. Lesson 16 is built on it.
- Whether CSP on a JSON-only API is theatre. Sent to the community.
