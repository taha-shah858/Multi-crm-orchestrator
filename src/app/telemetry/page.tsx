"use client";

import { useState } from "react";
import {
  Activity,
  Terminal,
  Search,
  Filter,
  Download,
  RefreshCw,
  Server,
  Database,
  Cpu,
} from "lucide-react";
import {
  ZenithCard,
  ZenithInnerPanel,
  ZenithTag,
} from "@/components/ui/ZenithCard";

const systemHealth = [
  {
    name: "Salesforce Webhook Sync",
    status: "Optimal",
    latency: "12ms",
    uptime: "99.98%",
    icon: Server,
    variant: "cyan" as const,
  },
  {
    name: "HubSpot Event Stream",
    status: "Optimal",
    latency: "18ms",
    uptime: "99.95%",
    icon: Database,
    variant: "cyan" as const,
  },
  {
    name: "Twilio Voice Pipeline",
    status: "Optimal",
    latency: "24ms",
    uptime: "99.99%",
    icon: Cpu,
    variant: "cyan" as const,
  },
  {
    name: "Zoho API Connector",
    status: "Degraded",
    latency: "142ms",
    uptime: "98.40%",
    icon: Server,
    variant: "purple" as const,
  },
];

const logsData = [
  {
    id: "LOG-8831",
    timestamp: "2026-07-21 09:51:12",
    level: "INFO",
    variant: "cyan" as const,
    service: "Salesforce-Sync Engine",
    message:
      "Bi-directional sync payload dispatched successfully for contact ID LD-9021.",
    ip: "192.168.1.104",
  },
  {
    id: "LOG-8830",
    timestamp: "2026-07-21 09:48:05",
    level: "WARN",
    variant: "purple" as const,
    service: "Zoho-REST Adapter",
    message:
      "Rate limit threshold reached (85% utilization). Backing off queue processing by 500ms.",
    ip: "10.0.4.12",
  },
  {
    id: "LOG-8829",
    timestamp: "2026-07-21 09:42:30",
    level: "INFO",
    variant: "cyan" as const,
    service: "AI Copilot Pipeline",
    message:
      "Rescored lead LD-9022 from 72 to 88 based on conversation sentiment weights.",
    ip: "172.16.0.44",
  },
  {
    id: "LOG-8828",
    timestamp: "2026-07-21 09:30:11",
    level: "ERROR",
    variant: "magenta" as const,
    service: "Webhook Relay",
    message:
      "Failed to dispatch hook payload to endpoint 'https://api.pipedrive.com/v1/deals'. Status 504 Timeout.",
    ip: "10.0.2.88",
  },
  {
    id: "LOG-8827",
    timestamp: "2026-07-21 09:15:00",
    level: "INFO",
    variant: "cyan" as const,
    service: "Twilio WebRTC Gateway",
    message:
      "Outbound call session terminated gracefully (Duration: 12m 45s). Audio stream stored.",
    ip: "192.168.1.104",
  },
];

export default function TelemetryPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState("ALL");

  const filteredLogs = logsData.filter((log) => {
    const matchesSearch =
      log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.service.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.id.toLowerCase().includes(searchQuery.toLowerCase());

    if (levelFilter === "ALL") return matchesSearch;
    return matchesSearch && log.level === levelFilter;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary-cyan" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-100">
              Telemetry & System Logs
            </h1>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Real-time infrastructure health monitoring, webhook audit trails,
            and API diagnostics.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button className="px-4 py-2 rounded-xl bg-zenith-surface border border-primary-cyan/30 text-xs font-mono text-slate-300 hover:text-white hover:border-primary-cyan/60 transition-all flex items-center gap-2 shadow-inner cursor-pointer">
            <Download className="w-3.5 h-3.5 text-slate-400" />
            Export Raw Logs
          </button>
          <button className="btn-zenith-primary px-4 py-2 rounded-xl text-xs flex items-center gap-2">
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh Diagnostics
          </button>
        </div>
      </div>

      {/* Health Metrics Header Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {systemHealth.map((item) => {
          const Icon = item.icon;
          const isDegraded = item.status === "Degraded";
          return (
            <ZenithCard key={item.name} className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400 truncate">
                  {item.name}
                </span>
                <Icon className="w-4 h-4 text-slate-500" />
              </div>
              <div className="flex items-baseline justify-between font-mono">
                <span
                  className={`text-sm font-bold px-2.5 py-0.5 rounded border text-[11px] shadow-inner ${
                    isDegraded
                      ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                      : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                  }`}
                >
                  {item.status}
                </span>
                <span className="text-xs text-slate-300">{item.latency}</span>
              </div>
              <div className="text-[10px] font-mono text-slate-500 flex justify-between border-t border-slate-800/80 pt-2">
                <span>Uptime Rate</span>
                <span className="text-slate-300 font-semibold">
                  {item.uptime}
                </span>
              </div>
            </ZenithCard>
          );
        })}
      </div>

      {/* Log Controls & Search */}
      <ZenithCard className="flex flex-col md:flex-row items-center justify-between gap-4 p-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search logs by keyword, ID, or service..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zenith-inner border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-primary-cyan/50 font-mono transition-all shadow-inner"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          <span className="text-[11px] font-mono text-slate-500 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Level:
          </span>
          {["ALL", "INFO", "WARN", "ERROR"].map((lvl) => (
            <button
              key={lvl}
              onClick={() => setLevelFilter(lvl)}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all whitespace-nowrap ${
                levelFilter === lvl
                  ? "bg-primary-cyan/20 text-primary-cyan border border-primary-cyan/30 shadow-[0_0_15px_rgba(0,242,255,0.15)]"
                  : "text-slate-400 hover:text-slate-200 hover:bg-zenith-inner"
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>
      </ZenithCard>

      {/* Console / Terminal Style Log Viewer */}
      <ZenithCard className="overflow-hidden p-0">
        <div className="p-3 bg-zenith-inner border-b border-primary-cyan/15 flex items-center justify-between font-mono text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-primary-cyan" />
            <span>live-telemetry-stream.log</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            <span className="text-[11px] text-slate-500">Streaming</span>
          </div>
        </div>

        <div className="p-4 bg-slate-950 font-mono text-xs space-y-3 overflow-x-auto">
          {filteredLogs.map((log) => (
            <ZenithInnerPanel
              key={log.id}
              className="space-y-1.5 hover:border-primary-cyan/40 transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-500">{log.id}</span>
                  <ZenithTag variant={log.variant}>{log.level}</ZenithTag>
                  <span className="text-slate-300 font-semibold">
                    {log.service}
                  </span>
                </div>
                <div className="text-[10px] text-slate-500">
                  <span>{log.timestamp}</span>
                  <span className="mx-2">•</span>
                  <span>{log.ip}</span>
                </div>
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                {log.message}
              </p>
            </ZenithInnerPanel>
          ))}
        </div>
      </ZenithCard>
    </div>
  );
}
