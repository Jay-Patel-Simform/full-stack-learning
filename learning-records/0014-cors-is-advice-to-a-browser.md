# CORS is advice to a browser, not a gate on the server

Lesson 13 (2026-09-03), third of week 7-8. `npm test` = 75 (was 70),
`npm run typecheck` clean, `npm run lint` clean (only pre-existing warnings).
No migration.

New file: `server/src/routes/cors.test.ts`.
Changed: `server/src/app.ts`.
Added: `@fastify/cors@11.3.0` (172 KB). Second dependency, twelve lessons apart.

## The decision

Took the plugin, by lesson 12's rule: the CORS protocol is a fixed spec
(preflight, `Vary`, cache) with exactly one decision left in it — *which
origins*. Jay makes that decision, the plugin does the typing.

`origin` is an **array of exact strings** read from `ALLOWED_ORIGINS` in the
environment, defaulting to `http://localhost:5173`.

Rejected `origin: true` out loud, in the lesson, as the bad version:

> `origin: true` does not mean "allow everyone". The spec forbids `*` together
> with credentials, so the plugin **reflects the caller's Origin header**. Add
> `credentials: true` and any page in any tab can read a logged-in user's data.

Rejected a regex too. An unanchored one matches
`http://localhost:5173.evil.example`. There is a test for that exact string.

## The framing that carried it

**Same-origin vs same-site** — two words that look like one word.
Origin counts the port; site does not. So `:5173` -> `:3000` is a CORS problem
and *not* a `SameSite` problem, which is why his `SameSite=Lax` cookie from
lesson 6 keeps working locally and will not warn him. The table comparing the
two is the re-teach unit if anything is shaky.

Second half of the frame: **CORS does not protect my server, it protects other
people's users from my server's replies.** A denied origin still gets a 200 —
the server never says no, it just stays quiet, and the browser does the
refusing. `src/routes/cors.test.ts` asserts that 200 on purpose.

## Still open

- Body-size limit (lesson 12 homework) is still not in `src/app.ts`. Third ask.
- Redis for both in-process counters. Unanswered since lesson 11, three old.
- Cookie `Secure` flag, at deploy (already a `ponytail:` note in `session.ts`).
- `SameSite=None` will be needed if the front end lands on a different *site*
  at deploy. That is the question planted for lesson 14.
