"use client";

import { useState } from "react";
import {
  PhoneCall,
  PhoneOff,
  Mic,
  MicOff,
  Pause,
  Play,
  Volume2,
  Sparkles,
  Clock,
  User,
  Building2,
  Search,
  History,
  PhoneIncoming,
  PhoneOutgoing,
  CheckCircle2,
  Bot,
  Zap,
  FileText,
  Edit3,
  Send,
  Plus,
  Trash2,
  X,
  SlidersHorizontal,
  Layers,
  MessageSquare,
  BarChart3,
  Globe,
  GitBranch,
  Database,
  GitMerge,
  ShieldCheck,
  Sliders,
  RefreshCw,
} from "lucide-react";
import {
  MultiCrmCard,
  MultiCrmInnerPanel,
  MultiCrmTag,
} from "@/components/ui/MultiCrmCard";

interface CallTranscript {
  id: string;
  clientName: string;
  company: string;
  brandInstance: string;
  date: string;
  duration: string;
  source: "Auto-Recorded SIP" | "Manual Upload" | "Agent Input";
  content: string;
  sentiment: "Positive" | "Neutral" | "High Intent" | "Objection Heavy";
  sentimentVariant: "cyan" | "neutral" | "purple" | "magenta";
  forwardedToAi: boolean;
}

interface FieldMapping {
  id: string;
  unifiedField: string;
  salesforceField: string;
  hubspotField: string;
  zohoField: string;
  pipedriveField: string;
  dataType: "String" | "Email" | "Phone" | "Boolean" | "Timestamp";
}

const initialTranscripts: CallTranscript[] = [
  {
    id: "tr-1",
    clientName: "Sarah Jenkins",
    company: "Acme Corp",
    brandInstance: "Salesforce Enterprise",
    date: "Today, 02:45 PM",
    duration: "12m 45s",
    source: "Auto-Recorded SIP",
    content:
      "Agent: Hi Sarah, following up on your CRM multi-instance routing test.\nSarah Jenkins: Yes! The data isolation works great, but we are concerned about the onboarding timeline for our regional teams.",
    sentiment: "Positive",
    sentimentVariant: "cyan",
    forwardedToAi: true,
  },
  {
    id: "tr-2",
    clientName: "David Miller",
    company: "Stark Tech",
    brandInstance: "HubSpot CRM",
    date: "Today, 01:15 PM",
    duration: "04m 12s",
    source: "Manual Upload",
    content:
      "Agent: Hello David, checking in on the Twilio SIP trunk integration.\nDavid Miller: Integration was smooth. We want to test the live transcription model with custom objection handlers next week.",
    sentiment: "High Intent",
    sentimentVariant: "purple",
    forwardedToAi: true,
  },
];

const initialMappings: FieldMapping[] = [
  {
    id: "m-1",
    unifiedField: "Full Name",
    salesforceField: "Name",
    hubspotField: "firstname + lastname",
    zohoField: "Full_Name",
    pipedriveField: "name",
    dataType: "String",
  },
  {
    id: "m-2",
    unifiedField: "Primary Email",
    salesforceField: "Email",
    hubspotField: "email",
    zohoField: "Email",
    pipedriveField: "email",
    dataType: "Email",
  },
  {
    id: "m-3",
    unifiedField: "Phone Number",
    salesforceField: "Phone",
    hubspotField: "phone",
    zohoField: "Phone",
    pipedriveField: "phone",
    dataType: "Phone",
  },
  {
    id: "m-4",
    unifiedField: "Company Name",
    salesforceField: "Account.Name",
    hubspotField: "company",
    zohoField: "Account_Name",
    pipedriveField: "org_id",
    dataType: "String",
  },
  {
    id: "m-5",
    unifiedField: "Deal Stage",
    salesforceField: "StageName",
    hubspotField: "dealstage",
    zohoField: "Stage",
    pipedriveField: "status",
    dataType: "String",
  },
];

const brandIntegrations = [
  {
    name: "Salesforce Enterprise",
    type: "CRM",
    status: "Active",
    syncFreq: "Real-time (Webhook)",
    color: "cyan" as const,
  },
  {
    name: "HubSpot CRM",
    type: "CRM",
    status: "Active",
    syncFreq: "Real-time (Webhook)",
    color: "purple" as const,
  },
  {
    name: "Zoho CRM Plus",
    type: "CRM",
    status: "Syncing",
    syncFreq: "Every 5 mins",
    color: "neutral" as const,
  },
  {
    name: "Pipedrive API",
    type: "CRM",
    status: "Active",
    syncFreq: "Real-time (Webhook)",
    color: "magenta" as const,
  },
  {
    name: "Google Workspace / Gmail",
    type: "Communication",
    status: "Active",
    syncFreq: "Instant Stream",
    color: "cyan" as const,
  },
  {
    name: "Zoom Meetings",
    type: "Communication",
    status: "Standby",
    syncFreq: "Post-Call Hook",
    color: "neutral" as const,
  },
];

const recentCalls = [
  {
    id: 1,
    name: "Sarah Jenkins",
    company: "Acme Corp",
    brand: "Salesforce Enterprise",
    number: "+1 (555) 234-8901",
    type: "outgoing",
    duration: "12m 45s",
    time: "14m ago",
    sentiment: "Positive",
    sentimentVariant: "cyan" as const,
  },
  {
    id: 2,
    name: "David Miller",
    company: "Stark Tech",
    brand: "HubSpot CRM",
    number: "+1 (555) 876-5432",
    type: "incoming",
    duration: "04m 12s",
    time: "1h ago",
    sentiment: "Neutral",
    sentimentVariant: "neutral" as const,
  },
  {
    id: 3,
    name: "Elena Rostova",
    company: "Cyberdyne",
    brand: "Zoho CRM Plus",
    number: "+1 (555) 345-6789",
    type: "outgoing",
    duration: "08m 30s",
    time: "3h ago",
    sentiment: "High Intent",
    sentimentVariant: "purple" as const,
  },
];

export default function SmartDialerPage() {
  const [activeTab, setActiveTab] = useState<
    "dialer" | "transcripts" | "mapping" | "analytics"
  >("mapping"); // Defaulting to mapping so you see it immediately!

  const [phoneNumber, setPhoneNumber] = useState("+1 (555) 234-8901");
  const [targetBrand, setTargetBrand] = useState("Salesforce Enterprise");
  const [isCallActive, setIsCallActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isOnHold, setIsOnHold] = useState(false);

  // Transcript Studio States
  const [transcripts, setTranscripts] =
    useState<CallTranscript[]>(initialTranscripts);
  const [selectedTranscript, setSelectedTranscript] =
    useState<CallTranscript | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isNewTranscriptModalOpen, setIsNewTranscriptModalOpen] =
    useState(false);

  // New Transcript Form State
  const [newClientName, setNewClientName] = useState("");
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newBrandInstance, setNewBrandInstance] = useState(
    "Salesforce Enterprise"
  );
  const [newTranscriptContent, setNewTranscriptContent] = useState("");

  // Mapping & Customization Menu States
  const [mappings, setMappings] = useState<FieldMapping[]>(initialMappings);
  const [priorityBrand, setPriorityBrand] = useState("Salesforce");
  const [conflictResolution, setConflictResolution] = useState(
    "Most recent timestamp wins"
  );
  const [isSchemaSaved, setIsSchemaSaved] = useState(false);

  const [newUnified, setNewUnified] = useState("");
  const [newSf, setNewSf] = useState("");
  const [newHubspot, setNewHubspot] = useState("");

  const handleKeyPress = (digit: string) => {
    setPhoneNumber((prev) => prev + digit);
  };

  const handleBackspace = () => {
    setPhoneNumber((prev) => prev.slice(0, -1));
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTranscript) return;
    setTranscripts(
      transcripts.map((t) =>
        t.id === selectedTranscript.id ? selectedTranscript : t
      )
    );
    setIsEditModalOpen(false);
  };

  const handleCreateTranscript = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName || !newTranscriptContent) return;

    const newEntry: CallTranscript = {
      id: `tr-${Date.now()}`,
      clientName: newClientName,
      company: newCompanyName || "Independent",
      brandInstance: newBrandInstance,
      date: "Just now",
      duration: "Custom Upload",
      source: "Manual Upload",
      content: newTranscriptContent,
      sentiment: "Positive",
      sentimentVariant: "cyan",
      forwardedToAi: true,
    };

    setTranscripts([newEntry, ...transcripts]);
    setNewClientName("");
    setNewCompanyName("");
    setNewTranscriptContent("");
    setIsNewTranscriptModalOpen(false);
  };

  const toggleForwardToAi = (id: string) => {
    setTranscripts(
      transcripts.map((t) =>
        t.id === id ? { ...t, forwardedToAi: !t.forwardedToAi } : t
      )
    );
  };

  const handleAddMapping = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUnified) return;

    const newItem: FieldMapping = {
      id: `m-${Date.now()}`,
      unifiedField: newUnified,
      salesforceField: newSf || "N/A",
      hubspotField: newHubspot || "N/A",
      zohoField: "N/A",
      pipedriveField: "N/A",
      dataType: "String",
    };

    setMappings([...mappings, newItem]);
    setNewUnified("");
    setNewSf("");
    setNewHubspot("");
  };

  const handleSaveSchemaConfig = () => {
    setIsSchemaSaved(true);
    setTimeout(() => setIsSchemaSaved(false), 3000);
  };

  return (
    <div className="space-y-6 text-crm-text font-sans relative min-h-screen">
      {/* Header & View Switcher */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <PhoneCall className="w-5 h-5 text-primary-cyan" />
            <h1 className="text-2xl font-bold tracking-tight text-crm-text">
              Multi-CRM Orchestrator & Smart Dialer Studio
            </h1>
          </div>
          <p className="text-xs text-crm-text-muted font-mono mt-1">
            Cross-brand contact mapping, schema customization, WebRTC cloud
            dialing, and AI transcript synchronization.
          </p>
        </div>

        {/* Tab Navigation & Status */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-crm-inner p-1 rounded-xl border border-crm-border-strong text-xs font-mono">
            <button
              onClick={() => setActiveTab("mapping")}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === "mapping"
                  ? "bg-primary-cyan text-slate-950 font-bold shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                  : "text-crm-text-muted hover:text-crm-text"
              }`}
            >
              <GitMerge className="w-3.5 h-3.5" /> Contact Mapping
            </button>
            <button
              onClick={() => setActiveTab("dialer")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === "dialer"
                  ? "bg-primary-cyan text-slate-950 font-bold shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                  : "text-crm-text-muted hover:text-crm-text"
              }`}
            >
              Active Dialer
            </button>
            <button
              onClick={() => setActiveTab("transcripts")}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === "transcripts"
                  ? "bg-primary-cyan text-slate-950 font-bold shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                  : "text-crm-text-muted hover:text-crm-text"
              }`}
            >
              <FileText className="w-3.5 h-3.5" /> Transcripts (
              {transcripts.length})
            </button>
            <button
              onClick={() => setActiveTab("analytics")}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === "analytics"
                  ? "bg-primary-cyan text-slate-950 font-bold shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                  : "text-crm-text-muted hover:text-crm-text"
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" /> Analytics
            </button>
          </div>

          <span className="hidden xl:flex px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono items-center gap-2 shadow-inner">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            Orchestrator: Active
          </span>
        </div>
      </div>

      {/* TAB 1: BRAND CONTACT MAPPING & CUSTOMIZATION MENU */}
      {activeTab === "mapping" && (
        <div className="space-y-6">
          {/* Top Bar inside Mapping */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-crm-text flex items-center gap-2">
                <GitMerge className="w-4 h-4 text-primary-cyan" /> Cross-Brand
                Contact Mapping & Scope Studio
              </h2>
              <p className="text-xs text-crm-text-muted font-mono mt-0.5">
                Configure unified contact schemas, multi-CRM attributes, and
                conflict resolution rules across distinct brand instances.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {isSchemaSaved && (
                <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono flex items-center gap-1.5 animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Schema
                  Deployed
                </span>
              )}
              <button
                onClick={handleSaveSchemaConfig}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-primary-cyan text-slate-950 hover:bg-cyan-300 transition-all font-mono shadow-[0_0_15px_rgba(6,182,212,0.3)] cursor-pointer"
              >
                Save Schema Configuration
              </button>
            </div>
          </div>

          {/* Brand Integrations Overview Bar */}
          <MultiCrmCard className="space-y-4">
            <div className="flex items-center justify-between border-b border-crm-border-strong pb-3">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary-cyan" />
                <h3 className="text-sm font-semibold text-crm-text">
                  Connected Brand Environments & Data Sources
                </h3>
              </div>
              <span className="text-xs font-mono text-crm-text-muted">
                6 Active Connectors
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {brandIntegrations.map((brand, index) => (
                <MultiCrmInnerPanel
                  key={index}
                  className="flex items-center justify-between py-3"
                >
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                      {brand.type}
                    </span>
                    <h4 className="text-xs font-bold text-crm-text">
                      {brand.name}
                    </h4>
                    <p className="text-[10px] font-mono text-crm-text-muted">
                      {brand.syncFreq}
                    </p>
                  </div>
                  <MultiCrmTag variant={brand.color}>
                    {brand.status}
                  </MultiCrmTag>
                </MultiCrmInnerPanel>
              ))}
            </div>
          </MultiCrmCard>

          {/* Main Grid: Customization Menu & Schema Table */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Conflict & Master Brand Priority Settings (4 cols) */}
            <div className="lg:col-span-4 space-y-6">
              <MultiCrmCard className="space-y-4">
                <div className="flex items-center gap-2 border-b border-crm-border-strong pb-3">
                  <Sliders className="w-4 h-4 text-secondary-pink" />
                  <h3 className="text-sm font-semibold text-crm-text">
                    Resolution & Priority Rules
                  </h3>
                </div>

                <div className="space-y-4 font-mono text-xs">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-crm-text-muted">
                      Master Authority Brand
                    </label>
                    <select
                      value={priorityBrand}
                      onChange={(e) => setPriorityBrand(e.target.value)}
                      className="w-full bg-crm-inner border border-crm-border-strong rounded-xl px-3 py-2.5 text-crm-text focus:outline-none focus:border-primary-cyan"
                    >
                      <option value="Salesforce">Salesforce Enterprise</option>
                      <option value="HubSpot">HubSpot CRM</option>
                      <option value="Zoho">Zoho CRM Plus</option>
                      <option value="Pipedrive">Pipedrive API</option>
                    </select>
                    <p className="text-[10px] text-slate-500">
                      Master brand overrides conflicting non-critical fields
                      during record merges.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-crm-text-muted">
                      Attribute Conflict Policy
                    </label>
                    <select
                      value={conflictResolution}
                      onChange={(e) => setConflictResolution(e.target.value)}
                      className="w-full bg-crm-inner border border-crm-border-strong rounded-xl px-3 py-2.5 text-crm-text focus:outline-none focus:border-primary-cyan"
                    >
                      <option value="Most recent timestamp wins">
                        Most recent timestamp wins
                      </option>
                      <option value="Master brand priority">
                        Master brand priority always
                      </option>
                      <option value="Manual queue review">
                        Flag for manual agent review
                      </option>
                    </select>
                  </div>

                  <MultiCrmInnerPanel className="space-y-2 py-3">
                    <div className="flex items-center gap-2 text-primary-cyan">
                      <ShieldCheck className="w-4 h-4" />
                      <span className="font-bold">
                        Data Isolation & Security
                      </span>
                    </div>
                    <p className="text-[11px] text-crm-text-muted leading-relaxed font-sans">
                      All cross-brand mappings are encrypted via TLS 1.3 and
                      validated against workspace access permissions before
                      synchronization.
                    </p>
                  </MultiCrmInnerPanel>
                </div>
              </MultiCrmCard>

              {/* Quick Add Custom Attribute */}
              <MultiCrmCard className="space-y-4">
                <div className="flex items-center gap-2 border-b border-crm-border-strong pb-3">
                  <Plus className="w-4 h-4 text-primary-cyan" />
                  <h3 className="text-sm font-semibold text-crm-text">
                    Add Custom Field Mapping
                  </h3>
                </div>

                <form
                  onSubmit={handleAddMapping}
                  className="space-y-3 font-mono text-xs"
                >
                  <div className="space-y-1">
                    <label className="text-[10px] text-crm-text-muted">
                      Unified Schema Field Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Lead Score / Region"
                      value={newUnified}
                      onChange={(e) => setNewUnified(e.target.value)}
                      className="w-full bg-crm-inner border border-crm-border-strong rounded-xl px-3 py-2 text-crm-text focus:outline-none focus:border-primary-cyan"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] text-crm-text-muted">
                        Salesforce Key
                      </label>
                      <input
                        type="text"
                        placeholder="SF Field"
                        value={newSf}
                        onChange={(e) => setNewSf(e.target.value)}
                        className="w-full bg-crm-inner border border-crm-border-strong rounded-xl px-3 py-2 text-crm-text focus:outline-none focus:border-primary-cyan"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-crm-text-muted">
                        HubSpot Key
                      </label>
                      <input
                        type="text"
                        placeholder="HS Field"
                        value={newHubspot}
                        onChange={(e) => setNewHubspot(e.target.value)}
                        className="w-full bg-crm-inner border border-crm-border-strong rounded-xl px-3 py-2 text-crm-text focus:outline-none focus:border-primary-cyan"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-primary-cyan hover:bg-cyan-300 text-slate-950 font-bold transition-all shadow-[0_0_15px_rgba(6,182,212,0.2)] cursor-pointer mt-2"
                  >
                    Map Attribute Across Brands
                  </button>
                </form>
              </MultiCrmCard>
            </div>

            {/* Right Column: Schema Mapping Table & Customization Matrix (8 cols) */}
            <MultiCrmCard className="lg:col-span-8 space-y-4 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-crm-border-strong pb-3">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-primary-cyan" />
                    <h3 className="text-sm font-semibold text-crm-text">
                      Unified Contact Attribute Matrix
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-crm-text-muted">
                    {mappings.length} Attributes Mapped
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left font-mono text-xs">
                    <thead>
                      <tr className="border-b border-crm-border-strong text-crm-text-muted">
                        <th className="py-3 px-3 font-semibold">
                          Unified Schema
                        </th>
                        <th className="py-3 px-3 font-semibold">Salesforce</th>
                        <th className="py-3 px-3 font-semibold">HubSpot</th>
                        <th className="py-3 px-3 font-semibold">
                          Zoho / Pipedrive
                        </th>
                        <th className="py-3 px-3 text-right font-semibold">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {mappings.map((m) => (
                        <tr
                          key={m.id}
                          className="hover:bg-crm-inner/60 transition-all"
                        >
                          <td className="py-3 px-3 font-bold text-crm-text flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary-cyan" />
                            {m.unifiedField}
                          </td>
                          <td className="py-3 px-3 text-crm-text-muted">
                            {m.salesforceField}
                          </td>
                          <td className="py-3 px-3 text-crm-text-muted">
                            {m.hubspotField}
                          </td>
                          <td className="py-3 px-3 text-crm-text-muted">
                            {m.zohoField} / {m.pipedriveField}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() =>
                                setMappings(
                                  mappings.filter((item) => item.id !== m.id)
                                )
                              }
                              className="p-1 rounded-lg hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition-all cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Bottom Live Sync Indicator */}
              <MultiCrmInnerPanel className="flex flex-col sm:flex-row items-center justify-between gap-3 py-3 mt-4">
                <div className="flex items-center gap-2.5 text-xs font-mono">
                  <RefreshCw className="w-4 h-4 text-primary-cyan animate-spin" />
                  <span className="text-crm-text-muted">
                    Continuous schema sync active across all brand webhooks.
                  </span>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono">
                  Status: 100% Synchronized
                </span>
              </MultiCrmInnerPanel>
            </MultiCrmCard>
          </div>
        </div>
      )}

      {/* TAB 2: ACTIVE DIALER & COPILOT */}
      {activeTab === "dialer" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Keypad & Call Control Center (5 cols) */}
          <MultiCrmCard className="lg:col-span-5 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs font-mono text-crm-text-muted">
                <span>TARGET DESTINATION</span>
                <span className="text-primary-cyan">US/CAN Gateway</span>
              </div>

              <div className="relative">
                <input
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="Enter phone number..."
                  className="w-full bg-crm-inner border border-crm-border-strong rounded-xl px-4 py-3 text-xl font-mono text-center tracking-widest text-crm-text focus:outline-none focus:border-primary-cyan/50 shadow-inner"
                />
                {phoneNumber && (
                  <button
                    onClick={handleBackspace}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-crm-text-muted hover:text-crm-text px-2 py-1 rounded bg-crm-surface/90 border border-crm-border-strong shadow-inner cursor-pointer"
                  >
                    DEL
                  </button>
                )}
              </div>

              {/* Brand Routing Selector */}
              <div className="space-y-1.5 font-mono text-xs">
                <label className="text-[10px] text-crm-text-muted flex items-center gap-1.5">
                  <GitBranch className="w-3 h-3 text-primary-cyan" /> Route Call
                  & Log to CRM Brand Instance
                </label>
                <select
                  value={targetBrand}
                  onChange={(e) => setTargetBrand(e.target.value)}
                  className="w-full bg-crm-inner border border-crm-border-strong rounded-xl px-3 py-2.5 text-crm-text focus:outline-none focus:border-primary-cyan"
                >
                  <option value="Salesforce Enterprise">
                    Salesforce Enterprise
                  </option>
                  <option value="HubSpot CRM">HubSpot CRM</option>
                  <option value="Zoho CRM Plus">Zoho CRM Plus</option>
                  <option value="Pipedrive API">Pipedrive API</option>
                </select>
              </div>
            </div>

            {/* Numerical Dialpad Grid */}
            <div className="grid grid-cols-3 gap-3 my-2">
              {[
                { num: "1", sub: "" },
                { num: "2", sub: "ABC" },
                { num: "3", sub: "DEF" },
                { num: "4", sub: "GHI" },
                { num: "5", sub: "JKL" },
                { num: "6", sub: "MNO" },
                { num: "7", sub: "PQRS" },
                { num: "8", sub: "TUV" },
                { num: "9", sub: "WXYZ" },
                { num: "*", sub: "" },
                { num: "0", sub: "+" },
                { num: "#", sub: "" },
              ].map((key) => (
                <button
                  key={key.num}
                  onClick={() => handleKeyPress(key.num)}
                  className="p-3.5 rounded-xl bg-crm-inner hover:bg-crm-surface border border-crm-border-strong hover:border-primary-cyan/40 text-crm-text transition-all flex flex-col items-center justify-center active:scale-95 shadow-inner cursor-pointer"
                >
                  <span className="text-lg font-mono font-bold">{key.num}</span>
                  {key.sub && (
                    <span className="text-[9px] font-mono text-slate-500 tracking-wider">
                      {key.sub}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Action Call Buttons */}
            <div className="space-y-3">
              {!isCallActive ? (
                <button
                  onClick={() => setIsCallActive(true)}
                  className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition-all shadow-[0_0_25px_rgba(16,185,129,0.3)] flex items-center justify-center gap-2 cursor-pointer font-mono"
                >
                  <PhoneCall className="w-4 h-4 fill-current" />
                  INITIATE OUTBOUND CALL ({targetBrand.split(" ")[0]})
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={() => setIsMuted(!isMuted)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer ${
                        isMuted
                          ? "bg-amber-500/20 text-amber-400 border-amber-500/40 shadow-inner"
                          : "bg-crm-inner text-crm-text-muted border-crm-border-strong hover:bg-crm-surface shadow-inner"
                      }`}
                    >
                      {isMuted ? (
                        <MicOff className="w-5 h-5" />
                      ) : (
                        <Mic className="w-5 h-5" />
                      )}
                    </button>

                    <button
                      onClick={() => setIsOnHold(!isOnHold)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer ${
                        isOnHold
                          ? "bg-amber-500/20 text-amber-400 border-amber-500/40 shadow-inner"
                          : "bg-crm-inner text-crm-text-muted border-crm-border-strong hover:bg-crm-surface shadow-inner"
                      }`}
                    >
                      {isOnHold ? (
                        <Play className="w-5 h-5" />
                      ) : (
                        <Pause className="w-5 h-5" />
                      )}
                    </button>

                    <button
                      onClick={() => setIsCallActive(false)}
                      className="flex-1 py-3.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-sm transition-all shadow-[0_0_20px_rgba(244,63,94,0.3)] flex items-center justify-center gap-2 cursor-pointer font-mono"
                    >
                      <PhoneOff className="w-4 h-4 fill-current" />
                      END CALL
                    </button>
                  </div>
                </div>
              )}
            </div>
          </MultiCrmCard>

          {/* Right Column: AI Live Assistant & Call History (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <MultiCrmCard className="space-y-4 relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-primary-cyan/15 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-secondary-pink animate-pulse" />
                  <h3 className="text-sm font-semibold text-crm-text">
                    AI Real-Time Call Assistant ({targetBrand})
                  </h3>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-purple-500/10 text-purple-400 border border-purple-500/20 shadow-inner">
                  {isCallActive ? "Live Listening" : "Standby Mode"}
                </span>
              </div>

              {isCallActive ? (
                <div className="space-y-4">
                  <MultiCrmInnerPanel className="space-y-2 border-primary-cyan/25">
                    <div className="flex items-center justify-between text-xs font-mono text-primary-cyan">
                      <span className="flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5" /> Suggested Objection
                        Handler
                      </span>
                      <span>94% Confidence</span>
                    </div>
                    <p className="text-xs text-crm-text leading-relaxed font-mono">
                      "I understand budget is a primary concern. Our multi-CRM
                      orchestration across {targetBrand} actually reduces
                      redundant API licensing costs by an average of 28%."
                    </p>
                  </MultiCrmInnerPanel>

                  <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                    <MultiCrmInnerPanel className="py-3">
                      <span className="text-[10px] text-slate-500 block">
                        DETECTED SENTIMENT
                      </span>
                      <span className="text-emerald-400 mt-1 block font-bold">
                        Positive (High Intent)
                      </span>
                    </MultiCrmInnerPanel>
                    <MultiCrmInnerPanel className="py-3">
                      <span className="text-[10px] text-slate-500 block">
                        TALK / LISTEN RATIO
                      </span>
                      <span className="text-crm-text mt-1 block font-bold">
                        42% / 58% (Optimal)
                      </span>
                    </MultiCrmInnerPanel>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center space-y-2">
                  <Bot className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-xs text-crm-text-muted font-mono">
                    Initiate a call to trigger live transcription, sentiment
                    tracking, and instant objection prompts mapped to{" "}
                    {targetBrand}.
                  </p>
                </div>
              )}
            </MultiCrmCard>

            {/* Recent Call Logs */}
            <MultiCrmCard className="space-y-4">
              <div className="flex items-center justify-between border-b border-primary-cyan/15 pb-3">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-crm-text-muted" />
                  <h3 className="text-sm font-semibold text-crm-text">
                    Recent Call History & Brand Sync
                  </h3>
                </div>
                <span className="text-xs font-mono text-slate-500">
                  Last 24 Hours
                </span>
              </div>

              <div className="space-y-3">
                {recentCalls.map((call) => (
                  <MultiCrmInnerPanel
                    key={call.id}
                    className="flex items-center justify-between py-3 hover:border-primary-cyan/40 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-crm-surface border border-crm-border-strong text-crm-text-muted shadow-inner">
                        {call.type === "outgoing" ? (
                          <PhoneOutgoing className="w-4 h-4 text-primary-cyan" />
                        ) : (
                          <PhoneIncoming className="w-4 h-4 text-emerald-400" />
                        )}
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-crm-text">
                          {call.name}{" "}
                          <span className="text-[10px] font-mono text-primary-cyan ml-1">
                            ({call.brand})
                          </span>
                        </h4>
                        <p className="text-[11px] text-crm-text-muted font-mono">
                          {call.company} • {call.number}
                        </p>
                      </div>
                    </div>

                    <div className="text-right space-y-1 font-mono">
                      <MultiCrmTag variant={call.sentimentVariant}>
                        {call.sentiment}
                      </MultiCrmTag>
                      <p className="text-[10px] text-slate-500">
                        {call.duration} • {call.time}
                      </p>
                    </div>
                  </MultiCrmInnerPanel>
                ))}
              </div>
            </MultiCrmCard>
          </div>
        </div>
      )}

      {/* TAB 3: TRANSCRIPT STUDIO & EDITOR */}
      {activeTab === "transcripts" && (
        <div className="space-y-6">
          <MultiCrmCard className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-sm font-bold text-crm-text flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary-cyan" /> Call
                Transcript & Cross-Brand AI Agent Hub
              </h2>
              <p className="text-xs text-crm-text-muted font-mono">
                Manage, edit, and push auto-recorded or custom transcripts
                directly to your AI agent for intent indexing across CRM
                instances.
              </p>
            </div>

            <button
              onClick={() => setIsNewTranscriptModalOpen(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-primary-cyan text-slate-950 hover:bg-cyan-300 flex items-center gap-2 font-mono shadow-[0_0_15px_rgba(6,182,212,0.3)] cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" /> Add Custom Transcript
            </button>
          </MultiCrmCard>

          {/* Transcripts List Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {transcripts.map((tr) => (
              <MultiCrmCard
                key={tr.id}
                className="space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between border-b border-crm-border-strong pb-3">
                    <div>
                      <h3 className="text-sm font-bold text-crm-text flex items-center gap-2">
                        {tr.clientName}
                        <span className="text-xs font-mono text-crm-text-muted">
                          ({tr.company})
                        </span>
                      </h3>
                      <p className="text-[10px] font-mono text-slate-500 mt-0.5">
                        {tr.date} •{" "}
                        <span className="text-primary-cyan">
                          {tr.brandInstance}
                        </span>{" "}
                        • {tr.duration}
                      </p>
                    </div>
                    <MultiCrmTag variant={tr.sentimentVariant}>
                      {tr.sentiment}
                    </MultiCrmTag>
                  </div>

                  {/* Transcript Content Box */}
                  <div className="p-3 bg-crm-inner rounded-xl border border-crm-border font-mono text-xs text-crm-text-muted leading-relaxed whitespace-pre-line max-h-36 overflow-y-auto">
                    {tr.content}
                  </div>
                </div>

                {/* Actions Bar */}
                <div className="flex items-center justify-between border-t border-crm-border-strong pt-3 font-mono text-xs">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleForwardToAi(tr.id)}
                      className={`px-2.5 py-1 rounded-lg border text-[11px] transition-all flex items-center gap-1.5 cursor-pointer ${
                        tr.forwardedToAi
                          ? "bg-purple-500/20 text-purple-300 border-purple-500/40"
                          : "bg-crm-inner text-crm-text-muted border-crm-border-strong hover:text-crm-text"
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      {tr.forwardedToAi
                        ? "Synced to AI Agent"
                        : "Forward to AI"}
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedTranscript(tr);
                        setIsEditModalOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-crm-inner hover:bg-crm-surface border border-crm-border-strong text-crm-text-muted flex items-center gap-1.5 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-primary-cyan" /> Edit
                    </button>
                    <button
                      onClick={() =>
                        setTranscripts(
                          transcripts.filter((t) => t.id !== tr.id)
                        )
                      }
                      className="p-1.5 rounded-lg bg-crm-inner hover:bg-rose-500/20 border border-crm-border-strong hover:border-rose-500/40 text-crm-text-muted hover:text-rose-400 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </MultiCrmCard>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: VOICE ANALYTICS */}
      {activeTab === "analytics" && (
        <div className="space-y-6">
          <MultiCrmCard className="space-y-4">
            <div className="flex items-center justify-between border-b border-crm-border-strong pb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary-cyan" />
                <h3 className="text-sm font-semibold text-crm-text">
                  Cross-Brand Voice & Call Analytics
                </h3>
              </div>
              <span className="text-xs font-mono text-crm-text-muted">
                Aggregated Telephony Insights
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono">
              <MultiCrmInnerPanel className="space-y-2 py-4">
                <span className="text-[10px] text-slate-500 uppercase">
                  Total Outbound / Inbound
                </span>
                <h3 className="text-xl font-bold text-crm-text">
                  1,482 Calls
                </h3>
                <p className="text-[10px] text-emerald-400">
                  +18.4% from last week
                </p>
              </MultiCrmInnerPanel>
              <MultiCrmInnerPanel className="space-y-2 py-4">
                <span className="text-[10px] text-slate-500 uppercase">
                  Average Call Duration
                </span>
                <h3 className="text-xl font-bold text-crm-text">07m 14s</h3>
                <p className="text-[10px] text-primary-cyan">
                  Optimal engagement window
                </p>
              </MultiCrmInnerPanel>
              <MultiCrmInnerPanel className="space-y-2 py-4">
                <span className="text-[10px] text-slate-500 uppercase">
                  AI Intent Conversion Rate
                </span>
                <h3 className="text-xl font-bold text-crm-text">34.2%</h3>
                <p className="text-[10px] text-purple-400">
                  Synced across 4 CRM brands
                </p>
              </MultiCrmInnerPanel>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
              <MultiCrmInnerPanel className="space-y-3">
                <h4 className="text-xs font-bold text-crm-text font-mono">
                  Call Distribution by Brand Instance
                </h4>
                <div className="space-y-2 font-mono text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-crm-text-muted">
                      Salesforce Enterprise
                    </span>
                    <span className="text-crm-text font-bold">
                      45% (667 calls)
                    </span>
                  </div>
                  <div className="w-full bg-crm-surface h-2 rounded-full overflow-hidden">
                    <div className="bg-primary-cyan h-full w-[45%]" />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-crm-text-muted">HubSpot CRM</span>
                    <span className="text-crm-text font-bold">
                      30% (445 calls)
                    </span>
                  </div>
                  <div className="w-full bg-crm-surface h-2 rounded-full overflow-hidden">
                    <div className="bg-purple-400 h-full w-[30%]" />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-crm-text-muted">
                      Zoho CRM Plus / Pipedrive
                    </span>
                    <span className="text-crm-text font-bold">
                      25% (370 calls)
                    </span>
                  </div>
                  <div className="w-full bg-crm-surface h-2 rounded-full overflow-hidden">
                    <div className="bg-secondary-pink h-full w-[25%]" />
                  </div>
                </div>
              </MultiCrmInnerPanel>

              <MultiCrmInnerPanel className="space-y-3">
                <h4 className="text-xs font-bold text-crm-text font-mono">
                  Sentiment Breakdown
                </h4>
                <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                  <div className="p-3 bg-crm-surface rounded-xl border border-crm-border space-y-1">
                    <span className="text-[10px] text-emerald-400 block font-bold">
                      POSITIVE / HIGH INTENT
                    </span>
                    <span className="text-lg font-bold text-crm-text">
                      68%
                    </span>
                    <p className="text-[10px] text-crm-text-muted">
                      Ready for automated pipeline stage advance
                    </p>
                  </div>
                  <div className="p-3 bg-crm-surface rounded-xl border border-crm-border space-y-1">
                    <span className="text-[10px] text-amber-400 block font-bold">
                      OBJECTION HEAVY
                    </span>
                    <span className="text-lg font-bold text-crm-text">
                      32%
                    </span>
                    <p className="text-[10px] text-crm-text-muted">
                      Requires AI objection handler playbook review
                    </p>
                  </div>
                </div>
              </MultiCrmInnerPanel>
            </div>
          </MultiCrmCard>
        </div>
      )}

      {/* EDIT TRANSCRIPT MODAL */}
      {isEditModalOpen && selectedTranscript && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-crm-surface border border-white/15 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl p-6 space-y-5 font-sans">
            <div className="flex items-center justify-between border-b border-crm-border-strong pb-3">
              <h3 className="text-sm font-bold text-crm-text flex items-center gap-2 font-mono">
                <Edit3 className="w-4 h-4 text-primary-cyan" /> Edit Transcript
                & AI Context
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-crm-text-muted hover:text-crm-text cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                <div className="space-y-1">
                  <label className="text-[10px] text-crm-text-muted">
                    Client Name
                  </label>
                  <input
                    type="text"
                    value={selectedTranscript.clientName}
                    onChange={(e) =>
                      setSelectedTranscript({
                        ...selectedTranscript,
                        clientName: e.target.value,
                      })
                    }
                    className="w-full bg-crm-inner border border-crm-border-strong rounded-xl px-3 py-2 text-crm-text focus:outline-none focus:border-primary-cyan"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-crm-text-muted">
                    Sentiment Tag
                  </label>
                  <select
                    value={selectedTranscript.sentiment}
                    onChange={(e: any) =>
                      setSelectedTranscript({
                        ...selectedTranscript,
                        sentiment: e.target.value,
                      })
                    }
                    className="w-full bg-crm-inner border border-crm-border-strong rounded-xl px-3 py-2 text-crm-text focus:outline-none focus:border-primary-cyan font-mono"
                  >
                    <option value="Positive">Positive</option>
                    <option value="Neutral">Neutral</option>
                    <option value="High Intent">High Intent</option>
                    <option value="Objection Heavy">Objection Heavy</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1 font-mono text-xs">
                <label className="text-[10px] text-crm-text-muted">
                  CRM Brand Instance
                </label>
                <input
                  type="text"
                  value={selectedTranscript.brandInstance}
                  onChange={(e) =>
                    setSelectedTranscript({
                      ...selectedTranscript,
                      brandInstance: e.target.value,
                    })
                  }
                  className="w-full bg-crm-inner border border-crm-border-strong rounded-xl px-3 py-2 text-crm-text focus:outline-none focus:border-primary-cyan"
                />
              </div>

              <div className="space-y-1 font-mono text-xs">
                <label className="text-[10px] text-crm-text-muted">
                  Transcript Content / Notes (Forwarded to AI Agent)
                </label>
                <textarea
                  rows={6}
                  value={selectedTranscript.content}
                  onChange={(e) =>
                    setSelectedTranscript({
                      ...selectedTranscript,
                      content: e.target.value,
                    })
                  }
                  className="w-full bg-crm-inner border border-crm-border-strong rounded-xl p-3 text-crm-text focus:outline-none focus:border-primary-cyan leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-between border-t border-crm-border-strong pt-4 font-mono text-xs">
                <label className="flex items-center gap-2 cursor-pointer text-crm-text-muted">
                  <input
                    type="checkbox"
                    checked={selectedTranscript.forwardedToAi}
                    onChange={(e) =>
                      setSelectedTranscript({
                        ...selectedTranscript,
                        forwardedToAi: e.target.checked,
                      })
                    }
                    className="rounded bg-crm-inner border-white/20 text-primary-cyan focus:ring-0"
                  />
                  Auto-forward updates to AI Agent
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-crm-text-muted hover:text-crm-text cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl font-bold bg-primary-cyan text-slate-950 hover:bg-cyan-300 cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD NEW TRANSCRIPT MODAL */}
      {isNewTranscriptModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-crm-surface border border-white/15 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl p-6 space-y-5 font-sans">
            <div className="flex items-center justify-between border-b border-crm-border-strong pb-3">
              <h3 className="text-sm font-bold text-crm-text flex items-center gap-2 font-mono">
                <Plus className="w-4 h-4 text-primary-cyan" /> Add Custom
                Transcript for AI Agent
              </h3>
              <button
                onClick={() => setIsNewTranscriptModalOpen(false)}
                className="text-crm-text-muted hover:text-crm-text cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTranscript} className="space-y-4">
              <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                <div className="space-y-1">
                  <label className="text-[10px] text-crm-text-muted">
                    Client Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Rachel Chen"
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    className="w-full bg-crm-inner border border-crm-border-strong rounded-xl px-3 py-2 text-crm-text focus:outline-none focus:border-primary-cyan"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-crm-text-muted">Company</label>
                  <input
                    type="text"
                    placeholder="e.g. Wayne Ent."
                    value={newCompanyName}
                    onChange={(e) => setNewCompanyName(e.target.value)}
                    className="w-full bg-crm-inner border border-crm-border-strong rounded-xl px-3 py-2 text-crm-text focus:outline-none focus:border-primary-cyan"
                  />
                </div>
              </div>

              <div className="space-y-1 font-mono text-xs">
                <label className="text-[10px] text-crm-text-muted">
                  Target CRM Brand Instance
                </label>
                <select
                  value={newBrandInstance}
                  onChange={(e) => setNewBrandInstance(e.target.value)}
                  className="w-full bg-crm-inner border border-crm-border-strong rounded-xl px-3 py-2 text-crm-text focus:outline-none focus:border-primary-cyan"
                >
                  <option value="Salesforce Enterprise">
                    Salesforce Enterprise
                  </option>
                  <option value="HubSpot CRM">HubSpot CRM</option>
                  <option value="Zoho CRM Plus">Zoho CRM Plus</option>
                  <option value="Pipedrive API">Pipedrive API</option>
                </select>
              </div>

              <div className="space-y-1 font-mono text-xs">
                <label className="text-[10px] text-crm-text-muted">
                  Transcript Dialogue / Notes *
                </label>
                <textarea
                  rows={5}
                  placeholder="Paste transcript or call notes here..."
                  value={newTranscriptContent}
                  onChange={(e) => setNewTranscriptContent(e.target.value)}
                  className="w-full bg-crm-inner border border-crm-border-strong rounded-xl p-3 text-crm-text focus:outline-none focus:border-primary-cyan leading-relaxed"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-crm-border-strong pt-4 font-mono text-xs">
                <button
                  type="button"
                  onClick={() => setIsNewTranscriptModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-crm-text-muted hover:text-crm-text cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl font-bold bg-primary-cyan text-slate-950 hover:bg-cyan-300 cursor-pointer"
                >
                  Save & Forward to AI
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
