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
} from "lucide-react";
import {
  ZenithCard,
  ZenithInnerPanel,
  ZenithTag,
} from "@/components/ui/ZenithCard";

const timelineEvents = [
  {
    id: "evt-101",
    time: "10 minutes ago",
    timestamp: "10:42 AM",
    title: "Bi-Directional Field Sync Completed",
    description:
      "Updated lead record for Sarah Jenkins across Salesforce Enterprise & HubSpot. Resolved 1 field conflict automatically.",
    source: "Salesforce",
    variant: "cyan" as const,
    type: "sync",
    icon: Layers,
    iconColor: "text-primary-cyan",
    entity: "Sarah Jenkins (Acme Corp)",
  },
  {
    id: "evt-102",
    time: "25 minutes ago",
    timestamp: "10:27 AM",
    title: "AI Copilot Qualification Upgrade",
    description:
      "AI model rescored David Miller from 72/100 to 88/100 following high-intent sentiment detection during outbound Twilio call.",
    source: "AI Copilot",
    variant: "purple" as const,
    type: "ai",
    icon: Sparkles,
    iconColor: "text-accent-violet",
    entity: "David Miller (Stark Tech)",
  },
  {
    id: "evt-103",
    time: "1 hour ago",
    timestamp: "09:50 AM",
    title: "Outbound Twilio Call Logged",
    description:
      "Call duration: 12m 45s. Audio recording transcribed and attached to Zoho CRM contact record.",
    source: "Twilio",
    variant: "cyan" as const,
    type: "call",
    icon: PhoneCall,
    iconColor: "text-emerald-400",
    entity: "Elena Rostova (Cyberdyne Systems)",
  },
  {
    id: "evt-104",
    time: "3 hours ago",
    timestamp: "07:45 AM",
    title: "Pipedrive Deal Stage Shifted",
    description:
      "Moved deal 'Aperture Enterprise Expansion' to 'Proposal Sent' stage with pipeline value $32,000.",
    source: "Pipedrive",
    variant: "purple" as const,
    type: "deal",
    icon: GitCommit,
    iconColor: "text-purple-400",
    entity: "Marcus Vance (Aperture Labs)",
  },
  {
    id: "evt-105",
    time: "5 hours ago",
    timestamp: "05:30 AM",
    title: "HubSpot Form Submission Ingested",
    description:
      "New inbound lead captured via website contact form. Automatically deduplicated against existing Salesforce contacts.",
    source: "HubSpot",
    variant: "magenta" as const,
    type: "lead",
    icon: CheckCircle2,
    iconColor: "text-amber-400",
    entity: "Rachel Chen (Wayne Enterprises)",
  },
];

export default function TimelinePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSource, setFilterSource] = useState("All");

  const filteredEvents = timelineEvents.filter((evt) => {
    const matchesSearch =
      evt.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evt.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evt.entity.toLowerCase().includes(searchQuery.toLowerCase());

    if (filterSource === "All") return matchesSearch;
    return (
      matchesSearch && evt.source.toLowerCase() === filterSource.toLowerCase()
    );
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <GitCommit className="w-5 h-5 text-primary-cyan" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-100">
              Aggregation Timeline
            </h1>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Unified chronological stream of all cross-CRM events, calls, and AI
            actions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <ZenithInnerPanel className="px-3 py-1.5 rounded-xl text-xs font-mono text-slate-300 flex items-center gap-2 shadow-inner">
            <Clock className="w-3.5 h-3.5 text-primary-cyan" />
            Live Ingestion: Active
          </ZenithInnerPanel>
        </div>
      </div>

      {/* Controls & Search Toolbar */}
      <ZenithCard className="flex flex-col md:flex-row items-center justify-between gap-4 p-3">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search events, entities, descriptions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zenith-inner border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-primary-cyan/50 font-mono transition-all shadow-inner"
          />
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          <span className="text-[11px] font-mono text-slate-500 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Filter:
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
              className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all whitespace-nowrap ${
                filterSource === src
                  ? "bg-primary-cyan/20 text-primary-cyan border border-primary-cyan/30 shadow-[0_0_15px_rgba(0,242,255,0.15)]"
                  : "text-slate-400 hover:text-slate-200 hover:bg-zenith-inner"
              }`}
            >
              {src}
            </button>
          ))}
        </div>
      </ZenithCard>

      {/* Vertical Timeline Feed */}
      <ZenithCard className="p-6 relative">
        {/* Vertical Guide Line */}
        <div className="absolute left-7.75 md:left-9.75 top-10 bottom-10 w-0.5 bg-slate-800/80" />

        <div className="space-y-8">
          {filteredEvents.map((evt) => {
            const Icon = evt.icon;
            return (
              <div
                key={evt.id}
                className="relative flex items-start gap-4 md:gap-6 group"
              >
                {/* Event Icon Node */}
                <div className="z-10 p-2.5 rounded-xl bg-zenith-inner border border-slate-800 group-hover:border-primary-cyan/50 transition-all shrink-0 shadow-inner">
                  <Icon className={`w-4 h-4 ${evt.iconColor}`} />
                </div>

                {/* Content Card */}
                <ZenithInnerPanel className="flex-1 space-y-3 hover:border-primary-cyan/40 transition-all">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-primary-cyan/15 pb-3">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-slate-100">
                        {evt.title}
                      </h3>
                      <ZenithTag variant={evt.variant}>{evt.source}</ZenithTag>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500">
                      <Calendar className="w-3 h-3" />
                      <span>{evt.timestamp}</span>
                      <span>•</span>
                      <span>{evt.time}</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {evt.description}
                  </p>

                  <div className="flex items-center justify-between pt-2 text-xs font-mono text-slate-400">
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <User className="w-3.5 h-3.5 text-slate-500" />
                      <span className="text-[11px] font-medium">
                        {evt.entity}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500">
                      ID: {evt.id}
                    </span>
                  </div>
                </ZenithInnerPanel>
              </div>
            );
          })}
        </div>
      </ZenithCard>
    </div>
  );
}
