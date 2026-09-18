import type { Prisma } from "../generated/prisma/client.ts";
import { prisma } from "../db.ts";

// * The audit log answers "who did what, when" -- a question the request log
// * cannot answer. Fastify's logger prints a line per request, but it has no
// * userId (auth resolves later), it is text, and it rotates away.
// *
// * Written in ONE onResponse hook, never in a handler. Lesson 18's finding:
// * the rules `register` obeyed were the ones living in an app-level hook.
// * And onResponse is the only hook that knows BOTH who asked (requireAuth
// * set request.userId) and what the answer was (reply.statusCode). A refusal
// * is the row you most want, and no handler ever runs to write it.

// ? Same list as csrf.ts. These change nothing, so there is nothing to answer
// ? for -- unless the answer was no.
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

// ! A refusal is worth a row even on a read: this is what a scan looks like.
const REFUSALS = new Set([401, 403, 429]);

/**
 * Is this request worth a row?
 *
 * Every write, whatever the outcome, plus every refusal. NOT every read --
 * a table that grows by one row per GET is a table you delete in a month,
 * and then you have no audit log at all.
 */
export function shouldAudit(method: string, status: number): boolean {
  return !SAFE_METHODS.has(method) || REFUSALS.has(status);
}

// ? Just the one method we call, so a test can pass a stub and nothing imports
// ? fastify to write a row.
export type AuditLogger = { error: (obj: object, msg: string) => void };

export type AuditRow = {
  userId?: number | undefined;
  teamId?: number | undefined;
  method: string;
  route: string;
  status: number;
  ip: string;
  params: Prisma.InputJsonObject;
  // * Snapshot fields. Copies of what was true at the moment of the request,
  // * so the row still reads after the account or the task is gone.
  actorEmail?: string | undefined;
  targetType?: string | undefined;
  targetId?: number | undefined;
  targetSnapshot?: Prisma.InputJsonValue | undefined;
};

/**
 * Write the row. Runs after the reply is already on the wire, so the caller
 * waits for nothing.
 *
 * ! Never throws. An audit log that can 500 a working request is a new outage
 * ! source. A dropped row is bad; a dropped request is worse.
 */
export async function writeAudit(log: AuditLogger, row: AuditRow): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: row.userId ?? null,
        teamId: row.teamId ?? null,
        method: row.method,
        route: row.route.slice(0, 200),
        status: row.status,
        ip: row.ip.slice(0, 45),
        params: row.params,
        actorEmail: row.actorEmail ?? null,
        targetType: row.targetType ?? null,
        targetId: row.targetId ?? null,
        ...(row.targetSnapshot !== undefined && { targetSnapshot: row.targetSnapshot }),
      },
    });
  } catch (e) {
    // ? Log it and carry on. This is the one place a swallowed error is right.
    // ? Through Fastify's logger, not console: same stream, same JSON shape,
    // ? and it carries the request id that ties the line to the request.
    log.error({ err: e }, "audit write failed");
  }
}

// * The box a handler fills before its row is written. Declared here because
// * the audit hook owns the contract; app.ts only decorates the request.
export type AuditTarget = {
  type: string;
  id: number;
  snapshot?: Prisma.InputJsonValue | undefined;
};

declare module "fastify" {
  interface FastifyRequest {
    auditTarget?: AuditTarget | null;
  }
}
