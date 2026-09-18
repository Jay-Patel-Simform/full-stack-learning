import { QueryClient } from "@tanstack/react-query";

// ONE client, created at module load — not inside a component. A QueryClient
// built in a component body is rebuilt on every render, and one built in
// useEffect([]) is rebuilt on remount and twice in dev under StrictMode.
// Either way the cache is thrown away and every screen refetches.
// Rule: advanced-init-once.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // A 401 is an answer, not a failure. Retrying it three times just makes
      // the login form appear a second late.
      retry: false,
      staleTime: 30_000,
    },
  },
});
