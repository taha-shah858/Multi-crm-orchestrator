"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
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
import { useClientAccount } from "@/context/ClientAccountContext";

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
    | "AI Copilot"
    | "Manual"
    | "MOCK";
  variant: "cyan" | "purple" | "magenta" | "neutral";
  type: "sync" | "ai" | "call" | "meeting" | "task" | "deal" | "lead" | "sms" | "email" | "note" | "crm_activity";
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

type InteractionType = "CALL" | "SMS" | "EMAIL" | "MEETING" | "NOTE" | "TASK" | "CRM_ACTIVITY";
type InteractionDirection = "INBOUND" | "OUTBOUND" | "INTERNAL";

interface ContactOption {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  company: string | null;
}

interface InteractionFormValues {
  type: InteractionType;
  direction: InteractionDirection;
  subject: string;
  body: string;
  contactId: string;
}

const emptyInteractionForm = (): InteractionFormValues => ({
  type: "NOTE",
  direction: "INTERNAL",
  subject: "",
  body: "",
  contactId: "",
});

export default function TimelinePage() {
  const { activeClientAccount, isClientAccountReady } = useClientAccount();
  const [events, setEvents] = useState<TimelineEvent[]>([]);
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
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [contacts, setContacts] = useState<ContactOption[]>([]);
  const [contactSearch, setContactSearch] = useState("");
  const [interactionForm, setInteractionForm] = useState<InteractionFormValues>(
    emptyInteractionForm
  );
  const [interactionError, setInteractionError] = useState<string | null>(null);
  const [isSavingInteraction, setIsSavingInteraction] = useState(false);
  const [drawerNotice, setDrawerNotice] = useState<string | null>(null);
  const requestVersion = useRef(0);
  const currentClientAccountId = useRef(activeClientAccount.id);

  useEffect(() => {
    currentClientAccountId.current = activeClientAccount.id;
  }, [activeClientAccount.id]);

  const loadInteractions = useCallback(async (clearWorkspace = false) => {
    if (!isClientAccountReady) return;
    const version = ++requestVersion.current;
    const clientAccountId = activeClientAccount.id;
    if (clearWorkspace) {
      setEvents([]);
      setContacts([]);
      setIsLogModalOpen(false);
      setSelectedPayloadEvent(null);
      setDrawerEvent(null);
      setIsSavingInteraction(false);
    }
    const response = await fetch("/api/interactions", { cache: "no-store" });
    const data = await response.json();
    if (version !== requestVersion.current || currentClientAccountId.current !== clientAccountId) return;
    if (!response.ok || !data.success) return;
    setEvents(
      data.interactions.map(
        (interaction: {
          id: string;
          type: string;
          direction: string;
          source: string;
          subject: string | null;
          body: string;
          occurredAt: string;
          contact: { id: string; firstName: string; lastName: string; company: string | null; email: string | null } | null;
          companyLinks: Array<{ company: { id: string; name: string } }>;
          dealLinks: Array<{ deal: { id: string; title: string; stageLabel: string | null } }>;
        }) => {
          const type = interaction.type.toLowerCase();
          const icon =
            interaction.type === "CALL"
              ? PhoneCall
              : interaction.type === "MEETING"
              ? Calendar
              : interaction.type === "NOTE"
              ? Code2
              : interaction.type === "EMAIL"
              ? Activity
              : interaction.type === "SMS"
              ? Radio
              : Layers;
          const contactName = interaction.contact
            ? `${interaction.contact.firstName} ${interaction.contact.lastName}`
            : interaction.companyLinks[0]?.company.name || interaction.dealLinks[0]?.deal.title || "Client activity";
          return {
            id: interaction.id,
            time: new Date(interaction.occurredAt).toLocaleString(),
            timestamp: new Date(interaction.occurredAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
            title: interaction.subject || `${interaction.type.replace("_", " ")} logged`,
            description: interaction.body,
            source: interaction.source === "MANUAL" ? "Manual" : interaction.source,
            variant: "neutral",
            type,
            icon,
            iconColor: "text-blue-600",
            entity: contactName,
            entityId: interaction.contact?.id || interaction.companyLinks[0]?.company.id || interaction.dealLinks[0]?.deal.id || activeClientAccount.id,
            entityEmail: interaction.contact?.email || undefined,
            entityCompany: interaction.contact?.company || interaction.companyLinks[0]?.company.name || undefined,
            syncStatus: "success",
            latencyMs: 0,
            payload: {
              direction: interaction.direction,
              source: interaction.source,
              companies: interaction.companyLinks.map((link) => link.company),
              deals: interaction.dealLinks.map((link) => link.deal),
            },
          } as TimelineEvent;
        }
      )
    );
  }, [activeClientAccount.id, isClientAccountReady]);

  useEffect(() => {
    void loadInteractions(true);
  }, [loadInteractions]);

  const openManualLog = async () => {
    const version = requestVersion.current;
    const clientAccountId = activeClientAccount.id;
    setInteractionForm(emptyInteractionForm());
    setContactSearch("");
    setInteractionError(null);
    setIsLogModalOpen(true);
    setIsLoadingContacts(true);

    try {
      const response = await fetch("/api/contacts", { cache: "no-store" });
      const data = await response.json();

      if (version !== requestVersion.current || currentClientAccountId.current !== clientAccountId) return;

      if (!response.ok || !data.success) {
        setContacts([]);
        setInteractionError(data?.error?.message ?? "Contacts could not be loaded for this client account.");
        return;
      }

      setContacts(data.contacts ?? []);
    } catch {
      if (version !== requestVersion.current || currentClientAccountId.current !== clientAccountId) return;
      setContacts([]);
      setInteractionError("Contacts could not be loaded for this client account.");
    } finally {
      if (version === requestVersion.current && currentClientAccountId.current === clientAccountId) setIsLoadingContacts(false);
    }
  };

  const handleManualLog = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const version = requestVersion.current;
    const clientAccountId = activeClientAccount.id;
    setInteractionError(null);
    setIsSavingInteraction(true);

    try {
      const response = await fetch("/api/interactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: interactionForm.type,
          direction: interactionForm.direction,
          subject: interactionForm.subject || undefined,
          body: interactionForm.body,
          contactId: interactionForm.contactId || undefined,
        }),
      });
      const data = await response.json();
      if (version !== requestVersion.current || currentClientAccountId.current !== clientAccountId) return;

      if (!response.ok || !data.success) {
        setInteractionError(data?.error?.message ?? "The interaction could not be saved.");
        return;
      }

      setIsLogModalOpen(false);
      await loadInteractions();
    } catch {
      if (version !== requestVersion.current || currentClientAccountId.current !== clientAccountId) return;
      setInteractionError("The interaction could not be saved. Try again.");
    } finally {
      setIsSavingInteraction(false);
    }
  };

  const handleRefreshStream = async () => {
    setIsRefreshing(true);
    await loadInteractions();
    setIsRefreshing(false);
  };

  const handleCopyId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleInspectPayloadClick = (evt: TimelineEvent, e: React.MouseEvent) => {
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
      filterSource === "All" || evt.source.toLowerCase() === filterSource.toLowerCase();

    const matchesType =
      filterType === "All" || evt.type.toLowerCase() === filterType.toLowerCase();

    const matchesStatus = filterStatus === "All" || evt.syncStatus === filterStatus;

    return matchesSearch && matchesSource && matchesType && matchesStatus;
  });

  const matchingContacts = contacts.filter((contact) => {
    const query = contactSearch.trim().toLowerCase();
    if (!query) return true;

    return [contact.firstName, contact.lastName, contact.email, contact.company]
      .filter((value): value is string => Boolean(value))
      .some((value) => value.toLowerCase().includes(query));
  });

  const selectedContact = contacts.find((contact) => contact.id === interactionForm.contactId);
  const totalEvents = events.length;

  const labelCls = "block text-xs font-semibold uppercase tracking-wider text-slate-700";
  const inputCls = "w-full bg-white border border-slate-300 rounded-lg p-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-2xs";

  return (
    <div className="space-y-6 font-sans text-slate-900 relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <GitCommit className="w-5 h-5 text-blue-600" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Interaction Timeline
            </h1>
          </div>
          <p className="text-sm font-normal text-slate-600 mt-1">
            Unified customer communication history for the active client account.
          </p>
        </div>

        {/* Live Controls */}
        <div className="flex items-center gap-3 text-xs font-medium">
          <button
            onClick={() => setIsLiveIngestion(!isLiveIngestion)}
            className={`px-3 py-1.5 rounded-lg border transition-all flex items-center gap-2 cursor-pointer ${
              isLiveIngestion
                ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                : "bg-slate-100 border-slate-200 text-slate-500"
            }`}
          >
            <Radio
              className={`w-3.5 h-3.5 ${
                isLiveIngestion ? "animate-pulse text-emerald-600" : ""
              }`}
            />
            {isLiveIngestion ? "Feed: Active" : "Feed Paused"}
          </button>

          <button
            onClick={() => void openManualLog()}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm shadow-xs transition-colors cursor-pointer"
          >
            Log Interaction
          </button>

          <button
            onClick={handleRefreshStream}
            disabled={isRefreshing}
            className="p-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 transition-colors cursor-pointer shadow-xs"
            title="Refresh Timeline Feed"
          >
            <RefreshCw
              className={`w-4 h-4 text-slate-600 ${
                isRefreshing ? "animate-spin text-blue-600" : ""
              }`}
            />
          </button>
        </div>
      </div>

      {/* Telemetry Quick Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MultiCrmCard className="p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
              Total Interactions
            </span>
            <span className="text-xl font-bold text-slate-900 mt-1 block">
              {totalEvents} Records
            </span>
          </div>
          <Activity className="w-5 h-5 text-blue-600 opacity-80" />
        </MultiCrmCard>

        <MultiCrmCard className="p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
              Calls Logged
            </span>
            <span className="text-xl font-bold text-emerald-600 mt-1 block">
              {events.filter((event) => event.type === "call").length}
            </span>
          </div>
          <Zap className="w-5 h-5 text-emerald-600 opacity-80" />
        </MultiCrmCard>

        <MultiCrmCard className="p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
              Messages Logged
            </span>
            <span className="text-xl font-bold text-blue-600 mt-1 block">
              {events.filter((event) => event.type === "sms" || event.type === "email").length}
            </span>
          </div>
          <Clock className="w-5 h-5 text-blue-600 opacity-80" />
        </MultiCrmCard>

        <MultiCrmCard className="p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
              Notes Logged
            </span>
            <span className="text-xl font-bold text-slate-900 mt-1 block">
              {events.filter((event) => event.type === "note").length}
            </span>
          </div>
          <Database className="w-5 h-5 text-blue-600 opacity-80" />
        </MultiCrmCard>
      </div>

      {/* Controls & Filter Hub */}
      <MultiCrmCard className="p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2.5 text-xs">
          <span className="font-semibold text-slate-700 flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-blue-600" /> Interaction Filters
          </span>
          <span className="text-slate-500">
            Showing {filteredEvents.length} of {events.length} events
          </span>
        </div>

        <div className="flex flex-col lg:flex-row items-center justify-between gap-4 text-xs">
          {/* Search */}
          <div className="relative w-full lg:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search event, entity, ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-2xs"
            />
          </div>

          {/* Source Platform Filter */}
          <div className="flex items-center gap-1.5 w-full lg:w-auto overflow-x-auto scrollbar-thin">
            <span className="text-xs font-semibold text-slate-500 mr-1 shrink-0 uppercase tracking-wider">
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
                className={`px-3 py-1.5 rounded-lg text-xs transition-colors whitespace-nowrap cursor-pointer ${
                  filterSource === src
                    ? "bg-blue-50 text-blue-700 border border-blue-300 font-semibold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                {src}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs font-semibold text-slate-500 mr-1 uppercase tracking-wider">Health:</span>
            {[
              { label: "All", value: "All" },
              { label: "Success", value: "success" },
              { label: "Warning", value: "warning" },
            ].map((st) => (
              <button
                key={st.value}
                onClick={() => setFilterStatus(st.value)}
                className={`px-2.5 py-1 rounded-md text-xs transition-colors cursor-pointer ${
                  filterStatus === st.value
                    ? "bg-slate-900 text-white font-semibold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
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
        <div className="absolute left-7.5 md:left-9.5 top-10 bottom-10 w-0.5 bg-slate-200" />

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
                  className={`z-10 p-2.5 rounded-lg border transition-all shrink-0 ${
                    isSelected
                      ? "border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-500/20"
                      : "border-slate-200 bg-white group-hover:border-slate-300"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${evt.iconColor}`} />
                </div>

                {/* Event Content Panel */}
                <div
                  className={`flex-1 space-y-3 rounded-lg border p-4 transition-all ${
                    isSelected
                      ? "border-blue-500 bg-blue-50/20 ring-1 ring-blue-500/30"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {evt.title}
                      </h3>
                      <MultiCrmTag variant={evt.variant}>
                        {evt.source}
                      </MultiCrmTag>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {evt.timestamp} ({evt.time})
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          evt.syncStatus === "success"
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            : "bg-amber-50 text-amber-800 border border-amber-200"
                        }`}
                      >
                        {evt.latencyMs}ms
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed font-sans">
                    {evt.description}
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-xs text-slate-900 font-semibold">
                        {evt.entity}{" "}
                        {evt.entityCompany ? `(${evt.entityCompany})` : ""}
                      </span>
                      <span className="text-xs text-slate-400">
                        ({evt.entityId})
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => handleCopyId(evt.id, e)}
                        className="px-2 py-1 rounded bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 text-xs flex items-center gap-1 border border-slate-200 transition-colors cursor-pointer"
                        title="Copy Event ID"
                      >
                        {copiedId === evt.id ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        {evt.id}
                      </button>

                      <button
                        onClick={(e) => handleInspectPayloadClick(evt, e)}
                        className="px-3 py-1 rounded-lg bg-white hover:bg-slate-50 text-blue-600 hover:text-blue-700 border border-slate-300 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                      >
                        <Code2 className="w-3.5 h-3.5 text-blue-600" /> Inspect
                        Payload
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredEvents.length === 0 && (
            <div className="text-center py-12 space-y-2">
              <p className="text-sm text-slate-500">
                No events matched the current filter conditions.
              </p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setFilterSource("All");
                  setFilterType("All");
                  setFilterStatus("All");
                }}
                className="text-xs text-blue-600 hover:underline font-semibold cursor-pointer"
              >
                Reset All Filters
              </button>
            </div>
          )}
        </div>
      </MultiCrmCard>

      {/* SECONDARY VIEW: SLIDE-OVER EVENT DETAIL DRAWER */}
      {drawerEvent && (
        <div className="dashboard-overlay bg-slate-900/40 backdrop-blur-xs flex justify-end z-50">
          <div className="w-full max-w-xl bg-white border-l border-slate-200 h-full p-6 space-y-6 overflow-y-auto font-sans shadow-2xl animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="flex items-start justify-between border-b border-slate-200 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <MultiCrmTag variant={drawerEvent.variant}>
                    {drawerEvent.source}
                  </MultiCrmTag>
                  <span className="text-xs text-slate-500">
                    {drawerEvent.id}
                  </span>
                </div>
                <h2 className="text-base font-bold text-slate-900">
                  {drawerEvent.title}
                </h2>
              </div>

              <button
                onClick={() => setDrawerEvent(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2 text-xs">
              <button
                onClick={() => setDrawerTab("overview")}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  drawerTab === "overview"
                    ? "bg-blue-50 text-blue-700 border border-blue-300 font-semibold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                Overview & Context
              </button>

              {drawerEvent.diffs && (
                <button
                  onClick={() => setDrawerTab("diffs")}
                  className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    drawerTab === "diffs"
                      ? "bg-blue-50 text-blue-700 border border-blue-300 font-semibold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  Field Diffs ({drawerEvent.diffs.length})
                </button>
              )}

              <button
                onClick={() => setDrawerTab("raw")}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  drawerTab === "raw"
                    ? "bg-slate-900 text-white font-semibold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                Raw JSON
              </button>
            </div>

            {/* TAB CONTENT: OVERVIEW */}
            {drawerTab === "overview" && (
              <div className="space-y-5">
                {/* Entity Summary Card */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
                    Associated Lead / Entity Context
                  </span>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500 block text-xs">
                        Contact Name
                      </span>
                      <span className="text-slate-900 font-semibold text-sm">
                        {drawerEvent.entity}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-xs">
                        Company / Account
                      </span>
                      <span className="text-slate-900 font-semibold text-sm">
                        {drawerEvent.entityCompany || "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-xs">
                        Email Address
                      </span>
                      <span className="text-blue-600 font-medium">
                        {drawerEvent.entityEmail || "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-xs">
                        System Entity ID
                      </span>
                      <span className="text-slate-600">
                        {drawerEvent.entityId}
                      </span>
                    </div>
                  </div>
                </div>

                {/* AI / Transcript Content if available */}
                {drawerEvent.aiReasoning && (
                  <div className="bg-blue-50/50 border border-blue-200 rounded-lg p-4 space-y-2">
                    <span className="text-xs text-blue-700 font-semibold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" /> AI Copilot Logic
                    </span>
                    <p className="text-xs text-slate-800 leading-relaxed font-sans">
                      {drawerEvent.aiReasoning}
                    </p>
                  </div>
                )}

                {drawerEvent.transcript && (
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2">
                    <span className="text-xs text-slate-700 font-semibold flex items-center gap-1.5">
                      <PhoneCall className="w-3.5 h-3.5 text-blue-600" /> Transcribed Audio
                      Excerpt
                    </span>
                    <p className="text-xs text-slate-600 italic leading-relaxed font-sans bg-white p-3 rounded-lg border border-slate-200">
                      "{drawerEvent.transcript}"
                    </p>
                  </div>
                )}

                {/* Performance Metrics */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-slate-500 block text-xs">
                      Execution Latency
                    </span>
                    <span className="text-emerald-700 font-semibold text-sm">
                      {drawerEvent.latencyMs} ms
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <span className="text-slate-500 block text-xs">
                      Sync Status
                    </span>
                    <span className="text-emerald-700 font-semibold text-sm capitalize">
                      {drawerEvent.syncStatus}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: FIELD DIFFS */}
            {drawerTab === "diffs" && drawerEvent.diffs && (
              <div className="space-y-3 text-xs">
                <span className="text-xs text-slate-500 block">
                  Field conflicts detected and synced bi-directionally across
                  integrated CRMs:
                </span>
                <div className="space-y-2">
                  {drawerEvent.diffs.map((diff, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-900 font-semibold">
                          {diff.field}
                        </span>
                        <span className="text-emerald-700 text-xs bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-medium">
                          Winner: {diff.winningSource}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2 bg-white rounded border border-red-200">
                          <span className="text-slate-500 block text-[10px]">
                            Previous State
                          </span>
                          <span className="text-red-700 line-through">
                            {diff.oldValue}
                          </span>
                        </div>
                        <div className="p-2 bg-white rounded border border-emerald-200">
                          <span className="text-slate-500 block text-[10px]">
                            Updated State
                          </span>
                          <span className="text-emerald-700 font-medium">
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
              <div className="space-y-3 text-xs">
                <span className="text-slate-500 text-xs block">
                  Inbound Webhook / API Payload
                </span>
                <pre className="p-4 bg-slate-900 rounded-lg text-slate-100 text-xs font-mono overflow-x-auto max-h-80 scrollbar-thin">
                  {JSON.stringify(drawerEvent.payload, null, 2)}
                </pre>
              </div>
            )}

            {/* Action Footer */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-xs">
              <button
                onClick={() => {
                  setDrawerEvent(null);
                  setDrawerNotice(null);
                }}
                className="px-4 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-medium transition-colors cursor-pointer"
              >
                Close Drawer
              </button>

              <div className="flex items-center gap-3">
                {drawerNotice && (
                  <span className="text-xs text-slate-500 max-w-48 text-right">
                    {drawerNotice}
                  </span>
                )}
                <button
                  onClick={() =>
                    setDrawerNotice(
                      "Event re-triggering belongs to Telemetry & Logs and is not available from the interaction timeline."
                    )
                  }
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Re-trigger Event
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isLogModalOpen && (
        <div
          className="dashboard-overlay bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="log-interaction-title"
        >
          <MultiCrmCard className="w-full max-w-2xl p-6 space-y-5 relative border border-slate-200 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-200 pb-3">
              <div>
                <h2 id="log-interaction-title" className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <GitCommit className="w-5 h-5 text-blue-600" /> Log Interaction
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Add a manual customer interaction for the active client account.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsLogModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                aria-label="Close interaction form"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleManualLog} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Interaction type *</label>
                  <select
                    value={interactionForm.type}
                    onChange={(event) => {
                      const type = event.target.value as InteractionType;
                      setInteractionForm((current) => ({
                        ...current,
                        type,
                        direction: type === "NOTE" ? "INTERNAL" : current.direction,
                      }));
                    }}
                    className={inputCls}
                  >
                    <option value="CALL">Call</option>
                    <option value="SMS">SMS</option>
                    <option value="EMAIL">Email</option>
                    <option value="MEETING">Meeting</option>
                    <option value="NOTE">Note</option>
                    <option value="TASK">Task</option>
                    <option value="CRM_ACTIVITY">CRM activity</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Direction *</label>
                  <select
                    value={interactionForm.direction}
                    onChange={(event) =>
                      setInteractionForm((current) => ({
                        ...current,
                        direction: event.target.value as InteractionDirection,
                      }))
                    }
                    className={inputCls}
                  >
                    <option value="OUTBOUND">Outbound</option>
                    <option value="INBOUND">Inbound</option>
                    <option value="INTERNAL">Internal</option>
                  </select>
                </div>
              </div>

              <div>
                <label className={labelCls}>Subject</label>
                <input
                  type="text"
                  value={interactionForm.subject}
                  onChange={(event) =>
                    setInteractionForm((current) => ({ ...current, subject: event.target.value }))
                  }
                  placeholder="Optional summary"
                  className={inputCls}
                />
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <label className={labelCls}>Associate contact</label>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Optional. Search the active client's contacts by name, email, or company.
                    </p>
                  </div>
                  {selectedContact && (
                    <button
                      type="button"
                      onClick={() => setInteractionForm((current) => ({ ...current, contactId: "" }))}
                      className="text-xs text-blue-600 hover:underline cursor-pointer shrink-0 font-medium"
                    >
                      Use account only
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="search"
                    value={contactSearch}
                    onChange={(event) => setContactSearch(event.target.value)}
                    placeholder="Search contacts by name..."
                    className={`${inputCls} pl-9`}
                  />
                </div>
                {selectedContact && (
                  <div className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-800">
                    Selected: {selectedContact.firstName} {selectedContact.lastName}
                    {selectedContact.company ? ` · ${selectedContact.company}` : ""}
                  </div>
                )}
                <div className="max-h-40 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
                  {isLoadingContacts ? (
                    <p className="py-3 text-center text-xs text-slate-500">Loading contacts…</p>
                  ) : matchingContacts.length ? (
                    matchingContacts.map((contact) => (
                      <button
                        key={contact.id}
                        type="button"
                        onClick={() => setInteractionForm((current) => ({ ...current, contactId: contact.id }))}
                        className={`w-full text-left rounded-lg border px-3 py-2 transition-colors cursor-pointer ${
                          interactionForm.contactId === contact.id
                            ? "border-blue-500 bg-blue-50/50 shadow-2xs font-semibold text-blue-800"
                            : "border-slate-200 bg-white hover:border-slate-300 text-slate-800"
                        }`}
                      >
                        <span className="block font-semibold">
                          {contact.firstName} {contact.lastName}
                        </span>
                        <span className="block mt-0.5 text-xs text-slate-500">
                          {[contact.email, contact.company].filter(Boolean).join(" · ") || "No email or company"}
                        </span>
                      </button>
                    ))
                  ) : (
                    <p className="py-3 text-center text-xs text-slate-500">
                      No active-client contacts match this search.
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className={labelCls}>Interaction details *</label>
                <textarea
                  required
                  rows={4}
                  value={interactionForm.body}
                  onChange={(event) =>
                    setInteractionForm((current) => ({ ...current, body: event.target.value }))
                  }
                  placeholder="Record the outcome, context, or next step…"
                  className={inputCls}
                />
              </div>

              {interactionError && (
                <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 font-medium">
                  {interactionError}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsLogModalOpen(false)}
                  disabled={isSavingInteraction}
                  className="px-4 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-medium text-sm shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingInteraction || !interactionForm.body.trim()}
                  className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isSavingInteraction ? "Saving…" : "Save Interaction"}
                </button>
              </div>
            </form>
          </MultiCrmCard>
        </div>
      )}

      {/* RAW PAYLOAD INSPECTOR MODAL */}
      {selectedPayloadEvent && (
        <div className="dashboard-overlay bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <MultiCrmCard className="w-full max-w-xl p-6 space-y-4 relative border border-slate-200 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-semibold text-slate-900">
                  Payload Metadata Inspector — {selectedPayloadEvent.id}
                </h3>
              </div>
              <button
                onClick={() => setSelectedPayloadEvent(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">
                    Source CRM
                  </span>
                  <span className="text-slate-900 font-semibold text-xs">
                    {selectedPayloadEvent.source}
                  </span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">
                    Execution Latency
                  </span>
                  <span className="text-emerald-700 font-semibold text-xs">
                    {selectedPayloadEvent.latencyMs} ms
                  </span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block text-[10px] uppercase font-semibold">
                    Entity Reference
                  </span>
                  <span className="text-blue-600 font-semibold text-xs">
                    {selectedPayloadEvent.entityId}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-slate-700 text-xs font-semibold block mb-1">
                  JSON Payload & Diff Data
                </span>
                <pre className="p-3 bg-slate-900 rounded-lg text-slate-100 text-xs font-mono overflow-x-auto max-h-60 scrollbar-thin">
                  {JSON.stringify(selectedPayloadEvent.payload, null, 2)}
                </pre>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-200 text-xs">
              <button
                onClick={() => setSelectedPayloadEvent(null)}
                className="px-4 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-medium shadow-xs transition-colors cursor-pointer"
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
