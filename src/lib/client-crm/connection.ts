import "server-only";

import type { IntegrationConnection } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { assertClientAccess } from "@/lib/auth/auth-service";
import { AppError } from "@/lib/errors/app-error";
import { clientIntegrationWhere } from "@/lib/integrations/connection-resolution";
import type { RequestContext } from "@/lib/models/canonical";

export type ClientCrmProvider = "ZOHO" | "ACTIVECAMPAIGN";

export function isClientCrmProvider(provider: unknown): provider is ClientCrmProvider {
  return provider === "ZOHO" || provider === "ACTIVECAMPAIGN";
}

export async function assertClientMutationTarget(context: RequestContext, clientAccountId: string) {
  await assertClientAccess(context.user, clientAccountId);
  if (clientAccountId !== context.activeClientAccountId) {
    throw new AppError("CLIENT_ACCESS_DENIED", 403, "Mutation target differs from the selected client.", "Switch to the client associated with this record before changing it.");
  }
}

/** Never substitute another integration or another owner's connection. */
export async function resolveClientCrmConnection(
  context: RequestContext,
  clientAccountId: string,
  provider: ClientCrmProvider,
  connectionId?: string | null,
): Promise<IntegrationConnection | null> {
  return prisma.integrationConnection.findFirst({
    where: {
      ...clientIntegrationWhere(context, clientAccountId, provider),
      ...(connectionId ? { id: connectionId } : {}),
    },
    orderBy: { updatedAt: "desc" },
  });
}

export function recordMetadata(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

/** IDs are trusted by their provenance, not by numeric appearance or prefixes. */
export function hasVerifiedProviderMapping(
  record: { connectionId: string | null; provider: string; externalId: string | null; customFields: unknown },
  connection: IntegrationConnection,
) {
  const metadata = recordMetadata(record.customFields);
  return record.connectionId === connection.id
    && record.provider === connection.provider
    && typeof record.externalId === "string" && record.externalId.trim().length > 0
    && (metadata.source === "PROVIDER_IMPORT" || metadata.source === "DEAL_HANDOFF")
    && metadata.providerRecordId === record.externalId;
}
