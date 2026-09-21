import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { api } from "@/lib/api";
import { SESSION_KEY } from "@/features/auth/session-key";

export type User = { id: number; email: string };

// The boot question. The session cookie is HttpOnly, so document.cookie is
// "" whether you are signed in or not — there is no client-side answer to
// read. "Logged in" is not a fact the page holds, it is a question it asks.
//
// A 401 becomes `null`, not a thrown error: being logged out is a normal
// answer, and turning it into query data means the UI has three plain states
// instead of a data/error/loading matrix.
async function getSession(): Promise<User | null> {
  try {
    return (await api.get<User>("/auth/me")).data;
  } catch (error) {
    if (error instanceof AxiosError && error.response?.status === 401) return null;
    throw error;
  }
}

/**
 * `undefined` = still asking, `null` = signed out, a User = signed in.
 * Three states, because two is a lie: boot into "signed out" and every reload
 * flashes a login form at someone already signed in.
 */
export function useSession() {
  const { data: user, isPending, error } = useQuery({
    queryKey: SESSION_KEY,
    queryFn: getSession,
    // Overrides the 30s default in query-client.ts, and it is the whole point:
    // React Query re-asks when the tab regains focus, but only if the answer
    // is stale. At 30s a session deleted elsewhere leaves this tab showing a
    // signed-in UI for half a minute. Measured — it does. Auth is the one
    // query with no grace period.
    staleTime: 0,
    // A 401 never reaches here — getSession turns it into `null` — so the only
    // thing left to retry is the server being unreachable, which on a free
    // plan is the normal first request while the container boots. Without
    // this, a cold start logs a signed-in person out.
    retry: 2,
  });

  // Derived during render, never stored in state and never synced in an
  // effect. Rules: rerender-derived-state, rerender-derived-state-no-effect.
  return { user, isPending, error, signedIn: user != null };
}

export function useLogin() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (credentials: { email: string; password: string }) =>
      (await api.post<User>("/auth/login", credentials)).data,
    // The reply IS the user, so seed the cache with it instead of
    // invalidating and making a second round trip to learn what we know.
    onSuccess: (user) => client.setQueryData(SESSION_KEY, user),
  });
}

export function useLogout() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => api.post("/auth/logout"),
    // The server deleted the row; the cookie left in the jar is now junk.
    // Write `null` in by hand first, or the session query refetches and the
    // user watches "asking…" on the way out. Then drop every other cached
    // query — they all belonged to the person who just left.
    // ! Not client.clear(): it evicts the session Query the mounted
    // ! useSession observer is subscribed to, setQueryData then creates a
    // ! *different* Query, and the orphaned observer keeps rendering the old
    // ! user until something forces a remount (a manual refresh).
    onSuccess: () => {
      client.setQueryData(SESSION_KEY, null);
      client.removeQueries({
        predicate: (query) => query.queryKey[0] !== SESSION_KEY[0],
      });
    },
  });
}
