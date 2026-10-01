import "server-only";

import { prisma } from "@/lib/db/prisma";
import { assertClientAccess } from "@/lib/auth/auth-service";
import { AppError } from "@/lib/errors/app-error";
import type { AuthenticatedUser } from "@/lib/models/canonical";
import { commissionPeriodWhere, csvCell, summarizeCommissions, type ReconciliationFilters } from "@/lib/operations/reconciliation";

export async function getCommissionReport(user: AuthenticatedUser, clientAccountId?: string, filters: ReconciliationFilters = {}) {
  if (clientAccountId) await assertClientAccess(user, clientAccountId);
  else if (user.role === "AGENT") throw new AppError("FORBIDDEN", 403, "Company reports require admin access.", "Export commissions from your assigned client account.");
  const records = await prisma.commissionRecord.findMany({
    where: { organizationId: user.organizationId, ...(clientAccountId ? { clientAccountId } : {}), ...(user.role === "AGENT" ? { userId: user.id } : {}), ...commissionPeriodWhere(filters) },
    include: { clientAccount: { select: { name: true } }, user: { select: { name: true } }, deal: { include: { contact: { select: { firstName: true, lastName: true } } } } },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
  return { records, summary: summarizeCommissions(records) };
}

export function commissionReportCsv(report: Awaited<ReturnType<typeof getCommissionReport>>) {
  const rows: unknown[][] = [["Client", "Agent", "Deal", "Contact", "Closed date (UTC)", "Currency", "Deal value", "Commission rate (%)", "Expected commission", "Received commission", "Pending commission", "Status", "Source", "Manually corrected", "Notes"]];
  for (const record of report.records) rows.push([
    record.clientAccount.name, record.user?.name ?? "Unassigned", record.deal?.title ?? "Manual commission",
    [record.deal?.contact?.firstName, record.deal?.contact?.lastName].filter(Boolean).join(" "),
    (record.deal?.closedAt ?? record.createdAt).toISOString(), record.currency, (record.deal?.valueCents ?? 0) / 100,
    record.deal?.commissionRate ?? "", record.expectedCents / 100, record.receivedCents / 100,
    Math.max(0, record.expectedCents - record.receivedCents) / 100, record.status, record.source, record.isManualOverride ? "Yes" : "No", record.notes ?? "",
  ]);
  rows.push([], ["Totals by currency — current balances for deals closed in the selected period"], ["Currency", "Records", "Expected", "Received", "Pending"]);
  for (const total of report.summary.currencyTotals) rows.push([total.currency, total.records, total.expectedCents / 100, total.receivedCents / 100, total.pendingCents / 100]);
  return "\uFEFF" + rows.map(row => row.map(csvCell).join(",")).join("\r\n");
}

export function commissionReportResponse(report: Awaited<ReturnType<typeof getCommissionReport>>) {
  return new Response(commissionReportCsv(report), { headers: {
    "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="commission-reconciliation.csv"', "cache-control": "private, no-store",
  } });
}
