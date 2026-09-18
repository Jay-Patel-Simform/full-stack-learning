// ! Counted per account, not per IP: a stuffing kit spreads over a proxy
// ! network, so per-IP never trips, but it has one email per stolen password.
// ! https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html

// * Backoff, not a lockout. A lockout is a DoS you hand the attacker: wrong
// * email five times and the real owner is out. Here they only wait.
const FREE_TRIES = 5; // ? five requests get a straight answer
const BASE_MS = 1_000; // ? then the 6th waits 1s, the 7th 2s, the 8th 4s...
const MAX_MS = 15 * 60 * 1_000; // ? ...capped, so a wrong-password day still ends

// ? The map only grows on failure, so cap it. Map iterates in insertion order
// ? and every write re-inserts, so the first key out is the coldest.
// TODO: ponytail: in-memory, single-process. 10k junk emails can evict a real
// TODO: victim's counter. Move to Postgres/Redis when there is a second process.
const MAX_KEYS = 10_000;

type Entry = { fails: number; until: number };
const attempts = new Map<string, Entry>();

/** Milliseconds this key must still wait. 0 means go ahead. */
export function throttleCheck(key: string): number {
  return Math.max((attempts.get(key)?.until ?? 0) - Date.now(), 0);
}

/** Record one failed attempt and widen the wait. */
export function throttleFail(key: string): void {
  const entry = attempts.get(key) ?? { fails: 0, until: 0 };
  entry.fails += 1;

  // ? the 5th failure raises the wall, so the 6th request gets the 429
  const over = entry.fails - FREE_TRIES + 1;
  entry.until = over > 0 ? Date.now() + Math.min(BASE_MS * 2 ** (over - 1), MAX_MS) : 0;

  attempts.delete(key); // ? delete then set, so this key becomes the newest
  attempts.set(key, entry);
  if (attempts.size > MAX_KEYS) attempts.delete(attempts.keys().next().value!);
}

/** Forget this key. Called on a correct password. */
export function throttleReset(key: string): void {
  attempts.delete(key);
}
