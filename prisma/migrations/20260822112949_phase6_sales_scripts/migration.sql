-- CreateEnum
CREATE TYPE "ScriptChannel" AS ENUM ('CALL', 'SMS', 'EMAIL');

-- CreateEnum
CREATE TYPE "ScriptSource" AS ENUM ('GENERATED', 'MANUAL', 'TEMPLATE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'SCRIPT_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'SCRIPT_UPDATED';

-- CreateTable
CREATE TABLE "SalesScript" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientAccountId" TEXT NOT NULL,
    "contactId" TEXT,
    "leadAnalysisId" TEXT,
    "userId" TEXT,
    "channel" "ScriptChannel" NOT NULL,
    "source" "ScriptSource" NOT NULL,
    "templateKey" TEXT,
    "title" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "contextSnapshot" JSONB,
    "isManualOverride" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesScript_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SalesScript_organizationId_clientAccountId_createdAt_idx" ON "SalesScript"("organizationId", "clientAccountId", "createdAt");

-- CreateIndex
CREATE INDEX "SalesScript_contactId_createdAt_idx" ON "SalesScript"("contactId", "createdAt");

-- CreateIndex
CREATE INDEX "SalesScript_leadAnalysisId_idx" ON "SalesScript"("leadAnalysisId");

-- AddForeignKey
ALTER TABLE "SalesScript" ADD CONSTRAINT "SalesScript_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesScript" ADD CONSTRAINT "SalesScript_clientAccountId_fkey" FOREIGN KEY ("clientAccountId") REFERENCES "ClientAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesScript" ADD CONSTRAINT "SalesScript_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesScript" ADD CONSTRAINT "SalesScript_leadAnalysisId_fkey" FOREIGN KEY ("leadAnalysisId") REFERENCES "LeadAnalysis"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesScript" ADD CONSTRAINT "SalesScript_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
