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
} from "lucide-react";
import {
  ZenithCard,
  ZenithInnerPanel,
  ZenithTag,
} from "@/components/ui/ZenithCard";

const mockLeads = [
  {
    id: "LD-9021",
    name: "Sarah Jenkins",
    role: "VP of Enterprise Tech",
    company: "Acme Corp",
    email: "s.jenkins@acme.com",
    phone: "+1 (555) 234-8901",
    score: 92,
    status: "Qualified",
    crmSource: "Salesforce",
    variant: "cyan" as const,
    lastTouch: "12m ago",
    pipelineValue: "$120,000",
  },
  {
    id: "LD-9022",
    name: "David Miller",
    role: "Chief Information Officer",
    company: "Stark Tech",
    email: "d.miller@stark.io",
    phone: "+1 (555) 876-5432",
    score: 88,
    status: "In Negotiation",
    crmSource: "HubSpot",
    variant: "neutral" as const,
    lastTouch: "45m ago",
    pipelineValue: "$85,000",
  },
  {
    id: "LD-9023",
    name: "Elena Rostova",
    role: "Head of Operations",
    company: "Cyberdyne Systems",
    email: "elena@cyberdyne.net",
    phone: "+1 (555) 345-6789",
    score: 74,
    status: "Nurturing",
    crmSource: "Zoho",
    variant: "purple" as const,
    lastTouch: "2h ago",
    pipelineValue: "$45,000",
  },
  {
    id: "LD-9024",
    name: "Marcus Vance",
    role: "Director of Procurement",
    company: "Aperture Labs",
    email: "m.vance@aperture.com",
    phone: "+1 (555) 901-2345",
    score: 65,
    status: "New Lead",
    crmSource: "Pipedrive",
    variant: "magenta" as const,
    lastTouch: "1d ago",
    pipelineValue: "$32,000",
  },
  {
    id: "LD-9025",
    name: "Rachel Chen",
    role: "VP of Product",
    company: "Wayne Enterprises",
    email: "rchen@wayne.com",
    phone: "+1 (555) 432-1098",
    score: 95,
    status: "Qualified",
    crmSource: "Salesforce",
    variant: "cyan" as const,
    lastTouch: "3h ago",
    pipelineValue: "$210,000",
  },
];

export default function LeadsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCrm, setSelectedCrm] = useState("All");

  const filteredLeads = mockLeads.filter((lead) => {
    const matchesSearch =
      lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchQuery.toLowerCase());

    if (selectedCrm === "All") return matchesSearch;
    return (
      matchesSearch &&
      lead.crmSource.toLowerCase() === selectedCrm.toLowerCase()
    );
  });

  return (
    <div className="space-y-8">
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
            Aggregated cross-CRM records with real-time AI scoring and contact
            routing.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button className="px-4 py-2 rounded-xl bg-zenith-surface border border-primary-cyan/30 text-xs font-mono text-slate-300 hover:text-white hover:border-primary-cyan/60 transition-all flex items-center gap-2 shadow-inner cursor-pointer">
            <Download className="w-3.5 h-3.5 text-slate-400" />
            Export CSV
          </button>
          <button className="btn-zenith-primary px-4 py-2 rounded-xl text-xs flex items-center gap-2">
            <Plus className="w-3.5 h-3.5" />
            Add Unified Lead
          </button>
        </div>
      </div>

      {/* Controls & Search Toolbar */}
      <ZenithCard className="flex flex-col md:flex-row items-center justify-between gap-4 p-3">
        {/* Search Bar */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search leads, companies, emails..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zenith-inner border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-primary-cyan/50 font-mono transition-all shadow-inner"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          <span className="text-[11px] font-mono text-slate-500 mr-1 flex items-center gap-1">
            <SlidersHorizontal className="w-3 h-3" /> CRM:
          </span>
          {["All", "Salesforce", "HubSpot", "Zoho", "Pipedrive"].map((crm) => (
            <button
              key={crm}
              onClick={() => setSelectedCrm(crm)}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all whitespace-nowrap ${
                selectedCrm === crm
                  ? "bg-primary-cyan/20 text-primary-cyan border border-primary-cyan/30 shadow-[0_0_15px_rgba(0,242,255,0.15)]"
                  : "text-slate-400 hover:text-slate-200 hover:bg-zenith-inner"
              }`}
            >
              {crm}
            </button>
          ))}
        </div>
      </ZenithCard>

      {/* Main Leads Table Wrapper inside ZenithCard */}
      <ZenithCard className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-primary-cyan/15 bg-zenith-inner/50 text-[11px] font-mono text-slate-400">
                <th className="py-3.5 px-4 font-medium">LEAD PROFILE</th>
                <th className="py-3.5 px-4 font-medium">COMPANY</th>
                <th className="py-3.5 px-4 font-medium">
                  <div className="flex items-center gap-1">
                    AI SCORE
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3.5 px-4 font-medium">SOURCE CRM</th>
                <th className="py-3.5 px-4 font-medium">EST. PIPELINE</th>
                <th className="py-3.5 px-4 font-medium">STATUS</th>
                <th className="py-3.5 px-4 font-medium text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-xs">
              {filteredLeads.map((lead) => (
                <tr
                  key={lead.id}
                  className="hover:bg-zenith-inner transition-colors group"
                >
                  {/* Lead Profile */}
                  <td className="py-4 px-4">
                    <div>
                      <div className="font-semibold text-slate-100 flex items-center gap-2">
                        {lead.name}
                        <span className="text-[10px] font-mono text-slate-500 font-normal">
                          {lead.id}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <Mail className="w-3 h-3 text-slate-500" />
                        {lead.email}
                      </div>
                    </div>
                  </td>

                  {/* Company */}
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-1.5 text-slate-200 font-medium">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      {lead.company}
                    </div>
                    <span className="text-[10px] text-slate-500 block mt-0.5">
                      {lead.role}
                    </span>
                  </td>

                  {/* AI Qualification Score */}
                  <td className="py-4 px-4 font-mono">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-tertiary-purple/10 border border-tertiary-purple/20 text-tertiary-purple font-semibold shadow-inner">
                      <Sparkles className="w-3 h-3" />
                      {lead.score}/100
                    </div>
                  </td>

                  {/* Source CRM */}
                  <td className="py-4 px-4 font-mono">
                    <ZenithTag variant={lead.variant}>
                      <Tag className="w-2.5 h-2.5 inline mr-1" />
                      {lead.crmSource}
                    </ZenithTag>
                  </td>

                  {/* Pipeline Value */}
                  <td className="py-4 px-4 font-mono text-slate-200 font-medium">
                    {lead.pipelineValue}
                  </td>

                  {/* Status Badge */}
                  <td className="py-4 px-4 font-mono">
                    <span className="px-2.5 py-1 rounded-full text-[10px] bg-zenith-surface text-slate-300 border border-slate-800 shadow-inner">
                      {lead.status}
                    </span>
                  </td>

                  {/* Quick Action Dial / Email */}
                  <td className="py-4 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        title="Direct Call via Smart Dialer"
                        className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30 transition-all shadow-inner cursor-pointer"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </button>
                      <button
                        title="View Full Profile"
                        className="p-2 rounded-lg bg-zenith-inner hover:bg-slate-800 text-slate-300 transition-all border border-slate-800 shadow-inner cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-primary-cyan/15 bg-zenith-inner/30 flex items-center justify-between text-xs font-mono text-slate-400">
          <span>
            Showing {filteredLeads.length} of {mockLeads.length} unified records
          </span>
          <span className="text-[11px] text-slate-500">
            Auto-deduplicated across 4 CRMs
          </span>
        </div>
      </ZenithCard>
    </div>
  );
}
