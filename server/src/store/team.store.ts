import { prisma } from "../db.ts";
import type { Role } from "../auth/can.ts";

// * Nested create = one transaction: both rows land or neither. A team with no
// * owner is a team nobody can delete or invite into.
export function createTeam(name: string, userId: number) {
  return prisma.team.create({
    data: { name, members: { create: { userId, role: "OWNER" } } },
  });
}

// ? The role this person holds in this team, or undefined for "not a member".
// ? undefined is not an error here -- can() turns it into a plain no.
export async function getRole(teamId: number, userId: number): Promise<Role | undefined> {
  const row = await prisma.membership.findUnique({
    where: { teamId_userId: { teamId, userId } },
    select: { role: true },
  });
  return row?.role;
}

// ? Every team this person is in, with the role they hold there.
// ! There is no "all teams" query to forget a where clause on: the membership
// ! table IS the scope, so the join is the authorisation.
export function listMemberships(userId: number) {
  return prisma.membership.findMany({
    where: { userId },
    select: { role: true, team: { select: { id: true, name: true } } },
    orderBy: { teamId: "asc" },
  });
}

// ? undefined when they are already in the team, or there is no such user.
export async function addMember(teamId: number, userId: number, role: Role) {
  try {
    return await prisma.membership.create({ data: { teamId, userId, role } });
  } catch (e) {
    // ? P2002 = already a member (the composite primary key refused).
    // ? P2003 = no user with that id (the foreign key refused).
    const code = (e as { code?: string }).code;
    if (code === "P2002" || code === "P2003") return undefined;
    throw e;
  }
}

// ? true when a membership was removed, false when there was none.
export async function removeMember(teamId: number, userId: number): Promise<boolean> {
  const { count } = await prisma.membership.deleteMany({ where: { teamId, userId } });
  return count > 0;
}

// * Leaving is its own function, not removeMember with a different argument,
// * because it has a rule removeMember does not: the last OWNER may not go. A
// * team with no owner cannot be deleted, cannot invite and cannot be handed
// * to anybody -- it is stuck for good.
export async function leaveTeam(
  teamId: number,
  userId: number,
): Promise<"gone" | "missing" | "last-owner"> {
  return prisma.$transaction(async (tx) => {
    // ! Lock the team row FIRST, before reading anything about it.
    // !
    // ! A transaction alone does NOT fix the race. Postgres runs at READ
    // ! COMMITTED by default, so two owners leaving at the same instant would
    // ! BOTH count two owners, BOTH delete a different row, and both commit.
    // ! Atomicity is not isolation. FOR UPDATE makes the second leave wait for
    // ! the first, so it counts one and is refused. A tagged template, so
    // ! teamId travels as a parameter -- lesson 20's one mechanism.
    await tx.$queryRaw`SELECT id FROM "Team" WHERE id = ${teamId} FOR UPDATE`;

    const me = await tx.membership.findUnique({
      where: { teamId_userId: { teamId, userId } },
      select: { role: true },
    });
    // ? The gate already answered 403 for strangers, so this is the narrow
    // ? case of a membership deleted since the gate looked.
    if (!me) return "missing";

    if (me.role === "OWNER") {
      const owners = await tx.membership.count({ where: { teamId, role: "OWNER" } });
      // ! < 2, not === 1. Same answer today; survives the day a bug leaves a
      // ! team with zero owners, where === 1 would happily delete nothing.
      if (owners < 2) return "last-owner";
    }

    await tx.membership.delete({ where: { teamId_userId: { teamId, userId } } });
    return "gone";
  });
}

// ? Memberships cascade away with the team, so this is one statement.
export async function deleteTeam(id: number): Promise<boolean> {
  const { count } = await prisma.team.deleteMany({ where: { id } });
  return count > 0;
}
