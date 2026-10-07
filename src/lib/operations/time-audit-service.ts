import "server-only";
import type { AuthenticatedUser } from "@/lib/models/canonical";
import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/errors/app-error";
import { csvCell, reconciliationDateRange, type ReconciliationFilters } from "@/lib/operations/reconciliation";
import { effectiveTimeSeconds, expectedHourlyPayCents, formatTrackedTime } from "@/lib/operations/time-tracking-policy";

function agentOnly(user: AuthenticatedUser) {
  if (user.role !== "AGENT") throw new AppError("FORBIDDEN", 403, "Agent access required.", "Time Audit is available in the agent workspace.");
}

export async function saveHourlyRate(user: AuthenticatedUser, input: Record<string, unknown>) {
  agentOnly(user);
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new AppError("INVALID_TIME_LOG_INPUT", 422, "Invalid hourly rate.", "Enter a valid hourly rate and currency.");
  const rate = typeof input.hourlyRate === "string" || typeof input.hourlyRate === "number" ? String(input.hourlyRate) : "";
  const currency = typeof input.currency === "string" ? input.currency.toUpperCase() : "";
  const cents = Math.round(Number(rate) * 100);
  if (!/^\d+(\.\d{1,2})?$/.test(rate) || !Number.isSafeInteger(cents) || cents < 0 || cents > 100000000 || !/^[A-Z]{3}$/.test(currency)) {
    throw new AppError("INVALID_TIME_LOG_INPUT", 422, "Invalid hourly rate.", "Enter a non-negative hourly rate with at most two decimal places and a three-letter currency code.");
  }
  return prisma.user.update({ where: { id: user.id, organizationId: user.organizationId }, data: { hourlyRateCents: cents, hourlyRateCurrency: currency }, select: { hourlyRateCents: true, hourlyRateCurrency: true } });
}

export async function getTimeAudit(user: AuthenticatedUser, filters: ReconciliationFilters = {}, clientId?: string, page = 1, exportAll = false) {
  agentOnly(user);
  if (!Number.isInteger(page) || page < 1 || page > 1000000) throw new AppError("INVALID_TIME_LOG_INPUT", 422, "Invalid page.", "Choose a valid page.");
  const dateRange = reconciliationDateRange(filters);
  return prisma.$transaction(async tx => {
    const [profile, clients] = await Promise.all([
      tx.user.findFirstOrThrow({ where: { id: user.id, organizationId: user.organizationId }, select: { hourlyRateCents: true, hourlyRateCurrency: true } }),
      tx.clientAccount.findMany({ where: { organizationId: user.organizationId, status: "ACTIVE", agentAssignments: { some: { userId: user.id } } }, select: { id: true, name: true }, orderBy: [{ name: "asc" }, { id: "asc" }] }),
    ]);
    if (clientId && !clients.some(client => client.id === clientId)) throw new AppError("CLIENT_ACCESS_DENIED", 403, "Client access denied.", "Choose an assigned client.");
    const where = { organizationId: user.organizationId, userId: user.id, clientAccountId: { in: clients.filter(client => !clientId || client.id === clientId).map(client => client.id) }, loggedAt: dateRange };
    const [groups, logs, count] = await Promise.all([
      tx.timeLog.groupBy({ by: ["clientAccountId", "source", "isManualOverride"], where, _sum: { minutes: true, trackedSeconds: true }, _count: { _all: true } }),
      tx.timeLog.findMany({ where, orderBy: [{ loggedAt: "desc" }, { id: "desc" }], ...(exportAll ? {} : { take: 50, skip: (page - 1) * 50 }), select: { id: true, clientAccountId: true, contactId: true, source: true, isManualOverride: true, minutes: true, trackedSeconds: true, description: true, loggedAt: true } }),
      tx.timeLog.count({ where }),
    ]);
    const summaries = clients.filter(client => !clientId || client.id === clientId).map(client => {
      const matching = groups.filter(group => group.clientAccountId === client.id);
      const seconds = matching.reduce((sum, group) => sum + effectiveTimeSeconds({ source: group.source, isManualOverride: group.isManualOverride, minutes: group._sum.minutes ?? 0, trackedSeconds: group._sum.trackedSeconds ?? 0 }), 0);
      return { ...client, seconds, logCount: matching.reduce((sum, group) => sum + group._count._all, 0), expectedPayCents: expectedHourlyPayCents(seconds, profile.hourlyRateCents) };
    });
    return { ...profile, clients, summaries, logs: logs.map(log => ({ ...log, clientName: clients.find(client => client.id === log.clientAccountId)?.name ?? "", seconds: effectiveTimeSeconds(log), loggedAt: log.loggedAt.toISOString() })), page, pageSize: 50, logCount: count, totalSeconds: summaries.reduce((sum, client) => sum + client.seconds, 0), totalExpectedPayCents: profile.hourlyRateCents === null ? null : summaries.reduce((sum, client) => sum + (client.expectedPayCents ?? 0), 0) };
  }, { isolationLevel: "RepeatableRead" });
}

export function timeAuditCsv(report: Awaited<ReturnType<typeof getTimeAudit>>) {
  const row = (values: unknown[]) => values.map(csvCell).join(",");
  const money = (cents: number | null) => cents === null ? "Not set" : (cents / 100).toFixed(2);
  return "\uFEFF" + [
    row(["Client", "Time spent", "Seconds", "Hours", "Hourly rate", "Currency", "Expected pay (estimate)", "Log count"]),
    ...report.summaries.map(client => row([client.name, formatTrackedTime(client.seconds), client.seconds, (client.seconds / 3600).toFixed(6), money(report.hourlyRateCents), report.hourlyRateCurrency, money(client.expectedPayCents), client.logCount])),
    row(["TOTAL", formatTrackedTime(report.totalSeconds), report.totalSeconds, (report.totalSeconds / 3600).toFixed(6), money(report.hourlyRateCents), report.hourlyRateCurrency, money(report.totalExpectedPayCents), report.logCount]),
    "", row(["Estimates use the currently saved hourly rate across all included logs. Dates are UTC. Saved time only; commissions and actual payments are separate."]), "",
    row(["Client", "Logged at (UTC)", "Description", "Source", "Manually corrected", "Seconds", "Hours"]),
    ...report.logs.map(log => row([log.clientName, log.loggedAt, log.description, log.source, log.isManualOverride, log.seconds, (log.seconds / 3600).toFixed(6)])),
  ].join("\r\n");
}
