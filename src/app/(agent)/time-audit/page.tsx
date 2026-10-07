"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import TimeLedgerEditor from "@/components/operations/TimeLedgerEditor";
import { Clock3, Download, RefreshCw } from "lucide-react";
import { useClientAccount } from "@/context/ClientAccountContext";
import { TIME_LOG_UPDATED_EVENT } from "@/components/operations/ActiveTimeTracker";
import { formatTrackedTime } from "@/lib/operations/time-tracking-policy";

export interface TimeReport {
  hourlyRateCents: number | null; hourlyRateCurrency: string;
  clients: { id: string; name: string }[];
  summaries: { id: string; name: string; seconds: number; expectedPayCents: number | null; logCount: number }[];
  logs: { id: string; clientAccountId: string; clientName: string; seconds: number; minutes: number; trackedSeconds: number; contactId: string | null; description: string; loggedAt: string; source: string; isManualOverride: boolean }[];
  page: number; pageSize: number; logCount: number; totalSeconds: number; totalExpectedPayCents: number | null;
}
const field = "rounded-lg border border-crm-border bg-crm-bg px-3 py-2 text-sm text-crm-text";
const button = "rounded-lg border border-crm-border px-3 py-2 text-sm hover:border-primary-cyan disabled:opacity-50";
const money = (cents: number | null, currency: string) => cents === null ? "Set hourly rate" : `${currency} ${(cents / 100).toFixed(2)}`;

export default function TimeAuditPage() {
  const { user, activeClientAccount, isClientAccountReady } = useClientAccount();
  const [allClients, setAllClients] = useState(false);
  const [from, setFrom] = useState(""); const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [report, setReport] = useState<TimeReport | null>(null);
  const [error, setError] = useState(""); const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false); const [saving, setSaving] = useState(false);
  const [hourlyRate, setHourlyRate] = useState(""); const [currency, setCurrency] = useState("USD");
  const [editingLog, setEditingLog] = useState<TimeReport["logs"][number] | null>(null);
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const generation = useRef(0); const rateLoaded = useRef(false);
  const query = useCallback((wholeAgency = false) => {
    const params = new URLSearchParams();
    if (from) params.set("from", from); if (to) params.set("to", to);
    if (!wholeAgency && !allClients) params.set("clientId", activeClientAccount.id);
    params.set("page", String(page));
    return params;
  }, [from, to, allClients, activeClientAccount.id, page]);
  const load = useCallback(async (silent = false) => {
    if (!isClientAccountReady || user?.role !== "AGENT") return;
    const current = ++generation.current;
    if (!silent) setLoading(true);
    try {
      const response = await fetch(`/api/time-audit?${query()}`, { cache: "no-store", signal: AbortSignal.timeout(15000) });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error?.message || "Time audit could not be loaded.");
      if (current !== generation.current) return;
      setReport(payload.report); setError("");
      if (!rateLoaded.current) {
        setHourlyRate(payload.report.hourlyRateCents === null ? "" : (payload.report.hourlyRateCents / 100).toFixed(2));
        setCurrency(payload.report.hourlyRateCurrency); rateLoaded.current = true;
      }
    } catch (err) { if (current === generation.current) setError(err instanceof Error ? err.message : "Time audit could not be loaded."); }
    finally { if (current === generation.current) setLoading(false); }
  }, [isClientAccountReady, user?.role, query]);
  useEffect(() => {
    queueMicrotask(() => void load());
    const refresh = () => { if (document.visibilityState === "visible") void load(true); };
    window.addEventListener(TIME_LOG_UPDATED_EVENT, refresh); window.addEventListener("focus", refresh);
    const timer = setInterval(refresh, 20000);
    return () => { generation.current++; clearInterval(timer); window.removeEventListener(TIME_LOG_UPDATED_EVENT, refresh); window.removeEventListener("focus", refresh); };
  }, [load]);
  async function saveRate(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/time-audit", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ hourlyRate, currency }) });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error?.message || "Hourly rate could not be saved.");
      setNotice("Hourly rate saved. Expected pay has been recalculated."); window.dispatchEvent(new Event(TIME_LOG_UPDATED_EVENT));
    } catch (err) { setError(err instanceof Error ? err.message : "Hourly rate could not be saved."); }
    finally { setSaving(false); }
  }
  if (user && user.role !== "AGENT") return <p className="p-8">Open Time Audit from the agent workspace.</p>;
  const visibleReport = loading || (!allClients && report?.summaries.some(client => client.id !== activeClientAccount.id)) ? null : report;
  const scope = allClients ? "All assigned clients" : activeClientAccount.name;
  const exportParams = query(true); exportParams.set("format", "csv"); exportParams.delete("page");
  const unavailable = loading || !isClientAccountReady ? "Loading…" : error ? "Unavailable" : "No data";
  return <div className="space-y-6 p-6 md:p-8 text-crm-text">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="flex items-center gap-2 text-2xl font-semibold"><Clock3 className="h-6 w-6" />Time Audit</h1><p className="mt-2 text-sm text-crm-text-muted">Work time and expected hourly pay, separate from commissions.</p></div>
      <div className="flex gap-2"><button className={button} onClick={() => void load()} disabled={loading}><RefreshCw className="mr-2 inline h-4 w-4" />Refresh</button><a className={button} href={isClientAccountReady ? `/api/time-audit?${exportParams}` : undefined} download="all-client-time-audit.csv" aria-disabled={!isClientAccountReady}><Download className="mr-2 inline h-4 w-4" />Download all clients CSV</a></div>
    </header>
    {error && <p role="alert" className="rounded-lg border border-red-400/30 p-3 text-sm text-red-400">{error}</p>}
    {notice && <p role="status" className="text-sm text-emerald-400">{notice}</p>}
    <form onSubmit={saveRate} className="rounded-xl border border-crm-border bg-crm-card p-5">
      <h2 className="font-semibold">Your hourly pay</h2>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="grid gap-1 text-sm">Hourly rate<input className={field} type="number" min="0" max="1000000" step="0.01" required value={hourlyRate} onChange={event => setHourlyRate(event.target.value)} placeholder="e.g. 30.00" /></label>
        <label className="grid gap-1 text-sm">Currency<input className={`${field} w-24`} maxLength={3} pattern="[A-Za-z]{3}" required value={currency} onChange={event => setCurrency(event.target.value.toUpperCase())} /></label>
        <button className={button} disabled={saving || !isClientAccountReady}>{saving ? "Saving…" : "Save hourly rate"}</button>
      </div>
      <p className="mt-3 text-xs text-crm-text-muted">Expected pay = hourly rate × seconds worked ÷ 3,600. Ten minutes earns one-sixth of your hourly rate. Changing the rate recalculates all included logs; estimates do not record actual payments.</p>
    </form>
    <section className="flex flex-wrap items-end gap-3" aria-label="Report filters">
      <label className="grid gap-1 text-sm">Client view<select className={field} value={allClients ? "ALL" : "CURRENT"} onChange={event => { setAllClients(event.target.value === "ALL"); setPage(1); }}><option value="CURRENT">Current client: {activeClientAccount.name}</option><option value="ALL">All assigned clients</option></select></label>
      <label className="grid gap-1 text-sm">From (UTC)<input className={field} type="date" value={from} onChange={event => { setFrom(event.target.value); setPage(1); }} /></label>
      <label className="grid gap-1 text-sm">To (UTC)<input className={field} type="date" value={to} onChange={event => { setTo(event.target.value); setPage(1); }} /></label>
      <span className="pb-2 text-xs text-crm-text-muted">Leave dates empty for all time. CSV includes every assigned client and every matching log.</span>
    </section>
    <div className="grid gap-4 md:grid-cols-3">
      {[ ["Client view", scope], ["Time spent", visibleReport ? formatTrackedTime(visibleReport.totalSeconds) : unavailable], ["Expected pay", visibleReport ? money(visibleReport.totalExpectedPayCents, visibleReport.hourlyRateCurrency) : unavailable] ].map(([label, value]) => <div key={label} className="rounded-xl border border-crm-border bg-crm-card p-5"><p className="text-sm text-crm-text-muted">{label}</p><p className="mt-2 text-xl font-semibold">{value}</p></div>)}
    </div>
    <section className="overflow-x-auto rounded-xl border border-crm-border bg-crm-card p-5">
      <h2 className="mb-3 font-semibold">Time per client</h2>
      <table className="w-full text-left text-sm"><thead className="text-crm-text-muted"><tr><th className="p-2">Client</th><th className="p-2">Time (minutes:seconds)</th><th className="p-2">Hours</th><th className="p-2">Expected pay</th><th className="p-2">Logs</th></tr></thead><tbody>{visibleReport?.summaries.map(client => <tr key={client.id} className="border-t border-crm-border"><td className="p-2">{client.name}</td><td className="p-2 font-mono">{formatTrackedTime(client.seconds)}</td><td className="p-2">{(client.seconds / 3600).toFixed(4)}</td><td className="p-2">{money(client.expectedPayCents, visibleReport.hourlyRateCurrency)}</td><td className="p-2">{client.logCount}</td></tr>)}</tbody></table>
      <p className="mt-3 text-xs text-crm-text-muted">Saved seconds, including manual logs and corrections. The top timer shows the current client&apos;s all-time total and pauses while you work on another client. Active seconds are saved at each heartbeat or pause.</p>
    </section>
    <section className="overflow-x-auto rounded-xl border border-crm-border bg-crm-card p-5">
      <div className="mb-3 flex items-center justify-between gap-3"><h2 className="font-semibold">Time ledger · {visibleReport?.logCount ?? 0} logs</h2><button type="button" className={button} disabled={!isClientAccountReady} onClick={() => { setEditingLog(null); setLedgerOpen(true); }}>Add manual time log</button></div>
      <table className="w-full text-left text-sm"><thead className="text-crm-text-muted"><tr><th className="p-2">Client</th><th className="p-2">Logged at (UTC)</th><th className="p-2">Description</th><th className="p-2">Source</th><th className="p-2">Time</th><th className="p-2">Correction</th></tr></thead><tbody>{visibleReport?.logs.map(log => <tr key={log.id} className="border-t border-crm-border"><td className="p-2">{log.clientName}</td><td className="p-2 whitespace-nowrap">{log.loggedAt.slice(0, 19).replace("T", " ")}</td><td className="p-2">{log.description}</td><td className="p-2">{log.source === "AUTO" ? "Automatic" : "Manual"}{log.isManualOverride ? " · corrected" : ""}</td><td className="p-2 font-mono">{formatTrackedTime(log.seconds)}</td><td className="p-2"><button className={button} onClick={() => { setEditingLog(log); setLedgerOpen(true); }}>Correct</button></td></tr>)}</tbody></table>
      {visibleReport?.logCount === 0 && <p className="py-5 text-sm text-crm-text-muted">No work logs in this period.</p>}
      <div className="mt-4 flex items-center gap-3"><button className={button} disabled={page === 1 || loading} onClick={() => setPage(value => value - 1)}>Previous</button><span className="text-sm">Page {page}</span><button className={button} disabled={!visibleReport || page * visibleReport.pageSize >= visibleReport.logCount} onClick={() => setPage(value => value + 1)}>Next</button></div>
    </section>
    {ledgerOpen && <TimeLedgerEditor log={editingLog} onClose={() => setLedgerOpen(false)} onSaved={() => { setLedgerOpen(false); window.dispatchEvent(new Event("crm:time-ledger-changed")); window.dispatchEvent(new Event(TIME_LOG_UPDATED_EVENT)); }} />}
  </div>;
}
