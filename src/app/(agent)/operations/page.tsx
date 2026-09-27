"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileSpreadsheet,
  FolderSync,
  HandCoins,
  Layers,
  Pencil,
  Plus,
  ReceiptText,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Unplug,
  WalletCards,
  X,
  Zap,
} from "lucide-react";
import { MultiCrmCard, MultiCrmInnerPanel, MultiCrmTag } from "@/components/ui/MultiCrmCard";
import { useClientAccount } from "@/context/ClientAccountContext";

type CommissionStatus = "PENDING" | "PARTIALLY_PAID" | "PAID";
type LedgerType = "PAYMENT" | "ADJUSTMENT";
interface Contact { id: string; firstName: string; lastName: string; company: string | null; email?: string | null; }
interface LedgerEntry { id: string; type: "EXPECTED" | LedgerType; amountCents: number; note: string; occurredAt: string; }
interface Commission { id: string; expectedCents: number; receivedCents: number; currency: string; status: CommissionStatus; source: "MANUAL"; notes: string | null; isManualOverride: boolean; deal: { id: string; title: string; valueCents: number; status: string; contact: Contact | null } | null; ledgerEntries: LedgerEntry[]; }
interface TimeLog { id: string; minutes: number; description: string; loggedAt: string; isManualOverride: boolean; contact: Contact | null; }
interface Summary { expectedCents: number; receivedCents: number; pendingCents: number; dealValueCents: number; closedDeals: number; activeMinutes: number; billableHours: number; }

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
    status: "COMPLETED" | "PENDING" | "FAILED" | "NOT_CONNECTED";
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
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [agentSales, setAgentSales] = useState<AgentSale[]>([]);
  const [clickUpInfo, setClickUpInfo] = useState<ClickUpConnectionInfo>({
    isConnected: false,
    status: "DISCONNECTED",
    lastSyncAt: null,
    destination: null,
  });
  const [summary, setSummary] = useState<Summary>({
    expectedCents: 0,
    receivedCents: 0,
    pendingCents: 0,
    dealValueCents: 0,
    closedDeals: 0,
    activeMinutes: 0,
    billableHours: 0,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isWorking, setIsWorking] = useState(false);
  const [syncingDealId, setSyncingDealId] = useState<string | null>(null);
  const [modal, setModal] = useState<"deal" | "ledger" | "time" | "workspace" | null>(null);
  const [selectedCommission, setSelectedCommission] = useState<Commission | null>(null);
  const [editingTimeLog, setEditingTimeLog] = useState<TimeLog | null>(null);
  const [contactSearch, setContactSearch] = useState("");
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  // Forms
  const [dealForm, setDealForm] = useState({ dealTitle: "", dealValue: "", expectedCommission: "", receivedCommission: "", currency: "USD", contactId: "", notes: "" });
  const [ledgerForm, setLedgerForm] = useState({ type: "PAYMENT" as LedgerType, amount: "", note: "" });
  const [timeForm, setTimeForm] = useState({ description: "", minutes: "", loggedAt: "", contactId: "" });
  const [workspacesData, setWorkspacesData] = useState<{ teams: any[]; currentDestination: any } | null>(null);
  const [selectedListId, setSelectedListId] = useState("");

  const version = useRef(0);
  const currentClientId = useRef(activeClientAccount.id);
  currentClientId.current = activeClientAccount.id;

  const loadAll = async (controller?: AbortController) => {
    try {
      const signal = controller?.signal;
      const [commissionsRes, contactsRes, salesRes] = await Promise.all([
        fetch("/api/commissions", { cache: "no-store", signal }),
        fetch("/api/contacts", { cache: "no-store", signal }),
        fetch("/api/agent-sales", { cache: "no-store", signal }),
      ]);

      const [commData, contactsPayload, salesData] = await Promise.all([
        commissionsRes.json(),
        contactsRes.json(),
        salesRes.json(),
      ]);

      if (commData.success) {
        setCommissions(commData.commissions);
        setTimeLogs(commData.timeLogs);
        setSummary(commData.summary);
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
  }, [activeClientAccount.id, isClientAccountReady]);

  const selectedContact = contacts.find((contact) => contact.id === (modal === "deal" ? dealForm.contactId : timeForm.contactId)) ?? null;
  const filteredContacts = useMemo(
    () => contacts.filter((contact) => `${contact.firstName} ${contact.lastName} ${contact.company ?? ""}`.toLowerCase().includes(contactSearch.toLowerCase())).slice(0, 6),
    [contacts, contactSearch]
  );

  const openDeal = () => {
    setDealForm({ dealTitle: "", dealValue: "", expectedCommission: "", receivedCommission: "", currency: "USD", contactId: "", notes: "" });
    setContactSearch("");
    setModal("deal");
  };

  const openTime = (timeLog?: TimeLog) => {
    setEditingTimeLog(timeLog ?? null);
    setTimeForm(
      timeLog
        ? { description: timeLog.description, minutes: String(timeLog.minutes), loggedAt: new Date(timeLog.loggedAt).toISOString().slice(0, 16), contactId: timeLog.contact?.id ?? "" }
        : { description: "", minutes: "", loggedAt: new Date().toISOString().slice(0, 16), contactId: "" }
    );
    setContactSearch("");
    setModal("time");
  };

  const openWorkspaceModal = async () => {
    setIsWorking(true);
    try {
      const res = await fetch("/api/integrations/clickup/workspaces");
      const data = await res.json();
      if (data.success) {
        setWorkspacesData(data);
        setSelectedListId(data.currentDestination?.listId || "");
        setModal("workspace");
      }
    } catch (err) {
      setMessage({ tone: "error", text: "Could not load ClickUp workspaces." });
    } finally {
      setIsWorking(false);
    }
  };

  const saveWorkspaceList = async () => {
    if (!workspacesData) return;
    setIsWorking(true);
    let chosenList: any = null;
    let chosenTeam: any = null;
    let chosenSpace: any = null;

    for (const team of workspacesData.teams) {
      for (const space of team.spaces || []) {
        for (const list of space.lists || []) {
          if (list.id === selectedListId) {
            chosenList = list;
            chosenTeam = team;
            chosenSpace = space;
            break;
          }
        }
      }
    }

    try {
      const res = await fetch("/api/integrations/clickup/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId: chosenTeam?.id,
          teamName: chosenTeam?.name,
          spaceId: chosenSpace?.id,
          spaceName: chosenSpace?.name,
          listId: chosenList?.id || selectedListId,
          listName: chosenList?.name,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setClickUpInfo((prev) => ({
          ...prev,
          destination: data.destination,
        }));
        setModal(null);
        setMessage({ tone: "success", text: "ClickUp sync destination list saved." });
      }
    } catch {
      setMessage({ tone: "error", text: "Could not save ClickUp destination." });
    } finally {
      setIsWorking(false);
    }
  };

  const syncSingleDeal = async (dealId: string) => {
    setSyncingDealId(dealId);
    setMessage(null);
    try {
      const res = await fetch(`/api/agent-sales/${dealId}/sync`, { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data?.error?.message || "ClickUp sync failed.");
      }
      setMessage({ tone: "success", text: `Deal successfully synced to ClickUp (${data.action}).` });
      await loadAll();
    } catch (err: any) {
      setMessage({ tone: "error", text: err.message || "Failed to sync deal to ClickUp." });
      await loadAll();
    } finally {
      setSyncingDealId(null);
    }
  };

  const syncAllClickUp = async () => {
    setIsWorking(true);
    setMessage(null);
    try {
      const res = await fetch("/api/agent-sales", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data?.error?.message || "ClickUp batch sync failed.");
      }
      setMessage({ tone: "success", text: "Batch ClickUp sync completed for your closed deals." });
      await loadAll();
    } catch (err: any) {
      setMessage({ tone: "error", text: err.message || "Batch ClickUp sync failed." });
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

  const submitTime = async (event: FormEvent) => {
    event.preventDefault();
    const data = await request(
      editingTimeLog ? `/api/time-logs/${editingTimeLog.id}` : "/api/time-logs",
      editingTimeLog ? "PATCH" : "POST",
      { ...timeForm, contactId: timeForm.contactId || undefined, loggedAt: new Date(timeForm.loggedAt).toISOString() }
    );
    if (!data) return;
    setModal(null);
    setMessage({ tone: "success", text: editingTimeLog ? "Time log corrected." : "Manual time log saved." });
    await loadAll();
  };

  const exportCsv = () => {
    const rows = [
      ["Client", "Deal", "Contact", "Deal value", "Expected commission", "Received commission", "Pending commission", "Status"],
      ...commissions.map((c) => [
        activeClientAccount.name,
        c.deal?.title ?? "Manual commission",
        contactName(c.deal?.contact ?? null),
        (c.deal?.valueCents ?? 0) / 100,
        c.expectedCents / 100,
        c.receivedCents / 100,
        (c.expectedCents - c.receivedCents) / 100,
        c.status,
      ]),
    ];
    const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    link.download = `${activeClientAccount.name.toLowerCase().replaceAll(" ", "-")}-reconciliation.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="space-y-6 font-sans text-crm-text">
      {/* Header */}
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2">
            <WalletCards className="h-5 w-5 text-primary-cyan" />
            <h1 className="text-2xl font-bold tracking-tight">Sales Operations — Agent Revenue & Commission</h1>
          </div>
          <p className="mt-1 text-xs font-mono text-crm-text-muted">
            Personal sales tracker, commission realization, and ClickUp work-management layer.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <MultiCrmTag variant="cyan">{activeClientAccount.name}</MultiCrmTag>
          <button
            onClick={exportCsv}
            disabled={!commissions.length}
            className="rounded-xl border border-crm-border-strong bg-crm-surface px-3.5 py-2 text-xs font-mono text-crm-text-muted disabled:opacity-40 cursor-pointer"
          >
            <FileSpreadsheet className="mr-1.5 inline h-3.5 w-3.5 text-secondary-pink" />
            Export CSV
          </button>
          <button
            onClick={() => openTime()}
            className="rounded-xl border border-primary-cyan/30 bg-primary-cyan/10 px-3.5 py-2 text-xs font-bold text-primary-cyan cursor-pointer"
          >
            <Clock3 className="mr-1.5 inline h-3.5 w-3.5" />
            Log time
          </button>
          <button
            onClick={openDeal}
            className="rounded-xl bg-primary-cyan px-4 py-2 text-xs font-bold text-slate-950 cursor-pointer"
          >
            <Plus className="mr-1.5 inline h-4 w-4" />
            Add closed deal
          </button>
        </div>
      </header>

      {message && (
        <p
          role="status"
          className={`rounded-xl border px-4 py-3 text-xs font-mono ${
            message.tone === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              : "border-rose-500/30 bg-rose-500/10 text-rose-300"
          }`}
        >
          {message.text}
        </p>
      )}

      {/* Top 4 Metric Cards */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MultiCrmCard className="group p-5">
          <p className="text-[10px] font-mono uppercase tracking-wider text-crm-text-muted">Expected payout</p>
          <p className="mt-3 text-2xl font-semibold tabular-nums text-crm-text">{money(summary.expectedCents)}</p>
          <p className="mt-2 text-[11px] text-crm-text-muted">Across {summary.closedDeals} closed deals</p>
        </MultiCrmCard>

        <MultiCrmCard className="group p-5 border-emerald-500/20">
          <p className="text-[10px] font-mono uppercase tracking-wider text-crm-text-muted">Received</p>
          <p className="mt-3 text-2xl font-semibold tabular-nums text-emerald-400">{money(summary.receivedCents)}</p>
          <p className="mt-2 text-[11px] text-crm-text-muted">Posted payments</p>
        </MultiCrmCard>

        <MultiCrmCard className="group p-5">
          <p className="text-[10px] font-mono uppercase tracking-wider text-crm-text-muted">Still pending</p>
          <p className="mt-3 text-2xl font-semibold tabular-nums text-secondary-pink">{money(summary.pendingCents)}</p>
          <p className="mt-2 text-[11px] text-crm-text-muted">Expected less received</p>
        </MultiCrmCard>

        <MultiCrmCard className="group p-5">
          <p className="text-[10px] font-mono uppercase tracking-wider text-crm-text-muted">Account time</p>
          <p className="mt-3 text-2xl font-semibold tabular-nums text-primary-cyan">{summary.billableHours}h</p>
          <p className="mt-2 text-[11px] text-crm-text-muted">{summary.activeMinutes} manually logged minutes</p>
        </MultiCrmCard>
      </section>

      {/* Main Section: My Closed Deals Table & ClickUp Integration Card */}
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* Left Column: My Closed Deals */}
        <MultiCrmCard className="space-y-4 xl:col-span-8">
          <div className="flex items-center justify-between border-b border-crm-border-strong pb-3">
            <div>
              <p className="text-sm font-semibold">My Closed Deals</p>
              <p className="mt-1 text-[10px] font-mono text-crm-text-muted">
                Closed deals with snapshotted commission rate, expected revenue, and ClickUp task status.
              </p>
            </div>
            <Zap className="h-5 w-5 text-primary-cyan" />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-crm-border text-[10px] font-mono uppercase tracking-wider text-crm-text-muted">
                  <th className="pb-2.5">Customer</th>
                  <th className="pb-2.5">Client Account</th>
                  <th className="pb-2.5">Deal Title</th>
                  <th className="pb-2.5 text-right">Deal Value</th>
                  <th className="pb-2.5 text-right">Commission</th>
                  <th className="pb-2.5 text-right">Expected Revenue</th>
                  <th className="pb-2.5 text-center">ClickUp Status</th>
                  <th className="pb-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-crm-border/60">
                {agentSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-white/[0.02]">
                    <td className="py-3 font-medium">
                      <div>{sale.contact ? `${sale.contact.firstName} ${sale.contact.lastName}` : "Direct Customer"}</div>
                      {sale.contact?.email && (
                        <div className="text-[10px] font-mono text-crm-text-muted">{sale.contact.email}</div>
                      )}
                    </td>
                    <td className="py-3">
                      <MultiCrmTag variant="cyan">{sale.clientAccount?.name || "Account"}</MultiCrmTag>
                    </td>
                    <td className="py-3 max-w-[140px] truncate" title={sale.title}>
                      {sale.title}
                    </td>
                    <td className="py-3 text-right font-mono font-semibold">
                      {money(sale.valueCents, sale.currency)}
                    </td>
                    <td className="py-3 text-right font-mono text-primary-cyan">
                      {sale.commissionRate}%
                    </td>
                    <td className="py-3 text-right font-mono font-semibold text-emerald-400">
                      {money(sale.expectedRevenueCents, sale.currency)}
                    </td>
                    <td className="py-3 text-center">
                      {sale.clickUp.status === "COMPLETED" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" /> Synced
                        </span>
                      ) : sale.clickUp.status === "FAILED" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-mono text-rose-400" title={sale.clickUp.lastSyncError || "Failed"}>
                          Failed
                        </span>
                      ) : sale.clickUp.status === "PENDING" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-mono text-amber-400">
                          Pending
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-500/10 px-2 py-0.5 text-[10px] font-mono text-crm-text-muted">
                          Not Connected
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {sale.clickUp.taskUrl && (
                          <a
                            href={sale.clickUp.taskUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded p-1 text-crm-text-muted hover:text-crm-text"
                            title="Open ClickUp Task"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                        <button
                          onClick={() => syncSingleDeal(sale.id)}
                          disabled={syncingDealId === sale.id || isWorking}
                          className="rounded-lg border border-primary-cyan/30 bg-primary-cyan/10 px-2.5 py-1 text-[10px] font-bold text-primary-cyan hover:bg-primary-cyan/20 disabled:opacity-40 cursor-pointer"
                          title="Sync or Retry ClickUp Task"
                        >
                          {syncingDealId === sale.id ? (
                            <RefreshCw className="h-3 w-3 animate-spin inline" />
                          ) : sale.clickUp.status === "COMPLETED" ? (
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
                    <td colSpan={8} className="py-8 text-center text-xs text-crm-text-muted">
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
            <div className="flex items-center justify-between border-b border-crm-border-strong pb-3">
              <div>
                <p className="text-sm font-semibold">Agent CRM / ClickUp</p>
                <p className="mt-1 text-[10px] font-mono text-crm-text-muted">
                  Personal sales tracker & workflow mirror
                </p>
              </div>
              <Layers className="h-4 w-4 text-primary-cyan" />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-crm-text-muted">Connection Status</span>
                {clickUpInfo.isConnected ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-mono text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2.5 py-0.5 text-xs font-mono text-rose-400">
                    Disconnected
                  </span>
                )}
              </div>

              {clickUpInfo.isConnected && (
                <>
                  <div className="rounded-xl border border-crm-border bg-crm-inner p-3 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-crm-text-muted">Workspace:</span>
                      <span className="font-semibold">{clickUpInfo.destination?.teamName || "Personal Workspace"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-crm-text-muted">Destination List:</span>
                      <span className="font-semibold text-primary-cyan">{clickUpInfo.destination?.listName || "My Closed Deals"}</span>
                    </div>
                    {clickUpInfo.lastSyncAt && (
                      <div className="flex justify-between text-[11px]">
                        <span className="text-crm-text-muted">Last sync:</span>
                        <span className="font-mono text-crm-text-muted">{dateTime(clickUpInfo.lastSyncAt)}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      onClick={syncAllClickUp}
                      disabled={isWorking}
                      className="flex-1 rounded-xl bg-primary-cyan px-3 py-2 text-xs font-bold text-slate-950 hover:bg-primary-cyan/90 disabled:opacity-40 cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <FolderSync className="h-3.5 w-3.5" />
                      Sync All Deals
                    </button>
                    <button
                      onClick={openWorkspaceModal}
                      disabled={isWorking}
                      className="rounded-xl border border-crm-border-strong bg-crm-surface px-3 py-2 text-xs font-mono text-crm-text hover:bg-white/5 cursor-pointer"
                    >
                      Change List
                    </button>
                    <button
                      onClick={disconnectClickUpAction}
                      disabled={isWorking}
                      className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-mono text-rose-400 hover:bg-rose-500/20 cursor-pointer"
                      title="Disconnect ClickUp"
                    >
                      <Unplug className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </>
              )}

              {!clickUpInfo.isConnected && (
                <div className="space-y-3 pt-2">
                  <p className="text-xs text-crm-text-muted">
                    Connect your personal ClickUp account to mirror your closed deals into your personal workspace without mixing with client CRMs.
                  </p>
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={connectClickUpOAuth}
                      disabled={isWorking}
                      className="rounded-xl bg-primary-cyan px-4 py-2.5 text-center text-xs font-bold text-slate-950 hover:bg-primary-cyan/90 cursor-pointer disabled:opacity-50"
                    >
                      {isWorking ? "Connecting to ClickUp…" : "Connect ClickUp via OAuth"}
                    </button>
                    <button
                      onClick={connectClickUpDirect}
                      disabled={isWorking}
                      className="rounded-xl border border-crm-border-strong bg-crm-surface px-3 py-2 text-center text-[11px] font-mono text-crm-text-muted hover:text-crm-text cursor-pointer"
                    >
                      Quick Connect (Test/Mock Mode)
                    </button>
                  </div>
                </div>
              )}
            </div>
          </MultiCrmCard>

          {/* Time Ledger Summary */}
          <MultiCrmCard className="space-y-4">
            <div className="flex items-center justify-between border-b border-crm-border-strong pb-3">
              <div className="flex items-center gap-2">
                <Clock3 className="h-4 w-4 text-primary-cyan" />
                <h2 className="text-sm font-semibold">Time ledger</h2>
              </div>
              <button onClick={() => openTime()} className="text-[10px] font-bold text-primary-cyan cursor-pointer">
                + Add
              </button>
            </div>
            <div className="space-y-2">
              {timeLogs.slice(0, 5).map((timeLog) => (
                <button
                  key={timeLog.id}
                  onClick={() => openTime(timeLog)}
                  className="block w-full rounded-xl border border-crm-border bg-crm-inner p-3 text-left transition-colors hover:border-primary-cyan/40 cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs font-semibold">{timeLog.description}</span>
                    <span className="shrink-0 font-mono text-[10px] text-primary-cyan">{timeLog.minutes}m</span>
                  </div>
                  <p className="mt-1 text-[10px] font-mono text-crm-text-muted">
                    {contactName(timeLog.contact)} · {dateTime(timeLog.loggedAt)}
                  </p>
                </button>
              ))}
              {!isLoading && !timeLogs.length && (
                <p className="py-5 text-center text-xs text-crm-text-muted">No time has been logged for this client.</p>
              )}
            </div>
          </MultiCrmCard>
        </aside>
      </section>

      {/* Commission Ledger Section */}
      <section className="grid grid-cols-1 gap-6">
        <MultiCrmCard className="space-y-4">
          <div className="flex items-center justify-between border-b border-crm-border-strong pb-3">
            <div>
              <p className="text-sm font-semibold">Commission ledger</p>
              <p className="mt-1 text-[10px] font-mono text-crm-text-muted">
                Every payout and correction remains traceable to its source deal.
              </p>
            </div>
            <HandCoins className="h-5 w-5 text-secondary-pink" />
          </div>

          <div className="space-y-3">
            {commissions.map((commission) => {
              const pending = Math.max(0, commission.expectedCents - commission.receivedCents);
              const progress = commission.expectedCents
                ? Math.min(100, Math.round((commission.receivedCents / commission.expectedCents) * 100))
                : 0;

              return (
                <MultiCrmInnerPanel key={commission.id} className="space-y-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold">
                          {commission.deal?.title ?? "Manual commission entry"}
                        </p>
                        <MultiCrmTag variant={statusVariant(commission.status)}>
                          {commission.status.replaceAll("_", " ")}
                        </MultiCrmTag>
                        {commission.isManualOverride && (
                          <span className="text-[10px] font-mono text-secondary-pink">MANUALLY CORRECTED</span>
                        )}
                      </div>
                      <p className="mt-1 text-[11px] font-mono text-crm-text-muted">
                        {contactName(commission.deal?.contact ?? null)} · Deal value{" "}
                        {money(commission.deal?.valueCents ?? 0, commission.currency)}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedCommission(commission);
                        setLedgerForm({ type: "PAYMENT", amount: "", note: "" });
                        setModal("ledger");
                      }}
                      className="shrink-0 rounded-lg border border-primary-cyan/30 bg-primary-cyan/10 px-3 py-2 text-[10px] font-bold text-primary-cyan cursor-pointer"
                    >
                      <ReceiptText className="mr-1 inline h-3.5 w-3.5" />
                      Ledger entry
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-3 font-mono text-xs">
                    <div>
                      <span className="block text-[10px] text-crm-text-muted">Expected</span>
                      <span className="font-semibold">{money(commission.expectedCents, commission.currency)}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-crm-text-muted">Received</span>
                      <span className="font-semibold text-emerald-400">
                        {money(commission.receivedCents, commission.currency)}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-crm-text-muted">Pending</span>
                      <span className="font-semibold text-secondary-pink">
                        {money(pending, commission.currency)}
                      </span>
                    </div>
                  </div>

                  <div className="h-1.5 overflow-hidden rounded-full bg-crm-surface">
                    <div
                      className="h-full rounded-full bg-primary-cyan transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  <div className="flex flex-wrap gap-2 text-[10px] font-mono text-crm-text-muted">
                    {commission.ledgerEntries.slice(0, 3).map((entry) => (
                      <span key={entry.id} className="rounded bg-crm-surface px-2 py-1">
                        {entry.type} {entry.amountCents < 0 ? "−" : "+"}
                        {money(Math.abs(entry.amountCents), commission.currency)} · {entry.note}
                      </span>
                    ))}
                  </div>
                </MultiCrmInnerPanel>
              );
            })}

            {!isLoading && !commissions.length && (
              <div className="rounded-xl border border-dashed border-crm-border-strong px-6 py-14 text-center">
                <Sparkles className="mx-auto h-5 w-5 text-secondary-pink" />
                <p className="mt-3 text-sm font-semibold">Start with a closed deal</p>
                <p className="mx-auto mt-1 max-w-sm text-xs text-crm-text-muted">
                  Add a CRM or off-platform outcome, expected commission, and any payment already received.
                </p>
                <button onClick={openDeal} className="mt-4 text-xs font-bold text-primary-cyan cursor-pointer">
                  Add first deal
                </button>
              </div>
            )}
          </div>
        </MultiCrmCard>
      </section>

      {/* Modals */}
      {modal && (
        <div className="dashboard-overlay flex items-start justify-center overflow-y-auto bg-black/75 p-4 sm:items-center">
          <form
            onSubmit={
              modal === "deal"
                ? submitDeal
                : modal === "ledger"
                ? submitLedger
                : modal === "time"
                ? submitTime
                : (e) => { e.preventDefault(); void saveWorkspaceList(); }
            }
            className="my-auto w-full max-w-xl space-y-5 rounded-2xl border border-crm-border-strong bg-crm-surface p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-crm-border-strong pb-3">
              <div>
                <h2 className="text-sm font-semibold">
                  {modal === "deal"
                    ? "Add closed deal"
                    : modal === "ledger"
                    ? "Post commission ledger entry"
                    : modal === "workspace"
                    ? "Select ClickUp Destination List"
                    : editingTimeLog
                    ? "Correct time log"
                    : "Log account time"}
                </h2>
                <p className="mt-1 text-[10px] font-mono text-crm-text-muted">
                  Manual entries are persisted and audited.
                </p>
              </div>
              <button type="button" onClick={() => setModal(null)} className="text-crm-text-muted cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            {modal === "workspace" && workspacesData && (
              <div className="space-y-4">
                <label className="block space-y-1 text-xs font-mono">
                  <span className="text-[10px] text-crm-text-muted">Select Destination List</span>
                  <select
                    value={selectedListId}
                    onChange={(e) => setSelectedListId(e.target.value)}
                    className="w-full rounded-xl border border-crm-border-strong bg-crm-inner p-2.5 text-xs text-crm-text"
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
                  <label className="space-y-1 text-xs font-mono sm:col-span-2">
                    <span className="text-[10px] text-crm-text-muted">Deal title</span>
                    <input
                      required
                      value={dealForm.dealTitle}
                      onChange={(event) => setDealForm({ ...dealForm, dealTitle: event.target.value })}
                      placeholder="e.g. Northstar annual renewal"
                      className="w-full rounded-xl border border-crm-border-strong bg-crm-inner p-2 text-crm-text"
                    />
                  </label>
                  <label className="space-y-1 text-xs font-mono">
                    <span className="text-[10px] text-crm-text-muted">Deal value</span>
                    <input
                      required
                      type="number"
                      min="0"
                      step="0.01"
                      value={dealForm.dealValue}
                      onChange={(event) => setDealForm({ ...dealForm, dealValue: event.target.value })}
                      className="w-full rounded-xl border border-crm-border-strong bg-crm-inner p-2 text-crm-text"
                    />
                  </label>
                  <label className="space-y-1 text-xs font-mono">
                    <span className="text-[10px] text-crm-text-muted">Expected commission</span>
                    <input
                      required
                      type="number"
                      min="0"
                      step="0.01"
                      value={dealForm.expectedCommission}
                      onChange={(event) => setDealForm({ ...dealForm, expectedCommission: event.target.value })}
                      className="w-full rounded-xl border border-crm-border-strong bg-crm-inner p-2 text-crm-text"
                    />
                  </label>
                  <label className="space-y-1 text-xs font-mono">
                    <span className="text-[10px] text-crm-text-muted">Already received (optional)</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={dealForm.receivedCommission}
                      onChange={(event) => setDealForm({ ...dealForm, receivedCommission: event.target.value })}
                      className="w-full rounded-xl border border-crm-border-strong bg-crm-inner p-2 text-crm-text"
                    />
                  </label>
                  <label className="space-y-1 text-xs font-mono">
                    <span className="text-[10px] text-crm-text-muted">Currency</span>
                    <input
                      value={dealForm.currency}
                      maxLength={3}
                      onChange={(event) => setDealForm({ ...dealForm, currency: event.target.value.toUpperCase() })}
                      className="w-full rounded-xl border border-crm-border-strong bg-crm-inner p-2 text-crm-text"
                    />
                  </label>
                </div>
              </>
            )}

            {modal === "ledger" && (
              <>
                <MultiCrmInnerPanel>
                  <p className="text-xs font-semibold">{selectedCommission?.deal?.title ?? "Manual commission"}</p>
                  <p className="mt-1 text-[10px] font-mono text-crm-text-muted">
                    Expected {selectedCommission && money(selectedCommission.expectedCents, selectedCommission.currency)} · Received{" "}
                    {selectedCommission && money(selectedCommission.receivedCents, selectedCommission.currency)}
                  </p>
                </MultiCrmInnerPanel>
                <div className="grid grid-cols-2 gap-4">
                  <label className="space-y-1 text-xs font-mono">
                    <span className="text-[10px] text-crm-text-muted">Entry type</span>
                    <select
                      value={ledgerForm.type}
                      onChange={(event) => setLedgerForm({ ...ledgerForm, type: event.target.value as LedgerType })}
                      className="w-full rounded-xl border border-crm-border-strong bg-crm-inner p-2 text-crm-text"
                    >
                      <option value="PAYMENT">Received payment</option>
                      <option value="ADJUSTMENT">Expected adjustment</option>
                    </select>
                  </label>
                  <label className="space-y-1 text-xs font-mono">
                    <span className="text-[10px] text-crm-text-muted">Amount</span>
                    <input
                      required
                      type="number"
                      step="0.01"
                      min={ledgerForm.type === "PAYMENT" ? "0" : undefined}
                      value={ledgerForm.amount}
                      onChange={(event) => setLedgerForm({ ...ledgerForm, amount: event.target.value })}
                      className="w-full rounded-xl border border-crm-border-strong bg-crm-inner p-2 text-crm-text"
                    />
                  </label>
                </div>
                <label className="block space-y-1 text-xs font-mono">
                  <span className="text-[10px] text-crm-text-muted">Reason / reference</span>
                  <input
                    required
                    value={ledgerForm.note}
                    onChange={(event) => setLedgerForm({ ...ledgerForm, note: event.target.value })}
                    placeholder="Payment reference or adjustment reason"
                    className="w-full rounded-xl border border-crm-border-strong bg-crm-inner p-2 text-crm-text"
                  />
                </label>
              </>
            )}

            {modal === "time" && (
              <>
                <label className="block space-y-1 text-xs font-mono">
                  <span className="text-[10px] text-crm-text-muted">Work description</span>
                  <input
                    required
                    value={timeForm.description}
                    onChange={(event) => setTimeForm({ ...timeForm, description: event.target.value })}
                    placeholder="e.g. Proposal review and client follow-up"
                    className="w-full rounded-xl border border-crm-border-strong bg-crm-inner p-2 text-crm-text"
                  />
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <label className="space-y-1 text-xs font-mono">
                    <span className="text-[10px] text-crm-text-muted">Minutes</span>
                    <input
                      required
                      type="number"
                      min="1"
                      max="1440"
                      value={timeForm.minutes}
                      onChange={(event) => setTimeForm({ ...timeForm, minutes: event.target.value })}
                      className="w-full rounded-xl border border-crm-border-strong bg-crm-inner p-2 text-crm-text"
                    />
                  </label>
                  <label className="space-y-1 text-xs font-mono">
                    <span className="text-[10px] text-crm-text-muted">When</span>
                    <input
                      required
                      type="datetime-local"
                      value={timeForm.loggedAt}
                      onChange={(event) => setTimeForm({ ...timeForm, loggedAt: event.target.value })}
                      className="w-full rounded-xl border border-crm-border-strong bg-crm-inner p-2 text-crm-text"
                    />
                  </label>
                </div>
              </>
            )}

            {(modal === "deal" || modal === "time") && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-crm-text-muted">Contact (optional)</span>
                  {selectedContact && (
                    <button
                      type="button"
                      onClick={() => (modal === "deal" ? setDealForm({ ...dealForm, contactId: "" }) : setTimeForm({ ...timeForm, contactId: "" }))}
                      className="text-[10px] font-mono text-secondary-pink cursor-pointer"
                    >
                      Use account only
                    </button>
                  )}
                </div>
                <input
                  value={contactSearch}
                  onChange={(event) => setContactSearch(event.target.value)}
                  placeholder="Search active-client contacts by name or company"
                  className="w-full rounded-xl border border-crm-border-strong bg-crm-inner p-2 text-xs text-crm-text"
                />
                {selectedContact ? (
                  <MultiCrmInnerPanel className="flex items-center justify-between py-2">
                    <span className="text-xs">
                      {contactName(selectedContact)}
                      {selectedContact.company ? ` · ${selectedContact.company}` : ""}
                    </span>
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  </MultiCrmInnerPanel>
                ) : (
                  contactSearch && (
                    <div className="max-h-32 space-y-1 overflow-y-auto rounded-xl border border-crm-border-strong bg-crm-inner p-1">
                      {filteredContacts.map((contact) => (
                        <button
                          key={contact.id}
                          type="button"
                          onClick={() => {
                            if (modal === "deal") setDealForm({ ...dealForm, contactId: contact.id });
                            else setTimeForm({ ...timeForm, contactId: contact.id });
                            setContactSearch("");
                          }}
                          className="block w-full rounded-lg px-3 py-2 text-left text-xs hover:bg-white/5 cursor-pointer"
                        >
                          {contactName(contact)}
                          {contact.company && <span className="ml-2 text-crm-text-muted">{contact.company}</span>}
                        </button>
                      ))}
                    </div>
                  )
                )}
              </div>
            )}

            {modal === "deal" && (
              <label className="block space-y-1 text-xs font-mono">
                <span className="text-[10px] text-crm-text-muted">Notes</span>
                <textarea
                  rows={3}
                  value={dealForm.notes}
                  onChange={(event) => setDealForm({ ...dealForm, notes: event.target.value })}
                  className="w-full rounded-xl border border-crm-border-strong bg-crm-inner p-2 text-crm-text"
                />
              </label>
            )}

            <div className="flex justify-end gap-3 border-t border-crm-border-strong pt-4">
              <button
                type="button"
                onClick={() => setModal(null)}
                className="rounded-xl border border-crm-border-strong bg-crm-inner px-4 py-2 text-xs text-crm-text-muted cursor-pointer"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={isWorking}
                className="rounded-xl bg-primary-cyan px-4 py-2 text-xs font-bold text-slate-950 disabled:opacity-50 cursor-pointer"
              >
                {isWorking
                  ? "Saving…"
                  : modal === "deal"
                  ? "Save deal"
                  : modal === "ledger"
                  ? "Post entry"
                  : modal === "workspace"
                  ? "Save destination"
                  : editingTimeLog
                  ? "Save correction"
                  : "Save time log"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
