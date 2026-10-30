"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUpRight, Building2, DatabaseZap, LockKeyhole, RefreshCw, Briefcase } from "lucide-react";
import { useClientAccount } from "@/context/ClientAccountContext";
import { readApiJson } from "@/lib/http/client-api";
import type { IntegrationConnectionSummary } from "@/lib/models/canonical";
import { MultiCrmCard, MultiCrmTag } from "@/components/ui/MultiCrmCard";

interface IntegrationPayload {
  success: true;
  connections: IntegrationConnectionSummary[];
  permissions: { canConnectCompany: boolean; canConnectClient: boolean; canConnectUser: boolean };
}

const statusTone = (status: IntegrationConnectionSummary["status"]) =>
  status === "CONNECTED"
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : status === "DEGRADED"
    ? "bg-amber-50 text-amber-700 border-amber-200"
    : "bg-red-50 text-red-700 border-red-200";

const formatDate = (value: string | null) => (value ? new Date(value).toLocaleString() : "Not yet");

export default function IntegrationsAppCenter() {
  const { activeClientAccount, isClientAccountReady } = useClientAccount();
  const [connections, setConnections] = useState<IntegrationConnectionSummary[]>([]);
  const [canConnectCompany, setCanConnectCompany] = useState(false);
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
      setCanConnectCompany(data.permissions.canConnectCompany);
    } catch (error) {
      if (version === requestVersion.current)
        setMessage({
          tone: "error",
          text: error instanceof Error ? error.message : "Integrations could not be loaded.",
        });
    } finally {
      if (version === requestVersion.current) setIsLoading(false);
    }
  }, [activeClientAccount.id, isClientAccountReady]);

  useEffect(() => {
    queueMicrotask(() => void loadConnections());
  }, [loadConnections]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const state = params.get("integration");
    if (!state) return;
    const provider = params.get("provider") === "zoho" ? "Zoho CRM" : "HubSpot";
    const text =
      state === "review" ? "Zoho organization verified and submitted for agency approval. Your administrator must confirm the organization before the connection changes." : state === "connected"
        ? `${provider} connected successfully.`
        : state === "denied"
        ? `${provider} authorization was cancelled.`
        : params.get("message") || `${provider} could not be connected.`;
    queueMicrotask(() => {
      setMessage({ tone: state === "connected" ? "success" : state === "denied" || state === "review" ? "info" : "error", text });
      window.history.replaceState({}, "", window.location.pathname);
    });
  }, []);

  const connectHubSpot = async () => {
    setWorkingId("connect-hubspot");
    setMessage(null);
    try {
      const response = await fetch("/api/integrations/hubspot/connect", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ownershipType: "COMPANY" }),
      });
      const data = await readApiJson<{ success: true; authorizationUrl: string }>(response);
      window.location.assign(data.authorizationUrl);
    } catch (error) {
      setMessage({
        tone: "error",
        text: error instanceof Error ? error.message : "HubSpot authorization could not be started.",
      });
      setWorkingId(null);
    }
  };

  const runSync = async (connection: IntegrationConnectionSummary, retry = false) => {
    setWorkingId(connection.id);
    setMessage(null);
    try {
      const response = await fetch(`/api/integrations/${connection.id}/${retry ? "retry" : "sync"}`, {
        method: "POST",
      });
      const data = await readApiJson<{
        success: true;
        sync: { recordsRead: number; recordsCreated: number; recordsUpdated: number };
      }>(response);
      setMessage({
        tone: "success",
        text: `Sync complete: ${data.sync.recordsRead} read, ${data.sync.recordsCreated} created, ${data.sync.recordsUpdated} updated.`,
      });
      await loadConnections();
    } catch (error) {
      setMessage({
        tone: "error",
        text: error instanceof Error ? error.message : "The integration could not be synchronized.",
      });
      await loadConnections();
    } finally {
      setWorkingId(null);
    }
  };

  const clientConnections = connections.filter(
    (item) => item.ownershipType === "CLIENT_ACCOUNT" && item.clientAccountId === activeClientAccount.id,
  );
  // The agency connection is stable across client switches and excludes personal accounts.
  const hubSpot = connections.find((item) => item.provider === "HUBSPOT" && item.ownershipType === "COMPANY");

  // Zoho is the Client CRM (scoped to the active client account)
  const zoho = clientConnections.find((item) => item.provider === "ZOHO");

  return (
    <div className="space-y-6 text-slate-900 font-sans">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <MultiCrmTag variant="cyan">INTEGRATION HUB</MultiCrmTag>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{activeClientAccount.name}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Integration Hub</h1>
          <p className="mt-1 max-w-2xl text-sm font-normal text-slate-600">
            Agency CRM (HubSpot sales source of truth) and Client CRM Providers (Zoho downstream handoffs).
          </p>
        </div>
        <button
          onClick={() => void loadConnections()}
          disabled={isLoading}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh status
        </button>
      </div>

      {message && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm font-medium ${
            message.tone === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : message.tone === "info"
              ? "border-blue-200 bg-blue-50 text-blue-800"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* CRM Architectures: Agency CRM vs Client CRM */}
      <div className="grid gap-6 xl:grid-cols-12">
        {/* Agency CRM: HubSpot */}
        <MultiCrmCard className="space-y-5 xl:col-span-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-orange-600 block mb-1">
                AGENCY CRM (SOURCE OF TRUTH)
              </span>
              <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
                <Building2 className="h-4 w-4 text-orange-500" />
                HubSpot Sales CRM
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Agency leads, deals, pipelines, activities, and unified sales data.
              </p>
            </div>
            {hubSpot && (
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${statusTone(hubSpot.status)}`}>
                ● {hubSpot.status.replaceAll("_", " ")}
              </span>
            )}
          </div>

          {hubSpot ? (
            <div className="bg-slate-50/70 border border-slate-200 rounded-lg p-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <Metric
                  label="Connected account"
                  value={hubSpot.providerAccountName || hubSpot.providerAccountId || "HubSpot account"}
                />
                <Metric label="Connected" value={formatDate(hubSpot.connectedAt)} />
                <Metric label="Last sales sync" value={formatDate(hubSpot.lastSyncAt)} />
              </div>
              {hubSpot.lastError && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 font-medium">
                  {hubSpot.lastError}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => void runSync(hubSpot)}
                  disabled={workingId === hubSpot.id || !hubSpot.permissions.canSync}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2 text-sm font-medium text-white shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <DatabaseZap className="h-4 w-4" />
                  Sync agency leads
                </button>
                {(hubSpot.status === "DEGRADED" || hubSpot.status === "ERROR") && (
                  <button
                    onClick={() => void runSync(hubSpot, true)}
                    disabled={workingId === hubSpot.id || !hubSpot.permissions.canRetry}
                    className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 px-3.5 py-2 text-xs font-medium text-amber-800 shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Retry failed sync
                  </button>
                )}
                {canConnectCompany && (
                  <button
                    onClick={() => void connectHubSpot()}
                    disabled={workingId !== null}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 px-3.5 py-2 text-xs font-medium text-slate-700 shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <ArrowUpRight className="h-3.5 w-3.5" />
                    Reconnect OAuth
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-slate-50/70 border border-slate-200 rounded-lg p-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-crm-text">No HubSpot account connected</p>
                <p className="mt-1 text-[11px] font-sans text-crm-text-muted">
                  An Admin or Manager must connect the agency HubSpot CRM to populate unified leads and sales pipeline.
                </p>
              </div>
              <button
                onClick={() => void connectHubSpot()}
                disabled={!canConnectCompany || workingId !== null}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
              >
                <LockKeyhole className="h-4 w-4" />
                Connect HubSpot
              </button>
            </div>
          )}
        </MultiCrmCard>

        {/* Client CRM Provider: Zoho CRM */}
        <MultiCrmCard className="space-y-5 xl:col-span-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 block mb-1">
                CLIENT CRM PROVIDER (DOWNSTREAM HANDOFF)
              </span>
              <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
                <Briefcase className="h-4 w-4 text-emerald-600" />
                Zoho CRM
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Configured per client account ({activeClientAccount.name}) for closed deal operations.
              </p>
            </div>
            {zoho ? (
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${statusTone(zoho.status)}`}>
                ● {zoho.status.replaceAll("_", " ")}
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold border border-slate-200 bg-slate-100 text-slate-600">
                ● NOT CONFIGURED
              </span>
            )}
          </div>

          {zoho ? (
            <div className="bg-slate-50/70 border border-slate-200 rounded-lg p-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <Metric
                  label="Client Connection"
                  value={zoho.providerAccountName || zoho.providerAccountId || "Zoho Account"}
                />
                <Metric label="Connected" value={formatDate(zoho.connectedAt)} />
                <Metric label="Last sync" value={formatDate(zoho.lastSyncAt)} />
              </div>
              {zoho.lastError && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 font-medium">
                  {zoho.lastError}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => void runSync(zoho)}
                  disabled={workingId === zoho.id || !zoho.permissions.canSync}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2 text-sm font-medium text-white shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <DatabaseZap className="h-4 w-4" />
                  Sync Zoho CRM
                </button>
                {(zoho.status === "DEGRADED" || zoho.status === "ERROR") && (
                  <button
                    onClick={() => void runSync(zoho, true)}
                    disabled={workingId === zoho.id || !zoho.permissions.canRetry}
                    className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 px-3.5 py-2 text-xs font-medium text-amber-800 shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Retry sync
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-slate-50/70 border border-slate-200 rounded-lg p-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">No Zoho CRM connected for this client</p>
                <p className="mt-1 text-xs text-slate-500">
                  An Administrator configures Zoho CRM in Admin Settings to enable deal handoffs for this client.
                </p>
              </div>
              <span className="text-xs font-medium text-slate-600 px-3 py-1.5 rounded-lg border border-slate-200 bg-white">
                Admin Configured
              </span>
            </div>
          )}
        </MultiCrmCard>
      </div>

    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 truncate text-xs font-medium text-slate-900" title={value}>
        {value}
      </p>
    </div>
  );
}
