-- Post-MVP Stage 2: persistent server-backed sessions and RBAC audit events.
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'AUTH_SIGNED_IN';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'AUTH_SIGNED_OUT';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'USER_CREATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'USER_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'CLIENT_ASSIGNMENTS_UPDATED';

CREATE TABLE "AuthSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AuthSession_tokenHash_key" ON "AuthSession"("tokenHash");
CREATE INDEX "AuthSession_userId_expiresAt_idx" ON "AuthSession"("userId", "expiresAt");

ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
