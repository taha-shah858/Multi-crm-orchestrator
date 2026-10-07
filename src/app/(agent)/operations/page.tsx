"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { CheckCircle2, Clock3, ExternalLink, FileSpreadsheet, FolderSync, HandCoins, Layers, Plus, ReceiptText, RefreshCw, Sparkles, Unplug, WalletCards, X, Zap } from "lucide-react";
import { MultiCrmCard, MultiCrmTag } from "@/components/ui/MultiCrmCard";
import { useClientAccount } from "@/context/ClientAccountContext";
import type { CurrencyTotals } from "@/lib/operations/reconciliation";
import { ReconciliationControls, currencySummary, downloadCommissionReport, reportQuery, type ReportDates } from "@/components/operations/ReconciliationControls";

type CommissionStatus = "PENDING" | "PARTIALLY_PAID" | "PAID";
type LedgerType = "PAYMENT" | "ADJUSTMENT";
interface Contact { id: string; firstName: string; lastName: string; company: string | null; email?: string | null; }
interface LedgerEntry { id: string; type: "EXPECTED" | LedgerType; amountCents: number; note: string; occurredAt: string; }
interface Commission { id: string; expectedCents: number; receivedCents: number; currency: string; status: CommissionStatus; source: "MANUAL" | "CRM"; notes: string | null; isManualOverride: boolean; deal: { id: string; title: string; valueCents: number; commissionRate: number | null; status: string; contact: Contact | null } | null; ledgerEntries: LedgerEntry[]; }
interface Summary { currencyTotals: CurrencyTotals[]; recordCount: number; expectedCents: number; receivedCents: number; pendingCents: number; dealValueCents: number; closedDeals: number; activeSeconds: number; activeMinutes: number; billableHours: number; }

interface AgentSale {
  id: string;
  title: string;
  valueCents: number;
  currency: string;
  commissionRate: number;
  expectedRevenueCents: number;
  receivedRevenueCents: number;
  closedAt: string;
  status: string;
  clientAccount: { id: string; name: string } | null;
  contact: Contact | null;
  clickUp: {
    status: "SYNCED" | "SYNCING" | "RETRYING" | "PENDING" | "FAILED" | "NOT_CONNECTED";
    taskId: string | null;
    taskUrl: string | null;
    lastSyncedAt: string | null;
    lastSyncError: string | null;
  };
}

interface ClickUpConnectionInfo {
  isConnected: boolean;
  status: string;
  lastSyncAt: string | null;
  destination: {
    teamId?: string;
    teamName?: string;
    listId?: string;
    listName?: string;
  } | null;
}

const money = (cents: number, currency = "USD") =>
  new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(cents / 100);

const dateTime = (value: string) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

const contactName = (contact: Contact | null) =>
  contact ? `${contact.firstName} ${contact.lastName}` : "Off-platform / account-level";

const statusVariant = (status: CommissionStatus): "cyan" | "magenta" | "neutral" =>
  status === "PAID" ? "cyan" : status === "PARTIALLY_PAID" ? "magenta" : "neutral";

export default function OperationsPage() {
  const { activeClientAccount, isClientAccountReady } = useClientAccount();
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [reportDates, setReportDates] = useState<ReportDates>({ from: "", to: "" });
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [agentSales, setAgentSales] = useState<AgentSale[]>([]);
  const [clickUpInfo, setClickUpInfo] = useState<ClickUpConnectionInfo>({
    isConnected: false,
    status: "DISCONNECTED",
    lastSyncAt: null,
    destination: null,
  });
  const [summary, setSummary] = useState<Summary>({
    currencyTotals: [],
    recordCount: 0,
    expectedCents: 0,
    receivedCents: 0,
    pendingCents: 0,
    dealValueCents: 0,
    closedDeals: 0,
    activeSeconds: 0,
    activeMinutes: 0,
    billableHours: 0,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isWorking, setIsWorking] = useState(false);
  const [syncingDealId, setSyncingDealId] = useState<string | null>(null);
  const [modal, setModal] = useState<"deal" | "ledger" | "workspace" | null>(null);
  const [selectedCommission, setSelectedCommission] = useState<Commission | null>(null);
  const [contactSearch, setContactSearch] = useState("");
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  // Forms
  const [dealForm, setDealForm] = useState({ dealTitle: "", dealValue: "", expectedCommission: "", receivedCommission: "", currency: "USD", contactId: "", notes: "" });
  const [ledgerForm, setLedgerForm] = useState({ type: "PAYMENT" as LedgerType, amount: "", note: "" });
  const [workspacesData, setWorkspacesData] = useState<{ teams: any[]; currentDestination: any } | null>(null);
  const [selectedListId, setSelectedListId] = useState("");

  const version = useRef(0);
  const currentClientId = useRef(activeClientAccount.id);
  currentClientId.current = activeClientAccount.id;

  const loadAll = async (controller?: AbortController, reportErrors = true) => {
    const clientId = currentClientId.current;
    try {
      const signal = controller?.signal;
      const [commissionsRes, contactsRes, salesRes] = await Promise.all([
        fetch(`/api/commissions?${reportQuery(reportDates)}`, { cache: "no-store", signal }),
        fetch("/api/contacts", { cache: "no-store", signal }),
        fetch(`/api/agent-sales?${reportQuery(reportDates)}`, { cache: "no-store", signal }),
      ]);

      const [commData, contactsPayload, salesData] = await Promise.all([
        commissionsRes.json(),
        contactsRes.json(),
        salesRes.json(),
      ]);

      if (signal?.aborted || clientId !== currentClientId.current) return;
      if (commData.success) {
        setCommissions(commData.commissions);
        setSummary(commData.summary);
      } else if (reportErrors) {
        setMessage({ tone: "error", text: commData.error?.message ?? "Commission data could not be loaded." });
      }
      if (contactsPayload.success) {
        setContacts(contactsPayload.contacts);
      }
      if (salesData.success) {
        setAgentSales(salesData.sales || []);
        if (salesData.clickUpConnection) {
          setClickUpInfo(salesData.clickUpConnection);
        }
      }
    } catch (error) {
      if (controller?.signal.aborted) return;
      console.warn("[Operations] Error loading operations:", error);
    }
  };

  useEffect(() => {
    if (!isClientAccountReady) return;
    const controller = new AbortController();
    const request = ++version.current;
    const clientId = activeClientAccount.id;
    setIsLoading(true);

    const init = async () => {
      await loadAll(controller);
      if (!controller.signal.aborted && request === version.current && currentClientId.current === clientId) {
        setIsLoading(false);
      }
    };

    void init();
    return () => controller.abort();
  }, [activeClientAccount.id, isClientAccountReady, reportDates.from, reportDates.to]);

  const selectedContact = contacts.find((contact) => contact.id === dealForm.contactId) ?? null;
  const filteredContacts = useMemo(
    () => contacts.filter((contact) => `${contact.firstName} ${contact.lastName} ${contact.company ?? ""}`.toLowerCase().includes(contactSearch.toLowerCase())).slice(0, 6),
    [contacts, contactSearch]
  );

  const openDeal = () => {
    setDealForm({ dealTitle: "", dealValue: "", expectedCommission: "", receivedCommission: "", currency: "USD", contactId: "", notes: "" });
    setContactSearch("");
    setModal("deal");
  };

  const openWorkspaceModal = async () => {
    setIsWorking(true);
    try {
      const res = await fetch("/api/integrations/clickup/workspaces", { cache: "no-store" });
      const data = await res.json();
      if (data.success) {
        setWorkspacesData(data);
        if (data.currentDestination?.listId) {
          setSelectedListId(data.currentDestination.listId);
        }
        setModal("workspace");
      } else {
        setMessage({ tone: "error", text: data?.error?.message || "Failed to load ClickUp workspaces." });
      }
    } catch {
      setMessage({ tone: "error", text: "Failed to load ClickUp workspaces." });
    } finally {
      setIsWorking(false);
    }
  };

  const saveWorkspaceList = async () => {
    if (!selectedListId) {
      setMessage({ tone: "error", text: "Please select a ClickUp destination list." });
      return;
    }
    setIsWorking(true);
    try {
      const res = await fetch("/api/integrations/clickup/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listId: selectedListId }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ tone: "success", text: "ClickUp destination list updated successfully." });
        setModal(null);
        await loadAll();
      } else {
        setMessage({ tone: "error", text: data?.error?.message || "Failed to save destination list." });
      }
    } catch {
      setMessage({ tone: "error", text: "Failed to save destination list." });
    } finally {
      setIsWorking(false);
    }
  };

  const syncSingleDeal = async (saleId: string) => {
    setSyncingDealId(saleId);
    setMessage(null);
    try {
      const res = await fetch(`/api/agent-sales/${encodeURIComponent(saleId)}/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dealId: saleId }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ tone: "success", text: "Deal successfully synced to ClickUp!" });
        await loadAll(undefined, false);
      } else {
        setMessage({ tone: "error", text: data?.error?.message || "Failed to sync deal to ClickUp." });
      }
    } catch {
      setMessage({ tone: "error", text: "Failed to sync deal to ClickUp." });
    } finally {
      setSyncingDealId(null);
    }
  };

  const syncAllClickUp = async () => {
    setIsWorking(true);
    setMessage(null);
    try {
      const res = await fetch("/api/agent-sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ syncAll: true }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ tone: data.failedCount ? "error" : "success", text: `Sync finished. Synced: ${data.syncedCount}. Needs attention: ${data.failedCount}.` });
        await loadAll(undefined, false);
      } else {
        setMessage({ tone: "error", text: data?.error?.message || "Sync failed." });
      }
    } catch {
      setMessage({ tone: "error", text: "Sync failed." });
    } finally {
      setIsWorking(false);
    }
  };

  const connectClickUpOAuth = async () => {
    setIsWorking(true);
    setMessage(null);
    try {
      const res = await fetch("/api/integrations/clickup/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnPath: "/operations" }),
      });
      const data = await res.json();
      if (!res.ok || !data.success || !data.authorizationUrl) {
        throw new Error(data?.error?.message || "Failed to initiate ClickUp authorization.");
      }
      window.location.assign(data.authorizationUrl);
    } catch (err: any) {
      setMessage({ tone: "error", text: err.message || "Failed to initiate ClickUp OAuth." });
      setIsWorking(false);
    }
  };

  const connectClickUpDirect = async () => {
    setIsWorking(true);
    try {
      const res = await fetch("/api/integrations/clickup/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken: "mock-clickup-agent-token",
          destination: {
            teamId: "mock-team-1",
            teamName: "Sales Workspace",
            listId: "mock-list-1",
            listName: "My Closed Deals",
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ tone: "success", text: "ClickUp connected for your agent sales tracker." });
        await loadAll();
      }
    } catch (err: any) {
      setMessage({ tone: "error", text: err.message || "Failed to connect ClickUp." });
    } finally {
      setIsWorking(false);
    }
  };

  const disconnectClickUpAction = async () => {
    if (!confirm("Are you sure you want to disconnect ClickUp? Existing tasks in ClickUp will remain.")) return;
    setIsWorking(true);
    try {
      const res = await fetch("/api/integrations/clickup/disconnect", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setClickUpInfo({ isConnected: false, status: "DISCONNECTED", lastSyncAt: null, destination: null });
        setMessage({ tone: "success", text: "ClickUp disconnected." });
        await loadAll();
      }
    } catch {
      setMessage({ tone: "error", text: "Failed to disconnect ClickUp." });
    } finally {
      setIsWorking(false);
    }
  };

  const request = async (url: string, method: "POST" | "PATCH", body: Record<string, unknown>) => {
    setIsWorking(true);
    setMessage(null);
    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data?.error?.message ?? "The record could not be saved.");
      return data;
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "The record could not be saved." });
      return null;
    } finally {
      setIsWorking(false);
    }
  };

  const submitDeal = async (event: FormEvent) => {
    event.preventDefault();
    const data = await request("/api/commissions", "POST", { ...dealForm, contactId: dealForm.contactId || undefined });
    if (!data) return;
    setModal(null);
    setMessage({ tone: "success", text: "Manual deal and commission record saved. Synced to ClickUp." });
    await loadAll();
  };

  const submitLedger = async (event: FormEvent) => {
    event.preventDefault();
    if (!selectedCommission) return;
    const data = await request(`/api/commissions/${selectedCommission.id}`, "PATCH", { action: "LEDGER", ...ledgerForm });
    if (!data) return;
    setModal(null);
    setMessage({ tone: "success", text: ledgerForm.type === "PAYMENT" ? "Payment posted to the commission ledger." : "Commission adjustment saved and audited." });
    await loadAll();
  };

  const exportCsv = async () => {
    try {
      await downloadCommissionReport(`/api/commissions/export?${reportQuery(reportDates)}`);
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Report export failed." });
    }
  };

  const labelCls = "block text-xs font-semibold uppercase tracking-wider text-slate-700";
  const inputCls = "w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-2xs";

  return (
    <div className="space-y-6 font-sans text-slate-900">
      {/* Header */}
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2">
            <WalletCards className="h-5 w-5 text-blue-600" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Agent Revenue & Commission</h1>
          </div>
          <p className="mt-1 text-sm font-normal text-slate-600">
            Personal sales tracker, commission realization, and ClickUp work-management layer.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <MultiCrmTag variant="cyan">{activeClientAccount.name}</MultiCrmTag>
          <button
            onClick={exportCsv}
            disabled={!summary.recordCount || isLoading}
            className="rounded-xl border border-crm-border-strong bg-crm-surface px-3.5 py-2 text-xs font-sans text-crm-text-muted disabled:opacity-40 cursor-pointer"
          >
            <FileSpreadsheet className="mr-1.5 inline h-3.5 w-3.5 text-blue-600" />
            Export commissions CSV
          </button>
          <a
            href="/time-audit"
            className="rounded-lg border border-slate-300 bg-white hover:bg-slate-50 px-3.5 py-2 text-sm font-medium text-slate-700 shadow-xs transition-colors cursor-pointer"
          >
            <Clock3 className="mr-1.5 inline h-4 w-4 text-slate-500" />
            Time Audit
          </a>
          <button
            onClick={openDeal}
            className="rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2 text-sm font-medium text-white shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="mr-1.5 inline h-4 w-4" />
            Add closed deal
          </button>
        </div>
      </header>

      <ReconciliationControls dates={reportDates} onChange={setReportDates} />

      {message && (
        <p
          role="status"
          className={`rounded-lg border px-4 py-3 text-sm font-medium ${
            message.tone === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </p>
      )}

      {/* Top 4 Metric Cards */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MultiCrmCard className="group p-5">
          <p className="text-[10px] font-sans uppercase tracking-wider text-crm-text-muted">Expected payout</p>
          <p className="mt-3 text-xl font-semibold tabular-nums text-crm-text">{currencySummary(summary.currencyTotals, "expectedCents")}</p>
          <p className="mt-2 text-[11px] text-crm-text-muted">Across {summary.closedDeals} closed deals</p>
        </MultiCrmCard>

        <MultiCrmCard className="group p-5 border-emerald-500/20">
          <p className="text-[10px] font-sans uppercase tracking-wider text-crm-text-muted">Received</p>
          <p className="mt-3 text-xl font-semibold tabular-nums text-emerald-800">{currencySummary(summary.currencyTotals, "receivedCents")}</p>
          <p className="mt-2 text-[11px] text-crm-text-muted">Posted payments</p>
        </MultiCrmCard>

        <MultiCrmCard className="group p-5">
          <p className="text-[10px] font-sans uppercase tracking-wider text-crm-text-muted">Still pending</p>
          <p className="mt-3 text-xl font-semibold tabular-nums text-blue-600">{currencySummary(summary.currencyTotals, "pendingCents")}</p>
          <p className="mt-2 text-[11px] text-crm-text-muted">Unpaid balance summed per deal</p>
        </MultiCrmCard>

      </section>

      {/* Main Section: My Closed Deals Table & ClickUp Integration Card */}
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* Left Column: My Closed Deals */}
        <MultiCrmCard className="space-y-4 xl:col-span-8">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <p className="text-base font-semibold text-slate-900">My Closed Deals</p>
              <p className="mt-1 text-xs text-slate-500">
                Closed deals with snapshotted commission rate, expected revenue, and ClickUp task status.
              </p>
            </div>
            <Zap className="h-5 w-5 text-blue-600" />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3">Client Account</th>
                  <th className="py-2.5 px-3">Deal Title</th>
                  <th className="py-2.5 px-3 text-right">Deal Value</th>
                  <th className="py-2.5 px-3 text-right">Commission</th>
                  <th className="py-2.5 px-3 text-right">Expected Revenue</th>
                  <th className="py-2.5 px-3 text-center">ClickUp Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {agentSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3 font-medium">
                      <div className="font-semibold text-slate-900">{sale.contact ? `${sale.contact.firstName} ${sale.contact.lastName}` : "Direct Customer"}</div>
                      {sale.contact?.email && (
                        <div className="text-xs text-slate-400">{sale.contact.email}</div>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <MultiCrmTag variant="cyan">{sale.clientAccount?.name || "Account"}</MultiCrmTag>
                    </td>
                    <td className="py-3 px-3 max-w-[140px] truncate text-slate-800" title={sale.title}>
                      {sale.title}
                    </td>
                    <td className="py-3 px-3 text-right font-medium text-slate-900">
                      {money(sale.valueCents, sale.currency)}
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-blue-600">
                      {sale.commissionRate}%
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-emerald-700">
                      {money(sale.expectedRevenueCents, sale.currency)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {sale.clickUp.status === "SYNCED" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Synced
                        </span>
                      ) : sale.clickUp.status === "FAILED" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 border border-red-200 px-2 py-0.5 text-xs font-semibold text-red-700" title={sale.clickUp.lastSyncError || "Failed"}>
                          {sale.clickUp.taskId ? "Update failed" : "Failed"}
                        </span>
                      ) : ["PENDING", "SYNCING", "RETRYING"].includes(sale.clickUp.status) ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-xs font-semibold text-amber-800">
                          Pending
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-xs font-medium text-slate-500">
                          Not Connected
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {sale.clickUp.taskUrl && (
                          <a
                            href={sale.clickUp.taskUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded p-1 text-slate-400 hover:text-slate-600"
                            title="Open ClickUp Task"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                        <button
                          onClick={() => syncSingleDeal(sale.id)}
                          disabled={syncingDealId === sale.id || isWorking}
                          className="rounded-md border border-slate-300 bg-white hover:bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 shadow-2xs transition-colors disabled:opacity-40 cursor-pointer"
                          title="Sync or Retry ClickUp Task"
                        >
                          {syncingDealId === sale.id ? (
                            <RefreshCw className="h-3 w-3 animate-spin inline" />
                          ) : sale.clickUp.status === "SYNCED" ? (
                            "Re-sync"
                          ) : (
                            "Sync"
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!isLoading && !agentSales.length && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-xs text-slate-500">
                      No closed deals recorded yet. Add a closed deal or win a deal in HubSpot/Unified Leads to populate.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </MultiCrmCard>

        {/* Right Column: Agent CRM / ClickUp Work-Management Card */}
        <aside className="space-y-6 xl:col-span-4">
          <MultiCrmCard className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <p className="text-base font-semibold text-slate-900">Agent CRM / ClickUp</p>
                <p className="mt-1 text-xs text-slate-500">
                  Personal sales tracker & workflow mirror
                </p>
              </div>
              <Layers className="h-4 w-4 text-blue-600" />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600">Connection Status</span>
                {clickUpInfo.isConnected ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-50 border border-red-200 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                    Disconnected
                  </span>
                )}
              </div>

              {clickUpInfo.isConnected && (
                <>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Workspace:</span>
                      <span className="font-semibold text-slate-900">{clickUpInfo.destination?.teamName || "Personal Workspace"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Destination List:</span>
                      <span className="font-semibold text-blue-600">{clickUpInfo.destination?.listName || "My Closed Deals"}</span>
                    </div>
                    {clickUpInfo.lastSyncAt && (
                      <div className="flex justify-between text-xs text-slate-400">
                        <span>Last sync:</span>
                        <span>{dateTime(clickUpInfo.lastSyncAt)}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      onClick={syncAllClickUp}
                      disabled={isWorking}
                      className="flex-1 rounded-lg bg-blue-600 hover:bg-blue-700 px-3 py-2 text-xs font-medium text-white shadow-xs transition-colors disabled:opacity-40 cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <FolderSync className="h-3.5 w-3.5" />
                      Sync All Deals
                    </button>
                    <button
                      onClick={openWorkspaceModal}
                      disabled={isWorking}
                      className="rounded-lg border border-slate-300 bg-white hover:bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 shadow-xs transition-colors cursor-pointer"
                    >
                      Change List
                    </button>
                    <button
                      onClick={disconnectClickUpAction}
                      disabled={isWorking}
                      className="rounded-lg border border-red-200 bg-white hover:bg-red-50 px-3 py-2 text-xs font-medium text-red-600 shadow-xs transition-colors cursor-pointer"
                      title="Disconnect ClickUp"
                    >
                      <Unplug className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </>
              )}

              {!clickUpInfo.isConnected && (
                <div className="space-y-3 pt-2">
                  <p className="text-xs text-slate-600">
                    Connect your personal ClickUp account to mirror your closed deals into your personal workspace without mixing with client CRMs.
                  </p>
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={connectClickUpOAuth}
                      disabled={isWorking}
                      className="rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2.5 text-center text-sm font-medium text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isWorking ? "Connecting to ClickUp…" : "Connect ClickUp via OAuth"}
                    </button>
                    <button
                      onClick={connectClickUpDirect}
                      disabled={isWorking}
                      className="rounded-lg border border-slate-300 bg-white hover:bg-slate-50 px-3 py-2 text-center text-xs font-medium text-slate-700 shadow-xs transition-colors cursor-pointer"
                    >
                      Quick Connect (Test/Mock Mode)
                    </button>
                  </div>
                </div>
              )}
            </div>
          </MultiCrmCard>

        </aside>
      </section>

      {/* Commission Ledger Section */}
      <section className="grid grid-cols-1 gap-6">
        <MultiCrmCard className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <p className="text-sm font-semibold">Commission ledger</p>
              <p className="mt-1 text-[10px] font-sans text-crm-text-muted">
                Showing {commissions.length} of {summary.recordCount} records. Export CSV includes every matching commission.
              </p>
            </div>
            <HandCoins className="h-5 w-5 text-blue-600" />
          </div>

          <div className="space-y-3">
            {commissions.map((commission) => {
              const pending = Math.max(0, commission.expectedCents - commission.receivedCents);
              const progress = commission.expectedCents
                ? Math.min(100, Math.round((commission.receivedCents / commission.expectedCents) * 100))
                : 0;

              return (
                <div key={commission.id} className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {commission.deal?.title ?? "Manual commission entry"}
                        </p>
                        <MultiCrmTag variant={statusVariant(commission.status)}>
                          {commission.status.replaceAll("_", " ")}
                        </MultiCrmTag>
                        <MultiCrmTag variant="cyan">
                          {commission.source === "CRM" ? "CRM CLOSED WON" : "MANUAL"}
                        </MultiCrmTag>
                        {commission.isManualOverride && (
                          <span className="text-xs font-semibold text-blue-700">MANUALLY CORRECTED</span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {contactName(commission.deal?.contact ?? null)} · Deal value{" "}
                        {commission.currency} {money(commission.deal?.valueCents ?? 0, commission.currency)}
                        {commission.deal?.commissionRate != null && ` · Commission ${commission.deal.commissionRate}%`}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedCommission(commission);
                        setLedgerForm({ type: "PAYMENT", amount: "", note: "" });
                        setModal("ledger");
                      }}
                      className="shrink-0 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-2xs transition-colors cursor-pointer"
                    >
                      <ReceiptText className="mr-1 inline h-3.5 w-3.5 text-slate-500" />
                      Ledger entry
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="block text-xs text-slate-500">Expected</span>
                      <span className="font-semibold text-slate-900">{money(commission.expectedCents, commission.currency)}</span>
                    </div>
                    <div>
                      <span className="block text-xs text-slate-500">Received</span>
                      <span className="font-semibold text-emerald-700">
                        {money(commission.receivedCents, commission.currency)}
                      </span>
                    </div>
                    <div>
                      <span className="block text-xs text-slate-500">Pending</span>
                      <span className="font-semibold text-slate-700">
                        {money(pending, commission.currency)}
                      </span>
                    </div>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-blue-600 transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                    {commission.ledgerEntries.slice(0, 3).map((entry) => (
                      <span key={entry.id} className="rounded bg-white border border-slate-200 px-2 py-1">
                        {entry.type} {entry.amountCents < 0 ? "−" : "+"}
                        {money(Math.abs(entry.amountCents), commission.currency)} · {entry.note}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}

            {!isLoading && !commissions.length && (
              <div className="rounded-xl border border-dashed border-crm-border-strong px-6 py-14 text-center">
                <Sparkles className="mx-auto h-5 w-5 text-blue-600" />
                <p className="mt-3 text-sm font-semibold">Start with a closed deal</p>
                <p className="mx-auto mt-1 max-w-sm text-xs text-crm-text-muted">
                  Mark a CRM deal Closed Won to create its commission automatically, or add an off-platform sale manually.
                </p>
                <button onClick={openDeal} className="mt-4 text-xs font-semibold text-blue-600 hover:underline cursor-pointer">
                  Add first deal
                </button>
              </div>
            )}
          </div>
        </MultiCrmCard>
      </section>

      {/* Modals */}
      {modal && (
        <div className="dashboard-overlay flex items-start justify-center overflow-y-auto bg-slate-900/40 backdrop-blur-xs p-4 sm:items-center z-50">
          <form
            onSubmit={
              modal === "deal"
                ? submitDeal
                : modal === "ledger"
                ? submitLedger
                : (e) => { e.preventDefault(); void saveWorkspaceList(); }
            }
            className="my-auto w-full max-w-xl space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  {modal === "deal"
                    ? "Add closed deal"
                    : modal === "ledger"
                    ? "Post commission ledger entry"
                    : modal === "workspace"
                    ? "Select ClickUp Destination List"
                    : "Select ClickUp Destination List"}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Manual entries are persisted and audited.
                </p>
              </div>
              <button type="button" onClick={() => setModal(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            {modal === "workspace" && workspacesData && (
              <div className="space-y-4">
                <label className="block space-y-1">
                  <span className={labelCls}>Select Destination List</span>
                  <select
                    value={selectedListId}
                    onChange={(e) => setSelectedListId(e.target.value)}
                    className={inputCls}
                  >
                    <option value="">-- Choose a ClickUp list --</option>
                    {workspacesData.teams.map((team) => (
                      <optgroup key={team.id} label={`Workspace: ${team.name}`}>
                        {(team.spaces || []).map((space: any) =>
                          (space.lists || []).map((list: any) => (
                            <option key={list.id} value={list.id}>
                              {space.name} › {list.name}
                            </option>
                          ))
                        )}
                      </optgroup>
                    ))}
                  </select>
                </label>
              </div>
            )}

            {modal === "deal" && (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="space-y-1 sm:col-span-2 block">
                    <span className={labelCls}>Deal title</span>
                    <input
                      required
                      value={dealForm.dealTitle}
                      onChange={(event) => setDealForm({ ...dealForm, dealTitle: event.target.value })}
                      placeholder="e.g. Northstar annual renewal"
                      className={inputCls}
                    />
                  </label>
                  <label className="space-y-1 block">
                    <span className={labelCls}>Deal value</span>
                    <input
                      required
                      type="number"
                      min="0"
                      step="0.01"
                      value={dealForm.dealValue}
                      onChange={(event) => setDealForm({ ...dealForm, dealValue: event.target.value })}
                      className={inputCls}
                    />
                  </label>
                  <label className="space-y-1 block">
                    <span className={labelCls}>Expected commission</span>
                    <input
                      required
                      type="number"
                      min="0"
                      step="0.01"
                      value={dealForm.expectedCommission}
                      onChange={(event) => setDealForm({ ...dealForm, expectedCommission: event.target.value })}
                      className={inputCls}
                    />
                  </label>
                  <label className="space-y-1 block">
                    <span className={labelCls}>Already received (optional)</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={dealForm.receivedCommission}
                      onChange={(event) => setDealForm({ ...dealForm, receivedCommission: event.target.value })}
                      className={inputCls}
                    />
                  </label>
                  <label className="space-y-1 block">
                    <span className={labelCls}>Currency</span>
                    <input
                      value={dealForm.currency}
                      maxLength={3}
                      onChange={(event) => setDealForm({ ...dealForm, currency: event.target.value.toUpperCase() })}
                      className={inputCls}
                    />
                  </label>
                </div>
              </>
            )}

            {modal === "ledger" && (
              <>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-slate-900">{selectedCommission?.deal?.title ?? "Manual commission"}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Expected {selectedCommission && money(selectedCommission.expectedCents, selectedCommission.currency)} · Received{" "}
                    {selectedCommission && money(selectedCommission.receivedCents, selectedCommission.currency)}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <label className="space-y-1 block">
                    <span className={labelCls}>Entry type</span>
                    <select
                      value={ledgerForm.type}
                      onChange={(event) => setLedgerForm({ ...ledgerForm, type: event.target.value as LedgerType })}
                      className={inputCls}
                    >
                      <option value="PAYMENT">Received payment</option>
                      <option value="ADJUSTMENT">Expected adjustment</option>
                    </select>
                  </label>
                  <label className="space-y-1 block">
                    <span className={labelCls}>Amount</span>
                    <input
                      required
                      type="number"
                      step="0.01"
                      min={ledgerForm.type === "PAYMENT" ? "0" : undefined}
                      value={ledgerForm.amount}
                      onChange={(event) => setLedgerForm({ ...ledgerForm, amount: event.target.value })}
                      className={inputCls}
                    />
                  </label>
                </div>
                <label className="block space-y-1">
                  <span className={labelCls}>Reason / reference</span>
                  <input
                    required
                    value={ledgerForm.note}
                    onChange={(event) => setLedgerForm({ ...ledgerForm, note: event.target.value })}
                    placeholder="Payment reference or adjustment reason"
                    className={inputCls}
                  />
                </label>
              </>
            )}

            {modal === "deal" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className={labelCls}>Contact (optional)</span>
                  {selectedContact && (
                    <button
                      type="button"
                      onClick={() => setDealForm({ ...dealForm, contactId: "" })}
                      className="text-xs text-blue-600 hover:underline cursor-pointer"
                    >
                      Use account only
                    </button>
                  )}
                </div>
                <input
                  value={contactSearch}
                  onChange={(event) => setContactSearch(event.target.value)}
                  placeholder="Search active-client contacts by name or company"
                  className={inputCls}
                />
                {selectedContact ? (
                  <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <span className="text-xs font-medium text-slate-800">
                      {contactName(selectedContact)}
                      {selectedContact.company ? ` · ${selectedContact.company}` : ""}
                    </span>
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  </div>
                ) : (
                  contactSearch && (
                    <div className="max-h-32 space-y-1 overflow-y-auto rounded-lg border border-slate-200 bg-white p-1">
                      {filteredContacts.map((contact) => (
                        <button
                          key={contact.id}
                          type="button"
                          onClick={() => {
                            setDealForm({ ...dealForm, contactId: contact.id });
                            setContactSearch("");
                          }}
                          className="block w-full rounded-md px-3 py-2 text-left text-xs hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                          {contactName(contact)}
                          {contact.company && <span className="ml-2 text-slate-500">{contact.company}</span>}
                        </button>
                      ))}
                    </div>
                  )
                )}
              </div>
            )}

            {modal === "deal" && (
              <label className="block space-y-1">
                <span className={labelCls}>Notes</span>
                <textarea
                  rows={3}
                  value={dealForm.notes}
                  onChange={(event) => setDealForm({ ...dealForm, notes: event.target.value })}
                  className={inputCls}
                />
              </label>
            )}

            <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
              <button
                type="button"
                onClick={() => setModal(null)}
                className="rounded-lg border border-slate-300 bg-white hover:bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 shadow-xs transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={isWorking}
                className="rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2 text-sm font-medium text-white shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isWorking
                  ? "Saving…"
                  : modal === "deal"
                  ? "Save deal"
                  : modal === "ledger"
                  ? "Post entry"
                  : "Save destination"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
