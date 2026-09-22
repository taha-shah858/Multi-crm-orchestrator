"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUpRight, Building2, CheckCircle2, Clock3, DatabaseZap, LockKeyhole, RefreshCw, ShieldCheck, Unplug } from "lucide-react";
import { useClientAccount } from "@/context/ClientAccountContext";
import { readApiJson } from "@/lib/http/client-api";
import type { IntegrationConnectionSummary } from "@/lib/models/canonical";
import { MultiCrmCard, MultiCrmInnerPanel, MultiCrmTag } from "@/components/ui/MultiCrmCard";

interface IntegrationPayload {
  success: true;
  connections: IntegrationConnectionSummary[];
  permissions: { canConnectCompany: boolean; canConnectClient: boolean; canConnectUser: boolean };
}

const statusTone = (status: IntegrationConnectionSummary["status"]) => status === "CONNECTED" ? "text-emerald-400" : status === "DEGRADED" ? "text-amber-400" : "text-rose-400";
const formatDate = (value: string | null) => value ? new Date(value).toLocaleString() : "Not yet";

export default function IntegrationsAppCenter() {
  const { activeClientAccount, isClientAccountReady } = useClientAccount();
  const [connections, setConnections] = useState<IntegrationConnectionSummary[]>([]);
  const [canConnectClient, setCanConnectClient] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "success" | "error" | "info"; text: string } | null>(null);
  const requestVersion = useRef(0);

  const loadConnections = useCallback(async () => {
    if (!isClientAccountReady || !activeClientAccount.id) return;
    const version = ++requestVersion.current;
    setIsLoading(true);
    try {
      const response = await fetch("/api/integrations", { cache: "no-store" });
      const data = await readApiJson<IntegrationPayload>(response);
      if (version !== requestVersion.current) return;
      setConnections(data.connections);
      setCanConnectClient(data.permissions.canConnectClient);
    } catch (error) {
      if (version === requestVersion.current) setMessage({ tone: "error", text: error instanceof Error ? error.message : "Integrations could not be loaded." });
    } finally {
      if (version === requestVersion.current) setIsLoading(false);
    }
  }, [activeClientAccount.id, isClientAccountReady]);

  useEffect(() => { queueMicrotask(() => void loadConnections()); }, [loadConnections]);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const state = params.get("integration");
    if (!state) return;
    const text = state === "connected" ? "HubSpot connected successfully." : state === "denied" ? "HubSpot authorization was cancelled." : params.get("message") || "HubSpot could not be connected.";
    queueMicrotask(() => {
      setMessage({ tone: state === "connected" ? "success" : state === "denied" ? "info" : "error", text });
      window.history.replaceState({}, "", window.location.pathname);
    });
  }, []);

  const connectHubSpot = async () => {
    setWorkingId("connect-hubspot"); setMessage(null);
    try {
      const response = await fetch("/api/integrations/hubspot/connect", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ownershipType: "CLIENT_ACCOUNT" }) });
      const data = await readApiJson<{ success: true; authorizationUrl: string }>(response);
      window.location.assign(data.authorizationUrl);
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "HubSpot authorization could not be started." });
      setWorkingId(null);
    }
  };

  const runSync = async (connection: IntegrationConnectionSummary, retry = false) => {
    setWorkingId(connection.id); setMessage(null);
    try {
      const response = await fetch(`/api/integrations/${connection.id}/${retry ? "retry" : "sync"}`, { method: "POST" });
      const data = await readApiJson<{ success: true; sync: { recordsRead: number; recordsCreated: number; recordsUpdated: number } }>(response);
      setMessage({ tone: "success", text: `Sync complete: ${data.sync.recordsRead} read, ${data.sync.recordsCreated} created, ${data.sync.recordsUpdated} updated.` });
      await loadConnections();
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "The integration could not be synchronized." });
      await loadConnections();
    } finally { setWorkingId(null); }
  };

  const clientConnections = connections.filter((item) => item.ownershipType === "CLIENT_ACCOUNT" && item.clientAccountId === activeClientAccount.id);
  const hubSpot = clientConnections.find((item) => item.provider === "HUBSPOT");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2"><MultiCrmTag variant="cyan">CLIENT INTEGRATIONS</MultiCrmTag><span className="text-[10px] font-mono text-crm-text-muted">{activeClientAccount.name}</span></div>
          <h1 className="text-2xl font-bold tracking-tight text-crm-text">Integration Hub</h1>
          <p className="mt-1 max-w-2xl text-xs font-mono text-crm-text-muted">Secure provider connections, sales CRM synchronization, and retry controls for the active client account.</p>
        </div>
        <button onClick={() => void loadConnections()} disabled={isLoading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-crm-border bg-crm-inner px-4 py-2 text-xs font-mono text-crm-text-muted transition hover:text-primary-cyan disabled:opacity-50"><RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />Refresh status</button>
      </div>

      {message && <div className={`rounded-xl border px-4 py-3 text-xs font-mono ${message.tone === "success" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : message.tone === "info" ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-300" : "border-rose-500/30 bg-rose-500/10 text-rose-300"}`}>{message.text}</div>}

      <div className="grid gap-6 xl:grid-cols-12">
        <MultiCrmCard className="space-y-5 xl:col-span-8">
          <div className="flex items-start justify-between gap-4"><div><h2 className="flex items-center gap-2 text-sm font-semibold text-crm-text"><Building2 className="h-4 w-4 text-orange-400" />HubSpot Sales CRM</h2><p className="mt-1 text-[11px] font-mono text-crm-text-muted">Contacts, companies, deals, owners, pipelines, and sales activities</p></div>{hubSpot && <span className={`text-[10px] font-mono ${statusTone(hubSpot.status)}`}>● {hubSpot.status.replaceAll("_", " ")}</span>}</div>
          {hubSpot ? (
            <MultiCrmInnerPanel className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3"><Metric label="Connected account" value={hubSpot.providerAccountName || hubSpot.providerAccountId || "HubSpot account"} /><Metric label="Connected" value={formatDate(hubSpot.connectedAt)} /><Metric label="Last sales sync" value={formatDate(hubSpot.lastSyncAt)} /></div>
              {hubSpot.lastError && <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-[11px] font-mono text-amber-300">{hubSpot.lastError}</div>}
              <div className="flex flex-wrap gap-2">
                <button onClick={() => void runSync(hubSpot)} disabled={workingId === hubSpot.id || !hubSpot.permissions.canSync} className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-xs font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-50"><DatabaseZap className="h-3.5 w-3.5" />Sync now</button>
                {(hubSpot.status === "DEGRADED" || hubSpot.status === "ERROR") && <button onClick={() => void runSync(hubSpot, true)} disabled={workingId === hubSpot.id || !hubSpot.permissions.canRetry} className="inline-flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs font-mono text-amber-300 disabled:opacity-50"><RefreshCw className="h-3.5 w-3.5" />Retry failed sync</button>}
                {canConnectClient && <button onClick={() => void connectHubSpot()} disabled={workingId !== null} className="inline-flex items-center gap-2 rounded-xl border border-crm-border bg-crm-inner px-4 py-2 text-xs font-mono text-crm-text-muted hover:text-primary-cyan disabled:opacity-50"><ArrowUpRight className="h-3.5 w-3.5" />Reconnect OAuth</button>}
              </div>
            </MultiCrmInnerPanel>
          ) : (
            <MultiCrmInnerPanel className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold text-crm-text">No HubSpot account connected</p><p className="mt-1 text-[11px] font-mono text-crm-text-muted">An Admin or permitted Agent can authorize the HubSpot account owned by this client.</p></div><button onClick={() => void connectHubSpot()} disabled={!canConnectClient || workingId !== null} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40"><LockKeyhole className="h-3.5 w-3.5" />Connect HubSpot</button></MultiCrmInnerPanel>
          )}
        </MultiCrmCard>

        <MultiCrmCard className="space-y-4 xl:col-span-4"><div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-400" /><h2 className="text-sm font-semibold text-crm-text">Connection security</h2></div><div className="space-y-3 text-[11px] font-mono text-crm-text-muted"><SecurityLine text="Tokens are encrypted server-side" /><SecurityLine text="Secrets never enter browser responses" /><SecurityLine text="Connections are isolated by company and client" /><SecurityLine text="OAuth state is single-use and expires in 10 minutes" /></div></MultiCrmCard>
      </div>

      {clientConnections.filter((item) => item.provider !== "HUBSPOT").map((connection) => <MultiCrmCard key={connection.id} className="flex items-center justify-between"><div><p className="text-sm font-semibold text-crm-text">{connection.provider === "MOCK" ? "Mock CRM" : connection.provider}</p><p className="mt-1 text-[11px] font-mono text-crm-text-muted">Existing client-scoped provider connection</p></div><span className={`text-[10px] font-mono ${statusTone(connection.status)}`}>{connection.status}</span></MultiCrmCard>)}

      <div className="grid gap-3 sm:grid-cols-3"><FutureCard name="Twilio" /><FutureCard name="Calendar providers" /><FutureCard name="Additional CRMs" /></div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) { return <div><p className="text-[9px] font-mono uppercase tracking-wider text-crm-text-muted">{label}</p><p className="mt-1 truncate text-xs text-crm-text" title={value}>{value}</p></div>; }
function SecurityLine({ text }: { text: string }) { return <div className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" /><span>{text}</span></div>; }
function FutureCard({ name }: { name: string }) { return <div className="flex items-center justify-between rounded-xl border border-crm-border/70 bg-crm-card/50 px-4 py-3"><div className="flex items-center gap-2"><Unplug className="h-3.5 w-3.5 text-crm-text-muted" /><span className="text-xs text-crm-text-muted">{name}</span></div><span className="flex items-center gap-1 text-[9px] font-mono text-crm-text-muted"><Clock3 className="h-3 w-3" />LATER STAGE</span></div>; }
