CREATE TYPE "HandoffStatus" AS ENUM ('PENDING', 'SYNCING', 'SYNCED', 'FAILED', 'RETRYING');

CREATE TYPE "ClientRecordType" AS ENUM ('CONTACT', 'COMPANY', 'DEAL', 'ACTIVITY', 'NOTE', 'TASK');

ALTER TYPE "AuditAction" ADD VALUE 'DEAL_HANDOFF_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'DEAL_HANDOFF_SYNC_STARTED';
ALTER TYPE "AuditAction" ADD VALUE 'DEAL_HANDOFF_SYNC_COMPLETED';
ALTER TYPE "AuditAction" ADD VALUE 'DEAL_HANDOFF_SYNC_FAILED';
ALTER TYPE "AuditAction" ADD VALUE 'CLIENT_CRM_RECORD_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'CLIENT_CRM_RECORD_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'CLIENT_CRM_SYNC_COMPLETED';
ALTER TYPE "AuditAction" ADD VALUE 'CLIENT_CRM_SYNC_FAILED';

CREATE TABLE "DealHandoff" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientAccountId" TEXT NOT NULL,
    "agencyDealId" TEXT NOT NULL,
    "agentId" TEXT,
    "dealName" TEXT NOT NULL,
    "dealAmountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "closeStatus" TEXT NOT NULL DEFAULT 'CLOSED_WON',
    "closeDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closeOutcome" TEXT,
    "recommendedNextAction" TEXT,
    "notes" TEXT,
    "clientCrmProvider" "IntegrationProvider" NOT NULL DEFAULT 'ACTIVECAMPAIGN',
    "clientCrmRecordId" TEXT,
    "status" "HandoffStatus" NOT NULL DEFAULT 'PENDING',
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptedAt" TIMESTAMP(3),
    "lastSuccessfulSyncAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DealHandoff_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DealHandoff_agencyDealId_clientAccountId_key" ON "DealHandoff"("agencyDealId", "clientAccountId");
CREATE INDEX "DealHandoff_organizationId_clientAccountId_status_idx" ON "DealHandoff"("organizationId", "clientAccountId", "status");
CREATE INDEX "DealHandoff_agencyDealId_idx" ON "DealHandoff"("agencyDealId");

ALTER TABLE "DealHandoff" ADD CONSTRAINT "DealHandoff_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DealHandoff" ADD CONSTRAINT "DealHandoff_clientAccountId_fkey" FOREIGN KEY ("clientAccountId") REFERENCES "ClientAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DealHandoff" ADD CONSTRAINT "DealHandoff_agencyDealId_fkey" FOREIGN KEY ("agencyDealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DealHandoff" ADD CONSTRAINT "DealHandoff_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "ClientCrmRecord" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientAccountId" TEXT NOT NULL,
    "connectionId" TEXT,
    "provider" "IntegrationProvider" NOT NULL DEFAULT 'ACTIVECAMPAIGN',
    "recordType" "ClientRecordType" NOT NULL,
    "externalId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "companyName" TEXT,
    "status" TEXT,
    "stage" TEXT,
    "amount" TEXT,
    "details" TEXT,
    "customFields" JSONB,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientCrmRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClientCrmRecord_connectionId_recordType_externalId_key" ON "ClientCrmRecord"("connectionId", "recordType", "externalId");
CREATE INDEX "ClientCrmRecord_organizationId_clientAccountId_recordType_idx" ON "ClientCrmRecord"("organizationId", "clientAccountId", "recordType");

ALTER TABLE "ClientCrmRecord" ADD CONSTRAINT "ClientCrmRecord_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClientCrmRecord" ADD CONSTRAINT "ClientCrmRecord_clientAccountId_fkey" FOREIGN KEY ("clientAccountId") REFERENCES "ClientAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ClientCrmRecord" ADD CONSTRAINT "ClientCrmRecord_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "CrmConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
