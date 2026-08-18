"use client";

import { useState } from "react";
import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
  Users,
  Video,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  PhoneCall,
  Search,
  Filter,
  CheckCircle2,
  CalendarDays,
  Link2,
  ExternalLink,
  SlidersHorizontal,
  X,
  AlertCircle,
  Briefcase,
  LayoutGrid,
  ListOrdered,
  Columns3,
  Kanban,
  ArrowUpRight,
} from "lucide-react";
import {
  MultiCrmCard,
  MultiCrmInnerPanel,
  MultiCrmTag,
} from "@/components/ui/MultiCrmCard";

interface CalendarEvent {
  id: string;
  title: string;
  startTime: string; // e.g., "10:00 AM"
  endTime: string; // e.g., "11:00 AM"
  date: string; // YYYY-MM-DD
  dayOfWeek: number; // 0-6 (Sun-Sat)
  hourSlot: number; // 24h format for grid positioning (e.g. 10)
  type: "Demo" | "Call" | "Closing" | "System Sync" | "Calendly";
  crm: "Salesforce" | "HubSpot" | "Zoho" | "Calendly" | "System Engine";
  crmVariant: "cyan" | "magenta" | "purple" | "neutral";
  attendee: string;
  location: string;
  status: "Confirmed" | "Scheduled" | "Automated";
  aiNotes?: string;
}

const sampleEvents: CalendarEvent[] = [
  {
    id: "evt-1",
    title: "Enterprise Demo — Acme Corp",
    startTime: "10:00 AM",
    endTime: "11:00 AM",
    date: "2026-08-03",
    dayOfWeek: 1, // Mon
    hourSlot: 10,
    type: "Demo",
    crm: "Salesforce",
    crmVariant: "cyan",
    attendee: "Sarah Jenkins",
    location: "Google Meet",
    status: "Confirmed",
    aiNotes: "Focus on multi-instance data isolation & SOC2 compliance.",
  },
  {
    id: "evt-2",
    title: "Outbound Discovery Call",
    startTime: "01:30 PM",
    endTime: "02:00 PM",
    date: "2026-08-03",
    dayOfWeek: 1, // Mon
    hourSlot: 13,
    type: "Call",
    crm: "HubSpot",
    crmVariant: "neutral",
    attendee: "David Miller",
    location: "Twilio Smart Dialer",
    status: "Scheduled",
    aiNotes: "High intent signal detected during last portal visit.",
  },
  {
    id: "evt-3",
    title: "Calendly: Strategy Sync w/ Tech Lead",
    startTime: "02:00 PM",
    endTime: "02:30 PM",
    date: "2026-08-04",
    dayOfWeek: 2, // Tue
    hourSlot: 14,
    type: "Calendly",
    crm: "Calendly",
    crmVariant: "magenta",
    attendee: "Alex Rivera",
    location: "Calendly / Zoom",
    status: "Confirmed",
    aiNotes: "Booked via personal Calendly page. Auto-synchronized to CRM.",
  },
  {
    id: "evt-4",
    title: "Contract Review — Wayne Ent.",
    startTime: "11:00 AM",
    endTime: "12:00 PM",
    date: "2026-08-06",
    dayOfWeek: 4, // Thu
    hourSlot: 11,
    type: "Closing",
    crm: "Salesforce",
    crmVariant: "cyan",
    attendee: "Rachel Chen",
    location: "Zoom Video",
    status: "Confirmed",
    aiNotes: "Deal size: $210,000. Legal team approved SLA.",
  },
  {
    id: "evt-5",
    title: "Quarterly Pipeline Review",
    startTime: "04:00 PM",
    endTime: "05:00 PM",
    date: "2026-08-07",
    dayOfWeek: 5, // Fri
    hourSlot: 16,
    type: "System Sync",
    crm: "Zoho",
    crmVariant: "purple",
    attendee: "Internal Leadership",
    location: "Boardroom A",
    status: "Automated",
    aiNotes: "Automated aggregation from multi-CRM sync engine.",
  },
];

const timeSlots = [
  "7 am",
  "8 am",
  "9 am",
  "10 am",
  "11 am",
  "12 pm",
  "1 pm",
  "2 pm",
  "3 pm",
  "4 pm",
  "5 pm",
  "6 pm",
];

const daysOfWeek = [
  { name: "Sun", date: "2", fullDate: "2026-08-02", idx: 0 },
  { name: "Mon", date: "3", fullDate: "2026-08-03", idx: 1, isToday: true },
  { name: "Tue", date: "4", fullDate: "2026-08-04", idx: 2 },
  { name: "Wed", date: "5", fullDate: "2026-08-05", idx: 3 },
  { name: "Thu", date: "6", fullDate: "2026-08-06", idx: 4 },
  { name: "Fri", date: "7", fullDate: "2026-08-07", idx: 5 },
  { name: "Sat", date: "8", fullDate: "2026-08-08", idx: 6 },
];

export default function CalendarPage() {
  const [viewMode, setViewMode] = useState<"Week" | "Month" | "Table" | "Box">(
    "Week"
  );
  const [selectedFilter, setSelectedFilter] = useState("All");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showOptionsDropdown, setShowOptionsDropdown] = useState(false);
  const [eventsList, setEventsList] = useState<CalendarEvent[]>(sampleEvents);

  // New Event Form State
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventCategory, setNewEventCategory] = useState<
    "Event" | "Task" | "Focus time" | "Calendly"
  >("Event");
  const [newEventCrm, setNewEventCrm] = useState<
    "Salesforce" | "HubSpot" | "Calendly" | "Zoho"
  >("Salesforce");

  const filteredEvents = eventsList.filter((evt) => {
    if (selectedFilter === "All") return true;
    if (selectedFilter === "Calendly")
      return evt.crm === "Calendly" || evt.type === "Calendly";
    return evt.type.toLowerCase() === selectedFilter.toLowerCase();
  });

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle) return;

    const created: CalendarEvent = {
      id: `evt-${Date.now()}`,
      title: newEventTitle,
      startTime: "11:00 AM",
      endTime: "11:30 AM",
      date: "2026-08-03",
      dayOfWeek: 1,
      hourSlot: 11,
      type: newEventCategory === "Calendly" ? "Calendly" : "Demo",
      crm: newEventCrm,
      crmVariant: newEventCrm === "Calendly" ? "magenta" : "cyan",
      attendee: "Assigned Lead",
      location:
        newEventCrm === "Calendly" ? "Calendly Booking Link" : "Google Meet",
      status: "Scheduled",
      aiNotes: "Created via quick scheduler action.",
    };

    setEventsList([created, ...eventsList]);
    setNewEventTitle("");
    setShowCreateModal(false);
  };

  return (
    <div className="space-y-6 text-crm-text font-sans relative min-h-screen">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-primary-cyan" />
            <h1 className="text-2xl font-bold tracking-tight">
              Planner & Cross-CRM Calendar
            </h1>
          </div>
          <p className="text-xs text-crm-text-muted font-mono mt-1">
            Unified schedule manager for Salesforce, HubSpot, Zoho, and native
            Calendly bookings.
          </p>
        </div>

        {/* Global Action Controls */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setShowOptionsDropdown(!showOptionsDropdown)}
              className="px-3.5 py-2 rounded-xl bg-crm-surface hover:bg-crm-inner border border-crm-border-strong text-xs font-mono text-crm-text-muted flex items-center gap-2 cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-primary-cyan" />
              Options
            </button>

            {showOptionsDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-crm-surface border border-crm-border-strong rounded-xl shadow-2xl p-1.5 z-50 font-mono text-xs">
                <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 text-crm-text-muted flex items-center gap-2">
                  <Link2 className="w-3.5 h-3.5 text-primary-cyan" /> Import
                  Calendar
                </button>
                <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 text-crm-text-muted flex items-center gap-2">
                  <ExternalLink className="w-3.5 h-3.5 text-secondary-pink" />{" "}
                  Export ICS
                </button>
                <div className="my-1 border-t border-crm-border-strong" />
                <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 text-purple-300 flex items-center gap-2 font-bold">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" /> Calendly
                  Integration
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-primary-cyan text-slate-950 hover:bg-cyan-300 flex items-center gap-2 cursor-pointer font-mono shadow-[0_0_15px_rgba(6,182,212,0.3)]"
          >
            <Plus className="w-4 h-4" /> Schedule Slot
          </button>
        </div>
      </div>

      {/* Main Workspace Grid: Left Sidebar (with Upcoming Events Feed) + Right Content Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Sidebar Planner & Upcoming Events Feed */}
        <div className="lg:col-span-3 space-y-4">
          <MultiCrmCard className="p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-crm-border-strong pb-3">
              <span className="text-xs font-mono font-bold text-crm-text flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-primary-cyan" /> Workspace
                Priorities
              </span>
              <button
                onClick={() => setShowCreateModal(true)}
                className="p-1 text-crm-text-muted hover:text-crm-text"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Priorities Section */}
            <div className="p-3 bg-crm-inner rounded-xl border border-crm-border text-center space-y-2">
              <AlertCircle className="w-5 h-5 text-slate-500 mx-auto" />
              <p className="text-[11px] font-mono text-crm-text-muted">
                Prioritize an event or task to pin it here
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="text-[10px] font-mono text-primary-cyan hover:underline font-bold"
              >
                + Add priority task
              </button>
            </div>

            {/* UPCOMING EVENTS FEED WIDGET */}
            <div className="space-y-3 border-t border-crm-border-strong pt-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-crm-text-muted uppercase tracking-wider font-mono font-bold flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-primary-cyan" /> Upcoming
                  Schedule
                </span>
                <span className="text-[10px] font-mono bg-primary-cyan/10 text-primary-cyan px-1.5 py-0.5 rounded">
                  {eventsList.length} total
                </span>
              </div>

              <div className="space-y-2 max-h-70 overflow-y-auto pr-1">
                {eventsList.slice(0, 4).map((evt) => (
                  <div
                    key={`upcoming-${evt.id}`}
                    className="p-2.5 rounded-xl bg-crm-inner border border-crm-border hover:border-white/15 transition-all space-y-1 group"
                  >
                    <div className="flex items-start justify-between gap-1">
                      <span className="text-xs font-bold text-crm-text group-hover:text-primary-cyan transition-colors truncate">
                        {evt.title}
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-crm-text-muted shrink-0">
                        {evt.crm}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-mono text-crm-text-muted pt-1">
                      <span className="flex items-center gap-1">
                        <CalendarDays className="w-3 h-3 text-secondary-pink" />{" "}
                        {evt.date}
                      </span>
                      <span>{evt.startTime}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Connected Schedulers Status */}
            <div className="space-y-2 font-mono text-xs border-t border-crm-border-strong pt-3">
              <span className="text-[10px] text-crm-text-muted block uppercase tracking-wider font-bold">
                Sync Engine Status
              </span>
              <MultiCrmInnerPanel className="flex items-center justify-between py-2">
                <span className="text-crm-text text-[11px] flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />{" "}
                  Calendly Webhooks
                </span>
                <span className="text-[10px] text-purple-400">Active</span>
              </MultiCrmInnerPanel>
              <MultiCrmInnerPanel className="flex items-center justify-between py-2">
                <span className="text-crm-text text-[11px] flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />{" "}
                  Multi-CRM Bridge
                </span>
                <span className="text-[10px] text-primary-cyan">Synced</span>
              </MultiCrmInnerPanel>
            </div>
          </MultiCrmCard>
        </div>

        {/* RIGHT COLUMN: Interactive Canvas with Multi-View Support */}
        <div className="lg:col-span-9 space-y-4">
          {/* Top Control Bar: Timeframe Navigation + Multi-View Switcher + Filters */}
          <MultiCrmCard className="p-3 flex flex-col md:flex-row items-center justify-between gap-3">
            {/* Month & Date Navigation */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 bg-crm-inner rounded-xl p-1 border border-crm-border-strong font-mono text-xs">
                <button className="p-1 rounded-lg text-crm-text-muted hover:text-crm-text hover:bg-white/5 transition-all">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3 font-bold text-crm-text">
                  August 2026
                </span>
                <button className="p-1 rounded-lg text-crm-text-muted hover:text-crm-text hover:bg-white/5 transition-all">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Today: Aug 3, 2026
              </span>
            </div>

            {/* Filter Pills & Multi-View Switcher (Week / Month / Table / Box) */}
            <div className="flex items-center gap-3 flex-wrap justify-end">
              {/* Category Filters */}
              <div className="flex items-center gap-1 bg-crm-inner p-1 rounded-xl border border-crm-border-strong text-[11px] font-mono">
                {["All", "Demo", "Call", "Closing", "Calendly"].map(
                  (filter) => (
                    <button
                      key={filter}
                      onClick={() => setSelectedFilter(filter)}
                      className={`px-2.5 py-1 rounded-lg transition-all ${
                        selectedFilter === filter
                          ? filter === "Calendly"
                            ? "bg-secondary-pink/20 text-secondary-pink font-bold border border-secondary-pink/30"
                            : "bg-primary-cyan/20 text-primary-cyan font-bold border border-primary-cyan/30"
                          : "text-crm-text-muted hover:text-crm-text"
                      }`}
                    >
                      {filter}
                    </button>
                  )
                )}
              </div>

              {/* View Mode Switcher: Week, Month, Table, Box */}
              <div className="flex items-center bg-crm-inner p-1 rounded-xl border border-crm-border-strong text-[11px] font-mono">
                {(["Week", "Month", "Table", "Box"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                      viewMode === mode
                        ? "bg-primary-cyan text-slate-950 font-bold shadow"
                        : "text-crm-text-muted hover:text-crm-text"
                    }`}
                  >
                    {mode === "Table" && (
                      <ListOrdered className="w-3.5 h-3.5" />
                    )}
                    {mode === "Box" && <Kanban className="w-3.5 h-3.5" />}
                    {mode}
                  </button>
                ))}
              </div>
            </div>
          </MultiCrmCard>

          {/* VIEW 1: WEEK CALENDAR GRID VIEW */}
          {viewMode === "Week" && (
            <MultiCrmCard className="p-0 overflow-hidden border-crm-border-strong">
              <div className="grid grid-cols-8 bg-crm-inner/80 border-b border-crm-border-strong text-center font-mono text-xs py-2.5 sticky top-0 z-10">
                <div className="text-slate-500 text-[11px] flex items-center justify-center">
                  GMT+5
                </div>
                {daysOfWeek.map((day) => (
                  <div key={day.name} className="space-y-0.5">
                    <span className="text-[10px] text-crm-text-muted uppercase">
                      {day.name}
                    </span>
                    <div className="flex justify-center">
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          day.isToday
                            ? "bg-rose-500 text-white shadow-[0_0_10px_rgba(244,63,94,0.6)]"
                            : "text-crm-text"
                        }`}
                      >
                        {day.date}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="divide-y divide-white/5 relative max-h-145 overflow-y-auto font-mono text-xs">
                <div
                  className="absolute left-[12.5%] right-0 border-t-2 border-rose-500 z-20 flex items-center"
                  style={{ top: "310px" }}
                >
                  <span className="bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full -ml-3">
                    11:37 AM
                  </span>
                </div>

                {timeSlots.map((slot, hIdx) => {
                  const hour24 = hIdx + 7;
                  return (
                    <div key={slot} className="grid grid-cols-8 min-h-12.5">
                      <div className="p-2 text-right pr-3 text-[10px] text-slate-500 border-r border-crm-border select-none">
                        {slot}
                      </div>

                      {daysOfWeek.map((day) => {
                        const cellEvents = filteredEvents.filter(
                          (e) =>
                            e.dayOfWeek === day.idx && e.hourSlot === hour24
                        );

                        return (
                          <div
                            key={`${day.name}-${slot}`}
                            className="border-r border-crm-border p-1 relative hover:bg-white/2 transition-colors group cursor-pointer"
                            onClick={() => setShowCreateModal(true)}
                          >
                            {cellEvents.map((evt) => (
                              <div
                                key={evt.id}
                                className={`p-1.5 rounded-lg border text-[10px] font-sans font-medium space-y-1 shadow-md transition-all hover:scale-[1.02] ${
                                  evt.crm === "Calendly"
                                    ? "bg-secondary-pink/20 border-secondary-pink/40 text-pink-200"
                                    : "bg-primary-cyan/20 border-primary-cyan/40 text-cyan-200"
                                }`}
                              >
                                <div className="font-bold flex items-center justify-between gap-1 truncate">
                                  <span>{evt.title}</span>
                                  {evt.crm === "Calendly" && (
                                    <Sparkles className="w-3 h-3 text-secondary-pink shrink-0" />
                                  )}
                                </div>
                                <div className="text-[9px] text-crm-text-muted font-mono flex items-center gap-1">
                                  <Clock className="w-2.5 h-2.5 opacity-70" />{" "}
                                  {evt.startTime}
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </MultiCrmCard>
          )}

          {/* VIEW 2: MONTH VIEW */}
          {viewMode === "Month" && (
            <MultiCrmCard className="p-0 overflow-hidden font-mono text-xs">
              <div className="grid grid-cols-7 bg-crm-inner border-b border-crm-border-strong text-center py-2 text-crm-text-muted text-[11px] font-bold">
                <div>MON</div>
                <div>TUE</div>
                <div>WED</div>
                <div>THU</div>
                <div>FRI</div>
                <div>SAT</div>
                <div>SUN</div>
              </div>
              <div className="grid grid-cols-7 divide-x divide-y divide-white/5 min-h-120">
                {Array.from({ length: 31 }).map((_, i) => (
                  <div
                    key={i}
                    className="p-2 min-h-22.5 space-y-1 hover:bg-white/2"
                  >
                    <span className="text-[10px] text-slate-500 font-bold block">
                      {i + 1}
                    </span>
                    {i === 2 && (
                      <div className="bg-primary-cyan/25 border border-primary-cyan/40 text-cyan-200 p-1 rounded text-[10px] truncate font-sans">
                        Enterprise Demo
                      </div>
                    )}
                    {i === 3 && (
                      <div className="bg-secondary-pink/25 border border-secondary-pink/40 text-pink-200 p-1 rounded text-[10px] truncate font-sans">
                        Calendly Sync
                      </div>
                    )}
                    {i === 5 && (
                      <div className="bg-cyan-500/20 border border-cyan-500/30 text-cyan-200 p-1 rounded text-[10px] truncate font-sans">
                        Contract Review
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </MultiCrmCard>
          )}

          {/* VIEW 3: TABLE VIEW */}
          {viewMode === "Table" && (
            <MultiCrmCard className="p-0 overflow-hidden font-mono text-xs">
              <div className="p-4 border-b border-crm-border-strong flex items-center justify-between">
                <span className="font-bold text-crm-text text-sm">
                  All Scheduled Events & Entries ({filteredEvents.length})
                </span>
                <span className="text-[11px] text-crm-text-muted">
                  Tabular Data View
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-crm-inner border-b border-crm-border-strong text-crm-text-muted text-[11px]">
                      <th className="p-3">Event Title</th>
                      <th className="p-3">Source CRM</th>
                      <th className="p-3">Date & Time</th>
                      <th className="p-3">Attendee</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-crm-text-muted">
                    {filteredEvents.map((evt) => (
                      <tr
                        key={`table-${evt.id}`}
                        className="hover:bg-white/2 transition-colors"
                      >
                        <td className="p-3 font-bold text-crm-text flex items-center gap-2">
                          {evt.title}
                          {evt.crm === "Calendly" && (
                            <Sparkles className="w-3.5 h-3.5 text-secondary-pink" />
                          )}
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded bg-white/5 border border-crm-border-strong text-[10px] text-primary-cyan">
                            {evt.crm}
                          </span>
                        </td>
                        <td className="p-3 text-crm-text-muted">
                          {evt.date} @ {evt.startTime}
                        </td>
                        <td className="p-3 text-crm-text-muted">{evt.attendee}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              evt.status === "Confirmed"
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                : evt.status === "Automated"
                                ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                                : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            }`}
                          >
                            {evt.status}
                          </span>
                        </td>
                        <td className="p-3">
                          <button className="text-primary-cyan hover:underline flex items-center gap-1 text-[11px]">
                            Details <ArrowUpRight className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </MultiCrmCard>
          )}

          {/* VIEW 4: BOX (KANBAN) VIEW */}
          {viewMode === "Box" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
              {(["Confirmed", "Scheduled", "Automated"] as const).map(
                (statusGroup) => {
                  const groupEvents = filteredEvents.filter(
                    (e) => e.status === statusGroup
                  );
                  return (
                    <MultiCrmCard
                      key={statusGroup}
                      className="p-4 space-y-3 bg-crm-surface/80"
                    >
                      <div className="flex items-center justify-between border-b border-crm-border-strong pb-2">
                        <span className="font-bold text-crm-text flex items-center gap-2">
                          <span
                            className={`w-2.5 h-2.5 rounded-full ${
                              statusGroup === "Confirmed"
                                ? "bg-emerald-400"
                                : statusGroup === "Automated"
                                ? "bg-purple-400"
                                : "bg-amber-400"
                            }`}
                          />
                          {statusGroup}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-white/5 text-[10px] text-crm-text-muted">
                          {groupEvents.length}
                        </span>
                      </div>

                      <div className="space-y-3 pt-1">
                        {groupEvents.length === 0 ? (
                          <div className="p-4 text-center text-slate-500 text-[11px] border border-dashed border-crm-border-strong rounded-xl">
                            No events in {statusGroup}
                          </div>
                        ) : (
                          groupEvents.map((evt) => (
                            <div
                              key={`box-${evt.id}`}
                              className="p-3 rounded-xl bg-crm-inner border border-crm-border-strong hover:border-primary-cyan/40 transition-all space-y-2 shadow"
                            >
                              <div className="flex items-start justify-between gap-1">
                                <span className="font-bold text-crm-text text-xs font-sans">
                                  {evt.title}
                                </span>
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-primary-cyan shrink-0">
                                  {evt.crm}
                                </span>
                              </div>
                              <p className="text-[11px] text-crm-text-muted font-sans">
                                {evt.aiNotes || "No notes provided."}
                              </p>
                              <div className="flex items-center justify-between text-[10px] text-crm-text-muted pt-1 border-t border-crm-border">
                                <span>{evt.date}</span>
                                <span className="text-secondary-pink font-bold">
                                  {evt.startTime}
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </MultiCrmCard>
                  );
                }
              )}
            </div>
          )}
        </div>
      </div>

      {/* QUICK SCHEDULE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-crm-surface border border-white/15 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl p-6 space-y-5 font-sans">
            <div className="flex items-center justify-between border-b border-crm-border-strong pb-3">
              <div className="flex items-center gap-1 bg-crm-inner p-1 rounded-xl border border-crm-border-strong font-mono text-xs">
                {(["Event", "Task", "Focus time", "Calendly"] as const).map(
                  (cat) => (
                    <button
                      key={cat}
                      onClick={() => setNewEventCategory(cat)}
                      className={`px-3 py-1 rounded-lg transition-all ${
                        newEventCategory === cat
                          ? "bg-primary-cyan text-slate-950 font-bold"
                          : "text-crm-text-muted hover:text-crm-text"
                      }`}
                    >
                      {cat}
                    </button>
                  )
                )}
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-crm-text-muted hover:text-crm-text"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div className="space-y-1">
                <input
                  type="text"
                  placeholder="Add title, @ for people, @@ for tasks, 'space' for ✨ AI"
                  value={newEventTitle}
                  onChange={(e) => setNewEventTitle(e.target.value)}
                  className="w-full bg-crm-inner border border-white/15 rounded-xl px-4 py-3 text-sm text-crm-text focus:outline-none focus:border-primary-cyan font-mono"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-3 bg-crm-inner rounded-xl border border-crm-border space-y-1">
                  <span className="text-[10px] text-slate-500 block">
                    Date & Time
                  </span>
                  <span className="text-crm-text font-bold block">
                    Aug 3, 2026
                  </span>
                  <span className="text-crm-text-muted text-[11px]">
                    11:00 AM → 11:30 AM (30m)
                  </span>
                </div>

                <div className="p-3 bg-crm-inner rounded-xl border border-crm-border space-y-1">
                  <span className="text-[10px] text-slate-500 block">
                    Target CRM / Platform
                  </span>
                  <select
                    value={newEventCrm}
                    onChange={(e: any) => setNewEventCrm(e.target.value)}
                    className="bg-black text-crm-text text-xs rounded border border-crm-border-strong p-1 w-full"
                  >
                    <option value="Salesforce">Salesforce CRM</option>
                    <option value="HubSpot">HubSpot CRM</option>
                    <option value="Calendly">Calendly Integration</option>
                    <option value="Zoho">Zoho CRM</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-crm-border-strong pt-4">
                <button
                  type="button"
                  className="px-3 py-2 rounded-xl bg-crm-inner border border-crm-border-strong text-xs font-mono text-crm-text-muted flex items-center gap-1.5"
                >
                  <Video className="w-3.5 h-3.5 text-primary-cyan" /> Add video
                  call
                </button>

                <div className="flex items-center gap-2 font-mono">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 rounded-xl text-xs text-crm-text-muted hover:text-crm-text"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-primary-cyan text-slate-950 hover:bg-cyan-300"
                  >
                    Save Slot
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
