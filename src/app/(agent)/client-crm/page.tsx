"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Briefcase,
  Users,
  DollarSign,
  FileText,
  RefreshCw,
  Search,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  Clock,
  ArrowRight,
  Edit3,
  CheckCircle2,
  XCircle,
  X,
  Layers,
  Sparkles,
  Plus,
} from "lucide-react";
import {
  MultiCrmCard,
  MultiCrmInnerPanel,
  MultiCrmTag,
} from "@/components/ui/MultiCrmCard";
import { useClientAccount } from "@/context/ClientAccountContext";
import type { ClientCrmRecordSummary, DealHandoffSummary } from "@/lib/models/canonical";

type TabType = "CONTACT" | "DEAL" | "NOTE" | "HANDOFFS";

interface DealHandoffTarget {
  id: string;
  title: string;
  amount: string;
  contactName?: string;
  clientCrmRecordId?: string;
  status?: string | null;
}

export default function ClientCrmPage() {
  const { activeClientAccount, isClientAccountReady } = useClientAccount();
  const [activeTab, setActiveTab] = useState<TabType>("CONTACT");
  const [records, setRecords] = useState<ClientCrmRecordSummary[]>([]);
  const [handoffs, setHandoffs] = useState<DealHandoffSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [feedback, setFeedback] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });

  // Record Editing State
  const [editingRecord, setEditingRecord] = useState<ClientCrmRecordSummary | null>(null);
  const [editFormData, setEditFormData] = useState<{
    name: string;
    email: string;
    phone: string;
    companyName: string;
    status: string;
    stage: string;
    amount: string;
    details: string;
  }>({
    name: "",
    email: "",
    phone: "",
    companyName: "",
    status: "",
    stage: "",
    amount: "",
    details: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [retryingHandoffId, setRetryingHandoffId] = useState<string | null>(null);

  // Deal Close & Handoff State
  const [handoffModalDeal, setHandoffModalDeal] = useState<DealHandoffTarget | null>(null);
  const [isHandoffModalOpen, setIsHandoffModalOpen] = useState(false);
  const [availableDeals, setAvailableDeals] = useState<DealHandoffTarget[]>([]);
  const [selectedAgencyDealId, setSelectedAgencyDealId] = useState<string>("");
  const [handoffForm, setHandoffForm] = useState({
    status: "CLOSED_WON",
    closeOutcome: "Client accepted enterprise proposal",
    recommendedNextAction: "Schedule onboarding kick-off call for Tuesday",
    notes: "Client preferred WhatsApp contact; requested invoice sent to accounting@company.com",
  });
  const [isSubmittingHandoff, setIsSubmittingHandoff] = useState(false);

  // Client Contacts State for Deal Association
  const [clientContacts, setClientContacts] = useState<{
    id: string;
    name: string;
    email?: string;
    companyName?: string;
  }[]>([]);

  // Create Deal Modal State
  const [isCreateDealModalOpen, setIsCreateDealModalOpen] = useState(false);
  const [dealContactTarget, setDealContactTarget] = useState<{
    id: string;
    name: string;
    companyName?: string;
    email?: string;
  } | null>(null);
  const [createDealForm, setCreateDealForm] = useState({
    title: "",
    amount: "5000.00",
    stage: "Initial Contact",
    status: "OPEN",
    expectedCloseAt: "",
    notes: "",
    closeOutcome: "Client accepted enterprise proposal",
    recommendedNextAction: "Schedule onboarding kick-off call for Tuesday",
  });
  const [isSubmittingNewDeal, setIsSubmittingNewDeal] = useState(false);

  const fetchClientContacts = useCallback(async (): Promise<{ id: string; name: string; email?: string; companyName?: string }[]> => {
    try {
      const res = await fetch("/api/client-crm/records?type=CONTACT", { cache: "no-store" });
      const data = await res.json();
      if (data.success && Array.isArray(data.records)) {
        const contactCandidates = data.records.map((r: ClientCrmRecordSummary) => ({
          id: (typeof r.customFields === "object" && r.customFields && "contactId" in r.customFields ? String(r.customFields.contactId) : null) || r.id,
          name: r.name || r.email || "Unnamed Contact",
          email: r.email || undefined,
          companyName: r.companyName || undefined,
        }));
        setClientContacts(contactCandidates);
        return contactCandidates;
      }
    } catch {
      // Ignore background contact fetch error
    }
    return [];
  }, []);

  const fetchRecords = useCallback(async () => {
    if (!isClientAccountReady) return;
    setIsLoading(true);
    try {
      if (activeTab === "HANDOFFS") {
        const res = await fetch(`/api/handoffs?clientAccountId=${encodeURIComponent(activeClientAccount.id)}`, { cache: "no-store" });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error?.message || "Failed to load handoffs");
        }
        setHandoffs(data.handoffs || []);
      } else {
        const res = await fetch(`/api/client-crm/records?type=${activeTab}`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error?.message || "Failed to load client CRM records");
        }
        const recs = data.records || [];
        setRecords(recs);
        if (activeTab === "CONTACT") {
          const contactCandidates = recs.map((r: ClientCrmRecordSummary) => ({
            id: (typeof r.customFields === "object" && r.customFields && "contactId" in r.customFields ? String(r.customFields.contactId) : null) || r.id,
            name: r.name || r.email || "Unnamed Contact",
            email: r.email || undefined,
            companyName: r.companyName || undefined,
          }));
          setClientContacts(contactCandidates);
        }
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Failed to load data";
      setFeedback({ type: "error", message: errMsg });
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, isClientAccountReady, activeClientAccount.id]);

  useEffect(() => {
    void fetchRecords();
    void fetchClientContacts();
  }, [fetchRecords, fetchClientContacts, activeClientAccount.id]);

  const handleSyncClientCrm = async () => {
    setIsSyncing(true);
    setFeedback({ type: null, message: "" });
    try {
      const res = await fetch("/api/client-crm/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientAccountId: activeClientAccount.id }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Client CRM sync failed");
      }
      const count = data.count ?? data.sync?.recordsCreated ?? 0;
      setFeedback({
        type: "success",
        message: `Client CRM synced: ${count} record${count === 1 ? "" : "s"} processed.`,
      });
      await fetchRecords();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Sync error";
      setFeedback({ type: "error", message: errMsg });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRetryHandoff = async (handoffId: string) => {
    setRetryingHandoffId(handoffId);
    setFeedback({ type: null, message: "" });
    try {
      const res = await fetch(`/api/handoffs/${handoffId}/retry`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to retry handoff");
      }
      setFeedback({
        type: "success",
        message: "Handoff successfully dispatched to Client CRM!",
      });
      await fetchRecords();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Retry error";
      setFeedback({ type: "error", message: errMsg });
    } finally {
      setRetryingHandoffId(null);
    }
  };

  const fetchDealsForHandoff = useCallback(async (): Promise<DealHandoffTarget[]> => {
    try {
      const res = await fetch("/api/client-crm/records?type=DEAL", { cache: "no-store" });
      const data = await res.json();
      if (data.success && Array.isArray(data.records)) {
        const dealTargets: DealHandoffTarget[] = data.records.map((r: ClientCrmRecordSummary) => ({
          id:
            (r.customFields?.dealId as string) ||
            (r.externalId?.startsWith("deal-") ? r.externalId.replace("deal-", "") : r.id),
          title: r.name || "Untitled Deal",
          amount: r.amount || "0.00",
          contactName: (r.customFields?.contactName as string) || undefined,
          clientCrmRecordId: r.id,
          status: r.status,
        }));
        setAvailableDeals(dealTargets);
        return dealTargets;
      }
    } catch (err) {
      console.error("Failed to load deals for handoff:", err);
    }
    return [];
  }, []);

  const openHandoffForDeal = (record: ClientCrmRecordSummary) => {
    const dealId =
      (record.customFields?.dealId as string) ||
      (record.externalId?.startsWith("deal-") ? record.externalId.replace("deal-", "") : record.id);
    const target: DealHandoffTarget = {
      id: dealId,
      title: record.name || "Untitled Deal",
      amount: record.amount || "0.00",
      contactName: (record.customFields?.contactName as string) || undefined,
      clientCrmRecordId: record.id,
      status: record.status,
    };
    setHandoffModalDeal(target);
    setSelectedAgencyDealId(dealId);
    setAvailableDeals([target]);
    setHandoffForm({
      status: "CLOSED_WON",
      closeOutcome: "Client accepted enterprise proposal",
      recommendedNextAction: "Schedule onboarding kick-off call for Tuesday",
      notes: "Client preferred WhatsApp contact; requested invoice sent to accounting@company.com",
    });
    setIsHandoffModalOpen(true);
  };

  const openHandoffForContactDeal = (
    deal: { id: string; title: string; amount?: string; status?: string },
    contactName?: string,
  ) => {
    const target: DealHandoffTarget = {
      id: deal.id,
      title: deal.title,
      amount: deal.amount || "0.00",
      contactName,
      status: deal.status,
    };
    setHandoffModalDeal(target);
    setSelectedAgencyDealId(deal.id);
    setAvailableDeals([target]);
    setHandoffForm({
      status: "CLOSED_WON",
      closeOutcome: "Client accepted enterprise proposal",
      recommendedNextAction: "Schedule onboarding kick-off call for Tuesday",
      notes: "Client preferred WhatsApp contact; requested invoice sent to accounting@company.com",
    });
    setIsHandoffModalOpen(true);
  };

  const openGeneralHandoff = async () => {
    setIsLoading(true);
    const targets = await fetchDealsForHandoff();
    setIsLoading(false);
    const openDeals = targets.filter(
      (d) => d.status !== "Won" && d.status !== "CLOSED_WON",
    );
    const firstChoice = openDeals[0] || targets[0] || null;
    setHandoffModalDeal(firstChoice);
    setSelectedAgencyDealId(firstChoice?.id || "");
    setHandoffForm({
      status: "CLOSED_WON",
      closeOutcome: "Client accepted enterprise proposal",
      recommendedNextAction: "Schedule onboarding kick-off call for Tuesday",
      notes: "Client preferred WhatsApp contact; requested invoice sent to accounting@company.com",
    });
    setIsHandoffModalOpen(true);
  };

  const handleSubmitHandoff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAgencyDealId) {
      setFeedback({ type: "error", message: "Please select an agency deal to hand off." });
      return;
    }
    setIsSubmittingHandoff(true);
    setFeedback({ type: null, message: "" });
    try {
      const res = await fetch("/api/handoffs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agencyDealId: selectedAgencyDealId,
          closeOutcome: handoffForm.closeOutcome,
          recommendedNextAction: handoffForm.recommendedNextAction,
          notes: handoffForm.notes,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to close and hand off deal");
      }

      const handoff = data.handoff;
      const dealTitle = handoff?.dealName || handoffModalDeal?.title || "Deal";
      const isSynced = handoff?.status === "SYNCED";
      const extId = handoff?.clientCrmRecordId ? ` (Zoho Ext ID: #${handoff.clientCrmRecordId})` : "";

      setFeedback({
        type: "success",
        message: isSynced
          ? `Deal "${dealTitle}" successfully marked as Closed Won and handed off to Zoho CRM!${extId}`
          : `Deal "${dealTitle}" marked as Closed Won. Handoff status: ${handoff?.status || "PENDING"}${handoff?.lastError ? ` (${handoff.lastError})` : ""}`,
      });

      setIsHandoffModalOpen(false);
      setHandoffModalDeal(null);
      setActiveTab("HANDOFFS");
      await fetchRecords();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Handoff error";
      setFeedback({ type: "error", message: errMsg });
    } finally {
      setIsSubmittingHandoff(false);
    }
  };

  const openCreateDealForContact = (record: ClientCrmRecordSummary) => {
    const canonicalId =
      (typeof record.customFields === "object" && record.customFields && "contactId" in record.customFields
        ? String(record.customFields.contactId)
        : null) || record.id;
    const contactObj = {
      id: canonicalId,
      name: record.name || record.email || "Unnamed Contact",
      companyName: record.companyName || undefined,
      email: record.email || undefined,
    };
    setDealContactTarget(contactObj);
    setCreateDealForm({
      title: `${record.name || "Client"} - Expansion Deal`,
      amount: "5000.00",
      stage: "Initial Contact",
      status: "OPEN",
      expectedCloseAt: "",
      notes: "",
      closeOutcome: "Client accepted enterprise proposal",
      recommendedNextAction: "Schedule onboarding kick-off call for Tuesday",
    });
    setIsCreateDealModalOpen(true);
  };

  const openCreateDealGeneral = async () => {
    let contactsList = clientContacts;
    if (contactsList.length === 0) {
      contactsList = await fetchClientContacts();
    }
    const defaultContact = contactsList[0] || null;
    setDealContactTarget(defaultContact);
    setCreateDealForm({
      title: defaultContact ? `${defaultContact.name} - New Deal` : "New Deal",
      amount: "5000.00",
      stage: "Initial Contact",
      status: "OPEN",
      expectedCloseAt: "",
      notes: "",
      closeOutcome: "Client accepted enterprise proposal",
      recommendedNextAction: "Schedule onboarding kick-off call for Tuesday",
    });
    setIsCreateDealModalOpen(true);
  };

  const handleCreateDealSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dealContactTarget?.id) {
      setFeedback({ type: "error", message: "Please select a contact for this deal." });
      return;
    }
    if (!createDealForm.title.trim()) {
      setFeedback({ type: "error", message: "Please provide a deal title." });
      return;
    }
    const numAmount = parseFloat(createDealForm.amount);
    if (isNaN(numAmount) || numAmount < 0) {
      setFeedback({ type: "error", message: "Please enter a valid deal amount." });
      return;
    }

    setIsSubmittingNewDeal(true);
    setFeedback({ type: null, message: "" });
    try {
      const res = await fetch("/api/crm/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientAccountId: activeClientAccount.id,
          contactId: dealContactTarget.id,
          title: createDealForm.title.trim(),
          amount: numAmount,
          stage: createDealForm.stage,
          status: createDealForm.status,
          expectedCloseAt: createDealForm.expectedCloseAt || undefined,
          notes: createDealForm.notes.trim() || undefined,
          closeOutcome: createDealForm.status === "CLOSED_WON" ? createDealForm.closeOutcome : undefined,
          recommendedNextAction:
            createDealForm.status === "CLOSED_WON" ? createDealForm.recommendedNextAction : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to create deal");
      }

      setFeedback({
        type: "success",
        message:
          createDealForm.status === "CLOSED_WON"
            ? `Deal "${createDealForm.title}" created as Closed Won and handed off to ${providerDisplayName}!`
            : `Deal "${createDealForm.title}" successfully created for ${dealContactTarget.name}! Synced with sales pipeline and Client CRM.`,
      });

      setIsCreateDealModalOpen(false);
      if (createDealForm.status === "CLOSED_WON") {
        setActiveTab("HANDOFFS");
      } else {
        setActiveTab("DEAL");
      }
      await fetchRecords();
      await fetchClientContacts();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Error creating deal";
      setFeedback({ type: "error", message: errMsg });
    } finally {
      setIsSubmittingNewDeal(false);
    }
  };

  const openEditor = (record: ClientCrmRecordSummary) => {
    setEditingRecord(record);
    setEditFormData({
      name: record.name || "",
      email: record.email || "",
      phone: record.phone || "",
      companyName: record.companyName || "",
      status: record.status || "",
      stage: record.stage || "",
      amount: record.amount || "",
      details: record.details || "",
    });
  };

  const handleSaveRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;
    setIsSaving(true);
    setFeedback({ type: null, message: "" });
    try {
      const res = await fetch(`/api/client-crm/records/${editingRecord.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editFormData),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to save record");
      }
      setFeedback({
        type: "success",
        message: `Record updated and synchronized across Client CRM${data.outboundStatus && data.outboundStatus !== "LOCAL_ONLY" ? " (pushed to Client CRM)" : ""} and Unified Lead Directory.`,
      });
      setEditingRecord(null);
      await fetchRecords();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Save error";
      setFeedback({ type: "error", message: errMsg });
    } finally {
      setIsSaving(false);
    }
  };

  const filteredRecords = records.filter((r) => {
    if (r.recordType !== activeTab) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (r.name && r.name.toLowerCase().includes(q)) ||
      (r.email && r.email.toLowerCase().includes(q)) ||
      (r.phone && r.phone.toLowerCase().includes(q)) ||
      (r.companyName && r.companyName.toLowerCase().includes(q)) ||
      (r.externalId && r.externalId.toLowerCase().includes(q)) ||
      (r.details && r.details.toLowerCase().includes(q)) ||
      (r.status && r.status.toLowerCase().includes(q)) ||
      (r.stage && r.stage.toLowerCase().includes(q))
    );
  });

  const filteredHandoffs = handoffs.filter((h) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (h.dealName && h.dealName.toLowerCase().includes(q)) ||
      (h.agencyDeal?.title && h.agencyDeal.title.toLowerCase().includes(q)) ||
      (h.closeOutcome && h.closeOutcome.toLowerCase().includes(q)) ||
      (h.recommendedNextAction && h.recommendedNextAction.toLowerCase().includes(q)) ||
      (h.notes && h.notes.toLowerCase().includes(q)) ||
      (h.agent?.name && h.agent.name.toLowerCase().includes(q)) ||
      (h.clientCrmRecordId && h.clientCrmRecordId.toLowerCase().includes(q)) ||
      (h.status && h.status.toLowerCase().includes(q))
    );
  });

  const activeProvider = records[0]?.provider || handoffs[0]?.clientCrmProvider || "ZOHO";
  const providerDisplayName =
    activeProvider === "ZOHO"
      ? "Zoho CRM"
      : activeProvider === "ACTIVECAMPAIGN"
      ? "ActiveCampaign"
      : activeProvider;

  return (
    <div className="space-y-6 text-crm-text font-sans">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Briefcase className="w-5 h-5 text-emerald-400" />
            <h1 className="text-2xl font-bold tracking-tight text-crm-text">
              Client CRM Operations
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              {providerDisplayName} Integration
            </span>
          </div>
          <p className="text-xs text-crm-text-muted font-mono mt-1">
            Active Client Account: <span className="text-primary-cyan font-bold">{activeClientAccount.name}</span> • Client CRM: {providerDisplayName}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSyncClientCrm}
            disabled={isSyncing}
            className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs font-mono text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/50 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            title={`Sync records with ${providerDisplayName} for this client`}
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${
                isSyncing ? "animate-spin text-emerald-400" : "text-emerald-400"
              }`}
            />
            <span>{isSyncing ? `Syncing ${providerDisplayName}...` : `Sync ${providerDisplayName}`}</span>
          </button>
          <button
            onClick={() => void fetchRecords()}
            className="px-3 py-2 rounded-xl bg-crm-surface border border-crm-border-strong text-xs font-mono text-crm-text-muted hover:text-crm-text transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback.type && (
        <div
          className={`p-3 rounded-xl border text-xs font-mono flex items-center justify-between transition-all ${
            feedback.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-rose-500/10 border-rose-500/30 text-rose-300"
          }`}
        >
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback({ type: null, message: "" })}
            className="p-1 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Stage 2.7 Architectural Banner */}
      <MultiCrmCard className="p-4 bg-linear-to-r from-emerald-500/5 via-primary-cyan/5 to-transparent border-emerald-500/20">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold font-mono text-crm-text">
                Agency Sales $\rightarrow$ Client Operations Architecture
              </p>
              <p className="text-[11px] text-crm-text-muted font-mono mt-0.5">
                Contacts in the Unified Lead Directory matching <span className="text-emerald-400 font-semibold">{activeClientAccount.name}</span> by company appear directly here. Editing them syncs bi-directionally with the Unified Lead Directory and the client&apos;s CRM.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono px-2 py-1 rounded bg-crm-inner text-crm-text-muted border border-crm-border-strong">
              Client ID: {activeClientAccount.id.slice(0, 8)}...
            </span>
          </div>
        </div>
      </MultiCrmCard>

      {/* Navigation Tabs and Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-crm-border-strong pb-3">
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { id: "CONTACT", label: "Contacts", icon: Users },
            { id: "DEAL", label: "Deals", icon: DollarSign },
            { id: "NOTE", label: "Notes", icon: FileText },
            { id: "HANDOFFS", label: "Deal Handoffs", icon: Sparkles },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as TabType);
                  setSearchQuery("");
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer ${
                  isActive
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-semibold"
                    : "text-crm-text-muted hover:text-crm-text bg-crm-surface border border-crm-border-strong"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {activeTab === "DEAL" && (
            <button
              type="button"
              onClick={openCreateDealGeneral}
              className="px-3 py-1.5 rounded-xl bg-emerald-500 text-slate-950 text-xs font-mono font-bold hover:bg-emerald-400 transition-all flex items-center gap-1.5 cursor-pointer shadow-md shrink-0"
              title="Create a new deal for this client account"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Create Deal</span>
            </button>
          )}

          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-crm-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={`Search ${activeTab.toLowerCase()}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-crm-inner border border-crm-border-strong rounded-xl pl-9 pr-3 py-1.5 text-xs font-mono text-crm-text placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
            />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="p-12 text-center text-xs font-mono text-crm-text-muted flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
          Loading records from {activeClientAccount.name}&apos;s {providerDisplayName}...
        </div>
      ) : activeTab === "HANDOFFS" ? (
        // Deal Handoffs View
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-linear-to-r from-emerald-500/10 via-primary-cyan/5 to-transparent border border-emerald-500/25">
            <div>
              <h3 className="text-xs font-bold font-mono text-crm-text flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>{providerDisplayName} Deal Handoff Pipeline</span>
              </h3>
              <p className="text-[11px] font-mono text-crm-text-muted mt-0.5">
                Close agency sales deals and automatically dispatch the deal, customer contact, and closing notes into {activeClientAccount.name}&apos;s {providerDisplayName}.
              </p>
            </div>
            <button
              type="button"
              onClick={openGeneralHandoff}
              className="px-3.5 py-2 rounded-xl bg-emerald-500 text-slate-950 text-xs font-mono font-bold hover:bg-emerald-400 transition-all flex items-center gap-1.5 cursor-pointer shadow-md shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>+ Close & Handoff Deal</span>
            </button>
          </div>

          {filteredHandoffs.length === 0 ? (
            <MultiCrmCard className="p-8 text-center space-y-3">
              <Sparkles className="w-8 h-8 text-crm-text-muted mx-auto opacity-50" />
              <div>
                <p className="text-sm font-semibold text-crm-text">No Deal Handoffs Found</p>
                <p className="text-xs text-crm-text-muted font-mono mt-1">
                  When an Agency Deal is set to CLOSED_WON for {activeClientAccount.name}, it will appear here and sync to {providerDisplayName}.
                </p>
              </div>
              <button
                type="button"
                onClick={openGeneralHandoff}
                className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 text-xs font-mono font-bold hover:bg-emerald-400 transition-all inline-flex items-center gap-2 cursor-pointer shadow-md"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Close & Handoff a Deal Now</span>
              </button>
            </MultiCrmCard>
          ) : (
            <div className="space-y-3">
              {filteredHandoffs.map((handoff) => {
                const statusColor =
                  handoff.status === "SYNCED"
                    ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/30"
                    : handoff.status === "FAILED"
                    ? "text-rose-400 bg-rose-500/10 border-rose-500/30"
                    : handoff.status === "SYNCING"
                    ? "text-cyan-400 bg-cyan-500/10 border-cyan-500/30 animate-pulse"
                    : "text-amber-400 bg-amber-500/10 border-amber-500/30";

                return (
                  <MultiCrmCard key={handoff.id} className="p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-crm-border-strong pb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-crm-text-muted">Handoff #{handoff.id.slice(0, 8)}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold border ${statusColor}`}>
                          {handoff.status}
                        </span>
                        <span className="text-[10px] font-mono text-crm-text-muted">
                          Provider: {handoff.clientCrmProvider}
                        </span>
                        {handoff.clientCrmRecordId && (
                          <span className="text-[10px] font-mono text-emerald-400">
                            Ext ID: #{handoff.clientCrmRecordId}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {handoff.status === "FAILED" && (
                          <button
                            onClick={() => handleRetryHandoff(handoff.id)}
                            disabled={retryingHandoffId === handoff.id}
                            className="px-3 py-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-mono hover:bg-rose-500/30 transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          >
                            <RefreshCw className={`w-3 h-3 ${retryingHandoffId === handoff.id ? "animate-spin" : ""}`} />
                            Retry Handoff
                          </button>
                        )}
                        <span className="text-[10px] font-mono text-crm-text-muted">
                          {new Date(handoff.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                      <div>
                        <span className="text-crm-text-muted text-[10px] block">Agency Deal Title:</span>
                        <span className="text-crm-text font-bold">
                          {handoff.dealName || handoff.agencyDeal?.title || "Untitled Deal"}
                        </span>
                        {handoff.dealAmountCents != null && (
                          <span className="text-emerald-400 block text-[11px]">
                            ${(handoff.dealAmountCents / 100).toFixed(2)} {handoff.currency || "USD"}
                          </span>
                        )}
                      </div>
                      <div>
                        <span className="text-crm-text-muted text-[10px] block">Outcome & Next Action:</span>
                        <span className="text-crm-text block">
                          {handoff.closeOutcome || "Client Won"}
                        </span>
                        {handoff.recommendedNextAction && (
                          <span className="text-crm-text-muted block text-[10px]">
                            Action: {handoff.recommendedNextAction}
                          </span>
                        )}
                        {handoff.agent?.name && (
                          <span className="text-cyan-400 block text-[10px]">
                            Agent: {handoff.agent.name}
                          </span>
                        )}
                      </div>
                      <div>
                        <span className="text-crm-text-muted text-[10px] block">Sync Status:</span>
                        <span className="text-crm-text text-[11px] block">
                          {handoff.lastSuccessfulSyncAt
                            ? `Synced: ${new Date(handoff.lastSuccessfulSyncAt).toLocaleTimeString()}`
                            : handoff.lastAttemptedAt
                            ? `Attempted: ${new Date(handoff.lastAttemptedAt).toLocaleTimeString()}`
                            : "Pending Dispatch"}
                        </span>
                        {handoff.lastError && (
                          <span className="text-rose-400 text-[10px] block font-mono">
                            Error: {handoff.lastError}
                          </span>
                        )}
                      </div>
                    </div>
                  </MultiCrmCard>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        // Standard Records List (CONTACT, DEAL, NOTE)
        filteredRecords.length === 0 ? (
          <MultiCrmCard className="p-8 text-center space-y-3">
            <Briefcase className="w-8 h-8 text-crm-text-muted mx-auto mb-2 opacity-50" />
            <p className="text-sm font-semibold text-crm-text">
              No {activeTab.toLowerCase()} records found for {activeClientAccount.name}
            </p>
            <p className="text-xs text-crm-text-muted font-mono mt-1">
              {activeTab === "DEAL"
                ? "Create a deal directly for one of this client's contacts or wait for inbound sync."
                : `Click "Sync Client CRM" to import records from ${providerDisplayName} or wait for deal handoffs.`}
            </p>
            {activeTab === "DEAL" && (
              <button
                type="button"
                onClick={openCreateDealGeneral}
                className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 text-xs font-mono font-bold hover:bg-emerald-400 transition-all inline-flex items-center gap-2 cursor-pointer shadow-md"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Create First Deal</span>
              </button>
            )}
          </MultiCrmCard>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {filteredRecords.map((record) => {
              const contactDeals =
                record.recordType === "CONTACT" && Array.isArray(record.customFields?.deals)
                  ? (record.customFields.deals as { id: string; title: string; amount?: string; status?: string; stage?: string }[])
                  : [];

              return (
                <MultiCrmCard
                  key={record.id}
                  className="p-4 hover:border-emerald-500/40 transition-all space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono font-bold text-crm-text">
                          {record.recordType === "CONTACT"
                            ? record.name || record.email || "Unnamed Contact"
                            : record.recordType === "DEAL"
                            ? record.name || "Untitled Deal"
                            : record.name || "Untitled Note"}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          {record.provider || "ZOHO"}
                        </span>
                        {record.customFields?.source === "UNIFIED_DIRECTORY" && (
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-cyan-500/15 text-cyan-300 border border-cyan-500/35 flex items-center gap-1"
                            title={String(record.customFields?.matchedBy || "Matched from Unified Directory")}
                          >
                            <Users className="w-2.5 h-2.5 text-cyan-400" />
                            <span>Unified Directory</span>
                          </span>
                        )}
                        <span className="text-[10px] font-mono text-crm-text-muted">
                          Ext ID: #{record.externalId || "local"}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-xs font-mono text-crm-text-muted flex-wrap">
                        {record.recordType === "CONTACT" && (
                          <>
                            {record.email && <span>Email: {record.email}</span>}
                            {record.phone && <span>Phone: {record.phone}</span>}
                            {record.companyName && <span>Company: {record.companyName}</span>}
                            {record.status && (
                              <span className="px-1.5 py-0.5 rounded bg-crm-inner text-emerald-400 border border-crm-border-strong text-[10px]">
                                {record.status}
                              </span>
                            )}
                            {record.customFields?.matchedBy && (
                              <span className="text-[10px] font-mono text-cyan-400/90 italic">
                                ({String(record.customFields.matchedBy)})
                              </span>
                            )}
                          </>
                        )}
                        {record.recordType === "DEAL" && (
                          <>
                            {record.amount && <span>Amount: ${record.amount}</span>}
                            {record.stage && <span>Stage: {record.stage}</span>}
                            {record.status && (
                              <span className="px-1.5 py-0.5 rounded bg-crm-inner text-emerald-400 border border-crm-border-strong text-[10px]">
                                {record.status}
                              </span>
                            )}
                            {record.customFields?.contactName && (
                              <span className="text-[10px] font-mono text-cyan-400">
                                Contact: {String(record.customFields.contactName)}
                              </span>
                            )}
                          </>
                        )}
                        {record.recordType === "NOTE" && (
                          <span className="truncate max-w-md">{record.details || "No details"}</span>
                        )}
                        <span>Updated: {new Date(record.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      {record.recordType === "CONTACT" && (
                        <button
                          type="button"
                          onClick={() => openCreateDealForContact(record)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-xs font-mono text-emerald-400 hover:bg-emerald-500/30 transition-all flex items-center gap-1.5 cursor-pointer font-semibold shadow-sm"
                          title={`Create a new deal for ${record.name || record.email || "this contact"}`}
                        >
                          <Plus className="w-3.5 h-3.5 text-emerald-400" />
                          <span>+ Create Deal</span>
                        </button>
                      )}

                      <button
                        onClick={() => openEditor(record)}
                        className="px-3 py-1.5 rounded-lg bg-crm-inner border border-crm-border-strong text-xs font-mono text-crm-text hover:text-emerald-400 hover:border-emerald-500/50 transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Edit3 className="w-3 h-3 text-emerald-400" />
                        <span>Edit & Sync</span>
                      </button>

                      {record.recordType === "DEAL" && (
                        record.status !== "Won" ? (
                          <button
                            type="button"
                            onClick={() => openHandoffForDeal(record)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/50 text-xs font-mono text-emerald-400 hover:bg-emerald-500/30 transition-all flex items-center gap-1.5 cursor-pointer font-semibold shadow-sm"
                            title={`Mark deal as Closed Won and hand off to ${providerDisplayName}`}
                          >
                            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Close & Handoff to {providerDisplayName}</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab("HANDOFFS");
                              setSearchQuery(record.name || "");
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs font-mono text-emerald-400 hover:bg-emerald-500/20 transition-all flex items-center gap-1 cursor-pointer"
                            title="View deal handoff details in Deal Handoffs tab"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Won (View Handoff)</span>
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  {/* Associated Deals for Contact */}
                  {record.recordType === "CONTACT" && (
                    <div className="pt-2.5 border-t border-crm-border-strong/70 flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-mono text-crm-text-muted flex items-center gap-1">
                          <DollarSign className="w-3 h-3 text-emerald-400" /> Associated Deals:
                        </span>
                        {contactDeals.length === 0 ? (
                          <span className="text-[11px] font-mono text-crm-text-muted italic">
                            No deals linked yet
                          </span>
                        ) : (
                          contactDeals.map((deal) => (
                            <div
                              key={deal.id}
                              className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-crm-inner border border-crm-border-strong text-[11px] font-mono"
                            >
                              <span className="font-semibold text-crm-text">{deal.title}</span>
                              <span className="text-emerald-400 font-bold">${deal.amount}</span>
                              <span
                                className={`text-[10px] px-1.5 py-0.2 rounded border ${
                                  deal.status === "CLOSED_WON"
                                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                    : "bg-amber-500/10 text-amber-300 border-amber-500/30"
                                }`}
                              >
                                {deal.status === "CLOSED_WON" ? "Won" : deal.status || "Open"}
                              </span>
                              {deal.status !== "CLOSED_WON" && (
                                <button
                                  type="button"
                                  onClick={() => openHandoffForContactDeal(deal, record.name)}
                                  className="ml-1 px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30 text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition-all"
                                  title={`Close and hand off ${deal.title} to ${providerDisplayName}`}
                                >
                                  <Sparkles className="w-2.5 h-2.5 text-emerald-400" />
                                  <span>Close & Handoff to {providerDisplayName}</span>
                                </button>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => openCreateDealForContact(record)}
                        className="px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 text-[10px] font-mono font-semibold flex items-center gap-1 cursor-pointer transition-all"
                        title={`Create a deal for ${record.name || "this contact"}`}
                      >
                        <Plus className="w-2.5 h-2.5" />
                        <span>+ Add Deal</span>
                      </button>
                    </div>
                  )}
                </MultiCrmCard>
              );
            })}
          </div>
        )
      )}

      {/* Edit Record Modal */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-crm-surface border border-emerald-500/30 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-crm-border-strong pb-3">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold font-mono text-crm-text">
                  Edit {editingRecord.recordType} in {providerDisplayName}
                </h3>
              </div>
              <button
                onClick={() => setEditingRecord(null)}
                className="text-crm-text-muted hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRecord} className="space-y-4">
              <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/25 text-[11px] font-mono text-cyan-300 flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>
                  Edits save directly to this Client&apos;s CRM and keep the agency Unified Lead Directory synchronized.
                </span>
              </div>

              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                {/* Name Field */}
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-crm-text-muted capitalize">
                    {editingRecord.recordType === "CONTACT"
                      ? "Full Name"
                      : editingRecord.recordType === "DEAL"
                      ? "Deal Title"
                      : "Note Subject / Title"}
                  </label>
                  <input
                    type="text"
                    required
                    value={editFormData.name}
                    onChange={(e) =>
                      setEditFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    className="w-full bg-crm-inner border border-crm-border-strong rounded-xl px-3 py-2 text-xs font-mono text-crm-text focus:outline-none focus:border-emerald-500/50"
                  />
                </div>

                {/* Contact specific fields */}
                {editingRecord.recordType === "CONTACT" && (
                  <>
                    <div className="space-y-1">
                      <label className="text-[11px] font-mono text-crm-text-muted">Email</label>
                      <input
                        type="email"
                        value={editFormData.email}
                        onChange={(e) =>
                          setEditFormData((prev) => ({ ...prev, email: e.target.value }))
                        }
                        className="w-full bg-crm-inner border border-crm-border-strong rounded-xl px-3 py-2 text-xs font-mono text-crm-text focus:outline-none focus:border-emerald-500/50"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-mono text-crm-text-muted">Phone</label>
                      <input
                        type="text"
                        value={editFormData.phone}
                        onChange={(e) =>
                          setEditFormData((prev) => ({ ...prev, phone: e.target.value }))
                        }
                        className="w-full bg-crm-inner border border-crm-border-strong rounded-xl px-3 py-2 text-xs font-mono text-crm-text focus:outline-none focus:border-emerald-500/50"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-mono text-crm-text-muted">Company Name</label>
                      <input
                        type="text"
                        value={editFormData.companyName}
                        onChange={(e) =>
                          setEditFormData((prev) => ({ ...prev, companyName: e.target.value }))
                        }
                        className="w-full bg-crm-inner border border-crm-border-strong rounded-xl px-3 py-2 text-xs font-mono text-crm-text focus:outline-none focus:border-emerald-500/50"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-mono text-crm-text-muted">Status</label>
                      <input
                        type="text"
                        value={editFormData.status}
                        onChange={(e) =>
                          setEditFormData((prev) => ({ ...prev, status: e.target.value }))
                        }
                        placeholder="e.g. Active Customer, Lead"
                        className="w-full bg-crm-inner border border-crm-border-strong rounded-xl px-3 py-2 text-xs font-mono text-crm-text focus:outline-none focus:border-emerald-500/50"
                      />
                    </div>
                  </>
                )}

                {/* Deal specific fields */}
                {editingRecord.recordType === "DEAL" && (
                  <>
                    <div className="space-y-1">
                      <label className="text-[11px] font-mono text-crm-text-muted">Amount ($)</label>
                      <input
                        type="text"
                        value={editFormData.amount}
                        onChange={(e) =>
                          setEditFormData((prev) => ({ ...prev, amount: e.target.value }))
                        }
                        placeholder="15000.00"
                        className="w-full bg-crm-inner border border-crm-border-strong rounded-xl px-3 py-2 text-xs font-mono text-crm-text focus:outline-none focus:border-emerald-500/50"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-mono text-crm-text-muted">Stage</label>
                      <input
                        type="text"
                        value={editFormData.stage}
                        onChange={(e) =>
                          setEditFormData((prev) => ({ ...prev, stage: e.target.value }))
                        }
                        placeholder="e.g. Onboarding, Closed Won"
                        className="w-full bg-crm-inner border border-crm-border-strong rounded-xl px-3 py-2 text-xs font-mono text-crm-text focus:outline-none focus:border-emerald-500/50"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-mono text-crm-text-muted">Status</label>
                      <input
                        type="text"
                        value={editFormData.status}
                        onChange={(e) =>
                          setEditFormData((prev) => ({ ...prev, status: e.target.value }))
                        }
                        placeholder="Won, Lost, Open"
                        className="w-full bg-crm-inner border border-crm-border-strong rounded-xl px-3 py-2 text-xs font-mono text-crm-text focus:outline-none focus:border-emerald-500/50"
                      />
                    </div>
                  </>
                )}

                {/* Note specific fields */}
                {editingRecord.recordType === "NOTE" && (
                  <div className="space-y-1">
                    <label className="text-[11px] font-mono text-crm-text-muted">Content / Details</label>
                    <textarea
                      rows={4}
                      value={editFormData.details}
                      onChange={(e) =>
                        setEditFormData((prev) => ({ ...prev, details: e.target.value }))
                      }
                      className="w-full bg-crm-inner border border-crm-border-strong rounded-xl px-3 py-2 text-xs font-mono text-crm-text focus:outline-none focus:border-emerald-500/50"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-crm-border-strong">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="px-4 py-2 rounded-xl bg-crm-inner text-xs font-mono text-crm-text-muted hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 text-xs font-mono font-semibold hover:bg-emerald-400 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? `Pushing to ${providerDisplayName}...` : `Save & Sync ${providerDisplayName}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Close & Handoff to Zoho Modal */}
      {isHandoffModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-crm-surface border border-emerald-500/40 rounded-2xl w-full max-w-xl p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-crm-border-strong pb-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-bold font-mono text-crm-text">
                    Close Deal & Handoff to {providerDisplayName}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    {providerDisplayName}
                  </span>
                </div>
                <p className="text-xs text-crm-text-muted font-mono">
                  Client: <span className="text-emerald-400 font-semibold">{activeClientAccount.name}</span> • Dispatches winning deal, customer details, and notes into client CRM.
                </p>
              </div>
              <button
                onClick={() => {
                  setIsHandoffModalOpen(false);
                  setHandoffModalDeal(null);
                }}
                className="text-crm-text-muted hover:text-white p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitHandoff} className="space-y-4">
              {/* Target Deal Selection / Display */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono text-crm-text-muted uppercase tracking-wider block">
                  Target Agency Deal
                </label>
                {availableDeals.length > 1 ? (
                  <select
                    value={selectedAgencyDealId}
                    onChange={(e) => {
                      const dealId = e.target.value;
                      setSelectedAgencyDealId(dealId);
                      const found = availableDeals.find((d) => d.id === dealId);
                      if (found) setHandoffModalDeal(found);
                    }}
                    className="w-full bg-crm-inner border border-crm-border-strong rounded-xl px-3 py-2 text-xs font-mono text-crm-text focus:outline-none focus:border-emerald-500/60"
                  >
                    {availableDeals.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.title} — ${d.amount} {d.contactName ? `(${d.contactName})` : ""} {d.status ? `[${d.status}]` : ""}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-3 rounded-xl bg-crm-inner border border-crm-border-strong flex items-center justify-between text-xs font-mono">
                    <div>
                      <span className="font-bold text-crm-text block">{handoffModalDeal?.title || "Selected Deal"}</span>
                      {handoffModalDeal?.contactName && (
                        <span className="text-[10px] text-crm-text-muted">Contact: {handoffModalDeal.contactName}</span>
                      )}
                    </div>
                    <span className="text-emerald-400 font-semibold text-sm">${handoffModalDeal?.amount || "0.00"}</span>
                  </div>
                )}
              </div>

              {/* Deal Status Selection */}
              <div className="space-y-1">
                <label className="text-[11px] font-mono text-crm-text-muted block">
                  Deal Status
                </label>
                <select
                  value={handoffForm.status}
                  onChange={(e) => setHandoffForm((prev) => ({ ...prev, status: e.target.value }))}
                  className="w-full bg-crm-inner border border-emerald-500/40 rounded-xl px-3 py-2 text-xs font-mono text-emerald-300 focus:outline-none focus:border-emerald-400"
                >
                  <option value="CLOSED_WON">Closed Won (Win & Trigger {providerDisplayName} Handoff)</option>
                </select>
                <p className="text-[10px] text-crm-text-muted font-mono">
                  Marks the agency sales pipeline deal as won and dispatches full handoff payload.
                </p>
              </div>

              {/* Close Outcome */}
              <div className="space-y-1">
                <label className="text-[11px] font-mono text-crm-text-muted block">
                  Close Outcome
                </label>
                <input
                  type="text"
                  required
                  value={handoffForm.closeOutcome}
                  onChange={(e) => setHandoffForm((prev) => ({ ...prev, closeOutcome: e.target.value }))}
                  placeholder='e.g., "Client accepted enterprise proposal"'
                  className="w-full bg-crm-inner border border-crm-border-strong rounded-xl px-3 py-2 text-xs font-mono text-crm-text focus:outline-none focus:border-emerald-500/50"
                />
                <p className="text-[10px] text-crm-text-muted font-mono">
                  Summary agreement or reason the client signed.
                </p>
              </div>

              {/* What Should The Client Do Next */}
              <div className="space-y-1">
                <label className="text-[11px] font-mono text-crm-text-muted block">
                  What Should The Client Do Next?
                </label>
                <input
                  type="text"
                  required
                  value={handoffForm.recommendedNextAction}
                  onChange={(e) => setHandoffForm((prev) => ({ ...prev, recommendedNextAction: e.target.value }))}
                  placeholder='e.g., "Schedule onboarding kick-off call for Tuesday"'
                  className="w-full bg-crm-inner border border-crm-border-strong rounded-xl px-3 py-2 text-xs font-mono text-crm-text focus:outline-none focus:border-emerald-500/50"
                />
                <p className="text-[10px] text-crm-text-muted font-mono">
                  Actionable next steps recommended for the client team.
                </p>
              </div>

              {/* Handoff Notes & Special Instructions */}
              <div className="space-y-1">
                <label className="text-[11px] font-mono text-crm-text-muted block">
                  Handoff Notes & Special Instructions
                </label>
                <textarea
                  rows={3}
                  value={handoffForm.notes}
                  onChange={(e) => setHandoffForm((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder='e.g., "Client preferred WhatsApp contact; requested invoice sent to accounting@company.com"'
                  className="w-full bg-crm-inner border border-crm-border-strong rounded-xl px-3 py-2 text-xs font-mono text-crm-text focus:outline-none focus:border-emerald-500/50"
                />
                <p className="text-[10px] text-crm-text-muted font-mono">
                  Attached automatically as a Note in {providerDisplayName} under the created Deal.
                </p>
              </div>

              {/* Zoho CRM Handoff Callout Box */}
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-[11px] font-mono text-emerald-300 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{providerDisplayName} Operational Guarantee:</span>
                </div>
                <p className="text-[10px] text-crm-text-muted pl-5">
                  • Creates/Updates Deal in {providerDisplayName} (Stage: Closed Won)
                  <br />
                  • Associates Contact Profile in {providerDisplayName}
                  <br />
                  • Creates & Attaches Note titled &quot;Deal Handoff: {handoffModalDeal?.title || "Deal"}&quot;
                </p>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-crm-border-strong">
                <button
                  type="button"
                  onClick={() => {
                    setIsHandoffModalOpen(false);
                    setHandoffModalDeal(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-crm-inner text-xs font-mono text-crm-text-muted hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingHandoff || !selectedAgencyDealId}
                  className="px-5 py-2 rounded-xl bg-emerald-500 text-slate-950 text-xs font-mono font-bold hover:bg-emerald-400 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-md"
                >
                  {isSubmittingHandoff ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Dispatching to {providerDisplayName}...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Close & Handoff to {providerDisplayName}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create New Deal Modal */}
      {isCreateDealModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-crm-surface border border-emerald-500/40 rounded-2xl w-full max-w-xl p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-crm-border-strong pb-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-bold font-mono text-crm-text">
                    Create New Deal
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    {providerDisplayName} Ready
                  </span>
                </div>
                <p className="text-xs text-crm-text-muted font-mono">
                  Client Account: <span className="text-emerald-400 font-semibold">{activeClientAccount.name}</span> • Create and assign directly to a contact in this account.
                </p>
              </div>
              <button
                onClick={() => {
                  setIsCreateDealModalOpen(false);
                  setDealContactTarget(null);
                }}
                className="text-crm-text-muted hover:text-white p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateDealSubmit} className="space-y-4">
              {/* Target Contact Selector */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono text-crm-text-muted uppercase tracking-wider block">
                  Assign To Contact *
                </label>
                {clientContacts.length > 0 ? (
                  <select
                    value={dealContactTarget?.id || ""}
                    onChange={(e) => {
                      const found = clientContacts.find((c) => c.id === e.target.value);
                      if (found) {
                        setDealContactTarget(found);
                        if (!createDealForm.title || createDealForm.title.includes(" - ")) {
                          setCreateDealForm((prev) => ({
                            ...prev,
                            title: `${found.name} - Expansion Deal`,
                          }));
                        }
                      }
                    }}
                    required
                    className="w-full bg-crm-inner border border-crm-border-strong rounded-xl px-3 py-2 text-xs font-mono text-crm-text focus:outline-none focus:border-emerald-500/60"
                  >
                    {dealContactTarget && !clientContacts.some((c) => c.id === dealContactTarget.id) && (
                      <option value={dealContactTarget.id}>
                        {dealContactTarget.name} {dealContactTarget.companyName ? `(${dealContactTarget.companyName})` : ""}
                      </option>
                    )}
                    {clientContacts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.companyName ? `(${c.companyName})` : ""} {c.email ? `<${c.email}>` : ""}
                      </option>
                    ))}
                  </select>
                ) : dealContactTarget ? (
                  <div className="p-2.5 rounded-xl bg-crm-inner border border-crm-border-strong text-xs font-mono text-crm-text">
                    <span className="font-bold">{dealContactTarget.name}</span>
                    {dealContactTarget.companyName && (
                      <span className="text-crm-text-muted ml-2">({dealContactTarget.companyName})</span>
                    )}
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono">
                    No contacts found for {activeClientAccount.name}. Please ensure contacts matching this client exist before creating a deal.
                  </div>
                )}
              </div>

              {/* Deal Title */}
              <div className="space-y-1">
                <label className="text-[11px] font-mono text-crm-text-muted block">
                  Deal Title *
                </label>
                <input
                  type="text"
                  required
                  value={createDealForm.title}
                  onChange={(e) => setCreateDealForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder='e.g., "Enterprise Platform Modernization"'
                  className="w-full bg-crm-inner border border-crm-border-strong rounded-xl px-3 py-2 text-xs font-mono text-crm-text focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              {/* Amount and Stage Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Amount */}
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-crm-text-muted block">
                    Amount ($ USD) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={createDealForm.amount}
                    onChange={(e) => setCreateDealForm((prev) => ({ ...prev, amount: e.target.value }))}
                    placeholder="10000.00"
                    className="w-full bg-crm-inner border border-crm-border-strong rounded-xl px-3 py-2 text-xs font-mono text-crm-text focus:outline-none focus:border-emerald-500/50"
                  />
                </div>

                {/* Pipeline Stage / Status */}
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-crm-text-muted block">
                    Pipeline Stage & Status
                  </label>
                  <select
                    value={`${createDealForm.status}::${createDealForm.stage}`}
                    onChange={(e) => {
                      const [status, stage] = e.target.value.split("::");
                      setCreateDealForm((prev) => ({ ...prev, status, stage }));
                    }}
                    className="w-full bg-crm-inner border border-crm-border-strong rounded-xl px-3 py-2 text-xs font-mono text-crm-text focus:outline-none focus:border-emerald-500/50"
                  >
                    <option value="OPEN::Initial Contact">Initial Contact (Open)</option>
                    <option value="OPEN::Needs Analysis">Needs Analysis (Open)</option>
                    <option value="OPEN::Proposal / Quote">Proposal / Quote (Open)</option>
                    <option value="OPEN::Negotiation">Negotiation (Open)</option>
                    <option value="CLOSED_WON::Closed Won">Closed Won (Triggers {providerDisplayName} Handoff)</option>
                    <option value="CLOSED_LOST::Closed Lost">Closed Lost</option>
                  </select>
                </div>
              </div>

              {/* Expected Close Date */}
              <div className="space-y-1">
                <label className="text-[11px] font-mono text-crm-text-muted block">
                  Expected Close Date (Optional)
                </label>
                <input
                  type="date"
                  value={createDealForm.expectedCloseAt}
                  onChange={(e) => setCreateDealForm((prev) => ({ ...prev, expectedCloseAt: e.target.value }))}
                  className="w-full bg-crm-inner border border-crm-border-strong rounded-xl px-3 py-2 text-xs font-mono text-crm-text focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              {/* Deal Notes */}
              <div className="space-y-1">
                <label className="text-[11px] font-mono text-crm-text-muted block">
                  Deal Notes & Requirements
                </label>
                <textarea
                  rows={2}
                  value={createDealForm.notes}
                  onChange={(e) => setCreateDealForm((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="Client requirements, payment terms, or sales context..."
                  className="w-full bg-crm-inner border border-crm-border-strong rounded-xl px-3 py-2 text-xs font-mono text-crm-text focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              {/* If Closed Won: show Handoff Details */}
              {createDealForm.status === "CLOSED_WON" && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold font-mono text-emerald-300">
                      Automatic {providerDisplayName} Handoff Configuration
                    </span>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-crm-text-muted block">
                      Close Outcome
                    </label>
                    <input
                      type="text"
                      required
                      value={createDealForm.closeOutcome}
                      onChange={(e) => setCreateDealForm((prev) => ({ ...prev, closeOutcome: e.target.value }))}
                      placeholder='e.g., "Client accepted enterprise proposal"'
                      className="w-full bg-crm-inner border border-crm-border-strong rounded-xl px-3 py-1.5 text-xs font-mono text-crm-text focus:outline-none focus:border-emerald-500/50"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-crm-text-muted block">
                      What Should The Client Do Next?
                    </label>
                    <input
                      type="text"
                      required
                      value={createDealForm.recommendedNextAction}
                      onChange={(e) => setCreateDealForm((prev) => ({ ...prev, recommendedNextAction: e.target.value }))}
                      placeholder='e.g., "Schedule onboarding kick-off call for Tuesday"'
                      className="w-full bg-crm-inner border border-crm-border-strong rounded-xl px-3 py-1.5 text-xs font-mono text-crm-text focus:outline-none focus:border-emerald-500/50"
                    />
                  </div>
                  <p className="text-[10px] font-mono text-emerald-400/80">
                    • Creates winning Deal in {providerDisplayName} with Stage: Closed Won
                    <br />
                    • Connects Contact & creates attached Handoff Note
                  </p>
                </div>
              )}

              {/* Footer Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-crm-border-strong">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateDealModalOpen(false);
                    setDealContactTarget(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-crm-inner text-xs font-mono text-crm-text-muted hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingNewDeal || !dealContactTarget?.id}
                  className="px-5 py-2 rounded-xl bg-emerald-500 text-slate-950 text-xs font-mono font-bold hover:bg-emerald-400 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-md"
                >
                  {isSubmittingNewDeal ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Creating Deal...</span>
                    </>
                  ) : createDealForm.status === "CLOSED_WON" ? (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Create & Handoff to {providerDisplayName}</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Create Deal</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
