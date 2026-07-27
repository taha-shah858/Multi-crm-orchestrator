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
} from "lucide-react";
import {
  ZenithCard,
  ZenithInnerPanel,
  ZenithTag,
} from "@/components/ui/ZenithCard";

const recentCalls = [
  {
    id: 1,
    name: "Sarah Jenkins",
    company: "Acme Corp",
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
    number: "+1 (555) 345-6789",
    type: "outgoing",
    duration: "08m 30s",
    time: "3h ago",
    sentiment: "High Intent",
    sentimentVariant: "purple" as const,
  },
];

export default function SmartDialerPage() {
  const [phoneNumber, setPhoneNumber] = useState("+1 (555) 234-8901");
  const [isCallActive, setIsCallActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isOnHold, setIsOnHold] = useState(false);

  const handleKeyPress = (digit: string) => {
    setPhoneNumber((prev) => prev + digit);
  };

  const handleBackspace = () => {
    setPhoneNumber((prev) => prev.slice(0, -1));
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <PhoneCall className="w-5 h-5 text-primary-cyan" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-100">
              Twilio Smart Dialer
            </h1>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-1">
            WebRTC cloud calling engine with live AI transcription & sentiment
            analysis.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono flex items-center gap-2 shadow-inner">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            Twilio SIP Trunk: Active
          </span>
        </div>
      </div>

      {/* Main Grid: Dialer + AI Copilot Assistance + Call Log */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Keypad & Call Control Center (5 cols) */}
        <ZenithCard className="lg:col-span-5 flex flex-col justify-between space-y-6">
          {/* Display Area */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-mono text-slate-400">
              <span>TARGET DESTINATION</span>
              <span className="text-primary-cyan">US/CAN Gateway</span>
            </div>

            <div className="relative">
              <input
                type="text"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="Enter phone number..."
                className="w-full bg-zenith-inner border border-slate-800 rounded-xl px-4 py-3 text-xl font-mono text-center tracking-widest text-slate-100 focus:outline-none focus:border-primary-cyan/50 shadow-inner"
              />
              {phoneNumber && (
                <button
                  onClick={handleBackspace}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400 hover:text-slate-200 px-2 py-1 rounded bg-zenith-surface border border-slate-800 shadow-inner"
                >
                  DEL
                </button>
              )}
            </div>
          </div>

          {/* Numerical Dialpad Grid */}
          <div className="grid grid-cols-3 gap-3 my-4">
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
                className="p-4 rounded-xl bg-zenith-inner hover:bg-slate-800 border border-slate-800 hover:border-primary-cyan/40 text-slate-200 transition-all flex flex-col items-center justify-center active:scale-95 shadow-inner"
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
                className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition-all shadow-[0_0_25px_rgba(16,185,129,0.3)] flex items-center justify-center gap-2 cursor-pointer"
              >
                <PhoneCall className="w-4 h-4 fill-current" />
                INITIATE OUTBOUND CALL
              </button>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className={`p-3 rounded-xl border transition-all ${
                      isMuted
                        ? "bg-amber-500/20 text-amber-400 border-amber-500/40 shadow-inner"
                        : "bg-zenith-inner text-slate-300 border-slate-800 hover:bg-slate-800 shadow-inner"
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
                    className={`p-3 rounded-xl border transition-all ${
                      isOnHold
                        ? "bg-amber-500/20 text-amber-400 border-amber-500/40 shadow-inner"
                        : "bg-zenith-inner text-slate-300 border-slate-800 hover:bg-slate-800 shadow-inner"
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
                    className="flex-1 py-3.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-sm transition-all shadow-[0_0_20px_rgba(244,63,94,0.3)] flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <PhoneOff className="w-4 h-4 fill-current" />
                    END CALL
                  </button>
                </div>
              </div>
            )}
          </div>
        </ZenithCard>

        {/* Right Column: AI Live Assistant & Call History (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Live AI Copilot Call Guidance Box */}
          <ZenithCard className="space-y-4 relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-primary-cyan/15 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-tertiary-purple animate-pulse" />
                <h2 className="text-sm font-semibold text-slate-200">
                  AI Real-Time Call Assistant
                </h2>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-tertiary-purple/10 text-tertiary-purple border border-tertiary-purple/20 shadow-inner">
                {isCallActive ? "Live Listening" : "Standby Mode"}
              </span>
            </div>

            {isCallActive ? (
              <div className="space-y-4">
                <ZenithInnerPanel className="space-y-2 border-primary-cyan/20">
                  <div className="flex items-center justify-between text-xs font-mono text-primary-cyan">
                    <span className="flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5" /> Suggested Objection
                      Handler
                    </span>
                    <span>94% Confidence</span>
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed font-mono">
                    "I understand budget is a primary concern. Our multi-CRM
                    routing actually reduces redundant API licensing costs by an
                    average of 28% across teams."
                  </p>
                </ZenithInnerPanel>

                <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                  <ZenithInnerPanel className="py-3">
                    <span className="text-[10px] text-slate-500 block">
                      DETECTED SENTIMENT
                    </span>
                    <span className="text-emerald-400 mt-1 block font-bold">
                      Positive (High Intent)
                    </span>
                  </ZenithInnerPanel>
                  <ZenithInnerPanel className="py-3">
                    <span className="text-[10px] text-slate-500 block">
                      TALK / LISTEN RATIO
                    </span>
                    <span className="text-slate-200 mt-1 block font-bold">
                      42% / 58% (Optimal)
                    </span>
                  </ZenithInnerPanel>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center space-y-2">
                <Bot className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400 font-mono">
                  Initiate a call to trigger live transcription, sentiment
                  tracking, and instant objection prompts.
                </p>
              </div>
            )}
          </ZenithCard>

          {/* Recent Call Logs */}
          <ZenithCard className="space-y-4">
            <div className="flex items-center justify-between border-b border-primary-cyan/15 pb-3">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-slate-400" />
                <h2 className="text-sm font-semibold text-slate-200">
                  Recent Call History
                </h2>
              </div>
              <span className="text-xs font-mono text-slate-500">
                Last 24 Hours
              </span>
            </div>

            <div className="space-y-3">
              {recentCalls.map((call) => (
                <ZenithInnerPanel
                  key={call.id}
                  className="flex items-center justify-between py-3 hover:border-primary-cyan/40 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-zenith-surface border border-slate-800 text-slate-400 shadow-inner">
                      {call.type === "outgoing" ? (
                        <PhoneOutgoing className="w-4 h-4 text-primary-cyan" />
                      ) : (
                        <PhoneIncoming className="w-4 h-4 text-emerald-400" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-slate-200">
                        {call.name}
                      </h4>
                      <p className="text-[11px] text-slate-400 font-mono">
                        {call.company} • {call.number}
                      </p>
                    </div>
                  </div>

                  <div className="text-right space-y-1 font-mono">
                    <ZenithTag variant={call.sentimentVariant}>
                      {call.sentiment}
                    </ZenithTag>
                    <p className="text-[10px] text-slate-500">
                      {call.duration} • {call.time}
                    </p>
                  </div>
                </ZenithInnerPanel>
              ))}
            </div>
          </ZenithCard>
        </div>
      </div>
    </div>
  );
}
