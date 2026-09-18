import pg from "pg";

import { config } from "../config.ts";

// * The app cannot do this. Since lesson 42 the server connects as `tasks_app`,
// * and `tasks_app` has no DELETE on "AuditLog" -- that is the whole point of
// * the second role. So the prune job opens its own connection, as the OWNER,
// * and it runs from cron, never from a request.
// !
// ! Read that twice before you copy it. The rule is not "use the owner when it
// ! is convenient". The rule is: the powerful login is allowed here because
// ! nothing on the internet can reach this code path. A stranger can send bytes
// ! to a route. Nobody can send bytes to a cron line.

/**
 * Delete audit rows older than `days`.
 *
 * Returns the number of rows deleted, so the caller can log a real number
 * instead of "done".
 */
export async function pruneAuditLog(days = config.AUDIT_RETENTION_DAYS): Promise<number> {
  // ! A cutoff computed from a missing value is how you delete everything.
  // ! Refuse in code, not just in the config schema -- this function is
  // ! exported and the schema only guards the boot path.
  if (!Number.isInteger(days) || days < 1) {
    throw new Error(`pruneAuditLog: days must be a positive integer, got ${days}`);
  }

  // ? Own connection, own login. Not the shared `prisma` from src/db.ts:
  // ? that one is the restricted role outside tests, and would be refused.
  return withOwnerClient(async (client) => {
    // ? The cutoff is computed by Postgres, not by Node. One clock decides
    // ? what "old" means, and it is the same clock that wrote `at`.
    // ponytail: one statement, no batching. At 6.7k rows this is milliseconds.
    // ponytail: if the table ever reaches millions, add `LIMIT` + a loop so the
    // ponytail: delete does not hold one long lock.
    const result = await client.query(
      `delete from "AuditLog" where at < now() - ($1 || ' days')::interval`,
      [days],
    );
    return result.rowCount ?? 0;
  });
}

/**
 * The other half of the job: reclaim the space, then correct the notes.
 *
 * Run after `pruneAuditLog`, never instead of it.
 */
export async function compactAuditLog(): Promise<void> {
  await withOwnerClient(async (client) => {
    // ? A scattered delete only returns an index page when the whole page
    // ? empties, so the indexes stay fat until they are rebuilt (lesson 44).
    // ponytail: plain REINDEX takes ACCESS EXCLUSIVE for its duration. At this
    // ponytail: size that is milliseconds at an hour nobody reads. If the table
    // ponytail: ever gets big, switch to REINDEX TABLE CONCURRENTLY.
    await client.query(`reindex table "AuditLog"`);

    // ? The delete just changed the table by most of it, so the planner's
    // ? stored guess now describes a table that no longer exists (lesson 48).
    // ? Milliseconds, no write lock, and the next query comes long before the
    // ? next autovacuum.
    await client.query(`analyze "AuditLog"`);
  });
}

// ? Both statements need the OWNER login, same as the delete. One place that
// ? opens it, one place that closes it.
async function withOwnerClient<T>(fn: (client: pg.Client) => Promise<T>): Promise<T> {
  const client = new pg.Client({ connectionString: config.DATABASE_URL });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}
