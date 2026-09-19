"use client";

import { createContext, useContext } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  BarChart3,
  BriefcaseBusiness,
  Building2,
  ChartNoAxesCombined,
  CircleDollarSign,
  ClipboardCheck,
  LayoutDashboard,
  LogOut,
  Network,
  ShieldCheck,
  Users,
} from "lucide-react";
import type { AuthenticatedUser } from "@/lib/models/canonical";

const navigation = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "Agents / Team", href: "/admin/agents", icon: Users },
  { name: "Client Accounts", href: "/admin/clients", icon: Building2 },
  { name: "Assignments", href: "/admin/assignments", icon: ClipboardCheck },
  { name: "Sales Operations", href: "/admin/operations", icon: BriefcaseBusiness },
  { name: "Commissions", href: "/admin/commissions", icon: CircleDollarSign },
  { name: "Business Analytics", href: "/admin/analytics", icon: ChartNoAxesCombined },
  { name: "Integrations / Sync", href: "/admin/integrations", icon: Network },
  { name: "Audit Logs", href: "/admin/audit", icon: Activity },
];

const AdminWorkspaceContext = createContext<AuthenticatedUser | null>(null);

export function useAdminWorkspaceUser() {
  const user = useContext(AdminWorkspaceContext);
  if (!user) throw new Error("useAdminWorkspaceUser must be used inside AdminWorkspaceShell");
  return user;
}

export default function AdminWorkspaceShell({ user, children }: { user: AuthenticatedUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  };

  return (
    <AdminWorkspaceContext.Provider value={user}>
      <div className="flex h-dvh w-full bg-transparent">
        <aside className="hidden w-72 shrink-0 flex-col border-r border-crm-border-strong bg-crm-surface/45 backdrop-blur-2xl lg:flex">
          <div className="flex h-20 items-center gap-3 border-b border-crm-border-strong px-6">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary-cyan/35 bg-primary-cyan/10 text-primary-cyan">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-crm-text">Administration</p>
              <p className="mt-1 text-[10px] font-mono uppercase tracking-wider text-primary-cyan">Company control plane</p>
            </div>
          </div>

          <nav aria-label="Admin workspace" className="flex-1 space-y-1 overflow-y-auto p-4">
            {navigation.map((item) => {
              const active = item.href === "/admin" ? pathname === item.href : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href} className={`flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-xs transition-all ${active ? "border-primary-cyan/30 bg-primary-cyan/12 text-primary-cyan" : "border-transparent text-crm-text-muted hover:border-crm-border hover:bg-white/5 hover:text-crm-text"}`}>
                  <Icon className="h-4 w-4 shrink-0" strokeWidth={1.8} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          <div className="m-4 rounded-2xl border border-crm-border bg-crm-inner/70 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-crm-text">{user.name}</p>
                <p className="mt-1 text-[10px] font-mono text-crm-text-muted">{user.role} · COMPANY SCOPE</p>
              </div>
              <button onClick={logout} title="Sign out" className="rounded-lg border border-crm-border p-2 text-crm-text-muted transition hover:border-rose-400/40 hover:text-rose-300">
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="z-50 shrink-0 border-b border-crm-border-strong bg-crm-base/65 px-4 py-3 backdrop-blur-2xl lg:px-8">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <BarChart3 className="h-5 w-5 text-primary-cyan" />
                <div>
                  <p className="text-sm font-semibold text-crm-text">Admin Workspace</p>
                  <p className="text-[10px] font-mono text-crm-text-muted">COMPANY-WIDE GOVERNANCE & OPERATIONS</p>
                </div>
              </div>
              <button onClick={logout} className="rounded-xl border border-crm-border px-3 py-2 text-[10px] font-mono text-crm-text-muted transition hover:border-rose-400/40 hover:text-rose-300 lg:hidden">
                SIGN OUT
              </button>
            </div>
            <nav aria-label="Admin workspace mobile" className="mt-3 flex gap-2 overflow-x-auto pb-1 lg:hidden">
              {navigation.map((item) => {
                const active = item.href === "/admin" ? pathname === item.href : pathname.startsWith(item.href);
                return <Link key={item.href} href={item.href} className={`shrink-0 rounded-lg border px-3 py-1.5 text-[10px] font-mono ${active ? "border-primary-cyan/35 bg-primary-cyan/10 text-primary-cyan" : "border-crm-border text-crm-text-muted"}`}>{item.name}</Link>;
              })}
            </nav>
          </header>
          <main className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </AdminWorkspaceContext.Provider>
  );
}
