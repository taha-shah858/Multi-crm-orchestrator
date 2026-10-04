/* eslint-disable @typescript-eslint/no-require-imports -- Standalone Node CLI. */
// Explicit, local ownership repair. No provider requests or credential changes.
async function repairAgencyHubSpotOwnership(prisma, connectionId, apply = false) {
  const plan = async (database) => {
    const connection = await database.integrationConnection.findUnique({
      where: { id: connectionId },
      select: { id: true, organizationId: true, provider: true, ownershipType: true, ownershipKey: true, clientAccountId: true, userId: true },
    });
    if (!connection || connection.provider !== "HUBSPOT") throw new Error("Choose an existing HubSpot connection.");
    if (connection.ownershipType === "COMPANY") return { connectionId, organizationId: connection.organizationId, alreadyAgencyOwned: true };
    if (connection.ownershipType !== "CLIENT_ACCOUNT" || !connection.clientAccountId) throw new Error("Only an explicitly selected legacy client-owned HubSpot connection can be repaired.");
    const client = await database.clientAccount.findFirst({ where: { id: connection.clientAccountId, organizationId: connection.organizationId } });
    if (!client) throw new Error("The connection's client does not belong to its organization.");
    const agencyConnection = await database.integrationConnection.findFirst({
      where: { organizationId: connection.organizationId, provider: "HUBSPOT", ownershipType: "COMPANY" },
    });
    if (agencyConnection) throw new Error("An agency HubSpot connection already exists. Review both accounts before migrating.");
    return {
      connectionId, organizationId: connection.organizationId,
      before: { ownershipType: connection.ownershipType, ownershipKey: connection.ownershipKey, clientAccountId: connection.clientAccountId, userId: connection.userId },
      after: { ownershipType: "COMPANY", ownershipKey: "company:" + connection.organizationId, clientAccountId: null, userId: null },
    };
  };
  if (!apply) return { ...await plan(prisma), applied: false };
  return prisma.$transaction(async (transaction) => {
    const review = await plan(transaction);
    if (review.alreadyAgencyOwned) return { ...review, applied: false };
    await transaction.integrationConnection.update({ where: { id: connectionId }, data: review.after });
    const audit = await transaction.auditLog.create({
      data: {
        organizationId: review.organizationId, action: "INTEGRATION_CONNECTED", entityType: "INTEGRATION_CONNECTION",
        entityId: connectionId, source: "HUBSPOT", requestId: "agency-ownership-repair-" + connectionId,
        metadata: { operation: "REPAIR_AGENCY_HUBSPOT_OWNERSHIP", before: review.before, after: review.after },
      },
    });
    // The audit preserves the previous ownership fields for recovery. The ID,
    // credentials, external mappings, and imported contacts are unchanged.
    return { ...review, applied: true, auditId: audit.id };
  }, { isolationLevel: "Serializable" });
}

module.exports = { repairAgencyHubSpotOwnership };

if (require.main === module) {
  const index = process.argv.indexOf("--connection-id");
  const connectionId = index >= 0 ? process.argv[index + 1] : undefined;
  if (!connectionId || connectionId.startsWith("--")) {
    console.error("Usage: node scripts/repair-agency-hubspot-ownership.cjs --connection-id <id> [--apply]. Default is read-only review.");
    process.exitCode = 1;
  } else {
    require("@next/env").loadEnvConfig(process.cwd());
    const { PrismaClient } = require("@prisma/client");
    const { PrismaPg } = require("@prisma/adapter-pg");
    const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 }) });
    repairAgencyHubSpotOwnership(prisma, connectionId, process.argv.includes("--apply"))
      .then((result) => console.log(JSON.stringify(result)))
      .catch((error) => { console.error(error.code || error.message); process.exitCode = 1; })
      .finally(() => prisma.$disconnect());
  }
}
