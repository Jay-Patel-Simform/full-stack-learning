import type { Audit, AuditQueryInput } from "../schemas/audit.schema.ts";
import { prisma } from "../db.ts";

// ! Newest-first, unlike listTasks: the caller picks no column here, so there
// ! is no enum to allowlist and no `dir`. `at` is fixed, `id` is the tiebreak
// ! -- two rows can share a timestamp, and a cursor into a tied order skips rows.
export async function listAudit(
  teamId: number,
  { status, limit, cursor }: AuditQueryInput,
): Promise<{ items: Audit[]; nextCursor: number | null }> {
  const rows = await prisma.auditLog.findMany({
    // ! Same `=== undefined` test as listTasks, same reason: absent is a third
    // ! answer, and exactOptionalPropertyTypes refuses `status: undefined`.
    where: { teamId, ...(status === undefined ? {} : { status }) },
    orderBy: [{ at: "desc" }, { id: "desc" }],
    // ? One row more than asked. If it comes back, there is a next page.
    take: limit + 1,
    // ? skip:1 steps over the cursor row itself, which we already sent.
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const items = rows.slice(0, limit);
  return { items, nextCursor: rows.length > limit ? items.at(-1)!.id : null };
}
