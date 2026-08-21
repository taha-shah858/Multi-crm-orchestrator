-- CreateEnum
CREATE TYPE "CommunicationProvider" AS ENUM ('TWILIO', 'MOCK');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'COMMUNICATION_DISPATCHED';
ALTER TYPE "AuditAction" ADD VALUE 'COMMUNICATION_MANUALLY_LOGGED';

-- AlterEnum
ALTER TYPE "InteractionSource" ADD VALUE 'TWILIO';

-- CreateTable
CREATE TABLE "CommunicationIdentity" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientAccountId" TEXT NOT NULL,
    "provider" "CommunicationProvider" NOT NULL,
    "label" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunicationIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CommunicationIdentity_organizationId_clientAccountId_isEnab_idx" ON "CommunicationIdentity"("organizationId", "clientAccountId", "isEnabled");

-- CreateIndex
CREATE UNIQUE INDEX "CommunicationIdentity_clientAccountId_phoneNumber_key" ON "CommunicationIdentity"("clientAccountId", "phoneNumber");

-- AddForeignKey
ALTER TABLE "CommunicationIdentity" ADD CONSTRAINT "CommunicationIdentity_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunicationIdentity" ADD CONSTRAINT "CommunicationIdentity_clientAccountId_fkey" FOREIGN KEY ("clientAccountId") REFERENCES "ClientAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
