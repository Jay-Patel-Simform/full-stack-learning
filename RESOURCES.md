# Secure Full-Stack API Resources

## Knowledge

- [The Copenhagen Book](https://thecopenhagenbook.com/)
  Free, community-maintained guide to implementing auth in web apps: sessions, tokens, password storage, MFA, CSRF. Use for: every auth decision in weeks 3-4.
- [The Copenhagen Book — Sessions](https://thecopenhagenbook.com/sessions)
  Primary source for lesson 6. Server-side sessions, expiry, sliding windows. Use for: any "how do I stay logged in" question.
- [The Copenhagen Book — Server-side tokens](https://thecopenhagenbook.com/server-side-tokens)
  The exact numbers for generating a session id: 112+ bits of entropy (120-256 is the good range), cryptographically secure generator, SHA-256 before storage. Use for: session ids, password reset tokens, invite codes.
- [The Copenhagen Book — Cross-site request forgery](https://thecopenhagenbook.com/csrf)
  Why SameSite alone is not enough. Use for: week 7-8, and before any cookie-authenticated POST goes public.
- [The Auth Book — pilcrowonpaper](https://auth.pilcrowonpaper.com/)
  Deeper companion to the Copenhagen Book. Use for: session vs JWT trade-offs, token rotation details.
- [OWASP — Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
  Primary source for lesson 5. The ranked algorithm list with exact minimum parameters (argon2id 19 MiB/2/1; scrypt N=2^17, r=8, p=1). Use for: any password storage decision. Re-check the numbers yearly.
- [The Copenhagen Book — Password authentication](https://thecopenhagenbook.com/password-authentication)
  Rules around the hash: length limits (8 min, 64-256 max), constant-time compare, generic login errors, user enumeration. Use for: lesson 5-6 register/login behaviour.
- [Node.js — crypto.scrypt](https://nodejs.org/api/crypto.html#cryptoscryptpassword-salt-keylen-options-callback)
  Built-in password hashing, zero dependencies. Note: `maxmem` must be raised by hand or Node refuses N=2^17.
- [OWASP — Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
  Primary source for lesson 11. "Protect Against Automated Attacks" — the rule that decides the design: "The counter of failed logins should be associated with the account itself, rather than the source IP address." Also: lockout threshold / observation window / lockout duration as three separate dials, exponential lockout preferred over a fixed one, and the warning that lockout itself is a DoS. Use for: login hardening, MFA ranking, and anything about the login route.
- [OWASP — Credential Stuffing Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Credential_Stuffing_Prevention_Cheat_Sheet.html)
  Why IP blocking "should not be used as the sole or primary defense due to the ease in circumvention" — stuffing kits ship with proxy networks. Recommends a graduated response: MFA first, then device and connection fingerprinting (JA3). Use for: lesson 11 onward, and to decide what to add after backoff.
- [@fastify/rate-limit](https://github.com/fastify/fastify-rate-limit)
  Taken in lesson 12 as the GLOBAL per-IP layer (v11.2.0, 292 KB). Note its global mode attaches per route *after* that route's own hooks — use `global: false` plus one app-level `onRequest` hook of `app.rateLimit()` if the limiter must run before an auth hook. Read for its defaults: `keyGenerator` is `request.ip`, max 1000 / 60s, in-memory LRU of 5000, needs an external store for multiple processes. Sends `x-ratelimit-*` and `retry-after`. Use for: a *global* per-IP layer over the whole API (week 7-8) — not for the login counter, where the key must be the account.
- [OWASP — Denial of Service Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html)
  Primary source for lesson 12. Limits belong at more than one level; input validation (body size, request size) is part of DoS defence, not a separate topic. Use for: week 7-8 hardening, and before deploy.
- [Fastify — Server options](https://fastify.dev/docs/latest/Reference/Server/)
  `bodyLimit`, `trustProxy`, `connectionTimeout`, `maxParamLength`. Use for: lesson 12 homework (body size) and for `trustProxy` at deploy — and only then.
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
  Short, authoritative pages per topic (Authentication, Password Storage, Authorization, REST Security). Use for: week 7-8 hardening checklists.
- [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/)
  A checklist of verifiable security requirements. Use for: auditing the finished API.
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
  The API-specific attack list — starts with Broken Object Level Authorization (IDOR). Use for: week 7-8 self-attack session.
- [Oso Authorization Academy — RBAC](https://www.osohq.com/academy/what-is-rbac)
  Primary source for lesson 7. Free, no signup, language-agnostic. The four stages of RBAC (organizational → cross-organization → resource-specific → custom roles), and when to move the role→permission map out of code and into the database. Use for: every week 5-6 decision. Picked over Casbin, which is a policy DSL plus a dependency for four fixed roles.
- [OWASP — Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)
  Deny by default, least privilege, validate on every request, server-side only, test the rules. Use for: lesson 7 onward, and as the grading sheet for the week 7-8 self-attack. Note it now prefers ABAC/ReBAC over plain RBAC — read that after lesson 9, not before.
- [Fastify documentation](https://fastify.dev/docs/latest/)
  Official docs; strong on hooks, validation, and plugins. Use for: routing, lifecycle, auth hooks.
- [Fastify — Hooks](https://fastify.dev/docs/latest/Reference/Hooks/)
  Primary source for lesson 6's auth gate and lesson 8's permission gate. `onRequest` runs before body parsing; `preHandler` runs after validation. Use for: any cross-cutting check — and to pick which of the two a gate needs (authz needs a validated `:teamId`, so `preHandler`).
- [Prisma — Many-to-many relations](https://www.prisma.io/docs/orm/prisma-schema/data-model/relations/many-to-many-relations)
  Primary source for lesson 8's `Membership` model. The rule: "Use implicit m-n unless you need to store additional metadata in the relation table." A role *is* that metadata, so explicit. Use for: any join table that carries a field of its own.
- [PostgreSQL — Enumerated types](https://www.postgresql.org/docs/current/datatype-enum.html)
  `CREATE TYPE "Role" AS ENUM (...)`, and the exact error a bad value gets: `invalid input value for enum`. Enum values order by declaration order; two enum types can never be compared. Use for: role names, status columns — any short fixed list.
- [Node.js — node:test](https://nodejs.org/api/test.html)
  The built-in test runner. Zero install. Use for: every test in this project unless something forces otherwise.
- [Zod documentation](https://zod.dev/)
  Schema validation with TypeScript inference. Use for: validating input at the trust boundary.
- [Prisma documentation](https://www.prisma.io/docs)
  Schema, migrations, relations, raw queries. Use for: data model and N+1 / indexing work. Note: pinned to Prisma 7 — v7 moved the datasource URL out of `schema.prisma` and requires a driver adapter.
- [Prisma — Migrate: Getting started](https://www.prisma.io/docs/orm/prisma-migrate/getting-started)
  Primary source for lesson 3. Use for: the migrate loop and what a migration file is.
- [Prisma Client CRUD](https://www.prisma.io/docs/orm/prisma-client/queries/crud)
  Every query shape in one page. Use for: writing store functions.
- [PostgreSQL — Constraints](https://www.postgresql.org/docs/current/ddl-constraints.html)
  Use for: pushing rules (UNIQUE, CHECK, NOT NULL) into the table, not only into Zod.
- [PostgreSQL documentation](https://www.postgresql.org/docs/current/)
  Primary source for SQL, indexes, constraints. Use for: pushing rules into the database.
- [Prisma — Customizing migrations](https://www.prisma.io/docs/orm/prisma-migrate/workflows/customizing-migrations)
  Primary source for lesson 10. Use for: `--create-only`, and adding a required column to a table that already has rows.
- [PlanetScale — Backwards compatible database changes](https://planetscale.com/blog/backwards-compatible-databases-changes)
  The expand/backfill/contract pattern by name, written for databases with live users. Use for: any schema change after deploy (week 11-12 onward).
- [OWASP — SQL Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)
  Primary source for lesson 20. "Defense Option 4: Allow-list Input Validation" is the part that matters — it is the only answer for a caller-chosen column.
- [Prisma — raw queries](https://www.prisma.io/docs/orm/prisma-client/using-raw-sql/raw-queries)
  Which call parameterises and which does not. `$queryRaw` (tagged template) is safe; `$queryRawUnsafe` with an interpolated value is not.
- [PostgreSQL — PREPARE](https://www.postgresql.org/docs/current/sql-prepare.html)
  What a parameter is and where one may legally appear. Explains why a column name never can.
- [OWASP — Error Handling Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Error_Handling_Cheat_Sheet.html)
  Opened by lesson 20's finding: an unhandled Prisma error replies with absolute file paths and source comments.
- [OWASP — Mass Assignment Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Mass_Assignment_Cheat_Sheet.html)
  Two pages. Three mitigations only: allow-list the bindable fields, block-list the sensitive ones, or use a DTO. Lesson 17's primary source. Note: a zod schema already IS the allow-list and `TaskPublic` already IS the DTO — what was missing was making the allow-list say no out loud.
- [OWASP API Security Top 10 — API3:2023 Broken Object Property Level Authorization](https://owasp.org/API-Security/editions/2023/en/0xa3-broken-object-property-level-authorization/)
  Mass assignment and excessive data exposure were merged into this one entry in 2023. Use for: the "authorization per property" framing next to per-route (lesson 8), per-target (9) and per-team (10).
- [CWE-915 — Improperly Controlled Modification of Dynamically-Determined Object Attributes](https://cwe.mitre.org/data/definitions/915.html)
  The formal name. Rails calls it mass assignment, Spring autobinding, PHP object injection.
- [OWASP — IDOR Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Insecure_Direct_Object_Reference_Prevention_Cheat_Sheet.html)
  Use for: week 7-8 IDOR work. Lesson 10 already applies its main advice (scope every query by the container you were granted access to).
- [PostgreSQL — Indexes](https://www.postgresql.org/docs/current/indexes.html)
  Use for: week 13-14 query performance. Lesson 10 added the first one (`@@index([teamId])`).
- [Docker docs — Node.js guide](https://docs.docker.com/guides/nodejs/)
  Use for: week 11-12 containerising and deploying.

- [MDN — Cross-Origin Resource Sharing](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS)
  Primary source for lesson 13. Use for: preflight, and the wildcard-plus-credentials rule.
- [web.dev — Understanding "same-site" and "same-origin"](https://web.dev/articles/same-site-same-origin)
  Use for: the one distinction that explains why a port breaks CORS but not a `SameSite` cookie.
- [@fastify/cors](https://github.com/fastify/fastify-cors)
  Use for: the four shapes the `origin` option accepts. Lesson 13 takes the array.

- [OWASP WSTG-IDNT-04 — Testing for Account Enumeration](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/03-Identity_Management_Testing/04-Testing_for_Account_Enumeration_and_Guessable_User_Account)
  Primary source for lesson 18. Written as an attacker's checklist, which is the useful part. Use for: the three leak channels (message, status code, response time) and the four routes to poke.
- [zod — API reference](https://zod.dev/api)
  Use for: chain order. Transforms like `.trim()` / `.toLowerCase()` run *after* the check to their left, so normalisation goes before a `.pipe()`.

- [TkDodo — React Query and TypeScript](https://tkdodo.eu/blog/react-query-and-type-script)
  Primary source for lesson 39. Written by the library's maintainer. The point that matters: the type on `data` is a claim you wrote, not a check that ran. Use for: deciding whether to parse a reply instead of declaring it.
- [MDN — Date.prototype.toJSON](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toJSON)
  Four paragraphs, and the reason every date field arrives in the browser as text. `JSON.stringify` calls it automatically and it returns ISO format. Use for: any date crossing the wire.
- [TanStack Query — discussions](https://github.com/TanStack/query/discussions)
  Search before posting. Use for: "zod parse queryFn" — the runtime-validation argument with real trade-offs.

## Wisdom (Communities)

- [r/node](https://www.reddit.com/r/node/) — practical Node/TS questions and code critique.
- [r/PostgreSQL](https://www.reddit.com/r/PostgreSQL/) — zero-downtime migration threads; the failure stories are the useful part.
- [Fastify Discord](https://discord.gg/fastify) — maintainers answer design questions.
- [Security StackExchange](https://security.stackexchange.com/) — high-signal reviews of auth designs. Use for: "is my refresh-token scheme sane?"

## Gaps
- ~~No rate-limiting source picked.~~ Closed 2026-09-02: OWASP Authentication + Credential Stuffing cheat sheets, both above. Login now throttled per account (lesson 11). `@fastify/rate-limit` still open as the *global per-IP* layer.
- ~~No CSRF source picked.~~ Closed 2026-09-04: OWASP CSRF Prevention cheat sheet + MDN Sec-Fetch-Site, both above.
- No trusted weak-password / breached-password source picked yet. Candidates: zxcvbn, haveibeenpwned Pwned Passwords API. Needed around lesson 6-7, not before.
- ~~No RBAC reference picked.~~ Closed 2026-09-02: Oso Authorization Academy + OWASP Authorization Cheat Sheet, both above.

- [OWASP — HTTP Security Response Headers Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html)
  Primary source for lesson 15. One section per header with a recommended value and the reason. Note its own warning that `frame-ancestors` obsoletes `X-Frame-Options`, and that CSP "might be meaningless in REST API responses" unless you set it to deny everything. Use for: any header decision, and as the grading sheet for the week 7-8 self-attack.
- [OWASP — REST Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html)
  The API-shaped version. Source of the `Cache-Control: no-store` rule and of "send a Content-Type matching your body". Use for: week 7-8, and before the API goes public.
- [helmet — default headers](https://helmetjs.github.io/)
  The list of thirteen headers helmet sets and their exact default values. Read it as a LIST, not as a policy: the defaults describe an HTML page. Use for: lesson 15's table, and re-check it whenever helmet majors.
- [@fastify/helmet](https://github.com/fastify/fastify-helmet)
  Taken in lesson 15 (v13.1.1, wraps helmet ^8). Read for `useDefaults: false` — without it your CSP directives merge into helmet's page policy instead of replacing it. Also `global: false` + `reply.helmet()` if headers ever need to differ per route.
- [MDN — Strict-Transport-Security](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Strict-Transport-Security)
  Use for: the one hard-to-undo header. The browser stores the policy per host and stops sending plain http before it contacts you, so a bad `max-age` cannot be fixed server-side.
- [MDN — Cross-Origin-Resource-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cross-Origin-Resource-Policy)
  The exact scope: it blocks "`no-cors` cross-origin or cross-site requests" only. So `same-origin` cannot break your front end's `fetch()`, which is CORS mode. Use for: deciding whether a cross-origin header is safe to keep on.
- [MDN — Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP)
  Use for: the front-end page's own CSP in week 9-10. Lesson 15 only covers the API's.
- [OWASP — Cross-Site Request Forgery Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
  **Primary source for lesson 16.** Read three parts: the defence hierarchy (it now names `Sec-Fetch-Site` "the primary signal for CSRF protection"), the five known gaps in `SameSite` — including that Lax blocks unsafe methods only — and the Origin/Referer fallback, where it recommends *blocking* when both headers are absent. We deliberately allow that case; the reasoning is in record 0017 and a `ponytail:` comment. Use for: deciding whether a token is still needed, and for the week 7-8 self-attack.
- [MDN — Sec-Fetch-Site](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Sec-Fetch-Site)
  The four values (`same-origin`, `same-site`, `cross-site`, `none`) and the one fact that makes the defence work: `Sec-` makes it a **forbidden header name**, so page JavaScript cannot set it. Baseline across browsers since March 2023. Use for: lesson 16's table, and before trusting any header a client sends.
- [MDN — Set-Cookie, SameSite](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie)
  Exactly which requests carry a Lax cookie: same-site always, plus cross-site **top-level navigation with a safe method**. Not `fetch`, not subresources, not POST. Also the two-minute POST grace that applies only when Lax is a browser *default* rather than written by you. Use for: any "is SameSite enough?" argument.
- [Fetch Metadata — web.dev](https://web.dev/articles/fetch-metadata)
  The resource-isolation policy pattern that `src/auth/csrf.ts` is a small version of. Use for: week 9-10, if the front end ever needs its own version of this check.

- [Use The Index, Luke! — "no offset"](https://use-the-index-luke.com/no-offset)
  **Primary source for lesson 30.** Markus Winand, the best free writing on SQL indexing. Short page, one picture: offset re-reads the same rows on every page. Use for: any "why is page 40 slow?" question.
- [Use The Index, Luke! — fetching the next page](https://use-the-index-luke.com/sql/partial-results/fetch-next-page)
  The keyset predicate written by hand: `WHERE (sort_key, id) > (last_sort_key, last_id)`. Read it beside the SQL Prisma generates for `cursor` + a two-key `orderBy` — they are the same query. Use for: deciding whether the tiebreak column is needed (it is).
- [Prisma docs — pagination](https://www.prisma.io/docs/orm/prisma-client/queries/pagination)
  `skip`/`take` vs `cursor`. Their own table says offset does not scale and recommends cursor for large tables. Use for: the exact `cursor` + `skip: 1` semantics, which are easy to get subtly wrong.
- [PostgreSQL docs — Using EXPLAIN](https://www.postgresql.org/docs/current/using-explain.html)
  First two sections only. Enough to read `rows=`, `Sort`, `Seq Scan` and `Index Scan`. Use for: proving an index earns its place before adding it.
- [PostgreSQL docs — Multicolumn Indexes](https://www.postgresql.org/docs/current/indexes-multicolumn.html)
  Why `(teamId, createdAt)` removes a sort and `(createdAt, teamId)` does not. Column order is the whole content of a compound index. Use for: week 13-14, when the list routes get filters.

- [Neon docs — connection pooling](https://neon.com/docs/connect/connection-pooling)
  **Primary source for lesson 55.** What the `-pooler` host actually changes: PgBouncer in transaction mode, the pooled connection limit, and the short list of things that break through a pooler. Use for: any "should this connection be pooled?" question, and before blaming Prisma for a timeout.
- [Neon docs — connect from Prisma](https://neon.com/docs/guides/prisma)
  The one line that matters: `prisma migrate` needs the direct (unpooled) URL. It does not say why — the reason is the advisory lock from lesson 54, and it is written out in record 0058. Use for: lesson 56, when the same two URLs become dashboard secrets.
- [Neon docs — manage roles](https://neon.com/docs/manage/roles)
  A role created with plain `CREATE ROLE` in SQL gets **no** `neon_superuser` membership and only basic public-schema privileges — which is exactly what `tasks_app` wants. Also the ~60-bit password rule that forced the rotation. Use for: recreating the lesson-41 role on any hosted Postgres.
- [PostgreSQL docs — psql, Variables](https://www.postgresql.org/docs/current/app-psql.html#APP-PSQL-VARIABLES)
  The automatic variables (`DBNAME`, `USER`, `HOST`, `PORT`) and the `:"name"` form that quotes a value as an **identifier**. Two words that made `tasks_app.sql` run unchanged on a laptop and on Neon. Use for: any SQL file that has to run in more than one place.
- [Render docs — free instance types](https://render.com/docs/free)
  The honest limits before you rely on them: web services sleep after 15 minutes idle and take about a minute to wake, 750 instance-hours a month, managed TLS and custom domains included — and **free Render Postgres expires 30 days after creation**, which is why the database is Neon. Use for: lesson 56, and for setting expectations about the first request.
- [Render docs — Docker on Render](https://render.com/docs/docker)
  Render builds your `Dockerfile` with BuildKit, respects `.dockerignore`, and uses your `CMD` — so the lesson-54 `ENTRYPOINT` keeps running migrations on every deploy. Settings that matter: **Root Directory** (the build context) and **Dockerfile Path**. Use for: lesson 56's service setup.
