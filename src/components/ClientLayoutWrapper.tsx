"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { ThemeProvider } from "@/context/ThemeContext";

export default function ClientLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Safely check if route includes login or signup (handles trailing slashes & subpaths)
  const isAuthPage =
    pathname?.includes("/login") || pathname?.includes("/signup");

  return (
    <ThemeProvider>
      {isAuthPage ? (
        <main className="relative z-10 w-full min-h-screen flex flex-col items-center justify-center bg-transparent">
          {children}
        </main>
      ) : (
        <div className="flex min-h-screen w-full bg-transparent">
          {/* Fully transparent Sidebar wrapper */}
          <div className="bg-transparent backdrop-blur-xl border-r border-crm-border-strong shrink-0">
            <Sidebar />
          </div>

          <div className="flex-1 flex flex-col min-w-0 bg-transparent">
            {/* Header: glass-panel removed and replaced with true 100% transparent glass */}
            <header className="h-16 bg-transparent backdrop-blur-xl border-b border-crm-border-strong px-8 flex items-center justify-between sticky top-0 z-25">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-xs font-mono text-crm-text-muted">
                  SYNC ENGINE:{" "}
                  <strong className="text-emerald-400">ACTIVE</strong>
                </span>
              </div>

              <div className="flex items-center gap-4 text-xs font-mono text-crm-text-muted">
                <span className="bg-white/5 backdrop-blur-md px-3 py-1.5 rounded-xl border border-crm-border-strong shadow-inner">
                  Active Pipeline:{" "}
                  <strong className="text-accent-cyan">$142,500</strong>
                </span>
              </div>
            </header>

            <main className="flex-1 p-8 overflow-y-auto relative z-10 bg-transparent">
              {children}
            </main>
          </div>
        </div>
      )}
    </ThemeProvider>
  );
}
