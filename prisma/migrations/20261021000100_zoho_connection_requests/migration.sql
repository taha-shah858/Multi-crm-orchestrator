ALTER TYPE "AuditAction" ADD VALUE 'ZOHO_CONNECTION_REQUESTED';
ALTER TYPE "AuditAction" ADD VALUE 'ZOHO_CONSENT_RECEIVED';
ALTER TYPE "AuditAction" ADD VALUE 'ZOHO_CONNECTION_REQUEST_REVOKED';
CREATE TABLE "ZohoConnectionRequest" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "clientAccountId" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'INVITATION',
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "tokenHash" TEXT,
  "stateHash" TEXT,
  "browserHash" TEXT,
  "oauthExpiresAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "baselineFingerprint" TEXT NOT NULL,
  "providerOrganizationId" TEXT,
  "providerOrganizationName" TEXT,
  "providerUserId" TEXT,
  "providerUserName" TEXT,
  "apiDomain" TEXT,
  "accountsUrl" TEXT,
  "encryptedAccessToken" TEXT,
  "encryptedRefreshToken" TEXT,
  "accessTokenExpiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ZohoConnectionRequest_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ZohoConnectionRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ZohoConnectionRequest_clientAccountId_fkey" FOREIGN KEY ("clientAccountId") REFERENCES "ClientAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ZohoConnectionRequest_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ZohoConnectionRequest_status_check" CHECK ("status" IN ('PENDING','AUTHORIZING','PROCESSING','REVIEW','APPROVED','REVOKED','FAILED','EXPIRED')),
  CONSTRAINT "ZohoConnectionRequest_source_check" CHECK ("source" IN ('INVITATION','DIRECT'))
);
CREATE UNIQUE INDEX "ZohoConnectionRequest_tokenHash_key" ON "ZohoConnectionRequest"("tokenHash");
CREATE UNIQUE INDEX "ZohoConnectionRequest_stateHash_key" ON "ZohoConnectionRequest"("stateHash");
CREATE INDEX "ZohoConnectionRequest_organizationId_status_expiresAt_idx" ON "ZohoConnectionRequest"("organizationId", "status", "expiresAt");
CREATE INDEX "ZohoConnectionRequest_clientAccountId_idx" ON "ZohoConnectionRequest"("clientAccountId");
