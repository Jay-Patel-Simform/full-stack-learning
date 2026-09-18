import type { FastifyReply, FastifyRequest } from "fastify";
import { can, type Action, type Resource, type Role } from "./can.ts";
import { getRole } from "../store/team.store.ts";

// * The second gate. requireAuth said *who*; this says *may*.
declare module "fastify" {
  interface FastifyRequest {
    role?: Role | undefined;
  }
}

// ! Fetches the thing being acted on, inside the gate. A check in the handler
// ! runs after the gate already said yes, so it is a gate you can forget.
export type Load = (request: FastifyRequest) => Promise<Resource>;

// ? The person named in the URL. No membership => no targetRole => the rank
// ? rule stays out and the handler answers its own 404.
export const targetMember: Load = async (request) => {
  const { teamId, userId } = request.params as { teamId: number; userId: number };
  return { targetRole: await getRole(teamId, userId) };
};

// ? The role named in the body. The target does not exist yet, but the rank
// ? rule still says you cannot hand out a role you do not outrank.
export const grantedRole: Load = async (request) => {
  const { role } = request.body as { role: Role };
  return { targetRole: role };
};

// * Action in, hook out. The route names the job, never the role that holds it.
// * preHandler, not onRequest: it runs after validation, so :teamId is already
// * a number and the body is parsed for the loader.
export function requirePermission(action: Action, load?: Load) {
  return async function gate(request: FastifyRequest, reply: FastifyReply) {
    // ? Scoped: the role is per team, so the answer depends on which team.
    const { teamId } = request.params as { teamId: number };
    const role = await getRole(teamId, request.userId!);

    // ? Load the resource before deciding. Actions with no target skip this.
    const resource = load ? await load(request) : undefined;

    // ! 403 = "I know you, and no". Same reply for "wrong role" and "not a
    // ! member", so an outsider cannot tell a real team from a fake one.
    if (!can(role, action, resource)) return reply.code(403).send({ error: "forbidden" });

    // ? The handler may want it. It never has to look it up again.
    request.role = role;
  };
}
