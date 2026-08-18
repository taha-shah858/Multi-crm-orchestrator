"use client";

import { useState } from "react";
import {
  LayoutGrid,
  Building2,
  Mail,
  Calendar,
  Video,
  MessageSquare,
  Search,
  CheckCircle2,
  ArrowUpRight,
  RefreshCw,
  SlidersHorizontal,
  Lock,
  History,
  ShieldCheck,
  Sparkles,
  Clock,
  Layers,
  LucideIcon,
} from "lucide-react";

// Safe string-to-icon lookup map
const iconMap: Record<string, LucideIcon> = {
  building: Building2,
  mail: Mail,
  calendar: Calendar,
  video: Video,
  message: MessageSquare,
};

const categories = [
  { id: "all", label: "All Timeline Sources", icon: LayoutGrid },
  { id: "crm", label: "CRMs & Pipelines", icon: Building2 },
  { id: "email", label: "Email & Inbox", icon: Mail },
  { id: "scheduling", label: "Meetings & Booking", icon: Calendar },
  { id: "messaging", label: "Calls & Messaging", icon: MessageSquare },
];

interface AppItem {
  id: string;
  name: string;
  category: "crm" | "email" | "scheduling" | "messaging";
  section: "crm" | "work";
  desc: string;
  status: "connected" | "available";
  authType: string;
  account: string | null;
  timelineOutput: string;
  iconKey: string;
  iconColor: string;
}

const initialApps: AppItem[] = [
  // --- CRM PLATFORMS ---
  {
    id: "salesforce",
    name: "Salesforce Enterprise",
    category: "crm",
    section: "crm",
    desc: "Sync deal stage shifts, contact status updates, and account field edits directly to the timeline.",
    status: "connected",
    authType: "1-Click OAuth",
    account: "alex@enterprise-crm.com",
    timelineOutput: "Deal updates, stage moves & field changes",
    iconKey: "building",
    iconColor: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  },
  {
    id: "hubspot",
    name: "HubSpot Professional",
    category: "crm",
    section: "crm",
    desc: "Pulls sales activities, lifecycle changes, and deal creation records into the chronological thread.",
    status: "connected",
    authType: "1-Click OAuth",
    account: "growth@company.com",
    timelineOutput: "Pipeline changes & lead lifecycle events",
    iconKey: "building",
    iconColor: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  },
  {
    id: "zoho",
    name: "Zoho CRM",
    category: "crm",
    section: "crm",
    desc: "Stream inbound lead assignments, notes, and contact creation events.",
    status: "available",
    authType: "1-Click OAuth",
    account: null,
    timelineOutput: "Inbound leads, notes & contact updates",
    iconKey: "building",
    iconColor: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  },

  // --- COMMUNICATION & WORK APPS ---
  {
    id: "gmail",
    name: "Google Workspace / Gmail",
    category: "email",
    section: "work",
    desc: "Auto-index outbound & inbound email threads sent to or received from lead email addresses.",
    status: "connected",
    authType: "Google SSO",
    account: "alex.dev@company.com",
    timelineOutput: "Full email threads, replies & attachments",
    iconKey: "mail",
    iconColor: "text-rose-400 bg-rose-500/10 border-rose-500/20",
  },
  {
    id: "outlook",
    name: "Microsoft Outlook / Office 365",
    category: "email",
    section: "work",
    desc: "Log lead communication history, email chains, and quick email replies automatically.",
    status: "available",
    authType: "Microsoft SSO",
    account: null,
    timelineOutput: "Outlook threads & follow-up emails",
    iconKey: "mail",
    iconColor: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  },
  {
    id: "calendly",
    name: "Calendly",
    category: "scheduling",
    section: "work",
    desc: "Append booked discovery calls, rescheduled slots, and canceled meeting events to lead history.",
    status: "connected",
    authType: "OAuth 2.0",
    account: "calendly.com/alex-sales",
    timelineOutput: "Booked calls, reschedules & intake forms",
    iconKey: "calendar",
    iconColor: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  },
  {
    id: "zoom",
    name: "Zoom Meetings",
    category: "scheduling",
    section: "work",
    desc: "Attach meeting transcripts, call durations, and cloud recordings chronologically after each call.",
    status: "available",
    authType: "OAuth 2.0",
    account: null,
    timelineOutput: "Call logs, durations & AI summaries",
    iconKey: "video",
    iconColor: "text-sky-400 bg-sky-500/10 border-sky-500/20",
  },
  {
    id: "whatsapp",
    name: "WhatsApp Business API",
    category: "messaging",
    section: "work",
    desc: "Capture direct client chat messages, quick voice notes, and media exchanges into the record.",
    status: "available",
    authType: "OAuth 2.0",
    account: null,
    timelineOutput: "Direct chat logs & client media",
    iconKey: "message",
    iconColor: "text-green-400 bg-green-500/10 border-green-500/20",
  },
];

export default function IntegrationsAppCenter() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [apps, setApps] = useState(initialApps);
  const [connectingId, setConnectingId] = useState<string | null>(null);

  const handleConnect = (appId: string) => {
    setConnectingId(appId);
    setTimeout(() => {
      setApps((prev) =>
        prev.map((app) =>
          app.id === appId
            ? {
                ...app,
                status: "connected",
                account: `connected-${app.id}@workspace.com`,
              }
            : app
        )
      );
      setConnectingId(null);
    }, 1200);
  };

  const handleDisconnect = (appId: string) => {
    setApps((prev) =>
      prev.map((app) =>
        app.id === appId ? { ...app, status: "available", account: null } : app
      )
    );
  };

  // Category and Search Filtering
  const filteredApps = apps.filter((app) => {
    const matchesCategory =
      selectedCategory === "all" || app.category === selectedCategory;
    const matchesSearch =
      app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.timelineOutput.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const crmApps = filteredApps.filter((app) => app.section === "crm");
  const workApps = filteredApps.filter((app) => app.section === "work");

  const renderCard = (app: AppItem) => {
    const isConnected = app.status === "connected";
    const isConnecting = connectingId === app.id;
    const AppIcon = iconMap[app.iconKey] || Building2;

    return (
      <div
        key={app.id}
        className="bg-crm-base/70 border border-crm-border/90 rounded-2xl backdrop-blur-md hover:border-crm-border/80 transition-all flex flex-col justify-between p-4 space-y-4 shadow-lg shadow-black/40 group relative"
      >
        <div className="space-y-3">
          {/* Card Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl border ${app.iconColor}`}>
                <AppIcon className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-crm-text">
                  {app.name}
                </h3>
                <span className="text-[10px] font-mono text-slate-500">
                  {app.authType}
                </span>
              </div>
            </div>

            {isConnected ? (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Live Feed
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-crm-inner text-slate-500 border border-crm-border">
                Inactive
              </span>
            )}
          </div>

          <p className="text-[11px] text-crm-text-muted leading-relaxed">
            {app.desc}
          </p>

          {/* Output Tag */}
          <div className="p-2 rounded-lg bg-crm-inner/90 border border-crm-border flex items-center gap-2 text-[10px] font-mono text-crm-text-muted">
            <History className="w-3 h-3 text-cyan-400 shrink-0" />
            <span className="truncate">
              <strong className="text-crm-text-muted">Timeline:</strong>{" "}
              {app.timelineOutput}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="pt-3 border-t border-crm-border flex items-center justify-between">
          {isConnected ? (
            <>
              <span className="text-[10px] font-mono text-crm-text-muted truncate max-w-35">
                {app.account}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDisconnect(app.id)}
                  className="px-2.5 py-1 rounded-lg bg-crm-inner hover:bg-rose-500/10 text-crm-text-muted hover:text-rose-400 border border-crm-border hover:border-rose-500/20 text-[11px] font-mono transition-all cursor-pointer"
                >
                  Disconnect
                </button>
                <button
                  title="Configure sync rules"
                  className="p-1.5 rounded-lg bg-crm-inner text-crm-text-muted hover:text-cyan-300 border border-crm-border cursor-pointer"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1 text-[10px] font-mono text-slate-500">
                <Lock className="w-3 h-3 text-slate-600" />
                <span>OAuth Login</span>
              </div>
              <button
                onClick={() => handleConnect(app.id)}
                disabled={isConnecting}
                className="px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-cyan-500/10 disabled:opacity-50"
              >
                {isConnecting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <span>Login & Link</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-crm-text flex items-center gap-2">
            Timeline Feed Connectors
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Sparkles className="w-3 h-3" /> Auto-Chronological Stream
            </span>
          </h1>
          <p className="text-xs text-crm-text-muted font-mono mt-1">
            Connect CRMs, email inboxes, and calendar apps via secure single
            sign-on to assemble your unified lead activity timeline.
          </p>
        </div>

        {/* Global Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-crm-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search CRMs, email, or calendars..."
            className="w-full bg-crm-inner/90 border border-crm-border rounded-xl pl-8 pr-4 py-1.5 text-xs text-crm-text placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50 font-mono transition-all"
          />
        </div>
      </div>

      {/* Main Grid: Sidebar + Sub-dashboard Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* DATA SOURCES SIDEBAR */}
        <div className="lg:col-span-1 space-y-1 p-3 h-fit bg-crm-base/70 border border-crm-border/90 rounded-2xl backdrop-blur-md shadow-lg shadow-black/40">
          <div className="px-3 py-2 text-[10px] font-mono uppercase tracking-wider text-slate-500 border-b border-crm-border mb-1">
            Data Sources
          </div>

          {categories.map((cat) => {
            const Icon = cat.icon;
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-mono transition-all cursor-pointer ${
                  isActive
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                    : "text-crm-text-muted hover:text-crm-text hover:bg-crm-inner/60"
                }`}
              >
                <Icon
                  className={`w-4 h-4 ${
                    isActive ? "text-cyan-400" : "text-slate-500"
                  }`}
                />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* MAIN FEED WITH DISTINCT HEADINGS */}
        <div className="lg:col-span-3 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-crm-text font-mono flex items-center gap-2">
              <History className="w-4 h-4 text-cyan-400" />
              {categories.find((c) => c.id === selectedCategory)?.label} (
              {filteredApps.length})
            </h2>
            <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
              <Clock className="w-3 h-3 text-crm-text-muted" /> Real-time activity
              ordering
            </span>
          </div>

          {/* SECTION 1: CRM PLATFORMS */}
          {crmApps.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-b border-crm-border pb-2">
                <Building2 className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-semibold tracking-wider text-crm-text-muted font-mono uppercase">
                  CRM Platforms ({crmApps.length})
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {crmApps.map(renderCard)}
              </div>
            </div>
          )}

          {/* SECTION 2: WORK & COMMUNICATION APPS */}
          {workApps.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-b border-crm-border pb-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-semibold tracking-wider text-crm-text-muted font-mono uppercase">
                  Communication & Work Apps ({workApps.length})
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {workApps.map(renderCard)}
              </div>
            </div>
          )}

          {filteredApps.length === 0 && (
            <div className="py-12 text-center font-mono text-xs text-slate-500 bg-crm-base/40 rounded-2xl border border-crm-border/60">
              No integrations found matching active category or query.
            </div>
          )}
        </div>
      </div>

      {/* Footer Banner */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-crm-base/70 border border-crm-border/90 rounded-2xl backdrop-blur-md shadow-lg shadow-black/40">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-crm-text">
              Automatic Chronological Aggregation
            </h4>
            <p className="text-[11px] text-crm-text-muted font-mono">
              Events from CRMs, Gmail, and Calendly are timestamped and appended
              sequentially to lead activity feeds.
            </p>
          </div>
        </div>

        <button className="px-3.5 py-1.5 rounded-xl bg-crm-inner hover:bg-crm-surface border border-crm-border text-xs font-mono text-crm-text-muted transition-all cursor-pointer shrink-0">
          Preview Lead Timeline View →
        </button>
      </div>
    </div>
  );
}
