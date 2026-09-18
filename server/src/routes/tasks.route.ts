import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  CreateTask,
  ErrorReply,
  TaskPage,
  TaskParams,
  TaskPublic,
  TaskQuery,
  UpdateTask,
  type CreateTaskInput,
  type TaskParamsInput,
  type TaskQueryInput,
  type UpdateTaskInput,
} from "../schemas/task.schema.ts";
import { TeamParams, type TeamParamsInput } from "../schemas/team.schema.ts";
import { createTask, deleteTask, listTasks, updateTask } from "../store/task.store.ts";
import { requireAuth } from "../auth/require-auth.ts";
import { requirePermission } from "../auth/require-permission.ts";

// * Every URL starts /teams/:teamId/ because a permission is scoped to a team.
// * No team named = no role to look up = no answer. The URL carries the scope.
export default async function tasksRoutes(app: FastifyInstance) {
  // ! Gate one, every route below it. Sets request.userId. 401 if unknown.
  app.addHook("onRequest", requireAuth);

  // * Gate two is per route, because each route needs a different action.
  // * task:create needs no target, so no loader -- same as team:delete.
  app.post(
    "/teams/:teamId/tasks",
    {
      schema: {
        params: TeamParams,
        body: CreateTask,
        response: { 201: TaskPublic, 403: ErrorReply },
      },
      preHandler: requirePermission("task:create"),
    },
    async (request, reply) => {
      const { teamId } = request.params as TeamParamsInput;
      const body = request.body as CreateTaskInput;
      // ? ownerId is a record of who typed it, not a permission any more
      const task = await createTask(body, teamId, request.userId!);
      return reply.code(201).send(task); // ? 201 = "I made a new thing"
    },
  );

  // * A VIEWER holds task:read, so this is the one task route they get.
  app.get(
    "/teams/:teamId/tasks",
    {
      schema: {
        params: TeamParams,
        querystring: TaskQuery, // ? ?sort=title&dir=desc -- and nothing else
        // ! No 400 here on purpose. A 400 is Fastify's own reply, shaped
        // ! { statusCode, error, message }; declaring ErrorReply for it makes
        // ! the serializer drop `message`, so "sort: Invalid option" becomes
        // ! a bare "Bad Request". The message describes the CALLER's input,
        // ! not our internals, so it is safe to send and useless to withhold.
        response: { 200: TaskPage, 403: ErrorReply },
      },
      preHandler: requirePermission("task:read"),
    },
    async (request) =>
      listTasks((request.params as TeamParamsInput).teamId, request.query as TaskQueryInput),
  );

  // * edit one task
  app.patch(
    "/teams/:teamId/tasks/:id",
    {
      schema: {
        params: TaskParams, // ? both ids
        body: UpdateTask, // ? the fields to change
        response: { 200: TaskPublic, 403: ErrorReply, 404: ErrorReply },
      },
      preHandler: requirePermission("task:update"),
    },
    async (request, reply) => {
      const { teamId, id } = request.params as TaskParamsInput;
      const task = await updateTask(id, teamId, request.body as UpdateTaskInput);
      // ! Another team's task is "not found". The 403 was already decided above.
      if (!task) return reply.code(404).send({ error: "not found" });
      return task;
    },
  );

  // * remove one task. 204 = "done, nothing to send back".
  app.delete(
    "/teams/:teamId/tasks/:id",
    {
      schema: {
        params: TaskParams,
        response: { 204: z.null(), 403: ErrorReply, 404: ErrorReply },
      },
      preHandler: requirePermission("task:delete"),
    },
    async (request, reply) => {
      const { teamId, id } = request.params as TaskParamsInput;
      const task = await deleteTask(id, teamId);
      if (!task) return reply.code(404).send({ error: "not found" });
      request.auditTarget = {
        type: "task",
        id: task.id,
        snapshot: {
          title: task.title,
          done: task.done,
          teamId: task.teamId,
        },
      };
      return reply.code(204).send();
    },
  );
}
