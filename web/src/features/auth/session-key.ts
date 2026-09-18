// Its own module so lib/api.ts can import the key without importing the
// hooks, and the hooks can import the api without a cycle.
export const SESSION_KEY = ["session"] as const;
