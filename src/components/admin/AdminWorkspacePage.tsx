"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  BarChart3,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  Clock,
  Clock3,
  DatabaseZap,
  Mail,
  Network,
  RefreshCw,
  Send,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import type { AdminDashboardData } from "@/lib/admin/admin-types";
import { MultiCrmCard, MultiCrmInnerPanel, MultiCrmTag } from "@/components/ui/MultiCrmCard";
import { useAdminWorkspaceUser } from "@/components/admin/AdminWorkspaceShell";
import { readApiJson } from "@/lib/http/client-api";
import { AdminIntegrationManager } from "@/components/admin/AdminIntegrationManager";
import { PasswordInput } from "@/components/ui/password-input";

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
    <div className="space-y-6 text-slate-900 font-sans">
      <header className="flex flex-col gap-3 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-blue-600" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{heading.title}</h1>
          </div>
          <p className="mt-1.5 max-w-3xl text-xs font-normal leading-relaxed text-slate-600">{heading.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <MultiCrmTag variant={user.role === "ADMIN" ? "magenta" : "cyan"}>{user.role} ACCESS</MultiCrmTag>
          <button onClick={refresh} className="rounded-lg border border-slate-300 p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 cursor-pointer shadow-2xs" title="Refresh company data">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </header>

      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-sans text-red-700">{error}</p>}
      {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-sans text-emerald-800">{notice}</p>}
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
      <MultiCrmCard className="space-y-4 xl:col-span-7 bg-white border border-slate-200 shadow-xs rounded-xl p-6">
        <SectionTitle icon={Users} title="Team and client coverage" detail={`${dashboard.summary.activeAgents} active agents across ${dashboard.clients.length} client accounts`} />
        <div className="space-y-2">{dashboard.agents.slice(0, 8).map((agent) => <AgentCard key={agent.id} agent={agent} />)}</div>
      </MultiCrmCard>
      <MultiCrmCard className="space-y-4 xl:col-span-5 bg-white border border-slate-200 shadow-xs rounded-xl p-6">
        <SectionTitle icon={Network} title="Latest sync health" detail="Most recent provider activity" />
        <div className="space-y-2">{dashboard.syncRuns.slice(0, 8).map((run) => <SyncRunCard key={run.id} run={run} />)}{dashboard.syncRuns.length === 0 && <Empty text="No synchronization runs recorded." />}</div>
      </MultiCrmCard>
    </div>
    <MultiCrmCard className="space-y-4 bg-white border border-slate-200 shadow-xs rounded-xl p-6">
      <SectionTitle icon={Activity} title="Recent administrative activity" detail="Company audit trail" />
      <AuditRows audits={dashboard.audits.slice(0, 10)} />
    </MultiCrmCard>
  </div>;
}

function AgentsView({ dashboard, canManage, mutate }: AdminManageProps) {
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [invitations, setInvitations] = useState<Array<{ id: string; email: string; role: string; expiresAt: string; isExpired: boolean }>>([]);
  const [loadingInvites, setLoadingInvites] = useState(false);
  const [tableFilter, setTableFilter] = useState<"all" | "active" | "invites">("all");
  const user = useAdminWorkspaceUser();

  const loadInvitations = useCallback(async () => {
    setLoadingInvites(true);
    try {
      const response = await fetch("/api/members", { cache: "no-store" });
      const data = await readApiJson<{ success: boolean; invitations: Array<{ id: string; email: string; role: string; expiresAt: string; isExpired: boolean }> }>(response);
      if (data?.invitations) setInvitations(data.invitations);
    } catch {
      // Ignore background load error
    } finally {
      setLoadingInvites(false);
    }
  }, []);

  useEffect(() => {
    void loadInvitations();
  }, [loadInvitations]);

  const handleRevokeUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to revoke all access and terminate active sessions for ${userName}?`)) return;
    const success = await mutate(`/api/members/${userId}`, "DELETE" as any, {}, `Revoked access for ${userName}.`);
    if (success) {
      void loadInvitations();
    }
  };

  const handleRevokeInvitation = async (invitationId: string, email: string) => {
    if (!confirm(`Cancel pending invitation for ${email}?`)) return;
    try {
      const res = await fetch(`/api/members/invitations/${invitationId}`, { method: "DELETE" });
      await readApiJson(res);
      void loadInvitations();
    } catch {
      // Handled
    }
  };

  const pendingInvitesCount = invitations.filter((i) => !i.isExpired).length;

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900 font-sans">Company Members & Access Control</h2>
          </div>
          <p className="mt-1 text-xs text-slate-500 font-sans">
            Manage active members, roles, client account permissions, and outgoing email invitations.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          {canManage && (
            <button
              onClick={() => setIsInviteModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition-colors cursor-pointer"
            >
              <UserPlus className="h-4 w-4" />
              <span>INVITE MEMBER</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setTableFilter("all")}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
            tableFilter === "all" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          All Members ({dashboard.agents.length + pendingInvitesCount})
        </button>
        <button
          onClick={() => setTableFilter("active")}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
            tableFilter === "active" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Active Members ({dashboard.agents.filter((a) => a.status === "ACTIVE").length})
        </button>
        <button
          onClick={() => setTableFilter("invites")}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
            tableFilter === "invites" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Pending Invites ({pendingInvitesCount})
        </button>
      </div>

      {/* Members & Invitations Table (Salesforce / Zoho Standard) */}
      <MultiCrmCard className="bg-white border border-slate-200 shadow-xs rounded-xl overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr className="text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="px-5 py-3.5">Name / Email</th>
                <th className="px-4 py-3.5">Role</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Assigned Clients / Details</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {/* Active & Existing Users */}
              {tableFilter !== "invites" &&
                dashboard.agents.map((agent) => {
                  const isSelf = agent.id === user.id;
                  return (
                    <tr key={agent.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 font-bold text-slate-700 text-xs border border-slate-200">
                            {agent.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 flex items-center gap-1.5">
                              {agent.name}
                              {isSelf && (
                                <span className="rounded bg-blue-50 border border-blue-200 px-1.5 py-0.2 text-[10px] text-blue-600 font-medium">
                                  You
                                </span>
                              )}
                            </p>
                            <p className="text-slate-500 text-[11px] font-sans">{agent.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <MultiCrmTag variant={agent.role === "ADMIN" ? "magenta" : agent.role === "MANAGER" ? "purple" : "cyan"}>
                          {agent.role === "ADMIN" ? "Admin" : agent.role === "MANAGER" ? "Manager" : "Sales Agent"}
                        </MultiCrmTag>
                      </td>
                      <td className="px-4 py-4">
                        {agent.status === "ACTIVE" ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 border border-rose-200 px-2.5 py-0.5 text-[11px] font-medium text-rose-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                            {agent.status}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {agent.clientAccess.length > 0 ? (
                            agent.clientAccess.map((access) => (
                              <span
                                key={access.clientAccount.id}
                                className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-700"
                              >
                                {access.clientAccount.name}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-400 text-[11px] italic">No assigned clients</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        {canManage && !isSelf ? (
                          <button
                            onClick={() => handleRevokeUser(agent.id, agent.name)}
                            title="Revoke member access and terminate all sessions"
                            className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-white hover:bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-600 transition-colors cursor-pointer shadow-2xs"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Revoke Access</span>
                          </button>
                        ) : isSelf ? (
                          <span className="text-[11px] text-slate-400 italic">Self Account</span>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}

              {/* Pending Invitations */}
              {tableFilter !== "active" &&
                invitations.map((inv) => (
                  <tr key={inv.id} className="bg-amber-50/30 hover:bg-amber-50/60 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-800 text-xs border border-amber-200">
                          <Mail className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{inv.email}</p>
                          <p className="text-[11px] text-amber-700 font-sans">
                            Expires {new Date(inv.expiresAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <MultiCrmTag variant={inv.role === "ADMIN" ? "magenta" : inv.role === "MANAGER" ? "purple" : "cyan"}>
                        {inv.role === "ADMIN" ? "Admin" : inv.role === "MANAGER" ? "Manager" : "Sales Agent"}
                      </MultiCrmTag>
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[11px] font-medium text-amber-800">
                        <Clock className="h-3 w-3 text-amber-600" />
                        Pending Invite
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-[11px] text-slate-500 font-sans">
                        Invitation link dispatched · Awaiting acceptance
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      {canManage && (
                        <button
                          onClick={() => handleRevokeInvitation(inv.id, inv.email)}
                          title="Revoke / Cancel Invitation"
                          className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white hover:bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors cursor-pointer shadow-2xs"
                        >
                          <X className="h-3.5 w-3.5 text-slate-500" />
                          <span>Revoke Invite</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          {dashboard.agents.length === 0 && invitations.length === 0 && (
            <p className="py-8 text-center text-xs text-slate-500 font-sans">No members or invitations found.</p>
          )}
        </div>
      </MultiCrmCard>

      {/* Invite Member Modal with Two Tabs */}
      {isInviteModalOpen && (
        <InviteMemberModal
          clients={dashboard.clients}
          mutate={mutate}
          onClose={() => {
            setIsInviteModalOpen(false);
            void loadInvitations();
          }}
        />
      )}
    </div>
  );
}

function InviteMemberModal({
  clients,
  mutate,
  onClose,
}: {
  clients: AdminDashboardData["clients"];
  mutate: AdminManageProps["mutate"];
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"invite" | "provision">("invite");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"AGENT" | "MANAGER" | "ADMIN">("AGENT");
  const [sendingInvite, setSendingInvite] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteNotice, setInviteNotice] = useState<string | null>(null);

  // Tab 1 Submit: Send Email Invite
  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendingInvite(true);
    setInviteError(null);
    setInviteNotice(null);

    try {
      const response = await fetch("/api/members/invite", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      const data = await readApiJson<{ success?: boolean; message?: string }>(response);
      if (data?.success) {
        setInviteNotice(data.message || `Invitation dispatched to ${inviteEmail}.`);
        setInviteEmail("");
        setTimeout(() => onClose(), 1200);
      }
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Failed to send invitation.");
    } finally {
      setSendingInvite(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden font-sans">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50">
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-blue-600" />
            <h3 className="text-base font-bold text-slate-900">Add Team Member</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Tabs */}
        <div className="flex border-b border-slate-200 bg-white px-6">
          <button
            type="button"
            onClick={() => setTab("invite")}
            className={`border-b-2 py-3 px-4 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
              tab === "invite"
                ? "border-blue-600 text-blue-600 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Tab 1: Send Email Invite
          </button>
          <button
            type="button"
            onClick={() => setTab("provision")}
            className={`border-b-2 py-3 px-4 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
              tab === "provision"
                ? "border-blue-600 text-blue-600 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Tab 2: Manual Provisioning
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6">
          {tab === "invite" ? (
            /* TAB 1: SEND EMAIL INVITE */
            <form onSubmit={handleSendInvite} className="space-y-4">
              <p className="text-xs text-slate-600 font-sans leading-relaxed">
                Send an invitation link with a 48-hour expiration. The invitee can set up their name and password to join your workspace.
              </p>

              {inviteError && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2 text-xs text-red-700">
                  {inviteError}
                </p>
              )}
              {inviteNotice && (
                <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs text-emerald-800">
                  {inviteNotice}
                </p>
              )}

              <div>
                <label className="block space-y-1.5 text-xs font-semibold uppercase tracking-wider text-slate-700 font-sans">
                  Email Address
                  <input
                    type="email"
                    required
                    placeholder="teammate@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-sans text-slate-900 shadow-2xs outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  />
                </label>
              </div>

              <div>
                <label className="block space-y-1.5 text-xs font-semibold uppercase tracking-wider text-slate-700 font-sans">
                  Role
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as any)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-sans text-slate-900 shadow-2xs outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  >
                    <option value="AGENT">Sales Agent</option>
                    <option value="MANAGER">Manager</option>
                    <option value="ADMIN">Administrator</option>
                  </select>
                </label>
              </div>

              <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-3 text-[11px] text-blue-700 font-sans">
                🔐 Generates an enterprise-branded invitation email with an encrypted crypto token link valid for 48 hours.
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingInvite}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-semibold text-white shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>{sendingInvite ? "DISPATCHING…" : "SEND EMAIL INVITE"}</span>
                </button>
              </div>
            </form>
          ) : (
            /* TAB 2: MANUAL PROVISIONING */
            <NewUserForm clients={clients} mutate={mutate} onComplete={onClose} />
          )}
        </div>
      </div>
    </div>
  );
}

function ClientsView({ dashboard, canManage, mutate }: AdminManageProps) {
  return <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
    <MultiCrmCard className="space-y-4 xl:col-span-8 bg-white border border-slate-200 shadow-xs rounded-xl p-6">
      <SectionTitle icon={Building2} title="Client portfolio" detail="Tenant-scoped accounts owned by this company" />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">{dashboard.clients.map((client) => <MultiCrmInnerPanel key={client.id} className="space-y-3 bg-slate-50 border border-slate-200 rounded-lg p-4">
        <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-bold text-slate-900">{client.name}</p><p className="mt-0.5 text-xs text-slate-500 font-sans">{client.brandName}</p></div><MultiCrmTag variant={client.status === "ACTIVE" ? "cyan" : "magenta"}>{client.status}</MultiCrmTag></div>
        <div className="grid grid-cols-2 gap-2 text-xs font-sans text-slate-600"><span>{client._count.contacts} contacts</span><span>{client._count.agentAssignments} assignments</span><span>{client.integrationConnections.length} integrations</span><span>{client.communicationIdentity || "No comms identity"}</span></div>
        {canManage && <div className="space-y-2"><select aria-label={`Status for ${client.name}`} value={client.status} onChange={(event) => void mutate(`/api/admin/clients/${client.id}`, "PATCH", { status: event.target.value }, `${client.name} status updated.`)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 shadow-2xs focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none"><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option><option value="ARCHIVED">Archived</option></select><label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-sans text-slate-700 cursor-pointer"><input type="checkbox" checked={client.allowAgentIntegrationManagement} onChange={(event) => void mutate(`/api/admin/clients/${client.id}`, "PATCH", { allowAgentIntegrationManagement: event.target.checked }, `${client.name} integration permission updated.`)} />Allow assigned agents to connect client integrations</label></div>}
      </MultiCrmInnerPanel>)}</div>
    </MultiCrmCard>
    <MultiCrmCard className="space-y-4 xl:col-span-4 bg-white border border-slate-200 shadow-xs rounded-xl p-6">
      <SectionTitle icon={Building2} title={canManage ? "Add client account" : "Portfolio governance"} detail={canManage ? "Create a tenant boundary for a client company" : "Only Administrators can create or change clients"} />
      {canManage ? <NewClientForm mutate={mutate} /> : <ReadOnlyNotice />}
    </MultiCrmCard>
  </div>;
}

function AssignmentsView({ dashboard, canManage, mutate }: AdminManageProps) {
  const assignable = dashboard.agents.filter((agent) => agent.role === "AGENT");
  return <MultiCrmCard className="space-y-4 bg-white border border-slate-200 shadow-xs rounded-xl p-6">
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
    <MultiCrmCard className="space-y-4 xl:col-span-4 bg-white border border-slate-200 shadow-xs rounded-xl p-6"><SectionTitle icon={Clock3} title="Time coverage" detail="Company totals by agent" /><div className="space-y-2">{byAgent.map(([name, minutes]) => <MultiCrmInnerPanel key={name} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg p-3"><span className="text-xs font-semibold text-slate-800">{name}</span><span className="text-xs font-bold text-blue-600">{(minutes / 60).toFixed(1)}h</span></MultiCrmInnerPanel>)}</div></MultiCrmCard>
    <MultiCrmCard className="space-y-4 xl:col-span-8 bg-white border border-slate-200 shadow-xs rounded-xl p-6"><SectionTitle icon={BarChart3} title="Recent operational logs" detail="All client accounts and team members" /><DataTable headers={["Agent", "Client", "Description", "Duration", "Logged"]} rows={dashboard.timeLogs.map((log) => [log.user?.name ?? "Unassigned", log.clientAccount.name, log.description, `${log.minutes}m`, dateTime(log.loggedAt)])} /></MultiCrmCard>
  </div>;
}

function CommissionsView({ dashboard }: { dashboard: AdminDashboardData }) {
  return <div className="space-y-6"><Metrics dashboard={dashboard} /><MultiCrmCard className="space-y-4 bg-white border border-slate-200 shadow-xs rounded-xl p-6"><SectionTitle icon={CircleDollarSign} title="Company commission ledger" detail="Expected versus received across all agents and accounts" /><DataTable headers={["Agent", "Client", "Deal", "Expected", "Received", "Status"]} rows={dashboard.commissions.map((record) => [record.user?.name ?? "Unassigned", record.clientAccount.name, record.deal?.title ?? "Manual commission", money(record.expectedCents), money(record.receivedCents), record.status])} /></MultiCrmCard></div>;
}

function AnalyticsView({ dashboard }: { dashboard: AdminDashboardData }) {
  const maxContacts = Math.max(1, ...dashboard.clients.map((client) => client._count.contacts));
  return <div className="space-y-6"><Metrics dashboard={dashboard} /><div className="grid grid-cols-1 gap-6 xl:grid-cols-2"><MultiCrmCard className="space-y-4 bg-white border border-slate-200 shadow-xs rounded-xl p-6"><SectionTitle icon={BarChart3} title="Contact footprint by client" detail="Canonical contacts in each tenant" />{dashboard.clients.map((client) => <div key={client.id} className="space-y-1.5"><div className="flex justify-between text-xs font-sans"><span className="text-slate-700 font-medium">{client.name}</span><span className="text-slate-500 font-semibold">{client._count.contacts}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.max(3, client._count.contacts / maxContacts * 100)}%` }} /></div></div>)}</MultiCrmCard><MultiCrmCard className="space-y-4 bg-white border border-slate-200 shadow-xs rounded-xl p-6"><SectionTitle icon={Users} title="Coverage quality" detail="Assigned capacity by client" />{dashboard.clients.map((client) => <MultiCrmInnerPanel key={client.id} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg p-3"><div><p className="text-xs font-semibold text-slate-800">{client.name}</p><p className="mt-0.5 text-xs text-slate-500 font-sans">{client._count.contacts} contacts</p></div><MultiCrmTag variant={client._count.agentAssignments > 0 ? "cyan" : "magenta"}>{client._count.agentAssignments} AGENTS</MultiCrmTag></MultiCrmInnerPanel>)}</MultiCrmCard></div></div>;
}

function IntegrationsView({ dashboard }: { dashboard: AdminDashboardData }) {
  return <div className="space-y-6"><AdminIntegrationManager clients={dashboard.clients.map(({ id, name }) => ({ id, name }))} /><MultiCrmCard className="space-y-4 bg-white border border-slate-200 shadow-xs rounded-xl p-6"><SectionTitle icon={DatabaseZap} title="Synchronization runs" detail="Provider outcomes and record counts" /><div className="space-y-2">{dashboard.syncRuns.map((run) => <SyncRunCard key={run.id} run={run} />)}{dashboard.syncRuns.length === 0 && <Empty text="No synchronization runs recorded." />}</div></MultiCrmCard></div>;
}

function AuditView({ dashboard }: { dashboard: AdminDashboardData }) {
  return <MultiCrmCard className="space-y-4 bg-white border border-slate-200 shadow-xs rounded-xl p-6"><SectionTitle icon={Activity} title="Company audit stream" detail="Administrative and operational events, newest first" /><AuditRows audits={dashboard.audits} /></MultiCrmCard>;
}

type AdminManageProps = { dashboard: AdminDashboardData; canManage: boolean; mutate: (url: string, method: "POST" | "PATCH", body: Record<string, unknown>, successMessage: string) => Promise<boolean> };

function NewUserForm({
  clients,
  mutate,
  onComplete,
}: {
  clients: AdminDashboardData["clients"];
  mutate: AdminManageProps["mutate"];
  onComplete?: () => void;
}) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "AGENT" as "AGENT" | "MANAGER",
    clientAccountIds: [] as string[],
  });
  const [saving, setSaving] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    const saved = await mutate("/api/admin/users", "POST", form, `${form.name} was added to the company.`);
    if (saved) {
      setForm({ name: "", email: "", password: "", role: "AGENT", clientAccountIds: [] });
      if (onComplete) onComplete();
    }
    setSaving(false);
  };
  return (
    <form onSubmit={submit} className="space-y-3">
      <AdminInput
        label="Full Name (Letters & Spaces Only)"
        value={form.name}
        onChange={(value) => setForm({ ...form, name: value })}
      />
      <AdminInput
        label="Email Address"
        type="email"
        value={form.email}
        onChange={(value) => setForm({ ...form, email: value })}
      />
      <PasswordInput
        label="Temporary Password"
        value={form.password}
        onChange={(e) => setForm({ ...form, password: e.target.value })}
        required
        placeholder="Min 8 chars (upper, lower, num, symbol)"
      />
      <label className="block space-y-1.5 text-xs font-semibold uppercase tracking-wider text-slate-700 font-sans">
        ROLE
        <select
          value={form.role}
          onChange={(event) => setForm({ ...form, role: event.target.value as "AGENT" | "MANAGER" })}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-sans text-slate-900 shadow-2xs focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none"
        >
          <option value="AGENT">Sales Agent</option>
          <option value="MANAGER">Manager</option>
        </select>
      </label>
      <fieldset className="space-y-2">
        <legend className="text-xs font-semibold uppercase tracking-wider text-slate-700 font-sans">
          INITIAL CLIENT ACCESS
        </legend>
        <div className="max-h-32 overflow-y-auto space-y-1.5 rounded-lg border border-slate-200 bg-slate-50 p-2.5">
          {clients.map((client) => (
            <label key={client.id} className="flex items-center gap-2 text-xs font-sans text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form.clientAccountIds.includes(client.id)}
                onChange={(event) =>
                  setForm({
                    ...form,
                    clientAccountIds: event.target.checked
                      ? [...form.clientAccountIds, client.id]
                      : form.clientAccountIds.filter((id) => id !== client.id),
                  })
                }
              />
              {client.name}
            </label>
          ))}
          {clients.length === 0 && (
            <span className="text-[11px] text-slate-400 italic">No client accounts available.</span>
          )}
        </div>
      </fieldset>
      <button
        disabled={saving}
        className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2.5 text-xs font-medium text-white shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
      >
        {saving ? "PROVISIONING…" : "PROVISION TEAM MEMBER"}
      </button>
    </form>
  );
}

function NewClientForm({ mutate }: { mutate: AdminManageProps["mutate"] }) {
  const [form, setForm] = useState({ name: "", brandName: "", communicationIdentity: "" });
  const [saving, setSaving] = useState(false);
  const submit = async (event: React.FormEvent) => { event.preventDefault(); setSaving(true); const saved = await mutate("/api/admin/clients", "POST", form, `${form.name} was added to the client portfolio.`); if (saved) setForm({ name: "", brandName: "", communicationIdentity: "" }); setSaving(false); };
  return <form onSubmit={submit} className="space-y-3"><AdminInput label="Client company" value={form.name} onChange={(value) => setForm({ ...form, name: value })} /><AdminInput label="Brand name" value={form.brandName} onChange={(value) => setForm({ ...form, brandName: value })} /><AdminInput label="Communication identity (optional)" required={false} value={form.communicationIdentity} onChange={(value) => setForm({ ...form, communicationIdentity: value })} /><button disabled={saving} className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2.5 text-xs font-medium text-white shadow-xs transition-colors disabled:opacity-50 cursor-pointer">{saving ? "CREATING…" : "CREATE CLIENT ACCOUNT"}</button></form>;
}

function AssignmentRow({ agent, clients, canManage, mutate }: { agent: AdminDashboardData["agents"][number]; clients: AdminDashboardData["clients"]; canManage: boolean; mutate: AdminManageProps["mutate"] }) {
  const initial = useMemo(() => agent.clientAccess.map((access) => access.clientAccount.id), [agent.clientAccess]);
  const [selected, setSelected] = useState(initial);
  const [saving, setSaving] = useState(false);
  useEffect(() => setSelected(initial), [initial]);
  const save = async () => { setSaving(true); await mutate(`/api/admin/users/${agent.id}`, "PATCH", { clientAccountIds: selected }, `${agent.name}'s client access was updated.`); setSaving(false); };
  return <MultiCrmInnerPanel className="space-y-3 bg-slate-50 border border-slate-200 rounded-lg p-4"><div className="flex items-center justify-between"><div><p className="text-xs font-bold text-slate-900">{agent.name}</p><p className="mt-0.5 text-xs text-slate-500 font-sans">{agent.email}</p></div><MultiCrmTag variant={agent.status === "ACTIVE" ? "cyan" : "magenta"}>{agent.status}</MultiCrmTag></div><div className="flex flex-wrap gap-2">{clients.map((client) => <label key={client.id} className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-sans cursor-pointer transition-colors ${selected.includes(client.id) ? "border-blue-300 bg-blue-50 text-blue-700 font-medium" : "border-slate-300 bg-white text-slate-600"}`}><input type="checkbox" disabled={!canManage} checked={selected.includes(client.id)} onChange={(event) => setSelected(event.target.checked ? [...selected, client.id] : selected.filter((id) => id !== client.id))} />{client.name}</label>)}</div>{canManage && <button disabled={saving || JSON.stringify([...selected].sort()) === JSON.stringify([...initial].sort())} onClick={save} className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 text-xs font-medium shadow-xs transition-colors disabled:opacity-40 cursor-pointer">{saving ? "SAVING…" : "SAVE ASSIGNMENTS"}</button>}</MultiCrmInnerPanel>;
}

function Metrics({ dashboard }: { dashboard: AdminDashboardData }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric icon={CircleDollarSign} label="Expected commission" value={money(dashboard.summary.expectedCents)} /><Metric icon={BarChart3} label="Received / pending" value={`${money(dashboard.summary.receivedCents)} / ${money(dashboard.summary.pendingCents)}`} /><Metric icon={Clock3} label="Company time" value={`${(dashboard.summary.activeMinutes / 60).toFixed(1)}h`} /><Metric icon={Users} label="Active sales agents" value={String(dashboard.summary.activeAgents)} /></div>;
}

function Metric({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) { return <MultiCrmCard className="p-5 bg-white border border-slate-200 shadow-xs rounded-xl"><div className="flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-wider text-slate-500 font-sans">{label}</p><div className="p-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-600"><Icon className="h-4 w-4" /></div></div><p className="mt-3 text-3xl font-extrabold text-slate-900 tracking-tight font-sans tabular-nums">{value}</p></MultiCrmCard>; }
function SectionTitle({ icon: Icon, title, detail }: { icon: typeof Users; title: string; detail: string }) { return <div className="flex items-start gap-3 border-b border-slate-200 pb-3"><div className="p-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-600"><Icon className="h-4 w-4" /></div><div><h2 className="text-sm font-bold text-slate-900 font-sans">{title}</h2><p className="mt-0.5 text-xs font-normal text-slate-500 font-sans">{detail}</p></div></div>; }
function AgentCard({ agent }: { agent: AdminDashboardData["agents"][number] }) { return <MultiCrmInnerPanel className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between bg-slate-50 border border-slate-200 rounded-lg p-3"><div><div className="flex items-center gap-2"><p className="text-xs font-bold text-slate-900">{agent.name}</p><MultiCrmTag variant={agent.role === "AGENT" ? "cyan" : "magenta"}>{agent.role}</MultiCrmTag></div><p className="mt-0.5 text-xs text-slate-600 font-sans">{agent.email} · {agent.clientAccess.map((access) => access.clientAccount.name).join(", ") || "No assigned clients"}</p></div><span className="text-xs font-medium text-slate-500 font-sans">{agent._count.commissionRecords} commissions · {agent._count.timeLogs} logs</span></MultiCrmInnerPanel>; }
function SyncRunCard({ run }: { run: AdminDashboardData["syncRuns"][number] }) { const categories = run.categoryCounts && typeof run.categoryCounts === "object" ? Object.entries(run.categoryCounts as Record<string, { read?: number; created?: number; updated?: number; failed?: number }>) : []; return <MultiCrmInnerPanel className="space-y-2 bg-slate-50 border border-slate-200 rounded-lg p-3"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold text-slate-900">{run.clientAccount.name}</p><p className="mt-0.5 text-xs text-slate-500 font-sans">{run.provider} · {dateTime(run.startedAt)}</p></div><MultiCrmTag variant={run.status === "COMPLETED" ? "cyan" : "magenta"}>{run.status}</MultiCrmTag></div><p className="text-xs text-slate-600 font-sans">Read {run.recordsRead} · Created {run.recordsCreated} · Updated {run.recordsUpdated} · Failed {run.recordsFailed}</p>{categories.length > 0 && <div className="flex flex-wrap gap-1.5">{categories.map(([name, count]) => <span key={name} className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-xs font-medium text-slate-600">{name}: {count.read ?? 0} read · {count.failed ?? 0} failed</span>)}</div>}{run.errorMessage && <p className="text-xs font-medium text-red-600">{run.errorMessage}</p>}</MultiCrmInnerPanel>; }
function AuditRows({ audits }: { audits: AdminDashboardData["audits"] }) { return <div className="space-y-2">{audits.map((audit) => <MultiCrmInnerPanel key={audit.id} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between bg-slate-50 border border-slate-200 rounded-lg p-3"><div><p className="text-xs font-bold text-slate-900">{audit.action.replaceAll("_", " ")}</p><p className="mt-0.5 text-xs text-slate-600 font-sans">{audit.user?.name ?? "System"} · {audit.clientAccount?.name ?? "Company"} · {audit.source}</p></div><span className="text-xs font-medium text-slate-500 font-sans">{dateTime(audit.createdAt)}</span></MultiCrmInnerPanel>)}{audits.length === 0 && <Empty text="No audit activity recorded." />}</div>; }
function DataTable({ headers, rows }: { headers: string[]; rows: string[][] }) { return <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-xs font-sans"><thead><tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">{headers.map((header) => <th key={header} className="px-3.5 py-3 font-semibold">{header}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{rows.map((row, index) => <tr key={`${row[0]}-${index}`} className="hover:bg-slate-50/80 transition-colors">{row.map((cell, cellIndex) => <td key={`${cell}-${cellIndex}`} className="px-3.5 py-3 text-slate-600 first:font-medium first:text-slate-900">{cell}</td>)}</tr>)}</tbody></table>{rows.length === 0 && <Empty text="No records are available." />}</div>; }
function AdminInput({ label, value, onChange, type = "text", required = true }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) { return <label className="block space-y-1.5 text-xs font-semibold uppercase tracking-wider text-slate-700 font-sans">{label}<input required={required} type={type} value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-sans text-slate-900 shadow-2xs outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600" /></label>; }
function ReadOnlyNotice() { return <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs font-sans leading-relaxed text-slate-600">Manager access is intentionally read-only. An Administrator must perform role, assignment, or client-account changes.</div>; }
function Empty({ text }: { text: string }) { return <p className="py-8 text-center text-xs font-sans text-slate-500">{text}</p>; }
function LoadingState() { return <MultiCrmCard className="flex min-h-64 items-center justify-center bg-white border border-slate-200 rounded-xl"><div className="text-center"><RefreshCw className="mx-auto h-5 w-5 animate-spin text-blue-600" /><p className="mt-3 text-xs font-sans text-slate-500">Loading company workspace…</p></div></MultiCrmCard>; }
