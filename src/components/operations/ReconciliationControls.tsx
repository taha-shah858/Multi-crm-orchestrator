"use client";

import type { ReactNode } from "react";
import type { CurrencyTotals } from "@/lib/operations/reconciliation";

export interface ReportDates { from: string; to: string; }
export function reportQuery(dates: ReportDates) {
  const params = new URLSearchParams();
  if (dates.from) params.set("from", dates.from);
  if (dates.to) params.set("to", dates.to);
  return params.toString();
}

export function currencySummary(totals: CurrencyTotals[], field: "expectedCents" | "receivedCents" | "pendingCents") {
  return totals.map(total => `${total.currency} ${new Intl.NumberFormat(undefined, { style: "currency", currency: total.currency }).format(total[field] / 100)}`).join(" · ") || "—";
}

export async function downloadCommissionReport(url: string) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.error?.message ?? "The commission report could not be exported.");
  }
  const objectUrl = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = "commission-reconciliation.csv";
  link.click();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

export function ReconciliationControls({ dates, onChange, children }: { dates: ReportDates; onChange: (dates: ReportDates) => void; children?: ReactNode }) {
  return <div className="space-y-3 rounded-xl border border-crm-border bg-crm-surface p-4">
    <div className="flex flex-wrap items-end gap-3">
      <label className="space-y-1 text-xs text-crm-text-muted"><span className="block">Closed from (UTC)</span><input type="date" value={dates.from} max={dates.to || undefined} onChange={event => onChange({ ...dates, from: event.target.value })} className="rounded-lg border border-crm-border bg-crm-base p-2 text-crm-text" /></label>
      <label className="space-y-1 text-xs text-crm-text-muted"><span className="block">Closed through (UTC)</span><input type="date" value={dates.to} min={dates.from || undefined} onChange={event => onChange({ ...dates, to: event.target.value })} className="rounded-lg border border-crm-border bg-crm-base p-2 text-crm-text" /></label>
      {(dates.from || dates.to) && <button type="button" onClick={() => onChange({ from: "", to: "" })} className="px-3 py-2 text-xs text-primary-cyan">All dates</button>}
      {children}
    </div>
    <p className="text-xs text-crm-text-muted">Current balances for deals closed in this period. Totals and exports include every matching record, grouped by currency.</p>
  </div>;
}
