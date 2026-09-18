-- CreateTable
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER,
    "teamId" INTEGER,
    "method" VARCHAR(10) NOT NULL,
    "route" VARCHAR(200) NOT NULL,
    "status" INTEGER NOT NULL,
    "ip" VARCHAR(45) NOT NULL,
    "params" JSONB,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditLog_userId_at_idx" ON "AuditLog"("userId", "at");

-- CreateIndex
CREATE INDEX "AuditLog_teamId_at_idx" ON "AuditLog"("teamId", "at");
