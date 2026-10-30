"use client";

import { useCallback, useEffect, useState } from "react";
import { Building2, DatabaseZap, Link2, RefreshCw, ShieldCheck, Trash2, Unplug } from "lucide-react";
import { readApiJson } from "@/lib/http/client-api";
import { isSyncableConnectionStatus } from "@/lib/integrations/connection-resolution";
import type { IntegrationConnectionSummary, IntegrationOwnershipType } from "@/lib/models/canonical";
import { MultiCrmCard, MultiCrmInnerPanel, MultiCrmTag } from "@/components/ui/MultiCrmCard";

export function AdminIntegrationManager({ clients }: { clients: Array<{ id: string; name: string }> }) {
  const [connections, setConnections] = useState<IntegrationConnectionSummary[]>([]);
  const [targetProvider, setTargetProvider] = useState<"HUBSPOT" | "ZOHO">("HUBSPOT");
  const [zohoDc, setZohoDc] = useState<string>("https://accounts.zoho.com");
  const [scope, setScope] = useState<IntegrationOwnershipType>("CLIENT_ACCOUNT");
  const [clientAccountId, setClientAccountId] = useState(clients[0]?.id ?? "");
  const [working, setWorking] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/integrations", { cache: "no-store" });
      const data = await readApiJson<{ success: true; connections: IntegrationConnectionSummary[] }>(response);
      setConnections(data.connections);
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Connections could not be loaded." });
    }
  }, []);

  useEffect(() => { queueMicrotask(() => void load()); }, [load]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.has("integration")) return;
    const connected = params.get("integration") === "connected";
    const review = params.get("integration") === "review";
    const providerName = params.get("provider") === "zoho" ? "Zoho CRM" : "HubSpot";
    queueMicrotask(() => {
      setMessage({
        tone: connected || review ? "success" : "error",
        text: review ? "Zoho organization verified. Review and approve it under Client Zoho authorization below. No connection has changed yet." : connected
          ? `${providerName} connected successfully.`
          : params.get("message") || `${providerName} authorization did not complete.`,
      });
      window.history.replaceState({}, "", window.location.pathname);
      void load();
    });
  }, [load]);

  const connect = async () => {
    setWorking("connect");
    setMessage(null);
    try {
      if (targetProvider === "ZOHO") {
        const response = await fetch("/api/integrations/zoho/connect", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ clientAccountId, accountsUrl: zohoDc }),
        });
        const data = await readApiJson<{ success: true; authorizationUrl: string }>(response);
        window.location.assign(data.authorizationUrl);
      } else {
        const response = await fetch("/api/integrations/hubspot/connect", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            ownershipType: scope,
            clientAccountId: scope === "CLIENT_ACCOUNT" ? clientAccountId : undefined,
          }),
        });
        const data = await readApiJson<{ success: true; authorizationUrl: string }>(response);
        window.location.assign(data.authorizationUrl);
      }
    } catch (error) {
      setMessage({
        tone: "error",
        text: error instanceof Error ? error.message : `${targetProvider === "ZOHO" ? "Zoho CRM" : "HubSpot"} authorization could not be started.`,
      });
      setWorking(null);
    }
  };

  const action = async (connection: IntegrationConnectionSummary, operation: "sync" | "retry" | "disconnect" | "remove") => {
    setWorking(connection.id);
    setMessage(null);
    try {
      const response = await fetch(
        operation === "disconnect" ? `/api/integrations/${connection.id}` : `/api/integrations/${connection.id}/${operation}`,
        {
          method: operation === "disconnect" ? "DELETE" : "POST",
          ...(operation === "remove" ? { headers: { "content-type": "application/json" }, body: JSON.stringify({ confirmedConnectionId: connection.id }) } : {}),
        },
      );
      await readApiJson(response);
      setMessage({
        tone: "success",
        text: operation === "remove" ? "Connection removed. Imported records and mapping history were kept." : operation === "disconnect" ? "Integration disconnected." : "CRM synchronization completed.",
      });
      setRemoving(null);
      await load();
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "The integration action failed." });
    } finally {
      setWorking(null);
    }
  };

  return (
    <div className="space-y-5">
      {message && (
        <p
          className={`rounded-xl border px-4 py-3 text-xs font-sans font-medium ${
            message.tone === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </p>
      )}

      <div className="grid gap-6 xl:grid-cols-12">
        <MultiCrmCard className="space-y-4 xl:col-span-5 bg-white border border-slate-200 shadow-xs rounded-xl p-6">
          <div>
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-900 font-sans">
                {targetProvider === "ZOHO" ? "Connect Zoho CRM (Client CRM)" : "Connect HubSpot (Agency CRM)"}
              </h2>
            </div>
            <p className="mt-1 text-xs font-normal text-slate-500 font-sans leading-relaxed">
              {targetProvider === "ZOHO"
                ? "Authorize downstream client operations and deal handoffs for the selected client account."
                : "Authorize company-wide sales CRM, unified leads, deals, and pipelines."}
            </p>
          </div>

          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 font-sans">
            Target CRM Provider
            <select
              value={targetProvider}
              onChange={(e) => {
                const val = e.target.value as "HUBSPOT" | "ZOHO";
                setTargetProvider(val);
                if (val === "ZOHO") setScope("CLIENT_ACCOUNT");
              }}
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-sans text-slate-900 shadow-2xs focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none"
            >
              <option value="HUBSPOT">HubSpot — Agency Sales CRM</option>
              <option value="ZOHO">Zoho CRM — Client Operations CRM</option>
            </select>
          </label>

          {targetProvider === "HUBSPOT" && (
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 font-sans">
              Ownership scope
              <select
                value={scope}
                onChange={(event) => setScope(event.target.value as IntegrationOwnershipType)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-sans text-slate-900 shadow-2xs focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none"
              >
                <option value="CLIENT_ACCOUNT">Client account</option>
                <option value="COMPANY">Company</option>
                <option value="USER">My admin user</option>
              </select>
            </label>
          )}

          {(targetProvider === "ZOHO" || scope === "CLIENT_ACCOUNT") && (
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 font-sans">
              Client account
              <select
                value={clientAccountId}
                onChange={(event) => setClientAccountId(event.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-sans text-slate-900 shadow-2xs focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none"
              >
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          {targetProvider === "ZOHO" && (
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 font-sans">
              Zoho Data Center / Region
              <select
                value={zohoDc}
                onChange={(e) => setZohoDc(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-sans text-slate-900 shadow-2xs focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none"
              >
                <option value="https://accounts.zoho.com">United States & Global (.com)</option>
                <option value="https://accounts.zoho.in">India (.in)</option>
                <option value="https://accounts.zoho.eu">Europe (.eu)</option>
                <option value="https://accounts.zoho.com.au">Australia (.com.au)</option>
                <option value="https://accounts.zoho.jp">Japan (.jp)</option>
                <option value="https://accounts.zohocloud.ca">Canada (.ca)</option>
              </select>
            </label>
          )}

          <button
            onClick={() => void connect()}
            disabled={working !== null || ((targetProvider === "ZOHO" || scope === "CLIENT_ACCOUNT") && !clientAccountId)}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-medium text-white hover:bg-blue-700 shadow-xs transition-colors disabled:opacity-40 cursor-pointer"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            {targetProvider === "ZOHO" ? "Authorize with Zoho CRM" : "Authorize with HubSpot"}
          </button>
        </MultiCrmCard>

        <MultiCrmCard className="space-y-4 xl:col-span-7 bg-white border border-slate-200 shadow-xs rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900 font-sans">
                <Building2 className="h-4 w-4 text-blue-600" />
                Managed Connections
              </h2>
              <p className="mt-1 text-xs font-normal text-slate-500 font-sans leading-relaxed">
                Agency CRM (HubSpot) and Client CRM Providers (Zoho). Secrets remain encrypted server-side.
              </p>
            </div>
            <button
              onClick={() => void load()}
              className="rounded-lg border border-slate-300 p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {connections.map((connection) => {
              const isAgencyCrm = connection.provider === "HUBSPOT";
              const isClientCrm = connection.provider === "ZOHO";
              return (
                <MultiCrmInnerPanel key={connection.id} className="space-y-3 bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-slate-900 font-sans">
                          {connection.providerAccountName || connection.provider}
                        </p>
                        <span
                          className={`text-[10px] font-sans font-semibold px-2 py-0.5 rounded-md border ${
                            isAgencyCrm
                              ? "bg-amber-50 text-amber-800 border-amber-200"
                              : isClientCrm
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : "bg-blue-50 text-blue-700 border-blue-200"
                          }`}
                        >
                          {isAgencyCrm ? "AGENCY CRM" : isClientCrm ? "CLIENT CRM (ZOHO)" : connection.provider}
                        </span>
                      </div>
                      <p className="mt-1 text-xs font-normal text-slate-600 font-sans">
                        {connection.ownershipType.replaceAll("_", " ")} · {connection.clientAccount?.name || connection.owner?.email || "Company-wide"}
                      </p>
                    </div>
                    <MultiCrmTag variant={connection.status === "CONNECTED" ? "cyan" : "magenta"}>
                      {connection.status}
                    </MultiCrmTag>
                  </div>

                  {connection.lastError && (
                    <p className="rounded-lg bg-amber-50 border border-amber-200 p-2 text-xs font-sans text-amber-800">
                      {connection.lastError}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {connection.ownershipType === "CLIENT_ACCOUNT" && isSyncableConnectionStatus(connection.status) && connection.permissions.canSync && (
                      <button
                        onClick={() => void action(connection, connection.status === "DEGRADED" ? "retry" : "sync")}
                        disabled={working === connection.id}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors disabled:opacity-40 cursor-pointer"
                      >
                        <DatabaseZap className="h-3 w-3" />
                        {connection.status === "DEGRADED" ? "Retry" : "Sync now"}
                      </button>
                    )}
                    {connection.status !== "DISCONNECTED" && connection.permissions.canDisconnect && <button
                      onClick={() => void action(connection, "disconnect")}
                      disabled={working === connection.id}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 transition-colors disabled:opacity-40 cursor-pointer"
                    >
                      <Unplug className="h-3 w-3" />
                      Disconnect
                    </button>}
                    {(isAgencyCrm || isClientCrm) && connection.permissions.canManage && (
                      <button
                        onClick={() => setRemoving(connection.id)}
                        disabled={working !== null}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-40"
                      >
                        <Trash2 className="h-3 w-3" />
                        Remove connection
                      </button>
                    )}
                  </div>
                  {removing === connection.id && (
                    <div className="space-y-3 rounded-lg border border-red-200 bg-white p-3" role="group" aria-label="Confirm connection removal">
                      <p className="text-xs text-slate-700">
                        Remove {connection.providerAccountName || connection.provider} from {connection.clientAccount?.name || connection.owner?.name || "the agency"}?
                        {" "}This stops access through this connection, deletes its stored credentials, and removes it from this list. Imported records and mapping history stay in the app. The account in Zoho or HubSpot is not deleted.
                        {isClientCrm && " Existing records will still prevent switching this client to a different or unverified Zoho organization. Use a new client account for a different organization."}
                        {isAgencyCrm && connection.ownershipType === "COMPANY" && " Agency HubSpot synchronization will stop until you reconnect."}
                      </p>
                      <div className="flex gap-2">
                        <button onClick={() => void action(connection, "remove")} disabled={working !== null} className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40">Confirm removal</button>
                        <button onClick={() => setRemoving(null)} disabled={working !== null} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700">Cancel</button>
                      </div>
                    </div>
                  )}
                </MultiCrmInnerPanel>
              );
            })}
            {connections.length === 0 && (
              <p className="py-8 text-center text-xs font-sans text-slate-500">
                No integrations connected yet.
              </p>
            )}
          </div>
        </MultiCrmCard>
      </div>
    </div>
  );
}
