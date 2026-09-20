"use client";

import { useCallback, useEffect, useState } from "react";
import { Building2, DatabaseZap, Link2, RefreshCw, ShieldCheck, Unplug } from "lucide-react";
import { readApiJson } from "@/lib/http/client-api";
import type { IntegrationConnectionSummary, IntegrationOwnershipType } from "@/lib/models/canonical";
import { MultiCrmCard, MultiCrmInnerPanel, MultiCrmTag } from "@/components/ui/MultiCrmCard";

export function AdminIntegrationManager({ clients }: { clients: Array<{ id: string; name: string }> }) {
  const [connections, setConnections] = useState<IntegrationConnectionSummary[]>([]);
  const [scope, setScope] = useState<IntegrationOwnershipType>("CLIENT_ACCOUNT");
  const [clientAccountId, setClientAccountId] = useState(clients[0]?.id ?? "");
  const [working, setWorking] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/integrations", { cache: "no-store" });
      const data = await readApiJson<{ success: true; connections: IntegrationConnectionSummary[] }>(response);
      setConnections(data.connections);
    } catch (error) { setMessage({ tone: "error", text: error instanceof Error ? error.message : "Connections could not be loaded." }); }
  }, []);

  useEffect(() => { queueMicrotask(() => void load()); }, [load]);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.has("integration")) return;
    const connected = params.get("integration") === "connected";
    queueMicrotask(() => {
      setMessage({ tone: connected ? "success" : "error", text: connected ? "HubSpot connected successfully." : params.get("message") || "HubSpot authorization did not complete." });
      window.history.replaceState({}, "", window.location.pathname);
      void load();
    });
  }, [load]);

  const connect = async () => {
    setWorking("connect"); setMessage(null);
    try {
      const response = await fetch("/api/integrations/hubspot/connect", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ownershipType: scope, clientAccountId: scope === "CLIENT_ACCOUNT" ? clientAccountId : undefined }) });
      const data = await readApiJson<{ success: true; authorizationUrl: string }>(response);
      window.location.assign(data.authorizationUrl);
    } catch (error) { setMessage({ tone: "error", text: error instanceof Error ? error.message : "HubSpot authorization could not be started." }); setWorking(null); }
  };

  const action = async (connection: IntegrationConnectionSummary, operation: "sync" | "retry" | "disconnect") => {
    setWorking(connection.id); setMessage(null);
    try {
      const response = await fetch(operation === "disconnect" ? `/api/integrations/${connection.id}` : `/api/integrations/${connection.id}/${operation}`, { method: operation === "disconnect" ? "DELETE" : "POST" });
      await readApiJson(response);
      setMessage({ tone: "success", text: operation === "disconnect" ? "Integration disconnected." : "Contact synchronization completed." });
      await load();
    } catch (error) { setMessage({ tone: "error", text: error instanceof Error ? error.message : "The integration action failed." }); }
    finally { setWorking(null); }
  };

  return <div className="space-y-5">
    {message && <p className={`rounded-xl border px-4 py-3 text-xs font-mono ${message.tone === "success" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-rose-500/30 bg-rose-500/10 text-rose-300"}`}>{message.text}</p>}
    <div className="grid gap-6 xl:grid-cols-12">
      <MultiCrmCard className="space-y-4 xl:col-span-5">
        <div><div className="flex items-center gap-2"><Link2 className="h-4 w-4 text-primary-cyan" /><h2 className="text-sm font-semibold">Connect HubSpot</h2></div><p className="mt-1 text-[10px] font-mono text-crm-text-muted">Authorize a company, client-account, or personal connection.</p></div>
        <label className="block text-[10px] font-mono uppercase tracking-wider text-crm-text-muted">Ownership scope<select value={scope} onChange={(event) => setScope(event.target.value as IntegrationOwnershipType)} className="mt-2 w-full rounded-xl border border-crm-border bg-crm-inner px-3 py-2 text-xs text-crm-text outline-none"><option value="CLIENT_ACCOUNT">Client account</option><option value="COMPANY">Company</option><option value="USER">My admin user</option></select></label>
        {scope === "CLIENT_ACCOUNT" && <label className="block text-[10px] font-mono uppercase tracking-wider text-crm-text-muted">Client account<select value={clientAccountId} onChange={(event) => setClientAccountId(event.target.value)} className="mt-2 w-full rounded-xl border border-crm-border bg-crm-inner px-3 py-2 text-xs text-crm-text outline-none">{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label>}
        <button onClick={() => void connect()} disabled={working !== null || (scope === "CLIENT_ACCOUNT" && !clientAccountId)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-xs font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-40"><ShieldCheck className="h-3.5 w-3.5" />Authorize with HubSpot</button>
      </MultiCrmCard>
      <MultiCrmCard className="space-y-4 xl:col-span-7">
        <div className="flex items-center justify-between"><div><h2 className="flex items-center gap-2 text-sm font-semibold"><Building2 className="h-4 w-4 text-orange-400" />Managed connections</h2><p className="mt-1 text-[10px] font-mono text-crm-text-muted">No credential or token values are exposed here.</p></div><button onClick={() => void load()} className="rounded-lg border border-crm-border p-2 text-crm-text-muted hover:text-primary-cyan"><RefreshCw className="h-3.5 w-3.5" /></button></div>
        <div className="space-y-3">{connections.map((connection) => <MultiCrmInnerPanel key={connection.id} className="space-y-3"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold">{connection.providerAccountName || connection.provider}</p><p className="mt-1 text-[10px] font-mono text-crm-text-muted">{connection.ownershipType.replaceAll("_", " ")} · {connection.clientAccount?.name || connection.owner?.email || "Company-wide"}</p></div><MultiCrmTag variant={connection.status === "CONNECTED" ? "cyan" : "magenta"}>{connection.status}</MultiCrmTag></div>{connection.lastError && <p className="rounded-lg bg-amber-500/10 p-2 text-[10px] font-mono text-amber-300">{connection.lastError}</p>}<div className="flex flex-wrap gap-2">{connection.ownershipType === "CLIENT_ACCOUNT" && <button onClick={() => void action(connection, connection.status === "DEGRADED" ? "retry" : "sync")} disabled={working === connection.id} className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-[10px] font-mono text-cyan-300 disabled:opacity-40"><DatabaseZap className="h-3 w-3" />{connection.status === "DEGRADED" ? "Retry" : "Sync now"}</button>}<button onClick={() => void action(connection, "disconnect")} disabled={working === connection.id} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-[10px] font-mono text-rose-300 disabled:opacity-40"><Unplug className="h-3 w-3" />Disconnect</button></div></MultiCrmInnerPanel>)}{connections.length === 0 && <p className="py-8 text-center text-xs font-mono text-crm-text-muted">No integrations connected yet.</p>}</div>
      </MultiCrmCard>
    </div>
  </div>;
}
