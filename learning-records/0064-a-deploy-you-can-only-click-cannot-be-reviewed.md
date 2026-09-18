# 0064 — A deploy you can only click cannot be reviewed

Date: 2026-09-18
Status: accepted
Lesson: [61 — The deploy that is a file](../lessons/0061-the-deploy-that-is-a-file.html)

## Context
Lessons 56 and 57 created two Render services by hand: a Docker web service
(`server/`) and a static site (`web/`), plus eight env values retyped into a
dashboard. Nothing about the deploy was in git. `render.yaml` was named as
"left out on purpose" in both lessons.

## Decision
- **`render.yaml` at the workspace root**, describing both services. Not under
  `server/`: it describes two services, and Render reads it from the repo root.
- **Split the environment by kind, not by convenience.** Decisions
  (`NODE_ENV`, `TRUST_PROXY`, `HOST`, `LOG_LEVEL`, `AUDIT_RETENTION_DAYS`)
  go in as `value:` — they are arguable, so they belong where a reviewer can
  argue with them. Secrets (`DATABASE_URL`, `APP_DATABASE_URL`) go in as
  `sync: false` — the file records the *name*, Render holds the value.
- **`PORT` stays absent**, as in the dashboard. Render sets it. A written value
  the platform overwrites is a lie in a file.
- **`ALLOWED_ORIGINS` is `sync: false`, not `fromService`.** `fromService` can
  supply a `host`, but the value needs an `https://` prefix and the file has no
  string concatenation. One paste beats a workaround.
- **Verified against the schema, not memory**:
  `https://render.com/schema/render.yaml.json`. `plan: free` is a real enum
  value; `route` is `{type: redirect|rewrite, source, destination}`; `header`
  is `{path, name, value}`; `dockerfilePath` and `staticPublishPath` are
  documented as *relative to the repo root*, which `rootDir` does not change.
- **The feedback loop is `render blueprints validate`**, not a deploy. Edit,
  validate, edit — no wait, no cost. Plus the `$schema` comment line for
  editor completion.

## Consequences
- General rule: **configuration you can only click is configuration nobody can
  review.** Its corollary is the one that does the work: moving the deploy into
  git must not move the passwords into git.
- Second rule: **`rootDir` moves the service, not the paths.** Two fields in
  one service block with two different starting points.
- The route-order rule from lesson 57 survives the move from dashboard to file
  unchanged — first match wins.
- Deliberately not built: `databases:` (Postgres is on Neon, record 0058),
  preview environments, the `headers:` CSP.
- Zero application code. No new dependency, 61 lessons. Suite stays 172.

## Still open
- **Unmeasured and flagged in the lesson:** whether a Blueprint adopts existing
  same-named services or creates a second pair. Jay reads the dashboard's plan
  before approving, and asks the Render community.
- A real page CSP via the static site's `headers:`. Redis for the two
  in-process counters. The client-IP question from record 0060 — asked twice,
  not to be asked again (NOTES).
