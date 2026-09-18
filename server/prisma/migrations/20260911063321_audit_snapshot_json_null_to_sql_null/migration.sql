-- One empty, not two. Rows written before the audit.ts fix stored the JSON word
-- null in targetSnapshot instead of leaving the column unset, so `IS NULL`
-- missed them and `IS NOT NULL` counted 218 rows when only 2 held a snapshot.
-- 20260911061318 was meant to do this and shipped empty.
--
-- Both values already meant "no snapshot captured", so this invents no fact.
-- params is not touched: it is NOT NULL DEFAULT '{}' since 20260911061841.
UPDATE "AuditLog" SET "targetSnapshot" = NULL
WHERE "targetSnapshot" = 'null'::jsonb;
