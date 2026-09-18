import type { FastifyInstance } from "fastify";

// * Lesson 65. The first route with no session behind it: the browser posts
// * here, not a logged-in user. Everything requireAuth normally gives us --
// * an actor, a per-user rate bucket, an audit row worth reading -- is gone,
// * and each has to be replaced deliberately.
export default async function cspReportRoutes(app: FastifyInstance) {
  // * Browsers label the report application/csp-report. Fastify parses only
  // * application/json and answers 415 to anything else, before the handler
  // * exists. Same bytes, different label -- so reuse the JSON parser.
  app.addContentTypeParser(
    "application/csp-report",
    { parseAs: "string" },
    (_req, body, done) => {
      // ! A malformed report is the reporter's problem. done(err) would answer
      // ! 400; nobody reads it, so drop it instead.
      try {
        done(null, JSON.parse(body as string));
      } catch {
        done(null, {});
      }
    },
  );

  app.post(
    "/csp-report",
    // ! Its own bucket. The global 100/IP/min is shared with the user's real
    // ! requests, so a page spraying reports would spend the allowance and
    // ! then 429 the actual app.
    { config: { rateLimit: { max: 20, timeWindow: "1 minute" } } },
    async (request, reply) => {
      // ? 204: received, nothing to say. The browser discards the body anyway.
      reply.code(204);

      // ! No zod. Strictness is for input we control; this body is composed by
      // ! the browser, differs between engines, and may gain fields next year.
      const r = (request.body as Record<string, any> | undefined)?.["csp-report"] ?? {};

      request.log.warn(
        {
          // ! Named fields, never the whole object -- server/CLAUDE.md. This
          // ! came from the internet, and a log line is somewhere attackers
          // ! like to write, hence the slice().
          blocked: String(r["blocked-uri"] ?? "").slice(0, 200),
          directive: String(r["violated-directive"] ?? "").slice(0, 100),
          doc: String(r["document-uri"] ?? "").slice(0, 200),
        },
        "csp violation",
      );
    },
  );
}