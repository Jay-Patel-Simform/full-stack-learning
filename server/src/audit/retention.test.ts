import assert from "node:assert/strict";
import { test } from "node:test";

import { prisma } from "../db.ts";
import { compactAuditLog, pruneAuditLog } from "./retention.ts";

// ! Every test here uses a 365-day cutoff and plants its own rows dated ~400
// ! days ago. Your real log starts four days ago, so nothing real is ever in
// ! range. A retention test that could eat real evidence is not a test.
const OLD = new Date(Date.now() - 400 * 24 * 60 * 60 * 1000);

const plant = (at: Date) =>
  prisma.auditLog.create({
    data: {
      at,
      method: "GET",
      route: "/retention-fixture",
      status: 200,
      ip: "127.0.0.1",
    },
  });

test("deletes rows older than the cutoff and keeps the rest", async () => {
  const old = await plant(OLD);
  const fresh = await plant(new Date());

  const deleted = await pruneAuditLog(365);
  assert.ok(deleted >= 1, "expected at least the planted row to go");

  assert.equal(
    await prisma.auditLog.findUnique({ where: { id: old.id } }),
    null,
  );
  assert.ok(await prisma.auditLog.findUnique({ where: { id: fresh.id } }));

  await prisma.auditLog.deleteMany({ where: { id: fresh.id } });
});

test("a second run deletes nothing", async () => {
  assert.equal(await pruneAuditLog(365), 0);
});

test("refuses a cutoff that would mean everything", async () => {
  // ? 0 days is "older than now" -- every row. undefined is worse. Both throw
  // ? before a connection is even opened.
  for (const bad of [0, -1, Number.NaN]) {
    await assert.rejects(() => pruneAuditLog(bad), /positive integer/);
  }
});

test("compact reindexes and analyses, and updates the planner's notes", async () => {
  await compactAuditLog();

  // ? `last_analyze` is the proof it ran: it is NULL or old until ANALYZE
  // ? touches the table, and only a manual ANALYZE sets this column.
  const [row] = await prisma.$queryRaw<{ last_analyze: Date | null }[]>`
    select last_analyze from pg_stat_user_tables where relname = 'AuditLog'`;
  assert.ok(row);
  assert.ok(
    row.last_analyze && Date.now() - row.last_analyze.getTime() < 60_000,
  );
});
