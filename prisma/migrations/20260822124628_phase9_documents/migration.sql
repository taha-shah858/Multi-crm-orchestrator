-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('PROPOSAL', 'FOLLOW_UP_EMAIL', 'FOLLOW_UP_MESSAGE', 'MANUAL_NOTE', 'FILE_UPLOAD');

-- CreateEnum
CREATE TYPE "DocumentSource" AS ENUM ('GENERATED', 'MANUAL', 'UPLOADED');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('DRAFT', 'FINAL');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'DOCUMENT_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'DOCUMENT_GENERATED';
ALTER TYPE "AuditAction" ADD VALUE 'DOCUMENT_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'DOCUMENT_UPLOADED';

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientAccountId" TEXT NOT NULL,
    "contactId" TEXT,
    "leadAnalysisId" TEXT,
    "dealId" TEXT,
    "userId" TEXT,
    "type" "DocumentType" NOT NULL,
    "source" "DocumentSource" NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "content" TEXT,
    "fileName" TEXT,
    "mimeType" TEXT,
    "fileData" BYTEA,
    "contextSnapshot" JSONB,
    "isManualOverride" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Document_organizationId_clientAccountId_updatedAt_idx" ON "Document"("organizationId", "clientAccountId", "updatedAt");

-- CreateIndex
CREATE INDEX "Document_contactId_updatedAt_idx" ON "Document"("contactId", "updatedAt");

-- CreateIndex
CREATE INDEX "Document_leadAnalysisId_idx" ON "Document"("leadAnalysisId");

-- CreateIndex
CREATE INDEX "Document_dealId_idx" ON "Document"("dealId");

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_clientAccountId_fkey" FOREIGN KEY ("clientAccountId") REFERENCES "ClientAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_leadAnalysisId_fkey" FOREIGN KEY ("leadAnalysisId") REFERENCES "LeadAnalysis"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
