# web

React 19 + Vite 8 front end for the task API. TypeScript, ESM, Tailwind 4 + shadcn (radix-nova), TanStack Query for all server state.

## Commands

- `npm run dev` — Vite on port 5173 (`strictPort`)
- `npm run build` — `tsc -b && vite build`
- `npm run preview` — serve the build
- `npm run lint` — oxlint
- `npx shadcn@latest add <component>` — new UI primitive into `src/components/ui/`

There is no test script and no typecheck script — `npm run build` runs `tsc -b`.

## Environment

- `VITE_API_URL` (http://localhost:3000) — the API origin.
- Port 5173 is not a preference: it is the exact string in the server's `ALLOWED_ORIGINS`. A different port is a different origin and CORS refuses the reply.

## Layout

- `src/main.tsx` — entry. `StrictMode` + one `QueryClientProvider`.
- `src/App.tsx` — the three session states: asking / signed in / signed out. Signed in renders `SignedInCard` + `TeamsCard`.
- `src/lib/api.ts` — the one axios instance (`withCredentials: true`) plus the response interceptor that turns a session-gone 401 into `null` in the cache. Also `errorMessage()`.
- `src/lib/query-client.ts` — the one `QueryClient`, built at module load.
- `src/lib/utils.ts` — re-exports `cn`.
- `src/features/<feature>/` — hooks + components for one feature. Today: `auth`, `teams`, `tasks`.
- `src/features/auth/session.ts` — `useSession`, `useLogin`, `useLogout`.
- `src/features/auth/session-key.ts` — `SESSION_KEY` alone, so `lib/api.ts` can import it without a cycle.
- `src/features/teams/teams.ts` — `useTeams` and its mutations. Each team arrives with the `role` you hold and the `can` list the server computed.
- `src/features/tasks/tasks.ts` — `useTasks(teamId)` and its mutations, keyed `["teams", teamId, "tasks"]`.
- `src/components/ui/` — shadcn primitives. Generated; edit only when a design change needs it.
- `src/index.css` — Tailwind, shadcn theme tokens, Geist.

## Rules

- Import with the `@/` alias, never `../../..`.
- Server state lives in TanStack Query. No `useState` copy of it, no `useEffect` syncing it. `useState` is for form input and other local UI only.
- Derive during render (`signedIn = user != null`). Never store what can be computed.
- Three session states, not two: `undefined` = still asking, `null` = signed out, a `User` = signed in. Booting into "signed out" flashes a login form at someone already signed in.
- The session cookie is HttpOnly. There is no client-side way to read it — "logged in" is a question you ask the server, never a fact the page holds.
- One `QueryClient` and one axios instance, both at module level. Built in a component body they are rebuilt every render; in `useEffect([])` they are rebuilt twice under StrictMode.
- Every component at module level, never nested inside another — a nested component is a new type each render and its whole subtree remounts.
- Work hangs off the event that caused it (`onSubmit`), not off an effect watching state.
- A mutation whose reply is the new data seeds the cache with `setQueryData`. Do not invalidate and pay a second round trip for something already in hand.
- On logout: `client.clear()` (every cached query belonged to whoever just left), then write `null` back in, or the UI flashes "asking…" on the way out.
- Auth queries use `staleTime: 0`. Everything else gets the 30s default.
- A 401 is an answer, not a failure: `retry: false`.
- A query key mirrors its URL. Team-scoped data gets one entry per team (`["teams", teamId, "tasks"]`), never a single shared bucket a second team could read out of.
- Permissions are the server's answer, not a copy. Render off the `can` list in the reply; never re-derive what a role may do in this app.
- A mutation sends the value it wants, never a verb — send it twice and the answer is the same, so a double-click and a retry are the same event.
- Comments explain why, in plain words. Keep that style.
