import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  CreateProject,
  ProjectList,
  ProjectParams,
  ProjectPublic,
  type CreateProjectInput,
  type ProjectParamsInput,
} from "../schemas/project.schema.ts";
import { TeamParams, type TeamParamsInput } from "../schemas/team.schema.ts";
import { ErrorReply } from "../schemas/task.schema.ts";
import {
  createProject,
  deleteProject,
  listProjects,
} from "../store/project.store.ts";
import { requireAuth } from "../auth/require-auth.ts";
import { requirePermission } from "../auth/require-permission.ts";

// * The routes that finally call project:create and project:delete.
export default async function projectsRoutes(app: FastifyInstance) {
  app.addHook("onRequest", requireAuth);

  // ? Nested under /teams/:teamId, which is what the gate reads to find your role.
  app.post(
    "/teams/:teamId/projects",
    {
      schema: {
        params: TeamParams,
        body: CreateProject,
        response: { 201: ProjectPublic, 403: ErrorReply },
      },
      preHandler: requirePermission("project:create"),
    },
    async (request, reply) => {
      const { teamId } = request.params as TeamParamsInput;
      const { name } = request.body as CreateProjectInput;
      return reply.code(201).send(await createProject(teamId, name));
    },
  );

  // * No target: a project holds no rank, so the table answer is the whole rule.
  app.delete(
    "/teams/:teamId/projects/:projectId",
    {
      schema: {
        params: ProjectParams,
        response: { 204: z.null(), 403: ErrorReply, 404: ErrorReply },
      },
      preHandler: requirePermission("project:delete"),
    },
    async (request, reply) => {
      const { teamId, projectId } = request.params as ProjectParamsInput;
      if (!(await deleteProject(teamId, projectId)))
        return reply.code(404).send({ error: "not found" });
      return reply.code(204).send();
    },
  );

  app.get(
    "/teams/:teamId/projects",
    {
      schema: {
        params: TeamParams,
        response: { 200: ProjectList, 403: ErrorReply },
      },
      preHandler: requirePermission("project:read"),
    },
    async (request) => {
      const { teamId } = request.params as TeamParamsInput;
      return listProjects(teamId);
    },
  );
}
