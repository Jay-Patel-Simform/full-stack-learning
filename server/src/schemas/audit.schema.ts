import { z } from "zod";

// ! No `sort` here, unlike TaskQuery: the caller picks no column, so there is
// ! no column-name allowlist to get wrong. Order is fixed at newest-first.
export const AuditQuery = z.object({
  // ? A status code is a VALUE, so it travels as a parameter. The range is
  // ? still worth stating -- ?status=99999 is not a question with an answer.
  status: z.coerce.number().int().min(100).max(599).optional(),
  // ! A limit with no ceiling is not a limit. ?limit=1000000 asks the server
  // ! to load the biggest table in the database into memory, politely.
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.coerce.number().int().positive().optional(),
});

export const AuditPublic = z.object({
  id: z.number(),
  at: z.date(),
  userId: z.number().nullable(),
  actorEmail: z.string().nullable(),
  method: z.string(),
  route: z.string(),
  status: z.number(),
  targetType: z.string().nullable(),
  targetId: z.number().nullable(),
});

// ! `ip` is a column on the row and NOT a field here. That omission is the
// ! privacy rule: the serializer drops what the schema does not name.
export const AuditPage = z.object({
  items: z.array(AuditPublic),
  nextCursor: z.number().nullable(),
});

export type AuditQueryInput = z.infer<typeof AuditQuery>;
export type Audit = z.infer<typeof AuditPublic>;
