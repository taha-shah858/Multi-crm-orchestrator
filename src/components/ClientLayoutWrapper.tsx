"use client";

import type { CSSProperties } from "react";
import Sidebar from "@/components/Sidebar";
import ClientAccountSwitcher from "@/components/ClientAccountSwitcher";
import ActiveTimeTracker from "@/components/operations/ActiveTimeTracker";

export default function ClientLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex h-dvh w-full bg-slate-50"
      style={{ "--dashboard-header-height": "3.5rem" } as CSSProperties}
    >
      {/* Sidebar */}
      <Sidebar />

      <div className="flex-1 flex min-w-0 min-h-0 flex-col bg-slate-50">

        {/* ── Top App Header ── */}
        <header className="h-[var(--dashboard-header-height)] shrink-0 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-[60] shadow-sm">
          {/* Workspace identity */}
          <div className="flex items-center gap-2">
            <span className="bg-blue-50 text-blue-800 border border-blue-200 font-semibold text-xs px-3 py-1 rounded-full">
              Sales workspace
            </span>
          </div>

          {/* Active work and client selection */}
          <div className="flex items-center gap-3">
            <ActiveTimeTracker />
            <ClientAccountSwitcher />
          </div>
        </header>

        {/* ── Main Content ── */}
        <main className="flex-1 min-h-0 overflow-y-auto p-6 bg-slate-50">
          {children}
        </main>
      </div>
    </div>
  );
}
