# 0030 — A default is where a typo hides

Date: 2026-09-10
Lesson: [27 — The default that hides the typo](../lessons/0027-the-default-that-hides-the-typo.html)

## Context

Record 0029 named week 11-12 (Docker + deploy) as next in the plan. Jay asked to
"move to lesson 27" with no topic, so I picked from PLAN — the same call as
lesson 13.

**Docker was the obvious pick and I rejected it.** `docker` is not installed on
this machine, and Docker Desktop on a Mac is a Linux VM, which is exactly the
weight NOTES says to avoid. More decisively: this workspace's lessons are
strong because every claim is *measured* first, and a Dockerfile I cannot build
is a lesson written from memory. So I took the step that has to happen before
any deploy and that I could run: **the environment.**

## Decision

**1. The spine is not "validate your config". It is "a default is a place a
typo can hide."** Generic env-validation advice is forgettable. The rule that
earns the lesson is the *test for whether a variable may have a default*: how
long does being wrong stay invisible? `LOG_LEVEL` — one second. `NODE_ENV` —
until someone audits your cookies.

**2. The four safety variables lose their defaults.** `DATABASE_URL`,
`NODE_ENV`, `ALLOWED_ORIGINS`, `TRUST_PROXY` become required; `PORT`, `HOST`,
`LOG_LEVEL` keep theirs and the lesson says why. This is the fifth use of the
"make the safe thing the default, the unsafe thing deliberate" family, and the
first time it is applied to *absence*.

**3. `console.error` + `process.exit(1)`, not `throw`.** The exit code is the
half the machine reads; the console line is the half he reads. This became
quiz 3.

**4. `z.stringbool()` over `=== "true"`.** Not a style change — `=== "true"`
answered *false* for `"1"`, `"yes"`, `"TRUE"`, all measured. `stringbool`
accepts those and **refuses** `"banana"` and `""`. Third lesson in a row where
a one-word change is the whole fix.

**5. No new dependency, twelfth lesson running.** zod 4.5.4 and
`process.loadEnvFile()` — both already in the project.

**6. Reused "count the places", now the fifth time** (lessons 9, 10, 11, 20).
Opened with the grep and made him run it before trusting my table. 7 variables,
4 files.

## Measured, on his real code

Booted the unmodified `buildApp()` four times; every run answered `GET /health`
with **200**:

```
NODE_ENV=production TRUST_PROXY=true   HSTS max-age=31536000  cookie ; Secure   ip 9.9.9.9
NODE_ENV=Production TRUST_PROXY=true   HSTS (none)            cookie no Secure  ip 9.9.9.9
NODE_ENV=production TRUST_PROXY=1      HSTS max-age=31536000  cookie ; Secure   ip 127.0.0.1
NODE_ENV=production ALLOWED_ORIGIN=…   access-control-allow-origin: (none)
```

Other measurements: `Number("")` is `0` (a random free port); `TRUST_PROXY` is
false for `1`/`TRUE`/`yes`/`""`; `NODE_ENV` in `Production`/`prod`/unset all
drop the `Secure` flag.

Then **wrote `src/config.ts`, wired it into all four files, and ran the suite:
`tsc --noEmit` clean, 141/141 pass.** Booted with an empty environment and no
`.env`: all four missing variables listed at once, exit code `1`.

Then restored `src/app.ts`, `src/db.ts`, `src/server.ts`, `src/auth/session.ts`
and `.env` from backups, deleted `src/config.ts` and the probe, and re-ran:
typecheck clean, 141/141. **`server/` is byte-identical to how I found it** —
the code is his to type, per record 0025's standing rule.

## Found while writing it

- **The probe rewrote the lesson again**, fourth lesson running. I expected the
  headline to be `ALLOWED_ORIGINS`. It is `NODE_ENV=Production`, because that
  one silently drops **two** walls (HSTS *and* the `Secure` cookie) and a
  capital letter is a thing people actually type.
- `TRUST_PROXY=1` is the best example in the lesson and I nearly left it out.
  It ties straight back to `deploy/nginx.conf`, which already warns about the
  proxy-IP problem — the file was right and the parser was wrong.
- **The honest limit is real and it is in the lesson:** a misspelled *optional*
  variable is still silent, because the schema must ignore unknown keys
  (`process.env` holds `PATH`, `HOME`, forty others). So the defence is
  *removing the default*, not the schema. Saying that out loud is what stops
  this being cargo-cult validation.
- `server/CLAUDE.md` currently says "Everything has a working default, so
  `npm run dev` needs none of them." The lesson makes that false, so updating
  it is exercise 7 — his edit, not mine.
- Adding the three lines to `server/.env` is **required or `npm test` will not
  start**. Called out explicitly in step 3 of the code.
- Lesson length 17.1 KB, in line with 26. Prose ~5.6 KB.
- Ran the show-me skill per workspace CLAUDE.md:
  `show-me-0027-config-at-the-door.html` — the four-environment table, the
  7-reads-vs-1-parse split, and the boot gate.

## Consequence

- New: `lessons/0027-the-default-that-hides-the-typo.html`,
  `lessons/show-me-0027-config-at-the-door.html`,
  **`reference/environment.html`** — the variable table, the zod pieces, and a
  7-step deploy checklist. This is the card he opens during week 12.
- `lessons/index.html`: lesson row, new reference card, new "next up".
- **Zero net code changes in `server/` or `web/`.** Test count unchanged at 141.

## Open

- **Docker, deferred and not skipped.** Nothing is installed. Before writing it
  I have to ask him: Docker Desktop, OrbStack (much lighter on a Mac), or skip
  local Docker entirely and let Fly build the image remotely. That is a real
  2-options-plus-recommendation question, and it belongs to him.
- The trim fix from lesson 26 exercise 6 is still outstanding.
- `.env.example` and the `.gitignore` check are exercise 5. If he skips them,
  do them with him at the top of lesson 28 — a committed `.env` is the one
  mistake in this lesson that cannot be undone.
- Still no `POST /teams` from the page, no delete-a-task lesson, no front-end
  test, no optimistic updates.
- Question ratio: no long-lived cliffhanger planted this time, because the
  Docker fork is the open question and it is his to answer, not mine.
