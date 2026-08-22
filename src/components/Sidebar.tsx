"use client";

import { useState, useEffect, useRef } from "react";
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
  Sparkles,
  FileText,
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
  { name: "Script Architect", href: "/scripts", icon: FileText },
  { name: "Telemetry & Logs", href: "/telemetry", icon: BarChart2 },
  { name: "Calendar Planner", href: "/calendar", icon: Calendar },
  { name: "Multi-CRM Suite", href: "/multi-crm", icon: Sparkles }, // <--- Updated route and title
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(256); // Default 256px (w-64)
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);

  // Handle smooth mouse-dragging for custom width resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = e.clientX;
      if (newWidth >= 200 && newWidth <= 440) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  return (
    <aside
      ref={sidebarRef}
      className={`border-r border-crm-border-strong flex flex-col justify-between shrink-0 h-screen sticky top-0 z-30 transition-all ${
        isResizing ? "transition-none" : "duration-300 ease-in-out"
      }`}
      style={{
        width: isCollapsed ? "64px" : `${sidebarWidth}px`,
        backgroundColor:
          "color-mix(in srgb, var(--color-crm-surface) 50%, transparent)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
      }}
    >
      <div className="overflow-hidden flex flex-col h-full">
        {/* Header with Collapse Toggle */}
        <div
          className={`p-4 border-b border-crm-border-strong flex items-center h-16 shrink-0 ${
            isCollapsed ? "justify-center" : "justify-between"
          }`}
        >
          {!isCollapsed && (
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="relative flex items-center justify-center shrink-0">
                <span className="w-8 h-8 rounded-lg bg-primary-cyan/20 border border-primary-cyan/40 flex items-center justify-center text-primary-cyan font-bold text-xs">
                  M
                </span>
              </div>
              <div className="overflow-hidden whitespace-nowrap">
                <h1 className="font-bold text-xs tracking-widest uppercase text-crm-text">
                  Multi-CRM
                </h1>
                <p className="text-[10px] font-mono text-primary-cyan tracking-widest uppercase">
                  Orchestrator
                </p>
              </div>
            </div>
          )}

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-lg text-crm-text-muted hover:text-crm-text hover:bg-crm-surface/60 border border-transparent hover:border-crm-border/50 transition-all shrink-0 cursor-pointer"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <PanelLeftOpen className="w-5 h-5 text-primary-cyan" />
            ) : (
              <PanelLeftClose className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1.5 flex-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                title={isCollapsed ? item.name : undefined}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] active:scale-[0.97] ${
                  isCollapsed ? "justify-center px-0" : ""
                } ${
                  isActive
                    ? "bg-primary-cyan/15 text-primary-cyan border border-primary-cyan/30 shadow-[0_0_15px_color-mix(in_srgb,var(--color-primary-cyan)_15%,transparent)]"
                    : "text-crm-text-muted hover:text-crm-text hover:bg-white/5 border border-transparent"
                }`}
              >
                <Icon
                  strokeWidth={1.75}
                  className={`w-4 h-4 shrink-0 transition-colors duration-300 ${
                    isActive ? "text-primary-cyan" : "text-slate-500 group-hover:text-crm-text-muted"
                  }`}
                />
                {!isCollapsed && <span className="truncate tracking-wide">{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User Profile Bar */}
        <div
          className={`border-t border-crm-border-strong m-2 rounded-xl bg-black/20 shrink-0 transition-all ${
            isCollapsed ? "p-2 flex justify-center" : "p-4"
          }`}
        >
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-linear-to-tr from-purple-500 to-cyan-400 p-px shrink-0">
              <div className="w-full h-full rounded-full bg-crm-base flex items-center justify-center text-xs font-bold text-crm-text">
                ZA
              </div>
            </div>
            {!isCollapsed && (
              <div className="overflow-hidden">
                <p className="text-xs font-medium text-crm-text truncate">
                  Agent
                </p>
                <p className="text-[10px] text-slate-500 font-mono truncate">
                  Top Tier Sales
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Interactive Resizing Drag Handle on the Right Border */}
      {!isCollapsed && (
        <div
          className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize group hover:bg-primary-cyan/40 transition-colors z-40"
          onMouseDown={() => setIsResizing(true)}
          title="Drag to resize sidebar width"
        >
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-8 bg-white/20 group-hover:bg-primary-cyan rounded-full transition-colors" />
        </div>
      )}
    </aside>
  );
}
