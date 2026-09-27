import "server-only";

import type { DealStatus } from "@prisma/client";
import { recordAuditEvent } from "@/lib/audit/audit-log";
import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/errors/app-error";
import { getIntegrationAdapter } from "@/lib/integrations/registry";
import {
  activeClientIntegrationWhere,
  hubspotConnectionWhere,
} from "@/lib/integrations/connection-resolution";
import type { CompanyWriteInput, DealWriteInput } from "@/lib/integrations/types";
import type { RequestContext } from "@/lib/models/canonical";
import { prepareActiveClientSync } from "@/lib/sync/contact-sync-service";
import { createDealHandoffFromAgencyDeal } from "@/lib/handoff/handoff-service";

type Input = Record<string, unknown>;
const text = (value: unknown) => typeof value === "string" ? value.trim() : "";
const nullableText = (value: unknown) => value === null ? null : typeof value === "string" ? value.trim() || null : undefined;

function dateValue(value: unknown) {
  if (value === null || value === "") return null;
  if (typeof value !== "string") return undefined;
  const result = new Date(value);
  if (Number.isNaN(result.getTime())) throw new AppError("INVALID_DEAL_INPUT", 422, "Expected close date is invalid.", "Enter a valid expected close date.");
  return result;
}

export async function updateAgencyCompany(context: RequestContext, companyId: string, input: Input, requestId: string) {
  await prepareActiveClientSync(context);
  // An agency company belongs to the agency organization
  const company = await prisma.crmCompany.findFirst({
    where: {
      id: companyId,
      organizationId: context.user.organizationId,
      ...(context.activeClientAccountId ? { clientAccountId: context.activeClientAccountId } : {}),
    },
  });
  if (!company) throw new AppError("COMPANY_NOT_FOUND", 404, "CRM company is outside the active client.", "Choose a company from the active client account.");

  const values = {
    name: input.name === undefined ? company.name : text(input.name),
    domain: input.domain === undefined ? company.domain : nullableText(input.domain),
    website: input.website === undefined ? company.website : nullableText(input.website),
    phone: input.phone === undefined ? company.phone : nullableText(input.phone),
    industry: input.industry === undefined ? company.industry : nullableText(input.industry),
    city: input.city === undefined ? company.city : nullableText(input.city),
    state: input.state === undefined ? company.state : nullableText(input.state),
    country: input.country === undefined ? company.country : nullableText(input.country),
    address: input.address === undefined ? company.address : nullableText(input.address),
  };
  if (!values.name || Object.values(values).some((value) => value === undefined)) throw new AppError("INVALID_COMPANY_INPUT", 422, "Company fields are invalid.", "Enter a company name and valid text values.");
  const persisted = await prisma.crmCompany.update({ where: { id: company.id }, data: values });
  await recordAuditEvent(context, { action: "COMPANY_UPDATED", entityType: "CRM_COMPANY", entityId: company.id, requestId, source: "PLATFORM", metadata: { localFirst: true } });

  const mapping = await prisma.externalRecord.findFirst({
    where: {
      crmCompanyId: company.id,
      objectType: "COMPANY",
      connection: hubspotConnectionWhere(context),
    },
    include: { connection: true },
  });

  if (!mapping) return { company: persisted, outboundSync: { status: "NOT_MAPPED" as const, retryable: false } };
  try {
    const adapter = getIntegrationAdapter("HUBSPOT");
    if (!adapter.updateCompany) throw new Error("HubSpot company writes are unavailable.");
    await adapter.updateCompany(mapping.connection, mapping.externalId, values as CompanyWriteInput);
    await prisma.externalRecord.update({ where: { id: mapping.id }, data: { lastSyncedAt: new Date() } });
    await recordAuditEvent(context, { action: "COMPANY_OUTBOUND_SYNC_COMPLETED", entityType: "CRM_COMPANY", entityId: company.id, requestId, source: "HUBSPOT", metadata: { externalId: mapping.externalId } });
    return { company: persisted, outboundSync: { status: "COMPLETED" as const, retryable: false } };
  } catch (error) {
    const safeMessage = error instanceof AppError ? error.safeMessage : "HubSpot could not update this company. Your local edit is saved; retry later.";
    await recordAuditEvent(context, { action: "COMPANY_OUTBOUND_SYNC_FAILED", entityType: "CRM_COMPANY", entityId: company.id, requestId, source: "HUBSPOT", metadata: { externalId: mapping.externalId } });
    return { company: persisted, outboundSync: { status: "FAILED" as const, retryable: true, error: safeMessage } };
  }
}

export async function updateAgencyDeal(context: RequestContext, dealId: string, input: Input, requestId: string) {
  await prepareActiveClientSync(context);
  // An Agency Deal belongs to the agency organization, associated with its clientAccountId
  const deal = await prisma.deal.findFirst({
    where: {
      id: dealId,
      organizationId: context.user.organizationId,
      ...(context.activeClientAccountId ? { clientAccountId: context.activeClientAccountId } : {}),
    },
  });
  if (!deal) throw new AppError("DEAL_NOT_FOUND", 404, "Deal is outside the active client.", "Choose a deal from the active client account.");

  const amount = input.amount === undefined ? deal.valueCents / 100 : Number(input.amount);
  if (!Number.isFinite(amount) || amount < 0) throw new AppError("INVALID_DEAL_INPUT", 422, "Deal amount is invalid.", "Enter a valid non-negative deal amount.");
  const crmOwnerId = input.crmOwnerId === undefined ? deal.crmOwnerId : nullableText(input.crmOwnerId);
  if (crmOwnerId === undefined) throw new AppError("INVALID_DEAL_INPUT", 422, "Deal owner is invalid.", "Choose a valid CRM owner.");
  const title = input.title === undefined ? deal.title : text(input.title);
  if (!title) throw new AppError("INVALID_DEAL_INPUT", 422, "Deal title is required.", "Enter a deal title.");

  const newStatus = input.status === "CLOSED_WON" || input.status === "CLOSED_LOST" || input.status === "OPEN"
    ? input.status
    : typeof input.stageLabel === "string" && input.stageLabel.toLowerCase().includes("won")
    ? "CLOSED_WON"
    : typeof input.stageLabel === "string" && input.stageLabel.toLowerCase().includes("lost")
    ? "CLOSED_LOST"
    : deal.status;

  const closedAt = newStatus === "CLOSED_WON"
    ? deal.closedAt || new Date()
    : newStatus === "CLOSED_LOST"
    ? deal.closedAt || new Date()
    : null;

  const persisted = await prisma.deal.update({
    where: { id: deal.id },
    data: {
      title,
      valueCents: Math.round(amount * 100),
      status: newStatus,
      closedAt,
      pipelineId: input.pipelineId === undefined ? deal.pipelineId : nullableText(input.pipelineId),
      stageId: input.stageId === undefined ? deal.stageId : nullableText(input.stageId),
      stageLabel: input.stageLabel === undefined ? deal.stageLabel : nullableText(input.stageLabel),
      expectedCloseAt: input.expectedCloseAt === undefined ? deal.expectedCloseAt : dateValue(input.expectedCloseAt),
      crmOwnerId,
    },
  });
  await recordAuditEvent(context, { action: "DEAL_UPDATED", entityType: "DEAL", entityId: deal.id, requestId, source: "PLATFORM", metadata: { localFirst: true } });

  // When an Agency Deal becomes CLOSED_WON, trigger the Deal Handoff to its associated client CRM
  let handoff = null;
  if (persisted.status === "CLOSED_WON") {
    try {
      handoff = await createDealHandoffFromAgencyDeal(context, persisted.id, {
        closeOutcome: typeof input.closeOutcome === "string" ? input.closeOutcome : "Client accepted proposal",
        recommendedNextAction: typeof input.recommendedNextAction === "string" ? input.recommendedNextAction : "Begin onboarding",
        notes: typeof input.notes === "string" ? input.notes : persisted.notes || undefined,
      });
    } catch {
      // Handoff failures are tracked on the handoff record and must never roll back or corrupt the Agency Deal
    }
  }

  const mapping = await prisma.externalRecord.findFirst({
    where: {
      dealId: deal.id,
      objectType: "DEAL",
      connection: hubspotConnectionWhere(context),
    },
    include: { connection: true },
  });

  if (!mapping) return { deal: persisted, handoff, outboundSync: { status: "NOT_MAPPED" as const, retryable: false } };
  try {
    let ownerExternalId: string | null = null;
    if (persisted.crmOwnerId) {
      const ownerMapping = await prisma.externalRecord.findFirst({ where: { connectionId: mapping.connectionId, objectType: "OWNER", crmOwnerId: persisted.crmOwnerId }, select: { externalId: true } });
      if (!ownerMapping) throw new AppError("INVALID_DEAL_OWNER", 422, "Deal owner has no mapping for this HubSpot account.", "Choose an owner synchronized from the connected HubSpot account.");
      ownerExternalId = ownerMapping.externalId;
    }
    const outbound: DealWriteInput = { name: persisted.title, amount: (persisted.valueCents / 100).toFixed(2), pipelineId: persisted.pipelineId, stageId: persisted.stageId, expectedCloseAt: persisted.expectedCloseAt, ownerExternalId };
    const adapter = getIntegrationAdapter("HUBSPOT");
    if (!adapter.updateDeal) throw new Error("HubSpot deal writes are unavailable.");
    await adapter.updateDeal(mapping.connection, mapping.externalId, outbound);
    await prisma.externalRecord.update({ where: { id: mapping.id }, data: { lastSyncedAt: new Date() } });
    await recordAuditEvent(context, { action: "DEAL_OUTBOUND_SYNC_COMPLETED", entityType: "DEAL", entityId: deal.id, requestId, source: "HUBSPOT", metadata: { externalId: mapping.externalId } });
    return { deal: persisted, handoff, outboundSync: { status: "COMPLETED" as const, retryable: false } };
  } catch (error) {
    const safeMessage = error instanceof AppError ? error.safeMessage : "HubSpot could not update this deal. Your local edit is saved; retry later.";
    await recordAuditEvent(context, { action: "DEAL_OUTBOUND_SYNC_FAILED", entityType: "DEAL", entityId: deal.id, requestId, source: "HUBSPOT", metadata: { externalId: mapping.externalId } });
    return { deal: persisted, handoff, outboundSync: { status: "FAILED" as const, retryable: true, error: safeMessage } };
  }
}

export function retryAgencyCompanySync(context: RequestContext, companyId: string, requestId: string) {
  return updateAgencyCompany(context, companyId, {}, requestId);
}

export function retryAgencyDealSync(context: RequestContext, dealId: string, requestId: string) {
  return updateAgencyDeal(context, dealId, {}, requestId);
}

export async function createAgencyDeal(
  context: RequestContext,
  input: {
    title?: unknown;
    amount?: unknown;
    contactId?: unknown;
    clientAccountId?: unknown;
    stageLabel?: unknown;
    stage?: unknown;
    status?: unknown;
    expectedCloseAt?: unknown;
    notes?: unknown;
    closeOutcome?: unknown;
    recommendedNextAction?: unknown;
  },
  requestId: string,
) {
  await prepareActiveClientSync(context);

  const title = text(input.title);
  if (!title) {
    throw new AppError("INVALID_DEAL_INPUT", 422, "Deal title is required.", "Enter a valid deal title.");
  }

  const rawAmount = Number(input.amount);
  if (Number.isNaN(rawAmount) || rawAmount < 0) {
    throw new AppError("INVALID_DEAL_INPUT", 422, "Deal amount must be a positive number.", "Enter a valid amount in USD.");
  }

  let contact = null;
  const contactIdStr = typeof input.contactId === "string" ? input.contactId.trim() : null;
  if (contactIdStr) {
    contact = await prisma.contact.findFirst({
      where: {
        id: contactIdStr,
        organizationId: context.user.organizationId,
      },
      include: {
        crmCompany: true,
      },
    });

    if (!contact) {
      // Check if contactIdStr is a ClientCrmRecord ID or externalId
      const clientRecord = await prisma.clientCrmRecord.findFirst({
        where: {
          organizationId: context.user.organizationId,
          recordType: "CONTACT",
          OR: [
            { id: contactIdStr },
            { externalId: contactIdStr },
          ],
        },
      });

      if (clientRecord) {
        const canonicalId =
          (typeof clientRecord.customFields === "object" && clientRecord.customFields && "contactId" in clientRecord.customFields
            ? (clientRecord.customFields as Record<string, unknown>).contactId
            : null) as string | null;

        if (canonicalId) {
          contact = await prisma.contact.findFirst({
            where: {
              id: canonicalId,
              organizationId: context.user.organizationId,
            },
            include: {
              crmCompany: true,
            },
          });
        }
      }
    }
  }

  const clientAccountId =
    (typeof input.clientAccountId === "string" && input.clientAccountId) ||
    contact?.clientAccountId ||
    context.activeClientAccountId;

  if (!clientAccountId) {
    throw new AppError("CLIENT_CONTEXT_REQUIRED", 422, "Client account context is required.", "Select an active client account.");
  }

  const statusStr = typeof input.status === "string" ? input.status : "OPEN";
  const status: DealStatus = statusStr === "CLOSED_WON" ? "CLOSED_WON" : statusStr === "CLOSED_LOST" ? "CLOSED_LOST" : "OPEN";
  const stageLabel =
    typeof input.stageLabel === "string"
      ? input.stageLabel
      : typeof input.stage === "string"
      ? input.stage
      : status === "CLOSED_WON"
      ? "Closed Won"
      : "Initial Contact";

  const createdDeal = await prisma.deal.create({
    data: {
      organizationId: context.user.organizationId,
      clientAccountId,
      contactId: contact ? contact.id : null,
      companyId: contact?.crmCompanyId || null,
      userId: context.user.id,
      title,
      valueCents: Math.round(rawAmount * 100),
      currency: "USD",
      status,
      stageLabel,
      expectedCloseAt: dateValue(input.expectedCloseAt) ?? null,
      closedAt: status === "CLOSED_WON" ? new Date() : null,
      notes: nullableText(input.notes),
      isManual: true,
    },
    include: {
      contact: true,
    },
  });

  await recordAuditEvent(context, {
    action: "DEAL_CREATED",
    entityType: "DEAL",
    entityId: createdDeal.id,
    requestId,
    source: "PLATFORM",
    clientAccountId,
    metadata: {
      title: createdDeal.title,
      amount: rawAmount,
      contactId: contact?.id,
      status: createdDeal.status,
    },
  });

  // If created as CLOSED_WON, trigger Zoho Handoff automatically
  let handoff = null;
  if (createdDeal.status === "CLOSED_WON") {
    try {
      handoff = await createDealHandoffFromAgencyDeal(context, createdDeal.id, {
        closeOutcome: typeof input.closeOutcome === "string" ? input.closeOutcome : "Client accepted proposal",
        recommendedNextAction: typeof input.recommendedNextAction === "string" ? input.recommendedNextAction : "Begin onboarding",
        notes: typeof input.notes === "string" ? input.notes : createdDeal.notes || undefined,
      });
    } catch {
      // Handoff failures are tracked on the handoff record
    }
  }

  // Attempt outbound sync to HubSpot if contact has HubSpot mapping and HubSpot is connected
  let outboundSync: { status: "COMPLETED" | "FAILED" | "NOT_MAPPED"; error?: string } = {
    status: "NOT_MAPPED",
  };

  try {
    const hubspotConnection = await prisma.integrationConnection.findFirst({
      where: hubspotConnectionWhere(context),
    });

    if (hubspotConnection) {
      let contactExternalId: string | undefined;
      if (contact) {
        const contactMapping = await prisma.externalRecord.findFirst({
          where: {
            connectionId: hubspotConnection.id,
            objectType: "CONTACT",
            contactId: contact.id,
          },
        });
        contactExternalId = contactMapping?.externalId;
      }

      const adapter = getIntegrationAdapter("HUBSPOT");
      if (adapter.createDeal) {
        const outbound = {
          name: createdDeal.title,
          amount: (createdDeal.valueCents / 100).toFixed(2),
          pipelineId: null,
          stageId: null,
          expectedCloseAt: createdDeal.expectedCloseAt,
          ownerExternalId: null,
        };
        const externalResult = await adapter.createDeal(hubspotConnection, outbound, contactExternalId);
        if (externalResult?.id) {
          await prisma.externalRecord.create({
            data: {
              clientAccountId,
              connectionId: hubspotConnection.id,
              objectType: "DEAL",
              dealId: createdDeal.id,
              externalId: externalResult.id,
              lastSyncedAt: new Date(),
            },
          });
          outboundSync = { status: "COMPLETED" };
          await recordAuditEvent(context, {
            action: "DEAL_OUTBOUND_SYNC_COMPLETED",
            entityType: "DEAL",
            entityId: createdDeal.id,
            requestId,
            source: "HUBSPOT",
            metadata: { externalId: externalResult.id },
          });
        }
      }
    }
  } catch (outboundErr) {
    console.warn("HubSpot outbound deal creation skipped/failed:", outboundErr);
    outboundSync = {
      status: "FAILED",
      error: outboundErr instanceof Error ? outboundErr.message : "HubSpot deal creation failed",
    };
  }

  // Also sync directly into ClientCrmRecord for immediate visibility in Client CRM
  try {
    const clientConnection = await prisma.integrationConnection.findFirst({
      where: {
        organizationId: context.user.organizationId,
        clientAccountId,
      },
    });

    const contactName = contact
      ? [contact.firstName, contact.lastName].filter(Boolean).join(" ").trim()
      : null;

    await prisma.clientCrmRecord.create({
      data: {
        organizationId: context.user.organizationId,
        clientAccountId,
        connectionId: clientConnection?.id ?? null,
        provider: clientConnection?.provider || "ZOHO",
        recordType: "DEAL",
        externalId: `deal-${createdDeal.id}`,
        name: createdDeal.title,
        amount: (createdDeal.valueCents / 100).toFixed(2),
        status: createdDeal.status === "CLOSED_WON" ? "Won" : "Open",
        stage: createdDeal.stageLabel || "Pipeline",
        details: createdDeal.notes || "Deal created via Platform",
        customFields: {
          source: "UNIFIED_DIRECTORY",
          dealId: createdDeal.id,
          contactId: createdDeal.contactId,
          contactName,
        },
        lastSyncedAt: new Date(),
      },
    });
  } catch {
    // Ignore duplicate or minor client CRM record creation issue
  }

  return { deal: createdDeal, handoff, outboundSync };
}

// Backward compatibility aliases for existing Stage 2.6 test harness
export const updateActiveClientCompany = updateAgencyCompany;
export const updateActiveClientDeal = updateAgencyDeal;
export const retryActiveClientCompanySync = retryAgencyCompanySync;
export const retryActiveClientDealSync = retryAgencyDealSync;
export const createActiveClientDeal = createAgencyDeal;
