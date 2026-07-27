import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import { AmbientBackground } from "@/components/ui/AmbientBackground";

export const metadata: Metadata = {
  title: "Multi-CRM Orchestrator",
  description: "Next-gen glassmorphic sales execution engine",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased flex min-h-screen bg-obsidian-deep text-slate-100 relative overflow-x-hidden">
        {/* Dynamic Cursor-Tracking Glow & SVG Grain */}
        <AmbientBackground />

        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-16 glass-panel border-b border-glass-border px-8 flex items-center justify-between sticky top-0 z-20">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-xs font-mono text-slate-400">
                SYNC ENGINE:{" "}
                <strong className="text-emerald-400">ACTIVE</strong>
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
              <span className="bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800">
                Active Pipeline:{" "}
                <strong className="text-accent-cyan">$142,500</strong>
              </span>
            </div>
          </header>
          <main className="flex-1 p-8 overflow-y-auto">{children}</main>
        </div>
      </body>
    </html>
  );
}
