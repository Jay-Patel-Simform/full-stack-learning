# 0061 — A 404 has an author

Date: 2026-09-18
Status: accepted
Lesson: [58 — A 404 has an author](../lessons/0058-a-404-has-an-author.html)

## Context
After lesson 57's static site went live, the deployed page's `GET
/api/auth/me` returned `404 Not Found`. Three machines could have written that
404: Render's CDN, the static site's own `index.html` rule, or the API.

## Decision
- **Identify the author before changing any configuration.** `curl` against
  `https://tracker-web-mxol.onrender.com/api/health` returned
  `{"message":"Route GET:/ not found","error":"Not Found","statusCode":404}`
  with `content-security-policy: default-src 'none'` and
  `access-control-allow-credentials: true` on it. That body is Fastify's and
  those headers are helmet's, from `server/src/app.ts` — so the request
  reached the container. The rewrite worked; the path did not.
- **Root cause: the rewrite destination had no `/*`.** So every path under
  `/api` collapsed to `/`. Fix is one field:
  `https://<api>.onrender.com` → `https://<api>.onrender.com/*`.
- **Verify with `/api/health`, not `/api/auth/me`.** A correctly working `me`
  answers `401` to a cookie-less terminal, so `401` and "still broken" are
  indistinguishable. `health` needs nothing, so `200` proves only arrival.

## Consequences
- New general rule: **matching and forwarding are two decisions.** The `*` in
  a rule's source captures; the `*` in its destination pastes. A rule can
  match perfectly and forward the wrong thing. Sits next to lesson 57's
  "order is the whole correctness argument".
- New diagnostic habit: **a reply carries the fingerprints of every hop.**
  Your API's 404 is JSON naming a route; the CDN's is bare HTML; rule 2
  swallowing the path is a `200` of `index.html`. Three symptoms, three
  different fixes, told apart from the terminal with no dashboard access.
- **Fastify's default 404 message is what solved this.** A friendlier
  catch-all handler would have hidden the path. Deliberately not added.
- Strongest argument yet for `render.yaml`: a rule in a reviewed file cannot
  lose a character unseen. Still open.
- Zero TypeScript. Suite stays 172. No new dependency, 58 lessons.

## Still open
- Whether the CDN rewrite hop preserves the client IP in `X-Forwarded-For`
  (record 0060). Now asked twice and still unmeasured — it needs his logs.
- The two front-end holes: nothing reads the audit log, no page creates a team.
- `render.yaml`. A real page CSP via the static site's custom headers.
