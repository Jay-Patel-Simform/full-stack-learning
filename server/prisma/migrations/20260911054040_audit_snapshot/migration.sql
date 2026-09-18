-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "actorEmail" VARCHAR(255),
ADD COLUMN     "targetId" INTEGER,
ADD COLUMN     "targetSnapshot" JSONB,
ADD COLUMN     "targetType" VARCHAR(30);
