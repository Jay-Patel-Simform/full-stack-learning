import type {
  CreateTaskInput,
  Task,
  TaskQueryInput,
  UpdateTaskInput,
} from "../schemas/task.schema.ts";
import { prisma } from "../db.ts";

// * No ownerId filter: that was a permission rule hiding in a query. The gate
// * decides now. teamId stays, but it only narrows the lookup -- scoping, not
// * deciding -- so another team's task is simply not found.

// ! The one query here where the CALLER picks a column name. `sort` is a KEY
// ! in this object, not a value -- it cannot be parameterised, so it is safe
// ! only because TaskQuery already narrowed it to one of three strings.
// ! Widen that to z.string() and this line hands Postgres whatever was typed.
export async function listTasks(
  teamId: number,
  { sort, dir, limit, cursor, done, q }: TaskQueryInput,
): Promise<{ items: Task[]; nextCursor: number | null }> {
  const rows = await prisma.task.findMany({
    // ! `done` has THREE answers: true, false, and absent. Absent is not a
    // ! value you can put in the object -- exactOptionalPropertyTypes in
    // ! tsconfig refuses `done: undefined`, so the spread is required, not
    // ! decoration. And it must test `=== undefined`: `...(done && {done})`
    // ! silently drops `done: false`, the filter people use most.
    where: {
      teamId,
      ...(done === undefined ? {} : { done }),
      // ! Postgres LIKE is case sensitive. Measured: `contains: "buy"` found
      // ! 2 of the 4 rows a person would call a match. `mode: "insensitive"`
      // ! is ILIKE, and it is the difference between a search box that works
      // ! and one that only finds lower-case titles.
      ...(q === undefined ? {} : { title: { contains: q, mode: "insensitive" as const } }),
    },
    // ! Two keys, not one. `title` is not unique, so on its own it leaves ties
    // ! in an order Postgres never promised -- and a cursor into an unstable
    // ! order skips rows. `id` is the tiebreak that makes every row unique.
    orderBy: [{ [sort]: dir }, { id: dir }],
    // ? One row more than asked. If it comes back, there is a next page.
    take: limit + 1,
    // ? skip:1 steps over the cursor row itself, which we already sent.
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const items = rows.slice(0, limit);
  return { items, nextCursor: rows.length > limit ? items.at(-1)!.id : null };
}

export function createTask(input: CreateTaskInput, teamId: number, ownerId: number): Promise<Task> {
  return prisma.task.create({
    data: { ...input, teamId, ownerId },
    include: { owner: true },
  });
}

// ? Returns the changed task, or undefined when that id is not in this team.
export async function updateTask(
  id: number,
  teamId: number,
  patch: UpdateTaskInput,
): Promise<Task | undefined> {
  // ? updateMany does not throw on a missing id. It just reports 0 rows changed.
  // ! This cast is a promise, and app.ts is what keeps it. Bodies are parsed
  // ! strictly, so `patch` cannot hold a key we never declared. Loosen that
  // ! and this line hands Prisma whatever the caller typed -- ownerId included.
  const data = patch as { title?: string; done?: boolean };
  const { count } = await prisma.task.updateMany({
    where: { id, teamId },
    data,
  });
  if (count === 0) return undefined;
  return (await prisma.task.findUnique({ where: { id } })) ?? undefined;
}

// ? true when a task was removed, false when that id is not in this team.
export async function deleteTask(id: number, teamId: number) {
  // ? deleteMany still returns a count, so a missing id is not a throw --
  // ? but a count cannot be snapshotted. Fetch, then delete, in one transaction.

  const [task] = await prisma.$transaction([
    prisma.task.findFirst({ where: { id, teamId } }),
    prisma.task.deleteMany({ where: { id, teamId } }),
  ]);

  return task ?? undefined; // ! undefined still means 404, as before
}
