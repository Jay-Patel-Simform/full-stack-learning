# server

Fastify 5 + zod 4 task API on Postgres via Prisma 7. TypeScript, ESM, run straight from source with tsx.

## Database

Uses the Postgres already installed on this Mac (port 5432), role `tasks`, database `tasks`. Nothing to start; it runs as a service. Connection string in `.env`. Do not use `npx prisma dev` — it costs ~210 MB of RAM for the same job.

## Commands

- `npm run dev` — watch mode on port 3000
- `npm start` — run once
- `npm test` — `tsx --test src/**/*.test.ts` with `LOG_LEVEL=silent`. Tests hit the real database.
- `npm run typecheck` — `tsc --noEmit`
- `npm run log` — last 20 `AuditLog` rows via `psql`, reading the URL out of `.env`.
- `npm run lint` — oxlint
- `npm run format` — oxfmt
- `npx prisma migrate dev --name <change>` — new migration + regenerate client.

## Environment

One zod schema in `src/config.ts` reads them all at boot, via `process.loadEnvFile()` — `.env` if the file is there, plain environment if it is not. The four that decide whether production is safe have **no default**: no value, no boot.

- `DATABASE_URL` — required, must parse as a URL.
- `NODE_ENV` — required, `development` | `test` | `production`. `production` turns on HSTS and the `Secure` flag on the session cookie.
- `ALLOWED_ORIGINS` — required, comma separated. Parsed into an array.
- `TRUST_PROXY` — required, `z.stringbool()` (true/1/yes/on, false/0/no/off, nothing else). Only true behind a proxy you control: off, `request.ip` is the proxy; on with no proxy, the caller picks their own IP.

These three only decide where it listens and how loud it is, so a default is honest:

- `PORT` (3000), `HOST` (127.0.0.1) — never bind `0.0.0.0` behind nginx.
- `LOG_LEVEL` (info) — `silent` in tests.

## Layout

- `src/server.ts` — entry. Builds the app, listens, and closes it on SIGINT/SIGTERM.
- `src/app.ts` — `buildApp()`. One numbered pipeline: zod validator/serializer compilers, rate limit, CSRF, CORS, helmet, `cache-control: no-store`, the audit `onResponse` hook, the error handler, then the routes. Does not listen, so tests can use it.
- `src/routes/*.route.ts` — one Fastify plugin per file, default export (`health`, `tasks`, `auth`, `teams`, `projects`).
- `src/routes/*.test.ts` — route tests next to the routes, plus one file per cross-cutting behaviour (`cors`, `csrf`, `headers`, `rate-limit`, `error-handler`, `mass-assignment`, `enumeration`, `audit`, `me`, `task-sort`,
  `team-list`). Unit tests sit next to the unit instead when there is no route to
  drive (`src/auth/can.test.ts`, `csrf`, `session`, `throttle`, `src/audit/audit.test.ts`).
- `src/schemas/*.schema.ts` — zod schemas and the types made from them (`task`, `auth`, `team`, `project`).
- `src/config.ts` — the one env schema. Parsed once at module load; every other file imports `config`.
- `src/db.ts` — the one exported `PrismaClient`, built with the `@prisma/adapter-pg` adapter.
- `src/store/*.store.ts` — Prisma queries (`task`, `user`, `team`, `project`). All functions async.
- `src/auth/csrf.ts` — `allowWrite()`. Decides who may WRITE, from `Sec-Fetch-Site` + `Origin`. No token, no second cookie.
- `src/auth/password.ts` — scrypt hash + verify. Node crypto only, no dependency.
- `src/auth/session.ts` — create/read/delete sessions, cookie helpers. The browser holds the id, the table holds its SHA-256.
- `src/auth/require-auth.ts` — `onRequest` gate. Sets `request.userId` or answers 401.
- `src/auth/can.ts` — the one permission table. Roles are data, permissions are code.
- `src/auth/require-permission.ts` — `preHandler` gate. Names an action, not a role. Optional loader fetches the target.
- `src/auth/throttle.ts` — per-account login backoff.
- `src/audit/audit.ts` — `shouldAudit()` (writes and refusals only) plus `writeAudit()`. Written from one `onResponse` hook in `app.ts`, never from a handler: a 401 or 403 never reaches one.
- `src/generated/prisma/` — generated client. Not committed.
- `prisma/schema.prisma` — models (`Task`, `User`, `Session`, `Team`, `Membership`, `Project`, `AuditLog`) and the `Role` enum.
- `prisma/seed.ts` — sample data.

## Rules

- Import local files with the `.ts` extension (ESM + tsx).
- Read env through `config` from `src/config.ts`. Never `process.env` in a route, store, or hook — a typo there is silent, in the schema it refuses to boot.
- Validate every input with a zod schema in the route `schema` option. Do not check input by hand in a handler.
- Set a `response` schema on every route. The serializer drops fields not in the schema; that is how `passwordHash` stays private.
- Types come from `z.infer`. Do not write a separate interface.
- `request.body` and `request.params` are `unknown`; cast to the inferred type (`as CreateTaskInput`).
- Store functions return `undefined` when not found. The route turns that into 404.
- Use `updateMany`/`deleteMany` for single rows: they return a count instead of throwing on a missing id.
- One `PrismaClient` only. Import `prisma` from `src/db.ts`; never construct another.
- Never edit an applied migration. Add a new one.
- `AuditLog.userId` has no `@relation` on purpose. Never add one — a cascade there deletes the evidence with the account.
- Passwords: hash with `hashPassword`, check with `verifyPassword`. Never store or return a plain password.
- Log the fields you chose, never a whole object. `{ userId: user.id }`, not
  `{ user }` — an object logs whatever it holds today and whatever is added to
  it next year. `{ err }` in the error handler is the one exception, and it is
  covered by `REDACT_PATHS`.
- `REDACT_PATHS` in `src/app.ts` is a denylist and the net, not the plan. Each
  entry is an exact path and `*` is one level, so `err.user.x` needs its own
  line. A path that matches nothing fails silently.
- `buildApp(logStream?)` — pass a stream to read the log in a test. It raises
  the level too, because `npm test` runs `LOG_LEVEL=silent`. Assert the log is
  not empty before asserting a secret is absent.
- Store functions swallow unique-constraint errors and return `undefined`. The route turns that into 409.
- A caller-chosen **column name** (`?sort=`) is never a parameter, so it is only
  ever safe as a `z.enum` in the route's `querystring` schema. The enum IS the
  allowlist; never re-check it in the store, and never widen it to `z.string()`.
- A route `schema` without a `querystring` key **skips query validation
  silently** — one `FSTWRN001` log line, and `?sort=anything` answers 200.
- Guard a route with `requireAuth` first, then `requirePermission(action)`. Never test a role inside a handler.
- New power = new entry in `ACTIONS` and the role lists in `can.ts`. Nowhere else.
- Every task and project belongs to a team. Team-scoped routes live under `/teams/:teamId/...`.
- Each test file runs in its own process and makes its own fixture. Do not share state between files.
- Quote every glob you pass to a tool — the shell expands it first, and `sh` treats `**` as one level. A new test file must move the count.
- Comments explain why, in plain words. Keep that style.
- Tag comments with a Better Comments marker: `// * ` important note, `// ! ` warning or gotcha, `// ? ` open question, `// TODO: ` work left. Plain `// ` for everything else. One space after the marker.
- CORS decides who may READ, CSRF decides who may WRITE. Never `origin: true` with `credentials: true`.
- Cross-cutting concerns (auth, CSRF, caching, audit, error shape) live as hooks in `app.ts`, never in a handler.
- A 5xx never leaks `err.message` to the caller; it goes to the log and the caller gets `requestId`.
