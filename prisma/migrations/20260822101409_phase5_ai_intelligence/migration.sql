-- CreateEnum
CREATE TYPE "LeadAnalysisSource" AS ENUM ('MANUAL_TRANSCRIPT', 'INTERACTION');

-- CreateEnum
CREATE TYPE "LeadAnalysisProvider" AS ENUM ('RULES_ENGINE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'LEAD_ANALYSIS_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'LEAD_ANALYSIS_UPDATED';

-- CreateTable
CREATE TABLE "LeadAnalysis" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientAccountId" TEXT NOT NULL,
    "contactId" TEXT,
    "interactionId" TEXT,
    "userId" TEXT,
    "source" "LeadAnalysisSource" NOT NULL,
    "provider" "LeadAnalysisProvider" NOT NULL DEFAULT 'RULES_ENGINE',
    "transcript" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "budget" TEXT,
    "timeline" TEXT,
    "requirements" TEXT,
    "intent" TEXT,
    "objections" TEXT,
    "leadScore" INTEGER NOT NULL,
    "temperature" TEXT NOT NULL,
    "dealProbability" INTEGER NOT NULL,
    "isManualOverride" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LeadAnalysis_organizationId_clientAccountId_createdAt_idx" ON "LeadAnalysis"("organizationId", "clientAccountId", "createdAt");

-- CreateIndex
CREATE INDEX "LeadAnalysis_contactId_createdAt_idx" ON "LeadAnalysis"("contactId", "createdAt");

-- CreateIndex
CREATE INDEX "LeadAnalysis_interactionId_idx" ON "LeadAnalysis"("interactionId");

-- AddForeignKey
ALTER TABLE "LeadAnalysis" ADD CONSTRAINT "LeadAnalysis_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadAnalysis" ADD CONSTRAINT "LeadAnalysis_clientAccountId_fkey" FOREIGN KEY ("clientAccountId") REFERENCES "ClientAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadAnalysis" ADD CONSTRAINT "LeadAnalysis_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadAnalysis" ADD CONSTRAINT "LeadAnalysis_interactionId_fkey" FOREIGN KEY ("interactionId") REFERENCES "Interaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadAnalysis" ADD CONSTRAINT "LeadAnalysis_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
