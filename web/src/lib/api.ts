import axios, { AxiosError } from "axios";
import { queryClient } from "@/lib/query-client";
import { SESSION_KEY } from "@/features/auth/session-key";

// The API is a different ORIGIN in dev (:3000 vs :5173). Same host, so
// SameSite=Lax is happy and the browser is willing to send the session
// cookie — but a cross-origin request sends no cookie unless we ask.
// Without withCredentials the app looks logged out while the cookie sits in
// the jar. This one line is the whole difference between 401 and 200.
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:3000",
  withCredentials: true,
  headers: { "content-type": "application/json" },
});

// A 401 from these routes means "wrong email or password" — the form has to
// show it. A 401 from anywhere else means "your session is gone", which is a
// different event with a different UI.
const CREDENTIAL_ROUTES = new Set(["/auth/login", "/auth/register"]);

// ONE place sees the session-gone 401. A session row can be deleted while the
// tab sits idle — logout in another tab, expiry, an admin ending sessions —
// and nothing in the browser can detect it. So this is not a boot-time check:
// any request can be the one that finds out.
api.interceptors.response.use(undefined, (error: AxiosError) => {
  const url = error.config?.url;
  if (
    error.response?.status === 401 &&
    url !== undefined &&
    !CREDENTIAL_ROUTES.has(url)
  ) {
    // Write the logged-out answer straight into the cache. Every useSession()
    // in the tree re-renders to the login form at once, with no navigation,
    // no event bus and no effect.
    queryClient.setQueryData(SESSION_KEY, null);
  }
  return Promise.reject(error);
});

export function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof AxiosError) {
    const data = error.response?.data as
      | { error?: string; message?: string }
      | undefined;
    return data?.error ?? data?.message ?? fallback;
  }
  return fallback;
}
