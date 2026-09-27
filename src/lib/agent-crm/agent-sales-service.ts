import "server-only";

import type { AuditAction } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/errors/app-error";
import {
  createClickUpTask,
  fetchClickUpLists,
  fetchClickUpSpaces,
  fetchClickUpTeams,
  resolveClickUpCredentials,
  updateClickUpTask,
} from "@/lib/integrations/clickup/client";
import {
  buildClickUpTaskCreateInput,
  buildClickUpTaskUpdateInput,
} from "@/lib/integrations/clickup/tasks";
import type {
  ClickUpDealTaskPayload,
  ClickUpSyncResult,
} from "@/lib/integrations/clickup/types";
import type { AuthenticatedUser } from "@/lib/models/canonical";

export const DEFAULT_AGENCY_COMMISSION_RATE = 10.0;

/**
 * Calculates the effective commission rate based on the specification hierarchy:
 * 1. Deal-specific override
 * 2. Agent-specific rate
 * 3. Client-specific rate
 * 4. Agency default rate (10.0%)
 */
export function calculateEffectiveCommissionRate(options: {
  dealRate?: number | null;
  agentRate?: number | null;
  clientRate?: number | null;
}): number {
  if (typeof options.dealRate === "number" && !isNaN(options.dealRate)) {
    return options.dealRate;
  }
  if (typeof options.agentRate === "number" && !isNaN(options.agentRate)) {
    return options.agentRate;
  }
  if (typeof options.clientRate === "number" && !isNaN(options.clientRate)) {
    return options.clientRate;
  }
  return DEFAULT_AGENCY_COMMISSION_RATE;
}

export function calculateExpectedRevenueCents(dealValueCents: number, commissionRate: number): number {
  return Math.round(dealValueCents * (commissionRate / 100));
}

/**
 * Ensures commission rate and expected revenue are snapshotted on a closed deal.
 */
export async function snapshotDealCommission(dealId: string) {
  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    include: {
      user: { select: { id: true, defaultCommissionRate: true } },
      clientAccount: { select: { id: true, defaultCommissionRate: true } },
    },
  });

  if (!deal) return null;

  const commissionRate = calculateEffectiveCommissionRate({
    dealRate: deal.commissionRate,
    agentRate: deal.user?.defaultCommissionRate,
    clientRate: deal.clientAccount?.defaultCommissionRate,
  });

  const expectedRevenueCents = calculateExpectedRevenueCents(deal.valueCents, commissionRate);

  if (deal.commissionRate !== commissionRate || deal.expectedRevenueCents !== expectedRevenueCents) {
    return prisma.deal.update({
      where: { id: dealId },
      data: {
        commissionRate,
        expectedRevenueCents,
      },
    });
  }

  return deal;
}

/**
 * Synchronizes a closed deal to an agent's ClickUp workspace/list.
 * Idempotent: repeated calls will update the existing ClickUp task without creating duplicates.
 * Fault-isolated: errors are recorded on AgentClickUpRecord and will not fail the caller.
 */
export async function syncDealToClickUp(
  dealId: string,
  agentId: string,
  options?: { throwOnError?: boolean },
): Promise<ClickUpSyncResult> {
  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    include: {
      clientAccount: true,
      contact: true,
      user: true,
      handoffs: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      agentClickUpRecords: {
        where: { agentId },
      },
    },
  });

  if (!deal) {
    if (options?.throwOnError) throw new AppError("DEAL_NOT_FOUND", 404, "Deal not found.", "Select a valid deal.");
    return { success: false, action: "SKIPPED", error: "Deal not found" };
  }

  // Ensure commission snapshot is present
  const commissionRate = deal.commissionRate ?? calculateEffectiveCommissionRate({
    dealRate: deal.commissionRate,
    agentRate: deal.user?.defaultCommissionRate,
    clientRate: deal.clientAccount?.defaultCommissionRate,
  });
  const expectedRevenueCents = deal.expectedRevenueCents ?? calculateExpectedRevenueCents(deal.valueCents, commissionRate);

  if (!deal.commissionRate || !deal.expectedRevenueCents) {
    await prisma.deal.update({
      where: { id: dealId },
      data: { commissionRate, expectedRevenueCents },
    }).catch(() => null);
  }

  // Find agent's ClickUp connection
  const connection = await prisma.integrationConnection.findFirst({
    where: {
      organizationId: deal.organizationId,
      ownershipType: "USER",
      userId: agentId,
      provider: "CLICKUP" as any,
      status: "CONNECTED",
    },
    include: { credential: true },
  });

  if (!connection) {
    // Record that sync was pending / skipped due to no connection
    await prisma.agentClickUpRecord.upsert({
      where: { agentId_dealId: { agentId, dealId } },
      update: {
        commissionCents: expectedRevenueCents,
        commissionRate,
        status: "PENDING",
        lastSyncError: "ClickUp is not connected for this agent.",
      },
      create: {
        organizationId: deal.organizationId,
        agentId,
        dealId,
        clientAccountId: deal.clientAccountId,
        clickUpTaskId: "",
        commissionCents: expectedRevenueCents,
        commissionRate,
        status: "PENDING",
        lastSyncError: "ClickUp is not connected for this agent.",
      },
    }).catch(() => null);

    if (options?.throwOnError) {
      throw new AppError(
        "CLICKUP_NOT_CONNECTED",
        400,
        "ClickUp is not connected for this agent.",
        "Connect your ClickUp account in Sales Operations to sync deals.",
      );
    }
    return { success: false, action: "SKIPPED", error: "ClickUp is not connected for this agent" };
  }

  // Audit start
  await prisma.auditLog.create({
    data: {
      organizationId: deal.organizationId,
      clientAccountId: deal.clientAccountId,
      userId: agentId,
      action: "CLICKUP_TASK_SYNC_STARTED" as unknown as AuditAction,
      entityType: "DEAL",
      entityId: deal.id,
      source: "CLICKUP",
      metadata: { dealId: deal.id, agentId },
    },
  }).catch(() => null);

  try {
    const auth = await resolveClickUpCredentials(connection);

    // Resolve list destination
    let listId = auth.destination.listId;
    if (!listId) {
      if (auth.isMock) {
        listId = "mock-list-1";
      } else {
        const teams = await fetchClickUpTeams(auth);
        if (teams.length > 0) {
          const spaces = await fetchClickUpSpaces(auth, teams[0].id);
          if (spaces.length > 0) {
            const lists = await fetchClickUpLists(auth, spaces[0].id);
            if (lists.length > 0) {
              listId = lists[0].id;
            }
          }
        }
      }
    }

    if (!listId) {
      listId = "default-list";
    }

    const latestHandoff = deal.handoffs[0];
    const customerName = deal.contact
      ? `${deal.contact.firstName} ${deal.contact.lastName}`.trim()
      : "Direct Customer";
    const customerEmail = deal.contact?.email || null;
    const clientAccountName = deal.clientAccount?.name || "Client Account";
    const agentName = deal.user?.name || "Sales Agent";
    const agentEmail = deal.user?.email || null;

    // Check Zoho Record ID from ClientCrmRecord
    const zohoRecord = await prisma.clientCrmRecord.findFirst({
      where: {
        organizationId: deal.organizationId,
        clientAccountId: deal.clientAccountId,
        recordType: "DEAL",
        name: deal.title,
      },
      select: { externalId: true },
    }).catch(() => null);

    const payload: ClickUpDealTaskPayload = {
      dealId: deal.id,
      dealTitle: deal.title,
      dealValueCents: deal.valueCents,
      currency: deal.currency,
      commissionRate,
      expectedRevenueCents,
      closedAt: deal.closedAt || new Date(),
      customerName,
      customerEmail,
      clientAccountName,
      clientAccountId: deal.clientAccountId,
      agentName,
      agentEmail,
      handoffStatus: latestHandoff?.status || "COMPLETED",
      clientCrmProvider: latestHandoff?.clientCrmProvider || "ZOHO",
      zohoRecordId: zohoRecord?.externalId || latestHandoff?.clientCrmRecordId || null,
      closeOutcome: latestHandoff?.closeOutcome || null,
      recommendedNextAction: latestHandoff?.recommendedNextAction || null,
      notes: deal.notes || null,
    };

    const existingRecord = deal.agentClickUpRecords[0];

    let taskResponse;
    let action: "CREATED" | "UPDATED";

    if (existingRecord && existingRecord.clickUpTaskId) {
      // Update existing task (Idempotency guarantee)
      const updateInput = buildClickUpTaskUpdateInput(payload);
      taskResponse = await updateClickUpTask(auth, existingRecord.clickUpTaskId, updateInput);
      action = "UPDATED";

      await prisma.agentClickUpRecord.update({
        where: { id: existingRecord.id },
        data: {
          taskUrl: taskResponse.url || existingRecord.taskUrl,
          status: "SYNCED",
          commissionCents: expectedRevenueCents,
          commissionRate,
          lastSyncedAt: new Date(),
          lastSyncError: null,
        },
      });
    } else {
      // Create new task
      const createInput = buildClickUpTaskCreateInput(payload);
      taskResponse = await createClickUpTask(auth, listId, createInput);
      action = "CREATED";

      await prisma.agentClickUpRecord.upsert({
        where: { agentId_dealId: { agentId, dealId } },
        update: {
          clickUpTaskId: taskResponse.id,
          clickUpListId: listId,
          taskUrl: taskResponse.url,
          status: "SYNCED",
          commissionCents: expectedRevenueCents,
          commissionRate,
          lastSyncedAt: new Date(),
          lastSyncError: null,
        },
        create: {
          organizationId: deal.organizationId,
          agentId,
          dealId,
          clientAccountId: deal.clientAccountId,
          clickUpTaskId: taskResponse.id,
          clickUpListId: listId,
          taskUrl: taskResponse.url,
          status: "SYNCED",
          commissionCents: expectedRevenueCents,
          commissionRate,
          lastSyncedAt: new Date(),
          lastSyncError: null,
        },
      });
    }

    // Update connection lastSyncAt
    await prisma.integrationConnection.update({
      where: { id: connection.id },
      data: { lastSyncAt: new Date() },
    }).catch(() => null);

    // Audit success
    await prisma.auditLog.create({
      data: {
        organizationId: deal.organizationId,
        clientAccountId: deal.clientAccountId,
        userId: agentId,
        action: "CLICKUP_TASK_SYNC_COMPLETED" as unknown as AuditAction,
        entityType: "DEAL",
        entityId: deal.id,
        source: "CLICKUP",
        metadata: {
          dealId: deal.id,
          agentId,
          clickUpTaskId: taskResponse.id,
          action,
        },
      },
    }).catch(() => null);

    return {
      success: true,
      taskId: taskResponse.id,
      taskUrl: taskResponse.url,
      listId,
      action,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "ClickUp sync failed";
    console.error("[ClickUp Sync] Error:", errorMsg);

    // Record failure in AgentClickUpRecord (fault isolation)
    await prisma.agentClickUpRecord.upsert({
      where: { agentId_dealId: { agentId, dealId } },
      update: {
        status: "FAILED",
        lastSyncError: errorMsg,
      },
      create: {
        organizationId: deal.organizationId,
        agentId,
        dealId,
        clientAccountId: deal.clientAccountId,
        clickUpTaskId: "",
        status: "FAILED",
        commissionCents: expectedRevenueCents,
        commissionRate,
        lastSyncError: errorMsg,
      },
    }).catch(() => null);

    // Audit failure
    await prisma.auditLog.create({
      data: {
        organizationId: deal.organizationId,
        clientAccountId: deal.clientAccountId,
        userId: agentId,
        action: "CLICKUP_TASK_SYNC_FAILED" as unknown as AuditAction,
        entityType: "DEAL",
        entityId: deal.id,
        source: "CLICKUP",
        metadata: { dealId: deal.id, agentId, error: errorMsg },
      },
    }).catch(() => null);

    if (options?.throwOnError) {
      throw new AppError(
        "CLICKUP_SYNC_FAILED",
        500,
        `ClickUp synchronization failed: ${errorMsg}`,
        "ClickUp sync failed. You can retry it from Sales Operations.",
      );
    }

    return {
      success: false,
      action: "SKIPPED",
      error: errorMsg,
    };
  }
}

/**
 * Returns the agent's closed sales records and commission summary.
 * Agents can only see their own sales records.
 */
export async function listAgentSales(user: AuthenticatedUser) {
  const deals = await prisma.deal.findMany({
    where: {
      organizationId: user.organizationId,
      status: "CLOSED_WON",
      OR: [
        { userId: user.id },
        { handoffs: { some: { agentId: user.id } } },
      ],
    },
    include: {
      clientAccount: { select: { id: true, name: true, defaultCommissionRate: true } },
      contact: { select: { id: true, firstName: true, lastName: true, company: true, email: true } },
      commission: {
        include: {
          ledgerEntries: { orderBy: { occurredAt: "desc" } },
        },
      },
      agentClickUpRecords: {
        where: { agentId: user.id },
      },
    },
    orderBy: { closedAt: "desc" },
  });

  const connection = await prisma.integrationConnection.findFirst({
    where: {
      organizationId: user.organizationId,
      ownershipType: "USER",
      userId: user.id,
      provider: "CLICKUP" as any,
    },
    include: { credential: true },
  });

  const isClickUpConnected = connection?.status === "CONNECTED";
  const clickUpMeta = connection?.credential?.metadata as { destination?: any } | null;

  const userRecord = await prisma.user.findUnique({
    where: { id: user.id },
    select: { defaultCommissionRate: true },
  });

  let totalExpectedCents = 0;
  let totalReceivedCents = 0;

  const sales = deals.map((deal) => {
    const rate = deal.commissionRate ?? calculateEffectiveCommissionRate({
      dealRate: deal.commissionRate,
      agentRate: userRecord?.defaultCommissionRate,
      clientRate: deal.clientAccount?.defaultCommissionRate,
    });
    const expectedRevenue = deal.expectedRevenueCents ?? calculateExpectedRevenueCents(deal.valueCents, rate);

    const receivedRevenue = deal.commission?.receivedCents || 0;
    totalExpectedCents += expectedRevenue;
    totalReceivedCents += receivedRevenue;

    const clickUpRecord = deal.agentClickUpRecords[0];

    return {
      id: deal.id,
      title: deal.title,
      valueCents: deal.valueCents,
      currency: deal.currency,
      commissionRate: rate,
      expectedRevenueCents: expectedRevenue,
      receivedRevenueCents: receivedRevenue,
      closedAt: deal.closedAt || deal.createdAt,
      status: deal.status,
      clientAccount: deal.clientAccount,
      contact: deal.contact,
      clickUp: {
        status: clickUpRecord?.status || (isClickUpConnected ? "PENDING" : "NOT_CONNECTED"),
        taskId: clickUpRecord?.clickUpTaskId || null,
        taskUrl: clickUpRecord?.taskUrl || null,
        lastSyncedAt: clickUpRecord?.lastSyncedAt || null,
        lastSyncError: clickUpRecord?.lastSyncError || null,
      },
    };
  });

  return {
    sales,
    summary: {
      expectedCents: totalExpectedCents,
      receivedCents: totalReceivedCents,
      pendingCents: Math.max(0, totalExpectedCents - totalReceivedCents),
      closedDeals: deals.length,
    },
    clickUpConnection: {
      isConnected: isClickUpConnected,
      status: connection?.status || "DISCONNECTED",
      lastSyncAt: connection?.lastSyncAt || null,
      destination: clickUpMeta?.destination || null,
    },
  };
}
