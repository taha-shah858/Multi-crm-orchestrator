import "server-only";

import type { ClientCrmRecord, ClientRecordType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/errors/app-error";
import { recordAuditEvent } from "@/lib/audit/audit-log";
import { assertClientAccess } from "@/lib/auth/auth-service";
import { fetchActiveCampaignRecords, createOrUpdateActiveCampaignRecord } from "@/lib/integrations/activecampaign/client";
import { fetchZohoRecords, createOrUpdateZohoRecord } from "@/lib/integrations/zoho/client";
import type { RequestContext, ClientCrmRecordSummary } from "@/lib/models/canonical";
import { hasVerifiedProviderMapping, isClientCrmProvider, recordMetadata, resolveClientCrmConnection, type ClientCrmProvider } from "./connection";

export type ClientCrmOutboundStatus = "COMPLETED" | "FAILED" | "UNMAPPED" | "NOT_CONNECTED" | "UNSUPPORTED";

/** Listing never imports, mirrors, or deletes records, including an empty list. */
export async function listClientCrmRecords(
  context: RequestContext,
  recordType?: ClientRecordType,
  provider?: ClientCrmProvider,
): Promise<ClientCrmRecordSummary[]> {
  await assertClientAccess(context.user, context.activeClientAccountId);
  const records = await prisma.clientCrmRecord.findMany({
    where: {
      organizationId: context.user.organizationId,
      clientAccountId: context.activeClientAccountId,
      ...(recordType ? { recordType } : {}),
      ...(provider ? { provider } : {}),
    },
    orderBy: [{ recordType: "asc" }, { updatedAt: "desc" }],
  });
  return records.map(formatClientCrmRecord);
}

export async function updateClientCrmRecord(
  context: RequestContext,
  recordId: string,
  input: {
    name?: string;
    email?: string | null;
    phone?: string | null;
    companyName?: string | null;
    status?: string | null;
    stage?: string | null;
    amount?: string | null;
    details?: string | null;
  },
): Promise<{ record: ClientCrmRecordSummary; outboundStatus: ClientCrmOutboundStatus }> {
  await assertClientAccess(context.user, context.activeClientAccountId);
  const existing = await prisma.clientCrmRecord.findFirst({
    where: { id: recordId, organizationId: context.user.organizationId, clientAccountId: context.activeClientAccountId },
  });
  if (!existing) {
    throw new AppError("RECORD_NOT_FOUND", 404, "Client CRM record was not found.", "Select a valid client CRM record.");
  }

  const metadata = recordMetadata(existing.customFields);
  const updated = await prisma.clientCrmRecord.update({
    where: { id: existing.id },
    data: {
      name: input.name !== undefined ? input.name : existing.name,
      email: input.email !== undefined ? input.email : existing.email,
      phone: input.phone !== undefined ? input.phone : existing.phone,
      companyName: input.companyName !== undefined ? input.companyName : existing.companyName,
      status: input.status !== undefined ? input.status : existing.status,
      stage: input.stage !== undefined ? input.stage : existing.stage,
      amount: input.amount !== undefined ? input.amount : existing.amount,
      details: input.details !== undefined ? input.details : existing.details,
      customFields: { ...metadata, localEditedAt: new Date().toISOString(), outboundSyncStatus: "PENDING" } as Prisma.InputJsonObject,
    },
  });
  await recordAuditEvent(context, {
    action: "CLIENT_CRM_RECORD_UPDATED", entityType: "CLIENT_CRM_RECORD", entityId: updated.id,
    requestId: "crm-record-update-" + updated.id, source: "PLATFORM", clientAccountId: context.activeClientAccountId,
    metadata: { recordType: updated.recordType, name: updated.name },
  });

  // Client edits must not infer an agency contact by email or write agency data.
  let outboundStatus: ClientCrmOutboundStatus = "UNMAPPED";
  let outboundError: string | null = null;
  try {
    const connection = isClientCrmProvider(existing.provider) && existing.connectionId
      ? await resolveClientCrmConnection(context, context.activeClientAccountId, existing.provider, existing.connectionId)
      : null;
    if (!isClientCrmProvider(existing.provider)) {
      outboundStatus = "UNSUPPORTED";
    } else if (!existing.connectionId) {
      outboundStatus = "UNMAPPED";
    } else if (!connection) {
      outboundStatus = "NOT_CONNECTED";
    } else if (!hasVerifiedProviderMapping(existing, connection)) {
      outboundStatus = "UNMAPPED";
    } else if (connection.provider === "ZOHO") {
      const recordType = existing.recordType;
      if (recordType !== "CONTACT" && recordType !== "DEAL" && recordType !== "NOTE") {
        outboundStatus = "UNSUPPORTED";
      } else {
        const parts = updated.name.trim().split(/\s+/);
        const data = recordType === "CONTACT"
          ? { First_Name: parts[0] || "", Last_Name: parts.slice(1).join(" ") || "Contact", Email: updated.email, Phone: updated.phone, Description: updated.details }
          : recordType === "DEAL"
          ? { Deal_Name: updated.name, Amount: updated.amount ? Number(updated.amount) : undefined, Stage: updated.stage || "Closed Won", Description: updated.details }
          : { Note_Title: updated.name || "Note", Note_Content: updated.details || "" };
        await createOrUpdateZohoRecord(connection, recordType, data, existing.externalId!);
        outboundStatus = "COMPLETED";
      }
    } else {
      const recordType = existing.recordType;
      if (recordType === "ACTIVITY") {
        outboundStatus = "UNSUPPORTED";
      } else {
        const parts = updated.name.trim().split(/\s+/);
        await createOrUpdateActiveCampaignRecord(connection, recordType, {
          name: updated.name, email: updated.email, phone: updated.phone,
          firstName: parts[0] || "", lastName: parts.slice(1).join(" ") || "",
          companyName: updated.companyName, title: updated.name, value: updated.amount,
        }, existing.externalId!);
        outboundStatus = "COMPLETED";
      }
    }
  } catch {
    outboundStatus = "FAILED";
    outboundError = "The client CRM update failed. The local edit was retained.";
  }

  const saved = await prisma.clientCrmRecord.update({
    where: { id: updated.id },
    data: {
      ...(outboundStatus === "COMPLETED" ? { lastSyncedAt: new Date() } : {}),
      customFields: { ...recordMetadata(updated.customFields), outboundSyncStatus: outboundStatus, outboundSyncError: outboundError } as Prisma.InputJsonObject,
    },
  });
  return { record: formatClientCrmRecord(saved), outboundStatus };
}

/** Explicit provider import only; agency-to-client transfer is a deal handoff. */
export async function syncClientCrm(
  context: RequestContext,
  provider: ClientCrmProvider = "ZOHO",
  connectionId?: string,
): Promise<{ count: number }> {
  await assertClientAccess(context.user, context.activeClientAccountId);
  if (!isClientCrmProvider(provider)) {
    throw new AppError("CRM_PROVIDER_UNAVAILABLE", 422, "Unsupported client CRM provider.", "Choose a supported client CRM provider.");
  }
  const connection = await resolveClientCrmConnection(context, context.activeClientAccountId, provider, connectionId);
  if (!connection) {
    throw new AppError("CRM_PROVIDER_UNAVAILABLE", 409, "No usable client CRM connection.", "Connect the selected client's CRM before importing records.");
  }

  let count = 0;
  try {
    const records = provider === "ZOHO" ? await fetchZohoRecords(connection) : await fetchActiveCampaignRecords(connection);
    if (records.some((record) => typeof record.externalId !== "string" || !record.externalId.trim())) {
      throw new Error("Provider import did not return valid record identifiers.");
    }
    for (const record of records) {
      const key = { connectionId: connection.id, recordType: record.recordType, externalId: record.externalId };
      const existing = await prisma.clientCrmRecord.findUnique({ where: { connectionId_recordType_externalId: key } });
      const customFields = {
        ...recordMetadata(existing?.customFields), source: "PROVIDER_IMPORT", providerRecordId: record.externalId,
      } as Prisma.InputJsonObject;
      const fields = {
        name: record.name, email: record.email, phone: record.phone, companyName: record.companyName,
        status: record.status, stage: record.stage, amount: record.amount, details: record.details,
        customFields, lastSyncedAt: new Date(),
      };
      await prisma.clientCrmRecord.upsert({
        where: { connectionId_recordType_externalId: key },
        update: { ...fields, provider: connection.provider },
        create: { ...fields, ...key, organizationId: context.user.organizationId, clientAccountId: context.activeClientAccountId, provider: connection.provider },
      });
      count += 1;
    }
    await recordAuditEvent(context, {
      action: "CLIENT_CRM_SYNC_COMPLETED", entityType: "CLIENT_CRM", requestId: "crm-sync-" + connection.id,
      source: provider, clientAccountId: context.activeClientAccountId, metadata: { count, provider },
    });
  } catch {
    await recordAuditEvent(context, {
      action: "CLIENT_CRM_SYNC_FAILED", entityType: "CLIENT_CRM", requestId: "crm-sync-" + connection.id,
      source: provider, clientAccountId: context.activeClientAccountId, metadata: { count, provider },
    });
    throw new AppError("SYNC_FAILED", 502, "Client CRM import failed.", "Client CRM import failed. Saved records were retained; retry the sync.");
  }
  return { count };
}

function formatClientCrmRecord(record: ClientCrmRecord): ClientCrmRecordSummary {
  return {
    id: record.id, organizationId: record.organizationId, clientAccountId: record.clientAccountId,
    connectionId: record.connectionId, provider: record.provider, recordType: record.recordType,
    externalId: record.externalId, name: record.name, email: record.email, phone: record.phone,
    companyName: record.companyName, status: record.status, stage: record.stage, amount: record.amount,
    details: record.details, customFields: record.customFields as Record<string, unknown> | null,
    lastSyncedAt: record.lastSyncedAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(), updatedAt: record.updatedAt.toISOString(),
  };
}
