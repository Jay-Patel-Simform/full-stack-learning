import type { FastifyInstance } from "fastify";
import { AuditPage, AuditQuery, type AuditQueryInput } from "../schemas/audit.schema.ts";
import { ErrorReply } from "../schemas/task.schema.ts";
import { TeamParams, type TeamParamsInput } from "../schemas/team.schema.ts";
import { listAudit } from "../store/audit.store.ts";
import { requireAuth } from "../auth/require-auth.ts";
import { requirePermission } from "../auth/require-permission.ts";

// * Team-scoped like every other route: the log answers "what happened in
// * THIS team", and the permission is a per-team role.
export default async function auditRoutes(app: FastifyInstance) {
  app.addHook("onRequest", requireAuth);

  app.get(
    "/teams/:teamId/audit",
    {
      schema: {
        params: TeamParams,
        // ! Leave this key out and query validation is SKIPPED -- one
        // ! FSTWRN001 line in the log, and ?limit=1000000 answers 200.
        querystring: AuditQuery,
        // ! No 400 declared, for the same reason as the task list: ErrorReply
        // ! would make the serializer drop Fastify's own `message`.
        response: { 200: AuditPage, 403: ErrorReply },
      },
      preHandler: requirePermission("audit:read"),
    },
    async (request) =>
      listAudit((request.params as TeamParamsInput).teamId, request.query as AuditQueryInput),
  );
}
