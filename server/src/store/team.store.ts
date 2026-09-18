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

// ? Memberships cascade away with the team, so this is one statement.
export async function deleteTeam(id: number): Promise<boolean> {
  const { count } = await prisma.team.deleteMany({ where: { id } });
  return count > 0;
}
