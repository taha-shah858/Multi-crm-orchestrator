"use client";

import { useState } from "react";
import {
  Network,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Plus,
  Key,
  ExternalLink,
  ShieldCheck,
  SlidersHorizontal,
  ArrowRightLeft,
  Search,
} from "lucide-react";
import {
  ZenithCard,
  ZenithInnerPanel,
  ZenithTag,
} from "@/components/ui/ZenithCard";

const crmIntegrations = [
  {
    id: "salesforce",
    name: "Salesforce Enterprise",
    category: "Primary CRM",
    status: "Connected",
    syncMode: "Bi-Directional",
    lastSync: "2 mins ago",
    latency: "12ms",
    recordsSynced: "1,240",
    variant: "cyan" as const,
    active: true,
  },
  {
    id: "hubspot",
    name: "HubSpot Professional",
    category: "Marketing & Leads",
    status: "Connected",
    syncMode: "Bi-Directional",
    lastSync: "5 mins ago",
    latency: "18ms",
    recordsSynced: "890",
    variant: "neutral" as const,
    active: true,
  },
  {
    id: "zoho",
    name: "Zoho CRM",
    category: "Secondary CRM",
    status: "Sync Warning",
    syncMode: "Inbound Only",
    lastSync: "45 mins ago",
    latency: "142ms",
    recordsSynced: "415",
    variant: "purple" as const,
    active: false,
    warning: "Rate limit threshold reached (85%)",
  },
  {
    id: "pipedrive",
    name: "Pipedrive",
    category: "Sales Pipeline",
    status: "Connected",
    syncMode: "Outbound Only",
    lastSync: "12 mins ago",
    latency: "15ms",
    recordsSynced: "300",
    variant: "cyan" as const,
    active: true,
  },
  {
    id: "zapier",
    name: "Zapier Webhook Engine",
    category: "Automation Bridge",
    status: "Standby",
    syncMode: "Event Driven",
    lastSync: "1 hour ago",
    latency: "8ms",
    recordsSynced: "94",
    variant: "magenta" as const,
    active: true,
  },
  {
    id: "activecampaign",
    name: "ActiveCampaign",
    category: "Email Sequences",
    status: "Disconnected",
    syncMode: "Disabled",
    lastSync: "Never",
    latency: "N/A",
    recordsSynced: "0",
    variant: "neutral" as const,
    active: false,
  },
];

export default function IntegrationsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("all");

  const filteredIntegrations = crmIntegrations.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase());
    if (filter === "active") return matchesSearch && item.active;
    if (filter === "warning") return matchesSearch && item.warning;
    return matchesSearch;
  });

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Network className="w-5 h-5 text-primary-cyan" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-100">
              Integrations Hub
            </h1>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Manage multi-CRM API bridges, credentials, and real-time syncing
            protocols.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button className="px-4 py-2 rounded-xl bg-zenith-surface border border-primary-cyan/30 text-xs font-mono text-slate-300 hover:text-white hover:border-primary-cyan/60 transition-all flex items-center gap-2 shadow-inner">
            <Key className="w-3.5 h-3.5 text-primary-cyan" />
            API Keys Vault
          </button>
          <button className="btn-zenith-primary px-4 py-2 rounded-xl text-xs flex items-center gap-2">
            <Plus className="w-3.5 h-3.5" />
            Connect New CRM
          </button>
        </div>
      </div>

      {/* Control Toolbar: Search & Filter Tabs */}
      <ZenithCard className="flex flex-col sm:flex-row items-center justify-between gap-4 p-3">
        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search providers or categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zenith-inner border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-primary-cyan/50 font-mono transition-all shadow-inner"
          />
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {[
            { label: "All Connectors", key: "all" },
            { label: "Active Bridges", key: "active" },
            { label: "Warnings", key: "warning" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-mono transition-all whitespace-nowrap ${
                filter === tab.key
                  ? "bg-primary-cyan/20 text-primary-cyan border border-primary-cyan/30 shadow-[0_0_15px_rgba(0,242,255,0.15)]"
                  : "text-slate-400 hover:text-slate-200 hover:bg-zenith-inner"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </ZenithCard>

      {/* Grid of CRM Connector Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredIntegrations.map((crm) => (
          <ZenithCard
            key={crm.id}
            className="space-y-5 flex flex-col justify-between hover:border-primary-cyan/40 transition-all group"
          >
            <div>
              {/* Card Header */}
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <span className="text-[10px] font-mono tracking-wider text-slate-400 uppercase">
                    {crm.category}
                  </span>
                  <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                    {crm.name}
                  </h3>
                </div>

                {/* Status Badge */}
                <div className="flex items-center gap-1.5">
                  {crm.warning ? (
                    <span className="p-1 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1 text-[10px] font-mono px-2 shadow-inner">
                      <AlertTriangle className="w-3 h-3" />
                      Warning
                    </span>
                  ) : crm.active ? (
                    <span className="p-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 text-[10px] font-mono px-2 shadow-inner">
                      <CheckCircle2 className="w-3 h-3" />
                      Synced
                    </span>
                  ) : (
                    <span className="p-1 rounded-md bg-zenith-surface text-slate-400 border border-slate-800 flex items-center gap-1 text-[10px] font-mono px-2 shadow-inner">
                      Offline
                    </span>
                  )}
                </div>
              </div>

              {/* Warning Banner if present */}
              {crm.warning && (
                <div className="mt-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 font-mono flex items-center gap-2 shadow-inner">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{crm.warning}</span>
                </div>
              )}

              {/* Core Metrics */}
              <div className="mt-5 grid grid-cols-2 gap-3 text-xs font-mono">
                <ZenithInnerPanel className="py-3">
                  <span className="text-[10px] text-slate-500 block">
                    SYNC MODE
                  </span>
                  <span className="text-slate-200 mt-0.5 flex items-center gap-1.5 font-medium">
                    <ArrowRightLeft className="w-3 h-3 text-primary-cyan" />
                    {crm.syncMode}
                  </span>
                </ZenithInnerPanel>

                <ZenithInnerPanel className="py-3">
                  <span className="text-[10px] text-slate-500 block">
                    RECORDS
                  </span>
                  <span className="text-slate-200 mt-0.5 font-medium">
                    {crm.recordsSynced} synced
                  </span>
                </ZenithInnerPanel>
              </div>
            </div>

            {/* Footer Actions & Diagnostics */}
            <div className="pt-4 border-t border-primary-cyan/15 flex items-center justify-between text-xs font-mono text-slate-400">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                <span>{crm.latency}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  title="Configure Mapping Rules"
                  className="p-2 rounded-lg bg-zenith-inner hover:bg-slate-800 hover:text-slate-100 transition-all border border-slate-800 shadow-inner cursor-pointer"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                </button>
                <button
                  title="Trigger Manual Sync"
                  className="p-2 rounded-lg bg-zenith-inner hover:bg-slate-800 hover:text-slate-100 transition-all border border-slate-800 shadow-inner cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
                <button
                  title="Open Portal"
                  className="p-2 rounded-lg bg-zenith-inner hover:bg-slate-800 hover:text-primary-cyan transition-all border border-slate-800 shadow-inner cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </ZenithCard>
        ))}
      </div>

      {/* Bottom Health Monitor Footer Banner */}
      <ZenithCard className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shadow-inner">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-slate-200">
              Bi-Directional Deduplication Guarantee
            </h4>
            <p className="text-[11px] text-slate-400 font-mono">
              All multi-CRM updates pass through our collision resolution engine
              to prevent data overwrites.
            </p>
          </div>
        </div>

        <button className="px-4 py-2 rounded-xl bg-zenith-inner hover:bg-slate-800 border border-slate-800 text-xs font-mono text-slate-200 transition-all shrink-0 shadow-inner cursor-pointer">
          View Sync Audit Log
        </button>
      </ZenithCard>
    </div>
  );
}
