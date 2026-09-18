# scrypt, because it is already in Node

Lesson 5 (2026-09-01) added `User.passwordHash` and `POST /auth/register`.

## The decision
PLAN.md said argon2. Lesson 5 used **scrypt from `node:crypto`** instead. Reasons, in order:

1. Zero install. Jay's laptop is resource-tight ([[0004-postgres-on-the-machine-you-have]] set this precedent), and argon2 means a package plus a native build.
2. scrypt is OWASP's own #2, not a downgrade off the list. Params used: `N=2^17, r=8, p=1` — the stated minimum (checked 2026-09-01).
3. It keeps the salt and the settings *visible* in the code. An argon2 library hides both inside one call, which is better engineering and worse teaching. Jay writes `randomBytes(16)` himself, so "salt" is a thing he did, not a thing a library did.

**Expiry date on this decision:** scrypt at `N=2^17` costs ~128 MiB of RAM per hash. Fine for one dev laptop, wrong for a server with concurrent logins. Week 13-14 (performance) must revisit and probably move to `@node-rs/argon2` (~19 MiB for equal strength). The lesson says this out loud so it does not become silent architecture.

## Teaching points to re-use
- The stored string carries its own recipe: `scrypt$131072$8$1$salt$hash`. This is the reason a work factor can be raised later without breaking old rows. Same shape as a migration: version the data, do not assume one global setting.
- `timingSafeEqual` over `===` introduced here, early. Timing attacks are on the week 7-8 list, but the *first* place Jay would have written `===` is here, so the habit is taught at the point of temptation rather than as a later correction.
- The column is named `passwordHash`, never `password`. Framed as the same trick as [[0003-declare-the-wall-not-remember-it]]: make the wrong thing awkward to write instead of remembering not to write it.
- `sha256` is a hash and is still wrong. Worth checking Jay actually absorbed this — "use a hash" is the half-lesson that produces sha256 passwords in the wild.

## Loose ends deliberately left
- No login route. Lesson 5 ends at "the hash exists"; a hash proves a password *once*, and carrying that proof between requests is a session. Lesson 6 = sessions, and only then does `DEV_OWNER_ID` (a hard-coded `1` in `src/routes/tasks.route.ts`, not an env var as [[0005-ownership-is-a-foreign-key-not-a-string]] recorded) actually die.
- No email verification, no weak-password check (zxcvbn / haveibeenpwned), no rate limit on register. All named in RESOURCES.md sources; all after sessions work.
- Migration took another `migrate reset`. Second time now. The production recipe (nullable → backfill → required) is written down but has never been *done*. Week 11-12 should make Jay do it once for real.

Evidence: lessons/0005-passwords-you-cannot-read-back.html, reference/password-hashing.html.
