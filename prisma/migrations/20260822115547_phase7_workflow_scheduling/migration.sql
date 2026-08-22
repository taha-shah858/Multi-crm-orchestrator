-- CreateEnum
CREATE TYPE "CalendarProvider" AS ENUM ('MANUAL', 'MOCK', 'GOOGLE', 'OUTLOOK');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('SCHEDULED', 'CONFIRMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AppointmentSource" AS ENUM ('MANUAL', 'INTENT_DETECTED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'APPOINTMENT_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'APPOINTMENT_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'APPOINTMENT_CANCELLED';

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "clientAccountId" TEXT NOT NULL,
    "contactId" TEXT,
    "interactionId" TEXT,
    "userId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'SCHEDULED',
    "provider" "CalendarProvider" NOT NULL DEFAULT 'MANUAL',
    "source" "AppointmentSource" NOT NULL DEFAULT 'MANUAL',
    "externalId" TEXT,
    "externalMetadata" JSONB,
    "intentDetected" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Appointment_organizationId_clientAccountId_startTime_idx" ON "Appointment"("organizationId", "clientAccountId", "startTime");

-- CreateIndex
CREATE INDEX "Appointment_contactId_startTime_idx" ON "Appointment"("contactId", "startTime");

-- CreateIndex
CREATE INDEX "Appointment_interactionId_idx" ON "Appointment"("interactionId");

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_clientAccountId_fkey" FOREIGN KEY ("clientAccountId") REFERENCES "ClientAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_interactionId_fkey" FOREIGN KEY ("interactionId") REFERENCES "Interaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
