import { recordAuditEvent } from "@/lib/audit/audit-log";
import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/errors/app-error";
import type { RequestContext } from "@/lib/models/canonical";
import { prepareActiveClientSync } from "@/lib/sync/contact-sync-service";

type Input = Record<string, unknown>;
type LedgerType = "PAYMENT" | "ADJUSTMENT";

const contactSelection = { select: { id: true, firstName: true, lastName: true, company: true } } as const;
const currency = (value: unknown) => typeof value === "string" && /^[A-Z]{3}$/.test(value.toUpperCase()) ? value.toUpperCase() : "USD";
const text = (value: unknown) => typeof value === "string" ? value.trim() : "";
const date = (value: unknown, name: string) => { const result = new Date(text(value)); if (Number.isNaN(result.getTime())) throw new AppError("INVALID_TIME_LOG_INPUT", 422, "Invalid date.", `Enter a valid ${name}.`); return result; };

function cents(value: unknown, code: "INVALID_COMMISSION_INPUT" | "INVALID_LEDGER_ENTRY", allowNegative = false) {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number) || (!allowNegative && number < 0)) throw new AppError(code, 422, "Invalid monetary value.", "Enter a valid monetary amount.");
  return Math.round(number * 100);
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

export async function listSalesOperations(context: RequestContext) {
  await prepareActiveClientSync(context);
  const where = { organizationId: context.user.organizationId, clientAccountId: context.activeClientAccountId };
  const [commissions, timeLogs] = await Promise.all([
    prisma.commissionRecord.findMany({ where, include: { deal: { include: { contact: contactSelection } }, ledgerEntries: { orderBy: { occurredAt: "desc" }, take: 10 } }, orderBy: { updatedAt: "desc" }, take: 100 }),
    prisma.timeLog.findMany({ where, include: { contact: contactSelection }, orderBy: { loggedAt: "desc" }, take: 100 }),
  ]);
  const summary = commissions.reduce((totals, commission) => ({ expectedCents: totals.expectedCents + commission.expectedCents, receivedCents: totals.receivedCents + commission.receivedCents, dealValueCents: totals.dealValueCents + (commission.deal?.valueCents ?? 0), closedDeals: totals.closedDeals + (commission.deal?.status === "CLOSED_WON" ? 1 : 0) }), { expectedCents: 0, receivedCents: 0, dealValueCents: 0, closedDeals: 0 });
  const activeMinutes = timeLogs.reduce((total, log) => total + log.minutes, 0);
  return { commissions, timeLogs, summary: { ...summary, pendingCents: Math.max(0, summary.expectedCents - summary.receivedCents), activeMinutes, billableHours: Number((activeMinutes / 60).toFixed(2)) } };
}

export async function createManualCommission(context: RequestContext, input: Input, requestId: string) {
  await prepareActiveClientSync(context);
  const title = text(input.dealTitle); const notes = text(input.notes) || null; const expectedCents = cents(input.expectedCommission, "INVALID_COMMISSION_INPUT"); const receivedCents = input.receivedCommission === undefined || input.receivedCommission === "" ? 0 : cents(input.receivedCommission, "INVALID_COMMISSION_INPUT"); const valueCents = cents(input.dealValue, "INVALID_COMMISSION_INPUT");
  if (!title || expectedCents <= 0 || valueCents <= 0) throw new AppError("INVALID_COMMISSION_INPUT", 422, "Commission details are required.", "Enter a deal title, deal value, and expected commission greater than zero.");
  const contactId = await contactFor(context, input.contactId); const status = commissionStatus(expectedCents, receivedCents); const clientCurrency = currency(input.currency);
  const result = await prisma.$transaction(async (transaction) => {
    const deal = await transaction.deal.create({ data: { organizationId: context.user.organizationId, clientAccountId: context.activeClientAccountId, contactId, userId: context.user.id, title, valueCents, currency: clientCurrency, status: "CLOSED_WON", closedAt: new Date(), notes, isManual: true } });
    const commission = await transaction.commissionRecord.create({ data: { organizationId: context.user.organizationId, clientAccountId: context.activeClientAccountId, dealId: deal.id, userId: context.user.id, expectedCents, receivedCents, currency: clientCurrency, status, source: "MANUAL", notes } });
    await transaction.commissionLedgerEntry.createMany({ data: [{ organizationId: context.user.organizationId, clientAccountId: context.activeClientAccountId, commissionId: commission.id, userId: context.user.id, type: "EXPECTED", amountCents: expectedCents, note: "Initial expected commission" }, ...(receivedCents > 0 ? [{ organizationId: context.user.organizationId, clientAccountId: context.activeClientAccountId, commissionId: commission.id, userId: context.user.id, type: "PAYMENT" as const, amountCents: receivedCents, note: "Initial received commission" }] : [])] });
    return transaction.commissionRecord.findUniqueOrThrow({ where: { id: commission.id }, include: { deal: { include: { contact: contactSelection } }, ledgerEntries: { orderBy: { occurredAt: "desc" } } } });
  });
  await recordAuditEvent(context, { action: "DEAL_CREATED", entityType: "DEAL", entityId: result.dealId ?? undefined, requestId, source: "PLATFORM", metadata: { manual: true, valueCents } });
  await recordAuditEvent(context, { action: "COMMISSION_CREATED", entityType: "COMMISSION_RECORD", entityId: result.id, requestId, source: "PLATFORM", metadata: { expectedCents, receivedCents, status: result.status } });
  return result;
}

export async function updateCommission(context: RequestContext, id: string, input: Input, requestId: string) {
  await prepareActiveClientSync(context);
  const existing = await prisma.commissionRecord.findFirst({ where: { id, organizationId: context.user.organizationId, clientAccountId: context.activeClientAccountId } });
  if (!existing) throw new AppError("COMMISSION_NOT_FOUND", 404, "Commission is outside active client.", "Choose a commission from the active client account.");
  const action = text(input.action);
  if (action === "LEDGER") {
    const type = input.type === "PAYMENT" || input.type === "ADJUSTMENT" ? input.type as LedgerType : null;
    const amountCents = cents(input.amount, "INVALID_LEDGER_ENTRY", type === "ADJUSTMENT"); const note = text(input.note);
    if (!type || !note || amountCents === 0) throw new AppError("INVALID_LEDGER_ENTRY", 422, "Ledger entry details are required.", "Choose an entry type, enter an amount, and explain the adjustment.");
    const nextExpected = type === "ADJUSTMENT" ? existing.expectedCents + amountCents : existing.expectedCents; const nextReceived = type === "PAYMENT" ? existing.receivedCents + amountCents : existing.receivedCents;
    if (nextExpected < 0 || nextReceived < 0) throw new AppError("INVALID_LEDGER_ENTRY", 422, "Ledger entry would make a total negative.", "Use an amount that keeps commission totals at zero or above.");
    const commission = await prisma.$transaction(async (transaction) => { await transaction.commissionLedgerEntry.create({ data: { organizationId: context.user.organizationId, clientAccountId: context.activeClientAccountId, commissionId: existing.id, userId: context.user.id, type, amountCents, note } }); return transaction.commissionRecord.update({ where: { id }, data: { expectedCents: nextExpected, receivedCents: nextReceived, status: commissionStatus(nextExpected, nextReceived), isManualOverride: true }, include: { deal: { include: { contact: contactSelection } }, ledgerEntries: { orderBy: { occurredAt: "desc" }, take: 10 } } }); });
    await recordAuditEvent(context, { action: "COMMISSION_LEDGER_ADJUSTED", entityType: "COMMISSION_LEDGER_ENTRY", entityId: commission.id, requestId, source: "PLATFORM", metadata: { type, amountCents } });
    return commission;
  }
  const expectedCents = input.expectedCommission === undefined ? existing.expectedCents : cents(input.expectedCommission, "INVALID_COMMISSION_INPUT"); const receivedCents = input.receivedCommission === undefined ? existing.receivedCents : cents(input.receivedCommission, "INVALID_COMMISSION_INPUT");
  if (expectedCents <= 0) throw new AppError("INVALID_COMMISSION_INPUT", 422, "Expected commission must be positive.", "Enter an expected commission greater than zero.");
  const commission = await prisma.commissionRecord.update({ where: { id }, data: { expectedCents, receivedCents, notes: input.notes === undefined ? existing.notes : text(input.notes) || null, status: commissionStatus(expectedCents, receivedCents), isManualOverride: true }, include: { deal: { include: { contact: contactSelection } }, ledgerEntries: { orderBy: { occurredAt: "desc" }, take: 10 } } });
  await recordAuditEvent(context, { action: "COMMISSION_UPDATED", entityType: "COMMISSION_RECORD", entityId: commission.id, requestId, source: "PLATFORM", metadata: { expectedCents, receivedCents, status: commission.status, manualOverride: true } });
  return commission;
}

export async function listTimeLogs(context: RequestContext) { await prepareActiveClientSync(context); return prisma.timeLog.findMany({ where: { organizationId: context.user.organizationId, clientAccountId: context.activeClientAccountId }, include: { contact: contactSelection }, orderBy: { loggedAt: "desc" }, take: 100 }); }

export async function createManualTimeLog(context: RequestContext, input: Input, requestId: string) {
  await prepareActiveClientSync(context); const minutes = Number(input.minutes); const description = text(input.description); if (!Number.isInteger(minutes) || minutes < 1 || minutes > 1440 || !description) throw new AppError("INVALID_TIME_LOG_INPUT", 422, "Invalid time log.", "Enter a description and a duration between 1 and 1,440 minutes."); const contactId = await contactFor(context, input.contactId); const timeLog = await prisma.timeLog.create({ data: { organizationId: context.user.organizationId, clientAccountId: context.activeClientAccountId, contactId, userId: context.user.id, source: "MANUAL", minutes, description, loggedAt: input.loggedAt ? date(input.loggedAt, "logged date") : new Date() }, include: { contact: contactSelection } }); await recordAuditEvent(context, { action: "TIME_LOG_CREATED", entityType: "TIME_LOG", entityId: timeLog.id, requestId, source: "PLATFORM", metadata: { minutes, source: timeLog.source } }); return timeLog;
}

export async function updateTimeLog(context: RequestContext, id: string, input: Input, requestId: string) {
  await prepareActiveClientSync(context); const existing = await prisma.timeLog.findFirst({ where: { id, organizationId: context.user.organizationId, clientAccountId: context.activeClientAccountId } }); if (!existing) throw new AppError("TIME_LOG_NOT_FOUND", 404, "Time log is outside active client.", "Choose a time log from the active client account."); const minutes = input.minutes === undefined ? existing.minutes : Number(input.minutes); const description = input.description === undefined ? existing.description : text(input.description); if (!Number.isInteger(minutes) || minutes < 1 || minutes > 1440 || !description) throw new AppError("INVALID_TIME_LOG_INPUT", 422, "Invalid time log.", "Enter a description and a duration between 1 and 1,440 minutes."); const timeLog = await prisma.timeLog.update({ where: { id }, data: { minutes, description, loggedAt: input.loggedAt === undefined ? existing.loggedAt : date(input.loggedAt, "logged date"), isManualOverride: true }, include: { contact: contactSelection } }); await recordAuditEvent(context, { action: "TIME_LOG_UPDATED", entityType: "TIME_LOG", entityId: timeLog.id, requestId, source: "PLATFORM", metadata: { minutes, manualOverride: true } }); return timeLog;
}
