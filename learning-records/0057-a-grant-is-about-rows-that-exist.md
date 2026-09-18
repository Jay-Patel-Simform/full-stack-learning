# 0057 — A grant is about rows that exist, a default privilege is about rows that do not

Date: 2026-09-17
Status: accepted
Lesson: [53 — One command, two machines](../lessons/0053-one-command-two-machines.html)

## Context
Lesson 52 put the API in a container that reached back to the Mac's Postgres
through `host.docker.internal`. Lesson 53 moves Postgres into a container too,
so the address becomes a compose service name (`db`) that resolves anywhere.

The interesting part was not compose. It was that `prisma/sql/tasks_app.sql`,
written in lesson 41 against a database with fifteen migrations already in it,
is now being asked to run against an **empty** one — because that is what a
container start is. Mounted into `/docker-entrypoint-initdb.d`, it runs once,
before any table exists.

## Decision
Split the file by **when a statement is able to run**:

- `prisma/sql/tasks_app.sql` — roles and `ALTER DEFAULT PRIVILEGES` only. Names
  no table, so it is safe on an empty database. Runs at init.
- `prisma/sql/audit-lockdown.sql` — the `REVOKE UPDATE, DELETE, TRUNCATE ON
  "AuditLog"`. Names a table, so it can only run after `migrate deploy`.

## Consequences
- **The two lesson-41 statements swap importance on a fresh database.**
  `GRANT ... ON ALL TABLES` succeeds over zero tables and grants nothing —
  silently. `ALTER DEFAULT PRIVILEGES` then does the entire job as migrations
  create the tables. On the Mac it was the other way round.
- The silent one is the dangerous one. It is another member of the "no failing
  state" family: a statement that is green and did nothing.
- **Init runs once per volume, and a failed init leaves a non-empty volume**,
  so the scripts never run again. The only undo is `docker compose down -v`.
  Worth knowing before an hour is lost to it.
- `condition: service_healthy`, not bare `depends_on`: start order is not
  readiness, and Postgres accepts connections seconds after its container
  starts.
- `migrate deploy`, never `migrate dev`, anywhere a deploy can reach.
- The compose passwords (`tasks`/`tasks_app`) are deliberately throwaway and
  unrelated to the Mac's. See [[db-roles-and-cron]] — the Mac's `tasks_app`
  password is still unrotated, now the fourth ask.
- Zero TypeScript changed. Suite stays 172, and `npm test` still runs against
  the Mac's Postgres on purpose — a second test database is two places to be
  wrong.

## Still open
- Migrations on container start (entrypoint vs init container vs manual step).
  Named in the lesson's "left out" box; it is the next real deploy decision.
- The front end as a third service, behind the `deploy/nginx.conf` that has
  been sitting there unused.
