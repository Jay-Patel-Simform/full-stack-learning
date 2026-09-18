import { prisma } from "../db.ts";

export function createProject(teamId: number, name: string) {
  return prisma.project.create({ data: { teamId, name } });
}

// ! teamId in the where on purpose: the gate only checked the team in the URL,
// ! so without it an admin of team A could delete team B's project by id.
export async function deleteProject(
  teamId: number,
  id: number,
): Promise<boolean> {
  const { count } = await prisma.project.deleteMany({ where: { id, teamId } });
  return count > 0;
}

export function listProjects(teamId: number) {
  return prisma.project.findMany({
    where: { teamId },
    orderBy: { id: "asc" },
    // Name the columns. TaskPublic taught this in lesson 30 --
    // a field the serializer drops is a field you should not select.
    select: { id: true, name: true, teamId: true },
  });
}
