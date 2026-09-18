# Postgres arrives in lesson 3, using the machine already installed, not Docker

Lesson 3 (2026-09-01) moved the task store from an in-memory array to Postgres with Prisma 7.

First draft used `npx prisma dev`. Jay pushed back on 2026-09-01: "I can not install the Postgres because it is too heavy." Measured instead of guessing — the native Postgres 18.4 service already on the Mac costs ~15 MB RSS, while the `prisma dev` Node process costs ~210 MB. So the heavy thing was the tool, not the database. Lesson 3 now uses a dedicated role and database on the installed server:

```
psql -U postgres -h localhost -c "CREATE ROLE tasks LOGIN CREATEDB PASSWORD 'tasks';"
psql -U postgres -h localhost -c "CREATE DATABASE tasks OWNER tasks;"
```

`CREATEDB` is required because `prisma migrate dev` needs a shadow database. Docker stays where PLAN.md put it — week 11-12, as its own lesson. One new idea at a time.

General rule to reuse: when Jay says a tool is too heavy, measure RSS before proposing a swap. Prefer what is already installed on the machine over anything new.

Prisma 7 specifics that cost time and must not be re-learned:
- `url` is no longer allowed in `schema.prisma`. It lives in `prisma7.config.ts`, read from `.env`.
- The client needs a driver adapter: `@prisma/adapter-pg` + `pg`, passed as `new PrismaClient({ adapter })`.
- `process.loadEnvFile()` (built into Node 24) covers runtime env loading, so no dotenv import in app code.
- `npm i prisma@latest` resolves to an 8.0.0 release candidate. Pinned to 7.10.0 on purpose.
- `prisma init` also drops `.agents/`, `.windsurf/`, `.claude/skills/`, `skills-lock.json`. Deleted as noise.
- `tsconfig` has `exactOptionalPropertyTypes: true`, so a Zod `.partial()` patch needs a cast before it fits Prisma's `data` type.

The teaching point to re-use: the routes needed only three `await`s to change storage engines, because [[0002-declare-the-wall-not-remember-it]]'s file boundary already hid the store. Use that same argument when auth and `can()` slot in behind the same seam.

Verified end to end before shipping: create, restart, read back, patch, 404s, and `ownerEmail` present in the row but absent from the reply.

Evidence: lessons/0003-rows-that-survive-a-restart.html, server/src/db.ts, server/src/store/task.store.ts.
