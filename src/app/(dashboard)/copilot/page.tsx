"use client";

import { useState } from "react";
import {
  Sparkles,
  Send,
  Bot,
  User,
  Zap,
  Sliders,
  RefreshCw,
  Copy,
  Check,
  ChevronRight,
  Building2,
  Database,
  Target,
  FileText,
  DollarSign,
  UserCheck,
  HelpCircle,
  Clock,
  Play,
  CheckCircle2,
  Code2,
  Cpu,
  Layers,
  Wand2,
} from "lucide-react";
import {
  MultiCrmCard,
  MultiCrmInnerPanel,
  MultiCrmTag,
} from "@/components/ui/MultiCrmCard";

interface BantState {
  budget: string;
  authority: string;
  need: string;
  timeline: string;
  score: number;
}

interface ChatMessage {
  id: string;
  sender: "user" | "ai" | "system";
  text: string;
  time: string;
  brand?: string;
  crm?: string;
  actionExecuted?: {
    tool: string;
    targetCrm: string;
    payloadSummary: string;
    status: "success" | "pending";
  };
  bantExtracted?: BantState;
  scriptGenerated?: string;
}

const BRANDS = [
  { id: "acme", name: "Acme Corp", industry: "Enterprise SaaS" },
  { id: "stark", name: "Stark Tech", industry: "AI & Robotics" },
  { id: "cyberdyne", name: "Cyberdyne Systems", industry: "Defense & Cloud" },
  { id: "aperture", name: "Aperture Labs", industry: "Quantum Hardware" },
];

const TARGET_CRMS = [
  "Salesforce Enterprise",
  "HubSpot Professional",
  "Zoho CRM",
  "Pipedrive",
];

const initialBant: BantState = {
  budget: "$120,000 / year (Approved Q3)",
  authority: "VP of Revenue Operations (Decision Maker)",
  need: "Bi-directional lead sync & automated conflict resolution",
  timeline: "Implementation within 30 days",
  score: 94,
};

const initialMessages: ChatMessage[] = [
  {
    id: "m-1",
    sender: "ai",
    text: "Greetings! I'm synchronized across your connected CRMs. Currently monitoring active workflows for Acme Corp. Would you like me to extract BANT criteria from recent calls or generate a CRM-specific sales script?",
    time: "10:43 AM",
    brand: "Acme Corp",
    crm: "Salesforce Enterprise",
  },
];

export default function CopilotPage() {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [inputQuery, setInputQuery] = useState("");
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);

  // Brand & CRM State
  const [selectedBrand, setSelectedBrand] = useState(BRANDS[0].name);
  const [selectedCrm, setSelectedCrm] = useState(TARGET_CRMS[0]);

  // Active View Tab inside Copilot
  const [activeTab, setActiveTab] = useState<
    "chat" | "bant" | "script" | "skills"
  >("chat");

  // BANT Extraction State
  const [bantData, setBantData] = useState<BantState>(initialBant);
  const [isExtractingBant, setIsExtractingBant] = useState(false);

  // Script Generator State
  const [scriptObjective, setScriptObjective] = useState("Discovery Call");
  const [generatedScript, setGeneratedScript] = useState<string | null>(null);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);

  // Handle Chat Input & Autonomous Self-Execution
  const handleSend = (textToSend?: string) => {
    const query = textToSend || inputQuery;
    if (!query.trim()) return;

    const timestamp = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: "user",
      text: query,
      time: timestamp,
      brand: selectedBrand,
      crm: selectedCrm,
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputQuery("");

    // Autonomous AI Reaction Simulation
    setTimeout(() => {
      const isBantRequest =
        query.toLowerCase().includes("bant") ||
        query.toLowerCase().includes("extract");
      const isScriptRequest =
        query.toLowerCase().includes("script") ||
        query.toLowerCase().includes("draft");

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: "ai",
        text: `Autonomous Execution Complete for ${selectedBrand} on ${selectedCrm}. Target action executed via agent pipeline.`,
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        brand: selectedBrand,
        crm: selectedCrm,
        actionExecuted: {
          tool: isBantRequest
            ? "BANT_PARSER_V4"
            : isScriptRequest
            ? "SCRIPT_GEN_LLM"
            : "CRM_MUTATION_AGENT",
          targetCrm: selectedCrm,
          payloadSummary: `Updated record for ${selectedBrand} — Action auto-commited to ${selectedCrm}.`,
          status: "success",
        },
      };

      if (isBantRequest) {
        aiMsg.bantExtracted = bantData;
      }

      setMessages((prev) => [...prev, aiMsg]);
    }, 900);
  };

  // Trigger BANT Extraction Action
  const handleRunBantExtraction = () => {
    setIsExtractingBant(true);
    setTimeout(() => {
      const newBant: BantState = {
        budget: "$85,000 - $150,000 (Flexible)",
        authority: "Head of Engineering & Procurement Team",
        need: "Reduce sync latency below 100ms across Salesforce and HubSpot",
        timeline: "Immediate deployment required for Q3",
        score: 91,
      };
      setBantData(newBant);
      setIsExtractingBant(false);
      handleSend(
        `[AUTO-ACTION] Extract BANT qualification data for ${selectedBrand}`
      );
    }, 1000);
  };

  // Trigger Script Creation
  const handleGenerateScript = () => {
    setIsGeneratingScript(true);
    setTimeout(() => {
      const script = `--- HIGH-CONVERSION SALES SCRIPT ---
Brand Context: ${selectedBrand}
Target CRM Workflow: ${selectedCrm}
Objective: ${scriptObjective}

[OPENER]: "Hi Sarah, I noticed your team is orchestrating complex multi-CRM workflows at ${selectedBrand}. Quick question — how are you currently handling bi-directional field conflict resolution when updating ${selectedCrm}?"

[VALUE PROP]: "Our Autonomous Agent eliminates duplicate entries and syncs deal stages across all connected CRMs in real-time with sub-150ms latency."

[CALL TO ACTION]: "Do you have 10 minutes this Thursday to see an automated dry-run synced directly into your ${selectedCrm} sandbox?"`;

      setGeneratedScript(script);
      setIsGeneratingScript(false);
      handleSend(
        `[AUTO-ACTION] Generated ${scriptObjective} sales script tailored for ${selectedBrand} on ${selectedCrm}.`
      );
    }, 1100);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(id);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="space-y-6 font-sans text-crm-text">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-secondary-pink" />
            <h1 className="text-2xl font-bold tracking-tight text-crm-text">
              AI Copilot & Autonomous Agent Suite
            </h1>
          </div>
          <p className="text-xs text-crm-text-muted font-mono mt-1">
            Autonomous CRM agent: BANT extraction, brand sales script generator,
            and self-executing multi-CRM actions.
          </p>
        </div>

        {/* Global Brand & CRM Context Switcher */}
        <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
          <div className="flex items-center gap-2 bg-crm-inner border border-crm-border-strong p-1.5 px-3 rounded-xl">
            <Building2 className="w-3.5 h-3.5 text-primary-cyan" />
            <span className="text-[10px] text-slate-500 uppercase">Brand:</span>
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="bg-transparent text-crm-text text-xs focus:outline-none cursor-pointer font-semibold"
            >
              {BRANDS.map((b) => (
                <option key={b.id} value={b.name} className="bg-crm-inner">
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-crm-inner border border-crm-border-strong p-1.5 px-3 rounded-xl">
            <Database className="w-3.5 h-3.5 text-secondary-pink" />
            <span className="text-[10px] text-slate-500 uppercase">CRM:</span>
            <select
              value={selectedCrm}
              onChange={(e) => setSelectedCrm(e.target.value)}
              className="bg-transparent text-crm-text text-xs focus:outline-none cursor-pointer font-semibold"
            >
              {TARGET_CRMS.map((crm) => (
                <option key={crm} value={crm} className="bg-crm-inner">
                  {crm}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Agent Navigation & Capabilities (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Action Modes Menu */}
          <MultiCrmCard className="p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-crm-border-strong pb-2.5 font-mono text-xs">
              <span className="font-bold text-crm-text flex items-center gap-2">
                <Sliders className="w-4 h-4 text-primary-cyan" /> Workspace
                Navigation
              </span>
              <span className="text-[10px] text-emerald-400 font-mono">
                ● Agent Ready
              </span>
            </div>

            <div className="space-y-1.5">
              {[
                {
                  id: "chat",
                  label: "Interactive Agent Stream",
                  icon: Bot,
                  badge: "Live",
                },
                {
                  id: "bant",
                  label: "BANT Qualification Parser",
                  icon: Target,
                  badge: "AI Tool",
                },
                {
                  id: "script",
                  label: "Brand Sales Script Generator",
                  icon: FileText,
                  badge: "Custom",
                },
                {
                  id: "skills",
                  label: "Autonomous Tool Triggers",
                  icon: Cpu,
                  badge: "Self-Exec",
                },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`w-full p-2.5 rounded-xl border text-xs font-mono transition-all flex items-center justify-between cursor-pointer ${
                      isActive
                        ? "bg-primary-cyan/15 border-primary-cyan/40 text-primary-cyan font-bold shadow-[0_0_15px_color-mix(in_srgb,var(--color-primary-cyan)_15%,transparent)]"
                        : "bg-crm-inner border-crm-border text-crm-text-muted hover:text-crm-text hover:bg-crm-surface"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4" />
                      <span>{tab.label}</span>
                    </div>
                    <span className="text-[9px] px-2 py-0.5 rounded bg-white/10 text-crm-text-muted">
                      {tab.badge}
                    </span>
                  </button>
                );
              })}
            </div>
          </MultiCrmCard>

          {/* Context Card for Selected Brand & CRM */}
          <MultiCrmCard className="p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-crm-border-strong pb-2">
              <span className="text-xs font-mono text-crm-text-muted flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5 text-secondary-pink" /> Active
                Context Summary
              </span>
            </div>
            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between p-2 rounded-lg bg-crm-inner border border-crm-border">
                <span className="text-slate-500">Brand</span>
                <span className="text-crm-text font-bold">
                  {selectedBrand}
                </span>
              </div>
              <div className="flex justify-between p-2 rounded-lg bg-crm-inner border border-crm-border">
                <span className="text-slate-500">Destination CRM</span>
                <span className="text-primary-cyan font-bold">
                  {selectedCrm}
                </span>
              </div>
              <div className="flex justify-between p-2 rounded-lg bg-crm-inner border border-crm-border">
                <span className="text-slate-500">Autonomous Sync</span>
                <span className="text-emerald-400 font-bold">
                  Enabled (Auto-Commit)
                </span>
              </div>
            </div>
          </MultiCrmCard>

          {/* Quick Trigger Actions */}
          <MultiCrmCard className="p-4 space-y-3">
            <h3 className="text-xs font-mono font-semibold text-crm-text-muted border-b border-crm-border-strong pb-2">
              Quick Autonomous Actions
            </h3>
            <div className="space-y-2">
              {[
                `Extract BANT for ${selectedBrand}`,
                `Draft ${selectedCrm} pitch script`,
                `Rescore high-intent leads in ${selectedCrm}`,
              ].map((action, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(action)}
                  className="w-full p-2.5 rounded-xl bg-crm-inner hover:bg-crm-surface border border-crm-border-strong text-left text-xs font-mono text-crm-text-muted transition-all flex items-center justify-between group cursor-pointer"
                >
                  <span className="truncate pr-2">{action}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-primary-cyan transition-colors" />
                </button>
              ))}
            </div>
          </MultiCrmCard>
        </div>

        {/* Right Side: Dynamic Main Content Area (8 cols) */}
        <div className="lg:col-span-8">
          {/* TAB 1: INTERACTIVE AGENT CHAT WITH AUTONOMOUS EXECUTION BADGES */}
          {activeTab === "chat" && (
            <MultiCrmCard className="flex flex-col h-160 p-0 overflow-hidden">
              {/* Chat Header */}
              <div className="p-4 border-b border-crm-border-strong flex items-center justify-between bg-crm-surface/80">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-400">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-crm-text">
                      Agent Orchestrator Stream
                    </h3>
                    <span className="text-[10px] font-mono text-crm-text-muted flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Context: {selectedBrand} → {selectedCrm}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setMessages(initialMessages)}
                  className="p-2 rounded-lg bg-crm-inner hover:bg-crm-surface border border-crm-border-strong text-xs font-mono text-crm-text-muted flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3 text-primary-cyan" /> Reset
                </button>
              </div>

              {/* Chat Stream Window */}
              <div className="flex-1 p-4 overflow-y-auto space-y-4 font-sans text-xs bg-crm-inner/90 scrollbar-thin">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-3 ${
                      msg.sender === "user" ? "flex-row-reverse" : "flex-row"
                    }`}
                  >
                    <div
                      className={`p-2 rounded-xl shrink-0 ${
                        msg.sender === "user"
                          ? "bg-primary-cyan/20 text-primary-cyan border border-primary-cyan/30"
                          : "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                      }`}
                    >
                      {msg.sender === "user" ? (
                        <User className="w-3.5 h-3.5" />
                      ) : (
                        <Bot className="w-3.5 h-3.5" />
                      )}
                    </div>

                    <div
                      className={`group relative max-w-[85%] p-4 rounded-2xl space-y-3 shadow-inner ${
                        msg.sender === "user"
                          ? "bg-primary-cyan/10 border border-primary-cyan/20 text-crm-text"
                          : "bg-crm-surface/90 border border-crm-border-strong text-crm-text"
                      }`}
                    >
                      <p className="leading-relaxed">{msg.text}</p>

                      {/* Autonomous Action Card directly embedded inside AI stream */}
                      {msg.actionExecuted && (
                        <div className="p-3 rounded-xl bg-black/50 border border-emerald-500/30 font-mono text-[11px] space-y-1.5">
                          <div className="flex items-center justify-between text-emerald-400 font-bold">
                            <span className="flex items-center gap-1.5">
                              <Zap className="w-3.5 h-3.5" /> Autonomous Action
                              Executed
                            </span>
                            <span className="text-[9px] bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30">
                              {msg.actionExecuted.status}
                            </span>
                          </div>
                          <div className="text-crm-text-muted">
                            Tool:{" "}
                            <span className="text-primary-cyan">
                              {msg.actionExecuted.tool}
                            </span>
                          </div>
                          <div className="text-crm-text-muted text-[10px]">
                            {msg.actionExecuted.payloadSummary}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-1 text-[10px] font-mono text-slate-500 border-t border-crm-border">
                        <span>
                          {msg.time} {msg.brand ? `• ${msg.brand}` : ""}
                        </span>
                        {msg.sender === "ai" && (
                          <button
                            onClick={() => handleCopy(msg.text, msg.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-crm-text-muted flex items-center gap-1 cursor-pointer"
                          >
                            {copiedIndex === msg.id ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Input Bar */}
              <div className="p-3 border-t border-crm-border-strong bg-crm-surface/80">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSend();
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    placeholder={`Ask Copilot to execute actions for ${selectedBrand} in ${selectedCrm}...`}
                    value={inputQuery}
                    onChange={(e) => setInputQuery(e.target.value)}
                    className="flex-1 bg-crm-inner border border-crm-border-strong rounded-xl px-4 py-2.5 text-xs text-crm-text placeholder-slate-500 focus:outline-none focus:border-purple-500/50 font-mono transition-all shadow-inner"
                  />
                  <button
                    type="submit"
                    className="p-2.5 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-400 hover:bg-purple-500/30 transition-all shadow-[0_0_15px_rgba(168,85,247,0.2)] cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </MultiCrmCard>
          )}

          {/* TAB 2: BANT DATA EXTRACTION PANEL */}
          {activeTab === "bant" && (
            <MultiCrmCard className="p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-crm-border-strong pb-4">
                <div>
                  <h2 className="text-base font-bold text-crm-text flex items-center gap-2">
                    <Target className="w-5 h-5 text-primary-cyan" /> BANT
                    Qualification Parser
                  </h2>
                  <p className="text-xs text-crm-text-muted font-mono mt-1">
                    Extracts Budget, Authority, Need, and Timeline from unified
                    CRM call transcripts & transcripts for {selectedBrand}.
                  </p>
                </div>
                <button
                  onClick={handleRunBantExtraction}
                  disabled={isExtractingBant}
                  className="px-4 py-2 rounded-xl bg-primary-cyan/20 border border-primary-cyan/40 text-primary-cyan hover:bg-primary-cyan/30 text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer shadow-inner"
                >
                  <Wand2
                    className={`w-4 h-4 ${
                      isExtractingBant ? "animate-spin" : ""
                    }`}
                  />
                  {isExtractingBant
                    ? "Parsing Transcripts..."
                    : "Run AI Extraction"}
                </button>
              </div>

              {/* BANT Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
                {/* Budget */}
                <MultiCrmInnerPanel className="p-4 space-y-2 border-emerald-500/30 bg-emerald-500/5">
                  <div className="flex items-center justify-between">
                    <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4" /> Budget (B)
                    </span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  </div>
                  <p className="text-crm-text font-sans text-xs">
                    {bantData.budget}
                  </p>
                </MultiCrmInnerPanel>

                {/* Authority */}
                <MultiCrmInnerPanel className="p-4 space-y-2 border-purple-500/30 bg-purple-500/5">
                  <div className="flex items-center justify-between">
                    <span className="text-purple-400 font-bold flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4" /> Authority (A)
                    </span>
                    <CheckCircle2 className="w-4 h-4 text-purple-400" />
                  </div>
                  <p className="text-crm-text font-sans text-xs">
                    {bantData.authority}
                  </p>
                </MultiCrmInnerPanel>

                {/* Need */}
                <MultiCrmInnerPanel className="p-4 space-y-2 border-primary-cyan/30 bg-primary-cyan/5">
                  <div className="flex items-center justify-between">
                    <span className="text-primary-cyan font-bold flex items-center gap-1.5">
                      <HelpCircle className="w-4 h-4" /> Need (N)
                    </span>
                    <CheckCircle2 className="w-4 h-4 text-primary-cyan" />
                  </div>
                  <p className="text-crm-text font-sans text-xs">
                    {bantData.need}
                  </p>
                </MultiCrmInnerPanel>

                {/* Timeline */}
                <MultiCrmInnerPanel className="p-4 space-y-2 border-secondary-pink/30 bg-secondary-pink/5">
                  <div className="flex items-center justify-between">
                    <span className="text-secondary-pink font-bold flex items-center gap-1.5">
                      <Clock className="w-4 h-4" /> Timeline (T)
                    </span>
                    <CheckCircle2 className="w-4 h-4 text-secondary-pink" />
                  </div>
                  <p className="text-crm-text font-sans text-xs">
                    {bantData.timeline}
                  </p>
                </MultiCrmInnerPanel>
              </div>

              {/* Lead Qualification Score */}
              <div className="p-4 rounded-xl bg-crm-inner border border-crm-border-strong flex items-center justify-between font-mono">
                <div>
                  <span className="text-xs text-crm-text-muted block">
                    Overall BANT Qualification Score
                  </span>
                  <span className="text-xl font-bold text-emerald-400">
                    {bantData.score} / 100
                  </span>
                </div>
                <button
                  onClick={() =>
                    handleSend(
                      `[AUTO-COMMIT] Sync extracted BANT data directly into ${selectedCrm} record for ${selectedBrand}.`
                    )
                  }
                  className="px-4 py-2 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-300 hover:bg-purple-500/30 text-xs font-mono transition-all cursor-pointer"
                >
                  Sync to {selectedCrm}
                </button>
              </div>
            </MultiCrmCard>
          )}

          {/* TAB 3: BRAND & CRM SALES SCRIPT GENERATOR */}
          {activeTab === "script" && (
            <MultiCrmCard className="p-6 space-y-6">
              <div className="flex items-center justify-between border-b border-crm-border-strong pb-4">
                <div>
                  <h2 className="text-base font-bold text-crm-text flex items-center gap-2">
                    <FileText className="w-5 h-5 text-secondary-pink" /> Brand
                    Sales Script Generator
                  </h2>
                  <p className="text-xs text-crm-text-muted font-mono mt-1">
                    Generates brand-tailored phone & email scripts calibrated
                    for {selectedBrand} reps selling through {selectedCrm}.
                  </p>
                </div>
              </div>

              {/* Script Configuration */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
                <div className="space-y-1.5">
                  <label className="text-crm-text-muted">
                    Call / Pitch Objective
                  </label>
                  <select
                    value={scriptObjective}
                    onChange={(e) => setScriptObjective(e.target.value)}
                    className="w-full bg-crm-inner border border-crm-border-strong rounded-xl p-2.5 text-crm-text focus:outline-none focus:border-secondary-pink"
                  >
                    <option value="Discovery Call">Discovery Call</option>
                    <option value="Executive Pitch">Executive Pitch</option>
                    <option value="Objection Handling">
                      Objection Handling
                    </option>
                    <option value="Renewal & Expansion">
                      Renewal & Expansion
                    </option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-crm-text-muted">Target CRM Context</label>
                  <input
                    type="text"
                    disabled
                    value={`${selectedBrand} → ${selectedCrm}`}
                    className="w-full bg-crm-inner/50 border border-crm-border-strong rounded-xl p-2.5 text-crm-text-muted"
                  />
                </div>
              </div>

              <button
                onClick={handleGenerateScript}
                disabled={isGeneratingScript}
                className="w-full py-3 rounded-xl bg-secondary-pink/20 border border-secondary-pink/40 text-secondary-pink hover:bg-secondary-pink/30 font-mono font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-inner"
              >
                <Sparkles
                  className={`w-4 h-4 ${
                    isGeneratingScript ? "animate-spin" : ""
                  }`}
                />
                {isGeneratingScript
                  ? "Generating Custom Script..."
                  : `Generate ${scriptObjective} Script`}
              </button>

              {/* Generated Output Box */}
              {generatedScript && (
                <div className="space-y-2 font-mono text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-crm-text-muted">
                      AI Generated Script Output:
                    </span>
                    <button
                      onClick={() => handleCopy(generatedScript, "script")}
                      className="text-primary-cyan hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" /> Copy Script
                    </button>
                  </div>
                  <pre className="p-4 bg-black/70 rounded-xl border border-crm-border-strong text-crm-text text-xs font-sans whitespace-pre-wrap leading-relaxed shadow-inner">
                    {generatedScript}
                  </pre>
                </div>
              )}
            </MultiCrmCard>
          )}

          {/* TAB 4: AUTONOMOUS SELF-EXECUTION SKILLS */}
          {activeTab === "skills" && (
            <MultiCrmCard className="p-6 space-y-6">
              <div className="border-b border-crm-border-strong pb-4">
                <h2 className="text-base font-bold text-crm-text flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-purple-400" /> Autonomous Agent
                  Skills & Tools
                </h2>
                <p className="text-xs text-crm-text-muted font-mono mt-1">
                  Active self-executing capabilities enabled for {selectedBrand}{" "}
                  across connected platforms.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
                {[
                  {
                    name: "Cross-CRM Deduplication",
                    desc: "Finds duplicate leads between Salesforce & HubSpot automatically.",
                    status: "Active",
                  },
                  {
                    name: "Twilio Sentiment Rescoring",
                    desc: "Updates deal score in real-time following phone calls.",
                    status: "Active",
                  },
                  {
                    name: "Autonomous Webhook Trigger",
                    desc: "Dispatches API payloads to custom endpoints on deal stage shift.",
                    status: "Active",
                  },
                  {
                    name: "Field Conflict Resolver",
                    desc: "Applies deterministic win rules when CRM fields clash.",
                    status: "Active",
                  },
                ].map((skill, i) => (
                  <MultiCrmInnerPanel key={i} className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-crm-text">
                        {skill.name}
                      </span>
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded">
                        {skill.status}
                      </span>
                    </div>
                    <p className="text-crm-text-muted font-sans text-xs">
                      {skill.desc}
                    </p>
                    <button
                      onClick={() =>
                        handleSend(
                          `[TRIGGER-SKILL] Executed ${skill.name} for ${selectedBrand}.`
                        )
                      }
                      className="pt-2 text-primary-cyan hover:underline flex items-center gap-1 cursor-pointer text-[11px]"
                    >
                      <Play className="w-3 h-3" /> Run Skill Now
                    </button>
                  </MultiCrmInnerPanel>
                ))}
              </div>
            </MultiCrmCard>
          )}
        </div>
      </div>
    </div>
  );
}
