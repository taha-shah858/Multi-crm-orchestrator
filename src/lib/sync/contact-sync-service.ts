import { AppError } from "@/lib/errors/app-error";
import { getCrmAdapter } from "@/lib/integrations/registry";
import type { ContactWriteInput } from "@/lib/integrations/types";
import type { IntegrationConnection } from "@prisma/client";
import type { NormalizedContact } from "@/lib/models/contact";
import type { RequestContext } from "@/lib/models/canonical";
import { prisma } from "@/lib/db/prisma";
import { recordAuditEvent } from "@/lib/audit/audit-log";
import { assertClientAccess } from "@/lib/auth/auth-service";
import {
  activeClientIntegrationWhere,
  hubspotConnectionWhere,
} from "@/lib/integrations/connection-resolution";
import { normalizeRichTextToPlainText } from "@/lib/text/plain-text";

export interface ContactSyncSummary {
  contacts: NormalizedContact[];
  recordsRead: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsFailed: number;
  runs: Array<{
    id: string;
    provider: string;
    status: "COMPLETED" | "FAILED";
    error?: string;
  }>;
}

export interface PersistedContactSummary {
  id: string;
  externalId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  sourceCrm: "HubSpot" | "Mock CRM" | "Salesforce" | "Zoho" | "Pipedrive";
  createdAt: Date;
  updatedAt: Date;
  crmOwner: { id: string; displayName: string; email: string | null } | null;
  companyDetails: {
    id: string;
    name: string;
    domain: string | null;
    website: string | null;
    phone: string | null;
    industry: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    address: string | null;
  } | null;
  deals: Array<{
    id: string;
    title: string;
    valueCents: number;
    currency: string;
    status: "OPEN" | "CLOSED_WON" | "CLOSED_LOST";
    pipelineId: string | null;
    pipelineLabel: string | null;
    stageId: string | null;
    stageLabel: string | null;
    expectedCloseAt: Date | null;
    closedAt: Date | null;
    owner: { id: string; displayName: string; email: string | null } | null;
    company: { id: string; name: string } | null;
  }>;
  recentActivities: Array<{
    id: string;
    type: string;
    subject: string | null;
    body: string;
    occurredAt: Date;
    source: string;
  }>;
}

export interface ContactUpdateInput {
  firstName?: unknown;
  lastName?: unknown;
  email?: unknown;
  phone?: unknown;
  company?: unknown;
}

export interface OutboundContactSyncResult {
  status: "COMPLETED" | "FAILED" | "NOT_MAPPED";
  provider?: "HUBSPOT";
  retryable: boolean;
  error?: string;
}

function auditSourceForProvider(provider: string): "PLATFORM" | "HUBSPOT" | "MOCK" {
  if (provider === "HUBSPOT") return "HUBSPOT";
  if (provider === "MOCK") return "MOCK";
  return "PLATFORM";
}

function sourceCrmForProvider(
  provider: string,
): PersistedContactSummary["sourceCrm"] {
  switch (provider) {
    case "HUBSPOT":
      return "HubSpot";
    case "MOCK":
      return "Mock CRM";
    case "ZOHO":
      return "Zoho";
    case "PIPEDRIVE":
      return "Pipedrive";
    default:
      return "Salesforce";
  }
}

/**
 * Re-validates the selected client account for service callers that may be
 * invoked outside their normal route handler boundary.
 */
export async function prepareActiveClientSync(context: RequestContext) {
  await assertClientAccess(context.user, context.activeClientAccountId);
}

export async function persistContacts(
  context: RequestContext,
  connectionId: string,
  contacts: NormalizedContact[],
) {
  let recordsCreated = 0;
  let recordsUpdated = 0;

  await prisma.$transaction(async (transaction) => {
    for (const contact of contacts) {
      const existing = await transaction.externalRecord.findUnique({
        where: {
          connectionId_objectType_externalId: {
            connectionId,
            objectType: "CONTACT",
            externalId: contact.id,
          },
        },
      });

      const data = {
        firstName: contact.first_name,
        lastName: contact.last_name,
        email: contact.email || null,
        phone: contact.phone || null,
        company: contact.company || null,
      };

      if (existing?.contactId) {
        await transaction.contact.update({ where: { id: existing.contactId }, data });
        await transaction.externalRecord.update({
          where: { id: existing.id },
          data: { lastSyncedAt: new Date() },
        });
        recordsUpdated += 1;
        continue;
      }

      await transaction.contact.create({
        data: {
          organizationId: context.user.organizationId,
          clientAccountId: context.activeClientAccountId,
          ...data,
          externalRecords: {
            create: {
              clientAccountId: context.activeClientAccountId,
              connectionId,
              objectType: "CONTACT",
              externalId: contact.id,
              lastSyncedAt: new Date(),
            },
          },
        },
      });
      recordsCreated += 1;
    }
  });

  return { recordsCreated, recordsUpdated };
}

/** Manually syncs every connected CRM attached to the active client account. */
export async function syncActiveClientContacts(
  context: RequestContext,
  requestId: string,
): Promise<ContactSyncSummary> {
  await prepareActiveClientSync(context);

  const connections = await prisma.integrationConnection.findMany({
    where: activeClientIntegrationWhere(context),
    orderBy: { provider: "asc" },
  });

  if (connections.length === 0) {
    throw new AppError(
      "SYNC_CONNECTION_NOT_FOUND",
      409,
      "No connected CRM was found for the active client account.",
      "Connect a CRM for the selected client account before syncing.",
    );
  }

  const summary: ContactSyncSummary = {
    contacts: [],
    recordsRead: 0,
    recordsCreated: 0,
    recordsUpdated: 0,
    recordsFailed: 0,
    runs: [],
  };

  for (const connection of connections) {
    const result = await syncSingleConnectionContacts(context, connection, requestId);
    summary.contacts.push(...result.contacts);
    summary.recordsRead += result.recordsRead;
    summary.recordsCreated += result.recordsCreated;
    summary.recordsUpdated += result.recordsUpdated;
    summary.recordsFailed += result.recordsFailed;
    summary.runs.push(...result.runs);
  }

  if (summary.runs.every((run) => run.status === "FAILED")) {
    const firstFailure = summary.runs.find((run) => run.error)?.error;
    throw new AppError(
      "SYNC_FAILED",
      502,
      "All CRM sync runs failed.",
      firstFailure ?? "The sync could not be completed. Review sync history and retry manually.",
    );
  }

  return summary;
}

/** Runs one client-owned connection through the same canonical contact pipeline. */
export async function syncSingleConnectionContacts(
  context: RequestContext,
  connection: IntegrationConnection,
  requestId: string,
): Promise<ContactSyncSummary> {
  await prepareActiveClientSync(context);
  const isCompanyConnection = connection.ownershipType === "COMPANY" && connection.organizationId === context.user.organizationId;
  const isClientConnection = connection.ownershipType === "CLIENT_ACCOUNT" && connection.organizationId === context.user.organizationId && connection.clientAccountId === context.activeClientAccountId;

  if (!isCompanyConnection && !isClientConnection) {
    throw new AppError("CLIENT_ACCESS_DENIED", 403, "Connection is outside the active client account.", "Choose an integration connected to the active client account.");
  }

  if (connection.provider === "HUBSPOT") {
    const { syncHubSpotSalesCrm } = await import("@/lib/sync/hubspot-sales-sync-service");
    return syncHubSpotSalesCrm(context, connection, requestId);
  }

  if (connection.provider === "ACTIVECAMPAIGN") {
    const { syncClientCrm } = await import("@/lib/client-crm/client-crm-service");
    const syncRes = await syncClientCrm(context);
    return {
      contacts: [],
      recordsRead: syncRes.count,
      recordsCreated: syncRes.count,
      recordsUpdated: 0,
      recordsFailed: 0,
      runs: [{ id: connection.id, provider: "ACTIVECAMPAIGN", status: "COMPLETED" }],
    };
  }

  const adapter = getCrmAdapter(connection.provider);
  if (!adapter.listContacts) {
    throw new AppError("CRM_PROVIDER_UNAVAILABLE", 422, `${connection.provider} does not support contact imports.`, "This provider cannot synchronize contacts.");
  }

  const syncRun = await prisma.syncRun.create({
    data: {
      organizationId: context.user.organizationId,
      clientAccountId: context.activeClientAccountId,
      connectionId: connection.id,
      userId: context.user.id,
      provider: connection.provider,
      trigger: "MANUAL",
      status: "RUNNING",
    },
  });

  await recordAuditEvent(context, {
    action: "CONTACT_SYNC_STARTED",
    entityType: "SYNC_RUN",
    entityId: syncRun.id,
    requestId,
    source: "PLATFORM",
    metadata: { provider: connection.provider },
  });

  try {
    const contacts = await adapter.listContacts(connection, { limit: 100 });
    const persisted = await persistContacts(context, connection.id, contacts);

      await prisma.$transaction([
        prisma.syncRun.update({
          where: { id: syncRun.id },
          data: {
            status: "COMPLETED",
            recordsRead: contacts.length,
            recordsCreated: persisted.recordsCreated,
            recordsUpdated: persisted.recordsUpdated,
            completedAt: new Date(),
          },
        }),
        prisma.integrationConnection.update({ where: { id: connection.id }, data: { lastSyncAt: new Date(), lastError: null, status: "CONNECTED" } }),
      ]);

      await recordAuditEvent(context, {
        action: "CONTACT_SYNC_COMPLETED",
        entityType: "SYNC_RUN",
        entityId: syncRun.id,
        requestId,
        source: auditSourceForProvider(connection.provider),
        metadata: {
          provider: connection.provider,
          recordsRead: contacts.length,
          recordsCreated: persisted.recordsCreated,
          recordsUpdated: persisted.recordsUpdated,
        },
      });

    return {
      contacts,
      recordsRead: contacts.length,
      recordsCreated: persisted.recordsCreated,
      recordsUpdated: persisted.recordsUpdated,
      recordsFailed: 0,
      runs: [{ id: syncRun.id, provider: connection.provider, status: "COMPLETED" }],
    };
  } catch (error) {
      const message = error instanceof Error ? error.message : "CRM sync failed.";
      await prisma.$transaction([
        prisma.syncRun.update({
          where: { id: syncRun.id },
          data: { status: "FAILED", recordsFailed: 1, errorMessage: message, completedAt: new Date() },
        }),
        prisma.integrationConnection.update({ where: { id: connection.id }, data: { lastError: message, status: "DEGRADED" } }),
      ]);
      await recordAuditEvent(context, {
        action: "CONTACT_SYNC_FAILED",
        entityType: "SYNC_RUN",
        entityId: syncRun.id,
        requestId,
        source: auditSourceForProvider(connection.provider),
        metadata: { provider: connection.provider },
      });

      const safeError = error instanceof AppError
        ? error.safeMessage
        : "The CRM sync failed. Review sync history and retry manually.";

    return {
      contacts: [], recordsRead: 0, recordsCreated: 0, recordsUpdated: 0, recordsFailed: 1,
      runs: [{ id: syncRun.id, provider: connection.provider, status: "FAILED", error: safeError }],
    };
  }
}

function normalizeContactUpdate(input: ContactUpdateInput): ContactWriteInput {
  const fields = ["firstName", "lastName", "email", "phone", "company"] as const;
  const provided = fields.filter((field) => input[field] !== undefined);
  if (provided.length === 0) {
    throw new AppError("INVALID_CONTACT_INPUT", 422, "No editable contact fields were supplied.", "Enter at least one contact field to save.");
  }

  const readRequired = (field: "firstName" | "lastName") => {
    const value = input[field];
    if (typeof value !== "string" || !value.trim()) {
      throw new AppError("INVALID_CONTACT_INPUT", 422, `${field} must be a non-empty string.`, "First and last name are required.");
    }
    return value.trim();
  };
  const readNullable = (field: "email" | "phone" | "company") => {
    const value = input[field];
    if (value === null) return null;
    if (typeof value !== "string") {
      throw new AppError("INVALID_CONTACT_INPUT", 422, `${field} must be a string or null.`, "Contact details must contain valid text.");
    }
    return value.trim() || null;
  };

  return {
    firstName: readRequired("firstName"),
    lastName: readRequired("lastName"),
    email: readNullable("email"),
    phone: readNullable("phone"),
    company: readNullable("company"),
  };
}

async function syncContactToHubSpot(
  context: RequestContext,
  contact: { id: string; firstName: string; lastName: string; email: string | null; phone: string | null; company: string | null },
  requestId: string,
): Promise<OutboundContactSyncResult> {
  const mappings = await prisma.externalRecord.findMany({
    where: {
      contactId: contact.id,
      objectType: "CONTACT",
      connection: hubspotConnectionWhere(context),
    },
    include: { connection: true },
  });

  if (mappings.length === 0) {
    return { status: "NOT_MAPPED", retryable: false };
  }

  const mapping = mappings[0];
  const syncRun = await prisma.syncRun.create({
    data: {
      organizationId: context.user.organizationId,
      clientAccountId: context.activeClientAccountId,
      connectionId: mapping.connectionId,
      userId: context.user.id,
      provider: "HUBSPOT",
      trigger: "MANUAL",
      status: "RUNNING",
    },
  });

  try {
    const adapter = getCrmAdapter("HUBSPOT");
    if (!adapter.updateContact) {
      throw new AppError("CRM_PROVIDER_UNAVAILABLE", 422, "HubSpot contact writes are unavailable.", "HubSpot cannot update this contact right now.");
    }
    await adapter.updateContact(mapping.connection, mapping.externalId, contact);
    await prisma.$transaction([
      prisma.externalRecord.update({ where: { id: mapping.id }, data: { lastSyncedAt: new Date() } }),
      prisma.syncRun.update({
        where: { id: syncRun.id },
        data: { status: "COMPLETED", recordsUpdated: 1, completedAt: new Date() },
      }),
    ]);
    await recordAuditEvent(context, {
      action: "CONTACT_OUTBOUND_SYNC_COMPLETED",
      entityType: "CONTACT",
      entityId: contact.id,
      requestId,
      source: "HUBSPOT",
      metadata: { provider: "HUBSPOT", direction: "OUTBOUND", externalId: mapping.externalId },
    });
    return { status: "COMPLETED", provider: "HUBSPOT", retryable: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : "HubSpot contact update failed.";
    const safeMessage = error instanceof AppError
      ? error.safeMessage
      : "HubSpot could not update this contact. Your local edit is saved; retry when the connection is available.";
    await prisma.syncRun.update({
      where: { id: syncRun.id },
      data: { status: "FAILED", recordsFailed: 1, errorMessage: message, completedAt: new Date() },
    });
    await recordAuditEvent(context, {
      action: "CONTACT_OUTBOUND_SYNC_FAILED",
      entityType: "CONTACT",
      entityId: contact.id,
      requestId,
      source: "HUBSPOT",
      metadata: { provider: "HUBSPOT", direction: "OUTBOUND", externalId: mapping.externalId },
    });
    return { status: "FAILED", provider: "HUBSPOT", retryable: true, error: safeMessage };
  }
}

/** Saves the canonical record first, then best-effort writes its mapped HubSpot record. */
export async function updateActiveClientContact(
  context: RequestContext,
  contactId: string,
  input: ContactUpdateInput,
  requestId: string,
) {
  await prepareActiveClientSync(context);
  const existing = await prisma.contact.findFirst({
    where: {
      id: contactId,
      organizationId: context.user.organizationId,
      clientAccountId: context.activeClientAccountId,
    },
  });
  if (!existing) {
    throw new AppError("CONTACT_NOT_FOUND", 404, "Contact is outside active client.", "This contact is not available for the selected client account.");
  }

  const data = normalizeContactUpdate({ ...existing, ...input });
  const persisted = await prisma.contact.update({ where: { id: contactId }, data });
  await recordAuditEvent(context, {
    action: "CONTACT_UPDATED",
    entityType: "CONTACT",
    entityId: contactId,
    requestId,
    source: "PLATFORM",
  });
  const outboundSync = await syncContactToHubSpot(context, persisted, requestId);
  return { contact: persisted, outboundSync };
}

/** Retries a previously failed outbound write without changing the canonical record. */
export async function retryActiveClientContactOutboundSync(
  context: RequestContext,
  contactId: string,
  requestId: string,
) {
  await prepareActiveClientSync(context);
  const contact = await prisma.contact.findFirst({
    where: {
      id: contactId,
      organizationId: context.user.organizationId,
      clientAccountId: context.activeClientAccountId,
    },
  });
  if (!contact) {
    throw new AppError("CONTACT_NOT_FOUND", 404, "Contact is outside active client.", "This contact is not available for the selected client account.");
  }
  return { contact, outboundSync: await syncContactToHubSpot(context, contact, requestId) };
}

export async function getActiveClientSyncHistory(context: RequestContext) {
  await prepareActiveClientSync(context);

  return prisma.syncRun.findMany({
    where: {
      organizationId: context.user.organizationId,
      clientAccountId: context.activeClientAccountId,
    },
    orderBy: { startedAt: "desc" },
    take: 25,
    select: {
      id: true,
      provider: true,
      trigger: true,
      status: true,
      recordsRead: true,
      recordsCreated: true,
      recordsUpdated: true,
      recordsFailed: true,
      categoryCounts: true,
      errorMessage: true,
      startedAt: true,
      completedAt: true,
    },
  });
}

/** Returns canonical contacts persisted for the currently selected client only. */
export async function getActiveClientContacts(
  context: RequestContext,
  options?: { scope?: "agency" | "client"; clientAccountId?: string },
): Promise<PersistedContactSummary[]> {
  await prepareActiveClientSync(context);

  const whereCondition: Record<string, unknown> = {
    organizationId: context.user.organizationId,
  };

  if (options?.scope === "agency") {
    if (options.clientAccountId) {
      whereCondition.clientAccountId = options.clientAccountId;
    }
  } else {
    whereCondition.clientAccountId = options?.clientAccountId || context.activeClientAccountId;
  }

  const contacts = await prisma.contact.findMany({
    where: whereCondition,
    include: {
      crmOwner: { select: { id: true, displayName: true, email: true } },
      crmCompany: { select: { id: true, name: true, domain: true, website: true, phone: true, industry: true, city: true, state: true, country: true, address: true } },
      dealLinks: { include: { deal: { include: { crmOwner: { select: { id: true, displayName: true, email: true } }, company: { select: { id: true, name: true } } } } } },
      deals: { include: { crmOwner: { select: { id: true, displayName: true, email: true } }, company: { select: { id: true, name: true } } } },
      interactions: { orderBy: { occurredAt: "desc" }, take: 10, select: { id: true, type: true, subject: true, body: true, occurredAt: true, source: true } },
      externalRecords: {
        include: { connection: { select: { provider: true } } },
        orderBy: { updatedAt: "desc" },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return contacts.flatMap((contact) => {
    const externalRecord = contact.externalRecords[0];
    if (!externalRecord) return [];

    const deals = [...contact.dealLinks.map((link) => link.deal), ...contact.deals]
      .filter((deal, index, all) => all.findIndex((candidate) => candidate.id === deal.id) === index)
      .map((deal) => ({ id: deal.id, title: deal.title, valueCents: deal.valueCents, currency: deal.currency, status: deal.status, pipelineId: deal.pipelineId, pipelineLabel: deal.pipelineLabel, stageId: deal.stageId, stageLabel: deal.stageLabel, expectedCloseAt: deal.expectedCloseAt, closedAt: deal.closedAt, owner: deal.crmOwner, company: deal.company }));
    return [{
      id: contact.id,
      externalId: externalRecord.externalId,
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: contact.email,
      phone: contact.phone,
      company: contact.company,
      sourceCrm: sourceCrmForProvider(externalRecord.connection.provider),
      createdAt: contact.createdAt,
      updatedAt: contact.updatedAt,
      crmOwner: contact.crmOwner,
      companyDetails: contact.crmCompany,
      deals,
      recentActivities: contact.interactions.map((interaction) => ({
        ...interaction,
        body: interaction.source === "HUBSPOT"
          ? normalizeRichTextToPlainText(interaction.body) ?? "Activity logged in HubSpot"
          : interaction.body,
      })),
    }];
  });
}

export const getUnifiedLeads = (
  context: RequestContext,
  filter?: { clientAccountId?: string },
) => getActiveClientContacts(context, { scope: "agency", clientAccountId: filter?.clientAccountId });

export const updateAgencyContact = updateActiveClientContact;
