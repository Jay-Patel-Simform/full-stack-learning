import type { FastifyReply, FastifyRequest } from "fastify";
import { COOKIE_NAME, readCookie, readSession } from "./session.ts";

// ? Without this, `request.userId = ...` below is a type error.
declare module "fastify" {
  interface FastifyRequest {
    userId?: number;
  }
}

// * onRequest hook. If it sends a reply, the handler never runs. That is the gate.
export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  const id = readCookie(request.headers.cookie, COOKIE_NAME);
  const userId = id ? await readSession(id) : undefined;

  // ? 401 = "I do not know who you are". (403 would be "I know, and no".)
  if (userId === undefined) return reply.code(401).send({ error: "not logged in" });

  request.userId = userId;
}
