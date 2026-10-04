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
  LogOut,
  Search,
  ArrowUpRight,
  RefreshCw,
  Plus,
  X,
  ShieldCheck,
  Key,
  Server,
  Calendar,
  CheckSquare,
  Pin,
  Video,
  Command,
} from "lucide-react";
import { MultiCrmInnerPanel } from "@/components/ui/MultiCrmCard";
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
    color: "bg-emerald-500",
    isSyncing: false,
  },
  {
    id: "hubspot",
    name: "HubSpot Professional",
    status: "Synced",
    count: "890 Leads",
    latency: "18ms",
    color: "bg-emerald-500",
    isSyncing: false,
  },
  {
    id: "zoho",
    name: "Zoho CRM",
    status: "Syncing",
    count: "415 Leads",
    latency: "45ms",
    color: "bg-amber-500",
    isSyncing: true,
  },
  {
    id: "pipedrive",
    name: "Pipedrive",
    status: "Synced",
    count: "300 Leads",
    latency: "15ms",
    color: "bg-emerald-500",
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
    iconColor: "text-blue-600",
  },
  {
    id: 2,
    title: "Twilio Call Completed",
    desc: "Outbound call to David Miller (12m 45s) — Sentiment: Positive",
    time: "14m ago",
    icon: PhoneCall,
    iconColor: "text-emerald-600",
  },
  {
    id: 3,
    title: "Bi-Directional Sync Triggered",
    desc: "Updated 42 contact records across Salesforce & HubSpot",
    time: "32m ago",
    icon: Layers,
    iconColor: "text-purple-600",
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

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
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
        color: "bg-emerald-500",
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
    <div className="space-y-6 font-sans text-slate-900">
      <div role="note" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Dashboard preview: metrics, records and controls below use sample data. Use the module pages in the sidebar for live CRM, calendar and sales operations.
      </div>
      {/* 1. Page Header & Live Integration Health Strip */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 border-b border-slate-200 pb-5">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-600">
                <Activity className="w-5 h-5 animate-pulse" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Global Operations Hub
              </h1>
            </div>
            <p className="font-sans text-sm font-medium text-slate-600 mt-1.5 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Multi-CRM Aggregation Engine Active
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleOpenAddModal}
              className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-white" />
              Add CRM
            </button>

            <button
              onClick={handleForceSync}
              disabled={isRefreshing}
              className="px-3.5 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-medium flex items-center gap-2 cursor-pointer shadow-xs transition-colors disabled:opacity-50"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-blue-600" : ""}`}
              />
              {isRefreshing ? "Syncing..." : "Force Sync"}
            </button>

            <button
              onClick={handleLogout}
              title="Terminate Session"
              className="p-2 rounded-lg bg-white hover:bg-red-50 text-slate-600 hover:text-red-700 border border-slate-300 hover:border-red-300 text-xs flex items-center justify-center cursor-pointer shadow-xs transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Global Command Bar & Health Status Pills */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search leads across CRMs or type commands..."
              className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-12 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-sans transition-colors"
            />
            <kbd className="absolute right-2 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-sans text-slate-500 border border-slate-200 flex items-center gap-0.5">
              <Command className="w-2.5 h-2.5" /> K
            </kbd>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
            {crmStatuses.map((crm) => (
              <div
                key={crm.id}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs font-sans shrink-0"
              >
                <span
                  className={`w-2 h-2 rounded-full ${crm.color} ${
                    crm.isSyncing ? "animate-pulse" : ""
                  }`}
                />
                <span className="text-slate-500 font-medium">
                  {crm.name.split(" ")[0]}:
                </span>
                <span className="text-slate-900 font-semibold">{crm.status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* AI Daily Copilot Briefing Banner (High Contrast Enterprise Standard) */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 font-sans">
                AI Executive Daily Brief
              </h3>
              <p className="text-xs font-medium text-slate-700 font-sans mt-0.5 leading-relaxed">
                3 calls scheduled today • 12 high-intent leads pending
                bi-directional sync validation across Salesforce & HubSpot.
              </p>
            </div>
          </div>
          <button className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs px-3.5 py-1.5 rounded-lg shadow-xs transition-colors shrink-0 cursor-pointer font-sans">
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
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <Pin className="w-4 h-4 text-blue-600 rotate-45" />
            <h2 className="text-sm font-bold text-slate-900 font-sans">
              Focus Queue LineUp
            </h2>
            <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold font-sans">
              3 High Priority
            </span>
          </div>
          <p className="text-xs font-sans text-slate-500 hidden sm:block">
            Pinned records for immediate execution
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <MultiCrmInnerPanel className="bg-slate-50 border border-slate-200 rounded-lg p-4 hover:border-blue-300 transition-colors flex flex-col justify-between gap-3">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-semibold text-blue-700 uppercase tracking-wider font-sans">
                  Salesforce • Enterprise Lead
                </span>
                <h3 className="text-xs font-bold text-slate-900 mt-1 font-sans">
                  Acme Corp Expansion ($45k)
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded-md text-xs font-semibold font-sans bg-emerald-50 text-emerald-700 border border-emerald-200">
                Score 94
              </span>
            </div>
            <div className="flex items-center justify-between text-xs font-sans border-t border-slate-200 pt-2.5 text-slate-600">
              <span className="font-medium text-slate-800">Sarah Jenkins</span>
              <button className="text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-0.5 cursor-pointer">
                Action <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </MultiCrmInnerPanel>

          <MultiCrmInnerPanel className="bg-slate-50 border border-slate-200 rounded-lg p-4 hover:border-blue-300 transition-colors flex flex-col justify-between gap-3">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-semibold text-purple-700 uppercase tracking-wider font-sans">
                  HubSpot • Schema Sync
                </span>
                <h3 className="text-xs font-bold text-slate-900 mt-1 font-sans">
                  Field Mapping Mismatch
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded-md text-xs font-semibold font-sans bg-red-50 text-red-700 border border-red-200">
                Urgent
              </span>
            </div>
            <div className="flex items-center justify-between text-xs font-sans border-t border-slate-200 pt-2.5 text-slate-600">
              <span className="font-medium text-slate-800">custom_phone_field</span>
              <button className="text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-0.5 cursor-pointer">
                Resolve <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </MultiCrmInnerPanel>

          <MultiCrmInnerPanel className="bg-slate-50 border border-slate-200 rounded-lg p-4 hover:border-blue-300 transition-colors flex flex-col justify-between gap-3">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-semibold text-amber-700 uppercase tracking-wider font-sans">
                  Zoho • Follow-up
                </span>
                <h3 className="text-xs font-bold text-slate-900 mt-1 font-sans">
                  Nexus Systems Demo Review
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded-md text-xs font-semibold font-sans bg-amber-50 text-amber-800 border border-amber-200">
                Pending Call
              </span>
            </div>
            <div className="flex items-center justify-between text-xs font-sans border-t border-slate-200 pt-2.5 text-slate-600">
              <span className="font-medium text-slate-800">David Miller</span>
              <button className="text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-0.5 cursor-pointer">
                Call <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </MultiCrmInnerPanel>
        </div>
      </div>

      {/* 4. Operations Row: Today's Calls Schedule + Daily Task List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Call Schedule Widget */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-900 font-sans">
                Today&apos;s Call Schedule
              </h2>
            </div>
            <span className="text-xs font-medium text-slate-500 font-sans">
              3 Meetings
            </span>
          </div>

          <div className="space-y-2.5">
            <MultiCrmInnerPanel className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg p-3.5">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-blue-700 w-16 font-sans">
                  09:00 AM
                </span>
                <div>
                  <p className="text-xs font-bold text-slate-900 font-sans">
                    Q2 Strategy Sync — Acme Corp
                  </p>
                  <p className="text-[11px] text-slate-500 font-sans mt-0.5">
                    Salesforce Lead • Zoom Video
                  </p>
                </div>
              </div>
              <button className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-medium font-sans flex items-center gap-1 cursor-pointer transition-colors">
                <Video className="w-3.5 h-3.5" /> Join
              </button>
            </MultiCrmInnerPanel>

            <MultiCrmInnerPanel className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg p-3.5">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-500 w-16 font-sans">
                  10:30 AM
                </span>
                <div>
                  <p className="text-xs font-bold text-slate-900 font-sans">
                    HubSpot Technical Onboarding
                  </p>
                  <p className="text-[11px] text-slate-500 font-sans mt-0.5">
                    HubSpot Contact • David Miller
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-500 text-xs font-medium font-sans">
                Upcoming
              </span>
            </MultiCrmInnerPanel>
          </div>
        </div>

        {/* Actionable Tasks Widget */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-900 font-sans">
                Actionable Tasks
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-sans">
                <button
                  onClick={() => setTaskFilter("open")}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    taskFilter === "open"
                      ? "bg-white text-slate-900 shadow-2xs font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Open
                </button>
                <button
                  onClick={() => setTaskFilter("completed")}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    taskFilter === "completed"
                      ? "bg-white text-slate-900 shadow-2xs font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Completed
                </button>
              </div>
              <button className="p-1.5 rounded-lg bg-white text-slate-700 hover:bg-slate-50 border border-slate-300 shadow-2xs cursor-pointer">
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="space-y-2.5">
            <MultiCrmInnerPanel className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg p-3.5">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-600 cursor-pointer"
                />
                <div>
                  <p className="text-xs font-bold text-slate-900 font-sans">
                    Map Custom Fields for Zoho CRM Integration
                  </p>
                  <p className="text-[11px] text-slate-500 font-sans mt-0.5">
                    Priority: High • Due Today
                  </p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-md text-xs font-semibold font-sans bg-amber-50 text-amber-800 border border-amber-200">
                Pending
              </span>
            </MultiCrmInnerPanel>

            <MultiCrmInnerPanel className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg p-3.5">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-600 cursor-pointer"
                />
                <div>
                  <p className="text-xs font-bold text-slate-900 font-sans">
                    Verify AI Sentiment Score on Sarah Jenkins Record
                  </p>
                  <p className="text-[11px] text-slate-500 font-sans mt-0.5">
                    Priority: Medium • Copilot Trigger
                  </p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-md text-xs font-semibold font-sans bg-blue-50 text-blue-700 border border-blue-200">
                In Review
              </span>
            </MultiCrmInnerPanel>
          </div>
        </div>
      </div>

      {/* 5. Workspace Operational Data Grid & Super Agents Dock */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setActiveView("table")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium font-sans transition-colors cursor-pointer ${
                activeView === "table"
                  ? "bg-white text-slate-900 shadow-2xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Unified Table
            </button>
            <button
              onClick={() => setActiveView("board")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium font-sans transition-colors cursor-pointer ${
                activeView === "board"
                  ? "bg-white text-slate-900 shadow-2xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Pipeline Board
            </button>
            <button
              onClick={() => setActiveView("agents")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium font-sans transition-colors cursor-pointer ${
                activeView === "agents"
                  ? "bg-white text-slate-900 shadow-2xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Super Agents
            </button>
          </div>

          <div className="flex items-center gap-2">
            <select className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-700 font-sans focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-2xs">
              <option>Filter by CRM: All</option>
              <option>Salesforce</option>
              <option>HubSpot</option>
              <option>Zoho CRM</option>
            </select>
            <button
              onClick={handleOpenAddModal}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium font-sans shadow-xs transition-colors cursor-pointer"
            >
              + Add Lead
            </button>
          </div>
        </div>

        {activeView === "table" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="pb-3 font-semibold">Lead Entity</th>
                  <th className="pb-3 font-semibold">Origin CRM</th>
                  <th className="pb-3 font-semibold">AI Score</th>
                  <th className="pb-3 font-semibold">Sync Status</th>
                  <th className="pb-3 font-semibold">Last Telemetry Action</th>
                  <th className="pb-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                <tr className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 font-medium flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                      SJ
                    </div>
                    <div>
                      <p className="text-slate-900 font-bold text-xs">Sarah Jenkins</p>
                      <p className="text-[11px] text-slate-500 font-sans">
                        Acme Corp
                      </p>
                    </div>
                  </td>
                  <td className="py-3 text-slate-600 font-medium">Salesforce</td>
                  <td className="py-3 font-sans">
                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
                      92 / 100
                    </span>
                  </td>
                  <td className="py-3 text-slate-600 font-medium">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />{" "}
                      Synced
                    </span>
                  </td>
                  <td className="py-3 text-slate-600 font-sans text-xs">
                    Qualified by Copilot
                  </td>
                  <td className="py-3 text-right">
                    <button className="text-blue-600 hover:text-blue-700 font-semibold text-xs cursor-pointer">
                      Inspect →
                    </button>
                  </td>
                </tr>
                <tr className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 font-medium flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-bold">
                      DM
                    </div>
                    <div>
                      <p className="text-slate-900 font-bold text-xs">David Miller</p>
                      <p className="text-[11px] text-slate-500 font-sans">
                        Nexus Systems
                      </p>
                    </div>
                  </td>
                  <td className="py-3 text-slate-600 font-medium">HubSpot</td>
                  <td className="py-3 font-sans">
                    <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold">
                      68 / 100
                    </span>
                  </td>
                  <td className="py-3 text-slate-600 font-medium">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />{" "}
                      Syncing
                    </span>
                  </td>
                  <td className="py-3 text-slate-600 font-sans text-xs">
                    Twilio Call Logged
                  </td>
                  <td className="py-3 text-right">
                    <button className="text-blue-600 hover:text-blue-700 font-semibold text-xs cursor-pointer">
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
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">
                  Onboarding Agent
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              </div>
              <p className="text-xs text-slate-600 leading-relaxed font-sans">
                Triggers sequences across HubSpot and updates Salesforce records
                automatically.
              </p>
              <button className="w-full mt-2 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium font-sans shadow-xs cursor-pointer transition-colors">
                Trigger Agent
              </button>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">
                  Field Sync Auditor
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              </div>
              <p className="text-xs text-slate-600 leading-relaxed font-sans">
                Scans custom field mappings across all connected CRMs to detect
                schema mismatches.
              </p>
              <button className="w-full mt-2 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium font-sans shadow-xs cursor-pointer transition-colors">
                Trigger Audit
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 6. Main Grid Section: CRM Status Clusters + Live Activity Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Connected CRMs Overview */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl shadow-xs p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 font-sans">
                Connected CRM Clusters
              </h2>
              <p className="text-xs text-slate-500 font-sans mt-0.5">
                Active multi-instance data bridges
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 rounded-md text-xs font-semibold font-sans bg-emerald-50 text-emerald-700 border border-emerald-200">
                {crmStatuses.length}/{crmStatuses.length} Operational
              </span>
              <button
                onClick={handleOpenAddModal}
                className="text-xs text-blue-600 hover:text-blue-700 font-semibold font-sans flex items-center gap-1 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-200 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Connect New
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {crmStatuses.map((crm) => (
              <MultiCrmInnerPanel
                key={crm.id}
                className="flex flex-col justify-between space-y-3 bg-slate-50 border border-slate-200 rounded-lg p-4 hover:border-blue-300 transition-colors group cursor-pointer"
                onClick={handleOpenAddModal}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors font-sans">
                    {crm.name}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-2 h-2 rounded-full ${crm.color} ${
                        crm.isSyncing ? "animate-pulse" : ""
                      }`}
                    />
                    <span className="text-xs font-medium text-slate-600 font-sans">
                      {crm.status}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs font-sans text-slate-600 pt-2 border-t border-slate-200">
                  <span className="font-medium text-slate-800">{crm.count}</span>
                  <span className="text-slate-500 flex items-center gap-1 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                    {crm.latency}
                  </span>
                </div>
              </MultiCrmInnerPanel>
            ))}
          </div>

          {/* Deduplication Mini Banner */}
          <div className="flex items-center justify-between border border-blue-200 bg-blue-50/50 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-xs font-bold text-slate-900 font-sans">
                  Automated Lead Deduplication Active
                </p>
                <p className="text-xs text-slate-600 font-sans mt-0.5">
                  Merged 142 duplicate entries across CRMs in the last 24h.
                </p>
              </div>
            </div>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          </div>
        </div>

        {/* Live Activity Stream */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 font-sans">
                Live Stream Engine
              </h2>
              <p className="text-xs text-slate-500 font-sans mt-0.5">
                Real-time system event feed
              </p>
            </div>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
            </span>
          </div>

          <div className="space-y-3">
            {recentActivity.map((act) => {
              const Icon = act.icon;
              return (
                <MultiCrmInnerPanel
                  key={act.id}
                  className="flex items-start gap-3 bg-slate-50 border border-slate-200 rounded-lg p-3 hover:border-blue-300 transition-colors"
                >
                  <div className="p-2 rounded-lg bg-white shrink-0 mt-0.5 border border-slate-200 shadow-2xs">
                    <Icon className={`w-3.5 h-3.5 ${act.iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-slate-900 truncate font-sans">
                        {act.title}
                      </p>
                      <span className="text-[11px] font-sans text-slate-500 shrink-0">
                        {act.time}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed font-sans">
                      {act.desc}
                    </p>
                  </div>
                </MultiCrmInnerPanel>
              );
            })}
          </div>
        </div>
      </div>

      {/* 7. Enterprise Add CRM Modal */}
      {isAddModalOpen && (
        <div className="dashboard-overlay flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-xl space-y-6 relative">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-600">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 font-sans">
                    Onboard New CRM Bridge
                  </h3>
                  <p className="text-xs text-slate-500 font-sans mt-0.5">
                    Configure API handshake & sync permissions
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConnectNewCrm} className="space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5 block font-sans">
                  Select CRM Platform
                </label>
                <select
                  value={selectedProvider}
                  onChange={(e) => setSelectedProvider(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-sans shadow-2xs"
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
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5 block font-sans">
                  Instance Alias (Optional)
                </label>
                <div className="relative">
                  <Server className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder={`e.g. ${selectedProvider} Production`}
                    className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-sans shadow-2xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5 block font-sans">
                  API Key / OAuth Secret
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="e.g. key_live_994a02f..."
                    className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-sans shadow-2xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer font-sans"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isConnecting}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer shadow-xs disabled:opacity-50 font-sans"
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
