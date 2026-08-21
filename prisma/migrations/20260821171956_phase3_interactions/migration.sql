-- CreateEnum
CREATE TYPE "InteractionType" AS ENUM ('CALL', 'SMS', 'EMAIL', 'NOTE', 'CRM_ACTIVITY');

-- CreateEnum
CREATE TYPE "InteractionDirection" AS ENUM ('INBOUND', 'OUTBOUND', 'INTERNAL');

-- CreateEnum
CREATE TYPE "InteractionSource" AS ENUM ('MANUAL', 'HUBSPOT', 'MOCK');

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'INTERACTION_CREATED';

-- CreateTable
CREATE TABLE "Interaction" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientAccountId" TEXT NOT NULL,
    "contactId" TEXT,
    "userId" TEXT,
    "type" "InteractionType" NOT NULL,
    "direction" "InteractionDirection" NOT NULL DEFAULT 'INTERNAL',
    "source" "InteractionSource" NOT NULL DEFAULT 'MANUAL',
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Interaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Interaction_organizationId_clientAccountId_occurredAt_idx" ON "Interaction"("organizationId", "clientAccountId", "occurredAt");

-- CreateIndex
CREATE INDEX "Interaction_contactId_occurredAt_idx" ON "Interaction"("contactId", "occurredAt");

-- AddForeignKey
ALTER TABLE "Interaction" ADD CONSTRAINT "Interaction_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interaction" ADD CONSTRAINT "Interaction_clientAccountId_fkey" FOREIGN KEY ("clientAccountId") REFERENCES "ClientAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interaction" ADD CONSTRAINT "Interaction_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interaction" ADD CONSTRAINT "Interaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
