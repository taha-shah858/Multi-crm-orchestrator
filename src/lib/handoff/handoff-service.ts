import "server-only";

import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/errors/app-error";
import { recordAuditEvent } from "@/lib/audit/audit-log";
import { syncHandoffToActiveCampaign } from "@/lib/integrations/activecampaign/client";
import { syncHandoffToZoho } from "@/lib/integrations/zoho/client";
import { isSyncableConnectionStatus } from "@/lib/integrations/connection-resolution";
import type { RequestContext, DealHandoffSummary } from "@/lib/models/canonical";

export interface CreateHandoffOptions {
  closeOutcome?: string;
  recommendedNextAction?: string;
  notes?: string;
}

export async function createDealHandoffFromAgencyDeal(
  context: RequestContext,
  dealId: string,
  options?: CreateHandoffOptions,
): Promise<DealHandoffSummary> {
  const deal = await prisma.deal.findFirst({
    where: {
      id: dealId,
      organizationId: context.user.organizationId,
    },
    include: {
      clientAccount: { select: { id: true, name: true } },
      user: { select: { id: true, name: true, email: true } },
    },
  });

  if (!deal) {
    throw new AppError("DEAL_NOT_FOUND", 404, "Agency deal was not found.", "Select a valid agency deal.");
  }

  const clientAccountId = deal.clientAccountId;
  if (!clientAccountId) {
    throw new AppError("CLIENT_CONTEXT_REQUIRED", 422, "Deal has no associated client account.", "Associate the deal with a client account before handing off.");
  }

  // Resolve client's CRM connection (prefer ZOHO)
  const connection =
    (await prisma.integrationConnection.findFirst({
      where: {
        organizationId: context.user.organizationId,
        clientAccountId,
        provider: "ZOHO",
      },
    })) ||
    (await prisma.integrationConnection.findFirst({
      where: {
        organizationId: context.user.organizationId,
        clientAccountId,
      },
    }));

  const clientCrmProvider = connection?.provider || "ZOHO";
  const closeOutcome = options?.closeOutcome || "Client accepted proposal";
  const recommendedNextAction = options?.recommendedNextAction || "Begin onboarding";
  const notes = options?.notes || deal.notes || null;

  // Mark Deal as CLOSED_WON in local database if not already
  if (deal.status !== "CLOSED_WON") {
    await prisma.deal.update({
      where: { id: deal.id },
      data: {
        status: "CLOSED_WON",
        closedAt: deal.closedAt || new Date(),
        notes: notes ?? deal.notes,
      },
    });
  }

  // Update ClientCrmRecord for this deal and contact
  await prisma.clientCrmRecord.updateMany({
    where: {
      organizationId: context.user.organizationId,
      clientAccountId,
      recordType: "DEAL",
      OR: [
        { externalId: `deal-${deal.id}` },
        { name: deal.title },
      ],
    },
    data: {
      status: "Won",
      stage: "Closed Won",
      lastSyncedAt: new Date(),
    },
  });

  if (deal.contactId) {
    await prisma.clientCrmRecord.updateMany({
      where: {
        organizationId: context.user.organizationId,
        clientAccountId,
        recordType: "CONTACT",
        OR: [
          { externalId: `unified-${deal.contactId}` },
          { externalId: deal.contactId },
        ],
      },
      data: {
        status: "Active Customer",
        lastSyncedAt: new Date(),
      },
    });
  }

  // Idempotent upsert by (agencyDealId, clientAccountId)
  const handoff = await prisma.dealHandoff.upsert({
    where: {
      agencyDealId_clientAccountId: {
        agencyDealId: deal.id,
        clientAccountId,
      },
    },
    update: {
      dealName: deal.title,
      dealAmountCents: deal.valueCents,
      currency: deal.currency,
      closeStatus: "CLOSED_WON",
      closeDate: deal.closedAt || new Date(),
      closeOutcome,
      recommendedNextAction,
      notes,
      clientCrmProvider,
      lastAttemptedAt: new Date(),
    },
    create: {
      organizationId: context.user.organizationId,
      clientAccountId,
      agencyDealId: deal.id,
      agentId: deal.userId || context.user.id,
      dealName: deal.title,
      dealAmountCents: deal.valueCents,
      currency: deal.currency,
      closeStatus: "CLOSED_WON",
      closeDate: deal.closedAt || new Date(),
      closeOutcome,
      recommendedNextAction,
      notes,
      clientCrmProvider,
      status: "PENDING",
      lastAttemptedAt: new Date(),
    },
    include: {
      clientAccount: { select: { id: true, name: true } },
      agencyDeal: { select: { id: true, title: true, valueCents: true } },
      agent: { select: { id: true, name: true, email: true } },
    },
  });

  await recordAuditEvent(context, {
    action: "DEAL_HANDOFF_CREATED",
    entityType: "DEAL_HANDOFF",
    entityId: handoff.id,
    requestId: `handoff-created-${handoff.id}`,
    source: "PLATFORM",
    clientAccountId,
    metadata: {
      agencyDealId: deal.id,
      dealName: deal.title,
      clientAccountId,
      amountCents: deal.valueCents,
      provider: clientCrmProvider,
    },
  });

  // Attempt synchronous dispatch to Client CRM
  return dispatchHandoffToClientCrm(context, handoff.id);
}

export async function dispatchHandoffToClientCrm(
  context: RequestContext,
  handoffId: string,
): Promise<DealHandoffSummary> {
  const handoff = await prisma.dealHandoff.findUnique({
    where: { id: handoffId },
    include: {
      clientAccount: { select: { id: true, name: true } },
      agencyDeal: {
        select: {
          id: true,
          title: true,
          valueCents: true,
          contactId: true,
        },
      },
      agent: { select: { id: true, name: true, email: true } },
    },
  });

  if (!handoff || handoff.organizationId !== context.user.organizationId) {
    throw new AppError("HANDOFF_NOT_FOUND", 404, "Deal handoff was not found.", "Select a valid deal handoff.");
  }

  await prisma.dealHandoff.update({
    where: { id: handoff.id },
    data: { status: "SYNCING", lastAttemptedAt: new Date() },
  });

  await recordAuditEvent(context, {
    action: "DEAL_HANDOFF_SYNC_STARTED",
    entityType: "DEAL_HANDOFF",
    entityId: handoff.id,
    requestId: `handoff-sync-${handoff.id}`,
    source: "PLATFORM",
    clientAccountId: handoff.clientAccountId,
  });

  try {
    // Find active client connection (prefer ZOHO, then fallback to other client connection)
    const connection =
      (await prisma.integrationConnection.findFirst({
        where: {
          organizationId: context.user.organizationId,
          clientAccountId: handoff.clientAccountId,
          provider: "ZOHO",
        },
      })) ||
      (await prisma.integrationConnection.findFirst({
        where: {
          organizationId: context.user.organizationId,
          clientAccountId: handoff.clientAccountId,
        },
      }));

    if (!connection || !isSyncableConnectionStatus(connection.status)) {
      throw new Error(`Client CRM (${connection?.provider || "Zoho CRM"}) is not connected for this client account.`);
    }

    let externalId: string;

    if (connection.provider === "ZOHO") {
      // Resolve associated contact details if available
      let customerInfo: { firstName?: string; lastName?: string; email?: string; phone?: string; company?: string; agencyContactId?: string } | undefined;
      if (handoff.agencyDeal.contactId) {
        const contact = await prisma.contact.findUnique({
          where: { id: handoff.agencyDeal.contactId },
        });
        if (contact) {
          customerInfo = {
            firstName: contact.firstName,
            lastName: contact.lastName,
            email: contact.email || undefined,
            phone: contact.phone || undefined,
            company: contact.company || undefined,
            agencyContactId: contact.id,
          };
        }
      }

      const result = await syncHandoffToZoho(connection, {
        agencyDealId: handoff.agencyDealId,
        clientAccountId: handoff.clientAccountId,
        dealName: handoff.dealName,
        amountCents: handoff.dealAmountCents,
        currency: handoff.currency,
        closeStatus: handoff.closeStatus,
        closeDate: handoff.closeDate.toISOString(),
        closeOutcome: handoff.closeOutcome || "Client accepted proposal",
        recommendedNextAction: handoff.recommendedNextAction || "Begin onboarding",
        agentName: handoff.agent?.name || context.user.name,
        notes: handoff.notes || undefined,
        customer: customerInfo,
      });

      externalId = result.externalId;
    } else {
      const result = await syncHandoffToActiveCampaign(connection, {
        agencyDealId: handoff.agencyDealId,
        clientAccountId: handoff.clientAccountId,
        dealName: handoff.dealName,
        amountCents: handoff.dealAmountCents,
        currency: handoff.currency,
        closeStatus: handoff.closeStatus,
        closeDate: handoff.closeDate.toISOString(),
        closeOutcome: handoff.closeOutcome || "Client accepted proposal",
        recommendedNextAction: handoff.recommendedNextAction || "Begin onboarding",
        agentName: handoff.agent?.name || context.user.name,
        notes: handoff.notes || undefined,
      });

      externalId = result.externalId;
    }

    const updated = await prisma.dealHandoff.update({
      where: { id: handoff.id },
      data: {
        status: "SYNCED",
        clientCrmProvider: connection.provider,
        clientCrmRecordId: externalId,
        lastSuccessfulSyncAt: new Date(),
        lastError: null,
      },
      include: {
        clientAccount: { select: { id: true, name: true } },
        agencyDeal: { select: { id: true, title: true, valueCents: true } },
        agent: { select: { id: true, name: true, email: true } },
      },
    });

    // Mirror handoff record into ClientCrmRecord for client operational view
    await prisma.clientCrmRecord.upsert({
      where: {
        connectionId_recordType_externalId: {
          connectionId: connection.id,
          recordType: "DEAL",
          externalId,
        },
      },
      update: {
        name: handoff.dealName,
        amount: (handoff.dealAmountCents / 100).toFixed(2),
        status: "Won",
        stage: "Closed Won",
        details: handoff.recommendedNextAction,
        lastSyncedAt: new Date(),
      },
      create: {
        organizationId: context.user.organizationId,
        clientAccountId: handoff.clientAccountId,
        connectionId: connection.id,
        provider: connection.provider,
        recordType: "DEAL",
        externalId,
        name: handoff.dealName,
        amount: (handoff.dealAmountCents / 100).toFixed(2),
        status: "Won",
        stage: "Closed Won",
        details: handoff.recommendedNextAction,
        lastSyncedAt: new Date(),
      },
    });

    const auditSource = connection.provider === "ZOHO" ? "ZOHO" : "ACTIVECAMPAIGN";
    await recordAuditEvent(context, {
      action: "DEAL_HANDOFF_SYNC_COMPLETED",
      entityType: "DEAL_HANDOFF",
      entityId: handoff.id,
      requestId: `handoff-completed-${handoff.id}`,
      source: auditSource,
      clientAccountId: handoff.clientAccountId,
      metadata: { clientCrmRecordId: externalId, provider: connection.provider },
    });

    return formatHandoff(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Client CRM sync failed.";
    const failed = await prisma.dealHandoff.update({
      where: { id: handoff.id },
      data: {
        status: "FAILED",
        lastError: message,
        retryCount: { increment: 1 },
      },
      include: {
        clientAccount: { select: { id: true, name: true } },
        agencyDeal: { select: { id: true, title: true, valueCents: true } },
        agent: { select: { id: true, name: true, email: true } },
      },
    });

    await recordAuditEvent(context, {
      action: "DEAL_HANDOFF_SYNC_FAILED",
      entityType: "DEAL_HANDOFF",
      entityId: handoff.id,
      requestId: `handoff-failed-${handoff.id}`,
      source: "PLATFORM",
      clientAccountId: handoff.clientAccountId,
      metadata: { error: message },
    });

    return formatHandoff(failed);
  }
}

export async function retryDealHandoff(
  context: RequestContext,
  handoffId: string,
): Promise<DealHandoffSummary> {
  const handoff = await prisma.dealHandoff.findUnique({
    where: { id: handoffId },
  });

  if (!handoff || handoff.organizationId !== context.user.organizationId) {
    throw new AppError("HANDOFF_NOT_FOUND", 404, "Deal handoff was not found.", "Select a valid deal handoff.");
  }

  await prisma.dealHandoff.update({
    where: { id: handoffId },
    data: { status: "RETRYING" },
  });

  return dispatchHandoffToClientCrm(context, handoffId);
}

export async function listDealHandoffs(
  context: RequestContext,
  options?: { clientAccountId?: string },
): Promise<DealHandoffSummary[]> {
  const targetClientAccountId = options?.clientAccountId ?? context.activeClientAccountId;
  const where = {
    organizationId: context.user.organizationId,
    ...(targetClientAccountId ? { clientAccountId: targetClientAccountId } : {}),
  };

  const handoffs = await prisma.dealHandoff.findMany({
    where,
    include: {
      clientAccount: { select: { id: true, name: true } },
      agencyDeal: { select: { id: true, title: true, valueCents: true } },
      agent: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return handoffs.map(formatHandoff);
}

function formatHandoff(handoff: any): DealHandoffSummary {
  return {
    id: handoff.id,
    agencyDealId: handoff.agencyDealId,
    clientAccountId: handoff.clientAccountId,
    agentId: handoff.agentId,
    dealName: handoff.dealName,
    dealAmountCents: handoff.dealAmountCents,
    currency: handoff.currency,
    closeStatus: handoff.closeStatus,
    closeDate: handoff.closeDate.toISOString(),
    closeOutcome: handoff.closeOutcome,
    recommendedNextAction: handoff.recommendedNextAction,
    notes: handoff.notes,
    clientCrmProvider: handoff.clientCrmProvider,
    clientCrmRecordId: handoff.clientCrmRecordId,
    status: handoff.status,
    retryCount: handoff.retryCount,
    lastAttemptedAt: handoff.lastAttemptedAt?.toISOString() ?? null,
    lastSuccessfulSyncAt: handoff.lastSuccessfulSyncAt?.toISOString() ?? null,
    lastError: handoff.lastError,
    createdAt: handoff.createdAt.toISOString(),
    updatedAt: handoff.updatedAt.toISOString(),
    clientAccount: handoff.clientAccount,
    agencyDeal: handoff.agencyDeal,
    agent: handoff.agent,
  };
}
