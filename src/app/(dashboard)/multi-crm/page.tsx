"use client";

import { useState } from "react";
import { RefreshCw, Sparkles } from "lucide-react";

export default function MultiCrmPage() {
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = () => {
    setIsSyncing(true);
    setTimeout(() => setIsSyncing(false), 2000);
  };

  return (
    <div className="relative z-10 p-6 md:p-10 max-w-7xl mx-auto min-h-[85vh] flex flex-col justify-between pointer-events-none">
      {/* Top Minimalist Header Bar */}
      <div className="flex items-center justify-between bg-crm-inner/40 backdrop-blur-2xl border border-crm-border-strong px-6 py-4 rounded-2xl shadow-2xl pointer-events-auto">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-bold text-crm-text tracking-tight">
              Multi-CRM Orchestrator
            </h1>
            <p className="text-xs text-crm-text-muted">
              Autonomous data pipelines & multi-tenant synchronization.
            </p>
          </div>
        </div>
        <button
          onClick={handleSync}
          disabled={isSyncing}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 text-xs font-semibold hover:bg-cyan-500/25 transition-all shadow-[0_0_15px_rgba(6,182,212,0.2)] cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />
          {isSyncing ? "Syncing Clusters..." : "Sync Clusters"}
        </button>
      </div>

      {/* Central viewport left pristine and open for the high-resolution 3D particle typography */}
      <div className="flex-1" />
    </div>
  );
}
