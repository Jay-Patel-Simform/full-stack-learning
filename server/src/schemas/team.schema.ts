import { z } from "zod";
import { ACTIONS, ROLES } from "../auth/can.ts";

export const CreateTeam = z.object({ name: z.string().min(1).max(100) });

// ? The URL text "5" becomes the number 5, before any handler or gate sees it.
export const TeamParams = z.object({
  teamId: z.coerce.number().int().positive(),
});

export const MemberParams = TeamParams.extend({
  userId: z.coerce.number().int().positive(),
});

// * z.enum off ROLES, so { role: "GOD" } is a 400 at the door, not a 500 later.
export const AddMember = z.object({
  userId: z.number().int().positive(),
  role: z.enum(ROLES).default("MEMBER"),
});

export const TeamPublic = z.object({ id: z.number(), name: z.string() });

// * One team, as the front end needs it: which team, what you hold there, and
// * what that role may offer. `can` comes from the server's own table, so the
// * UI has no permission table of its own to let drift.
export const TeamMembership = TeamPublic.extend({
  role: z.enum(ROLES),
  can: z.array(z.enum(ACTIONS)),
});

export const TeamList = z.array(TeamMembership);

export const MembershipPublic = z.object({
  teamId: z.number(),
  userId: z.number(),
  role: z.enum(ROLES),
});

export type CreateTeamInput = z.infer<typeof CreateTeam>;
export type TeamParamsInput = z.infer<typeof TeamParams>;
export type MemberParamsInput = z.infer<typeof MemberParams>;
export type AddMemberInput = z.infer<typeof AddMember>;
