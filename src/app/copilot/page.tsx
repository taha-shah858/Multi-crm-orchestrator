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
} from "lucide-react";
import {
  ZenithCard,
  ZenithInnerPanel,
  ZenithTag,
} from "@/components/ui/ZenithCard";

const copilotCapabilities = [
  {
    title: "Cross-CRM Deduplication & Conflict Resolution",
    description:
      "Detects entity overlaps between Salesforce & HubSpot and proposes merge rules.",
    badge: "Automated",
    variant: "cyan" as const,
  },
  {
    title: "Contextual Email & Call Draft Generator",
    description:
      "Generates tailored outbound responses based on deal sentiment and pipeline stage.",
    badge: "Interactive",
    variant: "purple" as const,
  },
  {
    title: "Predictive Win-Probability Scoring",
    description:
      "Calculates live conversion probabilities based on historical CRM deal metrics.",
    badge: "Real-time",
    variant: "magenta" as const,
  },
];

const mockMessages = [
  {
    sender: "ai",
    text: "Greetings! I'm monitoring all 4 connected CRM streams. I noticed Sarah Jenkins from Acme Corp was qualified via Twilio dialer with a 92/100 score. Would you like me to draft a follow-up proposal email or trigger a Salesforce field update?",
    time: "10:43 AM",
  },
];

export default function CopilotPage() {
  const [messages, setMessages] = useState(mockMessages);
  const [inputQuery, setInputQuery] = useState("");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleSend = () => {
    if (!inputQuery.trim()) return;

    const userMsg = {
      sender: "user",
      text: inputQuery,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages((prev) => [...prev, userMsg]);
    const currentQuery = inputQuery;
    setInputQuery("");

    // Simulate AI response
    setTimeout(() => {
      const aiMsg = {
        sender: "ai",
        text: `Executing orchestration request for: "${currentQuery}". I've updated the respective records across Salesforce & HubSpot and logged the action in the Telemetry audit stream.`,
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
      setMessages((prev) => [...prev, aiMsg]);
    }, 1000);
  };

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-tertiary-purple" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-100">
              AI Copilot Suite
            </h1>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Autonomous CRM agent for lead qualification, draft generation, and
            workflow automation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="px-3 py-1.5 rounded-xl bg-tertiary-purple/10 border border-tertiary-purple/20 text-tertiary-purple text-xs font-mono flex items-center gap-2 shadow-inner">
            <Zap className="w-3.5 h-3.5" /> Model: Zenith-CRM v4
          </span>
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Interactive Chat Interface (7 cols) */}
        <ZenithCard className="lg:col-span-7 flex flex-col h-155 p-0 overflow-hidden">
          {/* Chat Header */}
          <div className="p-4 border-b border-primary-cyan/15 flex items-center justify-between bg-zenith-inner">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-tertiary-purple/20 border border-tertiary-purple/30 text-tertiary-purple">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-slate-200">
                  Agent Workspace
                </h3>
                <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />{" "}
                  Active Session
                </span>
              </div>
            </div>

            <button
              onClick={() => setMessages(mockMessages)}
              title="Reset Conversation"
              className="p-2 rounded-lg bg-zenith-surface hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-all border border-slate-800 text-xs font-mono flex items-center gap-1.5 shadow-inner"
            >
              <RefreshCw className="w-3 h-3" /> Reset
            </button>
          </div>

          {/* Chat Stream Window */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 font-sans text-xs bg-zenith-surface">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex items-start gap-3 ${
                  msg.sender === "user" ? "flex-row-reverse" : "flex-row"
                }`}
              >
                <div
                  className={`p-2 rounded-xl shrink-0 ${
                    msg.sender === "user"
                      ? "bg-primary-cyan/20 text-primary-cyan border border-primary-cyan/30"
                      : "bg-tertiary-purple/20 text-tertiary-purple border border-tertiary-purple/30"
                  }`}
                >
                  {msg.sender === "user" ? (
                    <User className="w-3.5 h-3.5" />
                  ) : (
                    <Bot className="w-3.5 h-3.5" />
                  )}
                </div>

                <div
                  className={`group relative max-w-[80%] p-4 rounded-2xl space-y-2 shadow-inner ${
                    msg.sender === "user"
                      ? "bg-primary-cyan/10 border border-primary-cyan/20 text-slate-100"
                      : "bg-zenith-inner border border-slate-800 text-slate-200"
                  }`}
                >
                  <p className="leading-relaxed">{msg.text}</p>
                  <div className="flex items-center justify-between pt-1 text-[10px] font-mono text-slate-500">
                    <span>{msg.time}</span>
                    {msg.sender === "ai" && (
                      <button
                        onClick={() => handleCopy(msg.text, index)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-slate-300 flex items-center gap-1"
                      >
                        {copiedIndex === index ? (
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

          {/* Chat Input Bar */}
          <div className="p-3 border-t border-primary-cyan/15 bg-zenith-inner">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                placeholder="Ask Copilot to analyze leads, draft responses, or re-sync CRMs..."
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                className="flex-1 bg-zenith-surface border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-tertiary-purple/50 font-mono transition-all shadow-inner"
              />
              <button
                type="submit"
                className="p-2.5 rounded-xl bg-tertiary-purple/20 border border-tertiary-purple/40 text-tertiary-purple hover:bg-tertiary-purple/30 transition-all shadow-[0_0_15px_rgba(124,58,237,0.2)]"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </ZenithCard>

        {/* Right Column: AI Automation Presets & Capability Cards (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* System Agent Capabilities */}
          <ZenithCard className="space-y-4">
            <div className="flex items-center justify-between border-b border-primary-cyan/15 pb-3">
              <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-primary-cyan" />
                Active Agent Skills
              </h2>
              <span className="text-[10px] font-mono text-slate-500">
                v4.2 Ready
              </span>
            </div>

            <div className="space-y-3">
              {copilotCapabilities.map((cap, i) => (
                <ZenithInnerPanel
                  key={i}
                  className="space-y-1.5 hover:border-primary-cyan/40 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-medium text-slate-200">
                      {cap.title}
                    </h4>
                    <ZenithTag variant={cap.variant}>{cap.badge}</ZenithTag>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed font-mono">
                    {cap.description}
                  </p>
                </ZenithInnerPanel>
              ))}
            </div>
          </ZenithCard>

          {/* Quick Trigger Workflows */}
          <ZenithCard className="space-y-4">
            <h2 className="text-sm font-semibold text-slate-200 border-b border-primary-cyan/15 pb-3">
              Quick Action Triggers
            </h2>

            <div className="space-y-2">
              {[
                "Draft high-intent follow-up email for Sarah Jenkins",
                "Scan all CRMs for unmerged contact collisions",
                "Generate weekly pipeline conversion digest",
              ].map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => setInputQuery(prompt)}
                  className="w-full p-3 rounded-xl bg-zenith-inner hover:bg-slate-800/80 border border-slate-800 text-left text-xs text-slate-300 transition-all flex items-center justify-between group shadow-inner"
                >
                  <span className="truncate pr-2 font-mono">{prompt}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-tertiary-purple transition-colors shrink-0" />
                </button>
              ))}
            </div>
          </ZenithCard>
        </div>
      </div>
    </div>
  );
}
