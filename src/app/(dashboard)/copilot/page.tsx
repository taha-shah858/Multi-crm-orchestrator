"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BrainCircuit, CheckCircle2, ClipboardPaste, DollarSign, Lightbulb, Save, Sparkles, Target, UserRound } from "lucide-react";
import { MultiCrmCard, MultiCrmInnerPanel, MultiCrmTag } from "@/components/ui/MultiCrmCard";
import { useClientAccount } from "@/context/ClientAccountContext";

interface Contact { id: string; firstName: string; lastName: string; company: string | null; }
interface Interaction { id: string; type: string; body: string; subject: string | null; contact: { id: string; firstName: string; lastName: string } | null; occurredAt: string; }
interface Analysis {
  id: string; transcript: string; summary: string; budget: string | null; timeline: string | null; requirements: string | null; intent: string | null; objections: string | null;
  leadScore: number; temperature: string; dealProbability: number; isManualOverride: boolean; createdAt: string;
  contact: { id: string; firstName: string; lastName: string; company: string | null } | null;
  interaction: { id: string; type: string; occurredAt: string } | null;
}

type EditableAnalysis = Pick<Analysis, "summary" | "budget" | "timeline" | "requirements" | "intent" | "objections" | "leadScore" | "temperature" | "dealProbability">;

const editableFrom = (analysis: Analysis): EditableAnalysis => ({
  summary: analysis.summary, budget: analysis.budget, timeline: analysis.timeline, requirements: analysis.requirements, intent: analysis.intent, objections: analysis.objections,
  leadScore: analysis.leadScore, temperature: analysis.temperature, dealProbability: analysis.dealProbability,
});

export default function CopilotPage() {
  const { activeClientAccount, isClientAccountReady } = useClientAccount();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [contactId, setContactId] = useState("");
  const [interactionId, setInteractionId] = useState("");
  const [transcript, setTranscript] = useState("");
  const [selectedAnalysis, setSelectedAnalysis] = useState<Analysis | null>(null);
  const [edit, setEdit] = useState<EditableAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const requestVersion = useRef(0);
  const currentClientAccountId = useRef(activeClientAccount.id);

  useEffect(() => {
    currentClientAccountId.current = activeClientAccount.id;
  }, [activeClientAccount.id]);

  const load = useCallback(async () => {
    if (!isClientAccountReady) return;
    const version = ++requestVersion.current;
    const clientAccountId = activeClientAccount.id;
    setIsLoading(true);
    setContacts([]); setInteractions([]); setAnalyses([]); setContactId(""); setInteractionId(""); setTranscript(""); setSelectedAnalysis(null); setEdit(null); setMessage(null);
    try {
      const [contactsResponse, interactionsResponse, analysesResponse] = await Promise.all([
        fetch("/api/contacts", { cache: "no-store" }), fetch("/api/interactions", { cache: "no-store" }), fetch("/api/lead-analyses", { cache: "no-store" }),
      ]);
      const [contactsData, interactionsData, analysesData] = await Promise.all([contactsResponse.json(), interactionsResponse.json(), analysesResponse.json()]);
      if (version !== requestVersion.current || currentClientAccountId.current !== clientAccountId) return;
      if (!contactsResponse.ok || !interactionsResponse.ok || !analysesResponse.ok || !contactsData.success || !interactionsData.success || !analysesData.success) throw new Error("AI workspace data could not be loaded for this client account.");
      setContacts(contactsData.contacts); setInteractions(interactionsData.interactions); setAnalyses(analysesData.analyses);
      const firstAnalysis = analysesData.analyses[0] as Analysis | undefined;
      setSelectedAnalysis(firstAnalysis ?? null); setEdit(firstAnalysis ? editableFrom(firstAnalysis) : null);
    } catch (error) { if (version === requestVersion.current && currentClientAccountId.current === clientAccountId) setMessage({ tone: "error", text: error instanceof Error ? error.message : "AI workspace data could not be loaded." }); }
    finally { if (version === requestVersion.current && currentClientAccountId.current === clientAccountId) setIsLoading(false); }
  }, [activeClientAccount.id, isClientAccountReady]);

  useEffect(() => { void load(); }, [load]);

  const selectInteraction = (id: string) => {
    setInteractionId(id);
    const interaction = interactions.find((item) => item.id === id);
    if (interaction) { setTranscript(interaction.body); setContactId(interaction.contact?.id ?? ""); }
  };

  const analyze = async () => {
    if (!transcript.trim()) return;
    const version = requestVersion.current;
    const clientAccountId = activeClientAccount.id;
    setIsAnalyzing(true); setMessage(null);
    try {
      const response = await fetch("/api/lead-analyses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ transcript, contactId: contactId || undefined, interactionId: interactionId || undefined }) });
      const data = await response.json();
      if (version !== requestVersion.current || currentClientAccountId.current !== clientAccountId) return;
      if (!response.ok || !data.success) throw new Error(data?.error?.message ?? "The transcript could not be analyzed.");
      const created = data.analysis as Analysis;
      setAnalyses((current) => [created, ...current]); setSelectedAnalysis(created); setEdit(editableFrom(created)); setMessage({ tone: "success", text: "Analysis created. Review and correct the generated fields before using them." });
    } catch (error) { if (version === requestVersion.current && currentClientAccountId.current === clientAccountId) setMessage({ tone: "error", text: error instanceof Error ? error.message : "The transcript could not be analyzed." }); }
    finally { if (version === requestVersion.current && currentClientAccountId.current === clientAccountId) setIsAnalyzing(false); }
  };

  const selectAnalysis = (analysis: Analysis) => { setSelectedAnalysis(analysis); setEdit(editableFrom(analysis)); };
  const saveCorrection = async () => {
    if (!selectedAnalysis || !edit) return;
    const version = requestVersion.current;
    const clientAccountId = activeClientAccount.id;
    setIsSaving(true); setMessage(null);
    try {
      const response = await fetch(`/api/lead-analyses/${selectedAnalysis.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(edit) });
      const data = await response.json();
      if (version !== requestVersion.current || currentClientAccountId.current !== clientAccountId) return;
      if (!response.ok || !data.success) throw new Error(data?.error?.message ?? "The analysis could not be saved.");
      const updated = data.analysis as Analysis; setAnalyses((current) => current.map((item) => item.id === updated.id ? updated : item)); setSelectedAnalysis(updated); setEdit(editableFrom(updated)); setMessage({ tone: "success", text: "Manual correction saved and audited." });
    } catch (error) { if (version === requestVersion.current && currentClientAccountId.current === clientAccountId) setMessage({ tone: "error", text: error instanceof Error ? error.message : "The analysis could not be saved." }); }
    finally { if (version === requestVersion.current && currentClientAccountId.current === clientAccountId) setIsSaving(false); }
  };

  return <div className="space-y-6 text-crm-text font-sans">
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"><div><div className="flex items-center gap-2"><BrainCircuit className="w-5 h-5 text-tertiary-purple" /><h1 className="text-2xl font-bold tracking-tight">AI Intelligence</h1></div><p className="text-xs text-crm-text-muted font-mono mt-1">Transcript analysis and editable lead qualification for the active client account.</p></div><MultiCrmTag variant="purple">{activeClientAccount.name}</MultiCrmTag></div>
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
      <MultiCrmCard className="xl:col-span-2 space-y-4"><div className="flex items-center gap-2 border-b border-crm-border-strong pb-3"><ClipboardPaste className="w-4 h-4 text-primary-cyan" /><h2 className="text-sm font-semibold">Transcript intake</h2></div>
        <div className="space-y-1.5 font-mono text-xs"><label className="text-[10px] text-crm-text-muted">Associated contact</label><select value={contactId} onChange={(event) => setContactId(event.target.value)} className="w-full bg-crm-inner border border-crm-border-strong rounded-xl p-2 text-crm-text focus:outline-none focus:border-primary-cyan"><option value="">Account-level analysis</option>{contacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.firstName} {contact.lastName}{contact.company ? ` · ${contact.company}` : ""}</option>)}</select></div>
        <div className="space-y-1.5 font-mono text-xs"><label className="text-[10px] text-crm-text-muted">Use existing interaction (optional)</label><select value={interactionId} onChange={(event) => selectInteraction(event.target.value)} className="w-full bg-crm-inner border border-crm-border-strong rounded-xl p-2 text-crm-text focus:outline-none focus:border-primary-cyan"><option value="">Paste a transcript manually</option>{interactions.map((interaction) => <option key={interaction.id} value={interaction.id}>{interaction.type} · {interaction.contact ? `${interaction.contact.firstName} ${interaction.contact.lastName}` : "Client activity"} · {new Date(interaction.occurredAt).toLocaleDateString()}</option>)}</select></div>
        <textarea value={transcript} onChange={(event) => { setTranscript(event.target.value); setInteractionId(""); }} rows={10} placeholder="Paste a call transcript, customer conversation, or qualified interaction summary…" className="w-full bg-crm-inner border border-crm-border-strong rounded-xl p-3 text-xs text-crm-text placeholder-slate-500 focus:outline-none focus:border-primary-cyan" />
        <button onClick={() => void analyze()} disabled={isAnalyzing || !transcript.trim()} className="w-full py-3 rounded-xl bg-tertiary-purple/20 border border-tertiary-purple/40 text-tertiary-purple hover:bg-tertiary-purple/30 disabled:opacity-50 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"><Sparkles className={`w-4 h-4 ${isAnalyzing ? "animate-spin" : ""}`} />{isAnalyzing ? "Analyzing…" : "Run lead analysis"}</button>
        <p className="text-[10px] font-mono text-crm-text-muted">Automated baseline is explainable; every field below remains agent-editable.</p></MultiCrmCard>
      <MultiCrmCard className="xl:col-span-3 space-y-5"><div className="flex items-center justify-between border-b border-crm-border-strong pb-3"><div className="flex items-center gap-2"><Target className="w-4 h-4 text-primary-cyan" /><h2 className="text-sm font-semibold">Qualification assessment</h2></div>{selectedAnalysis && <MultiCrmTag variant={selectedAnalysis.isManualOverride ? "magenta" : "cyan"}>{selectedAnalysis.isManualOverride ? "MANUALLY CORRECTED" : "AUTOMATED BASELINE"}</MultiCrmTag>}</div>
        {selectedAnalysis && edit ? <div className="space-y-4"><div className="grid grid-cols-1 md:grid-cols-3 gap-3"><MultiCrmInnerPanel className="p-4"><span className="text-[10px] font-mono text-crm-text-muted block">Lead score</span><input type="number" min="0" max="100" value={edit.leadScore} onChange={(event) => setEdit({ ...edit, leadScore: Number(event.target.value) })} className="mt-1 w-full bg-transparent text-xl font-bold text-primary-cyan focus:outline-none" /></MultiCrmInnerPanel><MultiCrmInnerPanel className="p-4"><span className="text-[10px] font-mono text-crm-text-muted block">Temperature</span><input value={edit.temperature} onChange={(event) => setEdit({ ...edit, temperature: event.target.value })} className="mt-1 w-full bg-transparent text-xl font-bold focus:outline-none" /></MultiCrmInnerPanel><MultiCrmInnerPanel className="p-4"><span className="text-[10px] font-mono text-crm-text-muted block">Deal probability</span><input type="number" min="0" max="100" value={edit.dealProbability} onChange={(event) => setEdit({ ...edit, dealProbability: Number(event.target.value) })} className="mt-1 w-full bg-transparent text-xl font-bold text-emerald-400 focus:outline-none" /></MultiCrmInnerPanel></div>
          {[{ key: "summary", label: "Assessment summary" }, { key: "budget", label: "Budget" }, { key: "timeline", label: "Timeline" }, { key: "requirements", label: "Requirements" }, { key: "intent", label: "Intent signals" }, { key: "objections", label: "Objections" }].map(({ key, label }) => <div key={key} className="space-y-1 font-mono text-xs"><label className="text-[10px] text-crm-text-muted">{label}</label><input value={(edit[key as keyof EditableAnalysis] as string | null) ?? ""} onChange={(event) => setEdit({ ...edit, [key]: event.target.value })} className="w-full bg-crm-inner border border-crm-border-strong rounded-xl p-2 text-crm-text focus:outline-none focus:border-primary-cyan" /></div>)}
          <div className="flex items-center justify-between pt-3 border-t border-crm-border-strong"><span className="text-[10px] font-mono text-crm-text-muted">{selectedAnalysis.contact ? `${selectedAnalysis.contact.firstName} ${selectedAnalysis.contact.lastName}` : "Account-level"} · {new Date(selectedAnalysis.createdAt).toLocaleString()}</span><button onClick={() => void saveCorrection()} disabled={isSaving} className="px-4 py-2 rounded-xl bg-primary-cyan text-slate-950 text-xs font-bold disabled:opacity-50 flex items-center gap-2 cursor-pointer"><Save className="w-3.5 h-3.5" />{isSaving ? "Saving…" : "Save correction"}</button></div>
        </div> : <div className="h-full min-h-80 flex flex-col items-center justify-center text-center text-crm-text-muted"><Lightbulb className="w-8 h-8 text-tertiary-purple mb-3" /><p className="text-sm font-semibold text-crm-text">No analysis selected</p><p className="text-xs mt-1">Paste a transcript or choose an interaction to create an editable assessment.</p></div>}
      </MultiCrmCard>
    </div>
    {message && <p role="status" className={`rounded-xl border px-4 py-3 text-xs font-mono ${message.tone === "success" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-rose-500/30 bg-rose-500/10 text-rose-300"}`}>{message.text}</p>}
    <MultiCrmCard className="space-y-4"><div className="flex items-center justify-between border-b border-crm-border-strong pb-3"><div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary-cyan" /><h2 className="text-sm font-semibold">Saved analyses</h2></div><span className="text-[10px] font-mono text-crm-text-muted">{isLoading ? "Loading…" : `${analyses.length} records`}</span></div><div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">{analyses.map((analysis) => <button key={analysis.id} onClick={() => selectAnalysis(analysis)} className={`text-left p-4 rounded-xl border transition-colors cursor-pointer ${selectedAnalysis?.id === analysis.id ? "border-primary-cyan/50 bg-primary-cyan/10" : "border-crm-border-strong bg-crm-inner hover:border-primary-cyan/30"}`}><div className="flex justify-between gap-2"><span className="text-xs font-bold">{analysis.contact ? `${analysis.contact.firstName} ${analysis.contact.lastName}` : "Client account"}</span><span className="text-primary-cyan font-mono text-xs">{analysis.leadScore}/100</span></div><p className="mt-2 text-[11px] text-crm-text-muted line-clamp-2">{analysis.summary}</p><p className="mt-2 text-[10px] font-mono text-slate-500">{analysis.temperature} · {analysis.dealProbability}% probability</p></button>)}</div>{!isLoading && !analyses.length && <p className="py-5 text-center text-xs text-crm-text-muted">No analyses have been created for this client account.</p>}</MultiCrmCard>
  </div>;
}
