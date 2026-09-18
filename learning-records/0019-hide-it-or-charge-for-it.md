# 0019 — Hide it, or charge for it

Date: 2026-09-07
Lesson: [18 — The route nobody audited](../lessons/0018-the-route-nobody-audited.html)

## Context

Week 7–8's enumeration slot. Six lessons hardened `POST /auth/login`; nobody
had ever looked at `POST /auth/register`, four lines above it in the same file.
Audited it against the six rules already written into the codebase:

| Rule | From | Obeyed? |
|---|---|---|
| One reply for two different noes | 6 | No — `409` is a yes/no about a stranger's account |
| Rate-limit the thing the attacker has one of | 11 | No — unlimited probes |
| Cheap check before expensive work | 12 | No — 250 ms scrypt before the 409 |
| `Sec-Fetch-Site` on writes | 16 | **Yes, free** — app-level hook |
| Bodies reject unnamed keys | 17 | **Yes, free** — app-level hook |
| One address, one account | never written | No — real bug, see below |

**The finding that matters: the two yeses are the two rules that live in an
app-level hook.** Both rules I put in a handler were skipped by the next route
I wrote. This is the strongest evidence yet for "a rule with no exceptions does
not belong in each caller" — earned on a route nobody was thinking about.

Measured, before any change:

```
login known+wrongpw  { ms: 237, code: 401, body: '{"error":"invalid email or password"}' }
login unknown        { ms: 236, code: 401, body: '{"error":"invalid email or password"}' }
register taken       { ms: 250, code: 409, body: '{"error":"email already registered"}' }
register free        { ms: 242, code: 201, body: '{"id":719,...}' }
```

Login is clean on all three channels ([WSTG-IDNT-04](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/03-Identity_Management_Testing/04-Testing_for_Account_Enumeration_and_Guessable_User_Account):
message, status code, clock). `DUMMY_HASH` from lesson 5 works — 237 vs 236 ms.
Register leaks perfectly, and the clock defence is irrelevant there because the
status code answers outright.

## Decision

**Two designs exist, and only two: hide the answer, or charge for it.**

- A — `202 "check your email"` always. No leak. Needs a mailer, a token table
  and accounts that are unusable until a link is clicked.
- B — keep `409`, throttle it per email with lesson 11's existing module.

**Took B now, A in week 13–14** with the invite mailer. A is not optional
there anyway: emailing invites requires unverified accounts to exist. Building
a mail pipeline inside an auth lesson would bury the idea under infrastructure.

Nine lines in `auth.route.ts`: `throttleCheck(email)` → 429 + `retry-after`,
`throttleFail(email)` on the 409. `429` added to the route's response schema.

## Why

- **B does not stop enumeration. It makes it slow and loud.** Five probes per
  address stay free forever. What dies is the bulk run against a leaked list —
  and the `429`s land in the logs, so the attempt becomes visible.
- **A timing rule that reads backwards.** Fixing register's "wasted" 250 ms
  hash — check the email first — would open a timing oracle: taken emails
  answer in ~2 ms, free ones in ~250. So lesson 12's "cheap check first" holds
  *only when the cheap check leaks less*. Here it leaks more. **A wasted hash
  can be load-bearing.**
- Enumeration is not about email. It is "does this reply describe a thing the
  caller was not already allowed to see?" — which is why lesson 9's gate
  answers `403` for a wrong role and a total stranger alike.

## The second bug — found while measuring, not while planning

`Mixed@e.com` registered as id 720; `mixed@e.com` then registered as id 721.
**Two accounts, one human.** And registering with a capital (iOS capitalises in
the keyboard, by default) then logging in lower-case is a permanent `401`,
which a user reports as "your site lost my password".

**Half a normalisation is worse than none.** The throttle key was lower-cased
in the handler since lesson 11; the database lookup two lines below used the raw
string. Lesson 11's test `case does not open a side door` was green on top of
it, telling me not to look. With no normalisation at all the bug shows up the
first time you type a capital letter.

Fixed at the door, not at the query — `src/schemas/auth.schema.ts`:

```ts
const emailField = z.string().trim().toLowerCase();
export const Register = z.object({ email: emailField.pipe(z.email().max(254)), ... });
```

**Zod gotcha, walked into it myself:** chains run left to right, so
`z.email().trim()` validates the *untrimmed* string and 400s a pasted
`" Jay@x.com "`. Transforms are not preprocessing. Clean first, `.pipe()` into
the check.

The handler's `const key = email.toLowerCase()` became `const key = email`,
with a comment naming the schema that keeps the promise — third use of "an `as`
cast (or any assumption) is a promise kept in another file; name the file".

Backfill: `20260907062418_lowercase_emails`, data only, hand-written per
lesson 10. `UPDATE "User" SET email = lower(email) WHERE email <> lower(email);`
**Letting it hit the `@unique` and roll back is the design** — resolving
duplicates automatically would delete a person's account and their tasks. My
own probe rows were the one duplicate pair; deleted those four by hand first.

## Consequence

- `npm test` = **109**, was 101. Eight new, all enforcement, in
  `src/routes/enumeration.test.ts`.
- **No new dependency.** Three lessons running.
- **How to test a timing defence:** assert *both paths are slow* (`> 100 ms`),
  never that the two times are close. A loaded laptop makes identical paths
  differ by 200 ms; it cannot make scrypt free. A flaky security test gets
  deleted within a month, leaving no test at all.

## Open

- Enumeration itself: five free probes per address. Only design A closes it.
- Registration spam: nothing stops 10 000 *fresh* addresses becoming 10 000
  real accounts. Per-email keys cannot see it. Needs verification (A).
- The throttle `Map` is still in-process — fourth lesson carrying this. Redis,
  week 11–12.
- Unicode look-alikes: `jаy@x.com` with a Cyrillic `а` is a separate row.
  Deliberately out of scope; `toLowerCase()` is not a normaliser.
- Forgot-password does not exist yet. It is the third enumeration surface, and
  it should be built design-A from the first line.
- Still open in week 7–8: SQL injection (why Prisma helps), the audit log table.
