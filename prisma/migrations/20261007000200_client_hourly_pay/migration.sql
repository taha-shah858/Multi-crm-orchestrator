ALTER TABLE "ClientAssignment" ADD COLUMN "hourlyRateCents" INTEGER;
ALTER TABLE "ClientAssignment" ADD COLUMN "hourlyRateCurrency" TEXT NOT NULL DEFAULT 'USD';
ALTER TABLE "ClientAssignment" ADD CONSTRAINT "ClientAssignment_hourlyRateCents_check" CHECK ("hourlyRateCents" IS NULL OR "hourlyRateCents" >= 0);
-- Preserve existing estimates once; future edits affect only this assignment.
UPDATE "ClientAssignment" a SET "hourlyRateCents" = u."hourlyRateCents", "hourlyRateCurrency" = u."hourlyRateCurrency"
FROM "User" u WHERE a."userId" = u.id AND u."hourlyRateCents" IS NOT NULL;
