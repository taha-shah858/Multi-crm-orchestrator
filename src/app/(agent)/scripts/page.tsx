"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { FilePenLine, FileText, Plus, Save, Sparkles, UserRound } from "lucide-react";
import { MultiCrmCard, MultiCrmTag } from "@/components/ui/MultiCrmCard";
import { useClientAccount } from "@/context/ClientAccountContext";
import { readApiJson } from "@/lib/http/client-api";
import { generationLabel, generationMessage } from "@/lib/ai/content-provenance";

type Channel = "CALL" | "SMS" | "EMAIL";
interface Contact { id: string; firstName: string; lastName: string; company: string | null; }
interface Analysis { contactId: string | null; id: string; leadScore: number; temperature: string; contact: { firstName: string; lastName: string } | null; }
interface Template { key: string; name: string; channel: Channel; purpose: string; }
interface Script { id: string; title: string; purpose: string; content: string; channel: Channel; source: "GENERATED" | "MANUAL" | "TEMPLATE"; contextSnapshot?: unknown; isManualOverride: boolean; contact: { firstName: string; lastName: string; company: string | null } | null; }

export default function ScriptsPage() {
  const { activeClientAccount, isClientAccountReady } = useClientAccount();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [scripts, setScripts] = useState<Script[]>([]);
  const [contactId, setContactId] = useState("");
  const [leadAnalysisId, setLeadAnalysisId] = useState("");
  const [templateKey, setTemplateKey] = useState("FOLLOW_UP");
  const [channel, setChannel] = useState<Channel>("EMAIL");
  const [purpose, setPurpose] = useState("Follow up after a discovery conversation");
  const [brief, setBrief] = useState("");
  const [selected, setSelected] = useState<Script | null>(null);
  const [draft, setDraft] = useState({ title: "", purpose: "", content: "", channel: "EMAIL" as Channel });
  const [isLoading, setIsLoading] = useState(false);
  const [isWorking, setIsWorking] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const clientRequestVersion = useRef(0);
  const currentClientAccountId = useRef(activeClientAccount.id);
  useLayoutEffect(() => { currentClientAccountId.current = activeClientAccount.id; }, [activeClientAccount.id]);

  useEffect(() => {
    if (!isClientAccountReady) return;
    const controller = new AbortController();
    const requestVersion = ++clientRequestVersion.current;
    const clientAccountId = activeClientAccount.id;

    queueMicrotask(() => {
    if (controller.signal.aborted) return;
    setIsLoading(true);
    setMessage(null);
    setContacts([]);
    setAnalyses([]);
    setTemplates([]);
    setScripts([]);
    setSelected(null);
    setContactId("");
    setBrief("");
    setLeadAnalysisId("");
    setDraft({ title: "", purpose: "", content: "", channel: "EMAIL" });
    });

    const load = async () => {
      try {
        const [contactsResponse, analysesResponse, scriptsResponse, templatesResponse] = await Promise.all([
          fetch("/api/ai/contacts", { cache: "no-store", signal: controller.signal }),
          fetch("/api/lead-analyses", { cache: "no-store", signal: controller.signal }),
          fetch("/api/scripts", { cache: "no-store", signal: controller.signal }),
          fetch("/api/scripts/templates", { cache: "no-store", signal: controller.signal }),
        ]);
        const [contactsPayload, analysesPayload, scriptsPayload, templatesPayload] = await Promise.all([
          readApiJson<{ success: true; contacts: Contact[] }>(contactsResponse),
          readApiJson<{ success: true; analyses: Analysis[] }>(analysesResponse),
          readApiJson<{ success: true; scripts: Script[] }>(scriptsResponse),
          readApiJson<{ success: true; templates: Template[] }>(templatesResponse),
        ]);
        if (controller.signal.aborted || requestVersion !== clientRequestVersion.current || currentClientAccountId.current !== clientAccountId) return;
        setContacts(contactsPayload.contacts);
        setAnalyses(analysesPayload.analyses.filter(item => !item.contactId || contactsPayload.contacts.some(contact => contact.id === item.contactId)));
        setScripts(scriptsPayload.scripts);
        setTemplates(templatesPayload.templates);
      } catch (error) {
        if (controller.signal.aborted || requestVersion !== clientRequestVersion.current || currentClientAccountId.current !== clientAccountId) return;
        setMessage({ tone: "error", text: error instanceof Error ? error.message : "Script workspace data could not be loaded." });
      } finally {
        if (!controller.signal.aborted && requestVersion === clientRequestVersion.current && currentClientAccountId.current === clientAccountId) {
          setIsLoading(false);
        }
      }
    };

    void load();
    return () => controller.abort();
  }, [activeClientAccount.id, isClientAccountReady]);

  const applyTemplate = (key: string) => {
    const template = templates.find((item) => item.key === key);
    setTemplateKey(key);
    if (template) {
      setChannel(template.channel);
      setPurpose(template.purpose);
    }
  };

  const chooseScript = (script: Script) => {
    setSelected(script);
    setDraft({ title: script.title, purpose: script.purpose, content: script.content, channel: script.channel });
  };

  const generate = async () => {
    const requestVersion = clientRequestVersion.current;
    const clientAccountId = activeClientAccount.id;
    setIsWorking(true);
    setMessage(null);
    try {
      const response = await fetch("/api/scripts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId: contactId || undefined, leadAnalysisId: leadAnalysisId || undefined, templateKey, channel, purpose, brief }),
      });
      const data = await readApiJson<{ success: true; script: Script }>(response);
      if (requestVersion !== clientRequestVersion.current || currentClientAccountId.current !== clientAccountId) return;
      const script = data.script;
      setScripts((current) => [script, ...current]);
      chooseScript(script);
      setMessage({ tone: "success", text: generationMessage(script) });
    } catch (error) {
      if (requestVersion !== clientRequestVersion.current || currentClientAccountId.current !== clientAccountId) return;
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "The script could not be generated." });
    } finally {
      if (requestVersion === clientRequestVersion.current && currentClientAccountId.current === clientAccountId) {
        setIsWorking(false);
      }
    }
  };

  const save = async (manual = false) => {
    if (!draft.title.trim() || !draft.purpose.trim() || !draft.content.trim()) {
      setMessage({ tone: "error", text: "Enter a title, purpose, and content before saving." });
      return;
    }
    const requestVersion = clientRequestVersion.current;
    const clientAccountId = activeClientAccount.id;
    setIsWorking(true);
    setMessage(null);
    try {
      const endpoint = selected && !manual ? `/api/scripts/${selected.id}` : "/api/scripts";
      const method = selected && !manual ? "PATCH" : "POST";
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...draft, contactId: contactId || undefined, leadAnalysisId: leadAnalysisId || undefined }),
      });
      const data = await readApiJson<{ success: true; script: Script }>(response);
      if (requestVersion !== clientRequestVersion.current || currentClientAccountId.current !== clientAccountId) return;
      const script = data.script;
      setScripts((current) => current.some((item) => item.id === script.id) ? current.map((item) => item.id === script.id ? script : item) : [script, ...current]);
      chooseScript(script);
      setMessage({ tone: "success", text: manual ? "Manual script saved." : "Script correction saved and audited." });
    } catch (error) {
      if (requestVersion !== clientRequestVersion.current || currentClientAccountId.current !== clientAccountId) return;
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "The script could not be saved." });
    } finally {
      if (requestVersion === clientRequestVersion.current && currentClientAccountId.current === clientAccountId) {
        setIsWorking(false);
      }
    }
  };

  const inputCls = "w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600";
  const labelCls = "block text-xs font-semibold uppercase tracking-wider text-slate-700";

  return (
    <div className="space-y-6 text-slate-900 font-sans">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FilePenLine className="w-5 h-5 text-blue-600" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Sales Script Architect</h1>
          </div>
          <p className="text-sm font-normal text-slate-600 mt-1">Context-aware, editable sales communication for the active client account.</p>
        </div>
        <MultiCrmTag variant="magenta">{activeClientAccount.name}</MultiCrmTag>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <MultiCrmCard className="xl:col-span-2 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <h2 className="text-base font-semibold text-slate-900">Generate with context</h2>
          </div>

          <div className="space-y-1.5">
            <label className={labelCls}>Reusable template</label>
            <select value={templateKey} onChange={(event) => applyTemplate(event.target.value)} className={inputCls}>
              <option value="">Custom generation</option>
              {templates.map((template) => <option key={template.key} value={template.key}>{template.name}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className={labelCls}>Channel</label>
            <select value={channel} onChange={(event) => setChannel(event.target.value as Channel)} className={inputCls}>
              <option value="CALL">Call script</option>
              <option value="SMS">SMS follow-up</option>
              <option value="EMAIL">Email follow-up</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className={labelCls}>Contact context</label>
            <select value={contactId} onChange={(event) => setContactId(event.target.value)} className={inputCls}>
              <option value="">Account-level script</option>
              {contacts.map((contact) => (
                <option key={contact.id} value={contact.id}>
                  {contact.firstName} {contact.lastName}{contact.company ? ` · ${contact.company}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className={labelCls}>Lead-analysis context</label>
            <select value={leadAnalysisId} onChange={(event) => setLeadAnalysisId(event.target.value)} className={inputCls}>
              <option value="">No analysis selected</option>
              {analyses.map((analysis) => (
                <option key={analysis.id} value={analysis.id}>
                  {analysis.contact ? `${analysis.contact.firstName} ${analysis.contact.lastName}` : "Account"} · {analysis.temperature} · {analysis.leadScore}/100
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className={labelCls}>Purpose</label>
            <input value={purpose} onChange={(event) => setPurpose(event.target.value)} className={inputCls} placeholder="e.g. Discovery follow-up" />
          </div>

          <label className="block space-y-1.5">
            <span className={labelCls}>Writing brief (optional)</span>
            <textarea value={brief} maxLength={4000} rows={4} onChange={event => setBrief(event.target.value)} className={inputCls} placeholder="Describe the service, desired tone, relevant facts and next step. Leave unknown facts for confirmation." />
          </label>
          <button
            onClick={() => void generate()}
            disabled={isWorking}
            className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isWorking ? "Generating…" : "Generate and save script"}
          </button>
          <p className="text-xs text-slate-500">Brand, contact, latest interactions, and optional lead analysis are retrieved server-side.</p>
        </MultiCrmCard>

        <MultiCrmCard className="xl:col-span-3 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <h2 className="text-base font-semibold text-slate-900">Full manual editor</h2>
            </div>
            {selected && <MultiCrmTag variant={selected.isManualOverride ? "magenta" : "cyan"}>{selected.isManualOverride ? "EDITED" : generationLabel(selected)}</MultiCrmTag>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Title</label>
              <input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="e.g. Discovery follow-up" className={`mt-1 ${inputCls}`} />
            </div>
            <div>
              <label className={labelCls}>Purpose</label>
              <input value={draft.purpose} onChange={(event) => setDraft({ ...draft, purpose: event.target.value })} placeholder="What should this achieve?" className={`mt-1 ${inputCls}`} />
            </div>
          </div>

          <div className="space-y-1">
            <label className={labelCls}>Script content</label>
            <textarea
              rows={14}
              value={draft.content}
              onChange={(event) => setDraft({ ...draft, content: event.target.value })}
              placeholder="Write a script manually or generate one from the context panel…"
              className="w-full bg-white border border-slate-300 rounded-lg p-3 text-sm leading-relaxed text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-2xs"
            />
          </div>

          <div className="flex flex-wrap justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              onClick={() => { setSelected(null); setDraft({ title: "", purpose: "", content: "", channel }); }}
              className="px-4 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-medium text-sm shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="inline w-3.5 h-3.5 mr-1" />New manual
            </button>
            <button
              onClick={() => void save(!selected)}
              disabled={isWorking}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Save className="inline w-3.5 h-3.5 mr-1" />{isWorking ? "Saving…" : "Save script"}
            </button>
          </div>
        </MultiCrmCard>
      </div>

      {message && (
        <div role="status" className={`rounded-lg border px-4 py-3 text-sm ${message.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"}`}>
          {message.text}
        </div>
      )}

      <MultiCrmCard className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <UserRound className="w-4 h-4 text-blue-600" />
            <h2 className="text-base font-semibold text-slate-900">Saved scripts</h2>
          </div>
          <span className="text-xs text-slate-500">{isLoading ? "Loading…" : `${scripts.length} records`}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {scripts.map((script) => (
            <button
              key={script.id}
              onClick={() => chooseScript(script)}
              className={`text-left p-4 rounded-xl border transition-all cursor-pointer ${
                selected?.id === script.id ? "border-blue-500 bg-blue-50/50 shadow-xs ring-1 ring-blue-500" : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs"
              }`}
            >
              <div className="flex justify-between gap-2">
                <span className="text-sm font-semibold text-slate-900 truncate">{script.title}</span>
                <span className="text-xs font-semibold text-blue-600 uppercase">{script.channel}</span>
              </div>
              <p className="mt-2 text-xs text-slate-600 line-clamp-2">{script.content}</p>
              <p className="mt-2 text-xs text-slate-400">
                {script.contact ? `${script.contact.firstName} ${script.contact.lastName}` : "Account"} · {script.isManualOverride ? "Edited" : generationLabel(script)}
              </p>
            </button>
          ))}
        </div>
        {!isLoading && !scripts.length && <p className="py-6 text-center text-sm text-slate-500">No scripts have been saved for this client account.</p>}
      </MultiCrmCard>
    </div>
  );
}
