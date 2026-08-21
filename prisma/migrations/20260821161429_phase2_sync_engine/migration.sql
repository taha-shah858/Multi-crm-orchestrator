-- CreateEnum
CREATE TYPE "SyncRunStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "SyncTrigger" AS ENUM ('MANUAL');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'CONTACT_SYNC_STARTED';
ALTER TYPE "AuditAction" ADD VALUE 'CONTACT_SYNC_COMPLETED';
ALTER TYPE "AuditAction" ADD VALUE 'CONTACT_SYNC_FAILED';

-- AlterEnum
ALTER TYPE "CrmProvider" ADD VALUE 'MOCK';

-- CreateTable
CREATE TABLE "SyncRun" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientAccountId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "userId" TEXT,
    "provider" "CrmProvider" NOT NULL,
    "trigger" "SyncTrigger" NOT NULL DEFAULT 'MANUAL',
    "status" "SyncRunStatus" NOT NULL DEFAULT 'RUNNING',
    "recordsRead" INTEGER NOT NULL DEFAULT 0,
    "recordsCreated" INTEGER NOT NULL DEFAULT 0,
    "recordsUpdated" INTEGER NOT NULL DEFAULT 0,
    "recordsFailed" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "SyncRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SyncRun_organizationId_clientAccountId_startedAt_idx" ON "SyncRun"("organizationId", "clientAccountId", "startedAt");

-- CreateIndex
CREATE INDEX "SyncRun_connectionId_status_idx" ON "SyncRun"("connectionId", "status");

-- AddForeignKey
ALTER TABLE "SyncRun" ADD CONSTRAINT "SyncRun_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncRun" ADD CONSTRAINT "SyncRun_clientAccountId_fkey" FOREIGN KEY ("clientAccountId") REFERENCES "ClientAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncRun" ADD CONSTRAINT "SyncRun_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "CrmConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncRun" ADD CONSTRAINT "SyncRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
