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
      className="flex h-dvh w-full bg-slate-50"
      style={{ "--dashboard-header-height": "3.5rem" } as CSSProperties}
    >
      {/* Sidebar */}
      <Sidebar />

      <div className="flex-1 flex min-w-0 min-h-0 flex-col bg-slate-50">

        {/* ── Top App Header ── */}
        <header className="h-[var(--dashboard-header-height)] shrink-0 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-[60] shadow-sm">
          {/* Left — sync status */}
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <span className="bg-emerald-50 text-emerald-800 border border-emerald-300 font-semibold text-xs px-3 py-1 rounded-full">
              SYNC ENGINE: ACTIVE
            </span>
          </div>

          {/* Right — tenant switcher + pipeline metric */}
          <div className="flex items-center gap-3">
            <ClientAccountSwitcher />
            <span className="bg-slate-100 border border-slate-300 text-slate-700 font-semibold text-xs px-3 py-1.5 rounded-full">
              Active Pipeline:{" "}
              <strong className="text-blue-700">$142,500</strong>
            </span>
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
