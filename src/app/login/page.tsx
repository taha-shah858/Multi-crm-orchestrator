"use client";

import { useRouter } from "next/navigation";
import {
  Users,
  PhoneCall,
  ArrowUpRight,
  Activity,
  Sparkles,
  CheckCircle2,
  Layers,
  Zap,
  TrendingUp,
  Clock,
  LogOut,
} from "lucide-react";

const stats = [
  {
    name: "Total Unified Leads",
    value: "2,845",
    change: "+12.5%",
    trend: "up",
    icon: Users,
    color: "text-primary-cyan",
    bg: "bg-primary-cyan/10",
  },
  {
    name: "Calls Dialed Today",
    value: "148",
    change: "+18.2%",
    trend: "up",
    icon: PhoneCall,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
  },
  {
    name: "AI Copilot Actions",
    value: "612",
    change: "+24.0%",
    trend: "up",
    icon: Sparkles,
    color: "text-tertiary-purple",
    bg: "bg-tertiary-purple/10",
  },
  {
    name: "CRM Sync Velocity",
    value: "99.8%",
    change: "+0.4%",
    trend: "up",
    icon: Activity,
    color: "text-secondary-pink",
    bg: "bg-secondary-pink/10",
  },
];

const crmStatuses = [
  {
    name: "Salesforce Enterprise",
    status: "Synced",
    count: "1,240 Leads",
    latency: "12ms",
    color: "bg-emerald-400",
  },
  {
    name: "HubSpot Professional",
    status: "Synced",
    count: "890 Leads",
    latency: "18ms",
    color: "bg-emerald-400",
  },
  {
    name: "Zoho CRM",
    status: "Syncing",
    count: "415 Leads",
    latency: "45ms",
    color: "bg-amber-400",
  },
  {
    name: "Pipedrive",
    status: "Synced",
    count: "300 Leads",
    latency: "15ms",
    color: "bg-emerald-400",
  },
];

const recentActivity = [
  {
    id: 1,
    title: "Lead Qualified by AI Copilot",
    desc: "Sarah Jenkins (Acme Corp) score upgraded to 92/100",
    time: "2m ago",
    icon: Zap,
    iconColor: "text-primary-cyan",
  },
  {
    id: 2,
    title: "Twilio Call Completed",
    desc: "Outbound call to David Miller (12m 45s) — Sentiment: Positive",
    time: "14m ago",
    icon: PhoneCall,
    iconColor: "text-emerald-400",
  },
  {
    id: 3,
    title: "Bi-Directional Sync Triggered",
    desc: "Updated 42 contact records across Salesforce & HubSpot",
    time: "32m ago",
    icon: Layers,
    iconColor: "text-tertiary-purple",
  },
];

export default function HomeDashboard() {
  const router = useRouter();

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">
            Multi-CRM Command Center
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Real-time orchestration across all 4 connected CRM environments.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              localStorage.removeItem("multicrm_auth");
              router.push("/login");
            }}
            className="px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs font-mono text-rose-400 hover:bg-rose-500/20 transition-all flex items-center gap-1.5 cursor-pointer shadow-inner"
          >
            <LogOut className="w-3.5 h-3.5" />
            Terminate Session
          </button>
          <button className="px-4 py-2 rounded-xl bg-zenith-surface border border-primary-cyan/30 text-xs font-mono text-slate-300 hover:text-white hover:border-primary-cyan/60 transition-all flex items-center gap-2 shadow-inner">
            <Clock className="w-3.5 h-3.5 text-primary-cyan" />
            Last Synced: Just now
          </button>
          <button className="btn-zenith-primary px-4 py-2 rounded-xl text-xs flex items-center gap-2">
            <Zap className="w-3.5 h-3.5" />
            Trigger Force Sync
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.name}
              className="rounded-2xl bg-zenith-surface border border-primary-cyan/20 border-t-primary-cyan/40 p-5 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.95),0_0_20px_rgba(0,242,255,0.06)] hover:border-primary-cyan/50 transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400 font-mono">
                  {stat.name}
                </span>
                <div className={`p-2.5 rounded-xl ${stat.bg}`}>
                  <Icon className={`w-4 h-4 ${stat.color}`} />
                </div>
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <p className="text-2xl font-bold text-slate-100 font-mono tracking-tight">
                  {stat.value}
                </p>
                <span className="inline-flex items-center text-[11px] font-mono font-medium text-emerald-400">
                  <ArrowUpRight className="w-3 h-3 mr-0.5" />
                  {stat.change}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Grid Section: CRM Status + Live Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Connected CRMs Overview */}
        <div className="lg:col-span-2 rounded-2xl bg-zenith-surface border border-primary-cyan/20 border-t-primary-cyan/40 p-6 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.95),0_0_20px_rgba(0,242,255,0.06)] space-y-6">
          <div className="flex items-center justify-between border-b border-primary-cyan/15 pb-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-200">
                Connected CRM Clusters
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Active multi-instance data bridges
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              4/4 Operational
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {crmStatuses.map((crm) => (
              <div
                key={crm.name}
                className="p-4 rounded-xl bg-zenith-inner border border-slate-800/80 shadow-inner flex flex-col justify-between space-y-3 hover:border-primary-cyan/40 transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-200">
                    {crm.name}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${crm.color}`} />
                    <span className="text-[10px] font-mono text-slate-400">
                      {crm.status}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs font-mono text-slate-400 pt-2 border-t border-slate-800/60">
                  <span>{crm.count}</span>
                  <span className="text-slate-500">{crm.latency}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Performance Mini Banner */}
          <div className="p-4 rounded-xl bg-zenith-inner border border-primary-cyan/30 flex items-center justify-between shadow-inner">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-primary-cyan" />
              <div>
                <p className="text-xs font-medium text-slate-200">
                  Automated Lead Deduplication Active
                </p>
                <p className="text-[11px] text-slate-400 font-mono">
                  Merged 142 duplicate entries across CRMs in the last 24h.
                </p>
              </div>
            </div>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
        </div>

        {/* Live Activity Stream */}
        <div className="rounded-2xl bg-zenith-surface border border-primary-cyan/20 border-t-primary-cyan/40 p-6 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.95),0_0_20px_rgba(0,242,255,0.06)] space-y-6">
          <div className="border-b border-primary-cyan/15 pb-4">
            <h2 className="text-sm font-semibold text-slate-200">
              Live Stream Engine
            </h2>
            <p className="text-xs text-slate-400 font-mono">
              Real-time system event feed
            </p>
          </div>

          <div className="space-y-4">
            {recentActivity.map((act) => {
              const Icon = act.icon;
              return (
                <div
                  key={act.id}
                  className="p-3.5 rounded-xl bg-zenith-inner border border-slate-800/80 shadow-inner flex items-start gap-3 hover:border-primary-cyan/40 transition-all"
                >
                  <div className="p-2 rounded-lg bg-slate-900 shrink-0 mt-0.5 border border-slate-800">
                    <Icon className={`w-3.5 h-3.5 ${act.iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-slate-200 truncate">
                        {act.title}
                      </p>
                      <span className="text-[10px] font-mono text-slate-500 shrink-0">
                        {act.time}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {act.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
