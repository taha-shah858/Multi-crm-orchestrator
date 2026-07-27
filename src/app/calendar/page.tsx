"use client";

import { useState } from "react";
import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
  Users,
  Video,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Tag,
  Sparkles,
  PhoneCall,
} from "lucide-react";
import {
  ZenithCard,
  ZenithInnerPanel,
  ZenithTag,
} from "@/components/ui/ZenithCard";

const events = [
  {
    id: "evt-1",
    title: "Enterprise Demo — Acme Corp",
    time: "10:00 AM - 11:00 AM",
    date: "2026-07-21",
    type: "Demo",
    crm: "Salesforce",
    crmVariant: "cyan" as const,
    attendee: "Sarah Jenkins",
    location: "Google Meet",
    status: "Confirmed",
    aiNotes: "Focus on multi-instance data isolation & SOC2 compliance.",
  },
  {
    id: "evt-2",
    title: "Outbound Discovery Call",
    time: "01:30 PM - 02:00 PM",
    date: "2026-07-21",
    type: "Call",
    crm: "HubSpot",
    crmVariant: "neutral" as const,
    attendee: "David Miller",
    location: "Twilio Smart Dialer",
    status: "Scheduled",
    aiNotes: "High intent signal detected during last portal visit.",
  },
  {
    id: "evt-3",
    title: "Automated Global CRM Re-Index",
    time: "04:00 PM - 04:15 PM",
    date: "2026-07-21",
    type: "System Sync",
    crm: "System Engine",
    crmVariant: "purple" as const,
    attendee: "System Pipeline",
    location: "Background Service",
    status: "Automated",
    aiNotes: "Scheduled nightly conflict resolution run.",
  },
  {
    id: "evt-4",
    title: "Contract Review — Wayne Ent.",
    time: "11:00 AM - 12:00 PM",
    date: "2026-07-22",
    type: "Closing",
    crm: "Salesforce",
    crmVariant: "cyan" as const,
    attendee: "Rachel Chen",
    location: "Zoom Video",
    status: "Confirmed",
    aiNotes: "Deal size: $210,000. Legal team approved SLA.",
  },
];

export default function CalendarPage() {
  const [currentDate] = useState("July 2026");
  const [selectedFilter, setSelectedFilter] = useState("All");

  const filteredEvents = events.filter((evt) => {
    if (selectedFilter === "All") return true;
    return evt.type.toLowerCase() === selectedFilter.toLowerCase();
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-primary-cyan" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-100">
              Calendar & Schedule Planner
            </h1>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Unified cross-CRM meeting scheduler, Twilio demo slots, and system
            sync windows.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button className="px-4 py-2 rounded-xl bg-zenith-surface border border-primary-cyan/30 text-xs font-mono text-slate-300 hover:text-white hover:border-primary-cyan/60 transition-all flex items-center gap-2 shadow-inner">
            <Clock className="w-3.5 h-3.5 text-primary-cyan" />
            Timezone: UTC-5
          </button>
          <button className="btn-zenith-primary px-4 py-2 rounded-xl text-xs flex items-center gap-2">
            <Plus className="w-3.5 h-3.5" />
            Schedule Event
          </button>
        </div>
      </div>

      {/* Calendar Controls & Month Bar */}
      <ZenithCard className="flex flex-col md:flex-row items-center justify-between gap-4 p-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-zenith-inner rounded-xl p-1 border border-slate-800">
            <button className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-all">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-xs font-mono font-bold text-slate-200">
              {currentDate}
            </span>
            <button className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-all">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Today: July 21, 2026
          </span>
        </div>

        {/* Filter Categories */}
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
          {["All", "Demo", "Call", "Closing", "System Sync"].map((filter) => (
            <button
              key={filter}
              onClick={() => setSelectedFilter(filter)}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all whitespace-nowrap ${
                selectedFilter === filter
                  ? "bg-primary-cyan/20 text-primary-cyan border border-primary-cyan/30 shadow-[0_0_15px_rgba(0,242,255,0.15)]"
                  : "text-slate-400 hover:text-slate-200 hover:bg-zenith-inner"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </ZenithCard>

      {/* Schedule Feed Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Today's Timeline Items (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <h2 className="text-sm font-semibold text-slate-200 font-mono flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary-cyan" />
            Upcoming Agenda (Today & Tomorrow)
          </h2>

          <div className="space-y-4">
            {filteredEvents.map((evt) => (
              <ZenithCard key={evt.id} className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-primary-cyan/15 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-zenith-inner border border-slate-800">
                      {evt.type === "Call" ? (
                        <PhoneCall className="w-4 h-4 text-emerald-400" />
                      ) : evt.type === "Demo" ? (
                        <Video className="w-4 h-4 text-primary-cyan" />
                      ) : (
                        <Sparkles className="w-4 h-4 text-tertiary-purple" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-100">
                        {evt.title}
                      </h3>
                      <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400 mt-0.5">
                        <span>{evt.time}</span>
                        <span>•</span>
                        <span className="text-slate-300">{evt.location}</span>
                      </div>
                    </div>
                  </div>

                  <ZenithTag variant={evt.crmVariant}>{evt.crm}</ZenithTag>
                </div>

                {/* Event Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                  <ZenithInnerPanel className="flex items-center gap-2 py-3">
                    <Users className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-slate-400">Attendee:</span>
                    <span className="text-slate-200 font-medium">
                      {evt.attendee}
                    </span>
                  </ZenithInnerPanel>

                  <ZenithInnerPanel className="flex items-center gap-2 py-3">
                    <Tag className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-slate-400">Status:</span>
                    <span className="text-emerald-400 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> {evt.status}
                    </span>
                  </ZenithInnerPanel>
                </div>

                {/* AI Preparation Brief */}
                <div className="p-3 rounded-xl bg-tertiary-purple/10 border border-tertiary-purple/20 flex items-start gap-2.5 text-xs shadow-inner">
                  <Sparkles className="w-4 h-4 text-tertiary-purple shrink-0 mt-0.5" />
                  <div>
                    <span className="font-mono text-[10px] text-tertiary-purple font-semibold block">
                      AI COPILOT PREP BRIEF
                    </span>
                    <p className="text-slate-300 text-[11px] mt-0.5 font-mono">
                      {evt.aiNotes}
                    </p>
                  </div>
                </div>
              </ZenithCard>
            ))}
          </div>
        </div>

        {/* Right Column: Mini Calendar Overview + Sync Windows (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <ZenithCard className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-200 border-b border-primary-cyan/15 pb-3">
              Automated Sync Schedule
            </h3>

            <div className="space-y-3 font-mono text-xs">
              {[
                {
                  name: "Salesforce Delta Sync",
                  interval: "Every 5 mins",
                  status: "Active",
                },
                {
                  name: "HubSpot Lead Ingestion",
                  interval: "Real-time Webhook",
                  status: "Active",
                },
                {
                  name: "Zoho Batch Reconciliation",
                  interval: "Hourly (00:00)",
                  status: "Active",
                },
              ].map((sync, i) => (
                <ZenithInnerPanel
                  key={i}
                  className="flex items-center justify-between py-3"
                >
                  <div>
                    <p className="text-slate-200 font-medium text-[11px]">
                      {sync.name}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {sync.interval}
                    </p>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                </ZenithInnerPanel>
              ))}
            </div>
          </ZenithCard>
        </div>
      </div>
    </div>
  );
}
