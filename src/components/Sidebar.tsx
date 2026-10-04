"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useClientAccount } from "@/context/ClientAccountContext";
import {
  LayoutGrid,
  Network,
  Users,
  Phone,
  TrendingUp,
  Bot,
  WalletCards,
  Calendar,
  Sparkles,
  FileText,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  Briefcase,
  Shield,
} from "lucide-react";
import { isAdminWorkspaceRole } from "@/lib/auth/roles";
import BrandIcon from "@/components/ui/BrandIcon";

const workspaceNavigation = [
  { name: "Home Dashboard",       href: "/",            icon: LayoutGrid  },
  { name: "Integrations Hub",     href: "/integrations", icon: Network    },
  { name: "Unified Lead Directory", href: "/leads",      icon: Users      },
  { name: "Client CRM",           href: "/client-crm",   icon: Briefcase  },
  { name: "Twilio Smart Dialer",  href: "/dialer",       icon: Phone      },
  { name: "Aggregation Timeline", href: "/timeline",     icon: TrendingUp },
  { name: "AI Copilot Suite",     href: "/copilot",      icon: Bot        },
  { name: "Script Architect",     href: "/scripts",      icon: FileText   },
  { name: "Calendar Planner",     href: "/calendar",     icon: Calendar   },
  { name: "Sales Operations",     href: "/operations",   icon: WalletCards},
  { name: "Documents & Proposals",href: "/documents",    icon: FileText   },
  { name: "Multi-CRM Suite",      href: "/multi-crm",    icon: Sparkles   },
];

export default function Sidebar() {
  const pathname  = usePathname();
  const router    = useRouter();
  const { user }  = useClientAccount();
  const [isCollapsed,  setIsCollapsed]  = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(256);
  const [isResizing,   setIsResizing]   = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);

  /* Drag-to-resize */
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = e.clientX;
      if (newWidth >= 200 && newWidth <= 440) setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => setIsResizing(false);
    if (isResizing) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup",  handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup",  handleMouseUp);
    };
  }, [isResizing]);

  const signOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("Logout failed");
      router.replace("/login");
      router.refresh();
    } catch {
      setIsSigningOut(false);
    }
  };

  return (
    <aside
      ref={sidebarRef}
      className={`flex flex-col justify-between shrink-0 h-screen sticky top-0 z-30 bg-slate-900 border-r border-slate-800 transition-all ${
        isResizing ? "transition-none" : "duration-300 ease-in-out"
      }`}
      style={{ width: isCollapsed ? "64px" : `${sidebarWidth}px` }}
    >
      <div className="overflow-hidden flex flex-col h-full">

        {/* ── Brand Header ── */}
        <div
          className={`px-3 border-b border-slate-800 flex items-center h-14 shrink-0 ${
            isCollapsed ? "justify-center" : "justify-between"
          }`}
        >
          {!isCollapsed && (
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="relative flex items-center justify-center shrink-0">
                <BrandIcon size={28} />
              </div>
              <div className="overflow-hidden whitespace-nowrap">
                <h1 className="font-bold text-[11px] tracking-widest uppercase text-white">
                  Multi-CRM
                </h1>
                <p className="text-[10px] font-sans font-medium text-blue-400 tracking-widest uppercase">
                  Orchestrator
                </p>
              </div>
            </div>
          )}

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors duration-150 shrink-0 cursor-pointer"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed
              ? <PanelLeftOpen  className="w-4 h-4 text-blue-400" />
              : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </div>

        {/* ── Navigation ── */}
        <nav className="px-2 py-3 space-y-0.5 flex-1 overflow-y-auto">
          {[
            ...(user && isAdminWorkspaceRole(user.role)
              ? [{ name: "Admin Console", href: "/admin", icon: Shield }]
              : []),
            ...workspaceNavigation,
          ].map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                title={isCollapsed ? item.name : undefined}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition-colors duration-150 ${
                  isCollapsed ? "justify-center" : ""
                } ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <Icon
                  strokeWidth={1.75}
                  className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : "text-slate-400"}`}
                />
                {!isCollapsed && <span className="truncate">{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* ── User Profile Bar ── */}
        <div
          className={`border-t border-slate-800 mx-2 mb-2 rounded-lg bg-slate-800/60 shrink-0 ${
            isCollapsed ? "p-2 flex flex-col items-center" : "p-3"
          }`}
        >
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-500 to-cyan-400 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
              {user?.name?.slice(0, 2).toUpperCase() ?? "—"}
            </div>
            {!isCollapsed && (
              <div className="overflow-hidden">
                <p className="text-xs font-medium text-white truncate">
                  {user?.name ?? "Loading…"}
                </p>
                <p className="text-[10px] text-slate-400 truncate">Sales agent</p>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => void signOut()}
            disabled={isSigningOut}
            title={isCollapsed ? "Sign out" : undefined}
            className={`mt-2 flex items-center rounded-md border border-slate-700 text-[10px] font-medium text-slate-400 transition-colors hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-400 disabled:cursor-wait disabled:opacity-50 ${
              isCollapsed ? "h-7 w-7 justify-center" : "w-full justify-center gap-1.5 px-3 py-1.5"
            }`}
          >
            <LogOut className="h-3 w-3" />
            {!isCollapsed && <span>{isSigningOut ? "SIGNING OUT…" : "SIGN OUT"}</span>}
          </button>
        </div>
      </div>

      {/* ── Drag Handle ── */}
      {!isCollapsed && (
        <div
          className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500/40 transition-colors z-40"
          onMouseDown={() => setIsResizing(true)}
          title="Drag to resize sidebar width"
        />
      )}
    </aside>
  );
}
