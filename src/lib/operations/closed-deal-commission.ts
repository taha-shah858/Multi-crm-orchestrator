import "server-only";

import type { Prisma } from "@prisma/client";
import { AppError } from "@/lib/errors/app-error";
import type { RequestContext } from "@/lib/models/canonical";

/** Run in the transaction that closes the deal, before any provider calls. */
export async function ensureClosedDealCommission(
  tx: Prisma.TransactionClient,
  context: RequestContext,
  dealId: string,
) {
  // Serialize closure/retry operations for this deal. The unique dealId on
  // CommissionRecord also enforces one commission per deal at database level.
  await tx.$queryRaw`SELECT "id" FROM "Deal"
    WHERE "id" = ${dealId} AND "organizationId" = ${context.user.organizationId}
    FOR UPDATE`;
  const deal = await tx.deal.findFirst({
    where: { id: dealId, organizationId: context.user.organizationId },
    include: {
      user: { select: { organizationId: true, defaultCommissionRate: true } },
      clientAccount: { select: { defaultCommissionRate: true } },
    },
  });
  if (!deal) throw new AppError("DEAL_NOT_FOUND", 404, "Deal was not found.", "Choose a valid deal.");
  const accessibleClient = await tx.clientAccount.findFirst({
    where: {
      id: deal.clientAccountId,
      organizationId: context.user.organizationId,
      status: "ACTIVE",
      ...(context.user.role === "AGENT" ? { agentAssignments: { some: { userId: context.user.id } } } : {}),
    },
    select: { id: true },
  });
  if (!accessibleClient) {
    throw new AppError("CLIENT_ACCESS_DENIED", 403, "Client account access is denied.", "Choose a client account assigned to your user.");
  }
  if (deal.status !== "CLOSED_WON") {
    throw new AppError("INVALID_DEAL_INPUT", 422, "Only won deals earn commission.", "Close the deal as won first.");
  }
  if (deal.user && deal.user.organizationId !== context.user.organizationId) {
    throw new AppError("INVALID_DEAL_INPUT", 422, "Deal agent is outside this agency.", "Assign an agent from this agency.");
  }

  const existing = await tx.commissionRecord.findUnique({ where: { dealId } });
  // A retry must preserve payments, adjustments, notes, and manual overrides.
  if (existing) return existing;

  const userId = deal.userId ?? context.user.id;
  const agent = deal.user ?? await tx.user.findUniqueOrThrow({
    where: { id: userId }, select: { defaultCommissionRate: true },
  });
  const commissionRate = deal.commissionRate ?? agent.defaultCommissionRate
    ?? deal.clientAccount.defaultCommissionRate ?? 10;
  const expectedCents = deal.expectedRevenueCents ?? Math.round(deal.valueCents * commissionRate / 100);
  if (!Number.isFinite(commissionRate) || commissionRate < 0 || commissionRate > 100
    || !Number.isSafeInteger(expectedCents) || expectedCents < 0 || expectedCents > 2147483647) {
    throw new AppError("INVALID_COMMISSION_INPUT", 422, "Deal commission is invalid.", "Set a valid commission rate and deal value.");
  }
  await tx.deal.update({
    where: { id: dealId },
    data: { userId, commissionRate, expectedRevenueCents: expectedCents },
  });
  const commission = await tx.commissionRecord.create({
    data: {
      organizationId: deal.organizationId,
      clientAccountId: deal.clientAccountId,
      dealId,
      userId,
      expectedCents,
      receivedCents: 0,
      currency: deal.currency,
      status: "PENDING",
      source: "CRM",
      ledgerEntries: {
        create: {
          organizationId: deal.organizationId,
          clientAccountId: deal.clientAccountId,
          userId,
          type: "EXPECTED",
          amountCents: expectedCents,
          note: `Closed Won commission at ${commissionRate}%`,
          occurredAt: deal.closedAt ?? new Date(),
        },
      },
    },
  });
  await tx.auditLog.create({
    data: {
      organizationId: deal.organizationId,
      clientAccountId: deal.clientAccountId,
      userId: context.user.id,
      action: "COMMISSION_CREATED",
      entityType: "COMMISSION_RECORD",
      entityId: commission.id,
      source: "PLATFORM",
      requestId: `closed-deal-commission-${dealId}`,
      metadata: { dealId, userId, commissionRate, expectedCents, source: "CRM" },
    },
  });
  return commission;
}
