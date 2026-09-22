"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  DatabaseZap,
  Network,
  RefreshCw,
  ShieldCheck,
  Users,
} from "lucide-react";
import type { AdminDashboardData } from "@/lib/admin/admin-types";
import { MultiCrmCard, MultiCrmInnerPanel, MultiCrmTag } from "@/components/ui/MultiCrmCard";
import { useAdminWorkspaceUser } from "@/components/admin/AdminWorkspaceShell";
import { readApiJson } from "@/lib/http/client-api";
import { AdminIntegrationManager } from "@/components/admin/AdminIntegrationManager";

export type AdminView = "dashboard" | "agents" | "clients" | "assignments" | "operations" | "commissions" | "analytics" | "integrations" | "audit";

const headings: Record<AdminView, { title: string; description: string }> = {
  dashboard: { title: "Company Command Center", description: "A live company-wide view of team coverage, revenue operations, integrations, and risk." },
  agents: { title: "Agents & Team", description: "Manage company users, roles, status, and operating access." },
  clients: { title: "Client Accounts", description: "Manage the client portfolio that agents work on behalf of." },
  assignments: { title: "Client Assignments", description: "Control exactly which client accounts each sales agent can access." },
  operations: { title: "Company Sales Operations", description: "Review time and account coverage across the entire company." },
  commissions: { title: "Commissions & Reconciliation", description: "Compare expected, received, and pending compensation company-wide." },
  analytics: { title: "Business Analytics", description: "Company-level sales activity, client coverage, and operational performance." },
  integrations: { title: "Integrations & Sync Health", description: "Monitor CRM connections and recent synchronization outcomes across clients." },
  audit: { title: "Audit Logs", description: "Review security, administration, synchronization, and manual-override activity." },
};

const money = (cents: number) => new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);
const dateTime = (value: string | null) => value ? new Date(value).toLocaleString() : "—";

export default function AdminWorkspacePage({ view }: { view: AdminView }) {
  const user = useAdminWorkspaceUser();
  const [dashboard, setDashboard] = useState<AdminDashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((value) => value + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    setError(null);
    const load = async () => {
      try {
        const response = await fetch("/api/admin/dashboard", { cache: "no-store", signal: controller.signal });
        const payload = await readApiJson<AdminDashboardData & { success: true }>(response);
        if (!controller.signal.aborted) setDashboard(payload);
      } catch (reason) {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "The admin workspace could not be loaded.");
      }
    };
    void load();
    return () => controller.abort();
  }, [refreshKey]);

  const mutate = useCallback(async (url: string, method: "POST" | "PATCH", body: Record<string, unknown>, successMessage: string) => {
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(url, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      await readApiJson(response);
      setNotice(successMessage);
      refresh();
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The administrative change could not be saved.");
      return false;
    }
  }, [refresh]);

  const heading = headings[view];

  return (
    <div className="space-y-6 text-crm-text">
      <header className="flex flex-col gap-3 border-b border-crm-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary-cyan" />
            <h1 className="text-2xl font-semibold tracking-tight">{heading.title}</h1>
          </div>
          <p className="mt-2 max-w-3xl text-xs font-mono leading-relaxed text-crm-text-muted">{heading.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <MultiCrmTag variant={user.role === "ADMIN" ? "magenta" : "cyan"}>{user.role} ACCESS</MultiCrmTag>
          <button onClick={refresh} className="rounded-xl border border-crm-border p-2 text-crm-text-muted transition hover:border-primary-cyan/40 hover:text-primary-cyan" title="Refresh company data">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </header>

      {error && <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs font-mono text-rose-200">{error}</p>}
      {notice && <p role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs font-mono text-emerald-200">{notice}</p>}
      {!dashboard && !error && <LoadingState />}
      {dashboard && <ViewContent view={view} dashboard={dashboard} canManage={user.role === "ADMIN"} mutate={mutate} />}
    </div>
  );
}

function ViewContent({ view, dashboard, canManage, mutate }: { view: AdminView; dashboard: AdminDashboardData; canManage: boolean; mutate: (url: string, method: "POST" | "PATCH", body: Record<string, unknown>, successMessage: string) => Promise<boolean> }) {
  if (view === "agents") return <AgentsView dashboard={dashboard} canManage={canManage} mutate={mutate} />;
  if (view === "clients") return <ClientsView dashboard={dashboard} canManage={canManage} mutate={mutate} />;
  if (view === "assignments") return <AssignmentsView dashboard={dashboard} canManage={canManage} mutate={mutate} />;
  if (view === "operations") return <OperationsView dashboard={dashboard} />;
  if (view === "commissions") return <CommissionsView dashboard={dashboard} />;
  if (view === "analytics") return <AnalyticsView dashboard={dashboard} />;
  if (view === "integrations") return <IntegrationsView dashboard={dashboard} />;
  if (view === "audit") return <AuditView dashboard={dashboard} />;
  return <DashboardView dashboard={dashboard} />;
}

function DashboardView({ dashboard }: { dashboard: AdminDashboardData }) {
  return <div className="space-y-6">
    <Metrics dashboard={dashboard} />
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
      <MultiCrmCard className="space-y-4 xl:col-span-7">
        <SectionTitle icon={Users} title="Team and client coverage" detail={`${dashboard.summary.activeAgents} active agents across ${dashboard.clients.length} client accounts`} />
        <div className="space-y-2">{dashboard.agents.slice(0, 8).map((agent) => <AgentCard key={agent.id} agent={agent} />)}</div>
      </MultiCrmCard>
      <MultiCrmCard className="space-y-4 xl:col-span-5">
        <SectionTitle icon={Network} title="Latest sync health" detail="Most recent provider activity" />
        <div className="space-y-2">{dashboard.syncRuns.slice(0, 8).map((run) => <SyncRunCard key={run.id} run={run} />)}{dashboard.syncRuns.length === 0 && <Empty text="No synchronization runs recorded." />}</div>
      </MultiCrmCard>
    </div>
    <MultiCrmCard className="space-y-4">
      <SectionTitle icon={Activity} title="Recent administrative activity" detail="Company audit trail" />
      <AuditRows audits={dashboard.audits.slice(0, 10)} />
    </MultiCrmCard>
  </div>;
}

function AgentsView({ dashboard, canManage, mutate }: AdminManageProps) {
  return <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
    <MultiCrmCard className="space-y-4 xl:col-span-8">
      <SectionTitle icon={Users} title="Company team" detail="Roles, status, assignments, and operational record counts" />
      <div className="space-y-3">{dashboard.agents.map((agent) => <AgentCard key={agent.id} agent={agent} />)}</div>
    </MultiCrmCard>
    <MultiCrmCard className="space-y-4 xl:col-span-4">
      <SectionTitle icon={ShieldCheck} title={canManage ? "Create team member" : "Read-only management"} detail={canManage ? "Admin-created accounts use server-backed credentials" : "Managers can review but cannot change access"} />
      {canManage ? <NewUserForm clients={dashboard.clients} mutate={mutate} /> : <ReadOnlyNotice />}
    </MultiCrmCard>
  </div>;
}

function ClientsView({ dashboard, canManage, mutate }: AdminManageProps) {
  return <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
    <MultiCrmCard className="space-y-4 xl:col-span-8">
      <SectionTitle icon={Building2} title="Client portfolio" detail="Tenant-scoped accounts owned by this company" />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">{dashboard.clients.map((client) => <MultiCrmInnerPanel key={client.id} className="space-y-3">
        <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold">{client.name}</p><p className="mt-1 text-[10px] font-mono text-crm-text-muted">{client.brandName}</p></div><MultiCrmTag variant={client.status === "ACTIVE" ? "cyan" : "magenta"}>{client.status}</MultiCrmTag></div>
        <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-crm-text-muted"><span>{client._count.contacts} contacts</span><span>{client._count.agentAssignments} assignments</span><span>{client.integrationConnections.length} integrations</span><span>{client.communicationIdentity || "No comms identity"}</span></div>
        {canManage && <div className="space-y-2"><select aria-label={`Status for ${client.name}`} value={client.status} onChange={(event) => void mutate(`/api/admin/clients/${client.id}`, "PATCH", { status: event.target.value }, `${client.name} status updated.`)} className="w-full rounded-lg border border-crm-border bg-crm-base px-3 py-2 text-xs text-crm-text"><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option><option value="ARCHIVED">Archived</option></select><label className="flex items-center gap-2 rounded-lg border border-crm-border bg-crm-base px-3 py-2 text-[10px] font-mono text-crm-text-muted"><input type="checkbox" checked={client.allowAgentIntegrationManagement} onChange={(event) => void mutate(`/api/admin/clients/${client.id}`, "PATCH", { allowAgentIntegrationManagement: event.target.checked }, `${client.name} integration permission updated.`)} />Allow assigned agents to connect client integrations</label></div>}
      </MultiCrmInnerPanel>)}</div>
    </MultiCrmCard>
    <MultiCrmCard className="space-y-4 xl:col-span-4">
      <SectionTitle icon={Building2} title={canManage ? "Add client account" : "Portfolio governance"} detail={canManage ? "Create a tenant boundary for a client company" : "Only Administrators can create or change clients"} />
      {canManage ? <NewClientForm mutate={mutate} /> : <ReadOnlyNotice />}
    </MultiCrmCard>
  </div>;
}

function AssignmentsView({ dashboard, canManage, mutate }: AdminManageProps) {
  const assignable = dashboard.agents.filter((agent) => agent.role === "AGENT");
  return <MultiCrmCard className="space-y-4">
    <SectionTitle icon={CheckCircle2} title="Agent-to-client access matrix" detail="Unchecked clients are rejected by the server even if an Agent alters browser state" />
    <div className="space-y-3">{assignable.map((agent) => <AssignmentRow key={agent.id} agent={agent} clients={dashboard.clients} canManage={canManage} mutate={mutate} />)}{assignable.length === 0 && <Empty text="No sales agents have been created." />}</div>
  </MultiCrmCard>;
}

function OperationsView({ dashboard }: { dashboard: AdminDashboardData }) {
  const byAgent = useMemo(() => {
    const totals = new Map<string, number>();
    dashboard.timeLogs.forEach((log) => totals.set(log.user?.name ?? "Unassigned", (totals.get(log.user?.name ?? "Unassigned") ?? 0) + log.minutes));
    return Array.from(totals.entries()).sort((a, b) => b[1] - a[1]);
  }, [dashboard.timeLogs]);
  return <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
    <MultiCrmCard className="space-y-4 xl:col-span-4"><SectionTitle icon={Clock3} title="Time coverage" detail="Company totals by agent" /><div className="space-y-2">{byAgent.map(([name, minutes]) => <MultiCrmInnerPanel key={name} className="flex items-center justify-between"><span className="text-xs font-semibold">{name}</span><span className="text-xs font-mono text-primary-cyan">{(minutes / 60).toFixed(1)}h</span></MultiCrmInnerPanel>)}</div></MultiCrmCard>
    <MultiCrmCard className="space-y-4 xl:col-span-8"><SectionTitle icon={BarChart3} title="Recent operational logs" detail="All client accounts and team members" /><DataTable headers={["Agent", "Client", "Description", "Duration", "Logged"]} rows={dashboard.timeLogs.map((log) => [log.user?.name ?? "Unassigned", log.clientAccount.name, log.description, `${log.minutes}m`, dateTime(log.loggedAt)])} /></MultiCrmCard>
  </div>;
}

function CommissionsView({ dashboard }: { dashboard: AdminDashboardData }) {
  return <div className="space-y-6"><Metrics dashboard={dashboard} /><MultiCrmCard className="space-y-4"><SectionTitle icon={CircleDollarSign} title="Company commission ledger" detail="Expected versus received across all agents and accounts" /><DataTable headers={["Agent", "Client", "Deal", "Expected", "Received", "Status"]} rows={dashboard.commissions.map((record) => [record.user?.name ?? "Unassigned", record.clientAccount.name, record.deal?.title ?? "Manual commission", money(record.expectedCents), money(record.receivedCents), record.status])} /></MultiCrmCard></div>;
}

function AnalyticsView({ dashboard }: { dashboard: AdminDashboardData }) {
  const maxContacts = Math.max(1, ...dashboard.clients.map((client) => client._count.contacts));
  return <div className="space-y-6"><Metrics dashboard={dashboard} /><div className="grid grid-cols-1 gap-6 xl:grid-cols-2"><MultiCrmCard className="space-y-4"><SectionTitle icon={BarChart3} title="Contact footprint by client" detail="Canonical contacts in each tenant" />{dashboard.clients.map((client) => <div key={client.id} className="space-y-1.5"><div className="flex justify-between text-xs"><span>{client.name}</span><span className="font-mono text-crm-text-muted">{client._count.contacts}</span></div><div className="h-2 overflow-hidden rounded-full bg-crm-base"><div className="h-full rounded-full bg-primary-cyan" style={{ width: `${Math.max(3, client._count.contacts / maxContacts * 100)}%` }} /></div></div>)}</MultiCrmCard><MultiCrmCard className="space-y-4"><SectionTitle icon={Users} title="Coverage quality" detail="Assigned capacity by client" />{dashboard.clients.map((client) => <MultiCrmInnerPanel key={client.id} className="flex items-center justify-between"><div><p className="text-xs font-semibold">{client.name}</p><p className="mt-1 text-[10px] font-mono text-crm-text-muted">{client._count.contacts} contacts</p></div><MultiCrmTag variant={client._count.agentAssignments > 0 ? "cyan" : "magenta"}>{client._count.agentAssignments} AGENTS</MultiCrmTag></MultiCrmInnerPanel>)}</MultiCrmCard></div></div>;
}

function IntegrationsView({ dashboard }: { dashboard: AdminDashboardData }) {
  return <div className="space-y-6"><AdminIntegrationManager clients={dashboard.clients.map(({ id, name }) => ({ id, name }))} /><MultiCrmCard className="space-y-4"><SectionTitle icon={DatabaseZap} title="Synchronization runs" detail="Provider outcomes and record counts" /><div className="space-y-2">{dashboard.syncRuns.map((run) => <SyncRunCard key={run.id} run={run} />)}{dashboard.syncRuns.length === 0 && <Empty text="No synchronization runs recorded." />}</div></MultiCrmCard></div>;
}

function AuditView({ dashboard }: { dashboard: AdminDashboardData }) {
  return <MultiCrmCard className="space-y-4"><SectionTitle icon={Activity} title="Company audit stream" detail="Administrative and operational events, newest first" /><AuditRows audits={dashboard.audits} /></MultiCrmCard>;
}

type AdminManageProps = { dashboard: AdminDashboardData; canManage: boolean; mutate: (url: string, method: "POST" | "PATCH", body: Record<string, unknown>, successMessage: string) => Promise<boolean> };

function NewUserForm({ clients, mutate }: { clients: AdminDashboardData["clients"]; mutate: AdminManageProps["mutate"] }) {
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "AGENT" as "AGENT" | "MANAGER", clientAccountIds: [] as string[] });
  const [saving, setSaving] = useState(false);
  const submit = async (event: React.FormEvent) => { event.preventDefault(); setSaving(true); const saved = await mutate("/api/admin/users", "POST", form, `${form.name} was added to the company.`); if (saved) setForm({ name: "", email: "", password: "", role: "AGENT", clientAccountIds: [] }); setSaving(false); };
  return <form onSubmit={submit} className="space-y-3"><AdminInput label="Name" value={form.name} onChange={(value) => setForm({ ...form, name: value })} /><AdminInput label="Email" type="email" value={form.email} onChange={(value) => setForm({ ...form, email: value })} /><AdminInput label="Temporary password" type="password" value={form.password} onChange={(value) => setForm({ ...form, password: value })} /><label className="block space-y-1.5 text-[10px] font-mono text-crm-text-muted">ROLE<select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as "AGENT" | "MANAGER" })} className="w-full rounded-xl border border-crm-border bg-crm-base px-3 py-2.5 text-xs text-crm-text"><option value="AGENT">Sales Agent</option><option value="MANAGER">Manager</option></select></label><fieldset className="space-y-2"><legend className="text-[10px] font-mono text-crm-text-muted">INITIAL CLIENT ACCESS</legend>{clients.map((client) => <label key={client.id} className="flex items-center gap-2 text-xs"><input type="checkbox" checked={form.clientAccountIds.includes(client.id)} onChange={(event) => setForm({ ...form, clientAccountIds: event.target.checked ? [...form.clientAccountIds, client.id] : form.clientAccountIds.filter((id) => id !== client.id) })} />{client.name}</label>)}</fieldset><button disabled={saving} className="w-full rounded-xl bg-primary-cyan px-4 py-2.5 text-xs font-semibold text-slate-950 disabled:opacity-50">{saving ? "CREATING…" : "CREATE TEAM MEMBER"}</button></form>;
}

function NewClientForm({ mutate }: { mutate: AdminManageProps["mutate"] }) {
  const [form, setForm] = useState({ name: "", brandName: "", communicationIdentity: "" });
  const [saving, setSaving] = useState(false);
  const submit = async (event: React.FormEvent) => { event.preventDefault(); setSaving(true); const saved = await mutate("/api/admin/clients", "POST", form, `${form.name} was added to the client portfolio.`); if (saved) setForm({ name: "", brandName: "", communicationIdentity: "" }); setSaving(false); };
  return <form onSubmit={submit} className="space-y-3"><AdminInput label="Client company" value={form.name} onChange={(value) => setForm({ ...form, name: value })} /><AdminInput label="Brand name" value={form.brandName} onChange={(value) => setForm({ ...form, brandName: value })} /><AdminInput label="Communication identity (optional)" required={false} value={form.communicationIdentity} onChange={(value) => setForm({ ...form, communicationIdentity: value })} /><button disabled={saving} className="w-full rounded-xl bg-primary-cyan px-4 py-2.5 text-xs font-semibold text-slate-950 disabled:opacity-50">{saving ? "CREATING…" : "CREATE CLIENT ACCOUNT"}</button></form>;
}

function AssignmentRow({ agent, clients, canManage, mutate }: { agent: AdminDashboardData["agents"][number]; clients: AdminDashboardData["clients"]; canManage: boolean; mutate: AdminManageProps["mutate"] }) {
  const initial = useMemo(() => agent.clientAccess.map((access) => access.clientAccount.id), [agent.clientAccess]);
  const [selected, setSelected] = useState(initial);
  const [saving, setSaving] = useState(false);
  useEffect(() => setSelected(initial), [initial]);
  const save = async () => { setSaving(true); await mutate(`/api/admin/users/${agent.id}`, "PATCH", { clientAccountIds: selected }, `${agent.name}'s client access was updated.`); setSaving(false); };
  return <MultiCrmInnerPanel className="space-y-3"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold">{agent.name}</p><p className="mt-1 text-[10px] font-mono text-crm-text-muted">{agent.email}</p></div><MultiCrmTag variant={agent.status === "ACTIVE" ? "cyan" : "magenta"}>{agent.status}</MultiCrmTag></div><div className="flex flex-wrap gap-2">{clients.map((client) => <label key={client.id} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-[10px] font-mono ${selected.includes(client.id) ? "border-primary-cyan/35 bg-primary-cyan/10 text-primary-cyan" : "border-crm-border text-crm-text-muted"}`}><input type="checkbox" disabled={!canManage} checked={selected.includes(client.id)} onChange={(event) => setSelected(event.target.checked ? [...selected, client.id] : selected.filter((id) => id !== client.id))} />{client.name}</label>)}</div>{canManage && <button disabled={saving || JSON.stringify([...selected].sort()) === JSON.stringify([...initial].sort())} onClick={save} className="rounded-lg border border-primary-cyan/35 px-3 py-2 text-[10px] font-mono text-primary-cyan disabled:opacity-40">{saving ? "SAVING…" : "SAVE ASSIGNMENTS"}</button>}</MultiCrmInnerPanel>;
}

function Metrics({ dashboard }: { dashboard: AdminDashboardData }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric icon={CircleDollarSign} label="Expected commission" value={money(dashboard.summary.expectedCents)} /><Metric icon={BarChart3} label="Received / pending" value={`${money(dashboard.summary.receivedCents)} / ${money(dashboard.summary.pendingCents)}`} /><Metric icon={Clock3} label="Company time" value={`${(dashboard.summary.activeMinutes / 60).toFixed(1)}h`} /><Metric icon={Users} label="Active sales agents" value={String(dashboard.summary.activeAgents)} /></div>;
}

function Metric({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) { return <MultiCrmCard className="p-5"><div className="flex items-center justify-between"><p className="text-[10px] font-mono uppercase tracking-wider text-crm-text-muted">{label}</p><Icon className="h-4 w-4 text-primary-cyan" /></div><p className="mt-3 text-xl font-semibold tabular-nums">{value}</p></MultiCrmCard>; }
function SectionTitle({ icon: Icon, title, detail }: { icon: typeof Users; title: string; detail: string }) { return <div className="flex items-start gap-3 border-b border-crm-border pb-3"><Icon className="mt-0.5 h-4 w-4 text-primary-cyan" /><div><h2 className="text-sm font-semibold">{title}</h2><p className="mt-1 text-[10px] font-mono text-crm-text-muted">{detail}</p></div></div>; }
function AgentCard({ agent }: { agent: AdminDashboardData["agents"][number] }) { return <MultiCrmInnerPanel className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2"><p className="text-xs font-semibold">{agent.name}</p><MultiCrmTag variant={agent.role === "AGENT" ? "cyan" : "magenta"}>{agent.role}</MultiCrmTag></div><p className="mt-1 text-[10px] font-mono text-crm-text-muted">{agent.email} · {agent.clientAccess.map((access) => access.clientAccount.name).join(", ") || "No assigned clients"}</p></div><span className="text-[10px] font-mono text-crm-text-muted">{agent._count.commissionRecords} commissions · {agent._count.timeLogs} logs</span></MultiCrmInnerPanel>; }
function SyncRunCard({ run }: { run: AdminDashboardData["syncRuns"][number] }) { const categories = run.categoryCounts && typeof run.categoryCounts === "object" ? Object.entries(run.categoryCounts as Record<string, { read?: number; created?: number; updated?: number; failed?: number }>) : []; return <MultiCrmInnerPanel className="space-y-2"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold">{run.clientAccount.name}</p><p className="mt-1 text-[10px] font-mono text-crm-text-muted">{run.provider} · {dateTime(run.startedAt)}</p></div><MultiCrmTag variant={run.status === "COMPLETED" ? "cyan" : "magenta"}>{run.status}</MultiCrmTag></div><p className="text-[10px] font-mono text-crm-text-muted">Read {run.recordsRead} · Created {run.recordsCreated} · Updated {run.recordsUpdated} · Failed {run.recordsFailed}</p>{categories.length > 0 && <div className="flex flex-wrap gap-1.5">{categories.map(([name, count]) => <span key={name} className="rounded-md border border-crm-border bg-crm-inner px-2 py-1 text-[9px] font-mono text-crm-text-muted">{name}: {count.read ?? 0} read · {count.failed ?? 0} failed</span>)}</div>}{run.errorMessage && <p className="text-[10px] text-rose-300">{run.errorMessage}</p>}</MultiCrmInnerPanel>; }
function AuditRows({ audits }: { audits: AdminDashboardData["audits"] }) { return <div className="space-y-2">{audits.map((audit) => <MultiCrmInnerPanel key={audit.id} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-semibold">{audit.action.replaceAll("_", " ")}</p><p className="mt-1 text-[10px] font-mono text-crm-text-muted">{audit.user?.name ?? "System"} · {audit.clientAccount?.name ?? "Company"} · {audit.source}</p></div><span className="text-[10px] font-mono text-crm-text-muted">{dateTime(audit.createdAt)}</span></MultiCrmInnerPanel>)}{audits.length === 0 && <Empty text="No audit activity recorded." />}</div>; }
function DataTable({ headers, rows }: { headers: string[]; rows: string[][] }) { return <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-xs"><thead><tr className="border-b border-crm-border text-[10px] font-mono uppercase text-crm-text-muted">{headers.map((header) => <th key={header} className="px-3 py-3 font-normal">{header}</th>)}</tr></thead><tbody className="divide-y divide-crm-border/60">{rows.map((row, index) => <tr key={`${row[0]}-${index}`} className="hover:bg-white/3">{row.map((cell, cellIndex) => <td key={`${cell}-${cellIndex}`} className="px-3 py-3 text-crm-text-muted first:font-medium first:text-crm-text">{cell}</td>)}</tr>)}</tbody></table>{rows.length === 0 && <Empty text="No records are available." />}</div>; }
function AdminInput({ label, value, onChange, type = "text", required = true }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) { return <label className="block space-y-1.5 text-[10px] font-mono text-crm-text-muted">{label.toUpperCase()}<input required={required} type={type} value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-crm-border bg-crm-base px-3 py-2.5 text-xs text-crm-text outline-none focus:border-primary-cyan/50" /></label>; }
function ReadOnlyNotice() { return <div className="rounded-xl border border-crm-border bg-crm-inner p-4 text-xs leading-relaxed text-crm-text-muted">Manager access is intentionally read-only. An Administrator must perform role, assignment, or client-account changes.</div>; }
function Empty({ text }: { text: string }) { return <p className="py-8 text-center text-xs font-mono text-crm-text-muted">{text}</p>; }
function LoadingState() { return <MultiCrmCard className="flex min-h-64 items-center justify-center"><div className="text-center"><RefreshCw className="mx-auto h-5 w-5 animate-spin text-primary-cyan" /><p className="mt-3 text-xs font-mono text-crm-text-muted">Loading company workspace…</p></div></MultiCrmCard>; }
