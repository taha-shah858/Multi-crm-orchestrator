"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  Network,
  Users,
  Phone,
  TrendingUp,
  Bot,
  BarChart2,
  Calendar,
  Hexagon,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

const navigation = [
  { name: "Home Dashboard", href: "/", icon: LayoutGrid },
  { name: "Integrations Hub", href: "/integrations", icon: Network },
  { name: "Unified Lead Directory", href: "/leads", icon: Users },
  { name: "Twilio Smart Dialer", href: "/dialer", icon: Phone },
  { name: "Aggregation Timeline", href: "/timeline", icon: TrendingUp },
  { name: "AI Copilot Suite", href: "/copilot", icon: Bot },
  { name: "Telemetry & Logs", href: "/telemetry", icon: BarChart2 },
  { name: "Calendar Planner", href: "/calendar", icon: Calendar },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside
      className={`glass-panel border-r border-glass-border flex flex-col justify-between shrink-0 h-screen sticky top-0 z-30 transition-all duration-300 ease-in-out ${
        isCollapsed ? "w-16" : "w-64"
      }`}
    >
      <div>
        {/* Header with Gemini-Style Collapse Toggle */}
        <div
          className={`p-4 border-b border-glass-border flex items-center h-16 ${
            isCollapsed ? "justify-center" : "justify-between"
          }`}
        >
          {!isCollapsed && (
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="relative flex items-center justify-center shrink-0">
                <Hexagon className="w-8 h-8 text-accent-cyan fill-accent-cyan/20 animate-pulse" />
                <span className="absolute text-[10px] font-mono font-bold text-accent-cyan-light">
                  M
                </span>
              </div>
              <div className="overflow-hidden whitespace-nowrap">
                <h1 className="font-bold text-xs tracking-widest uppercase text-slate-100">
                  Multi-CRM
                </h1>
                <p className="text-[10px] font-mono text-accent-cyan tracking-widest uppercase">
                  Orchestrator
                </p>
              </div>
            </div>
          )}

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 border border-transparent hover:border-slate-700/50 transition-all"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <PanelLeftOpen className="w-5 h-5 text-accent-cyan" />
            ) : (
              <PanelLeftClose className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* 8-Module Navigation Items */}
        <nav className="p-3 space-y-1.5">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                title={isCollapsed ? item.name : undefined}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 ${
                  isCollapsed ? "justify-center px-0" : ""
                } ${
                  isActive
                    ? "bg-accent-cyan/15 text-accent-cyan-light border border-accent-cyan/30 shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? "text-accent-cyan" : "text-slate-400"
                  }`}
                />
                {!isCollapsed && <span className="truncate">{item.name}</span>}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User Profile Bar */}
      <div
        className={`border-t border-glass-border m-2 rounded-xl bg-slate-900/40 transition-all ${
          isCollapsed ? "p-2 flex justify-center" : "p-4"
        }`}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-8 h-8 rounded-full bg-linear-to-tr from-accent-violet to-accent-cyan p-px shrink-0">
            <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center text-xs font-bold text-slate-200">
              ZA
            </div>
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden">
              <p className="text-xs font-medium text-slate-200 truncate">
                Zenith Agent
              </p>
              <p className="text-[10px] text-slate-500 font-mono truncate">
                Top Tier Sales
              </p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
