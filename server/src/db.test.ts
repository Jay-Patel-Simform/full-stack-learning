import assert from "node:assert/strict";
import { after, test } from "node:test";

import pg from "pg";

import { config } from "./config.ts";

// * This file does NOT use `prisma` from db.ts. Tests run as the OWNER, so
// * the shared client would prove nothing. Here we open one connection as the
// * restricted login and ask the database itself what it refuses.
const client = new pg.Client({ connectionString: config.APP_DATABASE_URL });
await client.connect();
after(() => client.end());

// ? 42501 is the Postgres SQLSTATE for "insufficient privilege". Asserting the
// ? code, not the message, because the message text is not a contract.
const refused = async (sql: string) => {
  const err = await client.query(sql).then(
    () => undefined,
    (e: { code?: string }) => e,
  );
  assert.ok(err, `expected ${sql} to be refused`);
  return err.code;
};

test("the app role may write an audit row", async () => {
  await client.query("BEGIN");
  const { rows } = await client.query(
    `insert into "AuditLog" (method, route, status, ip)
     values ('GET', '/probe', 200, '127.0.0.1') returning id`,
  );
  assert.ok(rows[0].id > 0);
  // ! Roll back. A test must not leave a row in the log it is protecting.
  await client.query("ROLLBACK");
});

test("the app role may read the audit log", async () => {
  const { rows } = await client.query(`select count(*)::int as n from "AuditLog"`);
  assert.ok(rows[0].n >= 0);
});

test("the app role may not delete, update or empty the audit log", async () => {
  assert.equal(await refused(`delete from "AuditLog" where id = -1`), "42501");
  assert.equal(await refused(`update "AuditLog" set status = 0 where id = -1`), "42501");
  assert.equal(await refused(`truncate "AuditLog"`), "42501");
});

test("the app role may not create a table", async () => {
  assert.equal(await refused(`create table zzz_should_not_exist (i int)`), "42501");
});
