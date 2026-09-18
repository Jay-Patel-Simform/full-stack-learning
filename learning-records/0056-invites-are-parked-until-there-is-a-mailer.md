# 0056 — Invites are parked until there is a mailer

Date: 2026-09-17
Status: accepted

## Context
Lesson 52 was written as the first half of an invite flow: an `Invite` model
addressed to an email, a token hash, an expiry, and `POST /teams/:teamId/invites`.
Jay skipped it before reading it, then clarified the reason:

> "I have told you that drop this for now. We will learn later when i actually
> need to send email's."

So this is **not** a change of goal. It is a sequencing call, and a good one:
the lesson's own "left out" box admitted the token had to be pasted by hand
because there is no mailer. An invite you cannot send is half a feature, and
half a feature is a bad thing to learn on.

## Decision
Park it. MISSION.md keeps invites as a named goal, marked parked with the
condition that unparks it: **the day there is a real way to send email.**
Adding a member stays `POST /teams/:teamId/members` with a `userId`.

Lesson 52 is the first Docker lesson instead. The invite lesson is deleted,
not archived — it can be rewritten better later, alongside the mailer.

## Consequences
- **Do not re-propose invites on their own.** The trigger is the mailer, and
  when it comes the two ship together: send the token, click the link, join.
- Known and accepted until then: the members route takes a user id no screen
  can supply. The API will not grow an email→id lookup (lesson 18's
  enumeration oracle), so adding a member is a psql/curl operation today.
- **My mistake to learn from:** he said "skip for now" and I offered "drop from
  the mission" as the recommended option. *For now* is not *never*. When he
  defers something, park it with the condition that revives it — do not ask him
  to choose between building it today and deleting the goal.
