# 0059 — A deploy does not break code, it retires assumptions

Date: 2026-09-18
Status: accepted
Lesson: [56 — The URL you can send to someone](../lessons/0056-the-url-you-can-send-to-someone.html)

## Context
Lesson 55 moved the database to Neon and left the app on the laptop. Lesson 56
moves the app: a Render free web service, built from the existing `Dockerfile`,
with `server` as the Root Directory. Nothing in this workspace was under version
control, and Render deploys from git.

## Decision
- **One git repository at the workspace root**, private, via
  `gh repo create --private --source=. --push`. Render's **Root Directory**
  setting makes `server/` the build context, which is the same context compose
  already gives it — so `COPY package*.json ./` and `server/.dockerignore` keep
  working unchanged. One repo also means lesson 57's front end needs no second.
- **`.gitignore` before `git init`.** `.env` and `.DS_Store` added at the root;
  `.env.docker` landed there last lesson. The rehearsal step is
  `git add -A` then `git status --short | grep -i env` — read the index, then
  commit. `git add` is reversible; `git commit` is not.
- **Env in the dashboard, not a file.** Eight values. `PORT` deliberately unset
  (Render provides it, default `10000`), `APP_PASSWORD` dropped (it existed only
  for psql at container init, and Neon has no init step).
- **`HOST=0.0.0.0`**, because "Every Render web service must bind to a port on
  host `0.0.0.0`". The `config.ts` default of `127.0.0.1` stays correct for the
  nginx case it was written for.
- **`NODE_ENV=production` + `TRUST_PROXY=true` + `ALLOWED_ORIGINS`** flipped
  together, now that TLS and a real proxy exist.

## Consequences
- **Render is never told this app has migrations.** No release command, no
  pre-deploy hook. `ENTRYPOINT` runs `migrate deploy`; the dashboard's
  Docker Command field overrides `CMD` only. Lesson 54's split paid off on a
  platform that has never heard of it.
- A wrong `HOST` fails as `Port scan timeout reached, no open ports detected` —
  a *port* message for a *host* mistake. Named in the lesson so the error text
  is recognisable before he meets it.
- **`Secure` on the session cookie is emitted for the first time**, seven
  lessons after it was written (29).
- **The cross-site cookie failure is now the reason lesson 57 exists.** Local
  Vite page (`VITE_API_URL`) against the deployed API: login returns 200, the
  next request is 401. Not CORS, not `Secure` — `SameSite=Lax`, because
  `localhost:5173` and `onrender.com` are different *sites*. The fix is one
  origin (nginx or a second Render service), not `SameSite=None`, which would
  hand back the CSRF defence lesson 29 bought.
- Free tier: 750 instance-hours/month, spin-down after 15 min idle, ~1 min cold
  start, stacked on Neon's own scale-to-zero. Keeping it awake with a cron would
  burn the hour budget (a month is 720 h), so the sleep stays.
- `npm start` is still `tsx src/server.ts` in a production image. Named as left
  out; revisit when image size or boot time is a number he cares about.
- Zero TypeScript. Suite stays 172. No new dependency, 56 lessons.

## Still open
- Lesson 57: the front end on one origin with the API — `deploy/nginx.conf`,
  unused since 53, or a second Render service plus a proxy rule.
- `render.yaml` instead of dashboard clicks. Earns its place at the second
  service.
- Health-check path, and Prisma's `connection_limit` behind PgBouncer. Both
  wait for something measurable.
