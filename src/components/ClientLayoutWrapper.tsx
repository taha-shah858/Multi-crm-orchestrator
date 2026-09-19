"use client";

import type { CSSProperties } from "react";
import Sidebar from "@/components/Sidebar";
import ClientAccountSwitcher from "@/components/ClientAccountSwitcher";

export default function ClientLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
          className="flex h-dvh w-full bg-transparent"
          style={{ "--dashboard-header-height": "4rem" } as CSSProperties}
        >
          {/* Fully transparent Sidebar wrapper */}
          <div className="bg-transparent backdrop-blur-xl border-r border-crm-border-strong shrink-0">
            <Sidebar />
          </div>

          <div className="flex-1 flex min-w-0 min-h-0 flex-col bg-transparent">
            {/* Header: glass-panel removed and replaced with true 100% transparent glass */}
            <header className="h-[var(--dashboard-header-height)] shrink-0 bg-transparent backdrop-blur-xl border-b border-crm-border-strong px-8 flex items-center justify-between sticky top-0 z-[60]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-xs font-mono text-crm-text-muted">
                  SYNC ENGINE:{" "}
                  <strong className="text-emerald-400">ACTIVE</strong>
                </span>
              </div>

              <div className="flex items-center gap-4 text-xs font-mono text-crm-text-muted">
                <ClientAccountSwitcher />
                <span className="bg-white/5 backdrop-blur-md px-3 py-1.5 rounded-xl border border-crm-border-strong shadow-inner">
                  Active Pipeline:{" "}
                  <strong className="text-accent-cyan">$142,500</strong>
                </span>
              </div>
            </header>

            <main className="flex-1 min-h-0 overflow-y-auto p-8 relative z-0 bg-transparent">
              {children}
            </main>
          </div>
    </div>
  );
}
