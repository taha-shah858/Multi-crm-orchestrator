import type { Prisma } from "@prisma/client";
import { AppError } from "@/lib/errors/app-error";

export interface ReconciliationFilters { from?: string; to?: string; currency?: string; }
export interface CurrencyTotals {
  currency: string;
  expectedCents: number;
  receivedCents: number;
  pendingCents: number;
  dealValueCents: number;
  records: number;
}
type Balance = { expectedCents: number; receivedCents: number; currency: string; deal: { valueCents: number; status?: string } | null };

export function readReconciliationFilters(params: URLSearchParams): ReconciliationFilters {
  const filters = { from: params.get("from") || undefined, to: params.get("to") || undefined, currency: params.get("currency") || undefined };
  reconciliationDateRange(filters);
  if (filters.currency && !/^[A-Z]{3}$/.test(filters.currency)) {
    throw new AppError("INVALID_COMMISSION_INPUT", 422, "Invalid currency filter.", "Choose a three-letter currency code.");
  }
  return filters;
}

// Date controls describe whole UTC days; report balances are current, not historical snapshots.
export function reconciliationDateRange(filters: ReconciliationFilters) {
  const parse = (value: string | undefined) => {
    if (!value) return undefined;
    const result = new Date(`${value}T00:00:00.000Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(result.getTime()) || result.toISOString().slice(0, 10) !== value) {
      throw new AppError("INVALID_COMMISSION_INPUT", 422, "Invalid report date.", "Choose a valid report date.");
    }
    return result;
  };
  const gte = parse(filters.from);
  const end = parse(filters.to);
  if (gte && end && gte > end) throw new AppError("INVALID_COMMISSION_INPUT", 422, "Report dates are reversed.", "The start date must be on or before the end date.");
  return { ...(gte ? { gte } : {}), ...(end ? { lt: new Date(end.getTime() + 86400000) } : {}) };
}

export function commissionPeriodWhere(filters: ReconciliationFilters): Prisma.CommissionRecordWhereInput {
  const range = reconciliationDateRange(filters);
  return {
    ...(filters.currency ? { currency: filters.currency } : {}),
    ...(Object.keys(range).length ? { OR: [
      { deal: { is: { closedAt: range } } },
      { deal: { is: null }, createdAt: range },
      { deal: { is: { closedAt: null } }, createdAt: range },
    ] } : {}),
  };
}

export function summarizeCommissions(records: Balance[]) {
  const groups = new Map<string, CurrencyTotals>();
  for (const record of records) {
    const total = groups.get(record.currency) ?? { currency: record.currency, expectedCents: 0, receivedCents: 0, pendingCents: 0, dealValueCents: 0, records: 0 };
    total.expectedCents += record.expectedCents;
    total.receivedCents += record.receivedCents;
    // Overpayment on one deal must not hide another deal's unpaid commission.
    total.pendingCents += Math.max(0, record.expectedCents - record.receivedCents);
    total.dealValueCents += record.deal?.valueCents ?? 0;
    total.records++;
    groups.set(record.currency, total);
  }
  const currencyTotals = [...groups.values()].sort((a, b) => a.currency.localeCompare(b.currency));
  const single = currencyTotals.length === 1 ? currencyTotals[0] : null;
  return {
    currencyTotals,
    recordCount: records.length,
    closedDeals: records.filter(record => record.deal?.status === "CLOSED_WON").length,
    // Retain the old response fields for single-currency consumers only.
    expectedCents: single?.expectedCents ?? 0,
    receivedCents: single?.receivedCents ?? 0,
    pendingCents: single?.pendingCents ?? 0,
    dealValueCents: single?.dealValueCents ?? 0,
  };
}

export function csvCell(value: unknown) {
  let text = String(value ?? "");
  // Neutralize spreadsheet formulas in user/provider text, including leading whitespace.
  if (/^\s*[=+@-]/.test(text) && typeof value !== "number") text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
