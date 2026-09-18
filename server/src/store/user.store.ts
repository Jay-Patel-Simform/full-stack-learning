import { prisma } from "../db.ts";

// ? undefined when that email is taken.
export async function createUser(email: string, passwordHash: string) {
  try {
    return await prisma.user.create({ data: { email, passwordHash } });
  } catch (e) {
    // ! P2002 = @unique on email refused. Anything else is a real fault, rethrow.
    if ((e as { code?: string }).code === "P2002") return undefined;
    throw e;
  }
}

export function findUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } });
}

export function findUserById(id: number) {
  return prisma.user.findUnique({ where: { id } });
}
