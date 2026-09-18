import { prisma } from "../src/db.ts";
import { hashPassword } from "../src/auth/password.ts";

// Every seeded user gets this password, so you can log in as them.
const SEED_PASSWORD = "correct horse battery";

// Tasks hang off a User row now, so make the users first.
const tasks: Record<string, string[]> = {
  "user1@example.com": ["Read the Fastify docs", "Add zod validation", "Write the tasks routes"],
  "user2@example.com": ["Learn Prisma migrations", "Buy milk"],
  // * Owns the 500 bulk tasks below. Goes through the loop so it gets a membership too.
  "jay@example.com": [],
};

// Lesson 10: a task needs a team as well as an owner, so seed one team and
// put everybody in it. First user in wins OWNER; the rest are MEMBER.
const team = await prisma.team.upsert({
  where: { id: 1 },
  update: {},
  create: { name: "Seed Team" },
});

let first = true;
for (const [email, titles] of Object.entries(tasks)) {
  // upsert: run the seed twice, still one user each.
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, passwordHash: await hashPassword(SEED_PASSWORD) },
  });
  await prisma.membership.upsert({
    where: { teamId_userId: { teamId: team.id, userId: user.id } },
    update: {},
    create: {
      teamId: team.id,
      userId: user.id,
      role: first ? "OWNER" : "MEMBER",
    },
  });
  first = false;
  const { count } = await prisma.task.createMany({
    data: titles.map((title) => ({ title, ownerId: user.id, teamId: team.id })),
  });
  console.log(`seeded ${count} tasks for ${email} in team ${team.id}`);
}

// Bulk filler data, so lists/pagination have something to chew on.
const bulkOwner = await prisma.user.findUniqueOrThrow({
  where: { email: "jay@example.com" },
});
const { count: bulkCount } = await prisma.task.createMany({
  data: Array.from({ length: 500 }, (_, i) => ({
    title: `Fake task ${i + 1}`,
    done: Math.random() < 0.3,
    ownerId: bulkOwner.id,
    teamId: team.id,
  })),
});
console.log(`seeded ${bulkCount} fake tasks`);
