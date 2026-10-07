ALTER TABLE "User" ADD COLUMN "hourlyRateCents" INTEGER;
ALTER TABLE "User" ADD COLUMN "hourlyRateCurrency" TEXT NOT NULL DEFAULT 'USD';
ALTER TABLE "User" ADD CONSTRAINT "User_hourlyRateCents_check" CHECK ("hourlyRateCents" IS NULL OR "hourlyRateCents" >= 0);
