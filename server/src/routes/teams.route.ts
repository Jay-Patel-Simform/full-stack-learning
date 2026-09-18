import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  AddMember,
  CreateTeam,
  MemberParams,
  MembershipPublic,
  TeamList,
  TeamParams,
  TeamPublic,
  type AddMemberInput,
  type CreateTeamInput,
  type MemberParamsInput,
  type TeamParamsInput,
} from "../schemas/team.schema.ts";
import { ErrorReply } from "../schemas/task.schema.ts";
import {
  addMember,
  createTeam,
  deleteTeam,
  listMemberships,
  removeMember,
} from "../store/team.store.ts";
import { requireAuth } from "../auth/require-auth.ts";
import { grantedRole, requirePermission, targetMember } from "../auth/require-permission.ts";
import { allowedActions } from "../auth/can.ts";

export default async function teamsRoutes(app: FastifyInstance) {
  // ! Gate one for every route below: who are you? 401 if unknown.
  app.addHook("onRequest", requireAuth);

  // * No gate: there is no team yet, so no role to hold. Anyone logged in may start one.
  app.post(
    "/teams",
    { schema: { body: CreateTeam, response: { 201: TeamPublic } } },
    async (request, reply) => {
      const { name } = request.body as CreateTeamInput;
      return reply.code(201).send(await createTeam(name, request.userId!));
    },
  );

  // * No requirePermission here, and that is not an omission. Every other
  // * route names a team in the URL, so the gate can ask "what is your role
  // * THERE". This route asks the opposite question, and the where clause in
  // * listMemberships is the whole answer: rows you are not in do not come
  // * back, so there is nothing to refuse.
  app.get("/teams", { schema: { response: { 200: TeamList } } }, async (request) => {
    const rows = await listMemberships(request.userId!);
    // ! `can` is sent so the UI can hide what it should not offer. It is a
    // ! hint, not a gate -- the 403 still comes from requirePermission.
    return rows.map(({ role, team }) => ({ ...team, role, can: allowedActions(role) }));
  });

  // * Gate two, one line per route. The route names the action, never the role.
  app.post(
    "/teams/:teamId/members",
    {
      schema: {
        params: TeamParams,
        body: AddMember,
        response: { 201: MembershipPublic, 403: ErrorReply, 409: ErrorReply },
      },
      preHandler: requirePermission("member:invite", grantedRole),
    },
    async (request, reply) => {
      const { teamId } = request.params as TeamParamsInput;
      const { userId, role } = request.body as AddMemberInput;
      const membership = await addMember(teamId, userId, role);
      if (!membership) return reply.code(409).send({ error: "already a member" });
      return reply.code(201).send(membership);
    },
  );

  // ! targetMember loads the victim's role, so can() compares ranks. An ADMIN
  // ! removing the OWNER is a 403, decided in the gate.
  app.delete(
    "/teams/:teamId/members/:userId",
    {
      schema: {
        params: MemberParams,
        response: { 204: z.null(), 403: ErrorReply, 404: ErrorReply },
      },
      preHandler: requirePermission("member:remove", targetMember),
    },
    async (request, reply) => {
      const { teamId, userId } = request.params as MemberParamsInput;
      if (!(await removeMember(teamId, userId)))
        return reply.code(404).send({ error: "not found" });
      // ! Say 204 out loud. A handler that just returns is a 200 with no body.
      return reply.code(204).send();
    },
  );

  app.delete(
    "/teams/:teamId",
    {
      schema: {
        params: TeamParams,
        response: { 204: z.null(), 403: ErrorReply, 404: ErrorReply },
      },
      preHandler: requirePermission("team:delete"),
    },
    async (request, reply) => {
      const { teamId } = request.params as TeamParamsInput;
      if (!(await deleteTeam(teamId))) return reply.code(404).send({ error: "not found" });
      return reply.code(204).send();
    },
  );
}
