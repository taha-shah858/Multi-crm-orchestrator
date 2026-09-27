"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUpRight, Building2, CheckCircle2, Clock3, DatabaseZap, LockKeyhole, RefreshCw, ShieldCheck, Unplug, Briefcase } from "lucide-react";
import { useClientAccount } from "@/context/ClientAccountContext";
import { readApiJson } from "@/lib/http/client-api";
import type { IntegrationConnectionSummary } from "@/lib/models/canonical";
import { MultiCrmCard, MultiCrmInnerPanel, MultiCrmTag } from "@/components/ui/MultiCrmCard";

interface IntegrationPayload {
  success: true;
  connections: IntegrationConnectionSummary[];
  permissions: { canConnectCompany: boolean; canConnectClient: boolean; canConnectUser: boolean };
}

const statusTone = (status: IntegrationConnectionSummary["status"]) =>
  status === "CONNECTED" ? "text-emerald-400" : status === "DEGRADED" ? "text-amber-400" : "text-rose-400";
const formatDate = (value: string | null) => (value ? new Date(value).toLocaleString() : "Not yet");

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
      state === "connected"
        ? `${provider} connected successfully.`
        : state === "denied"
        ? `${provider} authorization was cancelled.`
        : params.get("message") || `${provider} could not be connected.`;
    queueMicrotask(() => {
      setMessage({ tone: state === "connected" ? "success" : state === "denied" ? "info" : "error", text });
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
        body: JSON.stringify({ ownershipType: "CLIENT_ACCOUNT" }),
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
  // HubSpot is the Agency CRM (company-wide or client-linked)
  const hubSpot =
    connections.find((item) => item.provider === "HUBSPOT" && item.clientAccountId === activeClientAccount.id) ||
    connections.find((item) => item.provider === "HUBSPOT");

  // Zoho is the Client CRM (scoped to the active client account)
  const zoho = clientConnections.find((item) => item.provider === "ZOHO");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <MultiCrmTag variant="cyan">INTEGRATION HUB</MultiCrmTag>
            <span className="text-[10px] font-mono text-crm-text-muted">{activeClientAccount.name}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-crm-text">Integration Hub</h1>
          <p className="mt-1 max-w-2xl text-xs font-mono text-crm-text-muted">
            Agency CRM (HubSpot sales source of truth) and Client CRM Providers (Zoho downstream handoffs).
          </p>
        </div>
        <button
          onClick={() => void loadConnections()}
          disabled={isLoading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-crm-border bg-crm-inner px-4 py-2 text-xs font-mono text-crm-text-muted transition hover:text-primary-cyan disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          Refresh status
        </button>
      </div>

      {message && (
        <div
          className={`rounded-xl border px-4 py-3 text-xs font-mono ${
            message.tone === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : message.tone === "info"
              ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-300"
              : "border-rose-500/30 bg-rose-500/10 text-rose-300"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* CRM Architectures Distinction: Agency CRM vs Client CRM */}
      <div className="grid gap-6 xl:grid-cols-12">
        {/* Agency CRM: HubSpot */}
        <MultiCrmCard className="space-y-5 xl:col-span-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="text-[9px] font-mono uppercase tracking-wider text-orange-400 font-bold block mb-1">
                AGENCY CRM (SOURCE OF TRUTH)
              </span>
              <h2 className="flex items-center gap-2 text-sm font-semibold text-crm-text">
                <Building2 className="h-4 w-4 text-orange-400" />
                HubSpot Sales CRM
              </h2>
              <p className="mt-1 text-[11px] font-mono text-crm-text-muted">
                Agency leads, deals, pipelines, activities, and unified sales data.
              </p>
            </div>
            {hubSpot && (
              <span className={`text-[10px] font-mono ${statusTone(hubSpot.status)}`}>
                ● {hubSpot.status.replaceAll("_", " ")}
              </span>
            )}
          </div>

          {hubSpot ? (
            <MultiCrmInnerPanel className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <Metric
                  label="Connected account"
                  value={hubSpot.providerAccountName || hubSpot.providerAccountId || "HubSpot account"}
                />
                <Metric label="Connected" value={formatDate(hubSpot.connectedAt)} />
                <Metric label="Last sales sync" value={formatDate(hubSpot.lastSyncAt)} />
              </div>
              {hubSpot.lastError && (
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-[11px] font-mono text-amber-300">
                  {hubSpot.lastError}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => void runSync(hubSpot)}
                  disabled={workingId === hubSpot.id || !hubSpot.permissions.canSync}
                  className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-xs font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-50 cursor-pointer"
                >
                  <DatabaseZap className="h-3.5 w-3.5" />
                  Sync agency leads
                </button>
                {(hubSpot.status === "DEGRADED" || hubSpot.status === "ERROR") && (
                  <button
                    onClick={() => void runSync(hubSpot, true)}
                    disabled={workingId === hubSpot.id || !hubSpot.permissions.canRetry}
                    className="inline-flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs font-mono text-amber-300 disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Retry failed sync
                  </button>
                )}
                {canConnectClient && (
                  <button
                    onClick={() => void connectHubSpot()}
                    disabled={workingId !== null}
                    className="inline-flex items-center gap-2 rounded-xl border border-crm-border bg-crm-inner px-4 py-2 text-xs font-mono text-crm-text-muted hover:text-primary-cyan disabled:opacity-50 cursor-pointer"
                  >
                    <ArrowUpRight className="h-3.5 w-3.5" />
                    Reconnect OAuth
                  </button>
                )}
              </div>
            </MultiCrmInnerPanel>
          ) : (
            <MultiCrmInnerPanel className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-crm-text">No HubSpot account connected</p>
                <p className="mt-1 text-[11px] font-mono text-crm-text-muted">
                  Connect the agency HubSpot CRM to populate unified leads and sales pipeline.
                </p>
              </div>
              <button
                onClick={() => void connectHubSpot()}
                disabled={!canConnectClient || workingId !== null}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
              >
                <LockKeyhole className="h-3.5 w-3.5" />
                Connect HubSpot
              </button>
            </MultiCrmInnerPanel>
          )}
        </MultiCrmCard>

        {/* Client CRM Provider: Zoho CRM */}
        <MultiCrmCard className="space-y-5 xl:col-span-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="text-[9px] font-mono uppercase tracking-wider text-emerald-400 font-bold block mb-1">
                CLIENT CRM PROVIDER (DOWNSTREAM HANDOFF)
              </span>
              <h2 className="flex items-center gap-2 text-sm font-semibold text-crm-text">
                <Briefcase className="h-4 w-4 text-emerald-400" />
                Zoho CRM
              </h2>
              <p className="mt-1 text-[11px] font-mono text-crm-text-muted">
                Configured per client account ({activeClientAccount.name}) for closed deal operations.
              </p>
            </div>
            {zoho ? (
              <span className={`text-[10px] font-mono ${statusTone(zoho.status)}`}>
                ● {zoho.status.replaceAll("_", " ")}
              </span>
            ) : (
              <span className="text-[10px] font-mono text-crm-text-muted">● NOT CONFIGURED</span>
            )}
          </div>

          {zoho ? (
            <MultiCrmInnerPanel className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <Metric
                  label="Client Connection"
                  value={zoho.providerAccountName || zoho.providerAccountId || "Zoho Account"}
                />
                <Metric label="Connected" value={formatDate(zoho.connectedAt)} />
                <Metric label="Last sync" value={formatDate(zoho.lastSyncAt)} />
              </div>
              {zoho.lastError && (
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-[11px] font-mono text-amber-300">
                  {zoho.lastError}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => void runSync(zoho)}
                  disabled={workingId === zoho.id || !zoho.permissions.canSync}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-50 cursor-pointer"
                >
                  <DatabaseZap className="h-3.5 w-3.5" />
                  Sync Zoho CRM
                </button>
                {(zoho.status === "DEGRADED" || zoho.status === "ERROR") && (
                  <button
                    onClick={() => void runSync(zoho, true)}
                    disabled={workingId === zoho.id || !zoho.permissions.canRetry}
                    className="inline-flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs font-mono text-amber-300 disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Retry sync
                  </button>
                )}
              </div>
            </MultiCrmInnerPanel>
          ) : (
            <MultiCrmInnerPanel className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-crm-text">No Zoho CRM connected for this client</p>
                <p className="mt-1 text-[11px] font-mono text-crm-text-muted">
                  An Administrator configures Zoho CRM in Admin Settings to enable deal handoffs for this client.
                </p>
              </div>
              <span className="text-[11px] font-mono text-crm-text-muted px-3 py-1.5 rounded-lg border border-crm-border bg-crm-card">
                Admin Configured
              </span>
            </MultiCrmInnerPanel>
          )}
        </MultiCrmCard>
      </div>

      {/* Security and Other Providers */}
      <div className="grid gap-6 xl:grid-cols-12">
        <MultiCrmCard className="space-y-4 xl:col-span-8">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-crm-text">Architecture & Security Guarantees</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 text-[11px] font-mono text-crm-text-muted">
            <SecurityLine text="HubSpot is the Agency CRM and sole source of truth for Unified Leads" />
            <SecurityLine text="Client selection NEVER alters the Unified Lead Directory" />
            <SecurityLine text="Zoho CRM credentials are encrypted server-side per client account" />
            <SecurityLine text="Agents inherit access automatically without performing Zoho OAuth" />
            <SecurityLine text="Closed deals trigger idempotent handoffs without duplicating records" />
            <SecurityLine text="Downstream client CRM errors never reverse agency sales status" />
          </div>
        </MultiCrmCard>

        <MultiCrmCard className="space-y-3 xl:col-span-4">
          <h2 className="text-sm font-semibold text-crm-text">Future Operational Integrations</h2>
          <div className="space-y-2">
            <FutureCard name="Twilio (Client Voice / SMS)" />
            <FutureCard name="Calendar (Client Scheduling)" />
          </div>
        </MultiCrmCard>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[9px] font-mono uppercase tracking-wider text-crm-text-muted">{label}</p>
      <p className="mt-1 truncate text-xs text-crm-text" title={value}>
        {value}
      </p>
    </div>
  );
}

function SecurityLine({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2">
      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
      <span>{text}</span>
    </div>
  );
}

function FutureCard({ name }: { name: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-crm-border/70 bg-crm-card/50 px-4 py-3">
      <div className="flex items-center gap-2">
        <Unplug className="h-3.5 w-3.5 text-crm-text-muted" />
        <span className="text-xs text-crm-text-muted">{name}</span>
      </div>
      <span className="flex items-center gap-1 text-[9px] font-mono text-crm-text-muted">
        <Clock3 className="h-3 w-3" />
        STAGE 3
      </span>
    </div>
  );
}
