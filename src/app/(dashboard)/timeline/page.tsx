"use client";

import { useState } from "react";
import {
  GitCommit,
  Filter,
  Clock,
  Sparkles,
  PhoneCall,
  Layers,
  Search,
  Calendar,
  User,
  CheckCircle2,
  RefreshCw,
  Radio,
  Code2,
  X,
  Database,
  Activity,
  Zap,
  Copy,
  Check,
  ChevronRight,
} from "lucide-react";

import {
  MultiCrmCard,
  MultiCrmInnerPanel,
  MultiCrmTag,
} from "@/components/ui/MultiCrmCard";

export interface FieldDiff {
  field: string;
  oldValue: string;
  newValue: string;
  winningSource: string;
}

export interface TimelineEvent {
  id: string;
  time: string;
  timestamp: string;
  title: string;
  description: string;
  source:
    | "Salesforce"
    | "HubSpot"
    | "Zoho"
    | "Pipedrive"
    | "Twilio"
    | "AI Copilot";
  variant: "cyan" | "purple" | "magenta" | "neutral";
  type: "sync" | "ai" | "call" | "deal" | "lead";
  icon: any;
  iconColor: string;
  entity: string;
  entityId: string;
  entityEmail?: string;
  entityCompany?: string;
  syncStatus: "success" | "warning" | "error";
  latencyMs: number;
  diffs?: FieldDiff[];
  aiReasoning?: string;
  transcript?: string;
  payload: Record<string, any>;
}

const mockEvents: TimelineEvent[] = [
  {
    id: "evt-101",
    time: "10 minutes ago",
    timestamp: "10:42 AM",
    title: "Bi-Directional Field Sync Completed",
    description:
      "Updated lead record for Sarah Jenkins across Salesforce Enterprise & HubSpot. Resolved 1 field conflict automatically via conflict-resolution rules.",
    source: "Salesforce",
    variant: "cyan",
    type: "sync",
    icon: Layers,
    iconColor: "text-primary-cyan",
    entity: "Sarah Jenkins",
    entityId: "LD-9021",
    entityEmail: "s.jenkins@acme.corp",
    entityCompany: "Acme Corp",
    syncStatus: "success",
    latencyMs: 142,
    diffs: [
      {
        field: "annualRevenue",
        oldValue: "$100,000",
        newValue: "$120,000",
        winningSource: "Salesforce",
      },
      {
        field: "leadStatus",
        oldValue: "Contacted",
        newValue: "Qualified",
        winningSource: "HubSpot",
      },
    ],
    payload: {
      syncedFields: ["email", "annualRevenue", "status"],
      conflictResolved: true,
      conflictField: "annualRevenue",
      winningValue: "$120,000",
      sourceCrm: "Salesforce",
      targetCrm: "HubSpot",
    },
  },
  {
    id: "evt-102",
    time: "25 minutes ago",
    timestamp: "10:27 AM",
    title: "AI Copilot Qualification Upgrade",
    description:
      "AI model rescored David Miller from 72/100 to 88/100 following high-intent sentiment detection during outbound Twilio call transcription.",
    source: "AI Copilot",
    variant: "purple",
    type: "ai",
    icon: Sparkles,
    iconColor: "text-secondary-pink",
    entity: "David Miller",
    entityId: "LD-9022",
    entityEmail: "david@starktech.io",
    entityCompany: "Stark Tech",
    syncStatus: "success",
    latencyMs: 310,
    aiReasoning:
      "Lead mentioned explicit procurement budget for Q3 deployment ($50k+) and requested a direct contract draft within 48 hours.",
    payload: {
      previousScore: 72,
      newScore: 88,
      confidenceRate: "94.8%",
      triggeredKeywords: [
        "pricing tier",
        "procurement budget",
        "Q3 deployment",
      ],
    },
  },
  {
    id: "evt-103",
    time: "1 hour ago",
    timestamp: "09:50 AM",
    title: "Outbound Twilio Call Logged",
    description:
      "Call duration: 12m 45s. Audio recording transcribed and attached to Zoho CRM contact record and unified timeline feed.",
    source: "Twilio",
    variant: "cyan",
    type: "call",
    icon: PhoneCall,
    iconColor: "text-primary-cyan",
    entity: "Elena Rostova",
    entityId: "LD-9023",
    entityEmail: "elena@cyberdyne.com",
    entityCompany: "Cyberdyne Systems",
    syncStatus: "success",
    latencyMs: 88,
    transcript:
      "Rep: 'Hi Elena, following up on the enterprise integration proposal.' Elena: 'Yes, our security team approved the compliance docs yesterday. Let's move to onboarding next Monday.'",
    payload: {
      callDuration: "12m 45s",
      direction: "Outbound",
      transcriptionId: "TX-99482",
      mediaUrl: "s3://voice-records/tx-99482.wav",
    },
  },
  {
    id: "evt-104",
    time: "3 hours ago",
    timestamp: "07:45 AM",
    title: "Pipedrive Deal Stage Shifted",
    description:
      "Moved deal 'Aperture Enterprise Expansion' to 'Proposal Sent' stage with pipeline value $32,000.",
    source: "Pipedrive",
    variant: "purple",
    type: "deal",
    icon: GitCommit,
    iconColor: "text-secondary-pink",
    entity: "Marcus Vance",
    entityId: "LD-9024",
    entityEmail: "mvance@aperture.com",
    entityCompany: "Aperture Labs",
    syncStatus: "warning",
    latencyMs: 512,
    payload: {
      dealId: "DEAL-883",
      previousStage: "Qualified Lead",
      newStage: "Proposal Sent",
      pipelineValue: "$32,000",
      warningNote: "Webhook response delayed by 400ms",
    },
  },
  {
    id: "evt-105",
    time: "5 hours ago",
    timestamp: "05:30 AM",
    title: "HubSpot Form Submission Ingested",
    description:
      "New inbound lead captured via website contact form. Automatically deduplicated against existing Salesforce contacts.",
    source: "HubSpot",
    variant: "magenta",
    type: "lead",
    icon: CheckCircle2,
    iconColor: "text-primary-cyan",
    entity: "Rachel Chen",
    entityId: "LD-9025",
    entityEmail: "r.chen@wayne.com",
    entityCompany: "Wayne Enterprises",
    syncStatus: "success",
    latencyMs: 95,
    payload: {
      formName: "Enterprise Demo Request",
      utmSource: "google_ads",
      deduplicated: true,
      masterRecordId: "LD-9025",
    },
  },
];

export default function TimelinePage() {
  const [events, setEvents] = useState<TimelineEvent[]>(mockEvents);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSource, setFilterSource] = useState("All");
  const [filterType, setFilterType] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");

  const [isLiveIngestion, setIsLiveIngestion] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedPayloadEvent, setSelectedPayloadEvent] =
    useState<TimelineEvent | null>(null);
  const [drawerEvent, setDrawerEvent] = useState<TimelineEvent | null>(null);
  const [drawerTab, setDrawerTab] = useState<"overview" | "diffs" | "raw">(
    "overview"
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleRefreshStream = async () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 650);
  };

  const handleCopyId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleInspectPayloadClick = (
    evt: TimelineEvent,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    setSelectedPayloadEvent(evt);
  };

  const filteredEvents = events.filter((evt) => {
    const matchesSearch =
      evt.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evt.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evt.entity.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evt.id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSource =
      filterSource === "All" ||
      evt.source.toLowerCase() === filterSource.toLowerCase();

    const matchesType =
      filterType === "All" ||
      evt.type.toLowerCase() === filterType.toLowerCase();

    const matchesStatus =
      filterStatus === "All" || evt.syncStatus === filterStatus;

    return matchesSearch && matchesSource && matchesType && matchesStatus;
  });

  const totalEvents = events.length;
  const avgLatency = Math.round(
    events.reduce((acc, curr) => acc + curr.latencyMs, 0) / totalEvents
  );
  const successRate = Math.round(
    (events.filter((e) => e.syncStatus === "success").length / totalEvents) *
      100
  );

  return (
    <div className="space-y-6 font-sans text-crm-text relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <GitCommit className="w-5 h-5 text-primary-cyan" />
            <h1 className="text-2xl font-bold tracking-tight text-crm-text">
              Aggregation Timeline
            </h1>
          </div>
          <p className="text-xs text-crm-text-muted font-mono mt-1">
            Real-time multi-CRM event stream, automated AI actions, and field
            conflict logs.
          </p>
        </div>

        {/* Live Controls */}
        <div className="flex items-center gap-3 font-mono text-xs">
          <button
            onClick={() => setIsLiveIngestion(!isLiveIngestion)}
            className={`px-3 py-1.5 rounded-xl border transition-all flex items-center gap-2 cursor-pointer ${
              isLiveIngestion
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : "bg-crm-inner border-crm-border-strong text-crm-text-muted"
            }`}
          >
            <Radio
              className={`w-3.5 h-3.5 ${
                isLiveIngestion ? "animate-pulse text-emerald-400" : ""
              }`}
            />
            {isLiveIngestion ? "Live Streaming: Active" : "Stream Paused"}
          </button>

          <button
            onClick={handleRefreshStream}
            disabled={isRefreshing}
            className="p-2 rounded-xl bg-crm-surface border border-primary-cyan/30 text-crm-text-muted hover:text-white hover:border-primary-cyan/60 transition-all cursor-pointer shadow-inner"
            title="Refresh Timeline Feed"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-primary-cyan ${
                isRefreshing ? "animate-spin" : ""
              }`}
            />
          </button>
        </div>
      </div>

      {/* Telemetry Quick Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MultiCrmCard className="p-3.5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono text-crm-text-muted block uppercase">
              Total Ingested
            </span>
            <span className="text-lg font-bold font-mono text-crm-text">
              {totalEvents} Events
            </span>
          </div>
          <Activity className="w-5 h-5 text-primary-cyan opacity-80" />
        </MultiCrmCard>

        <MultiCrmCard className="p-3.5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono text-crm-text-muted block uppercase">
              Sync Success Rate
            </span>
            <span className="text-lg font-bold font-mono text-emerald-400">
              {successRate}%
            </span>
          </div>
          <Zap className="w-5 h-5 text-emerald-400 opacity-80" />
        </MultiCrmCard>

        <MultiCrmCard className="p-3.5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono text-crm-text-muted block uppercase">
              Avg Sync Latency
            </span>
            <span className="text-lg font-bold font-mono text-secondary-pink">
              {avgLatency} ms
            </span>
          </div>
          <Clock className="w-5 h-5 text-secondary-pink opacity-80" />
        </MultiCrmCard>

        <MultiCrmCard className="p-3.5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono text-crm-text-muted block uppercase">
              Active Connectors
            </span>
            <span className="text-lg font-bold font-mono text-crm-text">
              6 Platforms
            </span>
          </div>
          <Database className="w-5 h-5 text-primary-cyan opacity-80" />
        </MultiCrmCard>
      </div>

      {/* Controls & Filter Hub */}
      <MultiCrmCard className="p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-crm-border-strong pb-2.5 font-mono text-xs">
          <span className="font-bold text-crm-text-muted flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-primary-cyan" /> Stream Controls
            & Filtering
          </span>
          <span className="text-[10px] text-slate-500">
            Showing {filteredEvents.length} of {events.length} events
          </span>
        </div>

        <div className="flex flex-col lg:flex-row items-center justify-between gap-4 font-mono text-xs">
          {/* Search */}
          <div className="relative w-full lg:w-72">
            <Search className="w-3.5 h-3.5 text-crm-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search event, entity, ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-crm-inner border border-crm-border-strong rounded-xl pl-9 pr-4 py-2 text-xs text-crm-text placeholder-slate-500 focus:outline-none focus:border-primary-cyan/50 shadow-inner"
            />
          </div>

          {/* Source Platform Filter */}
          <div className="flex items-center gap-1.5 w-full lg:w-auto overflow-x-auto scrollbar-thin">
            <span className="text-[11px] text-slate-500 mr-1 shrink-0">
              CRM:
            </span>
            {[
              "All",
              "Salesforce",
              "HubSpot",
              "Zoho",
              "Pipedrive",
              "Twilio",
              "AI Copilot",
            ].map((src) => (
              <button
                key={src}
                onClick={() => setFilterSource(src)}
                className={`px-2.5 py-1 rounded-xl text-xs transition-all whitespace-nowrap cursor-pointer ${
                  filterSource === src
                    ? "bg-primary-cyan/20 text-primary-cyan border border-primary-cyan/40 font-semibold shadow-[0_0_12px_color-mix(in_srgb,var(--color-primary-cyan)_15%,transparent)]"
                    : "text-crm-text-muted hover:text-crm-text hover:bg-crm-inner"
                }`}
              >
                {src}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[11px] text-slate-500 mr-1">Health:</span>
            {[
              { label: "All", value: "All" },
              { label: "Success", value: "success" },
              { label: "Warning", value: "warning" },
            ].map((st) => (
              <button
                key={st.value}
                onClick={() => setFilterStatus(st.value)}
                className={`px-2 py-1 rounded-lg text-[11px] transition-all cursor-pointer ${
                  filterStatus === st.value
                    ? "bg-white/15 text-white border border-white/30 font-semibold"
                    : "text-crm-text-muted hover:text-crm-text"
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>
      </MultiCrmCard>

      {/* Main Vertical Timeline Feed */}
      <MultiCrmCard className="p-6 relative">
        <div className="absolute left-7.5 md:left-9.5 top-10 bottom-10 w-0.5 bg-white/10" />

        <div className="space-y-6">
          {filteredEvents.map((evt) => {
            const Icon = evt.icon;
            const isSelected = drawerEvent?.id === evt.id;

            return (
              <div
                key={evt.id}
                onClick={() => {
                  setDrawerEvent(evt);
                  setDrawerTab("overview");
                }}
                className="relative flex items-start gap-4 md:gap-6 group cursor-pointer"
              >
                {/* Event Node Icon */}
                <div
                  className={`z-10 p-2.5 rounded-xl bg-crm-inner border transition-all shrink-0 shadow-inner ${
                    isSelected
                      ? "border-primary-cyan ring-2 ring-primary-cyan/30"
                      : "border-crm-border-strong group-hover:border-primary-cyan/50"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${evt.iconColor}`} />
                </div>

                {/* Event Content Panel */}
                <MultiCrmInnerPanel
                  className={`flex-1 space-y-3 transition-all p-4 ${
                    isSelected
                      ? "border-primary-cyan bg-crm-surface/90 shadow-[0_0_20px_color-mix(in_srgb,var(--color-primary-cyan)_10%,transparent)]"
                      : "hover:border-primary-cyan/40"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-crm-border-strong pb-3">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-crm-text group-hover:text-primary-cyan transition-colors">
                        {evt.title}
                      </h3>
                      <MultiCrmTag variant={evt.variant}>
                        {evt.source}
                      </MultiCrmTag>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] font-mono text-crm-text-muted">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        {evt.timestamp} ({evt.time})
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold font-mono ${
                          evt.syncStatus === "success"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        }`}
                      >
                        {evt.latencyMs}ms
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>

                  <p className="text-xs text-crm-text-muted leading-relaxed font-sans">
                    {evt.description}
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-crm-border text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-slate-500" />
                      <span className="text-[11px] text-crm-text font-medium">
                        {evt.entity}{" "}
                        {evt.entityCompany ? `(${evt.entityCompany})` : ""}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        ({evt.entityId})
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => handleCopyId(evt.id, e)}
                        className="px-2 py-1 rounded bg-crm-inner hover:bg-crm-surface text-crm-text-muted hover:text-crm-text text-[10px] flex items-center gap-1 border border-crm-border transition-all cursor-pointer"
                        title="Copy Event ID"
                      >
                        {copiedId === evt.id ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        {evt.id}
                      </button>

                      <button
                        onClick={(e) => handleInspectPayloadClick(evt, e)}
                        className="px-2.5 py-1 rounded-lg bg-crm-inner hover:bg-crm-surface text-primary-cyan hover:text-white border border-crm-border-strong text-[10px] flex items-center gap-1.5 transition-all cursor-pointer shadow-inner"
                      >
                        <Code2 className="w-3 h-3 text-primary-cyan" /> Inspect
                        Payload
                      </button>
                    </div>
                  </div>
                </MultiCrmInnerPanel>
              </div>
            );
          })}

          {filteredEvents.length === 0 && (
            <div className="text-center py-12 space-y-2 font-mono">
              <p className="text-xs text-crm-text-muted">
                No events matched the current filter conditions.
              </p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setFilterSource("All");
                  setFilterType("All");
                  setFilterStatus("All");
                }}
                className="text-xs text-primary-cyan hover:underline cursor-pointer"
              >
                Reset All Filters
              </button>
            </div>
          )}
        </div>
      </MultiCrmCard>

      {/* SECONDARY VIEW: SLIDE-OVER EVENT DETAIL DRAWER */}
      {drawerEvent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-xl bg-crm-surface border-l border-primary-cyan/30 h-full p-6 space-y-6 overflow-y-auto font-sans shadow-2xl animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="flex items-start justify-between border-b border-crm-border-strong pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <MultiCrmTag variant={drawerEvent.variant}>
                    {drawerEvent.source}
                  </MultiCrmTag>
                  <span className="text-xs font-mono text-crm-text-muted">
                    {drawerEvent.id}
                  </span>
                </div>
                <h2 className="text-base font-bold text-crm-text">
                  {drawerEvent.title}
                </h2>
              </div>

              <button
                onClick={() => setDrawerEvent(null)}
                className="p-1.5 rounded-lg bg-crm-inner hover:bg-white/10 text-crm-text-muted hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-crm-border-strong pb-2 font-mono text-xs">
              <button
                onClick={() => setDrawerTab("overview")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  drawerTab === "overview"
                    ? "bg-primary-cyan/20 text-primary-cyan border border-primary-cyan/40 font-semibold"
                    : "text-crm-text-muted hover:text-crm-text"
                }`}
              >
                Overview & Context
              </button>

              {drawerEvent.diffs && (
                <button
                  onClick={() => setDrawerTab("diffs")}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    drawerTab === "diffs"
                      ? "bg-secondary-pink/20 text-secondary-pink border border-secondary-pink/40 font-semibold"
                      : "text-crm-text-muted hover:text-crm-text"
                  }`}
                >
                  Field Diffs ({drawerEvent.diffs.length})
                </button>
              )}

              <button
                onClick={() => setDrawerTab("raw")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  drawerTab === "raw"
                    ? "bg-white/15 text-white border border-white/30 font-semibold"
                    : "text-crm-text-muted hover:text-crm-text"
                }`}
              >
                Raw JSON
              </button>
            </div>

            {/* TAB CONTENT: OVERVIEW */}
            {drawerTab === "overview" && (
              <div className="space-y-5">
                {/* Entity Summary Card */}
                <MultiCrmInnerPanel className="p-4 space-y-3">
                  <span className="text-[11px] font-mono text-crm-text-muted uppercase tracking-wider block">
                    Associated Lead / Entity Context
                  </span>
                  <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                    <div>
                      <span className="text-slate-500 block text-[10px]">
                        Contact Name
                      </span>
                      <span className="text-crm-text font-semibold">
                        {drawerEvent.entity}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">
                        Company / Account
                      </span>
                      <span className="text-crm-text font-semibold">
                        {drawerEvent.entityCompany || "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">
                        Email Address
                      </span>
                      <span className="text-primary-cyan">
                        {drawerEvent.entityEmail || "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">
                        System Entity ID
                      </span>
                      <span className="text-crm-text-muted">
                        {drawerEvent.entityId}
                      </span>
                    </div>
                  </div>
                </MultiCrmInnerPanel>

                {/* AI / Transcript Content if available */}
                {drawerEvent.aiReasoning && (
                  <MultiCrmInnerPanel className="p-4 space-y-2 border-secondary-pink/30 bg-secondary-pink/5">
                    <span className="text-xs font-mono text-secondary-pink font-semibold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" /> AI Copilot Logic
                    </span>
                    <p className="text-xs text-crm-text leading-relaxed font-sans">
                      {drawerEvent.aiReasoning}
                    </p>
                  </MultiCrmInnerPanel>
                )}

                {drawerEvent.transcript && (
                  <MultiCrmInnerPanel className="p-4 space-y-2 border-primary-cyan/30">
                    <span className="text-xs font-mono text-primary-cyan font-semibold flex items-center gap-1.5">
                      <PhoneCall className="w-3.5 h-3.5" /> Transcribed Audio
                      Excerpt
                    </span>
                    <p className="text-xs text-crm-text-muted italic leading-relaxed font-sans bg-black/30 p-3 rounded-lg border border-crm-border">
                      "{drawerEvent.transcript}"
                    </p>
                  </MultiCrmInnerPanel>
                )}

                {/* Performance Metrics */}
                <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                  <div className="p-3 rounded-xl bg-crm-inner border border-crm-border-strong">
                    <span className="text-slate-500 block text-[10px]">
                      Execution Latency
                    </span>
                    <span className="text-emerald-400 font-semibold">
                      {drawerEvent.latencyMs} ms
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-crm-inner border border-crm-border-strong">
                    <span className="text-slate-500 block text-[10px]">
                      Sync Status
                    </span>
                    <span className="text-emerald-400 font-semibold capitalize">
                      {drawerEvent.syncStatus}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: FIELD DIFFS */}
            {drawerTab === "diffs" && drawerEvent.diffs && (
              <div className="space-y-3 font-mono text-xs">
                <span className="text-[11px] text-crm-text-muted block">
                  Field conflicts detected and synced bi-directionally across
                  integrated CRMs:
                </span>
                <div className="space-y-2">
                  {drawerEvent.diffs.map((diff, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-xl bg-crm-inner border border-crm-border-strong space-y-2"
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-primary-cyan font-bold">
                          {diff.field}
                        </span>
                        <span className="text-emerald-400 text-[10px] bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          Winner: {diff.winningSource}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div className="p-2 bg-black/40 rounded border border-red-500/20">
                          <span className="text-slate-500 block">
                            Previous State
                          </span>
                          <span className="text-red-400 line-through">
                            {diff.oldValue}
                          </span>
                        </div>
                        <div className="p-2 bg-black/40 rounded border border-emerald-500/20">
                          <span className="text-slate-500 block">
                            Updated State
                          </span>
                          <span className="text-emerald-400">
                            {diff.newValue}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB CONTENT: RAW PAYLOAD */}
            {drawerTab === "raw" && (
              <div className="space-y-3 font-mono text-xs">
                <span className="text-crm-text-muted text-[11px] block">
                  Inbound Webhook / API Payload
                </span>
                <pre className="p-4 bg-black/70 rounded-xl border border-crm-border-strong text-emerald-400 text-[11px] overflow-x-auto max-h-80 scrollbar-thin">
                  {JSON.stringify(drawerEvent.payload, null, 2)}
                </pre>
              </div>
            )}

            {/* Action Footer */}
            <div className="pt-4 border-t border-crm-border-strong flex items-center justify-between font-mono text-xs">
              <button
                onClick={() => setDrawerEvent(null)}
                className="px-4 py-2 rounded-xl bg-crm-inner border border-crm-border-strong text-crm-text-muted hover:text-white cursor-pointer"
              >
                Close Drawer
              </button>

              <button
                onClick={() =>
                  alert(`Triggering manual re-sync for ${drawerEvent.id}`)
                }
                className="px-4 py-2 rounded-xl bg-primary-cyan/20 border border-primary-cyan/40 text-primary-cyan hover:bg-primary-cyan/30 flex items-center gap-1.5 transition-all cursor-pointer font-semibold"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Re-trigger Event
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RAW PAYLOAD INSPECTOR MODAL */}
      {selectedPayloadEvent && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <MultiCrmCard className="w-full max-w-xl p-6 space-y-4 relative border border-primary-cyan/40 shadow-2xl">
            <div className="flex items-center justify-between border-b border-crm-border-strong pb-3 font-mono">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-primary-cyan" />
                <h3 className="text-sm font-bold text-crm-text">
                  Payload Metadata Inspector — {selectedPayloadEvent.id}
                </h3>
              </div>
              <button
                onClick={() => setSelectedPayloadEvent(null)}
                className="text-crm-text-muted hover:text-crm-text p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="grid grid-cols-3 gap-2 text-[11px]">
                <div className="p-2 bg-crm-inner rounded-lg border border-crm-border-strong">
                  <span className="text-slate-500 block text-[10px]">
                    Source CRM
                  </span>
                  <span className="text-crm-text font-semibold">
                    {selectedPayloadEvent.source}
                  </span>
                </div>
                <div className="p-2 bg-crm-inner rounded-lg border border-crm-border-strong">
                  <span className="text-slate-500 block text-[10px]">
                    Execution Latency
                  </span>
                  <span className="text-emerald-400 font-semibold">
                    {selectedPayloadEvent.latencyMs} ms
                  </span>
                </div>
                <div className="p-2 bg-crm-inner rounded-lg border border-crm-border-strong">
                  <span className="text-slate-500 block text-[10px]">
                    Entity Reference
                  </span>
                  <span className="text-primary-cyan font-semibold">
                    {selectedPayloadEvent.entityId}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-crm-text-muted text-[11px] block mb-1">
                  JSON Payload & Diff Data
                </span>
                <pre className="p-3 bg-black/70 rounded-xl border border-crm-border-strong text-emerald-400 text-[11px] font-mono overflow-x-auto max-h-60 scrollbar-thin">
                  {JSON.stringify(selectedPayloadEvent.payload, null, 2)}
                </pre>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-crm-border-strong font-mono text-xs">
              <button
                onClick={() => setSelectedPayloadEvent(null)}
                className="px-4 py-1.5 rounded-xl bg-crm-inner border border-crm-border-strong text-crm-text-muted hover:text-crm-text cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </MultiCrmCard>
        </div>
      )}
    </div>
  );
}
