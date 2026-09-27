import type { ConnectionStatus, IntegrationProvider, Prisma } from "@prisma/client";
import type { RequestContext } from "@/lib/models/canonical";

/**
 * Connection health and authorization are separate concerns. A degraded/error
 * connection still has a persisted credential and must remain eligible for a
 * manual sync so the operation can recover without another OAuth install.
 */
export const SYNCABLE_CONNECTION_STATUSES = ["CONNECTED", "DEGRADED", "ERROR"] as const satisfies readonly ConnectionStatus[];

export function isSyncableConnectionStatus(status: ConnectionStatus) {
  return SYNCABLE_CONNECTION_STATUSES.includes(status as typeof SYNCABLE_CONNECTION_STATUSES[number]);
}

export function activeClientIntegrationWhere(
  context: RequestContext,
  provider?: IntegrationProvider,
): Prisma.IntegrationConnectionWhereInput {
  return {
    organizationId: context.user.organizationId,
    ownershipType: "CLIENT_ACCOUNT",
    clientAccountId: context.activeClientAccountId,
    status: { in: [...SYNCABLE_CONNECTION_STATUSES] },
    ...(provider ? { provider } : {}),
  };
}

export function clientIntegrationWhere(
  organizationIdOrContext: string | RequestContext | { user: { organizationId: string } },
  clientAccountId: string,
  provider?: IntegrationProvider,
): Prisma.IntegrationConnectionWhereInput {
  const organizationId = typeof organizationIdOrContext === "string"
    ? organizationIdOrContext
    : "user" in organizationIdOrContext
    ? organizationIdOrContext.user.organizationId
    : (organizationIdOrContext as any).organizationId;

  return {
    organizationId,
    ownershipType: "CLIENT_ACCOUNT",
    clientAccountId,
    status: { in: [...SYNCABLE_CONNECTION_STATUSES] },
    ...(provider ? { provider } : {}),
  };
}

export function agencyIntegrationWhere(
  organizationIdOrContext: string | RequestContext | { user: { organizationId: string } },
  provider?: IntegrationProvider,
): Prisma.IntegrationConnectionWhereInput {
  const organizationId = typeof organizationIdOrContext === "string"
    ? organizationIdOrContext
    : "user" in organizationIdOrContext
    ? organizationIdOrContext.user.organizationId
    : (organizationIdOrContext as any).organizationId;

  return {
    organizationId,
    ownershipType: "COMPANY",
    status: { in: [...SYNCABLE_CONNECTION_STATUSES] },
    ...(provider ? { provider } : {}),
  };
}

/**
 * Resolves the HubSpot connection for the agency. If no company-owned connection exists yet
 * (e.g. in transitional development databases or legacy test fixtures), it falls back to
 * checking the client-owned connection for backward compatibility.
 */
export function hubspotConnectionWhere(
  context: RequestContext,
): Prisma.IntegrationConnectionWhereInput {
  return {
    organizationId: context.user.organizationId,
    provider: "HUBSPOT",
    status: { in: [...SYNCABLE_CONNECTION_STATUSES] },
    OR: [
      { ownershipType: "COMPANY" },
      { ownershipType: "CLIENT_ACCOUNT", clientAccountId: context.activeClientAccountId },
    ],
  };
}

export function userIntegrationWhere(
  organizationIdOrContext: string | RequestContext | { user: { organizationId: string } },
  userId: string,
  provider?: IntegrationProvider,
): Prisma.IntegrationConnectionWhereInput {
  const organizationId = typeof organizationIdOrContext === "string"
    ? organizationIdOrContext
    : "user" in organizationIdOrContext
    ? organizationIdOrContext.user.organizationId
    : (organizationIdOrContext as any).organizationId;

  return {
    organizationId,
    ownershipType: "USER",
    userId,
    status: { in: [...SYNCABLE_CONNECTION_STATUSES] },
    ...(provider ? { provider } : {}),
  };
}

