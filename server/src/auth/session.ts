import { createHash, randomBytes } from "node:crypto";
import { prisma } from "../db.ts";
import { config } from "../config.ts";

// * 15 random bytes = 120 bits of entropy. The Copenhagen Book asks for 112+.
// * base64url so the string is safe in a cookie with no escaping.
const ID_BYTES = 15;

// * 30 days, and every use pushes it back out to 30 days again.
const LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;
// ? Only rewrite the row when less than half the life is left. Saves a write
// ? on every single request.
const RENEW_AFTER_MS = LIFETIME_MS / 2;

// ! The browser holds the id, the database only the hash, so a stolen dump has
// ! no usable session. SHA-256 is enough: the id is already random.
function hashId(id: string): string {
  return createHash("sha256").update(id).digest("base64url");
}

export async function createSession(userId: number): Promise<{ id: string; expiresAt: Date }> {
  const id = randomBytes(ID_BYTES).toString("base64url");
  const expiresAt = new Date(Date.now() + LIFETIME_MS);
  await prisma.session.create({
    data: { idHash: hashId(id), expiresAt, userId },
  });
  return { id, expiresAt };
}

// ? The user id when the session is real and alive, otherwise undefined.
export async function readSession(id: string): Promise<number | undefined> {
  const row = await prisma.session.findUnique({
    where: { idHash: hashId(id) },
  });
  if (!row) return undefined;

  // ? Expiry is checked here, in code. The row may still be sitting in the table.
  if (row.expiresAt.getTime() <= Date.now()) {
    await prisma.session.delete({ where: { idHash: row.idHash } });
    return undefined;
  }

  // ? Sliding window: an active user is never logged out mid-work.
  if (row.expiresAt.getTime() - Date.now() < RENEW_AFTER_MS) {
    await prisma.session.update({
      where: { idHash: row.idHash },
      data: { expiresAt: new Date(Date.now() + LIFETIME_MS) },
    });
  }
  return row.userId;
}

// ? deleteMany, not delete: a already-gone session is not an error.
export async function endSession(id: string): Promise<void> {
  await prisma.session.deleteMany({ where: { idHash: hashId(id) } });
}

export const COOKIE_NAME = "session";

// ! Built by hand so the flags stay visible. Each one blocks a different attack.
export function sessionCookie(id: string, expiresAt: Date): string {
  return [
    `${COOKIE_NAME}=${id}`,
    "HttpOnly", // ! JavaScript cannot read it -> an XSS bug cannot steal it
    "SameSite=Lax", // ! not sent from another site's form -> blocks basic CSRF
    "Path=/",
    `Expires=${expiresAt.toUTCString()}`,
    // ! Production only, same reason as HSTS in app.ts: localhost is plain http
    // ! and a Secure cookie there would simply never be stored.
    ...(config.NODE_ENV === "production" ? ["Secure"] : []),
  ].join("; ");
}

export function clearCookie(): string {
  // ! The flags must match the cookie being cleared, Secure included, or the
  // ! browser treats this as a different cookie and the session one survives.
  const secure = config.NODE_ENV === "production" ? "; Secure" : "";
  return `${COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure}`;
}

// ? Cookies arrive as one header: "a=1; session=xyz; b=2".
export function readCookie(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) return part.slice(eq + 1).trim();
  }
  return undefined;
}
