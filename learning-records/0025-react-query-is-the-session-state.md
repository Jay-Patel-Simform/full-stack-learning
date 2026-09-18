# 0025 — React Query is the session state

Date: 2026-09-09
Lesson: [22 — The browser does not know you](../lessons/0022-the-browser-does-not-know-you.html)
Supersedes the "no framework" decision in [record 0024](./0024-logged-in-is-a-question-not-a-fact.md).

## Context

Jay asked, straight after lesson 22 shipped: make `web/` a real React app —
shadcn/ui + Tailwind, React Query and axios — and follow Vercel's React
best-practices skill.

Record 0024 chose one static HTML file *because* React would hide the auth
behind machinery he already knows. That reasoning was about teaching order,
not about the right stack, and he asked for the stack. Built it.

## The stack, and what each piece is actually for

| Piece | Why it is here |
|---|---|
| Vite + React + TS | `strictPort: 5173` — the exact string in the API's `ALLOWED_ORIGINS`. A drift to 5174 looks exactly like a CORS bug. |
| Tailwind v4 (`@tailwindcss/vite`) | No config file, no PostCSS chain. |
| shadcn/ui (`radix-nova`) | Source files in `src/components/ui/`, not a dependency to fight. Five components: button, card, input, label, alert. |
| React Query | **It is the session state.** Not a cache in front of one. |
| axios | One instance, so `withCredentials` and the 401 rule are declared once. |

## Decisions worth keeping

**1. `withCredentials: true` on the axios instance, not per call.** The dev
front end is a different *origin* (`:5173` vs `:3000`) so no cookie is sent
without it. Declared once, in `lib/api.ts`, for the same reason `csrf.ts` is
one app-level hook: a flag you must remember per call is a flag that goes
missing.

**2. A 401 from `/auth/me` becomes `null`, not a thrown error.** Being logged
out is an *answer*. That one choice is what makes the three states fall out of
the query with no extra state:

```
data === undefined  ->  unknown (asking)
data === null       ->  out
data is a User      ->  in
```

**3. `staleTime: 0` on the session query, overriding the 30 s default.** Found
by measurement, not by reading. React Query only revalidates on window focus
if it thinks the answer is stale — so with 30 s, a session deleted in Postgres
left the tab rendering a signed-in UI for half a minute. **Auth is the one
query with no grace period.** This is the single most valuable line of the
whole conversion.

**4. One axios response interceptor owns the "session died" 401**, with
`CREDENTIAL_ROUTES` (`/auth/login`, `/auth/register`) excluded because a 401
there means "wrong password" — a different event with a different UI. Third
use of "a rule with no exceptions does not belong in each caller" (lesson 7
`can()`, lesson 19 audit hook).

**5. `queryClient` at module scope in `lib/query-client.ts`.** A client built
in a component body is rebuilt every render; one built in `useEffect([])` is
rebuilt on remount and twice in dev under StrictMode. Vercel rule
`advanced-init-once`. `lib/api.ts` imports it, which is why the query key
lives in its own tiny module (`session-key.ts`) — otherwise api ↔ session is
a cycle.

**6. Kept cross-origin on purpose. No Vite proxy.** A proxy would have made
`withCredentials` unnecessary and quietly deleted the lesson. Same-origin is
still the production answer (record 0015, nginx, week 11–12).

## Vercel react-best-practices skill

Read from the repo (`vercel-labs/agent-skills`, 72 rules / 8 categories)
rather than installed. To have it permanently: `npx skills add
vercel-labs/agent-skills`.

Most of it is Next.js/RSC and does not apply to a Vite SPA. The rules that did:

- `advanced-init-once` — QueryClient at module scope. (Above.)
- `rerender-derived-state-no-effect` / `rerender-derived-state` — **the app has
  no `useEffect` at all.** `state` is derived during render from the query.
- `rerender-move-effect-to-event` — login runs off the form's submit event.
- `rendering-conditional-render` — ternaries, never `&&`, so a falsy value
  cannot render itself.
- `rerender-no-inline-components` — `Asking` and `StateLine` at module level.
- `bundle-barrel-imports` (rated CRITICAL, and lucide-react is its named
  example) — **uninstalled `lucide-react`: 44 MB, zero imports.** shadcn's
  preset pulls it in for icons this app does not use. `node_modules` 233 MB →
  189 MB, and the build is unchanged. Also dropped `clsx` and
  `tailwind-merge`; shadcn v4 uses the `cn` package instead.

## Measured, in real headless Chrome (all five, on the final code)

```
1. boot, no cookie                -> state: out
2. wrong password                 -> state: out + "invalid email or password"
3. right password                 -> state: in,  document.cookie === ""
4. full page reload               -> state: in
5. every Session row DELETEd,
   then tab focus, no reload      -> state: out
console errors / warnings: none
```

Request log confirms the shape: `401 /auth/me` → `204` preflight →
`401 /auth/login` → `200 /auth/login` → `200 /auth/me`.

## Consequence

- `npm test` = **135**, unchanged. **No server code changed by this
  conversion** — the walls were already right for it.
- `tsc -b` clean with `strict: true` (the Vite template omitted it). `oxlint`
  clean except one warning inside shadcn's generated `button.tsx`.
- Deleted `npm run web` from `server/package.json`; the front end has its own
  `npm run dev`.
- Lesson 22 rewritten to match: the vanilla `api()` section is now the axios
  instance, the query, and the interceptor. Grew to 13.5 KB.

## Found while writing it

- **The interceptor's path was unexercised code.** Nothing in the UI calls a
  protected endpoint yet, and `/auth/me` handles its own 401. Verified it by
  temporarily adding a `/teams/1/tasks` query, confirming a real `401` flipped
  the app to `out`, then reverting. Worth doing rather than shipping a comment
  claiming it works.
- That temporary query also re-proved lesson 9's gate for free: signed in but
  not a member of team 1 answers **403**, not 401.
- **My probe lied to me once.** The focus revalidation looked broken until I
  noticed `new Event("visibilitychange")` does not bubble, so it never reached
  the `window` listener React Query uses. The app was right; the test was
  wrong. Rule: when a headless probe disagrees with the design, suspect the
  probe's synthetic events first.
- shadcn v4 writes `export { cn } from "cn"` and `@import "shadcn/tailwind.css"`,
  so `shadcn` and `cn` are genuine runtime deps now. Do not "clean" them out.

## Open

- The interceptor is right but only lightly exercised until there is a second
  endpoint. Next lesson gives it one.
- No test for the front end. `tsc` and a browser probe are not a test suite.
  Vitest + Testing Library when there is a second screen to break.
- No CSP on the page. Vite dev sends none; the built output needs one from
  whatever serves it. nginx, week 11–12.
- `VITE_API_URL` is read but unset, falling back to `http://localhost:3000`.
  It becomes real at deploy, when the answer is a relative path.
