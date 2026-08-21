"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  PhoneCall,
  Activity,
  Sparkles,
  CheckCircle2,
  Layers,
  Zap,
  TrendingUp,
  Clock,
  LogOut,
  Search,
  ArrowUpRight,
  RefreshCw,
  SlidersHorizontal,
  Plus,
  X,
  ShieldCheck,
  Key,
  Server,
  Calendar,
  CheckSquare,
  Pin,
  Video,
  Sliders,
  Command,
  AlertCircle,
  MoreHorizontal,
} from "lucide-react";
import { MultiCrmCard, MultiCrmInnerPanel } from "@/components/ui/MultiCrmCard";
import GlassCard from "@/components/GlassCard";
import MetricWidget from "@/components/MetricWidget";

const stats = [
  {
    name: "Total Unified Leads",
    value: "2,845",
    change: "+12.5%",
    trend: true,
    icon: Users,
  },
  {
    name: "Calls Dialed Today",
    value: "148",
    change: "+18.2%",
    trend: true,
    icon: PhoneCall,
  },
  {
    name: "AI Copilot Actions",
    value: "612",
    change: "+24.0%",
    trend: true,
    icon: Sparkles,
  },
  {
    name: "CRM Sync Velocity",
    value: "99.8%",
    change: "+0.4%",
    trend: true,
    icon: Activity,
  },
];

const initialCrmStatuses = [
  {
    id: "salesforce",
    name: "Salesforce Enterprise",
    status: "Synced",
    count: "1,240 Leads",
    latency: "12ms",
    color: "bg-emerald-400",
    isSyncing: false,
  },
  {
    id: "hubspot",
    name: "HubSpot Professional",
    status: "Synced",
    count: "890 Leads",
    latency: "18ms",
    color: "bg-emerald-400",
    isSyncing: false,
  },
  {
    id: "zoho",
    name: "Zoho CRM",
    status: "Syncing",
    count: "415 Leads",
    latency: "45ms",
    color: "bg-amber-400",
    isSyncing: true,
  },
  {
    id: "pipedrive",
    name: "Pipedrive",
    status: "Synced",
    count: "300 Leads",
    latency: "15ms",
    color: "bg-emerald-400",
    isSyncing: false,
  },
];

const recentActivity = [
  {
    id: 1,
    title: "Lead Qualified by AI Copilot",
    desc: "Sarah Jenkins (Acme Corp) score upgraded to 92/100",
    time: "2m ago",
    icon: Zap,
    iconColor: "text-cyan-400",
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
    iconColor: "text-purple-400",
  },
];

export default function HomeDashboard() {
  const router = useRouter();
  const [crmStatuses, setCrmStatuses] = useState(initialCrmStatuses);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Workspace View & Filter States
  const [activeView, setActiveView] = useState<"table" | "board" | "agents">(
    "table"
  );
  const [taskFilter, setTaskFilter] = useState<"open" | "completed">("open");

  // Modal & Form State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState("Zoho CRM");
  const [customName, setCustomName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);

  const handleLogout = () => {
    document.cookie = "multi_crm_session=; path=/; max-age=0";
    router.push("/login");
  };

  const handleForceSync = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1500);
  };

  const handleOpenAddModal = () => {
    setIsAddModalOpen(true);
  };

  const handleConnectNewCrm = (e: React.FormEvent) => {
    e.preventDefault();
    setIsConnecting(true);

    setTimeout(() => {
      const newInstance = {
        id: `crm-${Date.now()}`,
        name: customName || selectedProvider,
        status: "Synced",
        count: "0 Leads",
        latency: "14ms",
        color: "bg-emerald-400",
        isSyncing: false,
      };

      setCrmStatuses((prev) => [...prev, newInstance]);
      setIsConnecting(false);
      setIsAddModalOpen(false);
      setCustomName("");
      setApiKey("");
    }, 1200);
  };

  return (
    <div className="space-y-10 relative">
      {/* 1. Page Header & Live Integration Health Strip */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 mb-2 border-b border-crm-border pb-6">
          <div>
            <div className="flex items-center gap-3">
              <Activity className="w-6 h-6 text-primary-cyan animate-pulse" />
              <h1 className="text-3xl font-bold tracking-tight text-crm-text font-sans tracking-tight">
                Global Operations Hub
              </h1>
            </div>
            <p className="text-sm text-crm-text-muted font-mono mt-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Multi-CRM Aggregation Engine Active
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleOpenAddModal}
              className="px-3 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-medium flex items-center gap-1.5 cursor-pointer shadow-lg shadow-cyan-500/10 transition-all"
            >
              <Plus className="w-3.5 h-3.5 text-cyan-400" />
              Add CRM
            </button>

            <button
              onClick={handleForceSync}
              disabled={isRefreshing}
              className="px-3.5 py-2 rounded-xl btn-multicrm-primary text-xs flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50 font-mono"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`}
              />
              {isRefreshing ? "Syncing..." : "Force Sync"}
            </button>

            <button
              onClick={handleLogout}
              title="Terminate Session"
              className="px-2.5 py-2 rounded-xl btn-multicrm-danger text-xs flex items-center gap-1.5 cursor-pointer shadow-inner hover:bg-rose-500/20 transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Global Command Bar & Health Status Pills */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-2.5 rounded-2xl bg-crm-base/80 border border-crm-border backdrop-blur-md">
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search leads across CRMs or type commands..."
              className="w-full bg-crm-inner/90 border border-crm-border rounded-xl pl-8 pr-12 py-1.5 text-xs text-crm-text placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50 font-mono transition-all"
            />
            <kbd className="absolute right-2 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded bg-crm-surface text-[10px] font-mono text-crm-text-muted border border-crm-border/60 flex items-center gap-0.5">
              <Command className="w-2.5 h-2.5" /> K
            </kbd>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
            {crmStatuses.map((crm) => (
              <div
                key={crm.id}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-crm-inner border border-crm-border text-[11px] font-mono shrink-0"
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${crm.color} ${
                    crm.isSyncing ? "animate-pulse" : ""
                  }`}
                />
                <span className="text-crm-text-muted">
                  {crm.name.split(" ")[0]}:
                </span>
                <span className="text-crm-text">{crm.status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* AI Daily Copilot Briefing Banner */}
        <div className="p-4 rounded-2xl bg-linear-to-r from-purple-950/40 via-slate-900/80 to-cyan-950/40 border border-purple-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 backdrop-blur-md">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-purple-200">
                AI Executive Daily Brief
              </h3>
              <p className="text-xs text-crm-text-muted mt-0.5">
                3 calls scheduled today • 12 high-intent leads pending
                bi-directional sync validation across Salesforce & HubSpot.
              </p>
            </div>
          </div>
          <button className="px-3.5 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-xs font-mono shrink-0 cursor-pointer transition-all">
            Execute Action Plan →
          </button>
        </div>
      </div>

      {/* 2. KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <MetricWidget
            key={stat.name}
            title={stat.name}
            value={stat.value}
            change={stat.change}
            isPositive={stat.trend}
            icon={stat.icon}
          />
        ))}
      </div>

      {/* 3. ClickUp-Style Focus Queue ("My LineUp") */}
      <GlassCard className="space-y-4" glowColor="rgba(6, 182, 212, 0.12)">
        <div className="flex items-center justify-between border-b border-crm-border pb-3">
          <div className="flex items-center gap-2">
            <Pin className="w-4 h-4 text-cyan-400 rotate-45" />
            <h2 className="text-sm font-semibold text-crm-text">
              Focus Queue LineUp
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[10px] font-mono">
              3 High Priority
            </span>
          </div>
          <p className="text-[11px] font-mono text-slate-500 hidden sm:block">
            Pinned records for immediate execution
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <MultiCrmInnerPanel className="bg-crm-base/70 border-crm-border hover:border-cyan-500/40 transition-all flex flex-col justify-between gap-3">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider">
                  Salesforce • Enterprise Lead
                </span>
                <h3 className="text-xs font-semibold text-crm-text mt-0.5">
                  Acme Corp Expansion ($45k)
                </h3>
              </div>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Score 94
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] font-mono border-t border-crm-border/60 pt-2 text-crm-text-muted">
              <span>Sarah Jenkins</span>
              <button className="text-cyan-400 hover:text-cyan-300 flex items-center gap-0.5 cursor-pointer">
                Action <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
          </MultiCrmInnerPanel>

          <MultiCrmInnerPanel className="bg-crm-base/70 border-crm-border hover:border-purple-500/40 transition-all flex flex-col justify-between gap-3">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono text-purple-400 uppercase tracking-wider">
                  HubSpot • Schema Sync
                </span>
                <h3 className="text-xs font-semibold text-crm-text mt-0.5">
                  Field Mapping Mismatch
                </h3>
              </div>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-rose-500/10 text-rose-400 border border-rose-500/20">
                Urgent
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] font-mono border-t border-crm-border/60 pt-2 text-crm-text-muted">
              <span>custom_phone_field</span>
              <button className="text-purple-400 hover:text-purple-300 flex items-center gap-0.5 cursor-pointer">
                Resolve <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
          </MultiCrmInnerPanel>

          <MultiCrmInnerPanel className="bg-crm-base/70 border-crm-border hover:border-amber-500/40 transition-all flex flex-col justify-between gap-3">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono text-amber-400 uppercase tracking-wider">
                  Zoho • Follow-up
                </span>
                <h3 className="text-xs font-semibold text-crm-text mt-0.5">
                  Nexus Systems Demo Review
                </h3>
              </div>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Pending Call
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] font-mono border-t border-crm-border/60 pt-2 text-crm-text-muted">
              <span>David Miller</span>
              <button className="text-amber-400 hover:text-amber-300 flex items-center gap-0.5 cursor-pointer">
                Call <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
          </MultiCrmInnerPanel>
        </div>
      </GlassCard>

      {/* 4. Operations Row: Today's Calls Schedule + Daily Task List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Call Schedule Widget */}
        <GlassCard className="space-y-4" glowColor="rgba(6, 182, 212, 0.15)">
          <div className="flex items-center justify-between border-b border-crm-border pb-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-semibold text-crm-text">
                Today's Call Schedule
              </h2>
            </div>
            <span className="text-[11px] font-mono text-crm-text-muted">
              3 Meetings
            </span>
          </div>

          <div className="space-y-2.5">
            <MultiCrmInnerPanel className="flex items-center justify-between bg-crm-base/60 border-crm-border">
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-cyan-400 font-medium w-16">
                  09:00 AM
                </span>
                <div>
                  <p className="text-xs font-medium text-crm-text">
                    Q2 Strategy Sync — Acme Corp
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono">
                    Salesforce Lead • Zoom Video
                  </p>
                </div>
              </div>
              <button className="px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[11px] font-mono flex items-center gap-1 cursor-pointer">
                <Video className="w-3 h-3" /> Join
              </button>
            </MultiCrmInnerPanel>

            <MultiCrmInnerPanel className="flex items-center justify-between bg-crm-base/60 border-crm-border">
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-crm-text-muted font-medium w-16">
                  10:30 AM
                </span>
                <div>
                  <p className="text-xs font-medium text-crm-text">
                    HubSpot Technical Onboarding
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono">
                    HubSpot Contact • David Miller
                  </p>
                </div>
              </div>
              <button className="px-2.5 py-1 rounded-lg bg-crm-surface text-crm-text-muted text-[11px] font-mono">
                Upcoming
              </button>
            </MultiCrmInnerPanel>
          </div>
        </GlassCard>

        {/* Actionable Tasks Widget */}
        <GlassCard className="space-y-4" glowColor="rgba(168, 85, 247, 0.15)">
          <div className="flex items-center justify-between border-b border-crm-border pb-3">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-purple-400" />
              <h2 className="text-sm font-semibold text-crm-text">
                Actionable Tasks
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-crm-base p-0.5 rounded-lg border border-crm-border text-[10px] font-mono">
                <button
                  onClick={() => setTaskFilter("open")}
                  className={`px-2 py-0.5 rounded ${
                    taskFilter === "open"
                      ? "bg-purple-500/20 text-purple-300"
                      : "text-crm-text-muted"
                  }`}
                >
                  Open
                </button>
                <button
                  onClick={() => setTaskFilter("completed")}
                  className={`px-2 py-0.5 rounded ${
                    taskFilter === "completed"
                      ? "bg-purple-500/20 text-purple-300"
                      : "text-crm-text-muted"
                  }`}
                >
                  Completed
                </button>
              </div>
              <button className="p-1 rounded-lg bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 border border-purple-500/30 cursor-pointer">
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="space-y-2.5">
            <MultiCrmInnerPanel className="flex items-center justify-between bg-crm-base/60 border-crm-border">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  className="rounded border-crm-border text-purple-500 focus:ring-0 cursor-pointer"
                />
                <div>
                  <p className="text-xs font-medium text-crm-text">
                    Map Custom Fields for Zoho CRM Integration
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono">
                    Priority: High • Due Today
                  </p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-500/10 text-rose-400 border border-rose-500/20">
                Pending
              </span>
            </MultiCrmInnerPanel>

            <MultiCrmInnerPanel className="flex items-center justify-between bg-crm-base/60 border-crm-border">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  className="rounded border-crm-border text-purple-500 focus:ring-0 cursor-pointer"
                />
                <div>
                  <p className="text-xs font-medium text-crm-text">
                    Verify AI Sentiment Score on Sarah Jenkins Record
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono">
                    Priority: Medium • Copilot Trigger
                  </p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                In Review
              </span>
            </MultiCrmInnerPanel>
          </div>
        </GlassCard>
      </div>

      {/* 5. Workspace Operational Data Grid & Super Agents Dock */}
      <GlassCard className="space-y-4" glowColor="rgba(6, 182, 212, 0.15)">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-crm-border pb-4">
          <div className="flex items-center gap-1.5 bg-crm-base/80 p-1 rounded-xl border border-crm-border">
            <button
              onClick={() => setActiveView("table")}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                activeView === "table"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                  : "text-crm-text-muted hover:text-crm-text"
              }`}
            >
              ≡ Unified Table
            </button>
            <button
              onClick={() => setActiveView("board")}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                activeView === "board"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                  : "text-crm-text-muted hover:text-crm-text"
              }`}
            >
              ☵ Pipeline Board
            </button>
            <button
              onClick={() => setActiveView("agents")}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                activeView === "agents"
                  ? "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                  : "text-crm-text-muted hover:text-crm-text"
              }`}
            >
              ✦ Super Agents
            </button>
          </div>

          <div className="flex items-center gap-2">
            <select className="bg-crm-base border border-crm-border rounded-xl px-2.5 py-1.5 text-xs text-crm-text-muted focus:outline-none font-mono">
              <option>Filter by CRM: All</option>
              <option>Salesforce</option>
              <option>HubSpot</option>
              <option>Zoho CRM</option>
            </select>
            <button
              onClick={handleOpenAddModal}
              className="px-3 py-1.5 rounded-xl bg-crm-surface hover:bg-slate-700 text-crm-text text-xs font-mono border border-crm-border/60 cursor-pointer"
            >
              + Add Lead
            </button>
          </div>
        </div>

        {activeView === "table" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-crm-border text-crm-text-muted font-mono">
                  <th className="pb-3 font-normal">Lead Entity</th>
                  <th className="pb-3 font-normal">Origin CRM</th>
                  <th className="pb-3 font-normal">AI Score</th>
                  <th className="pb-3 font-normal">Sync Status</th>
                  <th className="pb-3 font-normal">Last Telemetry Action</th>
                  <th className="pb-3 font-normal text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 text-crm-text">
                <tr className="hover:bg-crm-surface/30 transition-all">
                  <td className="py-3 font-medium flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-[10px] font-bold">
                      SJ
                    </div>
                    <div>
                      <p className="text-crm-text">Sarah Jenkins</p>
                      <p className="text-[10px] text-slate-500 font-mono">
                        Acme Corp
                      </p>
                    </div>
                  </td>
                  <td className="py-3 font-mono text-crm-text-muted">Salesforce</td>
                  <td className="py-3 font-mono">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      92 / 100
                    </span>
                  </td>
                  <td className="py-3 font-mono text-crm-text-muted">
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />{" "}
                      Synced
                    </span>
                  </td>
                  <td className="py-3 text-crm-text-muted font-mono text-[11px]">
                    Qualified by Copilot
                  </td>
                  <td className="py-3 text-right">
                    <button className="text-cyan-400 hover:text-cyan-300 font-mono text-[11px] cursor-pointer">
                      Inspect →
                    </button>
                  </td>
                </tr>
                <tr className="hover:bg-crm-surface/30 transition-all">
                  <td className="py-3 font-medium flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-[10px] font-bold">
                      DM
                    </div>
                    <div>
                      <p className="text-crm-text">David Miller</p>
                      <p className="text-[10px] text-slate-500 font-mono">
                        Nexus Systems
                      </p>
                    </div>
                  </td>
                  <td className="py-3 font-mono text-crm-text-muted">HubSpot</td>
                  <td className="py-3 font-mono">
                    <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      68 / 100
                    </span>
                  </td>
                  <td className="py-3 font-mono text-crm-text-muted">
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />{" "}
                      Syncing
                    </span>
                  </td>
                  <td className="py-3 text-crm-text-muted font-mono text-[11px]">
                    Twilio Call Logged
                  </td>
                  <td className="py-3 text-right">
                    <button className="text-cyan-400 hover:text-cyan-300 font-mono text-[11px] cursor-pointer">
                      Inspect →
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {activeView === "agents" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-crm-base/60 border border-purple-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-purple-300">
                  Onboarding Agent
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
              </div>
              <p className="text-[11px] text-crm-text-muted leading-relaxed">
                Triggers sequences across HubSpot and updates Salesforce records
                automatically.
              </p>
              <button className="w-full mt-2 py-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-xs font-mono cursor-pointer transition-all">
                Trigger Agent
              </button>
            </div>

            <div className="p-4 rounded-xl bg-crm-base/60 border border-cyan-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-cyan-300">
                  Field Sync Auditor
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
              </div>
              <p className="text-[11px] text-crm-text-muted leading-relaxed">
                Scans custom field mappings across all connected CRMs to detect
                schema mismatches.
              </p>
              <button className="w-full mt-2 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-mono cursor-pointer transition-all">
                Trigger Audit
              </button>
            </div>
          </div>
        )}
      </GlassCard>

      {/* 6. Main Grid Section: CRM Status Clusters + Live Activity Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Connected CRMs Overview */}
        <GlassCard
          className="lg:col-span-2 space-y-6"
          glowColor="rgba(6, 182, 212, 0.2)"
        >
          <div className="flex items-center justify-between border-b border-cyan-500/15 pb-4">
            <div>
              <h2 className="text-sm font-semibold text-crm-text">
                Connected CRM Clusters
              </h2>
              <p className="text-xs text-crm-text-muted font-mono">
                Active multi-instance data bridges
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {crmStatuses.length}/{crmStatuses.length} Operational
              </span>
              <button
                onClick={handleOpenAddModal}
                className="text-xs text-cyan-400 hover:text-cyan-300 font-mono flex items-center gap-1 bg-cyan-950/40 px-2.5 py-1 rounded-lg border border-cyan-800/40 transition-all cursor-pointer"
              >
                <Plus className="w-3 h-3" /> Connect New
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {crmStatuses.map((crm) => (
              <MultiCrmInnerPanel
                key={crm.id}
                className="flex flex-col justify-between space-y-3 hover:border-cyan-500/40 transition-all group cursor-pointer"
                onClick={handleOpenAddModal}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-crm-text group-hover:text-cyan-300 transition-colors">
                    {crm.name}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-2 h-2 rounded-full ${crm.color} ${
                        crm.isSyncing ? "animate-pulse" : ""
                      }`}
                    />
                    <span className="text-[10px] font-mono text-crm-text-muted">
                      {crm.status}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs font-mono text-crm-text-muted pt-2 border-t border-crm-border/60">
                  <span>{crm.count}</span>
                  <span className="text-slate-500 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                    {crm.latency}
                  </span>
                </div>
              </MultiCrmInnerPanel>
            ))}
          </div>

          {/* Deduplication Mini Banner */}
          <MultiCrmInnerPanel className="flex items-center justify-between border-cyan-500/30 bg-crm-inner/50">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-cyan-400" />
              <div>
                <p className="text-xs font-medium text-crm-text">
                  Automated Lead Deduplication Active
                </p>
                <p className="text-[11px] text-crm-text-muted font-mono">
                  Merged 142 duplicate entries across CRMs in the last 24h.
                </p>
              </div>
            </div>
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          </MultiCrmInnerPanel>
        </GlassCard>

        {/* Live Activity Stream */}
        <GlassCard className="space-y-6" glowColor="rgba(168, 85, 247, 0.18)">
          <div className="flex items-center justify-between border-b border-cyan-500/15 pb-4">
            <div>
              <h2 className="text-sm font-semibold text-crm-text">
                Live Stream Engine
              </h2>
              <p className="text-xs text-crm-text-muted font-mono">
                Real-time system event feed
              </p>
            </div>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
            </span>
          </div>

          <div className="space-y-4">
            {recentActivity.map((act) => {
              const Icon = act.icon;
              return (
                <MultiCrmInnerPanel
                  key={act.id}
                  className="flex items-start gap-3 hover:border-cyan-500/40 transition-all bg-crm-inner/50"
                >
                  <div className="p-2 rounded-lg bg-crm-base shrink-0 mt-0.5 border border-crm-border">
                    <Icon className={`w-3.5 h-3.5 ${act.iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-crm-text truncate">
                        {act.title}
                      </p>
                      <span className="text-[10px] font-mono text-slate-500 shrink-0">
                        {act.time}
                      </span>
                    </div>
                    <p className="text-[11px] text-crm-text-muted mt-1 line-clamp-2 leading-relaxed">
                      {act.desc}
                    </p>
                  </div>
                </MultiCrmInnerPanel>
              );
            })}
          </div>
        </GlassCard>
      </div>

      {/* 7. Glassmorphic Add CRM Modal */}
      {isAddModalOpen && (
        <div className="dashboard-overlay flex items-center justify-center bg-crm-base/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-crm-inner/90 border border-cyan-500/30 rounded-2xl p-6 shadow-2xl shadow-cyan-500/10 space-y-6 relative">
            <div className="flex items-center justify-between border-b border-crm-border pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-crm-text">
                    Onboard New CRM Bridge
                  </h3>
                  <p className="text-[11px] text-crm-text-muted font-mono">
                    Configure API handshake & sync permissions
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-crm-text-muted hover:text-crm-text p-1.5 rounded-lg hover:bg-crm-surface/60 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConnectNewCrm} className="space-y-4">
              <div>
                <label className="text-xs font-mono text-crm-text-muted mb-1.5 block">
                  Select CRM Platform
                </label>
                <select
                  value={selectedProvider}
                  onChange={(e) => setSelectedProvider(e.target.value)}
                  className="w-full bg-crm-base border border-crm-border rounded-xl px-3 py-2 text-xs text-crm-text focus:outline-none focus:border-cyan-500/50 font-sans"
                >
                  <option value="Salesforce Enterprise">
                    Salesforce Enterprise
                  </option>
                  <option value="HubSpot Professional">
                    HubSpot Professional
                  </option>
                  <option value="Zoho CRM">Zoho CRM</option>
                  <option value="Pipedrive">Pipedrive</option>
                  <option value="Custom REST Gateway">
                    Custom REST Gateway
                  </option>
                </select>
              </div>

              <div>
                <label className="text-xs font-mono text-crm-text-muted mb-1.5 block">
                  Instance Alias (Optional)
                </label>
                <div className="relative">
                  <Server className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder={`e.g. ${selectedProvider} Production`}
                    className="w-full bg-crm-base border border-crm-border rounded-xl pl-9 pr-3 py-2 text-xs text-crm-text placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-mono text-crm-text-muted mb-1.5 block">
                  API Key / OAuth Secret
                </label>
                <div className="relative">
                  <Key className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="password"
                    required
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="e.g. key_live_994a02f..."
                    className="w-full bg-crm-base border border-crm-border rounded-xl pl-9 pr-3 py-2 text-xs text-crm-text placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-crm-border">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl text-xs text-crm-text-muted hover:text-crm-text transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isConnecting}
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-cyan-500/20 disabled:opacity-50"
                >
                  {isConnecting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Authenticating...
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      Connect Instance
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
