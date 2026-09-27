-- Stage 2.9 ClickUp Agent Personal CRM / Sales Tracker

ALTER TYPE "IntegrationProvider" ADD VALUE IF NOT EXISTS 'CLICKUP';

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CLICKUP_CONNECTED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CLICKUP_DISCONNECTED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CLICKUP_TASK_SYNC_STARTED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CLICKUP_TASK_SYNC_COMPLETED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CLICKUP_TASK_SYNC_FAILED';

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "defaultCommissionRate" DOUBLE PRECISION DEFAULT 10.0;
ALTER TABLE "ClientAccount" ADD COLUMN IF NOT EXISTS "defaultCommissionRate" DOUBLE PRECISION;

ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "commissionRate" DOUBLE PRECISION;
ALTER TABLE "Deal" ALTER COLUMN "commissionRate" DROP DEFAULT;
ALTER TABLE "Deal" ADD COLUMN IF NOT EXISTS "expectedRevenueCents" INTEGER;

CREATE TABLE IF NOT EXISTS "AgentClickUpRecord" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "agentId" TEXT NOT NULL,
  "dealId" TEXT NOT NULL,
  "clientAccountId" TEXT,
  "clickUpTaskId" TEXT NOT NULL,
  "clickUpListId" TEXT,
  "taskUrl" TEXT,
  "status" "HandoffStatus" NOT NULL DEFAULT 'PENDING',
  "commissionCents" INTEGER,
  "commissionRate" DOUBLE PRECISION,
  "lastSyncedAt" TIMESTAMP(3),
  "lastSyncError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AgentClickUpRecord_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AgentClickUpRecord_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AgentClickUpRecord_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AgentClickUpRecord_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AgentClickUpRecord_clientAccountId_fkey" FOREIGN KEY ("clientAccountId") REFERENCES "ClientAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "AgentClickUpRecord_agentId_dealId_key" ON "AgentClickUpRecord"("agentId", "dealId");
CREATE INDEX IF NOT EXISTS "AgentClickUpRecord_organizationId_agentId_status_idx" ON "AgentClickUpRecord"("organizationId", "agentId", "status");
CREATE INDEX IF NOT EXISTS "AgentClickUpRecord_dealId_idx" ON "AgentClickUpRecord"("dealId");
