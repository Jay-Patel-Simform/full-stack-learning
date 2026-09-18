import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  Login,
  Register,
  UserPublic,
  type LoginInput,
  type RegisterInput,
} from "../schemas/auth.schema.ts";
import { ErrorReply } from "../schemas/task.schema.ts";
import { DUMMY_HASH, hashPassword, verifyPassword } from "../auth/password.ts";
import { createUser, findUserByEmail, findUserById } from "../store/user.store.ts";
import {
  COOKIE_NAME,
  clearCookie,
  createSession,
  endSession,
  readCookie,
  sessionCookie,
} from "../auth/session.ts";
import { requireAuth } from "../auth/require-auth.ts";
import { throttleCheck, throttleFail, throttleReset } from "../auth/throttle.ts";

export default async function authRoutes(app: FastifyInstance) {
  app.post("/auth/register", {
    schema: { body: Register, response: { 201: UserPublic, 409: ErrorReply, 429: ErrorReply } },
    handler: async (request, reply) => {
      const { email, password } = request.body as RegisterInput;

      // ! 409 vs 201 tells the caller whether an account exists. A signup form
      // ! that answers instantly cannot hide that. So make the answer cost:
      // ! the same per-email backoff login has had since lesson 11.
      const waitMs = throttleCheck(email);
      if (waitMs > 0) {
        reply.header("retry-after", Math.ceil(waitMs / 1000));
        return reply.code(429).send({ error: "too many attempts, try again later" });
      }

      const user = await createUser(email, await hashPassword(password));
      if (!user) {
        throttleFail(email); // ? five free probes, then seconds, then minutes
        return reply.code(409).send({ error: "email already registered" });
      }
      return reply.code(201).send(user);
    },
  });

  app.post("/auth/login", {
    schema: { body: Login, response: { 200: UserPublic, 401: ErrorReply, 429: ErrorReply } },
    handler: async (request, reply) => {
      const { email, password } = request.body as LoginInput;

      // ! Keyed on the email. Not the IP (proxies defeat it) and not the user
      // ! id: an unknown email must throttle the same, or the 429 becomes an
      // ! account-exists oracle.
      // ? Already trimmed and lower-cased -- by Login in schemas/auth.schema.ts,
      // ? which is the only way a body reaches this handler.
      const key = email;

      const waitMs = throttleCheck(key);
      if (waitMs > 0) {
        // ? whole seconds. A polite client backs off; the wall is there either way.
        reply.header("retry-after", Math.ceil(waitMs / 1000));
        return reply.code(429).send({ error: "too many attempts, try again later" });
      }

      const user = await findUserByEmail(email);

      // ! Always hash, even with no user, so both paths take the same time.
      const ok = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);

      // ! One message for both. "wrong password" would confirm the email exists.
      if (!user || !ok) {
        throttleFail(key);
        return reply.code(401).send({ error: "invalid email or password" });
      }

      throttleReset(key); // ? a right answer wipes the slate
      const session = await createSession(user.id);
      reply.header("set-cookie", sessionCookie(session.id, session.expiresAt));
      return reply.send(user);
    },
  });

  app.post("/auth/logout", {
    schema: { response: { 204: z.null() } },
    handler: async (request, reply) => {
      const id = readCookie(request.headers.cookie, COOKIE_NAME);
      if (id) await endSession(id); // ? the row dies -> the cookie is now junk
      reply.header("set-cookie", clearCookie());
      return reply.code(204).send();
    },
  });

  // * "Who am I?" The front end calls this on load.
  app.get("/auth/me", {
    onRequest: requireAuth,
    schema: { response: { 200: UserPublic, 401: ErrorReply } },
    handler: async (request, reply) => {
      const user = await findUserById(request.userId!);
      if (!user) return reply.code(401).send({ error: "not logged in" });
      return user;
    },
  });
}
