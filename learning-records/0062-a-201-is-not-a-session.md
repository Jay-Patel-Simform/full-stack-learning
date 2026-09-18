# 0062 — A 201 is not a session

Date: 2026-09-18
Status: accepted
Lesson: [59 — The account nobody can make](../lessons/0059-the-account-nobody-can-make.html)

## Context
The front end has a login form and no signup form. `POST /auth/register` has
existed since lesson 5 and no browser has ever called it. Its reply body is
`{id, email}` — byte-for-byte the shape `/auth/login` returns.

## Decision
- **The two replies differ only in a header.** Login sends `set-cookie`;
  register does not. So `useRegister` must never write its reply into
  `SESSION_KEY`, though `useLogin`'s `onSuccess` correctly does.
- **Chain instead of trusting.** Register, then call `login.mutateAsync` with
  the same two fields. The session comes from the only call that makes one.
- **`mutateAsync`, not `mutate`.** `mutate` returns void and swallows its
  error, so a failed login after a successful register would report success
  with nobody signed in.
- **The route goes inside `RequireAnon`.** The existing guard both blocks a
  signed-in visitor and performs the post-signup redirect. No hand navigation.

## Consequences
- General rule: **ask whether a response set a cookie before caching its
  body as identity.** Sits next to record 0024 ("logged in is a question,
  not a fact") — the body answers "who", only the cookie answers "still".
- `409` and `429` needed no new front-end code: `errorMessage` already reads
  `data.error`, and `/auth/register` was already in `CREDENTIAL_ROUTES`.
- Deliberately not added: a session on the register route (one server line,
  but it would erase today's distinction, and the mailer will forbid it
  anyway), confirm-password, email verification.
- Zero server change. No new dependency, 59 lessons. Suite stays 172.

## Still open
- Nothing creates a team, so a brand-new account signs in to an empty page.
  Now the oldest hole, and the next thing to build.
- Nothing reads the audit log from the page.
- The client-IP question from record 0060, still unmeasured.
