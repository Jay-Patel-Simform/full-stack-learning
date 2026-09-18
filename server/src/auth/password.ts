import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";
import { promisify } from "node:util";

// ? promisify's type arguments pick the 4-argument overload (with options).
const scryptAsync = promisify<string, Buffer, number, ScryptOptions, Buffer>(scrypt);

// ! OWASP minimum: N=2^17, r=8, p=1. ~128 MiB per hash. The cost is the point.
const N = 2 ** 17;
const r = 8;
const p = 1;
const KEY_LEN = 64;

// ! scrypt in Node needs maxmem raised by hand, or it refuses this N.
const MAX_MEM = 256 * 1024 * 1024;

// * Settings live in the hash, so raising N later does not break old rows.
export async function hashPassword(plain: string): Promise<string> {
  // ? new random salt for every single user
  const salt = randomBytes(16);
  const key = await scryptAsync(plain, salt, KEY_LEN, { N, r, p, maxmem: MAX_MEM });
  return `scrypt$${N}$${r}$${p}$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6) return false;
  const [scheme, sN, sR, sP, saltB64, keyB64] = parts as [
    string,
    string,
    string,
    string,
    string,
    string,
  ];
  if (scheme !== "scrypt") return false;

  const salt = Buffer.from(saltB64, "base64");
  const expected = Buffer.from(keyB64, "base64");
  // ? A junk row would give a 0-length key, and scrypt throws on keylen 0.
  if (expected.length === 0) return false;

  // * Re-hash the attempt with the SAME salt and the SAME settings as the row.
  const actual = await scryptAsync(plain, salt, expected.length, {
    N: Number(sN),
    r: Number(sR),
    p: Number(sP),
    maxmem: MAX_MEM,
  });

  // ! Not ===. A normal compare stops at the first wrong byte and leaks how
  // ! much was right. timingSafeEqual always takes the same time.
  return timingSafeEqual(actual, expected);
}

// ! Verified against when the email does not exist, so a missing user costs the
// ! same time. A fast "no" would mean "no such user".
export const DUMMY_HASH = `scrypt$${N}$${r}$${p}$${Buffer.alloc(16).toString("base64")}$${Buffer.alloc(64).toString("base64")}`;
