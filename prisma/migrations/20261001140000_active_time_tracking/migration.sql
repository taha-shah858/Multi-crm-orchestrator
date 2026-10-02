ALTER TYPE "TimeLogSource" ADD VALUE IF NOT EXISTS 'AUTO';
ALTER TABLE "TimeLog" ADD COLUMN "trackedSeconds" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "TimeTrackingSession" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clientAccountId" TEXT,
    "timeLogId" TEXT,
    "tabId" TEXT,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "isRunning" BOOLEAN NOT NULL DEFAULT false,
    "lastHeartbeatAt" TIMESTAMP(3),
    "pauseReason" TEXT,
    CONSTRAINT "TimeTrackingSession_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TimeTrackingSession_userId_key" ON "TimeTrackingSession"("userId");
CREATE UNIQUE INDEX "TimeTrackingSession_timeLogId_key" ON "TimeTrackingSession"("timeLogId");
CREATE INDEX "TimeTrackingSession_organizationId_clientAccountId_idx" ON "TimeTrackingSession"("organizationId", "clientAccountId");
ALTER TABLE "TimeTrackingSession" ADD CONSTRAINT "TimeTrackingSession_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TimeTrackingSession" ADD CONSTRAINT "TimeTrackingSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TimeTrackingSession" ADD CONSTRAINT "TimeTrackingSession_clientAccountId_fkey" FOREIGN KEY ("clientAccountId") REFERENCES "ClientAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TimeTrackingSession" ADD CONSTRAINT "TimeTrackingSession_timeLogId_fkey" FOREIGN KEY ("timeLogId") REFERENCES "TimeLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;
