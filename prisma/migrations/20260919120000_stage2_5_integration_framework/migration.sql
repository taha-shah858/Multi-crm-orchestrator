-- Stage 2.5 upgrades the existing CRM-specific connection table in place so
-- ExternalRecord and SyncRun foreign keys retain their existing identities.
ALTER TYPE "CrmProvider" RENAME TO "IntegrationProvider";
ALTER TYPE "IntegrationProvider" ADD VALUE IF NOT EXISTS 'TWILIO';
ALTER TYPE "IntegrationProvider" ADD VALUE IF NOT EXISTS 'GOOGLE_CALENDAR';
ALTER TYPE "IntegrationProvider" ADD VALUE IF NOT EXISTS 'OUTLOOK';
ALTER TYPE "IntegrationProvider" ADD VALUE IF NOT EXISTS 'AI_PROVIDER';

CREATE TYPE "IntegrationOwnershipType" AS ENUM ('COMPANY', 'CLIENT_ACCOUNT', 'USER');

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'INTEGRATION_CONNECTED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'INTEGRATION_DISCONNECTED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'INTEGRATION_OAUTH_FAILED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'INTEGRATION_CREDENTIAL_REFRESH_FAILED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'INTEGRATION_SYNC_RETRIED';

ALTER TABLE "ClientAccount"
  ADD COLUMN "allowAgentIntegrationManagement" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "CrmConnection"
  ALTER COLUMN "clientAccountId" DROP NOT NULL,
  ADD COLUMN "ownershipType" "IntegrationOwnershipType" NOT NULL DEFAULT 'CLIENT_ACCOUNT',
  ADD COLUMN "ownershipKey" TEXT,
  ADD COLUMN "userId" TEXT,
  ADD COLUMN "providerAccountId" TEXT,
  ADD COLUMN "providerAccountName" TEXT,
  ADD COLUMN "scopes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "connectedByUserId" TEXT,
  ADD COLUMN "connectedAt" TIMESTAMP(3),
  ADD COLUMN "lastSyncAt" TIMESTAMP(3),
  ADD COLUMN "lastError" TEXT;

UPDATE "CrmConnection"
SET "ownershipKey" = 'client:' || "clientAccountId";

ALTER TABLE "CrmConnection"
  ALTER COLUMN "ownershipKey" SET NOT NULL;

CREATE TABLE "IntegrationCredential" (
  "id" TEXT NOT NULL,
  "integrationConnectionId" TEXT NOT NULL,
  "encryptedAccessToken" TEXT NOT NULL,
  "encryptedRefreshToken" TEXT,
  "accessTokenExpiresAt" TIMESTAMP(3),
  "refreshTokenExpiresAt" TIMESTAMP(3),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "IntegrationCredential_pkey" PRIMARY KEY ("id")
);

-- Existing development connections contain server-only env: references, not
-- token values. Preserve those references so current contact sync remains
-- operational until each account completes OAuth.
INSERT INTO "IntegrationCredential" (
  "id",
  "integrationConnectionId",
  "encryptedAccessToken",
  "encryptedRefreshToken",
  "accessTokenExpiresAt",
  "metadata",
  "updatedAt"
)
SELECT
  'migrated-' || "id",
  "id",
  "encryptedAccessToken",
  "encryptedRefreshToken",
  "expiresAt",
  '{"source":"legacy_server_reference"}'::jsonb,
  CURRENT_TIMESTAMP
FROM "CrmConnection"
WHERE "encryptedAccessToken" IS NOT NULL;

ALTER TABLE "CrmConnection"
  DROP COLUMN "encryptedAccessToken",
  DROP COLUMN "encryptedRefreshToken",
  DROP COLUMN "expiresAt";

CREATE TABLE "OAuthState" (
  "id" TEXT NOT NULL,
  "stateHash" TEXT NOT NULL,
  "provider" "IntegrationProvider" NOT NULL,
  "organizationId" TEXT NOT NULL,
  "ownershipType" "IntegrationOwnershipType" NOT NULL,
  "clientAccountId" TEXT,
  "userId" TEXT,
  "initiatedByUserId" TEXT NOT NULL,
  "returnPath" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OAuthState_pkey" PRIMARY KEY ("id")
);

DROP INDEX "CrmConnection_clientAccountId_provider_key";
DROP INDEX "CrmConnection_organizationId_clientAccountId_idx";

CREATE UNIQUE INDEX "CrmConnection_ownershipKey_provider_key"
  ON "CrmConnection"("ownershipKey", "provider");
CREATE INDEX "CrmConnection_organizationId_ownershipType_status_idx"
  ON "CrmConnection"("organizationId", "ownershipType", "status");
CREATE INDEX "CrmConnection_clientAccountId_provider_idx"
  ON "CrmConnection"("clientAccountId", "provider");
CREATE INDEX "CrmConnection_userId_provider_idx"
  ON "CrmConnection"("userId", "provider");
CREATE UNIQUE INDEX "IntegrationCredential_integrationConnectionId_key"
  ON "IntegrationCredential"("integrationConnectionId");
CREATE INDEX "IntegrationCredential_accessTokenExpiresAt_idx"
  ON "IntegrationCredential"("accessTokenExpiresAt");
CREATE UNIQUE INDEX "OAuthState_stateHash_key" ON "OAuthState"("stateHash");
CREATE INDEX "OAuthState_expiresAt_usedAt_idx" ON "OAuthState"("expiresAt", "usedAt");
CREATE INDEX "OAuthState_organizationId_provider_idx" ON "OAuthState"("organizationId", "provider");

ALTER TABLE "CrmConnection"
  ADD CONSTRAINT "CrmConnection_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "CrmConnection_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "CrmConnection_connectedByUserId_fkey"
    FOREIGN KEY ("connectedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "CrmConnection_ownership_target_check" CHECK (
    ("ownershipType" = 'COMPANY' AND "clientAccountId" IS NULL AND "userId" IS NULL)
    OR ("ownershipType" = 'CLIENT_ACCOUNT' AND "clientAccountId" IS NOT NULL AND "userId" IS NULL)
    OR ("ownershipType" = 'USER' AND "clientAccountId" IS NULL AND "userId" IS NOT NULL)
  );

ALTER TABLE "IntegrationCredential"
  ADD CONSTRAINT "IntegrationCredential_integrationConnectionId_fkey"
    FOREIGN KEY ("integrationConnectionId") REFERENCES "CrmConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OAuthState"
  ADD CONSTRAINT "OAuthState_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "OAuthState_clientAccountId_fkey"
    FOREIGN KEY ("clientAccountId") REFERENCES "ClientAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "OAuthState_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "OAuthState_initiatedByUserId_fkey"
    FOREIGN KEY ("initiatedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "OAuthState_ownership_target_check" CHECK (
    ("ownershipType" = 'COMPANY' AND "clientAccountId" IS NULL AND "userId" IS NULL)
    OR ("ownershipType" = 'CLIENT_ACCOUNT' AND "clientAccountId" IS NOT NULL AND "userId" IS NULL)
    OR ("ownershipType" = 'USER' AND "clientAccountId" IS NULL AND "userId" IS NOT NULL)
  );
