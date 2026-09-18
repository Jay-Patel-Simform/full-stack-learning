import type { Prisma } from "./generated/prisma/client.ts";
import Fastify, { type FastifyError } from "fastify";
import rateLimit from "@fastify/rate-limit";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import { ZodObject, type ZodType } from "zod";
import { prisma } from "./db.ts";
import { allowWrite } from "./auth/csrf.ts";
import { shouldAudit, writeAudit } from "./audit/audit.ts";
import { findUserById } from "./store/user.store.ts";
import healthRoutes from "./routes/health.route.ts";
import tasksRoutes from "./routes/tasks.route.ts";
import authRoutes from "./routes/auth.route.ts";
import teamsRoutes from "./routes/teams.route.ts";
import projectsRoutes from "./routes/projects.route.ts";
import auditRoutes from "./routes/audit.route.ts";
import { config } from "./config.ts";

// * The exact front ends allowed to read our replies. Origin = scheme + host
// * + port, so http and https, and :5173 and :3000, are different origins.
const ALLOWED_ORIGINS = config.ALLOWED_ORIGINS;

// * Every path whose value must never reach the log. pino replaces the value
// * with "[Redacted]" and leaves the key, so you can still see that the field
// * was there.
// ! Each entry is an EXACT path, counted from the root of the log line.
// ! `*.password` is ONE level: it covers { body: { password } } and
// ! { user: { password } }, and it does NOT cover { err: { user: { password }}}.
// ! Depth has to be written out. A path that matches nothing is not an error
// ! and not a warning - it is silence, and the value prints in full.
// ! This list is a denylist (block these, allow the rest). It is the net, not
// ! the plan. The plan is the rule in server/CLAUDE.md: log the fields you
// ! chose, never a whole object.
export const REDACT_PATHS = [
  "*.password",
  "*.passwordHash",
  "err.user.password",
  "err.user.passwordHash",
  "req.headers.cookie",
  "req.headers.authorization",
];

// * Build the app but do NOT start listening. Tests can call this too.
// ? logStream exists for one reason: a log line has no failing state, so the
// ? only way to test one is to read it. Pass a stream and the test can assert
// ? on what was written. Left out, pino writes to stdout as before.
export async function buildApp(logStream?: NodeJS.WritableStream) {
  // * Refuse any body over 64 KB, before it is read into memory.
  // * Our biggest input is a task with a description; 64 KB is plenty.
  const app = Fastify({
    // ? A level, not a boolean, so `npm test` can run silent (LOG_LEVEL=silent)
    // ? and production can be turned up without editing code.
    logger: {
      // ? `npm test` runs LOG_LEVEL=silent so 154 tests do not spew. A test
      // ? that wants to READ the log would then read nothing, so passing a
      // ? stream means "I intend to read this" and turns the level back up.
      level: logStream === undefined ? config.LOG_LEVEL : "info",
      redact: REDACT_PATHS,
      // ! `stream: undefined` does not compile. exactOptionalPropertyTypes
      // ! again - lesson 33's spread, one lesson later. "absent" and "present
      // ! and undefined" are different, and the flag makes you say which.
      ...(logStream !== undefined && { stream: logStream }),
    },
    bodyLimit: 64 * 1024,
    // ! Behind nginx every request arrives from 127.0.0.1, so request.ip is the
    // ! proxy: the per-IP rate limit becomes one bucket for the whole internet
    // ! and every audit row records the same address. trustProxy makes Fastify
    // ! read X-Forwarded-For instead.
    // ! Opt-in, never always-on: with no proxy in front, anyone can send that
    // ! header and pick their own rate-limit bucket.
    trustProxy: config.TRUST_PROXY,
  });

  // * 1. Check input with zod. One compiler, every route.
  app.setValidatorCompiler(({ schema, httpPart }) => {
    // ! Every request BODY is strict here, so an unnamed key is a 400 and not a
    // ! silent strip. zod's default strips quietly, which is safe but mute: a
    // ! front-end typo ({ isDone: true }) would get a 200 and change nothing.
    // ! One place, so a schema written next year is strict without remembering.
    // ? Only bodies. params and querystring arrive as objects Fastify itself
    // ? fills, and it puts keys in there we never declared.
    const s =
      httpPart === "body" && schema instanceof ZodObject
        ? schema.strict()
        : (schema as ZodType);

    return (data) => {
      const r = s.safeParse(data);

      if (r.success) return { value: r.data }; // ? good data goes to the handler

      // ? one readable line, like "title: too short"
      const why = r.error.issues
        .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
        .join("; ");

      return { error: new Error(why) }; // ? Fastify answers 400 with this text
    };
  });

  // ! 2. Shape output with zod. parse() drops any field not in the schema.
  // ! That is how passwordHash stays private.
  app.setSerializerCompiler(
    ({ schema }) =>
      (data) =>
        JSON.stringify((schema as ZodType).parse(data)),
  );

  // * 3. Floor under the whole API: 100 requests per IP per minute. Per-IP,
  // * because every route past login has no account to count yet.
  // * global:false + our own onRequest hook, so the cheap check runs before
  // * requireAuth's session lookup. The plugin's global mode runs after it.
  await app.register(rateLimit, {
    global: false,
    max: 100,
    timeWindow: "1 minute",
    // TODO: ponytail: in-process counters. Two processes = double the limit.
    // TODO: pass the plugin a `redis` option when there is more than one instance.
    cache: 5_000,
  });
  app.addHook("onRequest", app.rateLimit());

  // * 4. CSRF. CORS decides who may READ our reply. Nothing yet decides who
  // * may WRITE, and a write is the part an attacker's page does not need to
  // * read. One hook, before requireAuth, so a forged write costs no session
  // * query. No token, no store, no second cookie - the browser already
  // * tells us who asked, in a header a page is forbidden to set.
  app.addHook("onRequest", async (request, reply) => {
    const site = request.headers["sec-fetch-site"];
    if (
      !allowWrite(
        request.method,
        typeof site === "string" ? site : undefined,
        request.headers.origin,
        ALLOWED_ORIGINS,
      )
    ) {
      // ? 403, not 401: the cookie was fine, the caller was not.
      return reply.code(403).send({ error: "cross-site write refused" });
    }
  });

  // * 5. CORS. This does NOT protect the API - the browser already refused to
  // * let a stranger's page read our replies. This is how we let OUR front end
  // * read them, and nobody else.
  // ! An explicit list. Never origin:true with credentials:true - that reflects
  // ! whatever Origin the attacker sends, and the cookie rides along.
  await app.register(cors, {
    origin: ALLOWED_ORIGINS,
    credentials: true, // ? without this the browser drops the session cookie
    methods: ["GET", "POST", "PATCH", "DELETE"],
  });

  // * 6. Security headers. Helmet's defaults are written for an HTML PAGE.
  // * We send JSON, so most of them are noise here. Keep the ones that are
  // * about a browser mishandling our JSON, and switch the rest off on purpose.
  await app.register(helmet, {
    // ! useDefaults:false throws away helmet's page-shaped policy. A JSON API
    // ! should load nothing at all, ever, if a browser tries to render it.
    contentSecurityPolicy: {
      useDefaults: false,
      directives: { "default-src": ["'none'"], "frame-ancestors": ["'none'"] },
    },
    xFrameOptions: { action: "deny" }, // ? helmet's default is sameorigin; we frame nothing
    // ? Only in production, and only because it is served over HTTPS there.
    // ! Never send this from localhost: the browser remembers it per host and
    // ! will refuse plain http to that host until max-age expires.
    hsts:
      config.NODE_ENV === "production"
        ? { maxAge: 31_536_000, includeSubDomains: true }
        : false,
    // * Off: these only mean something to a page, and we do not serve pages.
    crossOriginOpenerPolicy: false, // ? about window.opener between pages
    originAgentCluster: false,
    xDnsPrefetchControl: false,
    xDownloadOptions: false,
    xPermittedCrossDomainPolicies: false,
    // * Kept on: nosniff, referrer-policy, and Cross-Origin-Resource-Policy.
    // * CORP blocks no-cors loads only (<script src>, <img>), so it cannot
    // * break our front end's fetch() - that one is CORS mode.
  });

  // * 7. Never let a cache keep a per-user reply. Every route here answers
  // * with somebody's data, so this is global, with no per-route decision.
  app.addHook("onSend", async (_req, reply) => {
    reply.header("cache-control", "no-store");
  });

  // * 8. Audit log. ONE hook, at the end, because onResponse is the only place
  // * that knows both WHO asked (requireAuth set request.userId) and what the
  // * answer WAS (reply.statusCode). A 403 is the row you most want, and no
  // * handler ever runs to write it.
  // ? onResponse fires after the reply is flushed, so the await costs the
  // ? caller nothing.
  app.addHook("onResponse", async (request, reply) => {
    if (!shouldAudit(request.method, reply.statusCode)) return;

    // ? Params may still be raw strings here -- a 401 from requireAuth is
    // ? answered before zod ever coerces them.
    const params = request.params as Prisma.InputJsonObject | undefined;
    const teamId = Number(params?.teamId);

    // ! The email is fetched HERE, not in a route. Every route has the same
    // ! actor, so it is cross-cutting -- and readSession only ever loaded the
    // ! id, so nothing downstream has the email to pass.
    // TODO: week 13 -- DELETE /me removes the row before this hook runs, so a
    // TODO: user deleting their own account lands actorEmail: null. Same
    // TODO: fetch-before-delete trap the target snapshot already solved.
    const actor =
      request.userId === undefined
        ? undefined
        : await findUserById(request.userId);

    const target = request.auditTarget;

    await writeAudit(request.log, {
      userId: request.userId,
      teamId: Number.isInteger(teamId) ? teamId : undefined,
      method: request.method,
      // ! The PATTERN, not request.url. "/teams/:teamId/tasks/:id" is one of a
      // ! short fixed list; a URL is caller input, and any store keyed on
      // ! caller input is a store the caller can fill.
      route: request.routeOptions.url ?? "(no route)",
      status: reply.statusCode,
      ip: request.ip,
      // ! {} when the route has no path params. Not undefined -- see the note
      // ! on AuditLog.params: one empty, not two.
      params: params ?? {},
      actorEmail: actor?.email,
      targetType: target?.type,
      targetId: target?.id,
      targetSnapshot: target?.snapshot,
    });
  });

  // * 9. The last wall: what a crash is allowed to say. Fastify's default
  // * error reply sends err.message straight to the caller, and a Prisma
  // * error's message contains absolute file paths, source lines and every
  // * column of the model. That is a free map of the codebase.
  // ! The split is on the STATUS, not on the error type. A 4xx was caused by
  // ! the caller's own input, so telling them is the API contract. A 5xx was
  // ! caused by OUR code, so the caller learns nothing but the request id.
  app.setErrorHandler((err: FastifyError, request, reply) => {
    if ((err.statusCode ?? 500) < 500) return reply.send(err); // ? 400, 403, 429...

    // ? The detail does not disappear - it moves to the log, where only we
    // ? read it. request.id is on both sides, so a report of "error req-42"
    // ? finds the stack trace.
    request.log.error({ err }, "unhandled error");

    return reply.code(500).send({
      statusCode: 500,
      error: "Internal Server Error",
      message: "Internal Server Error",
      requestId: request.id,
    });
  });

  // * A box the handler fills and the audit hook empties. Declared here
  // * because the hook owns the contract, not the route.
  app.decorateRequest("auditTarget", null);

  // * Give the connection pool back when the app closes. Tests build an app
  // * per file, and a process that keeps a pool open does not exit.
  app.addHook("onClose", async () => {
    await prisma.$disconnect();
  });

  // * Plug the routes in.
  app.register(healthRoutes);
  app.register(tasksRoutes);
  app.register(authRoutes);
  app.register(teamsRoutes);
  app.register(projectsRoutes);
  app.register(auditRoutes);

  return app;
}
