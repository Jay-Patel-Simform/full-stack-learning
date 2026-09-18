# Ownership is a foreign key, not a string

Lesson 4 (2026-09-01) replaced `Task.ownerEmail: String` with `Task.ownerId: Int` pointing at a new `User` model.

The teaching point to re-use: `where: { ownerId }` is the first line of security in the app, not a tidiness filter. Removing it is IDOR (OWASP API Top 10 #1). Weeks 5-8 are largely "never forget this line", so `can(user, action, resource)` should be framed as the same line, moved somewhere it cannot be forgotten — the framing from [[0003-declare-the-wall-not-remember-it]].

Second point, worth repeating: a response schema trims **columns**, never **rows**. Jay saw `ownerEmail` disappear from replies in lesson 3, which could easily read as "the schema keeps data safe". It does not scope reads.

Migration reality faced on purpose: adding a required FK to a populated table cannot be done in one step. Lesson took `prisma migrate reset` (test data, week 2) but wrote down the production shape — nullable column, backfill UPDATE, then required — for week 11-12.

Placeholder with an expiry date: `DEV_USER_ID` in `.env` stands in for the logged-in user until week 3 replaces it with the session. Named as temporary in the lesson so it does not quietly become architecture.

`User.email @unique` landed here early. Week 3 needs it to stop duplicate accounts; no extra migration then.

Evidence: lessons/0004-rows-that-point-at-rows.html.