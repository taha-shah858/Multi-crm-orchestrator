-- Keep provenance and record mappings when an administrator removes a connection.
ALTER TABLE "CrmConnection" ADD COLUMN "removedAt" TIMESTAMP(3);
