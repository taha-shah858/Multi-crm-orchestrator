"use client";

import { useState } from "react";
import {
  Users,
  Search,
  Sparkles,
  Phone,
  Mail,
  ExternalLink,
  Building2,
  SlidersHorizontal,
  ArrowUpDown,
  Download,
  Plus,
  Tag,
  ArrowLeft,
  Send,
  Edit3,
  MoreHorizontal,
  ChevronRight,
  Globe,
  Filter,
  X,
  Sliders,
  Database,
  Calendar,
  Layers,
  MapPin,
  Briefcase,
  DollarSign,
  ShieldCheck,
  RefreshCw,
  Eye,
  Settings2,
} from "lucide-react";
import {
  MultiCrmCard,
  MultiCrmInnerPanel,
  MultiCrmTag,
} from "@/components/ui/MultiCrmCard";
import type { NormalizedContact } from "@/lib/models/contact";

// Comprehensive Lead Data Structure
interface Lead {
  id: string;
  name: string;
  title: string;
  company: string;
  email: string;
  phone: string;
  mobile: string;
  leadSource: string;
  crmSource: "Salesforce" | "HubSpot" | "Zoho" | "Pipedrive";
  pulledFrom: string; // e.g. "Salesforce REST API v58.0"
  pulledAt: string; // e.g. "2026-08-11 09:30 AM"
  syncStatus: "Synced" | "Pending" | "Conflict";
  leadOwner: string;
  status: string;
  rating: "Hot" | "Warm" | "Cold" | "Unrated";
  score: number | null;
  industry: string;
  annualRevenue: string;
  website: string;
  address: string;
  description: string;
  variant: "cyan" | "purple" | "magenta" | "neutral";
}

const initialLeads: Lead[] = [
  {
    id: "LD-9021",
    name: "Mr. Christopher Maclead",
    title: "VP Accounting",
    company: "Rangoni Of Florence",
    email: "christopher-maclead@noemail.invalid",
    phone: "+1 (555) 234-8901",
    mobile: "+1 (555) 234-8902",
    leadSource: "Cold Call",
    crmSource: "Salesforce",
    pulledFrom: "Salesforce Enterprise Cluster EU-1",
    pulledAt: "2026-08-11 09:14 AM",
    syncStatus: "Synced",
    leadOwner: "Muhammad Kashif",
    status: "Lost Lead",
    rating: "Hot",
    score: 92,
    industry: "Service Provider",
    annualRevenue: "PKR 8,50,000.00",
    website: "http://www.rangoniofflorence.com",
    address: "Suite 400, Florence Ave, Italy",
    description:
      "Evaluated enterprise multi-tier accounting synchronization module.",
    variant: "cyan",
  },
  {
    id: "LD-9022",
    name: "Carissa Kidman",
    title: "Procurement Lead",
    company: "Oh My Goodknits Inc",
    email: "carissa-kidman@noemail.invalid",
    phone: "+1 (555) 876-5432",
    mobile: "+1 (555) 876-5433",
    leadSource: "Advertisement",
    crmSource: "HubSpot",
    pulledFrom: "HubSpot Inbound Webhook Node #4",
    pulledAt: "2026-08-11 08:45 AM",
    syncStatus: "Synced",
    leadOwner: "Muhammad Kashif",
    status: "Contacted",
    rating: "Warm",
    score: 88,
    industry: "Textile & Apparel",
    annualRevenue: "PKR 1,200,000.00",
    website: "http://www.goodknits.com",
    address: "742 Evergreen Terrace, Sector B",
    description:
      "Inbound campaign respondent interested in supply chain CRM routing.",
    variant: "neutral",
  },
  {
    id: "LD-9023",
    name: "James Merced",
    title: "Operations Director",
    company: "Kwik Kopy Printing",
    email: "james-merced@noemail.invalid",
    phone: "+1 (555) 345-6789",
    mobile: "+1 (555) 345-6790",
    leadSource: "Web Download",
    crmSource: "Zoho",
    pulledFrom: "Zoho CRM Sync Pipeline",
    pulledAt: "2026-08-10 11:20 PM",
    syncStatus: "Conflict",
    leadOwner: "Muhammad Kashif",
    status: "Pre-Qualified",
    rating: "Cold",
    score: 74,
    industry: "Printing & Media",
    annualRevenue: "PKR 3,400,000.00",
    website: "http://www.kwikkopy.com",
    address: "Industrial Area Block 3, Lahore",
    description:
      "Downloaded API technical specification paper for CRM integration.",
    variant: "purple",
  },
];

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCrm, setSelectedCrm] = useState("All");
  const [scoreFilter, setScoreFilter] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<"overview" | "timeline">(
    "overview"
  );
  const [showCreateModal, setShowCreateModal] = useState(false);

  // CRM Import POC State
  const [isImporting, setIsImporting] = useState(false);
  const [importFeedback, setImportFeedback] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });

  /**
   * Temporary POC Frontend Adapter:
   * Maps backend NormalizedContact to the existing Lead interface used by this UI.
   * NOTE: This is temporary POC logic to avoid refactoring the existing frontend.
   */
  const mapNormalizedContactToLead = (contact: NormalizedContact): Lead => {
    const fullName = `${contact.first_name} ${contact.last_name}`.trim() || "Unnamed Contact";
    return {
      id: `HS-${contact.id}`,
      name: fullName,
      title: "Contact",
      company: contact.company || "Independent",
      email: contact.email || "no-email@hubspot.com",
      phone: contact.phone || "N/A",
      mobile: "N/A",
      leadSource: "HubSpot CRM Import",
      crmSource: "HubSpot",
      pulledFrom: "HubSpot CRM REST API v3",
      pulledAt: new Date().toLocaleString(),
      syncStatus: "Synced",
      leadOwner: "HubSpot Integration",
      status: "Active Lead",
      rating: "Unrated", // Real data: no fabricated rating
      score: null, // Real data: no fabricated score
      industry: "General",
      annualRevenue: "N/A",
      website: "",
      address: "Imported from HubSpot",
      description: `Imported via Multi-CRM Backend from HubSpot Contact ID #${contact.id}`,
      variant: "neutral",
    };
  };

  /**
   * Trigger backend import from HubSpot CRM and merge newly fetched contacts
   * while preventing duplicates based on the unique HubSpot Contact ID.
   */
  const handleImportFromHubSpot = async () => {
    setIsImporting(true);
    setImportFeedback({ type: null, message: "" });

    try {
      const res = await fetch("/api/contacts/import");
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to import contacts from HubSpot.");
      }

      const importedContacts: NormalizedContact[] = data.contacts || [];

      if (importedContacts.length === 0) {
        setImportFeedback({
          type: "success",
          message: "HubSpot query completed: No contacts found in connected account.",
        });
        return;
      }

      // Convert imported contacts to the UI's Lead format
      const convertedLeads = importedContacts.map(mapNormalizedContactToLead);

      // Prevent obvious duplicates by filtering out any contact IDs already in state
      setLeads((prevLeads) => {
        const existingIds = new Set(prevLeads.map((l) => l.id));
        const newUniqueLeads = convertedLeads.filter((l) => !existingIds.has(l.id));

        if (newUniqueLeads.length === 0) {
          setImportFeedback({
            type: "success",
            message: `All ${convertedLeads.length} HubSpot contact(s) are already present in the directory.`,
          });
          return prevLeads;
        }

        setImportFeedback({
          type: "success",
          message: `Successfully imported ${newUniqueLeads.length} new contact(s) from HubSpot CRM.`,
        });

        return [...newUniqueLeads, ...prevLeads];
      });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Unable to complete HubSpot CRM import.";
      setImportFeedback({
        type: "error",
        message: errMsg,
      });
    } finally {
      setIsImporting(false);
    }
  };

  // Expanded Create Lead State
  const [newLead, setNewLead] = useState({
    name: "",
    title: "",
    company: "",
    email: "",
    phone: "",
    mobile: "",
    leadSource: "Cold Call",
    crmSource: "Salesforce" as Lead["crmSource"],
    leadOwner: "Muhammad Kashif",
    status: "Attempted to Contact",
    rating: "Warm" as Lead["rating"],
    industry: "Technology",
    annualRevenue: "PKR 0.00",
    website: "http://",
    address: "",
    description: "",
  });

  const handleCreateLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLead.name) return;

    const variantMap: Record<Lead["crmSource"], Lead["variant"]> = {
      Salesforce: "cyan",
      HubSpot: "neutral",
      Zoho: "purple",
      Pipedrive: "magenta",
    };

    const created: Lead = {
      id: `LD-${Math.floor(9000 + Math.random() * 999)}`,
      name: newLead.name,
      title: newLead.title || "Key Prospect",
      company: newLead.company || "Independent",
      email: newLead.email || "noemail@crm.invalid",
      phone: newLead.phone || "N/A",
      mobile: newLead.mobile || "N/A",
      leadSource: newLead.leadSource,
      crmSource: newLead.crmSource,
      pulledFrom: `Direct Manual Entry (${newLead.crmSource})`,
      pulledAt: new Date().toLocaleString(),
      syncStatus: "Synced",
      leadOwner: newLead.leadOwner,
      status: newLead.status,
      rating: newLead.rating,
      score: Math.floor(60 + Math.random() * 35),
      industry: newLead.industry,
      annualRevenue: newLead.annualRevenue,
      website: newLead.website,
      address: newLead.address || "Unspecified Location",
      description: newLead.description || "Manually added unified record.",
      variant: variantMap[newLead.crmSource],
    };

    setLeads([created, ...leads]);
    setShowCreateModal(false);
    setNewLead({
      name: "",
      title: "",
      company: "",
      email: "",
      phone: "",
      mobile: "",
      leadSource: "Cold Call",
      crmSource: "Salesforce",
      leadOwner: "Muhammad Kashif",
      status: "Attempted to Contact",
      rating: "Warm",
      industry: "Technology",
      annualRevenue: "PKR 0.00",
      website: "http://",
      address: "",
      description: "",
    });
  };

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCrm =
      selectedCrm === "All" ||
      lead.crmSource.toLowerCase() === selectedCrm.toLowerCase();
    const matchesScore =
      scoreFilter === 0 || (lead.score !== null && lead.score >= scoreFilter);

    return matchesSearch && matchesCrm && matchesScore;
  });

  return (
    <div className="space-y-6 text-slate-100 font-sans">
      {!selectedLead ? (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary-cyan" />
                <h1 className="text-2xl font-bold tracking-tight text-slate-100">
                  Unified Lead Directory
                </h1>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-1">
                Aggregated cross-CRM records with real-time AI scoring, source
                lineage tracking, and live routing.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* POC: Real HubSpot Import Action Button */}
              <button
                onClick={handleImportFromHubSpot}
                disabled={isImporting}
                className="px-4 py-2 rounded-xl bg-orange-500/10 border border-orange-500/30 text-xs font-mono text-orange-400 hover:bg-orange-500/20 hover:border-orange-500/50 transition-all flex items-center gap-2 shadow-inner cursor-pointer disabled:opacity-50"
                title="Import live contacts directly from HubSpot CRM v3 API"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${
                    isImporting ? "animate-spin text-orange-400" : "text-orange-400"
                  }`}
                />
                <span>
                  {isImporting ? "Importing from HubSpot..." : "Import from HubSpot"}
                </span>
              </button>

              <button className="px-4 py-2 rounded-xl bg-crm-surface border border-primary-cyan/30 text-xs font-mono text-slate-300 hover:text-white hover:border-primary-cyan/60 transition-all flex items-center gap-2 shadow-inner cursor-pointer">
                <Download className="w-3.5 h-3.5 text-slate-400" />
                Export CSV
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-linear-to-r from-primary-cyan to-secondary-pink text-slate-950 hover:opacity-90 transition-all flex items-center gap-2 cursor-pointer shadow-[0_0_20px_color-mix(in_srgb,var(--color-primary-cyan)_25%,transparent)]"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Detailed Lead
              </button>
            </div>
          </div>

          {/* User-facing Import Feedback Banner */}
          {importFeedback.type && (
            <div
              className={`p-3 rounded-xl border text-xs font-mono flex items-center justify-between transition-all ${
                importFeedback.type === "success"
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                  : "bg-rose-500/10 border-rose-500/30 text-rose-300"
              }`}
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>{importFeedback.message}</span>
              </div>
              <button
                onClick={() => setImportFeedback({ type: null, message: "" })}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* SLIDER / DIVERSE SETTINGS & CUSTOMIZATION TOOLBAR */}
          <MultiCrmCard className="p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <span className="text-xs font-mono font-bold text-slate-300 flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-primary-cyan" /> Lead
                Customization & Control Hub
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                Slide right → to explore additional pipeline controls
              </span>
            </div>

            {/* Horizontal Scrollable Slider Bar */}
            <div className="overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-primary-cyan/20">
              <div className="flex items-center gap-4 min-w-max">
                {/* Search Box */}
                <div className="relative w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search leads, companies..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-crm-inner border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-primary-cyan/50"
                  />
                </div>

                {/* CRM Filter Selector */}
                <div className="flex items-center gap-1.5 bg-crm-inner p-1 rounded-xl border border-white/10">
                  <span className="text-[11px] font-mono text-slate-400 px-2 flex items-center gap-1">
                    <Database className="w-3 h-3 text-primary-cyan" /> Source:
                  </span>
                  {["All", "Salesforce", "HubSpot", "Zoho", "Pipedrive"].map(
                    (crm) => (
                      <button
                        key={crm}
                        onClick={() => setSelectedCrm(crm)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                          selectedCrm === crm
                            ? "bg-primary-cyan/20 text-primary-cyan border border-primary-cyan/40 font-semibold"
                            : "text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        {crm}
                      </button>
                    )
                  )}
                </div>

                {/* Score Slider Control */}
                <div className="flex items-center gap-3 bg-crm-inner px-3 py-1.5 rounded-xl border border-white/10">
                  <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-secondary-pink" /> Min
                    Score:
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="90"
                    step="10"
                    value={scoreFilter}
                    onChange={(e) => setScoreFilter(Number(e.target.value))}
                    className="w-24 accent-primary-cyan cursor-pointer"
                  />
                  <span className="text-xs font-mono font-bold text-primary-cyan w-6">
                    {scoreFilter}+
                  </span>
                </div>

                {/* Quick Quick Actions & Display Options */}
                <div className="flex items-center gap-2">
                  <button className="px-3 py-1.5 rounded-xl bg-crm-inner border border-white/10 text-xs font-mono text-slate-300 hover:text-white hover:border-white/30 flex items-center gap-1.5 cursor-pointer whitespace-nowrap">
                    <Layers className="w-3.5 h-3.5 text-purple-400" /> Group by
                    Origin
                  </button>
                  <button className="px-3 py-1.5 rounded-xl bg-crm-inner border border-white/10 text-xs font-mono text-slate-300 hover:text-white hover:border-white/30 flex items-center gap-1.5 cursor-pointer whitespace-nowrap">
                    <RefreshCw className="w-3.5 h-3.5 text-emerald-400" /> Force
                    Sync All
                  </button>
                  <button className="px-3 py-1.5 rounded-xl bg-crm-inner border border-white/10 text-xs font-mono text-slate-300 hover:text-white hover:border-white/30 flex items-center gap-1.5 cursor-pointer whitespace-nowrap">
                    <Eye className="w-3.5 h-3.5 text-amber-400" /> Column
                    Visibility
                  </button>
                </div>
              </div>
            </div>
          </MultiCrmCard>

          {/* Directory Content Table */}
          <MultiCrmCard className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 bg-crm-inner/50 text-[11px] font-mono text-slate-400">
                    <th className="p-3.5">
                      <input
                        type="checkbox"
                        className="rounded border-white/20 bg-crm-inner"
                      />
                    </th>
                    <th className="py-3.5 px-4 font-medium">LEAD / COMPANY</th>
                    <th className="py-3.5 px-4 font-medium">
                      PULLED SOURCE ORIGIN
                    </th>
                    <th className="py-3.5 px-4 font-medium">SYNC TIMING</th>
                    <th className="py-3.5 px-4 font-medium">RATING & SCORE</th>
                    <th className="py-3.5 px-4 font-medium">STATUS</th>
                    <th className="py-3.5 px-4 font-medium text-right">
                      ACTIONS
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10 text-xs font-mono">
                  {filteredLeads.map((lead) => (
                    <tr
                      key={lead.id}
                      onClick={() => setSelectedLead(lead)}
                      className="hover:bg-crm-inner/80 transition-colors cursor-pointer group"
                    >
                      <td className="p-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="rounded border-white/20 bg-crm-inner"
                        />
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-semibold text-primary-cyan group-hover:underline flex items-center gap-2">
                          {lead.name}
                          <span className="text-[10px] text-slate-500 font-normal">
                            {lead.id}
                          </span>
                        </div>
                        <div className="text-slate-400 text-[11px] flex items-center gap-1 mt-0.5">
                          <Building2 className="w-3 h-3 text-slate-500" />{" "}
                          {lead.company} • {lead.title}
                        </div>
                      </td>

                      {/* Pull Source Origin Details */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1.5">
                          <MultiCrmTag variant={lead.variant}>
                            {lead.crmSource}
                          </MultiCrmTag>
                          <span
                            className="text-[10px] text-slate-400 truncate max-w-35"
                            title={lead.pulledFrom}
                          >
                            {lead.pulledFrom}
                          </span>
                        </div>
                      </td>

                      {/* Sync Timestamp */}
                      <td className="py-4 px-4">
                        <div className="text-slate-300 text-[11px]">
                          {lead.pulledAt}
                        </div>
                        <span
                          className={`text-[10px] font-semibold ${
                            lead.syncStatus === "Synced"
                              ? "text-emerald-400"
                              : "text-amber-400"
                          }`}
                        >
                          ● {lead.syncStatus}
                        </span>
                      </td>

                      {/* Rating & Score */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] text-slate-300">
                            {lead.rating}
                          </span>
                          {lead.score !== null ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 font-bold">
                              <Sparkles className="w-3 h-3" /> {lead.score}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800/60 text-slate-400 border border-slate-700 text-[10px]">
                              —
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        <span className="px-2.5 py-1 rounded-full text-[10px] bg-crm-inner text-slate-300 border border-white/10">
                          {lead.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td
                        className="py-4 px-4 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => setSelectedLead(lead)}
                          className="p-2 rounded-lg bg-crm-inner hover:bg-crm-surface text-primary-cyan transition-all border border-white/10 cursor-pointer"
                          title="View Full Profile"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-white/10 bg-crm-inner/30 flex items-center justify-between text-xs font-mono text-slate-400">
              <span>
                Showing {filteredLeads.length} of {leads.length} records
              </span>
              <span className="text-[11px] text-slate-500">
                Auto-synchronized with native CRM engines
              </span>
            </div>
          </MultiCrmCard>
        </div>
      ) : (
        /* ==================== DETAILED SUB-PAGE VIEW ==================== */
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-crm-surface/80 border border-primary-cyan/20 p-4 rounded-2xl">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedLead(null)}
                className="p-2 rounded-xl bg-crm-inner border border-white/10 hover:border-primary-cyan/50 text-slate-300 hover:text-primary-cyan transition-all cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold text-slate-100">
                    {selectedLead.name}
                  </h1>
                  <MultiCrmTag variant={selectedLead.variant}>
                    {selectedLead.crmSource}
                  </MultiCrmTag>
                </div>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                  Pulled via{" "}
                  <strong className="text-slate-200">
                    {selectedLead.pulledFrom}
                  </strong>{" "}
                  on {selectedLead.pulledAt}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 font-mono text-xs">
              <button className="px-3.5 py-1.5 rounded-xl bg-primary-cyan/20 border border-primary-cyan/40 text-primary-cyan flex items-center gap-1.5 cursor-pointer">
                <Send className="w-3.5 h-3.5" /> Direct Email
              </button>
              <button className="px-3.5 py-1.5 rounded-xl bg-crm-inner border border-white/10 text-slate-300 flex items-center gap-1.5 cursor-pointer">
                <Edit3 className="w-3.5 h-3.5" /> Edit Record
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Panel */}
            <MultiCrmCard className="lg:col-span-4 p-5 space-y-4">
              <h3 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider border-b border-white/10 pb-2">
                Origin & Pull Details
              </h3>

              <MultiCrmInnerPanel className="space-y-3 p-3 font-mono text-xs">
                <div>
                  <span className="text-slate-500 text-[10px] block">
                    Source CRM Platform
                  </span>
                  <span className="text-slate-200 font-semibold">
                    {selectedLead.crmSource}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">
                    Integration Endpoint
                  </span>
                  <span className="text-primary-cyan text-[11px]">
                    {selectedLead.pulledFrom}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">
                    Pulled Timestamp
                  </span>
                  <span className="text-slate-200">
                    {selectedLead.pulledAt}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">
                    Sync State
                  </span>
                  <span className="text-emerald-400 font-semibold">
                    {selectedLead.syncStatus}
                  </span>
                </div>
              </MultiCrmInnerPanel>

              <MultiCrmInnerPanel className="space-y-3 p-3 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">AI Score</span>
                  <span className="text-purple-400 font-bold">
                    {selectedLead.score !== null ? `${selectedLead.score}/100` : "Unscored (—)"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Lead Rating</span>
                  <span className="text-amber-400 font-bold">
                    {selectedLead.rating}
                  </span>
                </div>
              </MultiCrmInnerPanel>
            </MultiCrmCard>

            {/* Right Main Details Panel */}
            <MultiCrmCard className="lg:col-span-8 p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
                  Complete Lead Profile
                </h3>
                <span className="text-xs text-slate-500 font-mono">
                  ID: {selectedLead.id}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6 font-mono text-xs">
                <div>
                  <span className="text-slate-500 block text-[10px]">
                    Full Name
                  </span>
                  <span className="text-slate-100 font-medium">
                    {selectedLead.name}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">
                    Job Title
                  </span>
                  <span className="text-slate-200">{selectedLead.title}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">
                    Company
                  </span>
                  <span className="text-slate-200">{selectedLead.company}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">
                    Industry
                  </span>
                  <span className="text-slate-200">
                    {selectedLead.industry}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">
                    Email
                  </span>
                  <span className="text-primary-cyan">
                    {selectedLead.email}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">
                    Phone / Mobile
                  </span>
                  <span className="text-slate-200">
                    {selectedLead.phone} / {selectedLead.mobile}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">
                    Annual Revenue
                  </span>
                  <span className="text-slate-200">
                    {selectedLead.annualRevenue}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">
                    Website
                  </span>
                  <a
                    href={selectedLead.website}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary-cyan underline"
                  >
                    {selectedLead.website}
                  </a>
                </div>
              </div>

              <MultiCrmInnerPanel className="p-4 space-y-2">
                <span className="text-slate-400 font-mono text-xs font-bold block">
                  Address & Location
                </span>
                <p className="text-xs font-mono text-slate-300">
                  {selectedLead.address}
                </p>
              </MultiCrmInnerPanel>

              <MultiCrmInnerPanel className="p-4 space-y-2">
                <span className="text-slate-400 font-mono text-xs font-bold block">
                  Description / Notes
                </span>
                <p className="text-xs font-mono text-slate-300">
                  {selectedLead.description}
                </p>
              </MultiCrmInnerPanel>
            </MultiCrmCard>
          </div>
        </div>
      )}

      {/* ==================== EXPANDED CREATE LEAD MODAL ==================== */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <MultiCrmCard className="w-full max-w-2xl p-6 space-y-6 relative border border-primary-cyan/40 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-primary-cyan" /> Add New Lead
                  Record
                </h2>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Populate complete enterprise fields and map target CRM
                  destination.
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-100 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleCreateLead}
              className="space-y-5 font-mono text-xs"
            >
              {/* Basic Info Panel */}
              <MultiCrmInnerPanel className="p-4 space-y-3">
                <h3 className="text-[11px] font-bold text-primary-cyan uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" /> Primary Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 block mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Sarah Jenkins"
                      value={newLead.name}
                      onChange={(e) =>
                        setNewLead({ ...newLead, name: e.target.value })
                      }
                      className="w-full bg-crm-inner border border-white/10 rounded-xl p-2 text-slate-200 focus:outline-none focus:border-primary-cyan"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">
                      Job Title
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. VP of Technology"
                      value={newLead.title}
                      onChange={(e) =>
                        setNewLead({ ...newLead, title: e.target.value })
                      }
                      className="w-full bg-crm-inner border border-white/10 rounded-xl p-2 text-slate-200 focus:outline-none focus:border-primary-cyan"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">
                      Company Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Acme Corp"
                      value={newLead.company}
                      onChange={(e) =>
                        setNewLead({ ...newLead, company: e.target.value })
                      }
                      className="w-full bg-crm-inner border border-white/10 rounded-xl p-2 text-slate-200 focus:outline-none focus:border-primary-cyan"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">
                      Lead Owner
                    </label>
                    <input
                      type="text"
                      value={newLead.leadOwner}
                      onChange={(e) =>
                        setNewLead({ ...newLead, leadOwner: e.target.value })
                      }
                      className="w-full bg-crm-inner border border-white/10 rounded-xl p-2 text-slate-200 focus:outline-none focus:border-primary-cyan"
                    />
                  </div>
                </div>
              </MultiCrmInnerPanel>

              {/* Contact & Location Panel */}
              <MultiCrmInnerPanel className="p-4 space-y-3">
                <h3 className="text-[11px] font-bold text-primary-cyan uppercase tracking-wider flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" /> Contact Details & Location
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-slate-400 block mb-1">Email</label>
                    <input
                      type="email"
                      placeholder="s.jenkins@acme.com"
                      value={newLead.email}
                      onChange={(e) =>
                        setNewLead({ ...newLead, email: e.target.value })
                      }
                      className="w-full bg-crm-inner border border-white/10 rounded-xl p-2 text-slate-200 focus:outline-none focus:border-primary-cyan"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Phone</label>
                    <input
                      type="text"
                      placeholder="+1 (555) 000-0000"
                      value={newLead.phone}
                      onChange={(e) =>
                        setNewLead({ ...newLead, phone: e.target.value })
                      }
                      className="w-full bg-crm-inner border border-white/10 rounded-xl p-2 text-slate-200 focus:outline-none focus:border-primary-cyan"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Mobile</label>
                    <input
                      type="text"
                      placeholder="+1 (555) 000-0000"
                      value={newLead.mobile}
                      onChange={(e) =>
                        setNewLead({ ...newLead, mobile: e.target.value })
                      }
                      className="w-full bg-crm-inner border border-white/10 rounded-xl p-2 text-slate-200 focus:outline-none focus:border-primary-cyan"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">
                    Full Address
                  </label>
                  <input
                    type="text"
                    placeholder="Street, City, Country"
                    value={newLead.address}
                    onChange={(e) =>
                      setNewLead({ ...newLead, address: e.target.value })
                    }
                    className="w-full bg-crm-inner border border-white/10 rounded-xl p-2 text-slate-200 focus:outline-none focus:border-primary-cyan"
                  />
                </div>
              </MultiCrmInnerPanel>

              {/* Source Mapping & Financials */}
              <MultiCrmInnerPanel className="p-4 space-y-3">
                <h3 className="text-[11px] font-bold text-primary-cyan uppercase tracking-wider flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5" /> Target CRM & Financial
                  Profile
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-slate-400 block mb-1">
                      CRM Platform
                    </label>
                    <select
                      value={newLead.crmSource}
                      onChange={(e) =>
                        setNewLead({
                          ...newLead,
                          crmSource: e.target.value as Lead["crmSource"],
                        })
                      }
                      className="w-full bg-crm-inner border border-white/10 rounded-xl p-2 text-slate-200 focus:outline-none focus:border-primary-cyan"
                    >
                      <option value="Salesforce">Salesforce</option>
                      <option value="HubSpot">HubSpot</option>
                      <option value="Zoho">Zoho</option>
                      <option value="Pipedrive">Pipedrive</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">
                      Lead Source
                    </label>
                    <select
                      value={newLead.leadSource}
                      onChange={(e) =>
                        setNewLead({ ...newLead, leadSource: e.target.value })
                      }
                      className="w-full bg-crm-inner border border-white/10 rounded-xl p-2 text-slate-200 focus:outline-none focus:border-primary-cyan"
                    >
                      <option value="Cold Call">Cold Call</option>
                      <option value="Advertisement">Advertisement</option>
                      <option value="Web Download">Web Download</option>
                      <option value="Seminar Partner">Seminar Partner</option>
                      <option value="Organic Search">Organic Search</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Rating</label>
                    <select
                      value={newLead.rating}
                      onChange={(e) =>
                        setNewLead({
                          ...newLead,
                          rating: e.target.value as Lead["rating"],
                        })
                      }
                      className="w-full bg-crm-inner border border-white/10 rounded-xl p-2 text-slate-200 focus:outline-none focus:border-primary-cyan"
                    >
                      <option value="Hot">Hot</option>
                      <option value="Warm">Warm</option>
                      <option value="Cold">Cold</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="text-slate-400 block mb-1">
                      Industry
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Fintech"
                      value={newLead.industry}
                      onChange={(e) =>
                        setNewLead({ ...newLead, industry: e.target.value })
                      }
                      className="w-full bg-crm-inner border border-white/10 rounded-xl p-2 text-slate-200 focus:outline-none focus:border-primary-cyan"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">
                      Annual Revenue
                    </label>
                    <input
                      type="text"
                      placeholder="PKR 1,000,000.00"
                      value={newLead.annualRevenue}
                      onChange={(e) =>
                        setNewLead({
                          ...newLead,
                          annualRevenue: e.target.value,
                        })
                      }
                      className="w-full bg-crm-inner border border-white/10 rounded-xl p-2 text-slate-200 focus:outline-none focus:border-primary-cyan"
                    />
                  </div>
                </div>
              </MultiCrmInnerPanel>

              {/* Description */}
              <div>
                <label className="text-slate-400 block mb-1">
                  Notes / Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Additional contextual details about this prospect..."
                  value={newLead.description}
                  onChange={(e) =>
                    setNewLead({ ...newLead, description: e.target.value })
                  }
                  className="w-full bg-crm-inner border border-white/10 rounded-xl p-2 text-slate-200 focus:outline-none focus:border-primary-cyan"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-crm-inner text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-primary-cyan text-slate-950 font-semibold hover:opacity-90 cursor-pointer"
                >
                  Save Lead Record
                </button>
              </div>
            </form>
          </MultiCrmCard>
        </div>
      )}
    </div>
  );
}
