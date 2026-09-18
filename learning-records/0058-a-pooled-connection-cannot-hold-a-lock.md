# 0058 — A pooled connection cannot hold a lock, so migrations need the direct URL

Date: 2026-09-17
Status: accepted
Lesson: [55 — The database that is not on your laptop](../lessons/0055-the-database-that-is-not-on-your-laptop.html)

## Context
Lesson 55 was planned as the whole deploy. Two things forced a split.

First, money: Fly.io's free tier ended in 2024 and Fly Managed Postgres starts
at $38/month. Jay chose **Render free + Neon free** instead. Render free web
services sleep after 15 minutes idle (~1 minute cold start) and Render's own
free Postgres **expires 30 days after creation**, so the database had to come
from somewhere else. Neon's free plan is permanent, needs no card, and gives
0.5 GB and 100 compute-hours per project.

Second, correctness: `prisma/sql/tasks_app.sql` contains two names that exist
only on this laptop.

## Decision
**Move the database in one lesson, the app in the next.**

Make the SQL file portable with psql automatic variables rather than keeping a
second Neon copy of it:

- `GRANT CONNECT ON DATABASE :"DBNAME" TO tasks_app;`
- `ALTER DEFAULT PRIVILEGES FOR ROLE :"USER" ...` (twice)

Map the two existing URLs onto Neon's two endpoints:

- `DATABASE_URL` → owner, **direct** host. Migrations, `db execute`.
- `APP_DATABASE_URL` → `tasks_app`, **`-pooler`** host. Every request.

## Consequences
- **The advisory lock from record 0057's successor (lesson 54) only works on a
  direct connection.** A lock belongs to the connection that took it; PgBouncer
  can route the next statement elsewhere. Through the pooler, `migrate deploy`
  keeps working right up until two containers start at once — the one case the
  lock existed for. This is the silent-success family again.
- The lesson-42 split (owner vs app role) turned out to already be the exact
  split pooling needs. A security decision paid a second time.
- `ALTER DEFAULT PRIVILEGES FOR ROLE tasks` on Neon would have **succeeded and
  done nothing**, because Neon's owner is `neondb_owner`. The failure would
  have surfaced on the first `INSERT` into a table added by a future migration,
  weeks later, with a deploy to blame.
- **The `tasks_app` password is finally rotated** (sixth ask, and Jay chose to
  include it). Not by persuasion: Neon rejects `CREATE ROLE ... PASSWORD` below
  ~60 bits of entropy. `openssl rand -base64 18`. See [[db-roles-and-cron]].
- `.env.docker` now holds a real credential. Safe today (`.dockerignore` has
  `.env.*`, compose passes it at run time), and it is the reason lesson 56 must
  introduce git and dashboard secrets in the same breath.
- `NODE_ENV` and `TRUST_PROXY` deliberately unchanged. There is still no proxy
  and no HTTPS; setting them early is the lesson-29 cookie bug on purpose.
- `npm test` still runs against the Mac's native Postgres. Tests that need the
  internet are tests that stop being run.
- Zero TypeScript changed. Suite stays 172. No new dependency, 55 lessons.

## Still open
- Lesson 56: the Render deploy — a git repository, Dockerfile build with Root
  Directory `server`, dashboard env vars, `PORT`/`HOST=0.0.0.0`, then
  `NODE_ENV=production` and `TRUST_PROXY=true` together with real HTTPS.
- Prisma's own pool sitting behind PgBouncer. Two pools; `connection_limit` is
  unset and unmeasured. Wait for a timeout to measure.
- The front end and `deploy/nginx.conf`, still unused since lesson 53.
