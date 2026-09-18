import { z } from "zod";
import { TeamParams } from "./team.schema.ts";

// ! The wall. Anything not matching this never reaches the handler.
export const CreateTask = z.object({
  // ! .trim() BEFORE .min(1), because a zod chain runs left to right. The
  // ! other order checks the untrimmed string and then trims it to "" -- a
  // ! 200 for a task with no title. Measured: .min(1).trim() on "   " gives "".
  title: z.string().trim().min(1).max(200),
  done: z.boolean().default(false), // ? if the caller sends no "done", use false
});

// ? params are input too. coerce turns the URL text "5" into the number 5.
// ? Both ids, because the URL now carries both: /teams/7/tasks/5.
export const TaskParams = TeamParams.extend({
  id: z.coerce.number().int().positive(),
});

// ? no .default() here, or partial() would send done:false on a title-only patch
// ? partial() makes every field optional, so a patch can send just one field.
// ! ...but not NO field. An empty patch used to answer 200 and change nothing,
// ! which reads exactly like success. Say no to it here, once.
export const UpdateTask = z
  .object({ title: CreateTask.shape.title, done: z.boolean() })
  .partial()
  .refine((patch) => Object.keys(patch).length > 0, {
    message: "send at least one field to change",
  });

// ! sort names a COLUMN, not a value. A value can travel as a parameter; a
// ! column name never can -- so there is no "escape it" move here, only a
// ! fixed list. This enum IS the allowlist. Anything else is a 400 at the door.
export const TaskQuery = z.object({
  sort: z.enum(["id", "title", "createdAt"]).default("id"),
  dir: z.enum(["asc", "desc"]).default("asc"),
  // ! A limit with no ceiling is not a limit. ?limit=1000000 is a caller
  // ! asking the server to load the whole table into memory, politely.
  limit: z.coerce.number().int().min(1).max(100).default(20),
  // ? Where the last page stopped. Absent means "start at the beginning".
  cursor: z.coerce.number().int().positive().optional(),
  // ! NOT z.coerce.boolean(). That is JavaScript's Boolean(), so the string
  // ! "false" is a non-empty string and comes out TRUE. Measured. stringbool
  // ! knows the words: true/1/yes/on, false/0/no/off, anything else is a 400.
  // ? Absent is a third answer -- "do not filter on done at all".
  done: z.stringbool().optional(),
  // ? A search word. Unlike `sort`, this is a VALUE, so it can travel beside
  // ? the query as a parameter and there is nothing to allowlist. Same trim
  // ? rule as the title: ?q=%20%20 is not a search.
  q: z.string().trim().min(1).max(100).optional(),
});

// ! What the outside world is allowed to see. Note: no owner email.
export const TaskPublic = z.object({
  id: z.number(),
  title: z.string(),
  done: z.boolean(),
});

export const ErrorReply = z.object({ error: z.string() });

export const TaskPage = z.object({
  items: z.array(TaskPublic),
  // ? null = this was the last page. Do not ask again
  nextCursor: z.number().nullable(),
});

export type CreateTaskInput = z.infer<typeof CreateTask>;
export type UpdateTaskInput = z.infer<typeof UpdateTask>;
export type TaskParamsInput = z.infer<typeof TaskParams>;
export type TaskQueryInput = z.infer<typeof TaskQuery>;

// * The task we keep inside: the public fields plus the private owner columns.
export type Task = z.infer<typeof TaskPublic> & {
  createdAt: Date;
  ownerId: number;
  teamId: number;
  owner?: { id: number; email: string; createdAt: Date };
};
