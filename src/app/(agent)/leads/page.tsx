"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import { useClientAccount } from "@/context/ClientAccountContext";

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
  crmSource: "Salesforce" | "HubSpot" | "Mock CRM" | "Zoho" | "Pipedrive";
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
  firstName?: string;
  lastName?: string;
  isPersisted?: boolean;
  analysis?: PersistedLeadAnalysis;
  crmOwner?: PersistedContact["crmOwner"];
  companyDetails?: PersistedContact["companyDetails"];
  deals?: PersistedContact["deals"];
  recentActivities?: PersistedContact["recentActivities"];
}

interface PersistedContact {
  id: string;
  externalId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  sourceCrm: Lead["crmSource"];
  createdAt: string;
  updatedAt: string;
  crmOwner: { id: string; displayName: string; email: string | null } | null;
  companyDetails: {
    id: string; name: string; domain: string | null; website: string | null; phone: string | null;
    industry: string | null; city: string | null; state: string | null; country: string | null; address: string | null;
  } | null;
  deals: Array<{
    id: string; title: string; valueCents: number; currency: string; status: "OPEN" | "CLOSED_WON" | "CLOSED_LOST";
    pipelineId: string | null; pipelineLabel: string | null; stageId: string | null; stageLabel: string | null; expectedCloseAt: string | null; closedAt: string | null;
    owner: { id: string; displayName: string; email: string | null } | null; company: { id: string; name: string } | null;
  }>;
  recentActivities: Array<{ id: string; type: string; subject: string | null; body: string; occurredAt: string; source: string }>;
}

interface PersistedLeadAnalysis {
  id: string;
  contact: { id: string; firstName: string; lastName: string; company: string | null } | null;
  summary: string;
  budget: string | null;
  timeline: string | null;
  requirements: string | null;
  intent: string | null;
  objections: string | null;
  leadScore: number;
  temperature: "Hot" | "Warm" | "Cold" | string;
  dealProbability: number;
  isManualOverride: boolean;
  updatedAt: string;
}

type AssessmentForm = Pick<PersistedLeadAnalysis, "summary" | "budget" | "timeline" | "requirements" | "intent" | "objections" | "leadScore" | "temperature" | "dealProbability">;
type CompanyForm = { name: string; domain: string; website: string; phone: string; industry: string; city: string; state: string; country: string; address: string };
type DealForm = {
  id: string;
  title: string;
  amount: string;
  pipelineLabel: string;
  stageLabel: string;
  expectedCloseAt: string;
  status: "OPEN" | "CLOSED_WON" | "CLOSED_LOST";
  notes: string;
  closeOutcome: string;
  recommendedNextAction: string;
};

export default function LeadsPage() {
  const { activeClientAccount, isClientAccountReady } = useClientAccount();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCrm, setSelectedCrm] = useState("All");
  const [scoreFilter, setScoreFilter] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<"overview" | "timeline">(
    "overview"
  );
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isSavingContact, setIsSavingContact] = useState(false);
  const [contactSyncFeedback, setContactSyncFeedback] = useState("");
  const [editContact, setEditContact] = useState({ firstName: "", lastName: "", email: "", phone: "", company: "" });
  const [companyForm, setCompanyForm] = useState<CompanyForm | null>(null);
  const [dealForm, setDealForm] = useState<DealForm | null>(null);
  const [isSavingCrmEntity, setIsSavingCrmEntity] = useState(false);
  const [crmEntityFeedback, setCrmEntityFeedback] = useState("");
  const [crmRetryTarget, setCrmRetryTarget] = useState<{ type: "companies" | "deals"; id: string } | null>(null);
  const [showAssessmentModal, setShowAssessmentModal] = useState(false);
  const [isSavingAssessment, setIsSavingAssessment] = useState(false);
  const [assessmentFeedback, setAssessmentFeedback] = useState("");
  const [assessmentForm, setAssessmentForm] = useState<AssessmentForm | null>(null);

  // CRM Import POC State
  const [isImporting, setIsImporting] = useState(false);
  const [isLoadingContacts, setIsLoadingContacts] = useState(true);
  const contactRequestVersion = useRef(0);
  const currentClientAccountId = useRef(activeClientAccount.id);
  const [importFeedback, setImportFeedback] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });

  const mapPersistedContactToLead = useCallback((contact: PersistedContact, analysis?: PersistedLeadAnalysis): Lead => {
    const fullName = `${contact.firstName} ${contact.lastName}`.trim() || "Unnamed Contact";
    return {
      id: contact.id,
      name: fullName,
      firstName: contact.firstName,
      lastName: contact.lastName,
      isPersisted: true,
      analysis,
      crmOwner: contact.crmOwner,
      companyDetails: contact.companyDetails,
      deals: contact.deals,
      recentActivities: contact.recentActivities,
      title: "Contact",
      company: contact.company || "Independent",
      email: contact.email || "no-email@crm.invalid",
      phone: contact.phone || "N/A",
      mobile: "N/A",
      leadSource: `${contact.sourceCrm} Sync Import`,
      crmSource: contact.sourceCrm,
      pulledFrom: `${contact.sourceCrm} client-account sync`,
      pulledAt: new Date(contact.updatedAt).toLocaleString(),
      syncStatus: "Synced",
      leadOwner: contact.crmOwner?.displayName ?? `${activeClientAccount.name} Integration`,
      status: "Active Lead",
      rating: analysis?.temperature === "Hot" || analysis?.temperature === "Warm" || analysis?.temperature === "Cold" ? analysis.temperature : "Unrated",
      score: analysis?.leadScore ?? null,
      industry: contact.companyDetails?.industry || "General",
      annualRevenue: "N/A",
      website: contact.companyDetails?.website || (contact.companyDetails?.domain ? `https://${contact.companyDetails.domain}` : ""),
      address: [contact.companyDetails?.address, contact.companyDetails?.city, contact.companyDetails?.state, contact.companyDetails?.country].filter(Boolean).join(", ") || `Imported for ${activeClientAccount.name}`,
      description: `Imported via the ${activeClientAccount.name} client-account sync from ${contact.sourceCrm} Contact ID #${contact.externalId}`,
      variant: "neutral",
    };
  }, [activeClientAccount.name]);

  const loadPersistedContacts = useCallback(async (resetPendingSync = false, clearSelection = true): Promise<boolean> => {
    if (!isClientAccountReady) return false;

    const requestVersion = ++contactRequestVersion.current;
    if (resetPendingSync) setIsImporting(false);
    setIsLoadingContacts(true);
    if (clearSelection) setSelectedLead(null);

    try {
      const [contactResponse, analysisResponse] = await Promise.all([
        fetch("/api/contacts?scope=agency", { cache: "no-store" }),
        fetch("/api/lead-analyses", { cache: "no-store" }),
      ]);
      const [contactData, analysisData] = await Promise.all([contactResponse.json(), analysisResponse.json()]);
      if (!contactResponse.ok || !contactData.success || !analysisResponse.ok || !analysisData.success) {
        const errorMessage = typeof contactData.error === "string" ? contactData.error : contactData.error?.message;
        throw new Error(errorMessage || "Unable to load contacts for the agency sales pipeline.");
      }

      if (requestVersion !== contactRequestVersion.current) return false;

      const latestAnalysisByContact = new Map<string, PersistedLeadAnalysis>();
      for (const analysis of analysisData.analyses as PersistedLeadAnalysis[]) {
        if (analysis.contact && !latestAnalysisByContact.has(analysis.contact.id)) {
          latestAnalysisByContact.set(analysis.contact.id, analysis);
        }
      }
      setLeads((contactData.contacts as PersistedContact[]).map((contact) => mapPersistedContactToLead(contact, latestAnalysisByContact.get(contact.id))));
      return true;
    } catch (error) {
      if (requestVersion !== contactRequestVersion.current) return false;

      setLeads([]);
      setImportFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "Unable to load contacts for the agency sales pipeline.",
      });
      return false;
    } finally {
      if (requestVersion === contactRequestVersion.current) {
        setIsLoadingContacts(false);
      }
    }
  }, [isClientAccountReady, mapPersistedContactToLead]);

  useEffect(() => {
    currentClientAccountId.current = activeClientAccount.id;
    // Stage 2.7: Unified Leads is agency-level. Switching the active client in the header
    // changes client-specific operational context (Client CRM), but does NOT clear or reload Unified Leads.
    if (leads.length === 0) {
      void loadPersistedContacts(false, false);
    }
  }, [activeClientAccount.id, leads.length, loadPersistedContacts]);

  /**
   * Trigger backend import from HubSpot CRM and merge newly fetched contacts
   * while preventing duplicates based on the unique HubSpot Contact ID.
   */
  const handleManualClientSync = async () => {
    const clientAccountId = activeClientAccount.id;
    const clientAccountName = activeClientAccount.name;
    setIsImporting(true);
    setImportFeedback({ type: null, message: "" });

    try {
      const res = await fetch("/api/contacts/import", { method: "POST" });
      const data = await res.json();
      if (currentClientAccountId.current !== clientAccountId) return;

      if (!res.ok || !data.success) {
        const errorMessage =
          typeof data.error === "string" ? data.error : data.error?.message;
        throw new Error(errorMessage || "Failed to sync contacts for the active client account.");
      }

      const contactsLoaded = await loadPersistedContacts();
      if (currentClientAccountId.current !== clientAccountId) return;
      if (!contactsLoaded) {
        throw new Error("Sync completed, but the persisted contacts could not be reloaded.");
      }

      const created = data.sync?.recordsCreated ?? 0;
      const updated = data.sync?.recordsUpdated ?? 0;
      setImportFeedback({
        type: "success",
        message: `${clientAccountName} sync complete: ${created} created, ${updated} updated.`,
      });
    } catch (err: unknown) {
      if (currentClientAccountId.current !== clientAccountId) return;
      const errMsg = err instanceof Error ? err.message : "Unable to complete the client-account sync.";
      setImportFeedback({
        type: "error",
        message: errMsg,
      });
    } finally {
      if (currentClientAccountId.current === clientAccountId) setIsImporting(false);
    }
  };

  const openContactEditor = () => {
    if (!selectedLead?.isPersisted) return;
    setContactSyncFeedback("");
    setEditContact({
      firstName: selectedLead.firstName || selectedLead.name.split(" ")[0] || "",
      lastName: selectedLead.lastName || selectedLead.name.split(" ").slice(1).join(" ") || "",
      email: selectedLead.email === "no-email@crm.invalid" ? "" : selectedLead.email,
      phone: selectedLead.phone === "N/A" ? "" : selectedLead.phone,
      company: selectedLead.company === "Independent" ? "" : selectedLead.company,
    });
    setShowEditModal(true);
  };

  const saveContactEdit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedLead) return;
    setIsSavingContact(true);
    setContactSyncFeedback("");
    try {
      const response = await fetch(`/api/contacts/${selectedLead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editContact),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error?.message || "Unable to save this contact.");
      }
      const outbound = data.outboundSync;
      setSelectedLead({
        ...selectedLead,
        name: `${editContact.firstName} ${editContact.lastName}`.trim(),
        firstName: editContact.firstName,
        lastName: editContact.lastName,
        email: editContact.email || "no-email@crm.invalid",
        phone: editContact.phone || "N/A",
        company: editContact.company || "Independent",
        pulledAt: new Date().toLocaleString(),
      });
      await loadPersistedContacts(false, false);
      setShowEditModal(false);
      setContactSyncFeedback(
        outbound.status === "COMPLETED"
          ? "Contact saved locally and updated in HubSpot."
          : outbound.status === "FAILED"
            ? `Contact saved locally. HubSpot update failed: ${outbound.error}`
            : "Contact saved locally. This contact has no connected HubSpot mapping.",
      );
    } catch (error) {
      setContactSyncFeedback(error instanceof Error ? error.message : "Unable to save this contact.");
    } finally {
      setIsSavingContact(false);
    }
  };

  const retryHubSpotContactSync = async () => {
    if (!selectedLead?.isPersisted) return;
    setIsSavingContact(true);
    try {
      const response = await fetch(`/api/contacts/${selectedLead.id}/sync`, { method: "POST" });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error?.message || "Unable to retry HubSpot sync.");
      setContactSyncFeedback(
        data.outboundSync.status === "COMPLETED"
          ? "HubSpot update completed."
          : data.outboundSync.error || "HubSpot update is still unavailable; your local edit remains saved.",
      );
      await loadPersistedContacts(false, false);
    } catch (error) {
      setContactSyncFeedback(error instanceof Error ? error.message : "Unable to retry HubSpot sync.");
    } finally {
      setIsSavingContact(false);
    }
  };

  const openCompanyEditor = () => {
    const company = selectedLead?.companyDetails;
    if (!company) return;
    setCrmEntityFeedback(""); setCrmRetryTarget(null);
    setCompanyForm({ name: company.name, domain: company.domain || "", website: company.website || "", phone: company.phone || "", industry: company.industry || "", city: company.city || "", state: company.state || "", country: company.country || "", address: company.address || "" });
  };

  const saveCompany = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedLead?.companyDetails || !companyForm) return;
    setIsSavingCrmEntity(true); setCrmEntityFeedback("");
    try {
      const response = await fetch(`/api/crm/companies/${selectedLead.companyDetails.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(companyForm) });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error?.message || "Unable to save this company.");
      const companyDetails = { ...selectedLead.companyDetails, ...companyForm };
      setSelectedLead({ ...selectedLead, company: companyForm.name, companyDetails, industry: companyForm.industry || "General", website: companyForm.website || (companyForm.domain ? `https://${companyForm.domain}` : ""), address: [companyForm.address, companyForm.city, companyForm.state, companyForm.country].filter(Boolean).join(", ") });
      setCompanyForm(null);
      setCrmRetryTarget(data.outboundSync.status === "FAILED" ? { type: "companies", id: selectedLead.companyDetails.id } : null);
      setCrmEntityFeedback(data.outboundSync.status === "COMPLETED" ? "Company saved locally and updated in HubSpot." : data.outboundSync.status === "FAILED" ? `Company saved locally. ${data.outboundSync.error}` : "Company saved locally; no HubSpot mapping was available.");
      await loadPersistedContacts(false, false);
    } catch (error) { setCrmEntityFeedback(error instanceof Error ? error.message : "Unable to save this company."); }
    finally { setIsSavingCrmEntity(false); }
  };

  const openDealEditor = (
    deal: NonNullable<Lead["deals"]>[number],
    initialStatus?: "OPEN" | "CLOSED_WON" | "CLOSED_LOST",
  ) => {
    setCrmEntityFeedback("");
    setCrmRetryTarget(null);
    setDealForm({
      id: deal.id,
      title: deal.title,
      amount: (deal.valueCents / 100).toFixed(2),
      pipelineLabel: deal.pipelineLabel || "Unassigned pipeline",
      stageLabel: deal.stageLabel || "Unassigned stage",
      expectedCloseAt: deal.expectedCloseAt
        ? new Date(deal.expectedCloseAt).toISOString().slice(0, 10)
        : "",
      status: initialStatus || deal.status || "OPEN",
      notes: (deal as { notes?: string }).notes || "",
      closeOutcome: "Client accepted proposal",
      recommendedNextAction: "Begin onboarding",
    });
  };

  const saveDeal = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedLead || !dealForm) return;
    setIsSavingCrmEntity(true);
    setCrmEntityFeedback("");
    try {
      const payload = {
        title: dealForm.title,
        amount: Number(dealForm.amount),
        expectedCloseAt: dealForm.expectedCloseAt || null,
        status: dealForm.status,
        notes: dealForm.notes || null,
        closeOutcome: dealForm.closeOutcome || undefined,
        recommendedNextAction: dealForm.recommendedNextAction || undefined,
      };
      const response = await fetch(`/api/crm/deals/${dealForm.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok || !data.success)
        throw new Error(data.error?.message || "Unable to save this deal.");

      setSelectedLead({
        ...selectedLead,
        deals: selectedLead.deals?.map((deal) =>
          deal.id === dealForm.id
            ? {
                ...deal,
                title: dealForm.title,
                valueCents: Math.round(Number(dealForm.amount) * 100),
                expectedCloseAt: dealForm.expectedCloseAt || null,
                status: dealForm.status,
              }
            : deal
        ),
      });
      setDealForm(null);
      setCrmRetryTarget(
        data.outboundSync?.status === "FAILED"
          ? { type: "deals", id: dealForm.id }
          : null
      );

      const handoffInfo = data.handoff
        ? ` 🎉 Deal Handoff created for ${data.handoff.clientCrmProvider} (Status: ${data.handoff.status}, Ext ID: #${data.handoff.clientCrmRecordId || "syncing"}).`
        : "";

      setCrmEntityFeedback(
        (data.outboundSync?.status === "COMPLETED"
          ? "Deal saved locally and updated in HubSpot."
          : data.outboundSync?.status === "FAILED"
          ? `Deal saved locally. ${data.outboundSync.error}`
          : "Deal saved locally.") + handoffInfo
      );
      await loadPersistedContacts(false, false);
    } catch (error) {
      setCrmEntityFeedback(
        error instanceof Error ? error.message : "Unable to save this deal."
      );
    } finally {
      setIsSavingCrmEntity(false);
    }
  };

  const retrySalesEntitySync = async () => {
    if (!crmRetryTarget) return;
    setIsSavingCrmEntity(true);
    try {
      const response = await fetch(`/api/crm/${crmRetryTarget.type}/${crmRetryTarget.id}/sync`, { method: "POST" });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error?.message || "Unable to retry HubSpot sync.");
      if (data.outboundSync.status !== "COMPLETED") throw new Error(data.outboundSync.error || "HubSpot is still unavailable; the local edit remains saved.");
      setCrmEntityFeedback("HubSpot update completed."); setCrmRetryTarget(null);
    } catch (error) { setCrmEntityFeedback(error instanceof Error ? error.message : "Unable to retry HubSpot sync."); }
    finally { setIsSavingCrmEntity(false); }
  };

  const openAssessmentEditor = () => {
    const analysis = selectedLead?.analysis;
    if (!analysis) return;
    setAssessmentFeedback("");
    setAssessmentForm({
      summary: analysis.summary,
      budget: analysis.budget,
      timeline: analysis.timeline,
      requirements: analysis.requirements,
      intent: analysis.intent,
      objections: analysis.objections,
      leadScore: analysis.leadScore,
      temperature: analysis.temperature,
      dealProbability: analysis.dealProbability,
    });
    setShowAssessmentModal(true);
  };

  const saveAssessment = async (event: React.FormEvent) => {
    event.preventDefault();
    const analysis = selectedLead?.analysis;
    if (!analysis || !assessmentForm) return;
    setIsSavingAssessment(true);
    setAssessmentFeedback("");
    try {
      const response = await fetch(`/api/lead-analyses/${analysis.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(assessmentForm),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error?.message || "Unable to save the AI assessment.");
      const updatedAnalysis = { ...analysis, ...data.analysis, contact: analysis.contact, isManualOverride: true } as PersistedLeadAnalysis;
      const rating = updatedAnalysis.temperature === "Hot" || updatedAnalysis.temperature === "Warm" || updatedAnalysis.temperature === "Cold" ? updatedAnalysis.temperature : "Unrated";
      setSelectedLead((lead) => lead ? { ...lead, analysis: updatedAnalysis, score: updatedAnalysis.leadScore, rating } : lead);
      setLeads((items) => items.map((lead) => lead.id === selectedLead.id ? { ...lead, analysis: updatedAnalysis, score: updatedAnalysis.leadScore, rating } : lead));
      setShowAssessmentModal(false);
      setAssessmentFeedback("AI assessment saved as a manual override. CRM contact fields were not changed.");
    } catch (error) {
      setAssessmentFeedback(error instanceof Error ? error.message : "Unable to save the AI assessment.");
    } finally {
      setIsSavingAssessment(false);
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
      "Mock CRM": "magenta",
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
    <div className="space-y-6 text-crm-text font-sans">
      {!selectedLead ? (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-primary-cyan" />
                <h1 className="text-2xl font-bold tracking-tight text-crm-text">
                  Unified Lead Directory
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/30">
                  Agency Sales Pipeline • HubSpot CRM
                </span>
              </div>
              <p className="text-xs text-crm-text-muted font-mono mt-1">
                Agency-wide unified sales pipeline across all clients and agents. Backed by Agency CRM (HubSpot).
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Manual Agency CRM sync */}
              <button
                onClick={handleManualClientSync}
                disabled={isImporting}
                className="px-4 py-2 rounded-xl bg-orange-500/10 border border-orange-500/30 text-xs font-mono text-orange-400 hover:bg-orange-500/20 hover:border-orange-500/50 transition-all flex items-center gap-2 shadow-inner cursor-pointer disabled:opacity-50"
                title="Manually sync contacts from the Agency HubSpot CRM"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${
                    isImporting ? "animate-spin text-orange-400" : "text-orange-400"
                  }`}
                />
                <span>
                  {isImporting ? "Syncing Agency CRM..." : "Sync Agency Pipeline (HubSpot)"}
                </span>
              </button>

              <button className="px-4 py-2 rounded-xl bg-crm-surface border border-primary-cyan/30 text-xs font-mono text-crm-text-muted hover:text-crm-text hover:border-primary-cyan/60 transition-all flex items-center gap-2 shadow-inner cursor-pointer">
                <Download className="w-3.5 h-3.5 text-crm-text-muted" />
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
            <div className="flex items-center justify-between border-b border-crm-border-strong pb-2.5">
              <span className="text-xs font-mono font-bold text-crm-text-muted flex items-center gap-2">
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
                  <Search className="w-3.5 h-3.5 text-crm-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search leads, companies..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-crm-inner border border-crm-border-strong rounded-xl pl-9 pr-3 py-1.5 text-xs font-mono text-crm-text placeholder-slate-500 focus:outline-none focus:border-primary-cyan/50"
                  />
                </div>

                {/* CRM Filter Selector */}
                <div className="flex items-center gap-1.5 bg-crm-inner p-1 rounded-xl border border-crm-border-strong">
                  <span className="text-[11px] font-mono text-crm-text-muted px-2 flex items-center gap-1">
                    <Database className="w-3 h-3 text-primary-cyan" /> Source:
                  </span>
                  {["All", "Salesforce", "HubSpot", "Mock CRM", "Zoho", "Pipedrive"].map(
                    (crm) => (
                      <button
                        key={crm}
                        onClick={() => setSelectedCrm(crm)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                          selectedCrm === crm
                            ? "bg-primary-cyan/20 text-primary-cyan border border-primary-cyan/40 font-semibold"
                            : "text-crm-text-muted hover:text-crm-text"
                        }`}
                      >
                        {crm}
                      </button>
                    )
                  )}
                </div>

                {/* Score Slider Control */}
                <div className="flex items-center gap-3 bg-crm-inner px-3 py-1.5 rounded-xl border border-crm-border-strong">
                  <span className="text-[11px] font-mono text-crm-text-muted flex items-center gap-1">
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
                  <button className="px-3 py-1.5 rounded-xl bg-crm-inner border border-crm-border-strong text-xs font-mono text-crm-text-muted hover:text-white hover:border-white/30 flex items-center gap-1.5 cursor-pointer whitespace-nowrap">
                    <Layers className="w-3.5 h-3.5 text-purple-400" /> Group by
                    Origin
                  </button>
                  <button className="px-3 py-1.5 rounded-xl bg-crm-inner border border-crm-border-strong text-xs font-mono text-crm-text-muted hover:text-white hover:border-white/30 flex items-center gap-1.5 cursor-pointer whitespace-nowrap">
                    <RefreshCw className="w-3.5 h-3.5 text-emerald-400" /> Force
                    Sync All
                  </button>
                  <button className="px-3 py-1.5 rounded-xl bg-crm-inner border border-crm-border-strong text-xs font-mono text-crm-text-muted hover:text-white hover:border-white/30 flex items-center gap-1.5 cursor-pointer whitespace-nowrap">
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
                  <tr className="border-b border-crm-border-strong bg-crm-inner/50 text-[11px] font-mono text-crm-text-muted">
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
                        <div className="text-crm-text-muted text-[11px] flex items-center gap-1 mt-0.5">
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
                            className="text-[10px] text-crm-text-muted truncate max-w-35"
                            title={lead.pulledFrom}
                          >
                            {lead.pulledFrom}
                          </span>
                        </div>
                      </td>

                      {/* Sync Timestamp */}
                      <td className="py-4 px-4">
                        <div className="text-crm-text-muted text-[11px]">
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
                          <span className="px-2 py-0.5 rounded bg-white/5 border border-crm-border-strong text-[10px] text-crm-text-muted">
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
                        <span className="px-2.5 py-1 rounded-full text-[10px] bg-crm-inner text-crm-text-muted border border-crm-border-strong">
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
                          className="p-2 rounded-lg bg-crm-inner hover:bg-crm-surface text-primary-cyan transition-all border border-crm-border-strong cursor-pointer"
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

            <div className="p-4 border-t border-crm-border-strong bg-crm-inner/30 flex items-center justify-between text-xs font-mono text-crm-text-muted">
              <span>
                {isLoadingContacts
                  ? `Loading ${activeClientAccount.name} contacts...`
                  : `Showing ${filteredLeads.length} of ${leads.length} records`}
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
                className="p-2 rounded-xl bg-crm-inner border border-crm-border-strong hover:border-primary-cyan/50 text-crm-text-muted hover:text-primary-cyan transition-all cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold text-crm-text">
                    {selectedLead.name}
                  </h1>
                  <MultiCrmTag variant={selectedLead.variant}>
                    {selectedLead.crmSource}
                  </MultiCrmTag>
                </div>
                <p className="text-[11px] text-crm-text-muted font-mono mt-0.5">
                  Pulled via{" "}
                  <strong className="text-crm-text">
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
              <button
                onClick={openContactEditor}
                disabled={!selectedLead.isPersisted}
                className="px-3.5 py-1.5 rounded-xl bg-crm-inner border border-crm-border-strong text-crm-text-muted flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                title={selectedLead.isPersisted ? "Edit canonical contact and sync HubSpot" : "Temporary leads cannot be edited after refresh"}
              >
                <Edit3 className="w-3.5 h-3.5" /> Edit Record
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Panel */}
            <MultiCrmCard className="lg:col-span-4 p-5 space-y-4">
              <h3 className="text-xs font-mono font-bold text-crm-text-muted uppercase tracking-wider border-b border-crm-border-strong pb-2">
                Origin & Pull Details
              </h3>

              <MultiCrmInnerPanel className="space-y-3 p-3 font-mono text-xs">
                <div>
                  <span className="text-slate-500 text-[10px] block">
                    Source CRM Platform
                  </span>
                  <span className="text-crm-text font-semibold">
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
                  <span className="text-crm-text">
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
                  <span className="text-crm-text-muted">AI Score</span>
                  <span className="text-purple-400 font-bold">
                    {selectedLead.score !== null ? `${selectedLead.score}/100` : "Unscored (—)"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-crm-text-muted">Lead Rating</span>
                  <span className="text-amber-400 font-bold">
                    {selectedLead.rating}
                  </span>
                </div>
              </MultiCrmInnerPanel>
              <MultiCrmInnerPanel className="space-y-3 p-3 font-mono text-xs">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-crm-text-muted">Assessment context</span>
                  {selectedLead.analysis && <button onClick={openAssessmentEditor} className="rounded-lg border border-primary-cyan/30 px-2 py-1 text-[10px] text-primary-cyan hover:bg-primary-cyan/10 cursor-pointer">Edit assessment</button>}
                </div>
                {selectedLead.analysis ? <>
                  <div className="grid grid-cols-2 gap-2"><span className="text-slate-500">Probability</span><span className="text-right font-bold text-emerald-400">{selectedLead.analysis.dealProbability}%</span><span className="text-slate-500">Budget</span><span className="text-right text-crm-text">{selectedLead.analysis.budget || "—"}</span><span className="text-slate-500">Timeline</span><span className="text-right text-crm-text">{selectedLead.analysis.timeline || "—"}</span></div>
                  <p className="border-t border-crm-border-strong pt-3 text-[11px] leading-relaxed text-crm-text-muted">{selectedLead.analysis.summary}</p>
                  <div className="space-y-1 text-[10px] leading-relaxed text-crm-text-muted"><p><span className="text-slate-500">Intent:</span> {selectedLead.analysis.intent || "—"}</p><p><span className="text-slate-500">Requirements:</span> {selectedLead.analysis.requirements || "—"}</p><p><span className="text-slate-500">Objections:</span> {selectedLead.analysis.objections || "—"}</p></div>
                  {selectedLead.analysis.isManualOverride && <span className="inline-flex rounded-full border border-secondary-pink/30 bg-secondary-pink/10 px-2 py-0.5 text-[10px] text-secondary-pink">Manual override</span>}
                </> : <p className="text-[11px] leading-relaxed text-crm-text-muted">No saved assessment. Create one in Copilot to expose qualification context here.</p>}
              </MultiCrmInnerPanel>
            </MultiCrmCard>

            {/* Right Main Details Panel */}
            <MultiCrmCard className="lg:col-span-8 p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-crm-border-strong pb-3">
                <h3 className="text-xs font-mono font-bold text-crm-text uppercase tracking-wider">
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
                  <span className="text-crm-text font-medium">
                    {selectedLead.name}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">
                    Job Title
                  </span>
                  <span className="text-crm-text">{selectedLead.title}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Company</span>
                  <div className="flex items-center gap-2"><span className="text-crm-text">{selectedLead.company}</span>{selectedLead.companyDetails && <button type="button" onClick={openCompanyEditor} className="text-[9px] text-primary-cyan hover:underline">Edit company</button>}</div>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">
                    CRM Owner
                  </span>
                  <span className="text-crm-text">{selectedLead.crmOwner?.displayName || selectedLead.leadOwner}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">
                    Industry
                  </span>
                  <span className="text-crm-text">
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
                  <span className="text-crm-text">
                    {selectedLead.phone} / {selectedLead.mobile}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">
                    Annual Revenue
                  </span>
                  <span className="text-crm-text">
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

              <MultiCrmInnerPanel className="p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-crm-text-muted font-mono text-xs font-bold">Associated Deals</span>
                  <span className="text-[10px] font-mono text-primary-cyan">{selectedLead.deals?.length ?? 0} linked</span>
                </div>
                {selectedLead.deals?.length ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {selectedLead.deals.map((deal) => (
                      <div key={deal.id} className="rounded-xl border border-crm-border-strong bg-crm-surface/60 p-3 font-mono text-[10px]">
                        <div className="flex items-start justify-between gap-3">
                          <span className="font-semibold text-crm-text">{deal.title}</span>
                          <span className={deal.status === "CLOSED_WON" ? "text-emerald-400" : deal.status === "CLOSED_LOST" ? "text-rose-300" : "text-amber-300"}>{deal.status.replaceAll("_", " ")}</span>
                        </div>
                        <p className="mt-2 text-sm font-semibold text-primary-cyan">{new Intl.NumberFormat(undefined, { style: "currency", currency: deal.currency }).format(deal.valueCents / 100)}</p>
                        <p className="mt-1 text-crm-text-muted">{[deal.pipelineLabel, deal.stageLabel].filter(Boolean).join(" · ") || "Pipeline metadata unavailable"}</p>
                        <p className="mt-1 text-crm-text-muted">Owner: {deal.owner?.displayName || "Unassigned"}</p>
                        <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => openDealEditor(deal)}
                            className="text-primary-cyan hover:underline cursor-pointer"
                          >
                            Edit & sync deal
                          </button>
                          {deal.status !== "CLOSED_WON" && (
                            <button
                              type="button"
                              onClick={() => openDealEditor(deal, "CLOSED_WON")}
                              className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/35 text-emerald-400 hover:bg-emerald-500/25 transition-all text-[9px] font-semibold flex items-center gap-1 cursor-pointer"
                              title="Mark deal as Closed Won and hand off to Zoho CRM"
                            >
                              <Sparkles className="w-2.5 h-2.5 text-emerald-400" />
                              <span>Close & Handoff to Zoho</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-[11px] text-crm-text-muted">No HubSpot deals are associated with this lead.</p>}
              </MultiCrmInnerPanel>

              <MultiCrmInnerPanel className="p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-crm-text-muted font-mono text-xs font-bold">Recent CRM Activity</span>
                  <span className="text-[10px] font-mono text-primary-cyan">HubSpot + manual</span>
                </div>
                {selectedLead.recentActivities?.length ? selectedLead.recentActivities.slice(0, 5).map((activity) => (
                  <div key={activity.id} className="flex items-start justify-between gap-4 border-t border-crm-border/70 pt-2 first:border-0 first:pt-0">
                    <div><p className="text-xs font-medium text-crm-text">{activity.subject || activity.type.replaceAll("_", " ")}</p><p className="mt-1 line-clamp-2 text-[10px] text-crm-text-muted">{activity.body}</p></div>
                    <div className="shrink-0 text-right font-mono text-[9px] text-crm-text-muted"><p>{activity.type}</p><p>{new Date(activity.occurredAt).toLocaleDateString()}</p></div>
                  </div>
                )) : <p className="text-[11px] text-crm-text-muted">No recent activity is associated with this lead.</p>}
              </MultiCrmInnerPanel>

              <MultiCrmInnerPanel className="p-4 space-y-2">
                <span className="text-crm-text-muted font-mono text-xs font-bold block">
                  Address & Location
                </span>
                <p className="text-xs font-mono text-crm-text-muted">
                  {selectedLead.address}
                </p>
              </MultiCrmInnerPanel>

              <MultiCrmInnerPanel className="p-4 space-y-2">
                <span className="text-crm-text-muted font-mono text-xs font-bold block">
                  Description / Notes
                </span>
                <p className="text-xs font-mono text-crm-text-muted">
                  {selectedLead.description}
                </p>
              </MultiCrmInnerPanel>
            </MultiCrmCard>
          </div>
          {contactSyncFeedback && (
            <div className="flex items-center gap-3 rounded-xl border border-primary-cyan/30 bg-primary-cyan/10 px-4 py-3 text-xs font-mono text-crm-text-muted">
              <span>{contactSyncFeedback}</span>
              {contactSyncFeedback.includes("HubSpot update failed") && (
                <button onClick={retryHubSpotContactSync} disabled={isSavingContact} className="ml-auto rounded-lg border border-primary-cyan/40 px-2.5 py-1 text-primary-cyan hover:bg-primary-cyan/10 disabled:opacity-50">
                  Retry HubSpot
                </button>
              )}
            </div>
          )}
          {crmEntityFeedback && <div className="flex items-center gap-3 rounded-xl border border-primary-cyan/30 bg-primary-cyan/10 px-4 py-3 text-xs font-mono text-crm-text-muted"><span>{crmEntityFeedback}</span>{crmRetryTarget && <button type="button" onClick={retrySalesEntitySync} disabled={isSavingCrmEntity} className="ml-auto rounded-lg border border-primary-cyan/40 px-2.5 py-1 text-primary-cyan disabled:opacity-50">Retry HubSpot</button>}</div>}
        </div>
      )}

      {/* ==================== EXPANDED CREATE LEAD MODAL ==================== */}
      {showCreateModal && (
        <div className="dashboard-overlay bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <MultiCrmCard className="w-full max-w-2xl p-6 space-y-6 relative border border-primary-cyan/40 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-crm-border-strong pb-3">
              <div>
                <h2 className="text-lg font-bold text-crm-text flex items-center gap-2">
                  <Plus className="w-5 h-5 text-primary-cyan" /> Add New Lead
                  Record
                </h2>
                <p className="text-xs text-crm-text-muted font-mono mt-0.5">
                  Populate complete enterprise fields and map target CRM
                  destination.
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-crm-text-muted hover:text-crm-text p-1 cursor-pointer"
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
                    <label className="text-crm-text-muted block mb-1">
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
                      className="w-full bg-crm-inner border border-crm-border-strong rounded-xl p-2 text-crm-text focus:outline-none focus:border-primary-cyan"
                    />
                  </div>
                  <div>
                    <label className="text-crm-text-muted block mb-1">
                      Job Title
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. VP of Technology"
                      value={newLead.title}
                      onChange={(e) =>
                        setNewLead({ ...newLead, title: e.target.value })
                      }
                      className="w-full bg-crm-inner border border-crm-border-strong rounded-xl p-2 text-crm-text focus:outline-none focus:border-primary-cyan"
                    />
                  </div>
                  <div>
                    <label className="text-crm-text-muted block mb-1">
                      Company Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Acme Corp"
                      value={newLead.company}
                      onChange={(e) =>
                        setNewLead({ ...newLead, company: e.target.value })
                      }
                      className="w-full bg-crm-inner border border-crm-border-strong rounded-xl p-2 text-crm-text focus:outline-none focus:border-primary-cyan"
                    />
                  </div>
                  <div>
                    <label className="text-crm-text-muted block mb-1">
                      Lead Owner
                    </label>
                    <input
                      type="text"
                      value={newLead.leadOwner}
                      onChange={(e) =>
                        setNewLead({ ...newLead, leadOwner: e.target.value })
                      }
                      className="w-full bg-crm-inner border border-crm-border-strong rounded-xl p-2 text-crm-text focus:outline-none focus:border-primary-cyan"
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
                    <label className="text-crm-text-muted block mb-1">Email</label>
                    <input
                      type="email"
                      placeholder="s.jenkins@acme.com"
                      value={newLead.email}
                      onChange={(e) =>
                        setNewLead({ ...newLead, email: e.target.value })
                      }
                      className="w-full bg-crm-inner border border-crm-border-strong rounded-xl p-2 text-crm-text focus:outline-none focus:border-primary-cyan"
                    />
                  </div>
                  <div>
                    <label className="text-crm-text-muted block mb-1">Phone</label>
                    <input
                      type="text"
                      placeholder="+1 (555) 000-0000"
                      value={newLead.phone}
                      onChange={(e) =>
                        setNewLead({ ...newLead, phone: e.target.value })
                      }
                      className="w-full bg-crm-inner border border-crm-border-strong rounded-xl p-2 text-crm-text focus:outline-none focus:border-primary-cyan"
                    />
                  </div>
                  <div>
                    <label className="text-crm-text-muted block mb-1">Mobile</label>
                    <input
                      type="text"
                      placeholder="+1 (555) 000-0000"
                      value={newLead.mobile}
                      onChange={(e) =>
                        setNewLead({ ...newLead, mobile: e.target.value })
                      }
                      className="w-full bg-crm-inner border border-crm-border-strong rounded-xl p-2 text-crm-text focus:outline-none focus:border-primary-cyan"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-crm-text-muted block mb-1">
                    Full Address
                  </label>
                  <input
                    type="text"
                    placeholder="Street, City, Country"
                    value={newLead.address}
                    onChange={(e) =>
                      setNewLead({ ...newLead, address: e.target.value })
                    }
                    className="w-full bg-crm-inner border border-crm-border-strong rounded-xl p-2 text-crm-text focus:outline-none focus:border-primary-cyan"
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
                    <label className="text-crm-text-muted block mb-1">
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
                      className="w-full bg-crm-inner border border-crm-border-strong rounded-xl p-2 text-crm-text focus:outline-none focus:border-primary-cyan"
                    >
                      <option value="Salesforce">Salesforce</option>
                      <option value="HubSpot">HubSpot</option>
                      <option value="Zoho">Zoho</option>
                      <option value="Pipedrive">Pipedrive</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-crm-text-muted block mb-1">
                      Lead Source
                    </label>
                    <select
                      value={newLead.leadSource}
                      onChange={(e) =>
                        setNewLead({ ...newLead, leadSource: e.target.value })
                      }
                      className="w-full bg-crm-inner border border-crm-border-strong rounded-xl p-2 text-crm-text focus:outline-none focus:border-primary-cyan"
                    >
                      <option value="Cold Call">Cold Call</option>
                      <option value="Advertisement">Advertisement</option>
                      <option value="Web Download">Web Download</option>
                      <option value="Seminar Partner">Seminar Partner</option>
                      <option value="Organic Search">Organic Search</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-crm-text-muted block mb-1">Rating</label>
                    <select
                      value={newLead.rating}
                      onChange={(e) =>
                        setNewLead({
                          ...newLead,
                          rating: e.target.value as Lead["rating"],
                        })
                      }
                      className="w-full bg-crm-inner border border-crm-border-strong rounded-xl p-2 text-crm-text focus:outline-none focus:border-primary-cyan"
                    >
                      <option value="Hot">Hot</option>
                      <option value="Warm">Warm</option>
                      <option value="Cold">Cold</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="text-crm-text-muted block mb-1">
                      Industry
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Fintech"
                      value={newLead.industry}
                      onChange={(e) =>
                        setNewLead({ ...newLead, industry: e.target.value })
                      }
                      className="w-full bg-crm-inner border border-crm-border-strong rounded-xl p-2 text-crm-text focus:outline-none focus:border-primary-cyan"
                    />
                  </div>
                  <div>
                    <label className="text-crm-text-muted block mb-1">
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
                      className="w-full bg-crm-inner border border-crm-border-strong rounded-xl p-2 text-crm-text focus:outline-none focus:border-primary-cyan"
                    />
                  </div>
                </div>
              </MultiCrmInnerPanel>

              {/* Description */}
              <div>
                <label className="text-crm-text-muted block mb-1">
                  Notes / Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Additional contextual details about this prospect..."
                  value={newLead.description}
                  onChange={(e) =>
                    setNewLead({ ...newLead, description: e.target.value })
                  }
                  className="w-full bg-crm-inner border border-crm-border-strong rounded-xl p-2 text-crm-text focus:outline-none focus:border-primary-cyan"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-crm-border-strong">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-crm-inner text-crm-text-muted hover:text-crm-text cursor-pointer"
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

      {showEditModal && selectedLead && (
        <div className="dashboard-overlay bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <MultiCrmCard className="w-full max-w-lg p-6 space-y-5 border border-primary-cyan/40 shadow-2xl">
            <div className="flex items-start justify-between border-b border-crm-border-strong pb-3">
              <div>
                <h2 className="text-lg font-bold text-crm-text">Edit canonical contact</h2>
                <p className="mt-1 text-xs font-mono text-crm-text-muted">Saves locally first, then writes the mapped HubSpot contact.</p>
              </div>
              <button onClick={() => setShowEditModal(false)} className="text-crm-text-muted hover:text-crm-text"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={saveContactEdit} className="space-y-4 font-mono text-xs">
              <div className="grid grid-cols-2 gap-3">
                {[['firstName', 'First name'], ['lastName', 'Last name']].map(([field, label]) => (
                  <label key={field} className="space-y-1 text-crm-text-muted"><span>{label}</span><input required value={editContact[field as 'firstName' | 'lastName']} onChange={(event) => setEditContact({ ...editContact, [field]: event.target.value })} className="w-full rounded-xl border border-crm-border-strong bg-crm-inner px-3 py-2 text-crm-text outline-none focus:border-primary-cyan/60" /></label>
                ))}
              </div>
              {[['email', 'Email'], ['phone', 'Phone'], ['company', 'Company']].map(([field, label]) => (
                <label key={field} className="block space-y-1 text-crm-text-muted"><span>{label}</span><input type={field === 'email' ? 'email' : 'text'} value={editContact[field as 'email' | 'phone' | 'company']} onChange={(event) => setEditContact({ ...editContact, [field]: event.target.value })} className="w-full rounded-xl border border-crm-border-strong bg-crm-inner px-3 py-2 text-crm-text outline-none focus:border-primary-cyan/60" /></label>
              ))}
              <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={() => setShowEditModal(false)} className="rounded-xl border border-crm-border-strong px-4 py-2 text-crm-text-muted">Cancel</button><button disabled={isSavingContact} className="rounded-xl bg-primary-cyan px-4 py-2 font-semibold text-slate-950 disabled:opacity-50">{isSavingContact ? 'Saving…' : 'Save & Sync HubSpot'}</button></div>
            </form>
          </MultiCrmCard>
        </div>
      )}

      {companyForm && selectedLead?.companyDetails && (
        <div className="dashboard-overlay bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <MultiCrmCard className="w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-5 border border-primary-cyan/40 shadow-2xl">
            <div className="flex items-start justify-between border-b border-crm-border-strong pb-3"><div><h2 className="text-lg font-bold text-crm-text">Edit canonical company</h2><p className="mt-1 text-xs font-mono text-crm-text-muted">Saves locally first, then updates supported HubSpot company properties.</p></div><button type="button" onClick={() => setCompanyForm(null)} className="text-crm-text-muted hover:text-crm-text"><X className="h-5 w-5" /></button></div>
            <form onSubmit={saveCompany} className="space-y-4 font-mono text-xs">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {([['name', 'Company name'], ['domain', 'Domain'], ['website', 'Website'], ['phone', 'Phone'], ['industry', 'Industry'], ['city', 'City'], ['state', 'State'], ['country', 'Country']] as const).map(([field, label]) => <label key={field} className="space-y-1 text-crm-text-muted"><span>{label}</span><input required={field === 'name'} value={companyForm[field]} onChange={(event) => setCompanyForm({ ...companyForm, [field]: event.target.value })} className="w-full rounded-xl border border-crm-border-strong bg-crm-inner px-3 py-2 text-crm-text outline-none focus:border-primary-cyan/60" /></label>)}
              </div>
              <label className="block space-y-1 text-crm-text-muted"><span>Street address</span><input value={companyForm.address} onChange={(event) => setCompanyForm({ ...companyForm, address: event.target.value })} className="w-full rounded-xl border border-crm-border-strong bg-crm-inner px-3 py-2 text-crm-text outline-none focus:border-primary-cyan/60" /></label>
              <div className="flex justify-end gap-3 border-t border-crm-border-strong pt-4"><button type="button" onClick={() => setCompanyForm(null)} className="rounded-xl border border-crm-border-strong px-4 py-2 text-crm-text-muted">Cancel</button><button disabled={isSavingCrmEntity} className="rounded-xl bg-primary-cyan px-4 py-2 font-semibold text-slate-950 disabled:opacity-50">{isSavingCrmEntity ? "Saving…" : "Save & Sync HubSpot"}</button></div>
            </form>
          </MultiCrmCard>
        </div>
      )}

      {dealForm && selectedLead && (
        <div className="dashboard-overlay bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <MultiCrmCard className="w-full max-w-lg p-6 space-y-5 border border-primary-cyan/40 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-crm-border-strong pb-3">
              <div>
                <h2 className="text-lg font-bold text-crm-text flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-primary-cyan" />
                  {dealForm.status === "CLOSED_WON" ? "Close Deal & Handoff" : "Edit Canonical Deal"}
                </h2>
                <p className="mt-1 text-xs font-mono text-crm-text-muted">
                  {dealForm.status === "CLOSED_WON"
                    ? "Closing this deal triggers an operational Deal Handoff with notes to Zoho CRM."
                    : "Saves locally and syncs safe sales fields with HubSpot."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDealForm(null)}
                className="text-crm-text-muted hover:text-crm-text"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={saveDeal} className="space-y-4 font-mono text-xs">
              <label className="block space-y-1 text-crm-text-muted">
                <span>Deal name</span>
                <input
                  required
                  value={dealForm.title}
                  onChange={(event) =>
                    setDealForm({ ...dealForm, title: event.target.value })
                  }
                  className="w-full rounded-xl border border-crm-border-strong bg-crm-inner px-3 py-2 text-crm-text"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1 text-crm-text-muted">
                  <span>Amount ($)</span>
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    value={dealForm.amount}
                    onChange={(event) =>
                      setDealForm({ ...dealForm, amount: event.target.value })
                    }
                    className="w-full rounded-xl border border-crm-border-strong bg-crm-inner px-3 py-2 text-crm-text"
                  />
                </label>
                <label className="space-y-1 text-crm-text-muted">
                  <span>Expected close</span>
                  <input
                    type="date"
                    value={dealForm.expectedCloseAt}
                    onChange={(event) =>
                      setDealForm({
                        ...dealForm,
                        expectedCloseAt: event.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-crm-border-strong bg-crm-inner px-3 py-2 text-crm-text"
                  />
                </label>
              </div>

              {/* Deal Status Selection */}
              <label className="block space-y-1 text-crm-text-muted">
                <span>Deal Status</span>
                <select
                  value={dealForm.status}
                  onChange={(event) =>
                    setDealForm({
                      ...dealForm,
                      status: event.target.value as "OPEN" | "CLOSED_WON" | "CLOSED_LOST",
                    })
                  }
                  className="w-full rounded-xl border border-crm-border-strong bg-crm-inner px-3 py-2 text-crm-text focus:outline-none focus:border-emerald-500/60"
                >
                  <option value="OPEN">Open (Active in Sales Pipeline)</option>
                  <option value="CLOSED_WON">Closed Won (Win & Trigger Zoho Handoff)</option>
                  <option value="CLOSED_LOST">Closed Lost</option>
                </select>
              </label>

              {/* Closed Won Special Handoff Section */}
              {dealForm.status === "CLOSED_WON" && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-400 font-semibold text-[11px]">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Client Zoho CRM Handoff Details</span>
                  </div>
                  <p className="text-[10px] text-crm-text-muted">
                    This deal and the customer will be dispatched to the client&apos;s Zoho CRM with a Note containing your closing details.
                  </p>

                  <label className="block space-y-1 text-crm-text-muted">
                    <span>Close Outcome / Deal Agreement</span>
                    <input
                      type="text"
                      placeholder="e.g. Client accepted enterprise proposal"
                      value={dealForm.closeOutcome}
                      onChange={(event) =>
                        setDealForm({ ...dealForm, closeOutcome: event.target.value })
                      }
                      className="w-full rounded-lg border border-crm-border-strong bg-crm-inner px-2.5 py-1.5 text-crm-text text-xs"
                    />
                  </label>

                  <label className="block space-y-1 text-crm-text-muted">
                    <span>What Should The Client Do Next?</span>
                    <input
                      type="text"
                      placeholder="e.g. Schedule onboarding kick-off call"
                      value={dealForm.recommendedNextAction}
                      onChange={(event) =>
                        setDealForm({
                          ...dealForm,
                          recommendedNextAction: event.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-crm-border-strong bg-crm-inner px-2.5 py-1.5 text-crm-text text-xs"
                    />
                  </label>

                  <label className="block space-y-1 text-crm-text-muted">
                    <span>Handoff Notes & Special Instructions</span>
                    <textarea
                      rows={3}
                      placeholder="Enter specific notes for the client (e.g. preferred contact method, deliverables agreed, timeline notes)..."
                      value={dealForm.notes}
                      onChange={(event) =>
                        setDealForm({ ...dealForm, notes: event.target.value })
                      }
                      className="w-full rounded-lg border border-crm-border-strong bg-crm-inner px-2.5 py-1.5 text-crm-text text-xs"
                    />
                  </label>
                </div>
              )}

              {dealForm.status !== "CLOSED_WON" && (
                <label className="block space-y-1 text-crm-text-muted">
                  <span>Internal Deal Notes</span>
                  <textarea
                    rows={2}
                    placeholder="Internal sales notes..."
                    value={dealForm.notes}
                    onChange={(event) =>
                      setDealForm({ ...dealForm, notes: event.target.value })
                    }
                    className="w-full rounded-xl border border-crm-border-strong bg-crm-inner px-3 py-2 text-crm-text text-xs"
                  />
                </label>
              )}

              <div className="grid grid-cols-2 gap-3 rounded-xl border border-crm-border-strong bg-crm-inner p-3">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-crm-text-muted">
                    Pipeline
                  </p>
                  <p className="mt-1 text-crm-text">{dealForm.pipelineLabel}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-crm-text-muted">
                    Stage
                  </p>
                  <p className="mt-1 text-crm-text">{dealForm.stageLabel}</p>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-crm-border-strong pt-4">
                <button
                  type="button"
                  onClick={() => setDealForm(null)}
                  className="rounded-xl border border-crm-border-strong px-4 py-2 text-crm-text-muted"
                >
                  Cancel
                </button>
                <button
                  disabled={isSavingCrmEntity}
                  className={`rounded-xl px-4 py-2 font-semibold text-slate-950 disabled:opacity-50 transition-all flex items-center gap-1.5 ${
                    dealForm.status === "CLOSED_WON"
                      ? "bg-emerald-400 hover:bg-emerald-300"
                      : "bg-primary-cyan hover:opacity-90"
                  }`}
                >
                  {isSavingCrmEntity ? (
                    "Saving…"
                  ) : dealForm.status === "CLOSED_WON" ? (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Close Deal & Handoff to Zoho</span>
                    </>
                  ) : (
                    "Save & Sync HubSpot"
                  )}
                </button>
              </div>
            </form>
          </MultiCrmCard>
        </div>
      )}

      {showAssessmentModal && selectedLead?.analysis && assessmentForm && (
        <div className="dashboard-overlay bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <MultiCrmCard className="w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-5 border border-primary-cyan/40 shadow-2xl">
            <div className="flex items-start justify-between border-b border-crm-border-strong pb-3">
              <div><h2 className="text-lg font-bold text-crm-text">Edit AI assessment</h2><p className="mt-1 text-xs font-mono text-crm-text-muted">This is a manual internal override. It does not overwrite CRM contact properties.</p></div>
              <button type="button" onClick={() => setShowAssessmentModal(false)} className="text-crm-text-muted hover:text-crm-text"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={saveAssessment} className="space-y-4 font-mono text-xs">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <label className="space-y-1"><span className="text-[10px] text-crm-text-muted">Lead score</span><input required type="number" min="0" max="100" value={assessmentForm.leadScore} onChange={(event) => setAssessmentForm({ ...assessmentForm, leadScore: Number(event.target.value) })} className="w-full rounded-xl border border-crm-border-strong bg-crm-inner p-2 text-crm-text" /></label>
                <label className="space-y-1"><span className="text-[10px] text-crm-text-muted">Temperature</span><select value={assessmentForm.temperature} onChange={(event) => setAssessmentForm({ ...assessmentForm, temperature: event.target.value })} className="w-full rounded-xl border border-crm-border-strong bg-crm-inner p-2 text-crm-text"><option>Hot</option><option>Warm</option><option>Cold</option></select></label>
                <label className="space-y-1"><span className="text-[10px] text-crm-text-muted">Deal probability</span><input required type="number" min="0" max="100" value={assessmentForm.dealProbability} onChange={(event) => setAssessmentForm({ ...assessmentForm, dealProbability: Number(event.target.value) })} className="w-full rounded-xl border border-crm-border-strong bg-crm-inner p-2 text-crm-text" /></label>
              </div>
              <label className="block space-y-1"><span className="text-[10px] text-crm-text-muted">Assessment summary</span><textarea required rows={3} value={assessmentForm.summary} onChange={(event) => setAssessmentForm({ ...assessmentForm, summary: event.target.value })} className="w-full rounded-xl border border-crm-border-strong bg-crm-inner p-2 text-crm-text" /></label>
              {[['budget', 'Budget'], ['timeline', 'Timeline'], ['requirements', 'Requirements'], ['intent', 'Intent signals'], ['objections', 'Objections']].map(([field, label]) => <label key={field} className="block space-y-1"><span className="text-[10px] text-crm-text-muted">{label}</span><input value={assessmentForm[field as 'budget' | 'timeline' | 'requirements' | 'intent' | 'objections'] || ""} onChange={(event) => setAssessmentForm({ ...assessmentForm, [field]: event.target.value || null })} className="w-full rounded-xl border border-crm-border-strong bg-crm-inner p-2 text-crm-text" /></label>)}
              <div className="flex justify-end gap-3 border-t border-crm-border-strong pt-4"><button type="button" onClick={() => setShowAssessmentModal(false)} className="rounded-xl border border-crm-border-strong bg-crm-inner px-4 py-2 text-crm-text-muted">Cancel</button><button disabled={isSavingAssessment} className="rounded-xl bg-primary-cyan px-4 py-2 font-semibold text-slate-950 disabled:opacity-50">{isSavingAssessment ? "Saving…" : "Save manual override"}</button></div>
            </form>
          </MultiCrmCard>
        </div>
      )}
    </div>
  );
}
