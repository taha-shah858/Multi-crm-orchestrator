import { recordAuditEvent } from "@/lib/audit/audit-log";
import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/errors/app-error";
import type { RequestContext } from "@/lib/models/canonical";
import { prepareActiveClientSync } from "@/lib/sync/contact-sync-service";
import { commissionPeriodWhere, reconciliationDateRange, summarizeCommissions, type ReconciliationFilters } from "@/lib/operations/reconciliation";
import { summarizeTime } from "@/lib/operations/time-tracking-policy";

type Input = Record<string, unknown>;
type LedgerType = "PAYMENT" | "ADJUSTMENT";

const contactSelection = { select: { id: true, firstName: true, lastName: true, company: true } } as const;
const currency = (value: unknown) => typeof value === "string" && /^[A-Z]{3}$/.test(value.toUpperCase()) ? value.toUpperCase() : "USD";
const text = (value: unknown) => typeof value === "string" ? value.trim() : "";
const date = (value: unknown, name: string) => { const result = new Date(text(value)); if (Number.isNaN(result.getTime())) throw new AppError("INVALID_TIME_LOG_INPUT", 422, "Invalid date.", `Enter a valid ${name}.`); return result; };

function cents(value: unknown, code: "INVALID_COMMISSION_INPUT" | "INVALID_LEDGER_ENTRY", allowNegative = false) {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number) || (!allowNegative && number < 0)) throw new AppError(code, 422, "Invalid monetary value.", "Enter a valid monetary amount.");
  const result = Math.round(number * 100);
  if (!Number.isSafeInteger(result) || Math.abs(result) > 2147483647) throw new AppError(code, 422, "Monetary value is too large.", "Enter an amount within the supported range.");
  return result;
}

function commissionStatus(expectedCents: number, receivedCents: number) {
  return receivedCents >= expectedCents && expectedCents > 0 ? "PAID" : receivedCents > 0 ? "PARTIALLY_PAID" : "PENDING" as const;
}

async function contactFor(context: RequestContext, contactId: unknown) {
  const id = text(contactId);
  if (!id) return null;
  const contact = await prisma.contact.findFirst({ where: { id, organizationId: context.user.organizationId, clientAccountId: context.activeClientAccountId }, select: { id: true } });
  if (!contact) throw new AppError("CONTACT_NOT_FOUND", 404, "Contact is outside active client.", "Choose a contact from the active client account.");
  return contact.id;
}

export async function listSalesOperations(context: RequestContext, filters: ReconciliationFilters = {}) {
  await prepareActiveClientSync(context);
  const scope = { organizationId: context.user.organizationId, clientAccountId: context.activeClientAccountId, ...(context.user.role === "AGENT" ? { userId: context.user.id } : {}) };
  const where = { ...scope, ...commissionPeriodWhere(filters) };
  const [commissions, timeLogs, balances, timeTotal] = await prisma.$transaction([
    prisma.commissionRecord.findMany({ where, include: { deal: { include: { contact: contactSelection } }, ledgerEntries: { orderBy: { occurredAt: "desc" }, take: 10 } }, orderBy: { updatedAt: "desc" }, take: 100 }),
    prisma.timeLog.findMany({ where: { ...scope, loggedAt: reconciliationDateRange(filters) }, include: { contact: contactSelection }, orderBy: { loggedAt: "desc" }, take: 100 }),
    prisma.commissionRecord.findMany({ where, select: { expectedCents: true, receivedCents: true, currency: true, deal: { select: { valueCents: true, status: true } } } }),
    prisma.timeLog.groupBy({ by: ["source", "isManualOverride"], orderBy: { source: "asc" }, where: { ...scope, loggedAt: reconciliationDateRange(filters) }, _sum: { minutes: true, trackedSeconds: true } }),
  ], { isolationLevel: "RepeatableRead" });
  return { commissions, timeLogs, summary: { ...summarizeCommissions(balances), ...summarizeTime(timeTotal) } };
}

export async function createManualCommission(context: RequestContext, input: Input, requestId: string) {
  await prepareActiveClientSync(context);
  const title = text(input.dealTitle); const notes = text(input.notes) || null; const expectedCents = cents(input.expectedCommission, "INVALID_COMMISSION_INPUT"); const receivedCents = input.receivedCommission === undefined || input.receivedCommission === "" ? 0 : cents(input.receivedCommission, "INVALID_COMMISSION_INPUT"); const valueCents = cents(input.dealValue, "INVALID_COMMISSION_INPUT");
  if (!title || expectedCents <= 0 || valueCents <= 0) throw new AppError("INVALID_COMMISSION_INPUT", 422, "Commission details are required.", "Enter a deal title, deal value, and expected commission greater than zero.");
  const contactId = await contactFor(context, input.contactId); const status = commissionStatus(expectedCents, receivedCents); const clientCurrency = currency(input.currency);
  const rate = Number(((expectedCents / valueCents) * 100).toFixed(2));
  const result = await prisma.$transaction(async (transaction) => {
    const deal = await transaction.deal.create({ data: { organizationId: context.user.organizationId, clientAccountId: context.activeClientAccountId, contactId, userId: context.user.id, title, valueCents, currency: clientCurrency, status: "CLOSED_WON", closedAt: new Date(), notes, isManual: true, commissionRate: rate, expectedRevenueCents: expectedCents } });
    const commission = await transaction.commissionRecord.create({ data: { organizationId: context.user.organizationId, clientAccountId: context.activeClientAccountId, dealId: deal.id, userId: context.user.id, expectedCents, receivedCents, currency: clientCurrency, status, source: "MANUAL", notes } });
    await transaction.commissionLedgerEntry.createMany({ data: [{ organizationId: context.user.organizationId, clientAccountId: context.activeClientAccountId, commissionId: commission.id, userId: context.user.id, type: "EXPECTED", amountCents: expectedCents, note: "Initial expected commission" }, ...(receivedCents > 0 ? [{ organizationId: context.user.organizationId, clientAccountId: context.activeClientAccountId, commissionId: commission.id, userId: context.user.id, type: "PAYMENT" as const, amountCents: receivedCents, note: "Initial received commission" }] : [])] });
    return transaction.commissionRecord.findUniqueOrThrow({ where: { id: commission.id }, include: { deal: { include: { contact: contactSelection } }, ledgerEntries: { orderBy: { occurredAt: "desc" } } } });
  });
  await recordAuditEvent(context, { action: "DEAL_CREATED", entityType: "DEAL", entityId: result.dealId ?? undefined, requestId, source: "PLATFORM", metadata: { manual: true, valueCents } });
  await recordAuditEvent(context, { action: "COMMISSION_CREATED", entityType: "COMMISSION_RECORD", entityId: result.id, requestId, source: "PLATFORM", metadata: { expectedCents, receivedCents, status: result.status } });
  try {
    const { syncDealToClickUp } = await import("@/lib/agent-crm/agent-sales-service");
    if (result.dealId) await syncDealToClickUp(result.dealId, context.user.id);
  } catch (err) {
    console.warn("[Manual Commission] ClickUp sync non-blocking error:", err);
  }
  return result;
}

export async function updateCommission(context: RequestContext, id: string, input: Input, requestId: string) {
  await prepareActiveClientSync(context);
  return prisma.$transaction(async (tx) => {
    // Read balances only after locking, so concurrent payments/corrections cannot lose updates.
    await tx.$queryRaw`SELECT "id" FROM "CommissionRecord" WHERE "id" = ${id}
      AND "organizationId" = ${context.user.organizationId}
      AND "clientAccountId" = ${context.activeClientAccountId} FOR UPDATE`;
    const existing = await tx.commissionRecord.findFirst({ where: { id, organizationId: context.user.organizationId, clientAccountId: context.activeClientAccountId, ...(context.user.role === "AGENT" ? { userId: context.user.id } : {}) } });
    if (!existing) throw new AppError("COMMISSION_NOT_FOUND", 404, "Commission is outside active client.", "Choose a commission from the active client account.");
    let expectedCents = existing.expectedCents;
    let receivedCents = existing.receivedCents;
    const entries: Array<{ type: LedgerType; amountCents: number; note: string }> = [];
    const ledgerAction = text(input.action) === "LEDGER";
    if (ledgerAction) {
      const type = input.type === "PAYMENT" || input.type === "ADJUSTMENT" ? input.type as LedgerType : null;
      const amountCents = cents(input.amount, "INVALID_LEDGER_ENTRY", type === "ADJUSTMENT");
      const note = text(input.note);
      if (!type || !note || amountCents === 0) throw new AppError("INVALID_LEDGER_ENTRY", 422, "Ledger entry details are required.", "Choose an entry type, enter an amount, and explain the adjustment.");
      if (type === "ADJUSTMENT") expectedCents += amountCents;
      else receivedCents += amountCents;
      entries.push({ type, amountCents, note });
    } else {
      expectedCents = input.expectedCommission === undefined ? expectedCents : cents(input.expectedCommission, "INVALID_COMMISSION_INPUT");
      receivedCents = input.receivedCommission === undefined ? receivedCents : cents(input.receivedCommission, "INVALID_COMMISSION_INPUT");
      const note = text(input.note) || text(input.notes) || "Manual commission correction";
      if (expectedCents !== existing.expectedCents) entries.push({ type: "ADJUSTMENT", amountCents: expectedCents - existing.expectedCents, note });
      if (receivedCents !== existing.receivedCents) entries.push({ type: "PAYMENT", amountCents: receivedCents - existing.receivedCents, note });
    }
    if (expectedCents < 0 || receivedCents < 0 || expectedCents > 2147483647 || receivedCents > 2147483647) {
      throw new AppError("INVALID_LEDGER_ENTRY", 422, "Correction would create invalid balances.", "Keep commission totals at zero or above and within the supported range.");
    }
    if (entries.length) await tx.commissionLedgerEntry.createMany({ data: entries.map(entry => ({ ...entry, organizationId: existing.organizationId, clientAccountId: existing.clientAccountId, commissionId: id, userId: context.user.id })) });
    const commission = await tx.commissionRecord.update({
      where: { id },
      data: { expectedCents, receivedCents, notes: input.notes === undefined ? existing.notes : text(input.notes) || null, status: commissionStatus(expectedCents, receivedCents), isManualOverride: true },
      include: { deal: { include: { contact: contactSelection } }, ledgerEntries: { orderBy: [{ occurredAt: "desc" }, { id: "desc" }], take: 10 } },
    });
    await tx.auditLog.create({ data: {
      organizationId: existing.organizationId, clientAccountId: existing.clientAccountId, userId: context.user.id,
      action: ledgerAction ? "COMMISSION_LEDGER_ADJUSTED" : "COMMISSION_UPDATED", entityType: "COMMISSION_RECORD", entityId: id,
      requestId, source: "PLATFORM", metadata: { expectedCents, receivedCents, previousExpectedCents: existing.expectedCents, previousReceivedCents: existing.receivedCents, entries, manualOverride: true },
    } });
    return commission;
  });
}

export async function listTimeOperations(context: RequestContext, filters: ReconciliationFilters = {}) {
  await prepareActiveClientSync(context);
  const where = { organizationId: context.user.organizationId, clientAccountId: context.activeClientAccountId, ...(context.user.role === "AGENT" ? { userId: context.user.id } : {}), loggedAt: reconciliationDateRange(filters) };
  const [timeLogs, groups, recordCount] = await prisma.$transaction([
    prisma.timeLog.findMany({ where, include: { contact: contactSelection }, orderBy: [{ loggedAt: "desc" }, { id: "desc" }], take: 100 }),
    prisma.timeLog.groupBy({ by: ["source", "isManualOverride"], orderBy: { source: "asc" }, where, _sum: { minutes: true, trackedSeconds: true } }),
    prisma.timeLog.count({ where }),
  ], { isolationLevel: "RepeatableRead" });
  return { timeLogs, summary: { ...summarizeTime(groups), recordCount } };
}
export async function listTimeLogs(context: RequestContext) { return (await listTimeOperations(context)).timeLogs; }

export async function createManualTimeLog(context: RequestContext, input: Input, requestId: string) {
  await prepareActiveClientSync(context); const minutes = Number(input.minutes); const description = text(input.description); if (!Number.isInteger(minutes) || minutes < 1 || minutes > 1440 || !description) throw new AppError("INVALID_TIME_LOG_INPUT", 422, "Invalid time log.", "Enter a description and a duration between 1 and 1,440 minutes."); const contactId = await contactFor(context, input.contactId); const timeLog = await prisma.timeLog.create({ data: { organizationId: context.user.organizationId, clientAccountId: context.activeClientAccountId, contactId, userId: context.user.id, source: "MANUAL", minutes, description, loggedAt: input.loggedAt ? date(input.loggedAt, "logged date") : new Date() }, include: { contact: contactSelection } }); await recordAuditEvent(context, { action: "TIME_LOG_CREATED", entityType: "TIME_LOG", entityId: timeLog.id, requestId, source: "PLATFORM", metadata: { minutes, source: timeLog.source } }); return timeLog;
}

export async function updateTimeLog(context: RequestContext, id: string, input: Input, requestId: string) {
  await prepareActiveClientSync(context);
  const where = { id, organizationId: context.user.organizationId, clientAccountId: context.activeClientAccountId, ...(context.user.role === "AGENT" ? { userId: context.user.id } : {}) };
  const owned = await prisma.timeLog.findFirst({ where });
  if (!owned) throw new AppError("TIME_LOG_NOT_FOUND", 404, "Time log is outside active client.", "Choose a time log from the active client account.");
  return prisma.$transaction(async tx => {
    // Same lock order as heartbeats: cursor first, then its time log.
    if (owned.userId) await tx.$queryRaw`SELECT "id" FROM "TimeTrackingSession" WHERE "userId" = ${owned.userId} AND "organizationId" = ${context.user.organizationId} FOR UPDATE`;
    await tx.$queryRaw`SELECT "id" FROM "TimeLog" WHERE "id" = ${id} FOR UPDATE`;
    const existing = await tx.timeLog.findFirstOrThrow({ where });
    const minutes = input.minutes === undefined ? existing.minutes : Number(input.minutes);
    const description = input.description === undefined ? existing.description : text(input.description);
    const minimum = existing.source === "AUTO" ? 0 : 1;
    if (!Number.isInteger(minutes) || minutes < minimum || minutes > 1440 || !description) throw new AppError("INVALID_TIME_LOG_INPUT", 422, "Invalid time log.", `Enter a description and a duration between ${minimum} and 1,440 minutes.`);
    await tx.timeTrackingSession.updateMany({ where: { organizationId: existing.organizationId, timeLogId: id }, data: { isRunning: false, timeLogId: null, lastHeartbeatAt: null, pauseReason: "MANUAL" } });
    const log = await tx.timeLog.update({ where: { id }, data: { minutes, description, loggedAt: input.loggedAt === undefined ? existing.loggedAt : date(input.loggedAt, "logged date"), isManualOverride: true }, include: { contact: contactSelection } });
    await tx.auditLog.create({ data: { organizationId: existing.organizationId, clientAccountId: existing.clientAccountId, userId: context.user.id, action: "TIME_LOG_UPDATED", entityType: "TIME_LOG", entityId: id, requestId, source: "PLATFORM", metadata: { minutes, previousMinutes: existing.minutes, trackedSeconds: existing.trackedSeconds, manualOverride: true, source: existing.source } } });
    return log;
  });
}
