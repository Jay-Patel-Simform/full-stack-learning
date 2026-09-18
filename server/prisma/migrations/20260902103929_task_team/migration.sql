-- Add a required column to a table that already has rows.
-- Postgres will not invent a value for you, so this is three steps, in order:
-- EXPAND (nullable), BACKFILL (fill it), CONTRACT (lock it).
-- The same three steps work on a live server with users on it, one deploy
-- each, and no downtime. Here they just run back to back.

-- 0. There is no team yet, so make the one these old rows belong to.
--    The oldest user owns it; everybody else who wrote a task is a MEMBER,
--    which is the role that holds task:update and task:delete.
INSERT INTO "Team" ("name") VALUES ('Legacy');

INSERT INTO "Membership" ("teamId", "userId", "role")
SELECT (SELECT MAX("id") FROM "Team"),
       t."ownerId",
       CASE WHEN t."ownerId" = (SELECT MIN("ownerId") FROM "Task") THEN 'OWNER'::"Role"
            ELSE 'MEMBER'::"Role" END
FROM (SELECT DISTINCT "ownerId" FROM "Task") t;

-- 1. EXPAND. Nullable, so the existing rows are allowed to be empty for now.
ALTER TABLE "Task" ADD COLUMN "teamId" INTEGER;

-- 2. BACKFILL. Every old row gets the legacy team.
UPDATE "Task" SET "teamId" = (SELECT MAX("id") FROM "Team") WHERE "teamId" IS NULL;

-- 3. CONTRACT. Now that no row is empty, the wall can go up.
ALTER TABLE "Task" ALTER COLUMN "teamId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Task_teamId_idx" ON "Task"("teamId");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
