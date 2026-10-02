ALTER TYPE "CalendarProvider" ADD VALUE IF NOT EXISTS 'CALENDLY';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CALENDAR_CONNECTED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CALENDAR_DISCONNECTED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'APPOINTMENT_SYNC_COMPLETED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'APPOINTMENT_SYNC_FAILED';
CREATE TYPE "CalendarSyncStatus" AS ENUM ('LOCAL_ONLY', 'PENDING', 'SYNCED', 'FAILED', 'REVIEW_REQUIRED');

CREATE TABLE "CalendarConnection" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "provider" "CalendarProvider" NOT NULL,
  "providerAccountId" TEXT NOT NULL,
  "accountName" TEXT NOT NULL,
  "status" "ConnectionStatus" NOT NULL DEFAULT 'CONNECTED',
  "encryptedAccessToken" TEXT,
  "encryptedRefreshToken" TEXT,
  "accessTokenExpiresAt" TIMESTAMP(3),
  "scopes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CalendarConnection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CalendarConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "CalendarConnection_userId_provider_key" ON "CalendarConnection"("userId", "provider");
CREATE INDEX "CalendarConnection_organizationId_userId_idx" ON "CalendarConnection"("organizationId", "userId");

CREATE TABLE "CalendarOAuthState" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "stateHash" TEXT NOT NULL,
  "provider" "CalendarProvider" NOT NULL,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "encryptedVerifier" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CalendarOAuthState_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CalendarOAuthState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "CalendarOAuthState_stateHash_key" ON "CalendarOAuthState"("stateHash");
CREATE INDEX "CalendarOAuthState_expiresAt_usedAt_idx" ON "CalendarOAuthState"("expiresAt", "usedAt");

ALTER TABLE "Appointment"
  ADD COLUMN "calendarConnectionId" TEXT,
  ADD COLUMN "externalAccountId" TEXT,
  ADD COLUMN "calendarSyncStatus" "CalendarSyncStatus" NOT NULL DEFAULT 'LOCAL_ONLY',
  ADD COLUMN "lastSyncError" TEXT,
  ADD COLUMN "lastSyncedAt" TIMESTAMP(3),
  ADD COLUMN "attendeeEmail" TEXT,
  ADD COLUMN "attendeeName" TEXT,
  ADD COLUMN "sendInvite" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "timeZone" TEXT NOT NULL DEFAULT 'UTC',
  ADD COLUMN "calendlyEventTypeUri" TEXT;
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_calendarConnectionId_fkey" FOREIGN KEY ("calendarConnectionId") REFERENCES "CalendarConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
