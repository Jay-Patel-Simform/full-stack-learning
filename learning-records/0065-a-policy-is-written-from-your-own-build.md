# 0065 — A policy is written from your own build, not from a blog post

Date: 2026-09-18
Status: accepted
Lesson: [62 — The header that says no](../lessons/0062-the-header-that-says-no.html)

## Context
Lesson 61 put `render.yaml` in git and named the `headers:` key as the one
thing deliberately left out, "because the hard part is the policy, not the
YAML". Every defence written so far (sessions, `can()`, rate limit, CSRF)
runs on the server and trusts the browser to be asking on the user's behalf.
Nothing on the page constrains code that is already on the page.

## Decision
- **The policy is derived from four facts checked in this repo**, not copied:
  `web/dist/index.html` has one external module script and no inline script;
  fonts are `@fontsource-variable/geist`, self-hosted; `style=` attributes are
  live (`skeleton.tsx`, plus Radix and `motion` at runtime); `VITE_API_URL`
  is `/api`, same origin since lesson 57.
- **Final policy**: `default-src 'self'; script-src 'self'; style-src 'self'
  'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self';
  frame-ancestors 'none'; base-uri 'none'; form-action 'self'; object-src
  'none'`.
- **`'unsafe-inline'` is accepted for `style-src` and named as a weakening.**
  The clean fix is a per-request nonce; a static file on a CDN has no
  per-request server to issue one. The rule stated hard: never move
  `'unsafe-inline'` into `script-src` to silence an error.
- **Ship as `Content-Security-Policy-Report-Only` first**, exercise every
  screen with the console open, then delete `-Report-Only`. Same shape as the
  expand/backfill/contract migration from lesson 10: observable before
  authoritative.
- **On the static site only.** JSON renders nothing; a CSP on the API is
  theatre.
- The header value is **one quoted string on one line** — directives are
  `;`-separated inside the value, not a YAML list.

## Consequences
- General rule: **CSP is the only defence that instructs the browser instead
  of trusting it**, which is why it is worth nothing alone and is the only
  thing that helps after something has already gone wrong on the page.
- Second rule: **three of the four policy decisions were free because of
  earlier lessons** — self-hosted fonts, a same-origin API (lesson 57) and a
  bundler that emits real files. Tight deploys make tight policies cheap.
- `connect-src` taught as the last line, not a duplicate of `default-src`: it
  blocks exfiltration by code already running inside the bundle.
- Zero application code, zero dependency. Suite stays 172.

## Still open
- **Unmeasured and flagged in the lesson:** whether a `path: /*` header is
  applied to `/api/*` rewritten-proxy responses. Jay checks with `curl -sI`
  on the deployed site and reports back.
- Left out: `report-uri`/`report-to` (needs an unauthenticated public route,
  so its own lesson), a style nonce (needs server-rendered HTML), the other
  security headers (`HSTS`, `X-Content-Type-Options`, `Referrer-Policy` —
  check what Render already sends before adding).
- **Lesson 61's Blueprint-adoption question is still unanswered** and has now
  been carried for two lessons. Ask Jay directly next session (NOTES rule:
  do not let an honesty box go three lessons).
- Redis for the two in-process counters. The invite mailer, week 13–14.
