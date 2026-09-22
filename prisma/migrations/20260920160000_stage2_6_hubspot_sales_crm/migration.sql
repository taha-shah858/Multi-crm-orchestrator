CREATE TYPE "ExternalObjectType" AS ENUM ('CONTACT', 'COMPANY', 'DEAL', 'OWNER', 'CALL', 'MEETING', 'NOTE', 'TASK', 'EMAIL');

ALTER TYPE "AuditAction" ADD VALUE 'SALES_CRM_SYNC_STARTED';
ALTER TYPE "AuditAction" ADD VALUE 'SALES_CRM_SYNC_COMPLETED';
ALTER TYPE "AuditAction" ADD VALUE 'SALES_CRM_SYNC_FAILED';
ALTER TYPE "AuditAction" ADD VALUE 'COMPANY_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'COMPANY_OUTBOUND_SYNC_COMPLETED';
ALTER TYPE "AuditAction" ADD VALUE 'COMPANY_OUTBOUND_SYNC_FAILED';
ALTER TYPE "AuditAction" ADD VALUE 'DEAL_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'DEAL_OUTBOUND_SYNC_COMPLETED';
ALTER TYPE "AuditAction" ADD VALUE 'DEAL_OUTBOUND_SYNC_FAILED';

ALTER TYPE "InteractionType" ADD VALUE 'MEETING';
ALTER TYPE "InteractionType" ADD VALUE 'TASK';

DROP INDEX "ExternalRecord_connectionId_externalId_key";

ALTER TABLE "Contact" ADD COLUMN "crmCompanyId" TEXT,
ADD COLUMN "crmOwnerId" TEXT;

ALTER TABLE "Deal" ADD COLUMN "companyId" TEXT,
ADD COLUMN "crmOwnerId" TEXT,
ADD COLUMN "expectedCloseAt" TIMESTAMP(3),
ADD COLUMN "pipelineId" TEXT,
ADD COLUMN "pipelineLabel" TEXT,
ADD COLUMN "sourceMetadata" JSONB,
ADD COLUMN "stageId" TEXT,
ADD COLUMN "stageLabel" TEXT;

ALTER TABLE "ExternalRecord" ADD COLUMN "crmCompanyId" TEXT,
ADD COLUMN "crmOwnerId" TEXT,
ADD COLUMN "dealId" TEXT,
ADD COLUMN "interactionId" TEXT,
ADD COLUMN "objectType" "ExternalObjectType" NOT NULL DEFAULT 'CONTACT',
ALTER COLUMN "contactId" DROP NOT NULL;

ALTER TABLE "SyncRun" ADD COLUMN "categoryCounts" JSONB;

CREATE TABLE "CrmCompany" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientAccountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT,
    "website" TEXT,
    "phone" TEXT,
    "industry" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "address" TEXT,
    "crmOwnerId" TEXT,
    "sourceMetadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CrmCompany_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CrmOwner" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientAccountId" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "displayName" TEXT NOT NULL,
    "email" TEXT,
    "providerUserId" TEXT,
    "teamId" TEXT,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "sourceMetadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CrmOwner_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DealContact" (
    "dealId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "DealContact_pkey" PRIMARY KEY ("dealId", "contactId")
);

CREATE TABLE "InteractionContact" (
    "interactionId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    CONSTRAINT "InteractionContact_pkey" PRIMARY KEY ("interactionId", "contactId")
);

CREATE TABLE "InteractionCompany" (
    "interactionId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    CONSTRAINT "InteractionCompany_pkey" PRIMARY KEY ("interactionId", "companyId")
);

CREATE TABLE "InteractionDeal" (
    "interactionId" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    CONSTRAINT "InteractionDeal_pkey" PRIMARY KEY ("interactionId", "dealId")
);

CREATE TABLE "CrmPipeline" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientAccountId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "providerPipelineId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CrmPipeline_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CrmPipelineStage" (
    "id" TEXT NOT NULL,
    "pipelineId" TEXT NOT NULL,
    "providerStageId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "probability" DOUBLE PRECISION,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CrmPipelineStage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CrmCompany_organizationId_clientAccountId_name_idx" ON "CrmCompany"("organizationId", "clientAccountId", "name");
CREATE INDEX "CrmCompany_crmOwnerId_idx" ON "CrmCompany"("crmOwnerId");
CREATE INDEX "CrmOwner_organizationId_clientAccountId_email_idx" ON "CrmOwner"("organizationId", "clientAccountId", "email");
CREATE INDEX "DealContact_contactId_idx" ON "DealContact"("contactId");
CREATE INDEX "InteractionContact_contactId_idx" ON "InteractionContact"("contactId");
CREATE INDEX "InteractionCompany_companyId_idx" ON "InteractionCompany"("companyId");
CREATE INDEX "InteractionDeal_dealId_idx" ON "InteractionDeal"("dealId");
CREATE INDEX "CrmPipeline_organizationId_clientAccountId_idx" ON "CrmPipeline"("organizationId", "clientAccountId");
CREATE UNIQUE INDEX "CrmPipeline_connectionId_providerPipelineId_key" ON "CrmPipeline"("connectionId", "providerPipelineId");
CREATE UNIQUE INDEX "CrmPipelineStage_pipelineId_providerStageId_key" ON "CrmPipelineStage"("pipelineId", "providerStageId");
CREATE INDEX "Contact_crmCompanyId_idx" ON "Contact"("crmCompanyId");
CREATE INDEX "Contact_crmOwnerId_idx" ON "Contact"("crmOwnerId");
CREATE INDEX "Deal_companyId_idx" ON "Deal"("companyId");
CREATE INDEX "Deal_crmOwnerId_idx" ON "Deal"("crmOwnerId");
CREATE INDEX "ExternalRecord_clientAccountId_crmCompanyId_idx" ON "ExternalRecord"("clientAccountId", "crmCompanyId");
CREATE INDEX "ExternalRecord_clientAccountId_dealId_idx" ON "ExternalRecord"("clientAccountId", "dealId");
CREATE INDEX "ExternalRecord_clientAccountId_interactionId_idx" ON "ExternalRecord"("clientAccountId", "interactionId");
CREATE UNIQUE INDEX "ExternalRecord_connectionId_objectType_externalId_key" ON "ExternalRecord"("connectionId", "objectType", "externalId");

ALTER TABLE "Contact" ADD CONSTRAINT "Contact_crmCompanyId_fkey" FOREIGN KEY ("crmCompanyId") REFERENCES "CrmCompany"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_crmOwnerId_fkey" FOREIGN KEY ("crmOwnerId") REFERENCES "CrmOwner"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ExternalRecord" ADD CONSTRAINT "ExternalRecord_crmCompanyId_fkey" FOREIGN KEY ("crmCompanyId") REFERENCES "CrmCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExternalRecord" ADD CONSTRAINT "ExternalRecord_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExternalRecord" ADD CONSTRAINT "ExternalRecord_crmOwnerId_fkey" FOREIGN KEY ("crmOwnerId") REFERENCES "CrmOwner"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExternalRecord" ADD CONSTRAINT "ExternalRecord_interactionId_fkey" FOREIGN KEY ("interactionId") REFERENCES "Interaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "CrmCompany"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_crmOwnerId_fkey" FOREIGN KEY ("crmOwnerId") REFERENCES "CrmOwner"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CrmCompany" ADD CONSTRAINT "CrmCompany_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CrmCompany" ADD CONSTRAINT "CrmCompany_clientAccountId_fkey" FOREIGN KEY ("clientAccountId") REFERENCES "ClientAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CrmCompany" ADD CONSTRAINT "CrmCompany_crmOwnerId_fkey" FOREIGN KEY ("crmOwnerId") REFERENCES "CrmOwner"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CrmOwner" ADD CONSTRAINT "CrmOwner_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CrmOwner" ADD CONSTRAINT "CrmOwner_clientAccountId_fkey" FOREIGN KEY ("clientAccountId") REFERENCES "ClientAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DealContact" ADD CONSTRAINT "DealContact_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DealContact" ADD CONSTRAINT "DealContact_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InteractionContact" ADD CONSTRAINT "InteractionContact_interactionId_fkey" FOREIGN KEY ("interactionId") REFERENCES "Interaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InteractionContact" ADD CONSTRAINT "InteractionContact_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InteractionCompany" ADD CONSTRAINT "InteractionCompany_interactionId_fkey" FOREIGN KEY ("interactionId") REFERENCES "Interaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InteractionCompany" ADD CONSTRAINT "InteractionCompany_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "CrmCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InteractionDeal" ADD CONSTRAINT "InteractionDeal_interactionId_fkey" FOREIGN KEY ("interactionId") REFERENCES "Interaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InteractionDeal" ADD CONSTRAINT "InteractionDeal_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CrmPipeline" ADD CONSTRAINT "CrmPipeline_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CrmPipeline" ADD CONSTRAINT "CrmPipeline_clientAccountId_fkey" FOREIGN KEY ("clientAccountId") REFERENCES "ClientAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CrmPipeline" ADD CONSTRAINT "CrmPipeline_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "CrmConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CrmPipelineStage" ADD CONSTRAINT "CrmPipelineStage_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "CrmPipeline"("id") ON DELETE CASCADE ON UPDATE CASCADE;
