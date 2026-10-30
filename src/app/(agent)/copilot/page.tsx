"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  BrainCircuit,
  CheckCircle2,
  ClipboardPaste,
  Lightbulb,
  Save,
  Sparkles,
  Target,
  Upload,
} from "lucide-react";
import { MultiCrmCard, MultiCrmInnerPanel, MultiCrmTag } from "@/components/ui/MultiCrmCard";
import { useClientAccount } from "@/context/ClientAccountContext";

interface Contact { id: string; firstName: string; lastName: string; company: string | null; }
interface Interaction { id: string; type: string; body: string; subject: string | null; contact: { id: string; firstName: string; lastName: string } | null; occurredAt: string; }
interface Analysis {
  contactId: string | null; id: string; provider: "GEMINI" | "RULES_ENGINE"; transcript: string; summary: string; budget: string | null; timeline: string | null; requirements: string | null; intent: string | null; objections: string | null;
  leadScore: number; temperature: string; dealProbability: number; isManualOverride: boolean; createdAt: string;
  contact: { id: string; firstName: string; lastName: string; company: string | null } | null;
  interaction: { id: string; type: string; occurredAt: string } | null;
}

type EditableAnalysis = Pick<Analysis, "summary" | "budget" | "timeline" | "requirements" | "intent" | "objections" | "leadScore" | "temperature" | "dealProbability">;

const editableFrom = (analysis: Analysis): EditableAnalysis => ({
  summary: analysis.summary, budget: analysis.budget, timeline: analysis.timeline,
  requirements: analysis.requirements, intent: analysis.intent, objections: analysis.objections,
  leadScore: analysis.leadScore, temperature: analysis.temperature, dealProbability: analysis.dealProbability,
});

function WarmthBadge({ temperature }: { temperature: string }) {
  const t = temperature?.toLowerCase();
  if (t === "hot")  return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">🔴 Hot</span>;
  if (t === "warm") return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">🟡 Warm</span>;
  return <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">🔵 Cold</span>;
}

export default function CopilotPage() {
  const { activeClientAccount, isClientAccountReady } = useClientAccount();
  const [contacts,    setContacts]    = useState<Contact[]>([]);
  const [interactions,setInteractions]= useState<Interaction[]>([]);
  const [analyses,    setAnalyses]    = useState<Analysis[]>([]);
  const [contactId,   setContactId]   = useState("");
  const [interactionId, setInteractionId] = useState("");
  const [transcript,  setTranscript]  = useState("");
  const [selectedAnalysis, setSelectedAnalysis] = useState<Analysis | null>(null);
  const [edit,        setEdit]        = useState<EditableAnalysis | null>(null);
  const [isLoading,   setIsLoading]   = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving,    setIsSaving]    = useState(false);
  const [message,     setMessage]     = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const fileInputRef  = useRef<HTMLInputElement>(null);
  const requestVersion          = useRef(0);
  const currentClientAccountId = useRef(activeClientAccount.id);

  useLayoutEffect(() => { currentClientAccountId.current = activeClientAccount.id; }, [activeClientAccount.id]);

  const load = useCallback(async () => {
    if (!isClientAccountReady) return;
    const version = ++requestVersion.current;
    const clientAccountId = activeClientAccount.id;
    setIsLoading(true);
    setContacts([]); setInteractions([]); setAnalyses([]); setContactId(""); setInteractionId(""); setTranscript(""); setSelectedAnalysis(null); setEdit(null); setMessage(null);
    try {
      const [cr, ir, ar] = await Promise.all([
        fetch("/api/ai/contacts", { cache: "no-store" }),
        fetch("/api/interactions", { cache: "no-store" }),
        fetch("/api/lead-analyses", { cache: "no-store" }),
      ]);
      const [cd, id, ad] = await Promise.all([cr.json(), ir.json(), ar.json()]);
      if (version !== requestVersion.current || currentClientAccountId.current !== clientAccountId) return;
      if (!cr.ok || !ir.ok || !ar.ok || !cd.success || !id.success || !ad.success) throw new Error("AI workspace data could not be loaded for this client account.");
      const allowed = new Set((cd.contacts as Contact[]).map(contact => contact.id));
      const visibleAnalyses = (ad.analyses as Analysis[]).filter(item => !item.contactId || allowed.has(item.contactId));
      setContacts(cd.contacts); setInteractions(id.interactions.filter((item: Interaction) => !item.contact?.id || allowed.has(item.contact.id))); setAnalyses(visibleAnalyses);
      const first = visibleAnalyses[0];
      setSelectedAnalysis(first ?? null); setEdit(first ? editableFrom(first) : null);
    } catch (error) {
      if (version === requestVersion.current && currentClientAccountId.current === clientAccountId)
        setMessage({ tone: "error", text: error instanceof Error ? error.message : "AI workspace data could not be loaded." });
    } finally {
      if (version === requestVersion.current && currentClientAccountId.current === clientAccountId) setIsLoading(false);
    }
  }, [activeClientAccount.id, isClientAccountReady]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => { if (!cancelled) void load(); });
    return () => { cancelled = true; };
  }, [load]);

  const selectInteraction = (id: string) => {
    setInteractionId(id);
    const interaction = interactions.find((item) => item.id === id);
    if (interaction) { setTranscript(interaction.body); setContactId(interaction.contact?.id ?? ""); }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result;
      if (typeof content !== "string") return;
      let text = content;
      if (file.name.endsWith(".vtt")) {
        text = content.replace(/^WEBVTT.*$/m, "").replace(/^\d{2}:\d{2}[:\d.]*\s*-->\s*\d{2}:\d{2}[:\d.]*.*$/gm, "").replace(/^\s*\d+\s*$/gm, "").trim();
      }
      if (file.name.endsWith(".json")) {
        try {
          const parsed = JSON.parse(content) as unknown;
          if (typeof parsed === "object" && parsed !== null) {
            const obj = parsed as Record<string, unknown>;
            text = typeof obj.transcript === "string" ? obj.transcript : typeof obj.text === "string" ? obj.text : typeof obj.body === "string" ? obj.body : JSON.stringify(parsed, null, 2);
          }
        } catch { /* keep raw */ }
      }
      setTranscript(text); setInteractionId("");
    };
    reader.readAsText(file);
    event.target.value = "";
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
      setAnalyses((c) => [created, ...c]); setSelectedAnalysis(created); setEdit(editableFrom(created));
      setMessage({ tone: "success", text: "Analysis complete. Review and adjust the extracted fields before saving." });
    } catch (error) {
      if (version === requestVersion.current && currentClientAccountId.current === clientAccountId)
        setMessage({ tone: "error", text: error instanceof Error ? error.message : "The transcript could not be analyzed." });
    } finally {
      if (version === requestVersion.current && currentClientAccountId.current === clientAccountId) setIsAnalyzing(false);
    }
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
      const updated = data.analysis as Analysis;
      setAnalyses((c) => c.map((item) => item.id === updated.id ? updated : item));
      setSelectedAnalysis(updated); setEdit(editableFrom(updated));
      setMessage({ tone: "success", text: "Assessment saved." });
    } catch (error) {
      if (version === requestVersion.current && currentClientAccountId.current === clientAccountId)
        setMessage({ tone: "error", text: error instanceof Error ? error.message : "The analysis could not be saved." });
    } finally {
      if (version === requestVersion.current && currentClientAccountId.current === clientAccountId) setIsSaving(false);
    }
  };

  const inputCls = "w-full border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 bg-white placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600";
  const labelCls = "block text-xs font-medium text-slate-600 mb-1";

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <BrainCircuit className="w-5 h-5 text-blue-600" />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">AI Intelligence</h1>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">Transcript analysis and lead qualification for the active client account.</p>
        </div>
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 self-start">
          {activeClientAccount.name}
        </span>
      </div>

      {/* ── Two-column workspace ── */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">

        {/* LEFT — Transcript Intake */}
        <MultiCrmCard className="xl:col-span-2 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
            <ClipboardPaste className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-semibold text-slate-800">Transcript intake</h2>
          </div>

          <div>
            <label className={labelCls}>Associated contact</label>
            <select value={contactId} onChange={(e) => setContactId(e.target.value)} className={inputCls}>
              <option value="">Account-level analysis</option>
              {contacts.map((c) => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}{c.company ? ` · ${c.company}` : ""}</option>)}
            </select>
          </div>

          <div>
            <label className={labelCls}>Use existing interaction (optional)</label>
            <select value={interactionId} onChange={(e) => selectInteraction(e.target.value)} className={inputCls}>
              <option value="">Paste a transcript manually</option>
              {interactions.map((i) => <option key={i.id} value={i.id}>{i.type} · {i.contact ? `${i.contact.firstName} ${i.contact.lastName}` : "Client activity"} · {new Date(i.occurredAt).toLocaleDateString()}</option>)}
            </select>
          </div>

          {/* File upload */}
          <div className="flex items-center gap-2">
            <input ref={fileInputRef} type="file" accept=".txt,.vtt,.json" className="hidden" onChange={handleFileUpload} />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-300 bg-white rounded-md hover:bg-slate-50 hover:border-slate-400 transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              Upload transcript
            </button>
            <span className="text-xs text-slate-400">.txt · .vtt · .json</span>
          </div>

          <div>
            <label className={labelCls}>Transcript</label>
            <textarea
              value={transcript}
              onChange={(e) => { setTranscript(e.target.value); setInteractionId(""); }}
              rows={10}
              placeholder="Paste a call transcript, customer conversation, or qualified interaction summary…"
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-900 bg-white placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 resize-y"
            />
          </div>

          <button
            onClick={() => void analyze()}
            disabled={isAnalyzing || !transcript.trim()}
            className="w-full py-2.5 rounded-md bg-blue-600 hover:bg-blue-700 disabled:opacity-50 font-semibold text-sm text-white flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm"
          >
            <Sparkles className={`w-4 h-4 ${isAnalyzing ? "animate-spin" : ""}`} />
            {isAnalyzing ? "Analyzing…" : "Run lead analysis"}
          </button>
          <p className="text-xs text-slate-500">Uses Gemini when configured and available; otherwise uses rule-based analysis. All fields remain editable.</p>
        </MultiCrmCard>

        {/* RIGHT — Qualification Assessment */}
        <MultiCrmCard className="xl:col-span-3 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-semibold text-slate-800">Qualification assessment</h2>
            </div>
            {selectedAnalysis && (
              <MultiCrmTag variant={selectedAnalysis.isManualOverride ? "magenta" : "cyan"}>
                {selectedAnalysis.isManualOverride ? "MANUALLY CORRECTED" : selectedAnalysis.provider === "GEMINI" ? "GEMINI AI" : "RULE-BASED"}
              </MultiCrmTag>
            )}
          </div>

          {/* Loading state */}
          {isAnalyzing && (
            <div className="flex flex-col items-center justify-center min-h-64 gap-3 text-slate-500">
              <Sparkles className="w-7 h-7 text-blue-500 animate-spin" />
              <p className="text-sm font-semibold text-slate-700">Analyzing the transcript…</p>
              <p className="text-xs text-slate-500">Extracting budget, timeline, and qualification signals.</p>
            </div>
          )}

          {/* Assessment form */}
          {!isAnalyzing && selectedAnalysis && edit && (
            <div className="space-y-4">

              {/* Score / Temperature / Probability row */}
              <div className="grid grid-cols-3 gap-3">
                <MultiCrmInnerPanel className="!p-3 text-center">
                  <p className="text-xs text-slate-500 mb-1">Lead score</p>
                  <input
                    type="number" min="0" max="100" value={edit.leadScore}
                    onChange={(e) => setEdit({ ...edit, leadScore: Number(e.target.value) })}
                    className="w-full text-center text-xl font-bold text-blue-600 bg-transparent focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-400">/ 100</p>
                </MultiCrmInnerPanel>

                <MultiCrmInnerPanel className="!p-3 text-center">
                  <p className="text-xs text-slate-500 mb-2">Warmth</p>
                  <WarmthBadge temperature={edit.temperature} />
                  <input
                    value={edit.temperature}
                    onChange={(e) => setEdit({ ...edit, temperature: e.target.value })}
                    placeholder="Hot / Warm / Cold"
                    className="mt-1.5 w-full text-center text-xs text-slate-600 bg-transparent focus:outline-none border-none"
                  />
                </MultiCrmInnerPanel>

                <MultiCrmInnerPanel className="!p-3 text-center">
                  <p className="text-xs text-slate-500 mb-1">Deal probability</p>
                  <div className="flex items-end justify-center gap-0.5">
                    <input
                      type="number" min="0" max="100" value={edit.dealProbability}
                      onChange={(e) => setEdit({ ...edit, dealProbability: Number(e.target.value) })}
                      className="w-14 text-center text-xl font-bold text-emerald-600 bg-transparent focus:outline-none"
                    />
                    <span className="text-emerald-600 font-bold text-sm mb-0.5">%</span>
                  </div>
                  {/* Progress bar */}
                  <div className="mt-2 w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                    <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${Math.min(100, Math.max(0, edit.dealProbability))}%` }} />
                  </div>
                </MultiCrmInnerPanel>
              </div>

              {/* Editable assessment fields */}
              <div className="space-y-3">
                {([
                  { key: "summary",      label: "Assessment summary" },
                  { key: "budget",       label: "Budget" },
                  { key: "timeline",     label: "Timeline / Urgency" },
                  { key: "requirements", label: "Key pain points & requirements" },
                  { key: "intent",       label: "Intent signals" },
                  { key: "objections",   label: "Objections / blockers" },
                ] as const).map(({ key, label }) => (
                  <div key={key}>
                    <label className={labelCls}>{label}</label>
                    <input
                      value={(edit[key] as string | null) ?? ""}
                      onChange={(e) => setEdit({ ...edit, [key]: e.target.value })}
                      className={inputCls}
                    />
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                <span className="text-xs text-slate-400">
                  {selectedAnalysis.contact
                    ? `${selectedAnalysis.contact.firstName} ${selectedAnalysis.contact.lastName}`
                    : "Account-level"} · {new Date(selectedAnalysis.createdAt).toLocaleString()}
                </span>
                <button
                  onClick={() => void saveCorrection()}
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-50 transition-colors cursor-pointer shadow-sm"
                >
                  <Save className="w-3.5 h-3.5" />
                  {isSaving ? "Saving…" : "Save assessment"}
                </button>
              </div>
            </div>
          )}

          {/* Empty state */}
          {!isAnalyzing && !selectedAnalysis && (
            <div className="h-full min-h-80 flex flex-col items-center justify-center text-center text-slate-500">
              <Lightbulb className="w-8 h-8 text-blue-400 mb-3" />
              <p className="text-sm font-semibold text-slate-700">No analysis selected</p>
              <p className="text-xs mt-1 text-slate-400">Paste a transcript or choose an interaction to create an editable assessment.</p>
            </div>
          )}
        </MultiCrmCard>
      </div>

      {/* Status message */}
      {message && (
        <p role="status" className={`rounded-md border px-4 py-3 text-sm font-medium ${
          message.tone === "success"
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border-red-200 bg-red-50 text-red-700"
        }`}>
          {message.text}
        </p>
      )}

      {/* ── Saved Analyses ── */}
      <MultiCrmCard className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-semibold text-slate-800">Saved analyses</h2>
          </div>
          <span className="text-xs text-slate-400">
            {isLoading ? "Loading…" : `${analyses.length} records`}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {analyses.map((analysis) => (
            <button
              key={analysis.id}
              onClick={() => selectAnalysis(analysis)}
              className={`text-left p-4 rounded-md border transition-colors cursor-pointer ${
                selectedAnalysis?.id === analysis.id
                  ? "border-blue-400 bg-blue-50"
                  : "border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50"
              }`}
            >
              <div className="flex justify-between gap-2 items-start">
                <span className="text-sm font-semibold text-slate-800">
                  {analysis.contact ? `${analysis.contact.firstName} ${analysis.contact.lastName}` : "Client account"}
                </span>
                <span className="text-blue-600 font-semibold text-sm shrink-0">{analysis.leadScore}/100</span>
              </div>
              <p className="mt-1.5 text-xs text-slate-500 line-clamp-2">{analysis.summary}</p>
              <div className="mt-2 flex items-center gap-2">
                <WarmthBadge temperature={analysis.temperature} />
                <span className="text-xs text-slate-400">{analysis.dealProbability}% probability</span>
              </div>
            </button>
          ))}
        </div>

        {!isLoading && !analyses.length && (
          <p className="py-6 text-center text-sm text-slate-400">
            No analyses have been created for this client account.
          </p>
        )}
      </MultiCrmCard>
    </div>
  );
}
