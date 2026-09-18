# Same-origin deletes the question instead of answering it

Lesson 14 (2026-09-04), fourth of week 7-8. No code change in `server/`.
New file: `deploy/nginx.conf`. `npm test` still 75.

## The graded answer

Jay's homework answer to the subdomain question was "You add site URL in the
allowlist". One of three:

- **Right:** the CORS allowlist changes. `app.example` -> `api.app.example` is
  a different origin.
- **Not said:** `SameSite=Lax` does *not* change. Same registrable domain =
  same site. He had the table in lesson 13 but did not reach for it.
- **Not found:** the third option.

Read-back: he answers the part that has a knob, and does not check the part
that has no knob. Ask "and which one does NOT change?" explicitly next time,
as its own question, rather than folding it into one sentence.

## The decision

**Same origin, via an nginx reverse proxy.** Front end and API both on
`https://app.example`; `/api/*` proxied to `127.0.0.1:3000` with a trailing
slash on `proxy_pass` to strip the prefix. Fastify never gets a public port.

What it buys: no CORS, no preflights, no allowlist string in production, and
— the bigger win — **relative fetch URLs**, so no API base URL in the front
end at all.

Subdomain is right only if the API gets other clients (mobile, partners) or
front end and API must scale apart. Neither is true for the Team Task Tracker.

## The two costs, stated out loud

1. `request.ip` becomes `127.0.0.1`. The lesson-12 IP limiter turns into one
   shared bucket for the whole internet. Fix is `trustProxy: true` — deferred
   to week 11-12 deliberately, because it is only safe *behind* the proxy.
2. **Going same-origin removes a defence.** Cross-origin writes needed a
   preflight a hostile page could not get. Same-origin writes need none, so
   `SameSite=Lax` is now the only thing standing in front of CSRF.

That second one is deliberately left as the cliffhanger: the homework asks
him to walk a hostile `DELETE` through the browser and name what stops it.

## Still open

- Redis, now four lessons old. Asked again as a due debt, not a new question.
- `trustProxy: true`, week 11-12, tied to the nginx cutover.
- Cookie `Secure` flag, at deploy.
- CSP / security headers — that is lesson 15.
- Body-size limit is **done** (`bodyLimit: 64 * 1024` in `src/app.ts`).
