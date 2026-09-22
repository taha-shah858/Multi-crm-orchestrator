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
