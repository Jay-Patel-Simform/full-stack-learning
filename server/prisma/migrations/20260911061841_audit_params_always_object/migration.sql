-- One empty, not two. Before this, "no path params" was written as SQL NULL
-- (58 rows) or JSON 'null' (3960 rows) depending on the code path, so every
-- reader had to test for both. Backfill both to {} and forbid null.

-- Backfill: SQL NULL and JSON 'null' both meant "no path params".
UPDATE "AuditLog" SET "params" = '{}'::jsonb
WHERE "params" IS NULL OR "params" = 'null'::jsonb;

-- AlterTable
ALTER TABLE "AuditLog" ALTER COLUMN "params" SET NOT NULL,
ALTER COLUMN "params" SET DEFAULT '{}';
